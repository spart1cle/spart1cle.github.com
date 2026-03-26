(function () {
  'use strict';

  const STORAGE_KEY = 'theme-preference';

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // ── Hero Particle Animation ────────────────────────────────
  function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 40;
    const CONNECTION_DIST = 120;
    let animId;
    let logicalW = 0;
    let logicalH = 0;
    let isVisible = true;

    function resize() {
      const hero = canvas.parentElement;
      logicalW = hero.offsetWidth;
      logicalH = hero.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * logicalW,
          y: Math.random() * logicalH,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 2 + 1,
        });
      }
    }

    function getColor() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark ? 'rgba(45, 212, 191,' : 'rgba(13, 148, 136,';
    }

    function draw() {
      if (!isVisible) return;
      ctx.clearRect(0, 0, logicalW, logicalH);
      const colorBase = getColor();

      const connDistSq = CONNECTION_DIST * CONNECTION_DIST;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < connDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / CONNECTION_DIST) * 0.6;
            ctx.strokeStyle = `${colorBase}${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (let k = 0; k < particles.length; k++) {
        const p = particles[k];
        ctx.fillStyle = `${colorBase}0.6)`;
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

    const heroObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !animId) {
          animId = requestAnimationFrame(draw);
        }
        if (!isVisible && animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      },
      { threshold: 0 }
    );
    heroObserver.observe(canvas.parentElement);

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
      const oldW = logicalW;
      const oldH = logicalH;
      resize();
      if (oldW && oldH) {
        for (let i = 0; i < particles.length; i++) {
          particles[i].x = (particles[i].x / oldW) * logicalW;
          particles[i].y = (particles[i].y / oldH) * logicalH;
        }
      }
    });
  }

  // ── Scroll-Triggered Reveal ────────────────────────────────
  function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll(
      '.hero-content, .section h2, .card, .pub-card, .timeline-entry, .contact-section > p, .contact-section > .hero-links'
    );

    targets.forEach((el) => el.classList.add('scroll-reveal'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            el.classList.add('visible');
            observer.unobserve(el);
            el.addEventListener(
              'transitionend',
              () => el.classList.remove('scroll-reveal', 'visible'),
              { once: true }
            );
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach((el) => observer.observe(el));

    window.revealElements = (selector) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add('scroll-reveal');
        observer.observe(el);
      });
    };
  }

  // ── Active Nav Indicator ───────────────────────────────────
  function initActiveNav() {
    const currentPage = location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-links a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && !href.includes('#') && href === currentPage) {
        link.classList.add('active');
      }
    });

    const sections = document.querySelectorAll('section[id]');
    const hashLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!sections.length || !hashLinks.length) return;

    registerScrollHandler(() => {
      const scrollPos = window.scrollY + 120;
      let current = '';
      sections.forEach((section) => {
        if (section.offsetTop <= scrollPos) {
          current = section.id;
        }
      });
      hashLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
      });
    });
  }

  // ── Back to Top Button ─────────────────────────────────────
  function initBackToTop() {
    let btn = document.getElementById('back-to-top');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'back-to-top';
      btn.id = 'back-to-top';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
      document.body.appendChild(btn);
    }
    registerScrollHandler(() => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Reading Progress Bar ───────────────────────────────────
  function initProgressBar() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    header.appendChild(bar);

    registerScrollHandler(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
    });
  }

  // ── Unified Scroll Handler (rAF-Throttled) ─────────────────
  const scrollHandlers = [];
  let scrollTicking = false;

  function registerScrollHandler(fn) {
    scrollHandlers.push(fn);
    fn();
  }

  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(() => {
        for (let i = 0; i < scrollHandlers.length; i++) {
          scrollHandlers[i]();
        }
        scrollTicking = false;
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Animated Favicon ───────────────────────────────────────
  function initAnimatedFavicon() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }

    const dots = [];
    for (let i = 0; i < 5; i++) {
      dots.push({
        x: 6 + Math.random() * 20,
        y: 6 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: 2 + Math.random() * 1.5,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, 32, 32);

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 18) {
            ctx.strokeStyle = `rgba(45,212,191,${(1 - d / 18) * 0.7})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }

      for (let k = 0; k < dots.length; k++) {
        const p = dots[k];
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
    let faviconTimer = setTimeout(function tick() {
      if (!document.hidden) draw();
      faviconTimer = setTimeout(tick, 3000);
    }, 3000);

    document.addEventListener('visibilitychange', () => {
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

  // ── Konami Code Particle Explosion ─────────────────────────
  function initKonamiCode() {
    const code = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    let pos = 0;

    document.addEventListener('keydown', (e) => {
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
      const overlay = document.createElement('canvas');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
      document.body.appendChild(overlay);
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      overlay.width = W * dpr;
      overlay.height = H * dpr;
      overlay.style.width = `${W}px`;
      overlay.style.height = `${H}px`;
      const ctx = overlay.getContext('2d');
      ctx.scale(dpr, dpr);

      const cx = W / 2;
      const cy = H / 2;
      const colors = [
        '#2dd4bf', '#0d9488', '#5eead4', '#fbbf24',
        '#f472b6', '#818cf8', '#34d399', '#fb923c',
      ];
      const parts = [];

      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 3;
        parts.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          r: Math.random() * 4 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: Math.random() * 0.012 + 0.006,
        });
      }

      function frame() {
        ctx.clearRect(0, 0, W, H);
        let alive = false;

        for (let k = 0; k < parts.length; k++) {
          const p = parts[k];
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

  // ── Hamburger Menu Toggle ──────────────────────────────────
  function initHamburger() {
    const btn = document.getElementById('nav-hamburger');
    const links = document.getElementById('nav-links');
    if (!btn || !links) return;

    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      links.classList.toggle('open');
    });

    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        btn.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  // ── Auto-Color Tags ──────────────────────────────────────────
  // Scans the DOM for .reading-tag and .tag-filter-btn elements,
  // collects unique tag names, and assigns deterministic HSL colors
  // using the same formula as shared.js buildTagColorCache.
  window.initTagColors = function () {
    var els = document.querySelectorAll(
      '.reading-tag:not(.reading-tag-liked), .tag-filter-btn[data-tag]:not([data-tag="__liked__"]), .tag-filter-btn[data-compose-tag]'
    );
    if (!els.length) return;
    var seen = {};
    var allNames = [];
    els.forEach(function (el) {
      var name = el.dataset.tag || el.dataset.composeTag || el.dataset.removeTag || el.textContent.trim();
      if (name && !seen[name]) { seen[name] = true; allNames.push(name); }
    });
    allNames.sort(function (a, b) { return a.localeCompare(b); });
    var n = allNames.length || 1;
    var cache = {};
    for (var i = 0; i < allNames.length; i++) {
      cache[allNames[i]] = 'hsl(' + Math.round(170 + (i * 110) / n) + ', 65%, 50%)';
    }
    els.forEach(function (el) {
      var name = el.dataset.tag || el.dataset.composeTag || el.dataset.removeTag || el.textContent.trim();
      if (cache[name]) el.style.setProperty('--tag-color', cache[name]);
    });
  };

  // ── Init ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    document.querySelectorAll('.pub-card[data-expandable]').forEach((card) => {
      const summary = card.querySelector('.pub-summary');
      const details = card.querySelector('.pub-details');
      if (!summary || !details) return;

      summary.setAttribute('role', 'button');
      summary.setAttribute('tabindex', '0');
      summary.setAttribute('aria-expanded', 'false');

      function toggle(e) {
        if (e.target.closest('a')) return;
        const expanded = card.classList.toggle('expanded');
        summary.setAttribute('aria-expanded', String(expanded));
      }

      summary.addEventListener('click', toggle);
      summary.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(e);
        }
      });
    });

    window.initTagColors();
    initHamburger();
    initHeroCanvas();
    initScrollReveal();
    initActiveNav();
    initProgressBar();
    initBackToTop();
    initAnimatedFavicon();
    initKonamiCode();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
})();
