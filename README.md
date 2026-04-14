# The Cave of Time - Choose Your Own Adventure

A web-based interactive experience built on top of the classic *Cave of Time* CYOA story. Read the story, explore the branching graph, or create your own adventure.

## Deployed Website

**Live Site**: https://habibaelswify.github.io/choose-your-own-adventure/web/

## GitHub Repository

**Repo**: https://github.com/habibaElswify/choose-your-own-adventure

## Team

- Habiba Elswify
- Aasiya

## Features

### Interactive Story Reader
Read through *The Cave of Time* one page at a time, making choices at each branch point. Track your journey with breadcrumbs and discover all 42 possible endings.

### Story Graph Explorer
Visualize the entire story as an interactive graph. Click nodes to preview pages, zoom and pan to explore, and jump into the reader from any point in the story.

### Authoring Tool
Create your own branching stories. Add pages, define choices, connect paths, and export your creation as a shareable JSON file.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Data Pipeline**: Python scripts for OCR extraction, graph building, and JSON generation
- **Deployment**: GitHub Pages (static site)

## Running Locally

```bash
# Generate web data from story pipeline
python3 scripts/build_web_data.py

# Start local server
cd web && python3 -m http.server 8080
# Open http://localhost:8080
```

## Project Structure

```
scripts/                    # Python data pipeline
  build_story_graph.py      # Build Mermaid graph from OCR pages
  write_all_stories.py      # Generate all story paths
  render_story_graph_svg.py # Render graph to SVG
  build_web_data.py         # Convert pipeline output to web JSON
output/                     # Pipeline outputs
  cot-pages-ocr-v2/         # 111 extracted story pages
  cot-story-graph.mmd       # Mermaid story graph
  cot-stories/              # 45 generated story paths
web/                        # Static web frontend
  index.html                # Landing page
  reader.html               # Interactive story reader
  explorer.html             # Graph visualization
  author.html               # Authoring tool
  css/style.css             # Shared styles
  js/                       # Page-specific JavaScript
  data/story-data.json      # Generated data for frontend
```

## Course

CSS 382 - Introduction to Artificial Intelligence, Spring 2026, Bellevue College
