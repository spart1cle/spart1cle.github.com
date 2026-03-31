// ── Thoughts Page ────────────────────────────────────────────
(function () {
  'use strict';

  const { escapeHtml, updateHash, readHash, collapseTags, handleTagClick, initSearchShortcut } = SiteUtils;

  const listEl = document.getElementById('thoughts-list');
  const searchEl = document.getElementById('thoughts-search');
  const tagFiltersEl = document.getElementById('thoughts-tag-filters');
  const countEl = document.getElementById('thoughts-count');
  const clearBtns = document.querySelectorAll('.thoughts-clear');
  const clearBtnTag = clearBtns[0];
  const clearBtnMonth = clearBtns[1];
  const searchClearBtn = document.getElementById('thoughts-search-clear');
  const sortEl = document.getElementById('thoughts-sort');

  let thoughts = [];
  const activeTags = new Set();
  let searchTimeout = null;
  let activeMonth = null;
  let monthDensityMap = {};
  let activeSort = 'date';
  let sortAsc = false;
  let hasRendered = false;

  // ── Emoji Map ─────────────────────────────────────────────
  const EMOJI_MAP = {
    smile: '\u{1F604}', grinning: '\u{1F600}', laughing: '\u{1F606}',
    joy: '\u{1F602}', rofl: '\u{1F923}', wink: '\u{1F609}',
    blush: '\u{1F60A}', heart_eyes: '\u{1F60D}', thinking: '\u{1F914}',
    neutral_face: '\u{1F610}', unamused: '\u{1F612}', rolling_eyes: '\u{1F644}',
    grimacing: '\u{1F62C}', cry: '\u{1F622}', sob: '\u{1F62D}',
    scream: '\u{1F631}', sunglasses: '\u{1F60E}', nerd_face: '\u{1F913}',
    mind_blown: '\u{1F92F}', skull: '\u{1F480}',
    thumbsup: '\u{1F44D}', '+1': '\u{1F44D}', '-1': '\u{1F44E}',
    clap: '\u{1F44F}', wave: '\u{1F44B}', raised_hands: '\u{1F64C}',
    pray: '\u{1F64F}', muscle: '\u{1F4AA}', ok_hand: '\u{1F44C}',
    eyes: '\u{1F440}', brain: '\u{1F9E0}',
    heart: '\u{2764}\u{FE0F}', broken_heart: '\u{1F494}', sparkling_heart: '\u{1F496}',
    fire: '\u{1F525}', star: '\u{2B50}', sparkles: '\u{2728}',
    zap: '\u{26A1}', boom: '\u{1F4A5}', 100: '\u{1F4AF}',
    trophy: '\u{1F3C6}', rocket: '\u{1F680}',
    bulb: '\u{1F4A1}', lightbulb: '\u{1F4A1}',
    warning: '\u{26A0}\u{FE0F}', x: '\u{274C}',
    check: '\u{2705}', white_check_mark: '\u{2705}',
    question: '\u{2753}', exclamation: '\u{2757}',
    pin: '\u{1F4CC}', pushpin: '\u{1F4CC}', link: '\u{1F517}',
    key: '\u{1F511}', lock: '\u{1F512}', bell: '\u{1F514}',
    book: '\u{1F4D6}', books: '\u{1F4DA}', memo: '\u{1F4DD}',
    pencil: '\u{270F}\u{FE0F}', clipboard: '\u{1F4CB}', chart: '\u{1F4C8}',
    computer: '\u{1F4BB}', phone: '\u{1F4F1}',
    mag: '\u{1F50D}', microscope: '\u{1F52C}', telescope: '\u{1F52D}',
    gear: '\u{2699}\u{FE0F}', wrench: '\u{1F527}', hammer: '\u{1F528}',
    tools: '\u{1F6E0}\u{FE0F}', shield: '\u{1F6E1}\u{FE0F}', package: '\u{1F4E6}',
    sun: '\u{2600}\u{FE0F}', moon: '\u{1F319}', cloud: '\u{2601}\u{FE0F}',
    rainbow: '\u{1F308}', earth: '\u{1F30D}', globe: '\u{1F310}',
    seedling: '\u{1F331}', tree: '\u{1F333}',
    robot: '\u{1F916}', bug: '\u{1F41B}',
    coffee: '\u{2615}', beer: '\u{1F37A}', pizza: '\u{1F355}', cake: '\u{1F382}',
    tada: '\u{1F389}', party: '\u{1F389}', confetti: '\u{1F38A}',
    gift: '\u{1F381}', balloon: '\u{1F388}',
    arrow_up: '\u{2B06}\u{FE0F}', arrow_down: '\u{2B07}\u{FE0F}',
    arrow_left: '\u{2B05}\u{FE0F}', arrow_right: '\u{27A1}\u{FE0F}',
  };

  // ── Data Loading ───────────────────────────────────────────
  const skeletonCard = '<div class="skeleton-card"><div class="skeleton-line skeleton-line-short"></div><div class="skeleton-line skeleton-line-long"></div><div class="skeleton-line skeleton-line-medium"></div><div style="display:flex;gap:0.5rem;margin-top:0.25rem"><span class="skeleton-tag"></span><span class="skeleton-tag"></span></div></div>';
  listEl.innerHTML = skeletonCard.repeat(5);

  fetch('thoughts.json')
    .then((r) => r.json())
    .then((data) => {
      thoughts = data;
      window.__searchData = window.__searchData || {};
      window.__searchData.thoughts = thoughts;
      buildMonthDensity();
      renderTagFilters();
      initSort();
      initClear();
      if (!isPermalinkHash()) {
        const hashState = readHash(activeTags, tagFiltersEl, searchEl, searchClearBtn);
        if (hashState && hashState.month) activeMonth = hashState.month;
      }
      renderArchive();
      if (isPermalinkHash()) {
        // Find the target thought's index and render just enough to include it
        const targetId = location.hash.slice(3); // strip '#t-'
        const idx = thoughts.findIndex(t => String(t.id) === targetId);
        window.__skipReveal = true;
        visibleCount = idx >= 0 ? idx + PAGE_SIZE : thoughts.length;
        renderThoughts(false);
      } else {
        renderThoughts();
      }
      if (window.__skipReveal) delete window.__skipReveal;
      scrollToPermalink();
      window.addEventListener('hashchange', scrollToPermalink);
    })
    .catch(() => {
      listEl.innerHTML =
        '<p style="text-align:center;color:var(--color-text-secondary)">Could not load thoughts.</p>';
    });

  // ── Archive Widget ─────────────────────────────────────────
  const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MAX_BAR_HEIGHT = 40;
  const ARCHIVE_YEAR_LIMIT = 2;
  let archiveExpanded = false;

  function buildMonthDensity() {
    monthDensityMap = {};
    thoughts.forEach((t) => {
      if (!t.date) return;
      const key = t.date.slice(0, 7);
      monthDensityMap[key] = (monthDensityMap[key] || 0) + 1;
    });
  }

  function renderArchive() {
    const container = document.getElementById('archive-years');
    if (!container) return;

    const years = {};
    Object.keys(monthDensityMap).forEach((key) => {
      const y = key.slice(0, 4);
      if (!years[y]) years[y] = true;
    });
    const sortedYears = Object.keys(years).sort((a, b) => b - a);

    if (!sortedYears.length) {
      container.innerHTML = '';
      return;
    }

    const maxCount = Math.max(...Object.values(monthDensityMap));

    const hasHidden = !archiveExpanded && sortedYears.length > ARCHIVE_YEAR_LIMIT;
    const visibleYears = hasHidden ? sortedYears.slice(0, ARCHIVE_YEAR_LIMIT) : sortedYears;

    let html = '<div class="archive-years-row">';
    visibleYears.forEach((year) => {
      html += `<div class="archive-year">`;
      html += `<span class="archive-year-label">${year}</span>`;
      html += `<div class="archive-bars">`;
      for (let m = 0; m < 12; m++) {
        const key = `${year}-${String(m + 1).padStart(2, '0')}`;
        const count = monthDensityMap[key] || 0;
        const height = count > 0
          ? Math.max(4, Math.round((count / maxCount) * MAX_BAR_HEIGHT))
          : 2;
        const density = count === 0 ? 'empty'
          : count <= maxCount * 0.25 ? 'L1'
          : count <= maxCount * 0.5 ? 'L2'
          : count <= maxCount * 0.75 ? 'L3'
          : 'L4';
        const isActive = activeMonth === key;
        const tooltip = `${MONTH_NAMES[m]} ${year} (${count} ${count === 1 ? 'post' : 'posts'})`;
        html += `<button class="archive-bar archive-bar-${density}${isActive ? ' active' : ''}" data-month="${key}" style="height:${height}px" title="${tooltip}"></button>`;
      }
      html += `</div>`;
      html += `<div class="archive-months">${MONTH_LABELS.map((l) => `<span>${l}</span>`).join('')}</div>`;
      html += `</div>`;
    });
    html += '</div>';

    if (sortedYears.length > ARCHIVE_YEAR_LIMIT) {
      const hiddenCount = sortedYears.length - ARCHIVE_YEAR_LIMIT;
      html += `<button class="tag-toggle-btn" id="archive-toggle">${archiveExpanded ? 'Show less' : `Show ${hiddenCount} older`}</button>`;
    }

    container.innerHTML = html;

    const toggle = document.getElementById('archive-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        if (archiveExpanded) {
          // Collapsing: scroll back first, then re-render
          const row = container.querySelector('.archive-years-row');
          if (row && row.scrollLeft > 0) {
            row.scrollTo({ left: 0, behavior: 'smooth' });
            setTimeout(() => { archiveExpanded = false; renderArchive(); }, 700);
          } else {
            archiveExpanded = false;
            renderArchive();
          }
        } else {
          // Expanding: re-render first, then scroll to reveal
          archiveExpanded = true;
          renderArchive();
          const row = container.querySelector('.archive-years-row');
          const newYear = row && row.children[ARCHIVE_YEAR_LIMIT];
          if (newYear) newYear.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        }
      });
    }

    container.querySelectorAll('.archive-bar').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.month;
        if (activeMonth === key) {
          activeMonth = null;
        } else {
          activeMonth = key;
        }
        renderArchive();
        renderThoughts();
      });
    });
  }

  // ── Tag Filters ────────────────────────────────────────────
  function renderTagFilters() {
    const sidebarEl = document.getElementById('thoughts-sidebar');
    const tagMap = {};
    thoughts.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        if (!tagMap[tag]) tagMap[tag] = 0;
        tagMap[tag]++;
      });
    });
    const sorted = Object.entries(tagMap).sort((a, b) => a[0].localeCompare(b[0]));
    if (!sorted.length) {
      sidebarEl.style.display = 'none';
      return;
    }
    sidebarEl.style.display = '';
    tagFiltersEl.innerHTML = sorted
      .map(
        ([name, count]) =>
          `<button class="filter-btn tag-filter-btn" data-tag="${escapeHtml(name)}">${escapeHtml(name)} <span class="tag-count">${count}</span></button>`
      )
      .join('');
    tagFiltersEl.querySelectorAll('.tag-filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        handleTagClick(e, btn.dataset.tag, activeTags, tagFiltersEl, renderThoughts);
      });
    });
    collapseTags(tagFiltersEl, sidebarEl);
  }

  // ── Sort ───────────────────────────────────────────────────
  function updateSortArrows() {
    sortEl.querySelectorAll('.sort-btn').forEach((btn) => {
      const label = btn.dataset.label || (btn.dataset.label = btn.textContent);
      btn.textContent = btn.classList.contains('active') ? label + (sortAsc ? ' \u25B2' : ' \u25BC') : label;
    });
  }

  function initSort() {
    sortEl.querySelectorAll('.sort-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.sort === activeSort) {
          sortAsc = !sortAsc;
        } else {
          sortEl.querySelector('.active').classList.remove('active');
          btn.classList.add('active');
          activeSort = btn.dataset.sort;
          sortAsc = false;
        }
        updateSortArrows();
        renderThoughts();
      });
    });
    updateSortArrows();
  }

  // ── Clear Button ───────────────────────────────────────────
  function initClear() {
    clearBtnTag.addEventListener('click', () => {
      activeTags.clear();
      searchEl.value = '';
      tagFiltersEl
        .querySelectorAll('.tag-filter-btn.active')
        .forEach((b) => b.classList.remove('active'));
      searchClearBtn.classList.remove('visible');
      renderThoughts();
    });
    clearBtnMonth.addEventListener('click', () => {
      activeMonth = null;
      renderArchive();
      renderThoughts();
    });
  }

  // ── Render Thoughts ────────────────────────────────────────
  const PAGE_SIZE = 20;
  let visibleCount = PAGE_SIZE;
  let loadObserver = null;

  function renderThoughts(resetPage) {
    if (loadObserver) loadObserver.disconnect();
    if (resetPage !== false) visibleCount = PAGE_SIZE;
    if (hasRendered && resetPage !== false) {
      countEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    hasRendered = true;
    updateHash(activeTags, searchEl.value, {
      skipIf: () => isPermalinkHash(),
      month: activeMonth,
    });

    const query = searchEl.value.toLowerCase();
    const filtered = thoughts.filter((t) => {
      if (activeMonth && (!t.date || t.date.slice(0, 7) !== activeMonth)) return false;
      if (activeTags.size > 0) {
        const entryTags = new Set(t.tags || []);
        for (const tag of activeTags) {
          if (!entryTags.has(tag)) return false;
        }
      }
      if (query) {
        const hay = `${t.text} ${(t.tags || []).join(' ')} ${t.url || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (activeSort === 'date') {
      filtered.sort((a, b) => {
        var cmp = (b.date || '').localeCompare(a.date || '');
        return sortAsc ? -cmp : cmp;
      });
    } else if (activeSort === 'length') {
      filtered.sort((a, b) => {
        var cmp = (b.text || '').length - (a.text || '').length;
        return sortAsc ? -cmp : cmp;
      });
    }

    const hasFilters = activeTags.size > 0 || query || activeMonth;
    const showTagClear = activeTags.size > 0 || query;
    const showMonthClear = !!activeMonth;
    clearBtnTag.style.display = showTagClear ? '' : 'none';
    clearBtnMonth.style.display = showMonthClear ? '' : 'none';
    const noun = thoughts.length === 1 ? 'thought' : 'thoughts';
    countEl.textContent =
      filtered.length === thoughts.length
        ? `${thoughts.length} ${noun}`
        : `Showing ${filtered.length} of ${thoughts.length} ${noun}`;

    if (!filtered.length) {
      listEl.innerHTML =
        '<p style="text-align:center;color:var(--color-text-secondary);padding:var(--space-xl) 0">No thoughts match your search.</p>';
      return;
    }

    const visible = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;

    let html = '';
    let lastMonth = '';
    visible.forEach((t) => {
      const month = t.date ? t.date.slice(0, 7) : '';
      if (month && month !== lastMonth) {
        const d = new Date(t.date + 'T00:00:00');
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        html += `<h3 class="thought-date-group">${label}</h3>`;
        lastMonth = month;
      }

      const tagsHtml = (t.tags || [])
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map(
          (tag) =>
            `<span class="reading-tag${activeTags.has(tag) ? ' active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
        )
        .join('');

      let previewHtml = '';
      if (t.url && t.preview) {
        // Embedded preview data — render inline, no API call needed
        const p = t.preview;
        previewHtml =
          `<div class="thought-link-preview" id="preview-${t.id}">` +
          `<a href="${escapeHtml(t.url)}" target="_blank" rel="noopener" class="thought-preview-card">` +
          (p.image ? `<img class="thought-preview-img" src="${escapeHtml(p.image)}" alt="">` : '') +
          `<div class="thought-preview-body">` +
          `<span class="thought-preview-domain">${escapeHtml(p.domain || '')}</span>` +
          `<span class="thought-preview-title">${escapeHtml(p.title || '')}</span>` +
          `<span class="thought-preview-desc">${escapeHtml(p.description || '')}</span>` +
          `</div></a></div>`;
      } else if (t.url) {
        previewHtml = `<div class="thought-link-preview" data-url="${escapeHtml(t.url)}" id="preview-${t.id}"><div class="thought-preview-loading">Loading preview...</div></div>`;
      }

      const editBtn = isAuthenticated()
        ? `<button class="thought-edit-btn" data-id="${t.id}" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`
        : '';

      const slackBtn = isAuthenticated()
        ? `<button class="thought-slack-btn" data-id="${t.id}" title="Push to Slack"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2a2.5 2.5 0 0 0 0 5H17V4.5A2.5 2.5 0 0 0 14.5 2z"/><path d="M7 5h3.5"/><path d="M2 9.5A2.5 2.5 0 0 0 4.5 12H7V9.5A2.5 2.5 0 0 0 2 9.5z"/><path d="M7 12v3.5"/><path d="M9.5 22a2.5 2.5 0 0 0 0-5H7v2.5A2.5 2.5 0 0 0 9.5 22z"/><path d="M17 19h-3.5"/><path d="M22 14.5a2.5 2.5 0 0 0-2.5-2.5H17v2.5a2.5 2.5 0 0 0 5 0z"/><path d="M17 12v-3.5"/></svg></button>`
        : '';

      const deleteBtn = isAuthenticated()
        ? `<button class="thought-delete-btn" data-id="${t.id}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>`
        : '';

      const deleteOverlay = isAuthenticated()
        ? `<div class="thought-delete-overlay"><span>Delete this thought?</span><div class="thought-delete-actions"><button class="thought-delete-confirm-btn" data-id="${t.id}">Delete</button><button class="thought-delete-cancel-btn" data-id="${t.id}">Cancel</button></div></div>`
        : '';

      const copyBtn = `<button class="thought-copy-btn" data-id="${t.id}" title="Copy permalink"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;

      html +=
        `<article class="thought-card" id="t-${t.id}">` +
        deleteOverlay +
        `<div class="thought-card-meta"><a href="#t-${t.id}" class="reading-date thought-permalink">${escapeHtml(t.date)}</a>${copyBtn}${editBtn}${slackBtn}${deleteBtn}</div>` +
        `<div class="thought-text">${formatText(t.text)}</div>` +
        previewHtml +
        `<div class="thought-card-tags">${tagsHtml}</div>` +
        `</article>`;
    });

    listEl.innerHTML = html;

    if (hasMore) {
      appendSentinel(filtered);
    }

    // Attach copy permalink handlers
    listEl.querySelectorAll('.thought-copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = `${location.origin}${location.pathname}#t-${btn.dataset.id}`;
        navigator.clipboard.writeText(url).then(() => {
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        }).catch(() => {
          // Fallback for older browsers
          const ta = document.createElement('textarea');
          ta.value = url;
          ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        });
      });
    });
    // Attach edit handlers
    listEl.querySelectorAll('.thought-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleEdit(btn.dataset.id));
    });
    // Attach Slack handlers
    listEl.querySelectorAll('.thought-slack-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleSlackPush(btn));
    });
    // Attach delete handlers
    listEl.querySelectorAll('.thought-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });
    listEl.querySelectorAll('.thought-delete-confirm-btn').forEach((btn) => {
      btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
    });
    listEl.querySelectorAll('.thought-delete-cancel-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = document.getElementById(`t-${btn.dataset.id}`);
        if (card) card.classList.remove('confirm-delete');
      });
    });

    fetchLinkPreviews();
    if (window.renderMathInElement) {
      renderMathInElement(listEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
      });
    }
    if (window.revealElements && !window.__skipReveal) window.revealElements('.thought-card');
    window.initTagColors();
  }

  // ── Infinite Scroll ─────────────────────────────────────────
  function appendSentinel(filtered) {
    const sentinel = document.createElement('div');
    sentinel.className = 'thoughts-sentinel';
    listEl.appendChild(sentinel);

    if (loadObserver) loadObserver.disconnect();
    loadObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadObserver.disconnect();
        sentinel.remove();
        appendNextBatch(filtered);
      }
    }, { rootMargin: '200px' });
    loadObserver.observe(sentinel);
  }

  function appendNextBatch(filtered) {
    const start = visibleCount;
    visibleCount += PAGE_SIZE;
    const batch = filtered.slice(start, visibleCount);
    if (!batch.length) return;

    let html = '';
    const lastCard = listEl.querySelector('.thought-card:last-of-type');
    let lastMonth = lastCard ? (lastCard.querySelector('.reading-date')?.textContent || '').slice(0, 7) : '';

    batch.forEach((t) => {
      const month = t.date ? t.date.slice(0, 7) : '';
      if (month && month !== lastMonth) {
        const d = new Date(t.date + 'T00:00:00');
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        html += `<h3 class="thought-date-group">${label}</h3>`;
        lastMonth = month;
      }

      const tagsHtml = (t.tags || [])
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map(
          (tag) =>
            `<span class="reading-tag${activeTags.has(tag) ? ' active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
        )
        .join('');

      let previewHtml = '';
      if (t.url && t.preview) {
        const p = t.preview;
        previewHtml =
          `<div class="thought-link-preview" id="preview-${t.id}">` +
          `<a href="${escapeHtml(t.url)}" target="_blank" rel="noopener" class="thought-preview-card">` +
          (p.image ? `<img class="thought-preview-img" src="${escapeHtml(p.image)}" alt="">` : '') +
          `<div class="thought-preview-body">` +
          `<span class="thought-preview-domain">${escapeHtml(p.domain || '')}</span>` +
          `<span class="thought-preview-title">${escapeHtml(p.title || '')}</span>` +
          `<span class="thought-preview-desc">${escapeHtml(p.description || '')}</span>` +
          `</div></a></div>`;
      } else if (t.url) {
        previewHtml = `<div class="thought-link-preview" data-url="${escapeHtml(t.url)}" id="preview-${t.id}"><div class="thought-preview-loading">Loading preview...</div></div>`;
      }

      const editBtn = isAuthenticated()
        ? `<button class="thought-edit-btn" data-id="${t.id}" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`
        : '';
      const slackBtn = isAuthenticated()
        ? `<button class="thought-slack-btn" data-id="${t.id}" title="Push to Slack"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2a2.5 2.5 0 0 0 0 5H17V4.5A2.5 2.5 0 0 0 14.5 2z"/><path d="M7 5h3.5"/><path d="M2 9.5A2.5 2.5 0 0 0 4.5 12H7V9.5A2.5 2.5 0 0 0 2 9.5z"/><path d="M7 12v3.5"/><path d="M9.5 22a2.5 2.5 0 0 0 0-5H7v2.5A2.5 2.5 0 0 0 9.5 22z"/><path d="M17 19h-3.5"/><path d="M22 14.5a2.5 2.5 0 0 0-2.5-2.5H17v2.5a2.5 2.5 0 0 0 5 0z"/><path d="M17 12v-3.5"/></svg></button>`
        : '';
      const deleteBtn = isAuthenticated()
        ? `<button class="thought-delete-btn" data-id="${t.id}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>`
        : '';
      const deleteOverlay = isAuthenticated()
        ? `<div class="thought-delete-overlay"><span>Delete this thought?</span><div class="thought-delete-actions"><button class="thought-delete-confirm-btn" data-id="${t.id}">Delete</button><button class="thought-delete-cancel-btn" data-id="${t.id}">Cancel</button></div></div>`
        : '';
      const copyBtn = `<button class="thought-copy-btn" data-id="${t.id}" title="Copy permalink"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;

      html +=
        `<article class="thought-card" id="t-${t.id}">` +
        deleteOverlay +
        `<div class="thought-card-meta"><a href="#t-${t.id}" class="reading-date thought-permalink">${escapeHtml(t.date)}</a>${copyBtn}${editBtn}${slackBtn}${deleteBtn}</div>` +
        `<div class="thought-text">${formatText(t.text)}</div>` +
        previewHtml +
        `<div class="thought-card-tags">${tagsHtml}</div>` +
        `</article>`;
    });

    listEl.insertAdjacentHTML('beforeend', html);

    if (window.revealElements && !window.__skipReveal) window.revealElements('.thought-card');
    window.initTagColors();

    if (visibleCount < filtered.length) {
      appendSentinel(filtered);
    }
  }

  // ── Card Tag Clicks ───────────────────────────────────────
  listEl.addEventListener('click', (e) => {
    const tagEl = e.target.closest('.reading-tag[data-tag]');
    if (!tagEl) return;
    e.stopPropagation();
    handleTagClick(e, tagEl.dataset.tag, activeTags, tagFiltersEl, renderThoughts);
  });

  // ── Text Processing ────────────────────────────────────────
  function sanitizeText(str) {
    if (!str) return '';
    return str
      .replace(/[\u2018\u2019\u201A]/g, "'")
      .replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '--')
      .replace(/\u2026/g, '...');
  }

  function replaceEmoji(str) {
    return str.replace(/:([a-z0-9_+-]{1,20}):/g, (m, code) => EMOJI_MAP[code] || m);
  }

  function formatText(str) {
    if (!str) return '';
    str = replaceEmoji(str);
    if (window.marked) {
      marked.setOptions({ breaks: true, gfm: true });
      const renderer = new marked.Renderer();
      renderer.link = (token) =>
        `<a href="${token.href}" target="_blank" rel="noopener"${token.title ? ` title="${token.title}"` : ''}>${token.text}</a>`;
      return marked.parse(str, { renderer });
    }
    return escapeHtml(str);
  }

  // ── Link Previews ──────────────────────────────────────────
  const previewQueue = [];
  let previewFetching = false;

  function processPreviewQueue() {
    if (previewFetching || previewQueue.length === 0) return;
    previewFetching = true;
    const { el, url } = previewQueue.shift();
    // Element may have been removed by a re-render
    if (!document.contains(el)) { previewFetching = false; processPreviewQueue(); return; }
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.status === 'success') {
          const data = {
            title: res.data.title || '',
            description: res.data.description || '',
            image: res.data.image ? res.data.image.url : null,
            logo: res.data.logo ? res.data.logo.url : null,
            domain: new URL(url).hostname.replace('www.', ''),
          };
          sessionStorage.setItem(`og_${url}`, JSON.stringify(data));
          if (document.contains(el)) renderPreview(el, data);
        } else {
          if (document.contains(el)) renderPreviewFallback(el, url);
        }
      })
      .catch(() => { if (document.contains(el)) renderPreviewFallback(el, url); })
      .finally(() => { previewFetching = false; setTimeout(processPreviewQueue, 150); });
  }

  const previewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      previewObserver.unobserve(el);
      const url = el.dataset.url;
      const cached = sessionStorage.getItem(`og_${url}`);
      if (cached) {
        renderPreview(el, JSON.parse(cached));
      } else {
        previewQueue.push({ el, url });
        processPreviewQueue();
      }
    });
  }, { rootMargin: '200px' });

  function fetchLinkPreviews() {
    document.querySelectorAll('.thought-link-preview[data-url]').forEach((el) => {
      const url = el.dataset.url;
      const cached = sessionStorage.getItem(`og_${url}`);
      if (cached) {
        renderPreview(el, JSON.parse(cached));
      } else {
        previewObserver.observe(el);
      }
    });
  }

  function renderPreview(el, data) {
    const url = el.dataset.url;
    el.innerHTML =
      `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="thought-preview-card">` +
      (data.image ? `<img class="thought-preview-img" src="${escapeHtml(data.image)}" alt="">` : '') +
      `<div class="thought-preview-body">` +
      `<span class="thought-preview-domain">${escapeHtml(data.domain)}</span>` +
      `<span class="thought-preview-title">${escapeHtml(data.title)}</span>` +
      `<span class="thought-preview-desc">${escapeHtml(data.description)}</span>` +
      `</div></a>`;
  }

  function renderPreviewFallback(el, url) {
    let domain;
    try {
      domain = new URL(url).hostname.replace('www.', '');
    } catch (e) {
      domain = url;
    }
    el.innerHTML =
      `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="thought-preview-card">` +
      `<div class="thought-preview-body">` +
      `<span class="thought-preview-domain">${escapeHtml(domain)}</span>` +
      `<span class="thought-preview-title">${escapeHtml(url)}</span>` +
      `</div></a>`;
  }

  // ── Search ─────────────────────────────────────────────────
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderThoughts, 150);
    searchClearBtn.classList.toggle('visible', searchEl.value.length > 0);
  });
  searchClearBtn.addEventListener('click', () => {
    searchEl.value = '';
    searchClearBtn.classList.remove('visible');
    renderThoughts();
  });

  initSearchShortcut(searchEl);

  // ── Permalink ──────────────────────────────────────────────
  function isPermalinkHash() {
    return location.hash.startsWith('#t-');
  }

  function scrollToPermalink() {
    if (!isPermalinkHash()) return;
    const el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    el.classList.remove('scroll-reveal');
    el.style.opacity = '1';
    el.style.transform = 'none';

    // Hide page while we wait for layout to settle, then scroll and reveal
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      el.scrollIntoView({ block: 'start' });
      document.documentElement.style.scrollBehavior = '';
      document.body.style.opacity = '';
    }, 150);

    el.style.outline = '2px solid var(--color-accent)';
    el.style.outlineOffset = '4px';
    el.style.borderRadius = 'var(--border-radius)';
    setTimeout(() => {
      el.style.outline = 'none';
    }, 2150);
  }

  // ── Slack Push ─────────────────────────────────────────────
  function handleSlackPush(btn) {
    const id = btn.dataset.id;
    const pat = localStorage.getItem(TOKEN_KEY);
    if (!pat) return;

    btn.disabled = true;
    btn.classList.add('sending');

    fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/notify-thoughts.yml/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `token ${pat}`,
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({ ref: GITHUB_BRANCH, inputs: { thought_id: id } }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        btn.classList.remove('sending');
        btn.classList.add('sent');
        setTimeout(() => {
          btn.classList.remove('sent');
          btn.disabled = false;
        }, 2000);
      })
      .catch((err) => {
        console.error('Slack push failed:', err);
        btn.classList.remove('sending');
        btn.disabled = false;
        alert('Failed to trigger Slack push. Check console for details.');
      });
  }

  // ── Edit ───────────────────────────────────────────────────
  let editingId = null;

  function handleEdit(id) {
    const entry = thoughts.find((t) => t.id === id);
    if (!entry) return;
    editingId = id;
    composeTextEl.value = entry.text || '';
    composeUrlEl.value = entry.url || '';
    selectedComposeTags.clear();
    newTagsSet.clear();
    tagInput.value = '';
    (entry.tags || []).forEach((tag) => selectedComposeTags.add(tag));
    renderNewTagChips();
    renderComposeTags();
    updateComposePreview();
    document.querySelector('.thoughts-modal-header h3').textContent = 'Edit Thought';
    document.getElementById('thoughts-publish-btn').textContent = 'Update';
    openModal();
  }

  function resetComposeForm() {
    editingId = null;
    composeTextEl.value = '';
    composeUrlEl.value = '';
    tagInput.value = '';
    selectedComposeTags.clear();
    newTagsSet.clear();
    renderNewTagChips();
    previewEl.style.display = 'none';
    document.querySelector('.thoughts-modal-header h3').textContent = 'New Thought';
    document.getElementById('thoughts-publish-btn').textContent = 'Publish';
  }

  // ── Delete ─────────────────────────────────────────────────
  function handleDelete(id) {
    const card = document.getElementById(`t-${id}`);
    if (!card) return;
    if (card.classList.contains('confirm-delete')) {
      card.classList.remove('confirm-delete');
      return;
    }
    card.classList.add('confirm-delete');
  }

  function confirmDelete(id) {
    const card = document.getElementById(`t-${id}`);
    const btn = card ? card.querySelector('.thought-delete-confirm-btn') : null;
    if (btn) btn.textContent = 'Deleting...';

    const pat = localStorage.getItem(TOKEN_KEY);
    if (!pat) return;

    fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/thoughts.json?ref=${GITHUB_BRANCH}`, {
      headers: { Authorization: `token ${pat}` },
    })
      .then((r) => r.json())
      .then((fileData) => {
        if (!fileData.sha) throw new Error(fileData.message || 'Could not read file');
        const currentContent = JSON.parse(
          decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))))
        );
        const updated = currentContent.filter((t) => t.id !== id);
        if (updated.length === currentContent.length) throw new Error('Entry not found');
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2))));

        return fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/thoughts.json`, {
          method: 'PUT',
          headers: {
            Authorization: `token ${pat}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Delete thought: ${id}`,
            content: encoded,
            sha: fileData.sha,
            branch: GITHUB_BRANCH,
          }),
        });
      })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message || 'Delete failed'); });
        thoughts = thoughts.filter((t) => t.id !== id);
        renderTagFilters();
        renderThoughts();
      })
      .catch((err) => {
        if (card) card.classList.remove('confirm-delete');
        alert(`Error: ${err.message}`);
      });
  }

  // ── Auth (GitHub OAuth) ────────────────────────────────────
  const GITHUB_CLIENT_ID = 'Ov23liuSPDCcTpDL1qOt';
  const OAUTH_WORKER_URL = 'https://github-oauth-proxy.brandon-b-may.workers.dev';
  const GITHUB_REPO = 'spart1cle/spart1cle.github.io';
  const GITHUB_BRANCH = 'main';
  const TOKEN_KEY = 'thoughts-github-token';

  function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  // Handle OAuth callback
  (function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    history.replaceState(null, '', window.location.pathname + window.location.hash);
    fetch(OAUTH_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log('OAuth response:', data);
        if (data.access_token) {
          localStorage.setItem(TOKEN_KEY, data.access_token);
          document.getElementById('thoughts-fab').style.display = '';
          if (thoughts.length) renderThoughts();
        } else {
          console.error('OAuth failed:', data);
        }
      })
      .catch((err) => console.error('OAuth error:', err));
  })();

  if (isAuthenticated()) {
    document.getElementById('thoughts-fab').style.display = '';
  }

  document.getElementById('thoughts-auth-btn').addEventListener('click', () => {
    if (isAuthenticated()) {
      if (confirm('Already signed in. Sign out?')) {
        localStorage.removeItem(TOKEN_KEY);
        document.getElementById('thoughts-fab').style.display = 'none';
      }
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/thoughts.html`);
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo`;
  });

  // ── Compose: Tag Picker ────────────────────────────────────
  const selectedComposeTags = new Set();
  const existingTagsEl = document.getElementById('thoughts-existing-tags');

  function getAllTags() {
    const tags = new Set();
    thoughts.forEach((t) => {
      (t.tags || []).forEach((tag) => tags.add(tag));
    });
    return [...tags].sort();
  }

  function renderComposeTags() {
    const allTags = getAllTags();
    if (!allTags.length) {
      existingTagsEl.innerHTML = '';
      return;
    }
    existingTagsEl.innerHTML = allTags
      .map((tag) => {
        const isSelected = selectedComposeTags.has(tag);
        return `<button type="button" class="filter-btn tag-filter-btn${isSelected ? ' active' : ''}" data-compose-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
      })
      .join('');
    existingTagsEl.querySelectorAll('[data-compose-tag]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.composeTag;
        if (selectedComposeTags.has(tag)) {
          selectedComposeTags.delete(tag);
          btn.classList.remove('active');
        } else {
          selectedComposeTags.add(tag);
          btn.classList.add('active');
        }
      });
    });
    window.initTagColors();
  }

  // ── Compose: New Tag Chips ─────────────────────────────────
  const newTagsSet = new Set();
  const newTagsEl = document.getElementById('thoughts-new-tags');
  const tagInput = document.getElementById('thought-tags');

  function renderNewTagChips() {
    newTagsEl.innerHTML = [...newTagsSet]
      .map(
        (tag) =>
          `<button type="button" class="reading-tag thoughts-new-tag-chip" data-remove-tag="${escapeHtml(tag)}">${escapeHtml(tag)} &times;</button>`
      )
      .join('');
    newTagsEl.querySelectorAll('[data-remove-tag]').forEach((btn) => {
      btn.addEventListener('click', () => {
        newTagsSet.delete(btn.dataset.removeTag);
        renderNewTagChips();
      });
    });
    window.initTagColors();
  }

  tagInput.addEventListener('input', () => {
    const val = tagInput.value;
    if (!val.includes(',')) return;
    const parts = val.split(',');
    for (let i = 0; i < parts.length - 1; i++) {
      const tag = parts[i].trim().toLowerCase();
      if (tag) newTagsSet.add(tag);
    }
    tagInput.value = parts[parts.length - 1].trimStart();
    renderNewTagChips();
  });

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = tagInput.value.trim().toLowerCase();
      if (tag) {
        newTagsSet.add(tag);
        tagInput.value = '';
        renderNewTagChips();
      }
      return;
    }
    if (e.key === 'Backspace' && !tagInput.value && newTagsSet.size) {
      const last = [...newTagsSet].pop();
      newTagsSet.delete(last);
      renderNewTagChips();
    }
  });

  // ── Compose: Modal ─────────────────────────────────────────
  let previousFocus = null;

  function openModal() {
    previousFocus = document.activeElement;
    const modal = document.getElementById('thoughts-modal');
    modal.style.display = '';
    const first = modal.querySelector('input, textarea, button, select, [tabindex]:not([tabindex="-1"])');
    if (first) setTimeout(() => first.focus(), 0);
    document.addEventListener('keydown', trapModalKeydown);
  }

  function closeModal() {
    const modal = document.getElementById('thoughts-modal');
    modal.style.display = 'none';
    document.removeEventListener('keydown', trapModalKeydown);
    if (previousFocus) previousFocus.focus();
    previousFocus = null;
  }

  function trapModalKeydown(e) {
    const modal = document.getElementById('thoughts-modal');
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      resetToEditState();
      resetComposeForm();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('input, textarea, button, select, [tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.getElementById('thoughts-fab').addEventListener('click', () => {
    resetComposeForm();
    renderComposeTags();
    openModal();
  });

  document.getElementById('thoughts-modal-close').addEventListener('click', () => {
    closeModal();
    resetToEditState();
    resetComposeForm();
  });

  document.getElementById('thoughts-modal').addEventListener('click', function (e) {
    if (e.target === this) {
      closeModal();
      resetToEditState();
      resetComposeForm();
    }
  });

  // ── Compose: Live Preview ──────────────────────────────────
  const composeTextEl = document.getElementById('thought-text');
  const composeUrlEl = document.getElementById('thought-url');
  const previewEl = document.getElementById('thoughts-preview');
  const previewContentEl = document.getElementById('thoughts-preview-content');
  let previewTimeout = null;

  function renderComposeLinkPreview(el, url) {
    const cacheKey = `og_${url}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      renderPreview(el, JSON.parse(cached));
    } else {
      fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.status === 'success') {
            const data = {
              title: res.data.title || '',
              description: res.data.description || '',
              image: res.data.image ? res.data.image.url : null,
              logo: res.data.logo ? res.data.logo.url : null,
              domain: new URL(url).hostname.replace('www.', ''),
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
            renderPreview(el, data);
          } else {
            renderPreviewFallback(el, url);
          }
        })
        .catch(() => renderPreviewFallback(el, url));
    }
  }

  function updateComposePreview() {
    const text = composeTextEl.value.trim();
    const url = composeUrlEl.value.trim();
    if (!text && !url) {
      previewEl.style.display = 'none';
      return;
    }
    previewEl.style.display = '';

    let html = '';
    if (text) html += `<div class="thought-text">${formatText(text)}</div>`;
    if (url)
      html += `<div class="thought-link-preview" data-url="${escapeHtml(url)}" id="compose-preview-link"><div class="thought-preview-loading">Loading preview...</div></div>`;
    previewContentEl.innerHTML = html;

    if (window.renderMathInElement) {
      renderMathInElement(previewContentEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
      });
    }

    if (url) {
      const el = document.getElementById('compose-preview-link');
      if (el) renderComposeLinkPreview(el, url);
    }
  }

  composeTextEl.addEventListener('input', () => {
    clearTimeout(previewTimeout);
    const text = composeTextEl.value;
    const urlMatch = text.match(/https?:\/\/[^\s)>\]]+/);
    if (urlMatch && !composeUrlEl.value) {
      composeUrlEl.value = urlMatch[0];
    }
    previewTimeout = setTimeout(updateComposePreview, 300);
  });

  composeUrlEl.addEventListener('input', () => {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(updateComposePreview, 500);
  });

  // ── Compose: Formatting Toolbar ────────────────────────────
  document.getElementById('thoughts-toolbar').addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  document.getElementById('thoughts-toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fmt]');
    if (!btn) return;
    const fmt = btn.dataset.fmt;
    if (fmt === 'emoji') { toggleEmojiPicker(); return; }
    const ta = composeTextEl;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    const before = ta.value.substring(0, start);
    let insert = '';
    let cursorOffset = 0;

    switch (fmt) {
      case 'bold':
        insert = `**${sel || 'bold'}**`;
        cursorOffset = sel ? insert.length : 2;
        break;
      case 'italic':
        insert = `*${sel || 'italic'}*`;
        cursorOffset = sel ? insert.length : 1;
        break;
      case 'link':
        if (sel) {
          insert = `[${sel}](url)`;
          cursorOffset = insert.length - 1;
        } else {
          insert = '[text](url)';
          cursorOffset = 1;
        }
        break;
      case 'code':
        insert = `\`${sel || 'code'}\``;
        cursorOffset = sel ? insert.length : 1;
        break;
      case 'codeblock':
        insert =
          (start > 0 && before[before.length - 1] !== '\n' ? '\n' : '') +
          '```\n' +
          (sel || '') +
          '\n```';
        cursorOffset = sel ? insert.length : insert.indexOf('\n', 1) + 1;
        break;
      case 'quote': {
        const lines = (sel || 'quote')
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n');
        insert = (start > 0 && before[before.length - 1] !== '\n' ? '\n' : '') + lines;
        cursorOffset = sel ? insert.length : 2;
        break;
      }
      case 'math':
        insert = `$${sel || 'x'}$`;
        cursorOffset = sel ? insert.length : 1;
        break;
      case 'mathblock':
        insert = `$$${sel || ''}$$`;
        cursorOffset = sel ? insert.length : 2;
        break;
      case 'strikethrough':
        insert = `~~${sel || 'text'}~~`;
        cursorOffset = sel ? insert.length : 2;
        break;
      case 'image':
        if (sel) {
          insert = `![${sel}](url)`;
          cursorOffset = insert.length - 4;
        } else {
          insert = '![alt](url)';
          cursorOffset = 2;
        }
        break;
      case 'ul': {
        const lines = (sel || 'item').split('\n').map((l) => `- ${l}`).join('\n');
        insert = (start > 0 && before[before.length - 1] !== '\n' ? '\n' : '') + lines;
        cursorOffset = sel ? insert.length : insert.length - 4;
        break;
      }
      case 'ol': {
        const lines = (sel || 'item').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
        insert = (start > 0 && before[before.length - 1] !== '\n' ? '\n' : '') + lines;
        cursorOffset = sel ? insert.length : insert.length - 4;
        break;
      }
      case 'hr':
        insert = (start > 0 && before[before.length - 1] !== '\n' ? '\n' : '') + '---\n';
        cursorOffset = insert.length;
        break;
    }

    ta.focus();
    ta.setSelectionRange(start, end);
    document.execCommand('insertText', false, insert);
    const pos = start + cursorOffset;
    const placeholderLen = { bold: 4, italic: 6, code: 4, math: 1, link: 4, strikethrough: 4, image: 3, ul: 4, ol: 4 };
    if (sel) {
      ta.setSelectionRange(start, start + insert.length);
    } else {
      ta.setSelectionRange(pos, pos + (placeholderLen[fmt] || 0));
    }
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(updateComposePreview, 300);
  });

  // Keyboard shortcuts
  composeTextEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      document.querySelector('[data-fmt="bold"]').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      document.querySelector('[data-fmt="italic"]').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.querySelector('[data-fmt="link"]').click();
    }
  });

  // ── Emoji Autocomplete ────────────────────────────────────
  const emojiDropdown = document.createElement('div');
  emojiDropdown.className = 'thoughts-emoji-dropdown';
  document.body.appendChild(emojiDropdown);

  let emojiActiveIndex = 0;
  let emojiMatches = [];

  function getEmojiTrigger() {
    const cursor = composeTextEl.selectionStart;
    const before = composeTextEl.value.slice(0, cursor);
    const match = before.match(/:([a-z0-9_]{1,20})$/);
    if (!match) return null;
    const colonPos = before.length - match[0].length;
    if (colonPos > 0 && /\w/.test(before[colonPos - 1])) return null;
    return { partial: match[1], colonPos };
  }

  function showEmojiDropdown(trigger) {
    emojiMatches = Object.entries(EMOJI_MAP)
      .filter(([code]) => code.startsWith(trigger.partial))
      .slice(0, 8);
    if (!emojiMatches.length) {
      emojiDropdown.classList.remove('visible');
      return;
    }
    emojiActiveIndex = 0;
    renderEmojiOptions();
    const rect = composeTextEl.getBoundingClientRect();
    emojiDropdown.style.left = rect.left + 'px';
    emojiDropdown.style.top = (rect.bottom + 4) + 'px';
    emojiDropdown.style.minWidth = Math.min(rect.width, 260) + 'px';
    emojiDropdown.classList.add('visible');
  }

  function hideEmojiDropdown() {
    emojiDropdown.classList.remove('visible');
    emojiMatches = [];
  }

  function renderEmojiOptions() {
    emojiDropdown.innerHTML = emojiMatches
      .map(([code, emoji], i) =>
        `<button type="button" class="emoji-option${i === emojiActiveIndex ? ' active' : ''}" data-idx="${i}">${emoji} <span>:${escapeHtml(code)}:</span></button>`
      ).join('');
    emojiDropdown.querySelectorAll('.emoji-option').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        insertEmoji(emojiMatches[parseInt(btn.dataset.idx)]);
      });
    });
  }

  function insertEmoji([, emoji]) {
    const trigger = getEmojiTrigger();
    if (!trigger) return;
    composeTextEl.focus();
    composeTextEl.setSelectionRange(trigger.colonPos, composeTextEl.selectionStart);
    document.execCommand('insertText', false, emoji);
    hideEmojiDropdown();
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(updateComposePreview, 300);
  }

  composeTextEl.addEventListener('input', () => {
    const trigger = getEmojiTrigger();
    if (trigger && trigger.partial.length >= 2) {
      showEmojiDropdown(trigger);
    } else {
      hideEmojiDropdown();
    }
  });

  composeTextEl.addEventListener('keydown', (e) => {
    if (!emojiMatches.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      emojiActiveIndex = (emojiActiveIndex + 1) % emojiMatches.length;
      renderEmojiOptions();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      emojiActiveIndex = (emojiActiveIndex - 1 + emojiMatches.length) % emojiMatches.length;
      renderEmojiOptions();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertEmoji(emojiMatches[emojiActiveIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideEmojiDropdown();
    }
  });

  composeTextEl.addEventListener('blur', () => {
    setTimeout(hideEmojiDropdown, 150);
  });

  // ── Emoji Picker (toolbar button) ─────────────────────────
  const emojiPicker = document.createElement('div');
  emojiPicker.className = 'thoughts-emoji-picker';
  document.body.appendChild(emojiPicker);

  function buildEmojiPickerGrid() {
    const seen = new Set();
    return Object.entries(EMOJI_MAP)
      .filter(([, emoji]) => seen.has(emoji) ? false : (seen.add(emoji), true))
      .map(([code, emoji]) =>
        `<button type="button" class="emoji-picker-item" data-emoji="${emoji}" title=":${escapeHtml(code)}:">${emoji}</button>`
      ).join('');
  }

  function showEmojiPicker() {
    hideEmojiDropdown();
    emojiPicker.innerHTML = buildEmojiPickerGrid();
    const btn = document.querySelector('[data-fmt="emoji"]');
    const rect = btn.getBoundingClientRect();
    emojiPicker.style.left = rect.left + 'px';
    emojiPicker.style.top = (rect.bottom + 4) + 'px';
    emojiPicker.style.width = '280px';
    emojiPicker.classList.add('visible');
    emojiPicker.querySelectorAll('.emoji-picker-item').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        composeTextEl.focus();
        document.execCommand('insertText', false, btn.dataset.emoji);
        hideEmojiPicker();
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(updateComposePreview, 300);
      });
    });
  }

  function hideEmojiPicker() {
    emojiPicker.classList.remove('visible');
  }

  function toggleEmojiPicker() {
    if (emojiPicker.classList.contains('visible')) {
      hideEmojiPicker();
    } else {
      showEmojiPicker();
    }
  }

  document.addEventListener('mousedown', (e) => {
    if (emojiPicker.classList.contains('visible') &&
        !emojiPicker.contains(e.target) &&
        !e.target.closest('[data-fmt="emoji"]')) {
      hideEmojiPicker();
    }
  });

  // ── Compose: Submit ────────────────────────────────────────
  const formFieldsEl = document.getElementById('thoughts-form-fields');
  const confirmPreviewEl = document.getElementById('thoughts-confirm-preview');
  const confirmCardEl = document.getElementById('thoughts-confirm-card');

  function getComposeTags() {
    const trailing = tagInput.value.trim().toLowerCase();
    return [
      ...new Set([...selectedComposeTags, ...newTagsSet, ...(trailing ? [trailing] : [])]),
    ];
  }

  function buildConfirmCard() {
    const text = composeTextEl.value.trim();
    const url = composeUrlEl.value.trim() || null;
    const tags = getComposeTags();
    const date = new Date().toISOString().slice(0, 10);

    const tagsHtml = tags
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map(
        (tag) =>
          `<span class="reading-tag">${escapeHtml(tag)}</span>`
      )
      .join('');

    let previewHtml = '';
    if (url) {
      previewHtml = `<div class="thought-link-preview" data-url="${escapeHtml(url)}" id="confirm-card-preview"><div class="thought-preview-loading">Loading preview...</div></div>`;
    }

    confirmCardEl.innerHTML =
      `<article class="thought-card"><div class="thought-card-meta"><span class="reading-date">${escapeHtml(date)}</span></div>` +
      `<div class="thought-text">${formatText(text)}</div>` +
      previewHtml +
      (tagsHtml ? `<div class="thought-card-tags">${tagsHtml}</div>` : '') +
      `</article>`;

    if (url) {
      const el = document.getElementById('confirm-card-preview');
      if (el) renderComposeLinkPreview(el, url);
    }

    if (window.renderMathInElement) {
      renderMathInElement(confirmCardEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
      });
    }
    window.initTagColors();
  }

  function showConfirmState() {
    buildConfirmCard();
    formFieldsEl.classList.add('hidden');
    confirmPreviewEl.classList.add('visible');
  }

  function showEditState() {
    confirmPreviewEl.classList.remove('visible');
    formFieldsEl.classList.remove('hidden');
  }

  function resetToEditState() {
    confirmPreviewEl.classList.remove('visible');
    formFieldsEl.classList.remove('hidden');
  }

  document.getElementById('thoughts-publish-btn').addEventListener('click', () => {
    if (!composeTextEl.value.trim()) {
      document.getElementById('thoughts-status').textContent = 'Text is required.';
      return;
    }
    document.getElementById('thoughts-status').textContent = '';
    showConfirmState();
  });

  document.getElementById('thoughts-cancel-btn').addEventListener('click', () => {
    showEditState();
  });

  document.getElementById('thoughts-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!confirmPreviewEl.classList.contains('visible')) {
      if (composeTextEl.value.trim()) showConfirmState();
      return;
    }
    const statusEl = document.getElementById('thoughts-status');
    const confirmBtn = document.getElementById('thoughts-confirm-btn');
    statusEl.textContent = editingId ? 'Updating...' : 'Publishing...';
    confirmBtn.disabled = true;

    const pat = localStorage.getItem(TOKEN_KEY);
    const repo = GITHUB_REPO;
    const branch = GITHUB_BRANCH;

    const text = composeTextEl.value.trim();
    const url = composeUrlEl.value.trim() || null;
    const trailing = tagInput.value.trim().toLowerCase();
    if (trailing) newTagsSet.add(trailing);
    const tags = [...new Set([...selectedComposeTags, ...newTagsSet])];

    const isEdit = !!editingId;

    // Fetch OG preview data for link thoughts before saving
    function fetchYouTubeOEmbed(videoUrl) {
      return fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`)
        .then((r) => r.json())
        .then((res) => ({
          title: res.title || '',
          description: '',
          image: res.thumbnail_url || null,
          domain: new URL(videoUrl).hostname.replace('www.', ''),
        }))
        .catch(() => null);
    }

    const isYouTube = url && /(?:youtube\.com|youtu\.be)/.test(url);
    const domainOnly = url ? { title: '', description: '', image: null, domain: new URL(url).hostname.replace('www.', '') } : null;

    const previewPromise = url
      ? fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
          .then((r) => r.json())
          .then((res) => {
            if (res.status === 'success') {
              return {
                title: res.data.title || '',
                description: res.data.description || '',
                image: res.data.image && !/licdn\.com|linkedin\.com/.test(res.data.image.url) ? res.data.image.url : null,
                domain: new URL(url).hostname.replace('www.', ''),
              };
            }
            return isYouTube ? fetchYouTubeOEmbed(url).then((r) => r || domainOnly) : domainOnly;
          })
          .catch(() => isYouTube ? fetchYouTubeOEmbed(url).then((r) => r || domainOnly) : domainOnly)
      : Promise.resolve(null);

    previewPromise.then((preview) => {

    let entry;
    if (isEdit) {
      const existing = thoughts.find((t) => t.id === editingId);
      entry = {
        id: editingId,
        type: url ? 'link' : 'note',
        date: existing ? existing.date : new Date().toISOString().slice(0, 10),
        text: sanitizeText(text),
        url,
        tags,
      };
    } else {
      entry = {
        id: String(Date.now()),
        type: url ? 'link' : 'note',
        date: new Date().toISOString().slice(0, 10),
        text: sanitizeText(text),
        url,
        tags,
      };
    }
    if (preview) entry.preview = preview;

    // GET current file -> update/prepend -> PUT
    fetch(`https://api.github.com/repos/${repo}/contents/thoughts.json?ref=${branch}`, {
      headers: { Authorization: `token ${pat}` },
    })
      .then((r) => r.json())
      .then((fileData) => {
        if (!fileData.sha) throw new Error(fileData.message || 'Could not read file');
        const currentContent = JSON.parse(
          decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))))
        );
        if (isEdit) {
          const idx = currentContent.findIndex((t) => t.id === editingId);
          if (idx === -1) throw new Error('Entry not found');
          currentContent[idx] = entry;
        } else {
          currentContent.unshift(entry);
        }
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2))));

        return fetch(`https://api.github.com/repos/${repo}/contents/thoughts.json`, {
          method: 'PUT',
          headers: {
            Authorization: `token ${pat}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `${isEdit ? 'Edit' : 'Add'} thought: ${entry.type} - ${entry.date}`,
            content: encoded,
            sha: fileData.sha,
            branch,
          }),
        });
      })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message || 'Commit failed'); });
        statusEl.textContent = isEdit ? 'Updated!' : 'Published!';
        if (isEdit) {
          const idx = thoughts.findIndex((t) => t.id === editingId);
          if (idx !== -1) thoughts[idx] = entry;
        } else {
          thoughts.unshift(entry);
        }
        renderTagFilters();
        renderThoughts();
        resetComposeForm();
        setTimeout(() => {
          closeModal();
          statusEl.textContent = '';
          confirmBtn.disabled = false;
          resetToEditState();
        }, 1000);
      })
      .catch((err) => {
        statusEl.textContent = `Error: ${err.message}`;
        confirmBtn.disabled = false;
      });

    }); // end previewPromise.then
  });
})();
