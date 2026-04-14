#!/usr/bin/env python3
"""Convert OCR story pages and Mermaid graph into a single JSON file for the web frontend."""

import json
import os
import re
import argparse


def load_pages(pages_dir):
    """Load all story page text files into a dict keyed by page number."""
    pages = {}
    for fname in os.listdir(pages_dir):
        if not fname.endswith("-CoT.txt"):
            continue
        page_num = int(fname.split("-")[0])
        with open(os.path.join(pages_dir, fname), "r", encoding="utf-8") as f:
            pages[page_num] = f.read().strip()
    return pages


def parse_graph(graph_path):
    """Parse Mermaid graph file into an adjacency list."""
    edges = {}
    with open(graph_path, "r", encoding="utf-8") as f:
        for line in f:
            m = re.match(r"\s*P(\d+)\s*-->\s*P(\d+)", line)
            if m:
                src, dst = int(m.group(1)), int(m.group(2))
                edges.setdefault(src, []).append(dst)
    return edges


def find_terminal_pages(edges, all_pages):
    """Pages that have no outgoing edges are terminal (endings)."""
    sources = set(edges.keys())
    return [p for p in all_pages if p not in sources]


def extract_choices(text, edges_from_page):
    """Try to extract choice text from the page content for each target page."""
    choices = []
    for target in edges_from_page:
        pattern = rf"[Tt]urn to page\s+{target}"
        match = re.search(pattern, text)
        if match:
            # Grab context before "turn to page X"
            start = max(0, match.start() - 120)
            context = text[start : match.end()]
            # Try to find the sentence/clause containing the choice
            sentences = re.split(r"[.!?]\s+", context)
            label = sentences[-1].strip() if sentences else f"Turn to page {target}"
            # Clean up
            label = re.sub(r"\s+", " ", label).strip()
            if len(label) > 150:
                label = label[-150:]
            choices.append({"target": target, "label": label})
        else:
            # Sequential continuation
            choices.append({"target": target, "label": f"Continue to page {target}"})
    return choices


def main():
    parser = argparse.ArgumentParser(description="Build web data JSON from story pages and graph")
    parser.add_argument("--pages-dir", default="output/cot-pages-ocr-v2")
    parser.add_argument("--graph", default="output/cot-story-graph.mmd")
    parser.add_argument("--manifest", default="output/cot-stories/manifest.json")
    parser.add_argument("--output", default="web/data/story-data.json")
    args = parser.parse_args()

    pages = load_pages(args.pages_dir)
    edges = parse_graph(args.graph)
    terminals = find_terminal_pages(edges, pages.keys())

    # Load stories manifest
    with open(args.manifest, "r", encoding="utf-8") as f:
        stories = json.load(f)

    # Build page objects with choices
    page_objects = {}
    for num, text in sorted(pages.items()):
        page_edges = edges.get(num, [])
        choices = extract_choices(text, page_edges)
        page_objects[str(num)] = {
            "number": num,
            "text": text,
            "choices": choices,
            "is_terminal": num in terminals,
        }

    data = {
        "start_page": 2,
        "pages": page_objects,
        "edges": {str(k): v for k, v in edges.items()},
        "terminal_pages": sorted(terminals),
        "stories": stories,
        "stats": {
            "total_pages": len(pages),
            "total_stories": len(stories),
            "total_endings": len(terminals),
        },
    }

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Built {args.output}: {len(pages)} pages, {len(stories)} stories, {len(terminals)} endings")


if __name__ == "__main__":
    main()
