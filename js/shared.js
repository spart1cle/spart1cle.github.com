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
  const MIN_TAGS = 3;
  const MOBILE_TAG_LIMIT = 8;
  const RESIZE_DEBOUNCE = 150;

  SiteUtils.collapseTags = (tagListEl, containerEl) => {
    if (!containerEl) containerEl = tagListEl.closest('.reading-sidebar');
    if (!containerEl) return;

    // Clean up previous observer if collapseTags is called again on same element
    if (tagListEl._collapseObserver) {
      tagListEl._collapseObserver.disconnect();
      tagListEl._collapseObserver = null;
    }

    let expanded = false;
    let debounceTimer = null;

    function recalc() {
      if (expanded) return;

      const buttons = tagListEl.querySelectorAll('.tag-filter-btn');
      if (!buttons.length) return;

      // Show all tags temporarily for measurement
      buttons.forEach(btn => btn.classList.remove('tag-hidden'));
      tagListEl.classList.remove('expanded');

      const sidebarMaxHeight = parseFloat(getComputedStyle(containerEl).maxHeight);

      // No max-height constraint (e.g. mobile) — use a static limit
      if (!sidebarMaxHeight || !isFinite(sidebarMaxHeight)) {
        applyLimit(buttons, buttons.length <= MOBILE_TAG_LIMIT + 2 ? buttons.length : MOBILE_TAG_LIMIT);
        return;
      }

      // Measure space consumed by non-tag siblings in the sidebar
      let siblingsHeight = 0;
      for (const child of containerEl.children) {
        if (child === tagListEl || child.classList.contains('tag-toggle-btn')) continue;
        siblingsHeight += child.offsetHeight;
        const s = getComputedStyle(child);
        siblingsHeight += parseFloat(s.marginTop) + parseFloat(s.marginBottom);
      }

      // Reserve space for the toggle button (~28px)
      const budget = sidebarMaxHeight - siblingsHeight - 28;

      if (budget <= 0) {
        applyLimit(buttons, MIN_TAGS);
        return;
      }

      // Walk tags, summing heights + gap
      const gap = parseFloat(getComputedStyle(tagListEl).gap) || 0;
      let cumHeight = 0;
      let cutoff = buttons.length;

      for (let i = 0; i < buttons.length; i++) {
        cumHeight += buttons[i].offsetHeight;
        if (i > 0) cumHeight += gap;
        if (cumHeight > budget && i >= MIN_TAGS) {
          cutoff = i;
          break;
        }
      }

      applyLimit(buttons, cutoff);
    }

    function applyLimit(buttons, cutoff) {
      if (buttons.length <= cutoff + 2) {
        // Not worth collapsing for just 1-2 extra tags
        buttons.forEach(btn => btn.classList.remove('tag-hidden'));
        updateToggle(0);
        return;
      }
      buttons.forEach((btn, i) => {
        btn.classList.toggle('tag-hidden', i >= cutoff);
      });
      updateToggle(buttons.length - cutoff);
    }

    function updateToggle(hiddenCount) {
      let toggle = tagListEl.parentNode.querySelector('.tag-toggle-btn');

      if (hiddenCount <= 0) {
        if (toggle) toggle.remove();
        return;
      }

      if (!toggle) {
        toggle = document.createElement('button');
        toggle.className = 'tag-toggle-btn';
        toggle.addEventListener('click', () => {
          expanded = !expanded;
          if (expanded) {
            tagListEl.classList.add('expanded');
            toggle.textContent = 'Show less';
          } else {
            tagListEl.classList.remove('expanded');
            recalc();
          }
        });
        tagListEl.after(toggle);
      }

      if (!expanded) {
        toggle.textContent = `Show ${hiddenCount} more`;
      }
    }

    // Initial calculation
    recalc();

    // Recalculate on resize
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(recalc, RESIZE_DEBOUNCE);
      });
      observer.observe(containerEl);
      tagListEl._collapseObserver = observer;
    }
  };

  window.SiteUtils = SiteUtils;
})();
