# Codebase Notes

## Purpose

This workspace extracts text from the scanned PDF of The Cave of Time, builds a story graph from the extracted pages, writes all possible bounded story paths, and renders the graph as SVG.

## Canonical Source Of Truth

The canonical extracted page set is:
- output/cot-pages-ocr-v2

Do not use the older cot-pages extraction workflow. It had bad OCR and was removed.

## Important PDF Mapping

The scan is a two-page spread layout.

Story start mapping:
- PDF page 8 contains story page 2 on the left and story page 3 on the right
- PDF page 9 contains story page 4 on the left and story page 5 on the right

The story begins on story page 2 with:
- "You've hiked through Snake Canyon once before ..."

Do not confuse story page numbers with PDF page numbers.

## Current Scripts

Canonical scripts in scripts/:
- reextract_cot_ocr_split.py
- build_story_graph.py
- write_all_stories.py
- render_story_graph_svg.py

Superseded scripts were deleted:
- extract_cot.py
- reextract_cot_spreads.py

## What Each Script Does

### reextract_cot_ocr_split.py

Re-extracts story pages from the PDF using OCR on left/right halves of each PDF spread page.

Typical command:

```bash
python3 scripts/reextract_cot_ocr_split.py \
  --pdf samples/the-cave-of-time.pdf \
  --pdf-start-page 8 \
  --pdf-end-page 66 \
  --story-start-page 2 \
  --output-dir output/cot-pages-ocr-v2
```

### build_story_graph.py

Builds Mermaid graph output from the corrected OCR page files.

Typical command:

```bash
python3 scripts/build_story_graph.py \
  --pages-dir output/cot-pages-ocr-v2 \
  --output output/cot-story-graph.mmd
```

Notes:
- Reads explicit "turn to page X" choices from page text.
- Adds sequential continuation edges for pages that continue onto the next numbered page before any explicit choice appears.

### write_all_stories.py

Writes all possible bounded stories from the graph.

Typical command:

```bash
python3 scripts/write_all_stories.py \
  --graph output/cot-story-graph.mmd \
  --pages-dir output/cot-pages-ocr-v2 \
  --start-page 2 \
  --max-decisions 20 \
  --output-dir output/cot-stories
```

Important behavior:
- Starts from story page 2
- Stops on cycles
- Stops if decision points exceed 20
- Clears old story-*.txt files in the target output directory before writing new ones

### render_story_graph_svg.py

Renders the Mermaid graph to SVG without external layout tools.

Typical command:

```bash
python3 scripts/render_story_graph_svg.py \
  --graph output/cot-story-graph.mmd \
  --output output/cot-story-graph.svg
```

Current visual behavior:
- Uses a layered Sugiyama-style layout with iterative barycenter ordering
- Colors terminal pages differently
- Highlights the main trunk from page 2

## Current Canonical Outputs

Keep these:
- output/cot-pages-ocr-v2
- output/cot-story-graph.mmd
- output/cot-story-graph.svg
- output/cot-stories

These older directories were deleted because they were exploratory or obsolete:
- output/cot-pages
- output/cot-pages-reextract
- output/cot-stories-from-page-02
- output/cot-stories-start10
- output/tmp

## Current Known State

At the end of this session:
- The corrected OCR v2 extraction produced story pages in output/cot-pages-ocr-v2
- The graph was rebuilt from OCR v2 pages and saved to output/cot-story-graph.mmd
- The bounded story writer generated 45 stories into output/cot-stories
- The graph SVG was rendered to output/cot-story-graph.svg

## Caveats

OCR is improved but not perfect.
- Some pages still have minor OCR noise
- Page continuations across spreads are important; graph construction relies on sequential edges when no explicit choice appears
- Story page numbers, not PDF page numbers, control graph edges and story traversal

## Web Frontend (Added by fork team)

### Architecture

The web frontend is a static HTML/CSS/JS site deployed on GitHub Pages. It consumes a single `story-data.json` file generated from the existing data pipeline.

### Data Pipeline

`scripts/build_web_data.py` converts the OCR pages and Mermaid graph into `web/data/story-data.json`:

```bash
python3 scripts/build_web_data.py \
  --pages-dir output/cot-pages-ocr-v2 \
  --graph output/cot-story-graph.mmd \
  --manifest output/cot-stories/manifest.json \
  --output web/data/story-data.json
```

The JSON contains:
- All 111 page texts with extracted choice labels
- Graph edges (adjacency list)
- Terminal page list
- Story manifest (all 45 paths)
- Summary stats

### Web Pages

All files live under `web/`:

| File | Purpose |
|------|---------|
| `index.html` | Landing page with project overview, feature cards, live stats |
| `reader.html` + `js/reader.js` | Interactive story reader -- click through choices page by page |
| `explorer.html` + `js/explorer.js` | Canvas-based story graph visualization with pan/zoom/click |
| `author.html` + `js/author.js` | Authoring tool -- create/edit pages, manage choices, export JSON |
| `css/style.css` | Shared stylesheet (book-themed, responsive) |
| `data/story-data.json` | Generated data file consumed by all pages |

### Key Design Decisions

- **No build step**: vanilla HTML/CSS/JS, no framework, no bundler
- **No backend**: authoring tool uses localStorage + JSON export/import
- **Static deployment**: GitHub Pages serves `web/` directory directly
- **Data coupling**: frontend reads `story-data.json` which is regenerated from the pipeline outputs

### Reader Features
- Page-by-page navigation with clickable choices
- Breadcrumb trail with back-navigation
- Path tracking (length, unique pages visited)
- "The End" overlay for terminal pages
- Supports `?start=N` query param (linked from graph explorer)

### Explorer Features
- BFS-layered graph layout rendered on HTML5 Canvas
- Color-coded nodes: green (start), red (terminal), gold (branch), brown (regular)
- Click to inspect, hover to highlight edges, pan/zoom
- Side panel with page preview and "Read from here" link

### Author Features
- Three-panel layout: page list, editor, mini graph preview
- Create new pages, edit text, manage choices with dropdowns
- Mark pages as terminal endings
- Auto-save to localStorage
- Export/import full story as JSON

## Next-Time Guidance

When resuming work:
1. Read this file first.
2. Treat output/cot-pages-ocr-v2 as the current source text.
3. If extraction quality needs improvement, update reextract_cot_ocr_split.py rather than rebuilding older workflows.
4. If graph or story outputs need regeneration, rerun build_story_graph.py, write_all_stories.py, and render_story_graph_svg.py in that order.
5. If web data needs regeneration, rerun `python3 scripts/build_web_data.py` after updating pipeline outputs.
6. To test locally: `cd web && python3 -m http.server 8080` then open http://localhost:8080
