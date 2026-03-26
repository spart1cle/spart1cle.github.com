# brandonbmay.com

Personal website for Brandon B. May — built with plain HTML, CSS, and JavaScript. No frameworks, no build step.

**Live:** [brandonbmay.com](https://brandonbmay.com)

## Pages

- **Home** (`index.html`) — Hero, about, and publications with expandable details
- **Experience** (`experience.html`) — Career timeline with company icons and tags
- **Reading** (`reading.html`) — Papers from Scholar Inbox with tag filtering, search, and sort
- **Thoughts** (`thoughts.html`) — Short-form notes and links with compose UI, GitHub OAuth, and link previews via [microlink.io](https://microlink.io)

## Structure

```
index.html          Home page
experience.html     Experience & education timeline
reading.html        Reading list (renders papers.json)
thoughts.html       Thoughts feed (renders thoughts.json)
style.css           All styles, light/dark themes, responsive breakpoints
js/
  shared.js         Shared utilities: escapeHtml, tag colors, hash state
  script.js         Site-wide JS: theme toggle, hero canvas, scroll reveal,
                    progress bar, hamburger menu, animated favicon
  reading.js        Reading page: paper filtering, search, sort, pagination
  thoughts.js       Thoughts page: compose UI, GitHub OAuth, link previews,
                    markdown/LaTeX rendering, CRUD via GitHub API
papers.json         Reading list data (auto-updated daily)
thoughts.json       Thoughts data (updated via GitHub API from the site)
fetch_papers.py     Script to fetch liked papers from Scholar Inbox
notify_slack.py     Syncs new/edited/deleted thoughts to Slack
assets/             Images: profile photo, publication thumbnails, logos
```

## Reading List

Papers are sourced from [Scholar Inbox](https://scholar-inbox.com). A GitHub Actions workflow runs daily to fetch the latest liked papers:

```bash
# Manual usage
pip install requests
python3 fetch_papers.py --cookie "session=YOUR_SESSION_COOKIE" --output papers.json
```

The workflow uses the `SCHOLAR_INBOX_SESSION` repository secret.

## Thoughts

The Thoughts page supports composing, publishing, and deleting entries directly from the browser. Authentication uses GitHub OAuth with a [Cloudflare Worker](https://developers.cloudflare.com/workers/) as a CORS proxy for the token exchange. Entries are committed to `thoughts.json` via the GitHub Contents API.

## Slack Integration

A GitHub Actions workflow syncs thought changes to a Slack channel. When `thoughts.json` is updated on `main`, new thoughts are posted, edits update existing messages, and deletions remove them. Each thought card also has a manual "Push to Slack" button (visible when authenticated) that triggers the workflow for a single entry.

### Setup

1. **Create a Slack app** at [api.slack.com/apps](https://api.slack.com/apps) > **Create New App** > **From scratch**
2. Under **OAuth & Permissions**, add the bot token scope `chat:write`
3. **Install the app** to your workspace and copy the **Bot User OAuth Token** (`xoxb-...`)
4. **Invite the bot** to your target channel (`/invite @YourAppName`)
5. **Get the channel ID** — right-click the channel name > **View channel details** > copy the ID at the bottom
6. **Create a GitHub Gist** with a single file named `slack_messages.json` containing `{}` — this stores the thought-to-Slack-message mapping. Note the gist ID from the URL.
7. **Create a GitHub PAT** (classic or fine-grained) with the `gist` scope
8. **Add four repo secrets** under **Settings > Secrets and variables > Actions**:

   | Secret | Value |
   |---|---|
   | `SLACK_BOT_TOKEN` | Bot OAuth token (`xoxb-...`) |
   | `SLACK_CHANNEL_ID` | Target channel ID (`C0123456789`) |
   | `GIST_TOKEN` | GitHub PAT with `gist` scope |
   | `GIST_ID` | ID of the gist created in step 6 |

The workflow runs automatically on push. To manually push a single thought, use the Slack button on any thought card, or trigger the workflow from the Actions tab with a thought ID.

## Features

- Light/dark theme with system preference detection and localStorage persistence
- Animated particle canvas on the hero section
- Scroll-reveal animations (respects `prefers-reduced-motion`)
- Reading progress bar
- Responsive hamburger menu on mobile
- Animated favicon
- Konami code easter egg

## Development

Serve locally with any static server:

```bash
python3 -m http.server 8000
```

No build step required. Edit HTML/CSS/JS directly.
