// ── Thoughts Page ────────────────────────────────────────────
(function () {
  'use strict';

  const { escapeHtml, buildTagColorCache, tagColor, updateHash, readHash } = SiteUtils;

  const listEl = document.getElementById('thoughts-list');
  const searchEl = document.getElementById('thoughts-search');
  const tagFiltersEl = document.getElementById('thoughts-tag-filters');
  const countEl = document.getElementById('thoughts-count');
  const clearBtn = document.getElementById('thoughts-clear');
  const searchClearBtn = document.getElementById('thoughts-search-clear');

  let thoughts = [];
  let tagColorCache = {};
  const activeTags = new Set();
  let searchTimeout = null;

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
  fetch('thoughts.json')
    .then((r) => r.json())
    .then((data) => {
      thoughts = data;
      tagColorCache = buildTagColorCache(thoughts, (t) => t.tags || []);
      renderTagFilters();
      initClear();
      if (!isPermalinkHash()) {
        readHash(activeTags, tagFiltersEl, searchEl, searchClearBtn);
      }
      renderThoughts();
      scrollToPermalink();
    })
    .catch(() => {
      listEl.innerHTML =
        '<p style="text-align:center;color:var(--color-text-secondary)">Could not load thoughts.</p>';
    });

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
        renderThoughts();
      });
    });
  }

  // ── Clear Button ───────────────────────────────────────────
  function initClear() {
    clearBtn.addEventListener('click', () => {
      activeTags.clear();
      searchEl.value = '';
      tagFiltersEl
        .querySelectorAll('.tag-filter-btn.active')
        .forEach((b) => b.classList.remove('active'));
      searchClearBtn.classList.remove('visible');
      renderThoughts();
    });
  }

  // ── Render Thoughts ────────────────────────────────────────
  const PAGE_SIZE = 20;
  let visibleCount = PAGE_SIZE;

  function renderThoughts(resetPage) {
    if (resetPage !== false) visibleCount = PAGE_SIZE;
    updateHash(activeTags, searchEl.value, {
      skipIf: () => isPermalinkHash(),
    });

    const query = searchEl.value.toLowerCase();
    const filtered = thoughts.filter((t) => {
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

    const hasFilters = activeTags.size > 0 || query;
    clearBtn.style.display = hasFilters ? '' : 'none';
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
            `<span class="reading-tag" style="--tag-color:${tagColor(tagColorCache, tag)}">${escapeHtml(tag)}</span>`
        )
        .join('');

      let previewHtml = '';
      if (t.url) {
        previewHtml = `<div class="thought-link-preview" data-url="${escapeHtml(t.url)}" id="preview-${t.id}"><div class="thought-preview-loading">Loading preview...</div></div>`;
      }

      const editBtn = isAuthenticated()
        ? `<button class="thought-edit-btn" data-id="${t.id}" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`
        : '';

      const deleteBtn = isAuthenticated()
        ? `<button class="thought-delete-btn" data-id="${t.id}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg></button>`
        : '';

      const deleteOverlay = isAuthenticated()
        ? `<div class="thought-delete-overlay"><span>Delete this thought?</span><div class="thought-delete-actions"><button class="thought-delete-confirm-btn" data-id="${t.id}">Delete</button><button class="thought-delete-cancel-btn" data-id="${t.id}">Cancel</button></div></div>`
        : '';

      html +=
        `<article class="thought-card" id="t-${t.id}">` +
        deleteOverlay +
        `<div class="thought-card-meta"><a href="#t-${t.id}" class="reading-date thought-permalink">${escapeHtml(t.date)}</a>${editBtn}${deleteBtn}</div>` +
        `<div class="thought-text">${formatText(t.text)}</div>` +
        previewHtml +
        `<div class="thought-card-tags">${tagsHtml}</div>` +
        `</article>`;
    });

    listEl.innerHTML = html;

    if (hasMore) {
      listEl.insertAdjacentHTML(
        'beforeend',
        `<button class="thoughts-load-more" id="thoughts-load-more">Load more (${filtered.length - visibleCount} remaining)</button>`
      );
      document.getElementById('thoughts-load-more').addEventListener('click', () => {
        visibleCount += PAGE_SIZE;
        renderThoughts(false);
      });
    }

    // Attach edit handlers
    listEl.querySelectorAll('.thought-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleEdit(btn.dataset.id));
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
    if (window.revealElements) window.revealElements('.thought-card');
  }

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
  function fetchLinkPreviews() {
    document.querySelectorAll('.thought-link-preview[data-url]').forEach((el) => {
      const url = el.dataset.url;
      const cacheKey = `og_${url}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        renderPreview(el, JSON.parse(cached));
        return;
      }

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

  // ── Permalink ──────────────────────────────────────────────
  function isPermalinkHash() {
    return location.hash.startsWith('#t-');
  }

  function scrollToPermalink() {
    if (!isPermalinkHash()) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--color-accent)';
      el.style.outlineOffset = '4px';
      el.style.borderRadius = 'var(--border-radius)';
      setTimeout(() => {
        el.style.outline = 'none';
      }, 2000);
    }
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
    document.getElementById('thoughts-modal').style.display = '';
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
        tagColorCache = buildTagColorCache(thoughts, (t) => t.tags || []);
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
        return `<button type="button" class="filter-btn tag-filter-btn${isSelected ? ' active' : ''}" data-compose-tag="${escapeHtml(tag)}" style="--tag-color:${tagColor(tagColorCache, tag)}">${escapeHtml(tag)}</button>`;
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
  }

  // ── Compose: New Tag Chips ─────────────────────────────────
  const newTagsSet = new Set();
  const newTagsEl = document.getElementById('thoughts-new-tags');
  const tagInput = document.getElementById('thought-tags');

  function renderNewTagChips() {
    newTagsEl.innerHTML = [...newTagsSet]
      .map(
        (tag) =>
          `<button type="button" class="reading-tag thoughts-new-tag-chip" data-remove-tag="${escapeHtml(tag)}" style="--tag-color:${tagColor(tagColorCache, tag)}">${escapeHtml(tag)} &times;</button>`
      )
      .join('');
    newTagsEl.querySelectorAll('[data-remove-tag]').forEach((btn) => {
      btn.addEventListener('click', () => {
        newTagsSet.delete(btn.dataset.removeTag);
        renderNewTagChips();
      });
    });
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
  document.getElementById('thoughts-fab').addEventListener('click', () => {
    resetComposeForm();
    renderComposeTags();
    document.getElementById('thoughts-modal').style.display = '';
  });

  document.getElementById('thoughts-modal-close').addEventListener('click', () => {
    document.getElementById('thoughts-modal').style.display = 'none';
    resetToEditState();
    resetComposeForm();
  });

  document.getElementById('thoughts-modal').addEventListener('click', function (e) {
    if (e.target === this) {
      this.style.display = 'none';
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
          `<span class="reading-tag" style="--tag-color:${tagColor(tagColorCache, tag)}">${escapeHtml(tag)}</span>`
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
        tagColorCache = buildTagColorCache(thoughts, (t) => t.tags || []);
        renderTagFilters();
        renderThoughts();
        resetComposeForm();
        setTimeout(() => {
          document.getElementById('thoughts-modal').style.display = 'none';
          statusEl.textContent = '';
          confirmBtn.disabled = false;
          resetToEditState();
        }, 1000);
      })
      .catch((err) => {
        statusEl.textContent = `Error: ${err.message}`;
        confirmBtn.disabled = false;
      });
  });
})();
