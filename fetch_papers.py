#!/usr/bin/env python3
"""Fetch liked papers from Scholar Inbox and save as JSON.

Usage:
    1. Log into scholar-inbox.com in your browser
    2. Open DevTools > Application > Cookies > api.scholar-inbox.com
    3. Copy the session cookie name and value
    4. Run: python3 fetch_papers.py --cookie "name=value" --output papers.json

Install: pip install requests
"""

import argparse
import json
import sys

import requests

API_BASE = "https://api.scholar-inbox.com/api"


def fetch_interactions(session: requests.Session, interaction_type: str = "positive", page: int = 0):
    params = {
        "column": "ranking_score",
        "type": interaction_type,
        "ascending": "0",
    }
    if page:
        params["p"] = str(page)
    resp = session.get(f"{API_BASE}/interactions", params=params)
    resp.raise_for_status()
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Fetch liked papers from Scholar Inbox")
    parser.add_argument("--cookie", required=True, help='Session cookie as "name=value" (from browser DevTools)')
    parser.add_argument("--output", default="papers.json", help="Output JSON file")
    parser.add_argument("--pages", type=int, default=3, help="Number of pages to fetch")
    args = parser.parse_args()

    name, _, value = args.cookie.partition("=")
    if not value:
        print("Cookie must be in 'name=value' format", file=sys.stderr)
        sys.exit(1)

    session = requests.Session()
    session.cookies.set(name.strip(), value.strip(), domain="api.scholar-inbox.com")

    all_papers = []
    for page in range(args.pages):
        print(f"Fetching page {page}...", file=sys.stderr)
        try:
            data = fetch_interactions(session, "positive", page)
        except requests.HTTPError as e:
            print(f"Request failed: {e}", file=sys.stderr)
            if e.response is not None and e.response.status_code in (401, 403):
                print("Session cookie may be expired. Log in again and get a fresh cookie.", file=sys.stderr)
            sys.exit(1)

        if isinstance(data, dict) and "digest_df" in data:
            papers = data["digest_df"]
        elif isinstance(data, list):
            papers = data
        else:
            print(f"Unexpected response format: {type(data)}", file=sys.stderr)
            print(f"Keys: {data.keys() if isinstance(data, dict) else 'N/A'}", file=sys.stderr)
            with open("raw_response.json", "w") as f:
                json.dump(data, f, indent=2)
            print("Raw response saved to raw_response.json", file=sys.stderr)
            break

        if not papers:
            break
        all_papers.extend(papers)
        print(f"  Got {len(papers)} papers (total: {len(all_papers)})", file=sys.stderr)

    with open(args.output, "w") as f:
        json.dump(all_papers, f, indent=2)

    print(f"Saved {len(all_papers)} papers to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
