(function () {
  'use strict';

  // ---- State ----
  let storyData = null;   // full JSON
  let path = [];           // array of page numbers representing current journey
  let visitedSet = new Set();

  // ---- DOM refs ----
  const pageNumberEl   = document.getElementById('page-number');
  const pageTextEl     = document.getElementById('page-text');
  const choicesArea    = document.getElementById('choices-area');
  const breadcrumbsEl  = document.getElementById('breadcrumbs');
  const endOverlay     = document.getElementById('end-overlay');
  const journeyStat    = document.getElementById('journey-stat');
  const bookPage       = document.getElementById('book-page');
  const statPathLen    = document.getElementById('stat-path-length');
  const statVisited    = document.getElementById('stat-pages-visited');

  // ---- Load data ----
  fetch('data/story-data.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load story data');
      return res.json();
    })
    .then(function (data) {
      storyData = data;
      startStory();
    })
    .catch(function (err) {
      pageTextEl.textContent = 'Error loading story data: ' + err.message;
    });

  // ---- Core functions ----

  function startStory() {
    // Support ?start=PAGE_NUM from explorer's "Read from here" link
    var params = new URLSearchParams(window.location.search);
    var startPage = parseInt(params.get('start'), 10) || storyData.start_page || 2;
    if (!storyData.pages[String(startPage)]) {
      startPage = storyData.start_page || 2;
    }
    path = [startPage];
    visitedSet = new Set([startPage]);
    renderPage(startPage, false);
  }

  function renderPage(pageNum, animate) {
    var page = storyData.pages[String(pageNum)];
    if (!page) {
      pageTextEl.textContent = 'Page ' + pageNum + ' not found.';
      choicesArea.innerHTML = '';
      endOverlay.classList.remove('visible');
      updateBreadcrumbs();
      updateStats();
      return;
    }

    if (animate) {
      bookPage.classList.add('fade-out');
      setTimeout(function () {
        populatePage(page);
        bookPage.classList.remove('fade-out');
      }, 200);
    } else {
      populatePage(page);
    }
  }

  function populatePage(page) {
    // Page number header
    pageNumberEl.textContent = 'Page ' + page.number;

    // Strip the leading "Page N\n" prefix from the display text since we show
    // the page number separately in the header.
    var displayText = page.text;
    var prefixMatch = displayText.match(/^Page\s+\d+\n+/);
    if (prefixMatch) {
      displayText = displayText.substring(prefixMatch[0].length);
    }
    pageTextEl.textContent = displayText;

    // Choices
    choicesArea.innerHTML = '';
    endOverlay.classList.remove('visible');

    if (page.is_terminal) {
      // Show The End
      var journeyLen = path.length;
      journeyStat.textContent =
        'Your journey spanned ' + journeyLen + ' page' + (journeyLen === 1 ? '' : 's') + '.';
      endOverlay.classList.add('visible');
    } else if (page.choices && page.choices.length > 0) {
      page.choices.forEach(function (choice) {
        var btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.label;
        btn.addEventListener('click', function () {
          navigateTo(choice.target);
        });
        choicesArea.appendChild(btn);
      });
    }

    updateBreadcrumbs();
    updateStats();

    // Scroll to top of book page
    bookPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function navigateTo(pageNum) {
    path.push(pageNum);
    visitedSet.add(pageNum);
    renderPage(pageNum, true);
  }

  // ---- Breadcrumbs ----

  function updateBreadcrumbs() {
    breadcrumbsEl.innerHTML = '';

    path.forEach(function (pageNum, index) {
      if (index > 0) {
        var sep = document.createElement('span');
        sep.className = 'separator';
        sep.textContent = ' \u203A ';
        breadcrumbsEl.appendChild(sep);
      }

      var crumb = document.createElement('span');
      crumb.className = 'crumb';
      crumb.textContent = 'Page ' + pageNum;

      if (index === path.length - 1) {
        crumb.classList.add('current');
      } else {
        (function (targetIndex) {
          crumb.addEventListener('click', function () {
            goBackTo(targetIndex);
          });
        })(index);
      }

      breadcrumbsEl.appendChild(crumb);
    });
  }

  function goBackTo(index) {
    // Truncate the path to the selected breadcrumb (inclusive)
    path = path.slice(0, index + 1);
    var pageNum = path[path.length - 1];
    renderPage(pageNum, true);
  }

  // ---- Stats ----

  function updateStats() {
    statPathLen.textContent = path.length;
    statVisited.textContent = visitedSet.size;
  }

  // ---- Restart / Go Back buttons ----

  document.getElementById('btn-sidebar-restart').addEventListener('click', function () {
    startStory();
  });

  document.getElementById('btn-end-restart').addEventListener('click', function () {
    startStory();
  });

  document.getElementById('btn-end-goback').addEventListener('click', function () {
    if (path.length > 1) {
      goBackTo(path.length - 2);
    }
  });

})();
