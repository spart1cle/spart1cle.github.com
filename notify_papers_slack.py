"""Post Slack notifications for new papers added to papers.json."""

import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

SITE_URL = "https://brandonbmay.com/reading.html"
MAX_NEW_NOTIFICATIONS = 10


# ── Gist Storage (paper_id -> Slack message ts) ────────────

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
        content = data["files"].get("slack_papers.json", {}).get("content", "{}")
        return json.loads(content)
    except Exception:
        return {}


def gist_write(gist_id, gist_token, mapping):
    payload = json.dumps({
        "files": {
            "slack_papers.json": {
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

def get_previous_papers():
    try:
        result = subprocess.run(
            ["git", "show", "HEAD~1:papers.json"],
            capture_output=True, text=True, check=True,
        )
        return json.loads(result.stdout)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return []


def get_current_papers():
    with open("papers.json") as f:
        return json.load(f)


def find_new_papers(current, previous):
    old_ids = {str(p["paper_id"]) for p in previous}
    return [p for p in current if str(p["paper_id"]) not in old_ids]


# ── Markdown-to-Slack conversion ────────────────────────────

def md_to_slack(text):
    if not text:
        return ""
    text = re.sub(r"\*\*(.+?)\*\*", r"*\1*", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<\2|\1>", text)
    text = re.sub(r"~~(.+?)~~", r"~\1~", text)
    return text


# ── Link Preview via Microlink ──────────────────────────────

def fetch_og(url):
    try:
        api_url = f"https://api.microlink.io/?url={urllib.request.quote(url, safe='')}"
        req = urllib.request.Request(api_url, headers={"User-Agent": "notify-slack/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        if data.get("status") != "success":
            return None
        d = data["data"]
        return {
            "title": d.get("title") or "",
            "description": d.get("description") or "",
            "image": (d.get("image") or {}).get("url"),
            "logo": (d.get("logo") or {}).get("url"),
        }
    except Exception:
        return None


def build_attachment(url, og):
    domain = urllib.parse.urlparse(url).hostname or ""
    if domain.startswith("www."):
        domain = domain[4:]

    att = {
        "fallback": og.get("title") or url,
        "title": og.get("title") or url,
        "title_link": url,
        "footer": domain,
        "color": "#E0E0E0",
    }
    if og.get("description"):
        att["text"] = og["description"]
    if og.get("image"):
        att["image_url"] = og["image"]
    elif og.get("logo"):
        att["thumb_url"] = og["logo"]
    return att


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


def slack_post(token, channel, blocks, attachments=None):
    body = {"channel": channel, "blocks": blocks}
    if attachments:
        body["attachments"] = attachments
    data = slack_api(token, "chat.postMessage", body)
    return data["ts"]


def slack_update(token, channel, ts, blocks, attachments=None):
    body = {"channel": channel, "ts": ts, "blocks": blocks}
    if attachments:
        body["attachments"] = attachments
    slack_api(token, "chat.update", body)


# ── Block Kit Card ──────────────────────────────────────────

def build_message(paper):
    pid = str(paper["paper_id"])
    title = paper.get("title", "Untitled")
    authors = paper.get("authors", "")
    date = paper.get("publication_date", "")
    abstract = paper.get("abstract", "")
    arxiv_id = paper.get("arxiv_id")
    project_link = paper.get("project_link")
    collections = paper.get("user_paper_collections") or []
    url = paper.get("url")

    # Truncate abstract for Slack (max ~300 chars)
    if abstract and len(abstract) > 300:
        abstract = abstract[:297] + "..."

    # Build links line
    links = []
    if arxiv_id:
        links.append(f"<https://arxiv.org/abs/{arxiv_id}|arXiv>")
    if url:
        links.append(f"<{url}|PDF>")
    if project_link and "}{" not in project_link:
        links.append(f"<{project_link}|Website>")

    # Contributions summary if available
    summaries = paper.get("summaries") or {}
    contributions = summaries.get("contributions_question", "")

    body_parts = []
    if contributions:
        body_parts.append(md_to_slack(contributions))
    elif abstract:
        body_parts.append(abstract)
    if links:
        body_parts.append(" | ".join(links))

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"\U0001F4C4 {title}",
            },
        },
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"{authors}  \u2014  {date}"}],
        },
    ]

    if body_parts:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": "\n\n".join(body_parts)},
        })

    if collections:
        tag_str = "  ".join(f"`{c['name']}`" for c in collections)
        blocks.append({
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": tag_str}],
        })

    blocks.append({"type": "divider"})

    # Link preview attachment for the project page or arxiv
    preview_url = project_link if (project_link and "}{" not in project_link) else (
        f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None
    )
    attachments = None
    if preview_url:
        og = fetch_og(preview_url)
        if og:
            attachments = [build_attachment(preview_url, og)]

    return blocks, attachments


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

    # ── Manual single-paper push (workflow_dispatch) ──
    paper_id = os.environ.get("PAPER_ID", "").strip()
    if paper_id:
        return manual_push(slack_token, channel_id, gist_id, gist_token, paper_id)

    # ── Automatic diff-based sync ──
    previous = get_previous_papers()
    current = get_current_papers()
    new_papers = find_new_papers(current, previous)

    if not new_papers:
        print("No new papers detected.")
        return

    if len(new_papers) > MAX_NEW_NOTIFICATIONS:
        print(f"Bulk import ({len(new_papers)} new), capping at {MAX_NEW_NOTIFICATIONS}.")
        new_papers = new_papers[:MAX_NEW_NOTIFICATIONS]

    mapping = gist_read(gist_id, gist_token)
    mapping_changed = False
    errors = []

    print(f"Sending {len(new_papers)} notification(s) to Slack...")
    for p in new_papers:
        pid = str(p["paper_id"])
        try:
            blocks, atts = build_message(p)
            ts = slack_post(slack_token, channel_id, blocks, atts)
            mapping[pid] = ts
            mapping_changed = True
            print(f"  Posted: {pid}")
        except Exception as e:
            print(f"  Error posting {pid}: {e}", file=sys.stderr)
            errors.append(str(e))

    if mapping_changed:
        gist_write(gist_id, gist_token, mapping)
        print("Mapping saved.")

    if errors:
        print(f"{len(errors)} error(s) occurred.", file=sys.stderr)
        sys.exit(1)

    print("Done.")


def manual_push(slack_token, channel_id, gist_id, gist_token, paper_id):
    """Post or update a single paper to Slack (workflow_dispatch mode)."""
    current = get_current_papers()
    paper = next((p for p in current if str(p["paper_id"]) == paper_id), None)
    if not paper:
        print(f"Paper {paper_id} not found in papers.json.", file=sys.stderr)
        sys.exit(1)

    mapping = gist_read(gist_id, gist_token)
    ts = mapping.get(paper_id)
    blocks, atts = build_message(paper)

    try:
        if ts:
            slack_update(slack_token, channel_id, ts, blocks, atts)
            print(f"  Updated: {paper_id}")
        else:
            ts = slack_post(slack_token, channel_id, blocks, atts)
            mapping[paper_id] = ts
            gist_write(gist_id, gist_token, mapping)
            print(f"  Posted: {paper_id}")
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()
