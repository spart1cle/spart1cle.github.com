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
import time
import xml.etree.ElementTree as ET

import requests

API_BASE = "https://api.scholar-inbox.com/api"
ARXIV_API_URL = "https://export.arxiv.org/api/query"
ARXIV_BATCH_SIZE = 50
ARXIV_REQUEST_DELAY = 3  # seconds between batches, per arXiv policy
ATOM_NS = "{http://www.w3.org/2005/Atom}"


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


def fetch_arxiv_dates(arxiv_ids: list[str]) -> dict[str, str]:
    """Query arXiv API for original v1 publication dates."""
    dates = {}
    for i in range(0, len(arxiv_ids), ARXIV_BATCH_SIZE):
        batch = arxiv_ids[i:i + ARXIV_BATCH_SIZE]
        if i > 0:
            time.sleep(ARXIV_REQUEST_DELAY)

        params = {"id_list": ",".join(batch), "max_results": len(batch)}
        print(f"Querying arXiv API for {len(batch)} papers...", file=sys.stderr)

        try:
            resp = requests.get(ARXIV_API_URL, params=params, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"arXiv API request failed: {e}", file=sys.stderr)
            continue

        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError as e:
            print(f"Failed to parse arXiv API response: {e}", file=sys.stderr)
            continue

        for entry in root.findall(f"{ATOM_NS}entry"):
            id_elem = entry.find(f"{ATOM_NS}id")
            if id_elem is None or id_elem.text is None:
                continue
            entry_id = id_elem.text.split("/abs/")[-1]
            if "v" in entry_id:
                entry_id = entry_id[: entry_id.rindex("v")]

            published_elem = entry.find(f"{ATOM_NS}published")
            if published_elem is None or published_elem.text is None:
                continue

            dates[entry_id] = published_elem.text[:10]

    return dates


def correct_arxiv_dates(papers: list[dict]) -> None:
    """Override publication_date with arXiv v1 date for papers with an arxiv_id."""
    arxiv_ids = [p["arxiv_id"] for p in papers if p.get("arxiv_id")]
    if not arxiv_ids:
        return

    print(f"Correcting dates for {len(arxiv_ids)} papers via arXiv API...", file=sys.stderr)
    date_map = fetch_arxiv_dates(arxiv_ids)

    corrected = 0
    for paper in papers:
        aid = paper.get("arxiv_id")
        if aid and aid in date_map:
            old_date = paper.get("publication_date")
            new_date = date_map[aid]
            if old_date != new_date:
                paper["publication_date"] = new_date
                corrected += 1

    print(f"Corrected {corrected} publication dates ({len(date_map)} found in arXiv API)", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Fetch liked papers from Scholar Inbox")
    parser.add_argument("--cookie", required=True, help='Session cookie as "name=value" (from browser DevTools)')
    parser.add_argument("--output", default="papers.json", help="Output JSON file")
    parser.add_argument("--pages", type=int, default=3, help="Number of pages to fetch")
    parser.add_argument("--limit", type=int, default=50, help="Max number of papers to include")
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
        if len(all_papers) >= args.limit:
            break

    all_papers = all_papers[:args.limit]

    correct_arxiv_dates(all_papers)

    with open(args.output, "w") as f:
        json.dump(all_papers, f, indent=2)

    print(f"Saved {len(all_papers)} papers to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
