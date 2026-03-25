// ── Reading Page ─────────────────────────────────────────────
(function () {
  'use strict';

  const { escapeHtml, buildTagColorCache, tagColor, updateHash, readHash } = SiteUtils;

  const listEl = document.getElementById('reading-list');
  const searchEl = document.getElementById('reading-search');
  const tagFiltersEl = document.getElementById('reading-tag-filters');
  const sortEl = document.getElementById('reading-sort');
  const countEl = document.getElementById('reading-count');
  const clearBtn = document.getElementById('reading-clear');
  const searchClearBtn = document.getElementById('reading-search-clear');

  let papers = [];
  let tagColorCache = {};
  let activeTags = new Set();
  let activeSort = 'published';
  let searchTimeout = null;

  // ── Data Loading ───────────────────────────────────────────
  fetch('papers.json')
    .then((r) => r.json())
    .then((data) => {
      papers = data;
      tagColorCache = buildTagColorCache(papers, (p) =>
        (p.user_paper_collections || []).map((c) => c.name)
      );
      renderTagFilters();
      initSort();
      initClear();
      readHash(activeTags, tagFiltersEl, searchEl, searchClearBtn);
      renderPapers();
    })
    .catch(() => {
      listEl.innerHTML =
        '<p style="text-align:center;color:var(--color-text-secondary)">Could not load papers.</p>';
    });

  // ── Tag Filters ────────────────────────────────────────────
  function renderTagFilters() {
    const tagMap = {};
    papers.forEach((p) => {
      (p.user_paper_collections || []).forEach((c) => {
        if (!tagMap[c.name]) tagMap[c.name] = 0;
        tagMap[c.name]++;
      });
    });
    const likedCount = papers.filter((p) => !(p.user_paper_collections || []).length).length;
    const sorted = Object.entries(tagMap).sort((a, b) => a[0].localeCompare(b[0]));
    tagFiltersEl.innerHTML =
      (likedCount
        ? `<button class="filter-btn tag-filter-btn" data-tag="__liked__" style="--tag-color:var(--color-accent)">&#x1F44D; Liked <span class="tag-count">${likedCount}</span></button>`
        : '') +
      sorted
        .map(
          ([name, count]) =>
            `<button class="filter-btn tag-filter-btn" data-tag="${escapeHtml(name)}" style="--tag-color:${tagColor(tagColorCache, name)}">${escapeHtml(name)} <span class="tag-count">${count}</span></button>`
        )
        .join('');
    tagFiltersEl.querySelectorAll('.tag-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const wasActive = activeTags.has(tag);
        activeTags.clear();
        tagFiltersEl
          .querySelectorAll('.tag-filter-btn.active')
          .forEach((b) => b.classList.remove('active'));
        if (!wasActive) {
          activeTags.add(tag);
          btn.classList.add('active');
        }
        renderPapers();
      });
    });
  }

  // ── Sort ───────────────────────────────────────────────────
  function initSort() {
    sortEl.querySelectorAll('.sort-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        sortEl.querySelector('.active').classList.remove('active');
        btn.classList.add('active');
        activeSort = btn.dataset.sort;
        renderPapers();
      });
    });
  }

  // ── Clear ──────────────────────────────────────────────────
  function initClear() {
    clearBtn.addEventListener('click', () => {
      activeTags.clear();
      searchEl.value = '';
      tagFiltersEl
        .querySelectorAll('.tag-filter-btn.active')
        .forEach((b) => b.classList.remove('active'));
      renderPapers();
    });
  }

  // ── Render Papers ──────────────────────────────────────────
  const PAGE_SIZE = 20;
  let visibleCount = PAGE_SIZE;

  function renderPapers(resetPage) {
    if (resetPage !== false) visibleCount = PAGE_SIZE;
    updateHash(activeTags, searchEl.value);

    const query = searchEl.value.toLowerCase();
    const filtered = papers.filter((p) => {
      if (activeTags.size > 0) {
        const colls = p.user_paper_collections || [];
        const paperTags = new Set(colls.map((c) => c.name));
        if (activeTags.has('__liked__') && colls.length > 0) return false;
        for (const t of activeTags) {
          if (t === '__liked__') continue;
          if (!paperTags.has(t)) return false;
        }
      }
      if (query) {
        const hay = `${p.title} ${p.authors} ${p.abstract || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (activeSort === 'published') {
      filtered.sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || ''));
    }
    // 'relevance' keeps the original API order (ranking_score)

    const hasFilters = activeTags.size > 0 || query;
    clearBtn.style.display = hasFilters ? '' : 'none';
    countEl.textContent =
      filtered.length === papers.length
        ? `${papers.length} papers`
        : `Showing ${filtered.length} of ${papers.length} papers`;

    if (!filtered.length) {
      listEl.innerHTML =
        '<p style="text-align:center;color:var(--color-text-secondary);padding:var(--space-xl) 0">No papers match your search.</p>';
      return;
    }

    const visible = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;

    listEl.innerHTML = visible
      .map((p) => {
        const date = p.publication_date || '';
        const authors = truncateAuthors(p.authors, 5);
        const colls = (p.user_paper_collections || [])
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        const collections = colls.length
          ? colls
              .map(
                (c) =>
                  `<span class="reading-tag" style="--tag-color:${tagColor(tagColorCache, c.name)}">${escapeHtml(c.name)}</span>`
              )
              .join('')
          : '<span class="reading-tag reading-tag-liked" style="--tag-color:var(--color-accent)">&#x1F44D; Liked</span>';
        const arxivUrl = p.arxiv_id ? `https://arxiv.org/abs/${p.arxiv_id}` : p.url;
        const abstract = p.abstract ? cleanAbstract(p.abstract) : '';
        const summaries = p.summaries || {};
        const contributions = summaries.contributions_question || '';
        const problem = summaries.problem_definition_question || '';
        const keywords =
          p.keywords_metadata && p.keywords_metadata.keywords
            ? p.keywords_metadata.keywords
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean)
            : [];

        return `
          <article class="reading-card" data-id="${escapeHtml(p.paper_id)}">
            <div class="reading-card-header" onclick="this.parentElement.classList.toggle('expanded')">
              <div class="reading-card-meta">
                <span class="reading-date">${escapeHtml(date)}</span>
                ${p.category ? `<span class="reading-category">${escapeHtml(p.category)}</span>` : ''}
                ${p.total_likes || p.total_read ? `<span class="reading-stats">${p.total_likes ? `<span title="Community likes"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> ${p.total_likes}</span>` : ''}${p.total_read ? `<span title="Community reads"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> ${p.total_read}</span>` : ''}</span>` : ''}
              </div>
              <h3 class="reading-card-title">${escapeHtml(p.title)}</h3>
              <p class="reading-card-authors">${escapeHtml(authors)}</p>
              <div class="reading-card-bottom">
                <div class="reading-card-tags">${collections}</div>
                <div class="reading-card-links" onclick="event.stopPropagation()">
                  ${arxivUrl ? `<a href="${escapeHtml(arxivUrl)}" target="_blank" rel="noopener">arXiv</a>` : ''}
                  ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">PDF</a>` : ''}
                  ${p.project_link && !p.project_link.includes('}{') ? `<a href="${escapeHtml(p.project_link)}" target="_blank" rel="noopener">Project</a>` : ''}
                </div>
              </div>
              <svg class="reading-expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="reading-card-details"><div>
              ${contributions ? `<div class="reading-summary"><h4>Key Contributions</h4><div class="reading-summary-content">${renderMarkdown(contributions)}</div></div>` : ''}
              ${problem ? `<div class="reading-summary"><h4>Problem</h4><div class="reading-summary-content">${renderMarkdown(problem)}</div></div>` : ''}
              ${abstract ? `<details class="reading-abstract-toggle"><summary>Abstract</summary><p class="reading-abstract">${abstract}</p></details>` : ''}
              ${keywords.length ? `<div class="reading-keywords">${keywords.map((k) => `<span class="reading-keyword">${escapeHtml(k)}</span>`).join('')}</div>` : ''}
            </div></div>
          </article>`;
      })
      .join('');

    if (hasMore) {
      listEl.insertAdjacentHTML(
        'beforeend',
        `<button class="thoughts-load-more" id="reading-load-more">Load more (${filtered.length - visibleCount} remaining)</button>`
      );
      document.getElementById('reading-load-more').addEventListener('click', () => {
        visibleCount += PAGE_SIZE;
        renderPapers(false);
      });
    }

    if (window.revealElements) window.revealElements('.reading-card');
  }

  // ── Helpers ────────────────────────────────────────────────
  function truncateAuthors(str, max) {
    if (!str) return '';
    const parts = str.split(', ');
    if (parts.length <= max) return str;
    return parts.slice(0, max).join(', ') + ', et al.';
  }

  function cleanAbstract(text) {
    return text.replace(/<[^>]+>/g, '').replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1');
  }

  function renderMarkdown(text) {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^- /gm, '<li>')
      .replace(/(<li>.*)/g, '$1</li>')
      .replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  }

  // ── Search ─────────────────────────────────────────────────
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderPapers, 150);
    searchClearBtn.classList.toggle('visible', searchEl.value.length > 0);
  });
  searchClearBtn.addEventListener('click', () => {
    searchEl.value = '';
    searchClearBtn.classList.remove('visible');
    renderPapers();
  });
})();
