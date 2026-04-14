/**
 * Story Graph Explorer
 * Renders an interactive graph of the Choose Your Own Adventure story structure.
 * Vanilla JS + HTML5 Canvas, no external dependencies.
 */
(function () {
  'use strict';

  // --- State ---
  let storyData = null;
  let nodes = {};       // pageNum -> { x, y, depth, pageNum }
  let edgeList = [];    // [{ from, to }]
  let selectedNode = null;
  let hoveredNode = null;

  // Camera / transform
  let camX = 0, camY = 0;
  let zoom = 1;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let camStartX = 0, camStartY = 0;

  // Layout constants
  const NODE_RADIUS = 18;
  const START_RADIUS = 24;
  const LAYER_HEIGHT = 100;
  const NODE_SPACING = 60;

  // Colors
  const COLORS = {
    start: '#4caf50',
    terminal: '#e74c3c',
    branch: '#f0c040',
    regular: '#c9a96e',
    edge: 'rgba(201, 169, 110, 0.25)',
    edgeHighlight: 'rgba(255, 220, 120, 0.8)',
    edgeSelected: 'rgba(100, 200, 255, 0.7)',
    text: '#1a1a2e',
    background: '#12121f',
  };

  // DOM refs
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('graphContainer');

  // --- Data loading ---
  async function loadData() {
    const resp = await fetch('data/story-data.json');
    storyData = await resp.json();
    populateStats();
    buildLayout();
    fitToView();
    render();
  }

  function populateStats() {
    const s = storyData.stats;
    document.getElementById('stat-pages').textContent = s.total_pages;
    document.getElementById('stat-stories').textContent = s.total_stories;
    document.getElementById('stat-endings').textContent = s.total_endings;
  }

  // --- Layout: BFS layered ---
  function buildLayout() {
    const pages = storyData.pages;
    const edges = storyData.edges;
    const startPage = String(storyData.start_page);

    // BFS to assign depth
    const depth = {};
    const queue = [startPage];
    depth[startPage] = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      const children = edges[current] || [];
      for (const child of children) {
        const key = String(child);
        if (depth[key] === undefined) {
          depth[key] = depth[current] + 1;
          queue.push(key);
        }
      }
    }

    // Also handle pages not reachable from start (assign them a high depth)
    for (const pageNum of Object.keys(pages)) {
      if (depth[pageNum] === undefined) {
        depth[pageNum] = 999;
      }
    }

    // Group by depth layer
    const layers = {};
    for (const [pageNum, d] of Object.entries(depth)) {
      if (d === 999) continue; // skip unreachable
      if (!layers[d]) layers[d] = [];
      layers[d].push(pageNum);
    }

    // Sort each layer by page number for consistency
    for (const d of Object.keys(layers)) {
      layers[d].sort((a, b) => Number(a) - Number(b));
    }

    // Assign positions
    const maxDepth = Math.max(...Object.keys(layers).map(Number));
    for (let d = 0; d <= maxDepth; d++) {
      const layer = layers[d] || [];
      const count = layer.length;
      const totalWidth = (count - 1) * NODE_SPACING;
      const startX = -totalWidth / 2;
      for (let i = 0; i < count; i++) {
        const pageNum = layer[i];
        nodes[pageNum] = {
          x: startX + i * NODE_SPACING,
          y: d * LAYER_HEIGHT,
          depth: d,
          pageNum: pageNum,
        };
      }
    }

    // Build edge list (only for nodes we have positions for)
    edgeList = [];
    for (const [from, targets] of Object.entries(edges)) {
      if (!nodes[from]) continue;
      for (const to of targets) {
        const toKey = String(to);
        if (!nodes[toKey]) continue;
        edgeList.push({ from, to: toKey });
      }
    }
  }

  // --- Classify node type ---
  function nodeType(pageNum) {
    const pn = String(pageNum);
    if (Number(pn) === storyData.start_page) return 'start';
    if (storyData.terminal_pages.includes(Number(pn))) return 'terminal';
    const outgoing = storyData.edges[pn] || [];
    if (outgoing.length >= 2) return 'branch';
    return 'regular';
  }

  function nodeColor(pageNum) {
    return COLORS[nodeType(pageNum)];
  }

  function nodeRadius(pageNum) {
    return nodeType(pageNum) === 'start' ? START_RADIUS : NODE_RADIUS;
  }

  // --- Rendering ---
  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  function worldToScreen(wx, wy) {
    return {
      x: (wx + camX) * zoom + canvas.width / 2,
      y: (wy + camY) * zoom + canvas.height / 2,
    };
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - canvas.width / 2) / zoom - camX,
      y: (sy - canvas.height / 2) / zoom - camY,
    };
  }

  function render() {
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    for (const edge of edgeList) {
      const fromNode = nodes[edge.from];
      const toNode = nodes[edge.to];
      if (!fromNode || !toNode) continue;

      const from = worldToScreen(fromNode.x, fromNode.y);
      const to = worldToScreen(toNode.x, toNode.y);

      // Determine edge color
      let color = COLORS.edge;
      if (selectedNode && (edge.from === selectedNode || edge.to === selectedNode)) {
        color = COLORS.edgeSelected;
      } else if (hoveredNode && (edge.from === hoveredNode || edge.to === hoveredNode)) {
        color = COLORS.edgeHighlight;
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = (color === COLORS.edge) ? 1.2 : 2.5;

      // Draw a slight curve for visual clarity
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const offsetX = dx === 0 ? 0 : Math.sign(dx) * 10 * zoom;
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(midX + offsetX, midY, to.x, to.y);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(to.y - midY, to.x - midX);
      const r = nodeRadius(edge.to) * zoom;
      const ax = to.x - Math.cos(angle) * r;
      const ay = to.y - Math.sin(angle) * r;
      const arrowSize = 6 * zoom;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - arrowSize * Math.cos(angle - 0.4), ay - arrowSize * Math.sin(angle - 0.4));
      ctx.lineTo(ax - arrowSize * Math.cos(angle + 0.4), ay - arrowSize * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    // Draw nodes
    for (const [pageNum, node] of Object.entries(nodes)) {
      const pos = worldToScreen(node.x, node.y);
      const r = nodeRadius(pageNum) * zoom;

      // Skip if off-screen
      if (pos.x + r < 0 || pos.x - r > canvas.width || pos.y + r < 0 || pos.y - r > canvas.height) continue;

      const isSelected = selectedNode === pageNum;
      const isHovered = hoveredNode === pageNum;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 4 * zoom, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(100, 200, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)';
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor(pageNum);
      ctx.fill();

      if (isSelected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#64c8ff';
        ctx.stroke();
      }

      // Label
      const fontSize = Math.max(8, Math.round(11 * zoom));
      ctx.font = `bold ${fontSize}px Georgia`;
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(pageNum), pos.x, pos.y);
    }
  }

  // --- Hit detection ---
  function hitTest(sx, sy) {
    const world = screenToWorld(sx, sy);
    let closest = null;
    let closestDist = Infinity;
    for (const [pageNum, node] of Object.entries(nodes)) {
      const dx = world.x - node.x;
      const dy = world.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = nodeRadius(pageNum);
      if (dist < r + 4 && dist < closestDist) {
        closest = pageNum;
        closestDist = dist;
      }
    }
    return closest;
  }

  // --- Side panel ---
  function showPageDetail(pageNum) {
    const page = storyData.pages[pageNum];
    if (!page) return;

    document.getElementById('panelPlaceholder').style.display = 'none';
    const detail = document.getElementById('pageDetail');
    detail.classList.add('visible');

    document.getElementById('detailPageNum').textContent = 'Page ' + page.number;

    // Badges
    const badgesEl = document.getElementById('detailBadges');
    badgesEl.innerHTML = '';
    const type = nodeType(pageNum);
    if (type === 'start') {
      badgesEl.innerHTML = '<span class="page-badge badge-start">Start</span>';
    }
    if (type === 'terminal') {
      badgesEl.innerHTML += '<span class="page-badge badge-terminal">Ending</span>';
    }
    if (type === 'branch') {
      badgesEl.innerHTML += '<span class="page-badge badge-branch">Branch</span>';
    }

    // Text preview (first 200 chars)
    const rawText = page.text || '';
    // Strip leading "Page N\n" prefix
    const textBody = rawText.replace(/^Page \d+\n+/, '');
    const preview = textBody.length > 200 ? textBody.substring(0, 200) + '...' : textBody;
    document.getElementById('detailText').textContent = preview;

    // Choices
    const choicesEl = document.getElementById('detailChoices');
    const noChoicesEl = document.getElementById('detailNoChoices');
    choicesEl.innerHTML = '';

    if (page.choices && page.choices.length > 0) {
      noChoicesEl.style.display = 'none';
      for (const choice of page.choices) {
        const li = document.createElement('li');
        li.textContent = choice.label || ('Go to page ' + choice.target);
        li.addEventListener('click', () => {
          selectNode(String(choice.target));
        });
        choicesEl.appendChild(li);
      }
    } else {
      noChoicesEl.style.display = 'block';
    }

    // Read from here link
    document.getElementById('readFromHere').href = 'reader.html?start=' + page.number;
  }

  function selectNode(pageNum) {
    selectedNode = pageNum;
    showPageDetail(pageNum);

    // Center on selected node
    const node = nodes[pageNum];
    if (node) {
      camX = -node.x;
      camY = -node.y;
    }

    render();
  }

  function clearSelection() {
    selectedNode = null;
    document.getElementById('panelPlaceholder').style.display = 'block';
    document.getElementById('pageDetail').classList.remove('visible');
    render();
  }

  // --- Camera controls ---
  function fitToView() {
    if (Object.keys(nodes).length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of Object.values(nodes)) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }
    const pad = 60;
    const graphW = maxX - minX + pad * 2;
    const graphH = maxY - minY + pad * 2;
    const scaleX = canvas.width / graphW;
    const scaleY = canvas.height / graphH;
    zoom = Math.min(scaleX, scaleY, 2);
    zoom = Math.max(zoom, 0.1);
    camX = -(minX + maxX) / 2;
    camY = -(minY + maxY) / 2;
  }

  // --- Event handlers ---
  canvas.addEventListener('mousedown', (e) => {
    const hit = hitTest(e.offsetX, e.offsetY);
    if (hit) {
      selectNode(hit);
      return;
    }
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    camStartX = camX;
    camStartY = camY;
    container.classList.add('grabbing');
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = (e.clientX - dragStartX) / zoom;
      const dy = (e.clientY - dragStartY) / zoom;
      camX = camStartX + dx;
      camY = camStartY + dy;
      render();
      return;
    }

    const hit = hitTest(e.offsetX, e.offsetY);
    if (hit !== hoveredNode) {
      hoveredNode = hit;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
      render();
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    container.classList.remove('grabbing');
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    container.classList.remove('grabbing');
    if (hoveredNode) {
      hoveredNode = null;
      render();
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.05, Math.min(5, zoom * factor));

    // Zoom toward mouse position
    const wx = (e.offsetX - canvas.width / 2) / zoom - camX;
    const wy = (e.offsetY - canvas.height / 2) / zoom - camY;

    zoom = newZoom;

    // Adjust camera so the world point under the mouse stays put
    camX = (e.offsetX - canvas.width / 2) / zoom - wx;
    camY = (e.offsetY - canvas.height / 2) / zoom - wy;

    render();
  }, { passive: false });

  // Zoom buttons
  document.getElementById('zoomIn').addEventListener('click', () => {
    zoom = Math.min(5, zoom * 1.25);
    render();
  });
  document.getElementById('zoomOut').addEventListener('click', () => {
    zoom = Math.max(0.05, zoom * 0.8);
    render();
  });
  document.getElementById('zoomFit').addEventListener('click', () => {
    fitToView();
    render();
  });

  // Resize
  window.addEventListener('resize', () => {
    render();
  });

  // Click on canvas background clears selection
  canvas.addEventListener('dblclick', () => {
    clearSelection();
  });

  // --- Init ---
  resizeCanvas();
  loadData();
})();
