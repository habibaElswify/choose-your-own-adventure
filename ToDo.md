# ToDo

## Setup
- [x] Fork repository
- [x] Read Fork-Instructions.md, AI-Instructions.md, Codebase.md
- [x] Create Brainstorm.md
- [x] Create ToDo.md
- [ ] Add Aasiya as collaborator on GitHub

## Data Pipeline
- [ ] Write `scripts/build_web_data.py` to convert story pages + graph into `web/data/story-data.json`
- [ ] Validate JSON output has all 111 pages and correct graph edges

## Web - Interactive Story Reader
- [ ] Landing page (`index.html`) with project overview and navigation
- [ ] Reader page (`reader.html`) -- read story page by page, click choices to branch
- [ ] Track current path, show breadcrumbs
- [ ] "The End" screen with restart / try different path options

## Web - Story Graph Explorer
- [ ] Explorer page (`explorer.html`) -- visual graph of all story nodes and edges
- [ ] Click nodes to preview page text
- [ ] Color-code terminal pages vs branching pages
- [ ] Highlight main trunk from page 2

## Web - Authoring Tool
- [ ] Author page (`author.html`) -- form to create new story pages
- [ ] Add choice connections between pages
- [ ] Save to localStorage, import/export as JSON
- [ ] Visual preview of story graph as pages are added

## Styling & Polish
- [ ] Consistent book-themed CSS across all pages
- [ ] Responsive design (works on mobile)
- [ ] Navigation bar between all views

## Documentation & Deployment
- [ ] Update Codebase.md with web architecture
- [ ] Update README.md with deployed URL, repo URL, team names
- [ ] Deploy to GitHub Pages
- [ ] Verify all team members have commits

## AI Interaction Log
- Brainstorming session: scoped project, chose static site approach
- Planning session: created ToDo.md with task breakdown
- Implementation: (will update as we build)
