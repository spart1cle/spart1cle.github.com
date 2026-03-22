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

  // --- Hero particle animation ---
  function initHeroCanvas() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var PARTICLE_COUNT = 40;
    var CONNECTION_DIST = 120;
    var animId;
    var logicalW = 0;
    var logicalH = 0;

    function resize() {
      var hero = canvas.parentElement;
      logicalW = hero.offsetWidth;
      logicalH = hero.offsetHeight;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = logicalW + 'px';
      canvas.style.height = logicalH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticles() {
      particles = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * logicalW,
          y: Math.random() * logicalH,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 2 + 1
        });
      }
    }

    function getColor() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark ? 'rgba(45, 212, 191,' : 'rgba(13, 148, 136,';
    }

    function draw() {
      ctx.clearRect(0, 0, logicalW, logicalH);
      var colorBase = getColor();

      // Draw connections
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            var alpha = (1 - dist / CONNECTION_DIST) * 0.3;
            ctx.strokeStyle = colorBase + alpha + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        ctx.fillStyle = colorBase + '0.6)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > logicalW) p.vx *= -1;
        if (p.y < 0 || p.y > logicalH) p.vy *= -1;
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', function () {
      resize();
      createParticles();
    });
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

    // Init features
    initHeroCanvas();
  });

  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function (e) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
})();
