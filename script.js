(function () {
  'use strict';

  var STORAGE_KEY = 'theme-preference';

  function getPreferredTheme() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Theme toggle
    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    // Expandable publication cards
    document.querySelectorAll('.pub-card[data-expandable]').forEach(function (card) {
      var summary = card.querySelector('.pub-summary');
      var details = card.querySelector('.pub-details');
      if (!summary || !details) return;

      summary.addEventListener('click', function (e) {
        // Don't toggle when clicking links
        if (e.target.closest('a')) return;

        card.classList.toggle('expanded');

        if (card.classList.contains('expanded')) {
          details.style.maxHeight = details.scrollHeight + 'px';
        } else {
          details.style.maxHeight = '0px';
        }
      });
    });
  });

  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function (e) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
})();
