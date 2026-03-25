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
    var isVisible = true;

    function resize() {
      var hero = canvas.parentElement;
      logicalW = hero.offsetWidth;
      logicalH = hero.offsetHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      if (!isVisible) return;
      ctx.clearRect(0, 0, logicalW, logicalH);
      var colorBase = getColor();

      // Draw connections
      var connDistSq = CONNECTION_DIST * CONNECTION_DIST;
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var distSq = dx * dx + dy * dy;
          if (distSq < connDistSq) {
            var dist = Math.sqrt(distSq);
            var alpha = (1 - dist / CONNECTION_DIST) * 0.6;
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

    // Pause animation when hero is not visible
    var heroObserver = new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
      if (isVisible && !animId) {
        animId = requestAnimationFrame(draw);
      }
      if (!isVisible && animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }, { threshold: 0 });
    heroObserver.observe(canvas.parentElement);

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', function () {
      var oldW = logicalW;
      var oldH = logicalH;
      resize();
      if (oldW && oldH) {
        for (var i = 0; i < particles.length; i++) {
          particles[i].x = (particles[i].x / oldW) * logicalW;
          particles[i].y = (particles[i].y / oldH) * logicalH;
        }
      }
    });
  }

  // --- Scroll-triggered reveal ---
  function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var targets = document.querySelectorAll('.hero-content, .section h2, .card, .pub-card, .timeline-entry, .contact-section > p, .contact-section > .hero-links');

    targets.forEach(function (el) {
      el.classList.add('scroll-reveal');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.classList.add('visible');
          observer.unobserve(el);
          el.addEventListener('transitionend', function () {
            el.classList.remove('scroll-reveal', 'visible');
          }, { once: true });
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(function (el) { observer.observe(el); });

    window.revealElements = function (selector) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      document.querySelectorAll(selector).forEach(function (el) {
        el.classList.add('scroll-reveal');
        observer.observe(el);
      });
    };
  }

  // --- Active nav indicator ---
  function initActiveNav() {
    var currentPage = location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-links a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.indexOf('#') === -1 && href === currentPage) {
        link.classList.add('active');
      }
    });

    var sections = document.querySelectorAll('section[id]');
    var hashLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!sections.length || !hashLinks.length) return;

    registerScrollHandler(function () {
      var scrollPos = window.scrollY + 120;
      var current = '';
      sections.forEach(function (section) {
        if (section.offsetTop <= scrollPos) {
          current = section.id;
        }
      });
      hashLinks.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    });
  }

  // --- Back to top button ---
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'back-to-top';
      btn.id = 'back-to-top';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
      document.body.appendChild(btn);
    }
    registerScrollHandler(function () {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Reading progress bar ---
  function initProgressBar() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var bar = document.createElement('div');
    bar.className = 'progress-bar';
    header.appendChild(bar);

    registerScrollHandler(function () {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docHeight > 0 ? scrollTop / docHeight : 0;
      bar.style.transform = 'scaleX(' + progress + ')';
    });
  }

  // --- Unified scroll handler (rAF-throttled) ---
  var scrollHandlers = [];
  var scrollTicking = false;

  function registerScrollHandler(fn) {
    scrollHandlers.push(fn);
    fn(); // run once immediately
  }

  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(function () {
        for (var i = 0; i < scrollHandlers.length; i++) {
          scrollHandlers[i]();
        }
        scrollTicking = false;
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // --- Animated favicon ---
  function initAnimatedFavicon() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    var ctx = canvas.getContext('2d');

    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }

    var dots = [];
    for (var i = 0; i < 5; i++) {
      dots.push({
        x: 6 + Math.random() * 20,
        y: 6 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: 2 + Math.random() * 1.5
      });
    }

    function draw() {
      ctx.clearRect(0, 0, 32, 32);

      for (var i = 0; i < dots.length; i++) {
        for (var j = i + 1; j < dots.length; j++) {
          var dx = dots[i].x - dots[j].x;
          var dy = dots[i].y - dots[j].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 18) {
            ctx.strokeStyle = 'rgba(45,212,191,' + ((1 - d / 18) * 0.7) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }

      for (var k = 0; k < dots.length; k++) {
        var p = dots[k];
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 3 || p.x > 29) p.vx *= -1;
        if (p.y < 3 || p.y > 29) p.vy *= -1;
      }

      link.href = canvas.toDataURL('image/png');
    }

    draw();
    var faviconTimer = setTimeout(function tick() {
      if (!document.hidden) draw();
      faviconTimer = setTimeout(tick, 3000);
    }, 3000);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        clearTimeout(faviconTimer);
      } else {
        faviconTimer = setTimeout(function tick() {
          draw();
          faviconTimer = setTimeout(tick, 3000);
        }, 3000);
      }
    });
  }

  // --- Konami code particle explosion ---
  function initKonamiCode() {
    var code = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    var pos = 0;

    document.addEventListener('keydown', function (e) {
      if (e.keyCode === code[pos]) {
        pos++;
        if (pos === code.length) {
          pos = 0;
          boom();
        }
      } else {
        pos = 0;
      }
    });

    function boom() {
      var overlay = document.createElement('canvas');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
      document.body.appendChild(overlay);
      var W = window.innerWidth;
      var H = window.innerHeight;
      var dpr = window.devicePixelRatio || 1;
      overlay.width = W * dpr;
      overlay.height = H * dpr;
      overlay.style.width = W + 'px';
      overlay.style.height = H + 'px';
      var ctx = overlay.getContext('2d');
      ctx.scale(dpr, dpr);

      var cx = W / 2, cy = H / 2;
      var colors = ['#2dd4bf', '#0d9488', '#5eead4', '#fbbf24', '#f472b6', '#818cf8', '#34d399', '#fb923c'];
      var parts = [];

      for (var i = 0; i < 200; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = Math.random() * 10 + 3;
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          r: Math.random() * 4 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: Math.random() * 0.012 + 0.006
        });
      }

      function frame() {
        ctx.clearRect(0, 0, W, H);
        var alive = false;

        for (var k = 0; k < parts.length; k++) {
          var p = parts[k];
          if (p.life <= 0) continue;
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12;
          p.vx *= 0.99;
          p.life -= p.decay;

          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;

        if (alive) {
          requestAnimationFrame(frame);
        } else {
          overlay.remove();
        }
      }

      frame();
    }
  }

  // --- Hamburger menu toggle ---
  function initHamburger() {
    var btn = document.getElementById('nav-hamburger');
    var links = document.getElementById('nav-links');
    if (!btn || !links) return;

    btn.addEventListener('click', function () {
      btn.classList.toggle('open');
      links.classList.toggle('open');
    });

    // Close menu when a link is clicked
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        btn.classList.remove('open');
        links.classList.remove('open');
      });
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

      summary.setAttribute('role', 'button');
      summary.setAttribute('tabindex', '0');
      summary.setAttribute('aria-expanded', 'false');

      function toggle(e) {
        // Don't toggle when clicking links
        if (e.target.closest('a')) return;

        var expanded = card.classList.toggle('expanded');
        summary.setAttribute('aria-expanded', String(expanded));
      }

      summary.addEventListener('click', toggle);
      summary.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(e);
        }
      });
    });

    // Init features
    initHamburger();
    initHeroCanvas();
    initScrollReveal();
    initActiveNav();
    initProgressBar();
    initBackToTop();
    initAnimatedFavicon();
    initKonamiCode();
  });

  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function (e) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
})();
