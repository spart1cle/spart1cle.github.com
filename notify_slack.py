"""Sync thoughts.json changes to Slack: create, update, and delete messages."""

import json
import os
import re
import subprocess
import sys
import urllib.request

SITE_URL = "https://brandonbmay.com/thoughts.html"
MAX_NEW_NOTIFICATIONS = 5

TYPE_EMOJI = {
    "link": "\U0001F517",   # link
    "note": "\U0001F4AD",   # thought balloon
    "quote": "\U0001F4AC",  # speech balloon
}


# ── Gist Storage (thought id -> Slack message ts) ──────────

def gist_read(gist_id, gist_token):
    req = urllib.request.Request(
        f"https://api.github.com/gists/{gist_id}",
        headers={
            "Authorization": f"token {gist_token}",
            "Accept": "application/vnd.github+json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        content = data["files"].get("slack_messages.json", {}).get("content", "{}")
        return json.loads(content)
    except Exception:
        return {}


def gist_write(gist_id, gist_token, mapping):
    payload = json.dumps({
        "files": {
            "slack_messages.json": {
                "content": json.dumps(mapping, indent=2),
            }
        }
    }).encode()
    req = urllib.request.Request(
        f"https://api.github.com/gists/{gist_id}",
        data=payload,
        headers={
            "Authorization": f"token {gist_token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        if resp.status != 200:
            raise RuntimeError(f"Gist update failed: {resp.status}")


# ── Git Diff ────────────────────────────────────────────────

def get_previous_thoughts():
    try:
        result = subprocess.run(
            ["git", "show", "HEAD~1:thoughts.json"],
            capture_output=True, text=True, check=True,
        )
        return json.loads(result.stdout)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return []


def get_current_thoughts():
    with open("thoughts.json") as f:
        return json.load(f)


def diff_thoughts(current, previous):
    """Return (new, edited, deleted) lists of thoughts."""
    prev_by_id = {t["id"]: t for t in previous}
    curr_by_id = {t["id"]: t for t in current}

    prev_ids = set(prev_by_id)
    curr_ids = set(curr_by_id)

    new = [curr_by_id[i] for i in curr_ids - prev_ids]
    deleted = [prev_by_id[i] for i in prev_ids - curr_ids]
    edited = [curr_by_id[i] for i in curr_ids & prev_ids
              if curr_by_id[i] != prev_by_id[i]]

    return new, edited, deleted


# ── Markdown-to-Slack conversion ────────────────────────────

def md_to_slack(text):
    """Convert a subset of Markdown to Slack mrkdwn."""
    text = re.sub(r"\*\*(.+?)\*\*", r"*\1*", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<\2|\1>", text)
    text = re.sub(r"~~(.+?)~~", r"~\1~", text)
    text = re.sub(r"\$([^$]+)\$", r"\1", text)
    return text


# ── Slack Web API ───────────────────────────────────────────

def slack_api(token, method, body):
    payload = json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://slack.com/api/{method}",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    if not data.get("ok"):
        raise RuntimeError(f"Slack {method}: {data.get('error')}")
    return data


def slack_post(token, channel, blocks):
    data = slack_api(token, "chat.postMessage", {
        "channel": channel, "blocks": blocks,
    })
    return data["ts"]


def slack_update(token, channel, ts, blocks):
    slack_api(token, "chat.update", {
        "channel": channel, "ts": ts, "blocks": blocks,
    })


def slack_delete(token, channel, ts):
    slack_api(token, "chat.delete", {"channel": channel, "ts": ts})


# ── Block Kit Card ──────────────────────────────────────────

def build_blocks(thought):
    emoji = TYPE_EMOJI.get(thought.get("type", "note"), "\U0001F4AD")
    date = thought.get("date", "")
    text = md_to_slack(thought.get("text", ""))
    url = thought.get("url")
    tags = thought.get("tags") or []
    thought_id = thought.get("id", "")
    permalink = f"{SITE_URL}#t-{thought_id}"

    if thought.get("type") == "link" and url:
        text += f"  <{url}|\u2197>"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji} New Thought \u2014 {date}",
            },
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": text},
        },
    ]

    if tags:
        tag_str = "  ".join(f"`{tag}`" for tag in tags)
        blocks.append({
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": tag_str}],
        })

    blocks.append({
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": f"<{permalink}|View on site>"}],
    })

    blocks.append({"type": "divider"})
    return blocks


# ── Main ────────────────────────────────────────────────────

def main():
    slack_token = os.environ.get("SLACK_BOT_TOKEN", "").strip()
    channel_id = os.environ.get("SLACK_CHANNEL_ID", "").strip()
    gist_token = os.environ.get("GIST_TOKEN", "").strip()
    gist_id = os.environ.get("GIST_ID", "").strip()

    if not slack_token or not channel_id:
        print("SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set, skipping.")
        sys.exit(0)

    if not gist_token or not gist_id:
        print("GIST_TOKEN or GIST_ID not set, skipping.")
        sys.exit(0)

    # ── Manual single-thought push (workflow_dispatch) ──
    thought_id = os.environ.get("THOUGHT_ID", "").strip()
    if thought_id:
        return manual_push(slack_token, channel_id, gist_id, gist_token, thought_id)

    # ── Automatic diff-based sync (push trigger) ──
    previous = get_previous_thoughts()
    current = get_current_thoughts()
    new_thoughts, edited_thoughts, deleted_thoughts = diff_thoughts(current, previous)

    if not new_thoughts and not edited_thoughts and not deleted_thoughts:
        print("No changes detected.")
        return

    mapping = gist_read(gist_id, gist_token)
    mapping_changed = False
    errors = []

    # ── New thoughts (flood guard: cap at 5) ──
    if len(new_thoughts) > MAX_NEW_NOTIFICATIONS:
        print(f"Bulk import ({len(new_thoughts)} new), capping at {MAX_NEW_NOTIFICATIONS}.")
        new_thoughts = new_thoughts[:MAX_NEW_NOTIFICATIONS]

    for t in new_thoughts:
        try:
            ts = slack_post(slack_token, channel_id, build_blocks(t))
            mapping[t["id"]] = ts
            mapping_changed = True
            print(f"  Posted: {t['id']}")
        except Exception as e:
            print(f"  Error posting {t['id']}: {e}", file=sys.stderr)
            errors.append(str(e))

    # ── Edited thoughts ──
    for t in edited_thoughts:
        ts = mapping.get(t["id"])
        blocks = build_blocks(t)
        try:
            if ts:
                slack_update(slack_token, channel_id, ts, blocks)
                print(f"  Updated: {t['id']}")
            else:
                ts = slack_post(slack_token, channel_id, blocks)
                mapping[t["id"]] = ts
                mapping_changed = True
                print(f"  Posted (untracked edit): {t['id']}")
        except Exception as e:
            print(f"  Error updating {t['id']}: {e}", file=sys.stderr)
            errors.append(str(e))

    # ── Deleted thoughts ──
    for t in deleted_thoughts:
        ts = mapping.pop(t["id"], None)
        if ts:
            try:
                slack_delete(slack_token, channel_id, ts)
                mapping_changed = True
                print(f"  Deleted: {t['id']}")
            except Exception as e:
                print(f"  Error deleting {t['id']}: {e}", file=sys.stderr)
                mapping[t["id"]] = ts  # restore on failure
                errors.append(str(e))
        else:
            print(f"  Skipped delete (untracked): {t['id']}")

    # ── Persist mapping ──
    if mapping_changed:
        gist_write(gist_id, gist_token, mapping)
        print("Mapping saved.")

    if errors:
        print(f"{len(errors)} error(s) occurred.", file=sys.stderr)
        sys.exit(1)

    print("Done.")


def manual_push(slack_token, channel_id, gist_id, gist_token, thought_id):
    """Post or update a single thought to Slack (workflow_dispatch mode)."""
    current = get_current_thoughts()
    thought = next((t for t in current if t["id"] == thought_id), None)
    if not thought:
        print(f"Thought {thought_id} not found in thoughts.json.", file=sys.stderr)
        sys.exit(1)

    mapping = gist_read(gist_id, gist_token)
    ts = mapping.get(thought_id)
    blocks = build_blocks(thought)

    try:
        if ts:
            slack_update(slack_token, channel_id, ts, blocks)
            print(f"  Updated: {thought_id}")
        else:
            ts = slack_post(slack_token, channel_id, blocks)
            mapping[thought_id] = ts
            gist_write(gist_id, gist_token, mapping)
            print(f"  Posted: {thought_id}")
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()
