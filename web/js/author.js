(function () {
  'use strict';

  // --- State ---
  let baseData = { pages: {}, edges: {} };
  let customPages = {};       // page number (string) -> page object
  let selectedPageNum = null;
  let unsavedChanges = false;

  // --- DOM refs ---
  const pageListEl = document.getElementById('page-list');
  const editorForm = document.getElementById('editor-form');
  const emptyState = document.getElementById('empty-state');
  const editorTitle = document.getElementById('editor-title');
  const pageNumberInput = document.getElementById('page-number');
  const pageTextInput = document.getElementById('page-text');
  const isTerminalInput = document.getElementById('is-terminal');
  const choicesContainer = document.getElementById('choices-container');
  const choicesSection = document.getElementById('choices-section');
  const btnSave = document.getElementById('btn-save');
  const btnDelete = document.getElementById('btn-delete');
  const btnAddChoice = document.getElementById('btn-add-choice');
  const btnNewPage = document.getElementById('btn-new-page');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const btnClear = document.getElementById('btn-clear');
  const importInput = document.getElementById('import-input');
  const statusTotal = document.getElementById('status-total');
  const statusCustom = document.getElementById('status-custom');
  const statusUnsaved = document.getElementById('status-unsaved');
  const canvas = document.getElementById('mini-graph');
  const ctx = canvas.getContext('2d');

  // --- Init ---
  async function init() {
    loadCustomPages();
    await loadBaseData();
    renderPageList();
    updateStatus();
    setupEvents();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  async function loadBaseData() {
    try {
      const resp = await fetch('data/story-data.json');
      baseData = await resp.json();
    } catch (e) {
      console.warn('Could not load story-data.json:', e);
      baseData = { pages: {}, edges: {} };
    }
  }

  function loadCustomPages() {
    try {
      const raw = localStorage.getItem('cyoa-custom-pages');
      if (raw) customPages = JSON.parse(raw);
    } catch (e) {
      customPages = {};
    }
  }

  function saveCustomPages() {
    localStorage.setItem('cyoa-custom-pages', JSON.stringify(customPages));
  }

  // --- Merged data helpers ---
  function getMergedPages() {
    const merged = {};
    for (const [k, v] of Object.entries(baseData.pages || {})) {
      merged[k] = { ...v, _source: 'original' };
    }
    for (const [k, v] of Object.entries(customPages)) {
      merged[k] = { ...v, _source: 'custom' };
    }
    return merged;
  }

  function getMergedEdges() {
    const edges = { ...(baseData.edges || {}) };
    for (const [k, v] of Object.entries(customPages)) {
      if (v.choices && v.choices.length > 0) {
        edges[k] = v.choices.map(c => c.target);
      } else {
        delete edges[k];
      }
    }
    return edges;
  }

  function getAllPageNumbers() {
    const merged = getMergedPages();
    return Object.keys(merged).map(Number).sort((a, b) => a - b);
  }

  function getNextPageNumber() {
    const nums = getAllPageNumbers();
    if (nums.length === 0) return 1;
    return Math.max(...nums) + 1;
  }

  // --- Render page list ---
  function renderPageList() {
    const merged = getMergedPages();
    const sorted = Object.values(merged).sort((a, b) => a.number - b.number);
    pageListEl.innerHTML = '';
    sorted.forEach(page => {
      const item = document.createElement('div');
      item.className = 'page-item' + (selectedPageNum === page.number ? ' selected' : '');
      const label = document.createElement('span');
      label.textContent = 'Page ' + page.number;
      item.appendChild(label);

      const badges = document.createElement('span');
      if (page._source === 'custom') {
        const b = document.createElement('span');
        b.className = 'badge custom';
        b.textContent = 'Custom';
        badges.appendChild(b);
      } else {
        const b = document.createElement('span');
        b.className = 'badge original';
        b.textContent = 'Original';
        badges.appendChild(b);
      }
      if (page.is_terminal) {
        const b = document.createElement('span');
        b.className = 'badge terminal';
        b.textContent = 'End';
        b.style.marginLeft = '4px';
        badges.appendChild(b);
      }
      item.appendChild(badges);

      item.addEventListener('click', () => selectPage(page.number));
      pageListEl.appendChild(item);
    });
  }

  // --- Select / edit page ---
  function selectPage(num) {
    selectedPageNum = num;
    const merged = getMergedPages();
    const page = merged[String(num)];
    if (!page) return;

    emptyState.style.display = 'none';
    editorForm.style.display = 'block';

    editorTitle.textContent = page._source === 'custom' ? 'Edit Custom Page ' + num : 'View Page ' + num;
    pageNumberInput.value = num;
    pageTextInput.value = page.text || '';
    isTerminalInput.checked = !!page.is_terminal;

    toggleChoicesVisibility();
    renderChoices(page.choices || []);

    // Show delete only for custom pages
    btnDelete.style.display = page._source === 'custom' ? 'inline-block' : 'none';

    renderPageList();
    drawMiniGraph(num);
    setUnsaved(false);
  }

  function toggleChoicesVisibility() {
    choicesSection.style.display = isTerminalInput.checked ? 'none' : 'block';
  }

  function renderChoices(choices) {
    choicesContainer.innerHTML = '';
    choices.forEach((choice, i) => {
      addChoiceRow(choice.label, choice.target);
    });
  }

  function addChoiceRow(label, target) {
    const row = document.createElement('div');
    row.className = 'choice-row';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Choice label';
    inp.value = label || '';
    inp.addEventListener('input', () => setUnsaved(true));

    const sel = document.createElement('select');
    populateTargetDropdown(sel, target);
    sel.addEventListener('change', () => {
      setUnsaved(true);
      drawMiniGraphFromEditor();
    });

    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      row.remove();
      setUnsaved(true);
      drawMiniGraphFromEditor();
    });

    row.appendChild(inp);
    row.appendChild(sel);
    row.appendChild(btn);
    choicesContainer.appendChild(row);
  }

  function populateTargetDropdown(sel, selected) {
    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '-- target --';
    sel.appendChild(opt0);
    getAllPageNumbers().forEach(num => {
      const opt = document.createElement('option');
      opt.value = num;
      opt.textContent = 'Page ' + num;
      if (num === selected) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // --- Collect form data ---
  function collectFormData() {
    const num = parseInt(pageNumberInput.value, 10);
    const text = pageTextInput.value;
    const terminal = isTerminalInput.checked;
    const choices = [];

    if (!terminal) {
      const rows = choicesContainer.querySelectorAll('.choice-row');
      rows.forEach(row => {
        const label = row.querySelector('input').value.trim();
        const target = parseInt(row.querySelector('select').value, 10);
        if (label && !isNaN(target)) {
          choices.push({ target, label });
        }
      });
    }

    return {
      number: num,
      text: text,
      choices: choices,
      is_terminal: terminal
    };
  }

  // --- Save ---
  function savePage() {
    if (selectedPageNum === null) return;
    const data = collectFormData();
    const key = String(data.number);

    customPages[key] = data;
    saveCustomPages();
    setUnsaved(false);
    renderPageList();
    updateStatus();
    selectPage(data.number);
  }

  // --- Delete ---
  function deletePage() {
    if (selectedPageNum === null) return;
    const key = String(selectedPageNum);
    if (!customPages[key]) {
      alert('Cannot delete original pages.');
      return;
    }
    if (!confirm('Delete custom page ' + selectedPageNum + '?')) return;
    delete customPages[key];
    saveCustomPages();
    selectedPageNum = null;
    editorForm.style.display = 'none';
    emptyState.style.display = 'block';
    renderPageList();
    updateStatus();
    clearCanvas();
  }

  // --- New page ---
  function newPage() {
    const num = getNextPageNumber();
    const page = {
      number: num,
      text: '',
      choices: [],
      is_terminal: false
    };
    customPages[String(num)] = page;
    saveCustomPages();
    renderPageList();
    updateStatus();
    selectPage(num);
  }

  // --- Export ---
  function exportJSON() {
    const merged = getMergedPages();
    const exportData = {
      start_page: baseData.start_page || 2,
      pages: {},
      edges: getMergedEdges()
    };
    for (const [k, v] of Object.entries(merged)) {
      const { _source, ...rest } = v;
      exportData.pages[k] = rest;
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'story-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Import ---
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.pages) {
          // Treat all imported pages that are not in base as custom
          for (const [k, v] of Object.entries(data.pages)) {
            if (!baseData.pages[k]) {
              customPages[k] = v;
            } else {
              // Overwrite original with imported version as custom
              customPages[k] = v;
            }
          }
          saveCustomPages();
          renderPageList();
          updateStatus();
          alert('Imported successfully. All imported pages saved as custom.');
        } else {
          alert('Invalid JSON: missing "pages" key.');
        }
      } catch (err) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // --- Clear custom ---
  function clearCustom() {
    if (!confirm('Clear all custom pages? This cannot be undone.')) return;
    customPages = {};
    localStorage.removeItem('cyoa-custom-pages');
    selectedPageNum = null;
    editorForm.style.display = 'none';
    emptyState.style.display = 'block';
    renderPageList();
    updateStatus();
    clearCanvas();
  }

  // --- Status ---
  function updateStatus() {
    const merged = getMergedPages();
    const total = Object.keys(merged).length;
    const custom = Object.keys(customPages).length;
    statusTotal.textContent = 'Total: ' + total;
    statusCustom.textContent = 'Custom: ' + custom;
  }

  function setUnsaved(val) {
    unsavedChanges = val;
    statusUnsaved.style.display = val ? 'inline' : 'none';
  }

  // --- Mini graph ---
  function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight - 40; // account for header
    if (selectedPageNum !== null) {
      drawMiniGraph(selectedPageNum);
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawMiniGraph(centerNum) {
    clearCanvas();
    const merged = getMergedPages();
    const edges = getMergedEdges();
    const w = canvas.width;
    const h = canvas.height;

    if (w < 50 || h < 50) return;

    const centerPage = merged[String(centerNum)];
    if (!centerPage) return;

    // Collect connected pages: targets from this page, and pages pointing to this page
    const targets = (edges[String(centerNum)] || []).map(Number);
    const sources = [];
    for (const [src, dests] of Object.entries(edges)) {
      if (dests.includes(centerNum) && parseInt(src) !== centerNum) {
        sources.push(parseInt(src));
      }
    }

    // Layout: center node in middle, sources on left, targets on right
    const nodes = {};
    const cx = w / 2;
    const cy = h / 2;
    const radius = 22;

    nodes[centerNum] = { x: cx, y: cy, num: centerNum, type: 'center' };

    // Sources on left
    const srcSpacing = Math.min(60, (h - 40) / Math.max(sources.length, 1));
    const srcStartY = cy - ((sources.length - 1) * srcSpacing) / 2;
    sources.forEach((s, i) => {
      nodes[s] = { x: cx - 120, y: srcStartY + i * srcSpacing, num: s, type: 'source' };
    });

    // Targets on right
    const tgtSpacing = Math.min(60, (h - 40) / Math.max(targets.length, 1));
    const tgtStartY = cy - ((targets.length - 1) * tgtSpacing) / 2;
    targets.forEach((t, i) => {
      nodes[t] = nodes[t] || { x: cx + 120, y: tgtStartY + i * tgtSpacing, num: t, type: 'target' };
    });

    // Draw edges
    ctx.strokeStyle = '#533483';
    ctx.lineWidth = 2;

    // source -> center
    sources.forEach(s => {
      drawArrow(nodes[s].x + radius, nodes[s].y, nodes[centerNum].x - radius, nodes[centerNum].y);
    });

    // center -> target
    targets.forEach(t => {
      if (nodes[t]) {
        drawArrow(nodes[centerNum].x + radius, nodes[centerNum].y, nodes[t].x - radius, nodes[t].y);
      }
    });

    // Draw nodes
    for (const node of Object.values(nodes)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      if (node.type === 'center') {
        ctx.fillStyle = '#e94560';
      } else if (node.type === 'source') {
        ctx.fillStyle = '#0f3460';
      } else {
        ctx.fillStyle = '#2d6a4f';
      }
      ctx.fill();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(node.num), node.x, node.y);
    }

    // Legend
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Red = current, Blue = incoming, Green = outgoing', 8, h - 8);
  }

  function drawArrow(x1, y1, x2, y2) {
    const headLen = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#533483';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = '#533483';
    ctx.fill();
  }

  function drawMiniGraphFromEditor() {
    if (selectedPageNum === null) return;
    // Read targets from current choice rows
    const targets = [];
    const rows = choicesContainer.querySelectorAll('.choice-row');
    rows.forEach(row => {
      const val = parseInt(row.querySelector('select').value, 10);
      if (!isNaN(val)) targets.push(val);
    });

    // Temporarily update edges for preview
    const origEdges = getMergedEdges();
    origEdges[String(selectedPageNum)] = targets;

    // Draw with temporary edges
    clearCanvas();
    const merged = getMergedPages();
    const w = canvas.width;
    const h = canvas.height;
    const centerNum = selectedPageNum;

    if (w < 50 || h < 50) return;

    const sources = [];
    for (const [src, dests] of Object.entries(origEdges)) {
      if (dests.includes(centerNum) && parseInt(src) !== centerNum) {
        sources.push(parseInt(src));
      }
    }

    const nodes = {};
    const cx = w / 2;
    const cy = h / 2;
    const radius = 22;

    nodes[centerNum] = { x: cx, y: cy, num: centerNum, type: 'center' };

    const srcSpacing = Math.min(60, (h - 40) / Math.max(sources.length, 1));
    const srcStartY = cy - ((sources.length - 1) * srcSpacing) / 2;
    sources.forEach((s, i) => {
      nodes[s] = { x: cx - 120, y: srcStartY + i * srcSpacing, num: s, type: 'source' };
    });

    const tgtSpacing = Math.min(60, (h - 40) / Math.max(targets.length, 1));
    const tgtStartY = cy - ((targets.length - 1) * tgtSpacing) / 2;
    targets.forEach((t, i) => {
      nodes[t] = nodes[t] || { x: cx + 120, y: tgtStartY + i * tgtSpacing, num: t, type: 'target' };
    });

    ctx.strokeStyle = '#533483';
    ctx.lineWidth = 2;
    sources.forEach(s => {
      drawArrow(nodes[s].x + radius, nodes[s].y, nodes[centerNum].x - radius, nodes[centerNum].y);
    });
    targets.forEach(t => {
      if (nodes[t]) {
        drawArrow(nodes[centerNum].x + radius, nodes[centerNum].y, nodes[t].x - radius, nodes[t].y);
      }
    });

    for (const node of Object.values(nodes)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      if (node.type === 'center') ctx.fillStyle = '#e94560';
      else if (node.type === 'source') ctx.fillStyle = '#0f3460';
      else ctx.fillStyle = '#2d6a4f';
      ctx.fill();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(node.num), node.x, node.y);
    }

    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Red = current, Blue = incoming, Green = outgoing', 8, h - 8);
  }

  // --- Events ---
  function setupEvents() {
    btnNewPage.addEventListener('click', newPage);
    btnSave.addEventListener('click', savePage);
    btnDelete.addEventListener('click', deletePage);
    btnAddChoice.addEventListener('click', () => {
      addChoiceRow('', null);
      setUnsaved(true);
    });
    btnExport.addEventListener('click', exportJSON);
    btnImport.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importJSON(e.target.files[0]);
        e.target.value = '';
      }
    });
    btnClear.addEventListener('click', clearCustom);

    isTerminalInput.addEventListener('change', () => {
      toggleChoicesVisibility();
      setUnsaved(true);
      drawMiniGraphFromEditor();
    });

    pageTextInput.addEventListener('input', () => setUnsaved(true));
  }

  // --- Start ---
  init();
})();
