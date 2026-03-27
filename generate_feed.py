#!/usr/bin/env python3
"""Generate an Atom feed from thoughts.json."""
import json, html
from datetime import datetime, timezone
from xml.etree.ElementTree import Element, SubElement, ElementTree, indent

SITE = "https://brandonbmay.com"
FEED_TITLE = "Thoughts \u2014 Brandon B. May"
FEED_ID = f"{SITE}/feed.xml"
AUTHOR = "Brandon B. May"

def main():
    with open("thoughts.json", "r") as f:
        thoughts = json.load(f)

    feed = Element("feed", xmlns="http://www.w3.org/2005/Atom")
    SubElement(feed, "title").text = FEED_TITLE
    SubElement(feed, "id").text = FEED_ID
    SubElement(feed, "link", href=f"{SITE}/thoughts.html", rel="alternate")
    SubElement(feed, "link", href=FEED_ID, rel="self")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    SubElement(feed, "updated").text = now

    author = SubElement(feed, "author")
    SubElement(author, "name").text = AUTHOR

    for t in thoughts:
        entry = SubElement(feed, "entry")
        tid = t.get("id", "")
        text = t.get("text", "")
        url = t.get("url", "")
        tags = t.get("tags", [])
        date = t.get("date", "")

        title = text[:80].split("\n")[0]
        if len(text) > 80:
            title += "..."

        SubElement(entry, "title").text = title
        SubElement(entry, "id").text = f"{SITE}/thoughts.html#t-{tid}"
        SubElement(entry, "link", href=f"{SITE}/thoughts.html#t-{tid}", rel="alternate")

        if date:
            ts = f"{date}T00:00:00Z"
            SubElement(entry, "published").text = ts
            SubElement(entry, "updated").text = ts

        content_html = html.escape(text)
        if url:
            content_html += f'\n<p><a href="{html.escape(url)}">{html.escape(url)}</a></p>'
        SubElement(entry, "content", type="html").text = content_html

        for tag in tags:
            SubElement(entry, "category", term=tag)

    indent(feed)
    tree = ElementTree(feed)
    tree.write("feed.xml", xml_declaration=True, encoding="UTF-8")
    with open("feed.xml", "ab") as f:
        f.write(b"\n")

if __name__ == "__main__":
    main()
