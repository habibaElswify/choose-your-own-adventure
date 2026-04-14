# ToDo

## Setup
- [x] Fork repository
- [x] Read Fork-Instructions.md, AI-Instructions.md, Codebase.md
- [x] Create Brainstorm.md
- [x] Create ToDo.md
- [ ] Add Aasiya as collaborator on GitHub (need her GitHub username)

## Data Pipeline
- [x] Write `scripts/build_web_data.py` to convert story pages + graph into `web/data/story-data.json`
- [x] Validate JSON output has all 111 pages and correct graph edges

## Web - Interactive Story Reader
- [x] Landing page (`index.html`) with project overview and navigation
- [x] Reader page (`reader.html`) -- read story page by page, click choices to branch
- [x] Track current path, show breadcrumbs
- [x] "The End" display when hitting a terminal page, with buttons to restart or go back one step
- [x] Restart button always visible
- [x] Support ?start=N query param from explorer

## Web - Story Graph Explorer
- [x] Explorer page (`explorer.html`) -- visual graph of all story nodes and edges
- [x] Click nodes to preview page text
- [x] Color-code terminal pages vs branching pages
- [x] Highlight main trunk from page 2
- [x] Pan/zoom interactions

## Web - Authoring Tool
- [x] Author page (`author.html`) -- form to create new story pages
- [x] Add choice connections between pages
- [x] Save to localStorage, import/export as JSON
- [x] Visual preview of story graph as pages are added

## Styling & Polish
- [x] Consistent book-themed CSS across all pages
- [x] Responsive design (works on mobile)
- [x] Navigation bar between all views

## Documentation & Deployment
- [x] Update Codebase.md with web architecture
- [x] Update README.md with deployed URL, repo URL, team names
- [x] Deploy to GitHub Pages
- [ ] Verify deployed site is live
- [ ] Verify all team members have commits

## AI Interaction Log
- Brainstorming session: scoped project to static site with 3 views (reader, explorer, author)
- Planning session: created ToDo.md with full task breakdown
- Implementation: built data pipeline, 4 HTML pages, 3 JS modules, shared CSS
- Used Claude Code with documented instructions following professor's methodology
