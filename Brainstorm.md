# Brainstorm

## Team
- Habiba Elswify
- Aasiya

## What We're Building

A web-based interface on top of Professor Pisan's "Cave of Time" data pipeline. The existing repo already has:
- 111 OCR-extracted story pages
- A Mermaid story graph mapping all branching paths
- 45 generated complete story paths

We need to build the **web layer**: a reader, a graph explorer, and an authoring tool.

## Ideas & Approaches

### Approach 1: Static Site with Three Views
- **Reader**: Interactive page-by-page story experience with clickable choices
- **Graph Explorer**: Visual map of the entire story structure, clickable nodes
- **Authoring Tool**: Form-based interface to create/edit pages and connect them

**Pros**: Simple to deploy (GitHub Pages), no backend needed, all data bundled as JSON
**Cons**: Authoring tool can only export JSON (no persistent server-side storage)

### Approach 2: Full-Stack App (React + Backend)
**Pros**: Real persistence for authoring
**Cons**: Overkill for the deadline, harder to deploy, more complexity

### Approach 3: Static Site with localStorage Persistence
Same as Approach 1 but authoring tool saves to browser localStorage and can import/export JSON files.

**Pros**: Authors can save work locally, export/share story files
**Cons**: Data lives in the browser only

## Decision

**Going with Approach 3** -- static HTML/CSS/JS site deployed on GitHub Pages. The authoring tool uses localStorage + JSON export so authors can save and share their work. This balances the professor's requirements (authoring + reading + visualization) with the deadline reality.

## Key Design Decisions

1. **Data pipeline**: Python script converts existing `.txt` pages + `.mmd` graph into a single `story-data.json` consumed by the frontend
2. **Tech stack**: Vanilla HTML/CSS/JS -- no build step, no framework, minimal complexity
3. **Deployment**: GitHub Pages (free, automatic from the repo)
4. **Styling**: Clean, book-themed aesthetic that fits a CYOA story
5. **Graph rendering**: Canvas-based or SVG for the story graph visualization

## Professor's Methodology We're Following
- Using AI iteratively with documented instructions
- Planning before implementation
- Keeping creation traces (this file, ToDo.md, commit history)
- Reading Codebase.md before making changes
- Updating Codebase.md with our additions
