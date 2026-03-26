// ── Shared Utilities ─────────────────────────────────────────
// Used by both reading.js and thoughts.js
(function () {
  'use strict';

  const SiteUtils = {};

  // ── HTML Escaping ──────────────────────────────────────────
  const escapeEl = document.createElement('div');
  SiteUtils.escapeHtml = (str) => {
    if (!str) return '';
    escapeEl.textContent = str;
    return escapeEl.innerHTML;
  };

  // ── Hash State ─────────────────────────────────────────────
  // Write active tag + search query to location.hash
  SiteUtils.updateHash = (activeTags, searchValue, opts = {}) => {
    if (opts.skipIf && opts.skipIf()) return;
    const params = new URLSearchParams();
    if (activeTags.size) params.set('tag', [...activeTags][0]);
    if (searchValue) params.set('q', searchValue);
    if (opts.month) params.set('month', opts.month);
    const hash = params.toString();
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname);
  };

  // Restore tag + search query from location.hash
  SiteUtils.readHash = (activeTags, tagFiltersEl, searchEl, searchClearBtn) => {
    const params = new URLSearchParams(location.hash.slice(1));
    const tag = params.get('tag');
    const q = params.get('q');
    const month = params.get('month');
    if (tag) {
      activeTags.add(tag);
      const btn = tagFiltersEl.querySelector(`[data-tag="${tag}"]`);
      if (btn) btn.classList.add('active');
    }
    if (q) {
      searchEl.value = q;
      if (searchClearBtn) searchClearBtn.classList.add('visible');
    }
    return { month: month || null };
  };

  // ── Collapsible Tag List ──────────────────────────────────
  const TAG_LIMIT = 8;
  SiteUtils.collapseTags = (tagListEl) => {
    const buttons = tagListEl.querySelectorAll('.tag-filter-btn');
    if (buttons.length <= TAG_LIMIT + 2) return;
    const hiddenCount = buttons.length - TAG_LIMIT;
    buttons.forEach((btn, i) => {
      if (i >= TAG_LIMIT) btn.classList.add('tag-hidden');
    });
    // Remove existing toggle if any
    const existing = tagListEl.parentNode.querySelector('.tag-toggle-btn');
    if (existing) existing.remove();
    const toggle = document.createElement('button');
    toggle.className = 'tag-toggle-btn';
    toggle.textContent = `Show ${hiddenCount} more`;
    toggle.addEventListener('click', () => {
      const expanded = tagListEl.classList.toggle('expanded');
      toggle.textContent = expanded ? 'Show less' : `Show ${hiddenCount} more`;
    });
    tagListEl.after(toggle);
  };

  window.SiteUtils = SiteUtils;
})();
