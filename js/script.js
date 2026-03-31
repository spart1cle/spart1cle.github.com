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
    const PARTICLE_COUNT = 55;
    const CONNECTION_DIST = 100;
    let animId;
    let logicalW = 0;
    let logicalH = 0;
    let isVisible = true;

    function resize() {
      const hero = canvas.parentElement;
      logicalW = hero.offsetWidth;
      logicalH = hero.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Generate particle colors using the same hue range as tag colors (HSL 175–285°)
    function particleHsl(index) {
      const hue = 175 + (index * 110) / PARTICLE_COUNT;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark
        ? `hsla(${hue}, 90%, 65%,`
        : `hsla(${hue}, 85%, 45%,`;
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * logicalW,
          y: Math.random() * logicalH,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 2.5 + 1.5,
          colorIdx: i,
        });
      }
    }

    function draw() {
      if (!isVisible) return;
      ctx.clearRect(0, 0, logicalW, logicalH);

      const connDistSq = CONNECTION_DIST * CONNECTION_DIST;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < connDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / CONNECTION_DIST) * 0.7;
            const midIdx = (particles[i].colorIdx + particles[j].colorIdx) / 2;
            ctx.strokeStyle = particleHsl(midIdx) + `${alpha})`;
            ctx.lineWidth = 1 + (1 - dist / CONNECTION_DIST);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (let k = 0; k < particles.length; k++) {
        const p = particles[k];
        ctx.fillStyle = particleHsl(p.colorIdx) + '0.85)';
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

    // Mobile: shake detection
    let lastShake = 0;
    let shakeCount = 0;
    let lastAccel = { x: 0, y: 0, z: 0 };
    let shakeTimer = null;
    const SHAKE_THRESHOLD = 25;
    const SHAKES_NEEDED = 3;

    window.addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const delta = Math.abs(a.x - lastAccel.x) + Math.abs(a.y - lastAccel.y) + Math.abs(a.z - lastAccel.z);
      lastAccel = { x: a.x, y: a.y, z: a.z };

      if (delta > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShake > 300) {
          shakeCount++;
          lastShake = now;
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => { shakeCount = 0; }, 1500);
          if (shakeCount >= SHAKES_NEEDED) {
            shakeCount = 0;
            clearTimeout(shakeTimer);
            boom();
          }
        }
      }
    });

    // Mobile: 7-tap on profile photo
    const photo = document.querySelector('.hero-photo');
    if (photo) {
      let tapCount = 0;
      let tapTimer = null;
      photo.addEventListener('click', (e) => {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 2000);
        if (tapCount >= 7) {
          tapCount = 0;
          clearTimeout(tapTimer);
          boom(e.clientX, e.clientY);
        }
      });
    }

    let booming = false;

    function boom(originX, originY) {
      if (booming) return;
      booming = true;
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

      const cx = originX != null ? originX : W / 2;
      const cy = originY != null ? originY : H / 2;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const sat = isDark ? '90%' : '85%';
      const lit = isDark ? '65%' : '45%';
      const parts = [];

      const TAIL_LEN = 6;

      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 3;
        const hue = 175 + Math.random() * 110;
        const trail = new Array(TAIL_LEN);
        for (let t = 0; t < TAIL_LEN; t++) trail[t] = { x: cx, y: cy };
        parts.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed * 60,
          vy: (Math.sin(angle) * speed - 2) * 60,
          r: Math.random() * 4 + 1.5,
          hsl: `hsl(${hue} ${sat} ${lit} / `,
          life: 1,
          decay: (Math.random() * 0.012 + 0.006) * 60,
          trail: trail,
          tIdx: 0,
        });
      }

      // Initial flash state
      let flashLife = 1;
      const flashDecay = 3; // fades over ~0.33s

      let prev = performance.now();

      function frame(now) {
        const dt = Math.min((now - prev) / 1000, 0.05);
        prev = now;
        ctx.clearRect(0, 0, W, H);
        let alive = false;
        const drag = Math.pow(0.99, 60 * dt);
        const gravity = 7.2 * 60 * dt;

        // Draw initial flash/glow
        if (flashLife > 0) {
          alive = true;
          flashLife -= flashDecay * dt;
          const flashAlpha = Math.max(0, flashLife) * 0.6;
          const flashRadius = (1 - flashLife) * 150 + 50;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashRadius);
          grad.addColorStop(0, `hsl(200 ${sat} ${lit} / ${flashAlpha})`);
          grad.addColorStop(1, `hsl(200 ${sat} ${lit} / 0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(cx - flashRadius, cy - flashRadius, flashRadius * 2, flashRadius * 2);
        }

        for (let k = 0; k < parts.length; k++) {
          const p = parts[k];
          if (p.life <= 0) continue;
          alive = true;

          // Write current position into circular buffer
          p.trail[p.tIdx].x = p.x;
          p.trail[p.tIdx].y = p.y;
          p.tIdx = (p.tIdx + 1) % TAIL_LEN;

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += gravity;
          p.vx *= drag;
          p.life -= p.decay * dt;

          // Sparkle flicker when life < 0.3
          let alpha = Math.max(0, p.life);
          if (p.life < 0.3 && p.life > 0) {
            alpha *= 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(now * 0.03 + k * 7));
          }

          // Draw tail from oldest to newest
          for (let t = 0; t < TAIL_LEN; t++) {
            const idx = (p.tIdx + t) % TAIL_LEN;
            const frac = (t + 1) / (TAIL_LEN + 1);
            const d = p.r * frac;
            ctx.fillStyle = p.hsl + alpha * frac * 0.5 + ')';
            ctx.beginPath();
            ctx.arc(p.trail[idx].x, p.trail[idx].y, d, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw head
          ctx.fillStyle = p.hsl + alpha + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          // Secondary burst: spawn child particles when dying
          if (p.life <= 0.25 && !p.spawned && Math.random() < 0.2) {
            p.spawned = true;
            for (let c = 0; c < 4; c++) {
              const cAngle = Math.random() * Math.PI * 2;
              const cSpeed = (Math.random() * 5 + 3) * 60;
              const cTrail = new Array(TAIL_LEN);
              for (let t = 0; t < TAIL_LEN; t++) cTrail[t] = { x: p.x, y: p.y };
              parts.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(cAngle) * cSpeed,
                vy: Math.sin(cAngle) * cSpeed,
                r: p.r * 0.75,
                hsl: p.hsl,
                life: 0.7 + Math.random() * 0.4,
                decay: (Math.random() * 0.008 + 0.005) * 60,
                trail: cTrail,
                tIdx: 0,
                spawned: true,
              });
            }
          }
        }

        if (alive) {
          requestAnimationFrame(frame);
        } else {
          overlay.remove();
          booming = false;
        }
      }

      requestAnimationFrame(frame);
    }
  }

  // ── Hamburger Menu Toggle ──────────────────────────────────
  function initHamburger() {
    const btn = document.getElementById('nav-hamburger');
    const links = document.getElementById('nav-links');
    if (!btn || !links) return;

    function closeMenu() {
      btn.classList.remove('open');
      links.classList.remove('open');
    }

    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      links.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (links.classList.contains('open') && !links.contains(e.target) && !btn.contains(e.target)) {
        closeMenu();
      }
    });

    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', closeMenu);
    });
  }

  // ── Auto-Color Tags ──────────────────────────────────────────
  // Generates the original HSL palette, converts each color to OKLCH,
  // then normalises lightness so all tags look equally bright while
  // preserving each color's natural hue and chroma.
  window.initTagColors = function () {
    var els = document.querySelectorAll(
      '.reading-tag, .tag-filter-btn[data-tag], .tag-filter-btn[data-compose-tag]'
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

    function hslToRgb(h, s, l) {
      h = ((h % 360) + 360) % 360;
      var c = (1 - Math.abs(2 * l - 1)) * s;
      var x = c * (1 - Math.abs((h / 60) % 2 - 1));
      var m = l - c / 2;
      var r, g, b;
      if (h < 60)       { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else              { r = c; g = 0; b = x; }
      return [r + m, g + m, b + m];
    }

    function toLinear(c) {
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    function rgbToOklch(r, g, b) {
      r = toLinear(r); g = toLinear(g); b = toLinear(b);
      var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
      var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
      var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
      var l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
      var L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
      var a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
      var B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
      var C = Math.sqrt(a * a + B * B);
      var H = Math.atan2(B, a) * 180 / Math.PI;
      if (H < 0) H += 360;
      return [L, C, H];
    }

    // Convert original HSL colors to OKLCH
    var oklchColors = [];
    var sumL = 0;
    for (var i = 0; i < allNames.length; i++) {
      var hue = 175 + (i * 110) / n;
      var rgb = hslToRgb(hue, 0.65, 0.5);
      var lch = rgbToOklch(rgb[0], rgb[1], rgb[2]);
      oklchColors.push(lch);
      sumL += lch[0];
    }
    var targetL = sumL / allNames.length;

    // Build cache: uniform lightness, original chroma & hue
    var cache = {};
    for (var i = 0; i < allNames.length; i++) {
      var c = oklchColors[i];
      cache[allNames[i]] = 'oklch(' + targetL.toFixed(4) + ' ' + c[1].toFixed(4) + ' ' + c[2].toFixed(2) + ')';
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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const expanded = document.querySelector('.pub-card.expanded');
        if (expanded) {
          const summary = expanded.querySelector('.pub-summary');
          expanded.classList.remove('expanded');
          if (summary) {
            summary.setAttribute('aria-expanded', 'false');
            summary.focus();
          }
        }
      }
    });

    window.initTagColors();

    // Clickable tags on static pages: navigate to reading.html with filter
    document.addEventListener('click', (e) => {
      const tagEl = e.target.closest('.reading-tag[data-tag]');
      if (!tagEl) return;
      // On dynamic pages (reading/thoughts), page-specific handlers call stopPropagation
      const tag = tagEl.dataset.tag;
      if (tag) window.location.href = `reading.html#tags=${encodeURIComponent(tag)}`;
    });

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
