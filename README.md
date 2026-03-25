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
thoughts.html       Thoughts feed (renders thoughts.json, inline compose UI)
style.css           All styles, light/dark themes, responsive breakpoints
script.js           Shared JS: theme toggle, hero canvas, scroll reveal,
                    progress bar, hamburger menu, animated favicon
papers.json         Reading list data (auto-updated daily)
thoughts.json       Thoughts data (updated via GitHub API from the site)
fetch_papers.py     Script to fetch liked papers from Scholar Inbox
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
