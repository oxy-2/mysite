/* thing */

'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* themes + user settings state, saved in localStorage like the tabs page */
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
};

const state = {
  theme: localStorage.getItem('oxy_theme') || 'light',
  bgBaseOpacity: parseFloat(localStorage.getItem('oxy_bg_base')) || 0.22,
  bgHoverOpacity: parseFloat(localStorage.getItem('oxy_bg_hover')) || 0.85,
  bgSpacing: parseInt(localStorage.getItem('oxy_bg_spacing'), 10) || 24
};

applyTheme(state.theme);

/* bridges: other sections replace these with real implementations */
let updateBgConfig = () => { };
let toggleSettings = () => { };

/* scroll to top when already home, otherwise the hash router handles it */
(function initBrandScroll() {
  const brand = $('#brand-link');
  if (!brand) return;
  brand.addEventListener('click', () => {
    if ((location.hash || '#about') === '#about') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
})();

/* entrance diagonal loading screen (same as oxygenated cuz its way cleaner, wave only sweeps one way then fades) */
(function initLoader() {
  const overlay = $('#loader-overlay');
  const canvas = $('#loader-wave-canvas');
  if (!overlay || !canvas) return;

  const ctx = canvas.getContext('2d');
  const SPACING = 20;

  let width = 0, height = 0, cols = 0, rows = 0, maxDiag = 0;
  let waveFront = 0;
  let isLoaded = false;
  let fading = false;

  // measures on every window and resize so the grid always fills the screen
  function size() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.ceil(width / SPACING) + 1;
    rows = Math.ceil(height / SPACING) + 1;
    maxDiag = cols + rows;
  }
  size();

  // page counts as loaded once assets are in (or shortly after)
  window.addEventListener('load', () => { isLoaded = true; });
  setTimeout(() => { isLoaded = true; }, 600);

  // canvas cant use css vars so it asks the html tag which theme is active each frame
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  function render() {
    // stop drawing once the loader is fully hidden
    if (overlay.classList.contains('hidden')) return;

    ctx.clearRect(0, 0, width, height);

    // wave only moves one way, then fades grid + welcome dot together
    if (!fading) {
      waveFront += 1.6;
      if (waveFront >= maxDiag) {
        waveFront = maxDiag;
        if (isLoaded) {
          fading = true;
          overlay.classList.add('fading');
          setTimeout(() => {
            overlay.classList.add('hidden');
            document.body.classList.remove('loading'); // reveal the page
          }, 700); // matches the css fade duration
        }
      }
    }

    // draw tailing dots, deeper dots grow larger and more opaque for that sweep feel
    const rgb = isDark() ? '255, 255, 255' : '17, 17, 17';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const distToFront = waveFront - (c + r);
        if (distToFront >= 0) {
          const radius = Math.min(6, Math.max(1, distToFront * 0.8));
          const opacity = Math.min(0.95, Math.max(0.15, 1 - distToFront * 0.05));
          ctx.beginPath();
          ctx.arc(c * SPACING, r * SPACING, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${opacity.toFixed(2)})`;
          ctx.fill();
        }
      }
    }

    requestAnimationFrame(render);
  }

  window.addEventListener('resize', size);
  render();
})();

/* fullscreen dot matrix, reads settings for spacing + contrast and switches colors with the theme */
(function initDotMatrixBg() {
  const canvas = $('#dot-matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const BASE_RADIUS = 1.3;
  const MAX_RADIUS = 5.0;
  const INFLUENCE_DIST = 160;

  let width = 0, height = 0, cols = 0, rows = 0;
  let dots = [];
  const mouse = { x: -1000, y: -1000 };

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  // build the flat dot list once, redraw is what animates, each dot has a random phase so the pulse feels alive
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.ceil(width / state.bgSpacing) + 1;
    rows = Math.ceil(height / state.bgSpacing) + 1;
    dots = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          x: c * state.bgSpacing,
          y: r * state.bgSpacing,
          radius: BASE_RADIUS,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  let time = 0;

  function render() {
    ctx.clearRect(0, 0, width, height);
    time += 0.02;

    const rgb = isDark() ? '255, 255, 255' : '17, 17, 17';

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const dx = mouse.x - dot.x;
      const dy = mouse.y - dot.y;
      const dist = Math.hypot(dx, dy);

      let targetR = BASE_RADIUS;
      let proximityFactor = 0;

      if (dist < INFLUENCE_DIST) {
        // proximityFactor goes 1 (on your cursor) down to 0 (at the edge), squaring it curves the falloff
        proximityFactor = 1 - dist / INFLUENCE_DIST;
        targetR = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * proximityFactor * proximityFactor;
      }
      // soft ambient pulse so the grid stays alive
      targetR += Math.sin(dot.phase + time) * 0.2;
      dot.radius += (targetR - dot.radius) * 0.15;

      // opacity blends between the base setting and the hover setting
      const opacity = state.bgBaseOpacity + (state.bgHoverOpacity - state.bgBaseOpacity) * (proximityFactor * proximityFactor);

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, Math.max(0.6, dot.radius), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${opacity.toFixed(3)})`;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  // gets called for contrast and spacing changes in the settings menu
  updateBgConfig = () => resize();

  window.addEventListener('resize', resize);
  resize();
  render();
})();

/* 3d draggable dot matrix, now with all the shapes: heart, icosahedron, cube */
(function init3DShapes() {
  const canvas = $('#cad-3d-canvas');
  const coordsEl = $('#cad-coords');
  const modeBtn = $('#cad-mode-btn');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const modes = ['heart', 'icosahedron', 'cube'];
  let modeIndex = 0;
  let vertices = [];

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  /* the shape factories, heart is the classic one, the rest borrowed from oxygenated tabs */
  function generateGeometry() {
    vertices = [];
    const mode = modes[modeIndex];

    if (mode === 'heart') {
      const thicknesses = [-12, 0, 12];
      thicknesses.forEach(zOffset => {
        for (let angle = 0; angle < Math.PI * 2; angle += 0.12) {
          const x = 16 * Math.pow(Math.sin(angle), 3);
          const y = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
          for (let ring = 0.9; ring <= 1.1; ring += 0.1) {
            vertices.push({ x: x * 4.5 * ring, y: y * 4.5 * ring, z: zOffset });
          }
        }
      });
    } else if (mode === 'icosahedron') {
      const phi = (1 + Math.sqrt(5)) / 2;
      const raw = [
        [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
        [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
        [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
      ];
      raw.forEach(v => {
        vertices.push({ x: v[0] * 32, y: v[1] * 32, z: v[2] * 32 });
      });
      // dots along the edges for that wireframe feel, two corners are neighbors if their 3d distance is small
      for (let i = 0; i < raw.length; i++) {
        for (let j = i + 1; j < raw.length; j++) {
          const dist = Math.hypot(raw[i][0] - raw[j][0], raw[i][1] - raw[j][1], raw[i][2] - raw[j][2]);
          if (dist < 2.3) {
            for (let t = 0.2; t < 1; t += 0.2) {
              vertices.push({
                x: (raw[i][0] + (raw[j][0] - raw[i][0]) * t) * 32,
                y: (raw[i][1] + (raw[j][1] - raw[i][1]) * t) * 32,
                z: (raw[i][2] + (raw[j][2] - raw[i][2]) * t) * 32
              });
            }
          }
        }
      }
    } else { // cube, only surface points cuz the inside stays empty
      for (let x = -1; x <= 1; x += 0.5) {
        for (let y = -1; y <= 1; y += 0.5) {
          for (let z = -1; z <= 1; z += 0.5) {
            if (Math.abs(x) === 1 || Math.abs(y) === 1 || Math.abs(z) === 1) {
              vertices.push({ x: x * 40, y: y * 40, z: z * 40 });
            }
          }
        }
      }
    }
  }

  generateGeometry();

  let rotX = 0.2;
  let rotY = 0.4;
  let targetRotX = 0.2;
  let targetRotY = 0.4;

  let isDragging = false;
  let lastX = 0, lastY = 0;

  const viewport = canvas.parentElement;

  viewport.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    targetRotY += dx * 0.01;
    targetRotX += dy * 0.01;

    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  // shape cycling: heart → icosahedron → cube → loop
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      modeIndex = (modeIndex + 1) % modes.length;
      modeBtn.textContent = modes[modeIndex];
      generateGeometry();
    });
  }

  function render3D() {
    if (!isDragging) {
      targetRotY += 0.006;
    }

    rotX += (targetRotX - rotX) * 0.1;
    rotY += (targetRotY - rotY) * 0.1;

    if (coordsEl) {
      coordsEl.innerHTML = `<span class="red-indicator">●</span> x ${rotX.toFixed(2)} y ${rotY.toFixed(2)}`;
    }

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 10;
    const fov = 260;

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const rgb = isDark() ? '255, 255, 255' : '17, 17, 17';

    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];

      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.x * sinY + v.z * cosY;

      let y2 = v.y * cosX - z1 * sinX;
      let z2 = v.y * sinX + z1 * cosX;

      const scale = fov / (fov + z2 + 200);
      const px = cx + x1 * scale;
      const py = cy + y2 * scale;

      const radius = Math.max(1, 2.2 * scale);
      const alpha = Math.min(0.9, Math.max(0.2, (scale - 0.4) * 1.8));

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(2)})`;
      ctx.fill();
    }

    requestAnimationFrame(render3D);
  }

  render3D();
})();

/* interests terminal typa thing */
(function initTerm() {
  const body = $('#term-body');
  if (!body) return;

  const lines = [
    '❯ cat oxy_profile.json',
    '{',
    '  "name": "Hugo (oxy)",',
    '  "age": 17,',
    '  "location": "Madeira, Portugal (from South Africa)",',
    '  "passions": [',
    '    "military aeronautics & engineering",',
    '    "space systems and nasa & esa",',
    '    "low-level computing & fpgas",',
    '    "pcb design & schematics",',
    '    "3d printing (ender 3 of eternal doom and despair)",',
    '    "software engineering (all the languages lol)"',
    '  ],',
    '  "flagship": "DeltaVR",',
    '  "gov_op": "Feb 2027"',
    '}'
  ];

  let i = 0;
  function step() {
    if (i >= lines.length) return;
    const div = document.createElement('div');
    div.textContent = lines[i++];
    body.appendChild(div);
    setTimeout(step, 120);
  }

  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      obs.disconnect();
      step();
    }
  }, { threshold: 0.3 });

  obs.observe(body);
})();

/* settings drawer, slides in from the right, no clock stuff cuz there is no clock on this site */
(function initSettings() {
  const toggleBtn = $('#settings-toggle');
  const drawer = $('#settings-drawer');
  const bg = $('#drawer-bg');
  const closeBtn = $('#close-drawer');
  const contrastOpts = $$('#contrast-opts .opt');
  const spacingOpts = $$('#spacing-opts .opt');
  const themeOpts = $$('#theme-opts .opt');

  // reflect whatever was saved in localStorage so the picked buttons look chosen
  contrastOpts.forEach(o => {
    o.classList.toggle('active', parseFloat(o.dataset.base) === state.bgBaseOpacity);
  });
  spacingOpts.forEach(o => {
    o.classList.toggle('active', parseInt(o.dataset.spacing, 10) === state.bgSpacing);
  });
  themeOpts.forEach(o => {
    o.classList.toggle('active', o.dataset.themeOpt === state.theme);
  });

  // open / close
  toggleSettings = () => {
    if (!drawer) return;
    const open = drawer.classList.toggle('open');
    if (bg) bg.classList.toggle('open', open);
  };

  if (toggleBtn) toggleBtn.addEventListener('click', toggleSettings);
  if (closeBtn) closeBtn.addEventListener('click', toggleSettings);
  if (bg) {
    bg.addEventListener('click', () => {
      if (drawer && drawer.classList.contains('open')) toggleSettings();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) toggleSettings();
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      toggleSettings();
    }
  });

  // dot contrast
  contrastOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      state.bgBaseOpacity = parseFloat(btn.dataset.base);
      state.bgHoverOpacity = parseFloat(btn.dataset.hover);
      localStorage.setItem('oxy_bg_base', state.bgBaseOpacity);
      localStorage.setItem('oxy_bg_hover', state.bgHoverOpacity);
      contrastOpts.forEach(o => o.classList.toggle('active', o === btn));
      updateBgConfig();
    });
  });

  // dot spacing
  spacingOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      state.bgSpacing = parseInt(btn.dataset.spacing, 10);
      localStorage.setItem('oxy_bg_spacing', state.bgSpacing);
      spacingOpts.forEach(o => o.classList.toggle('active', o === btn));
      updateBgConfig();
    });
  });

  // theme light / dark
  themeOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      state.theme = btn.dataset.themeOpt;
      localStorage.setItem('oxy_theme', state.theme);
      applyTheme(state.theme);
      themeOpts.forEach(o => o.classList.toggle('active', o === btn));
      // canvas charts can't read css vars, let them know to repaint in the new colors
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  });
})();

/* my pfp but BIGGER, click the lil photo and it becomes a big square with the full pic */
(function initPfpModal() {
  const pfpWrapper = $('.pfp-wrapper');
  const modal = $('#pfp-modal');
  const closeBtn = $('#close-pfp-modal');
  if (!pfpWrapper || !modal) return;

  const open = () => modal.classList.add('open');
  const close = () => modal.classList.remove('open');

  pfpWrapper.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);

  // clicking the dark background (not the card) closes it too
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
})();

/* two-tier hash router: big tabs switch page (about = one long scrolling page,
   deltavr = separate panels). small tabs jump to sections / switch deltavr panels.
   fires panel:shown so lazy things (schematics, charts) boot when visible */
const BIG_TABS = {
  about: ['about', 'projects', 'hardware', 'contact'],
  deltavr: ['deltavr', 'schematic', 'gallery', 'stats']
};
const ALL_IDS = [...BIG_TABS.about, ...BIG_TABS.deltavr];
let firstRoute = true;
let spyPauseUntil = 0;

function route() {
  let id = (location.hash || '#about').slice(1);
  if (!ALL_IDS.includes(id)) id = 'about';
  const big = id === 'deltavr' || BIG_TABS.deltavr.includes(id) ? 'deltavr' : 'about';

  // home is one long page (panel-about); each deltavr sub-tab is its own panel
  const shownPanel = big === 'about' ? 'about' : id;
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + shownPanel));
  $$('[data-big]').forEach(t => t.classList.toggle('active', t.dataset.big === big));
  $$('.subtabs-group').forEach(g => g.classList.toggle('hidden', g.dataset.for !== big));
  $$('.sub-tab').forEach(t => t.classList.toggle('active', t.getAttribute('href') === '#' + id));

  const navH = $('.nav-header')?.offsetHeight || 58;

  if (big === 'deltavr') {
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('panel:shown', { detail: { id } }));
  } else if (id === 'about' && !firstRoute) {
    // plain #about click just goes to the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (big === 'about') {
    spyPauseUntil = Date.now() + 900;
    if (id !== 'about') {
      const sec = document.getElementById('section-' + id);
      if (sec) {
        requestAnimationFrame(() => {
          const y = sec.getBoundingClientRect().top + window.scrollY - navH - 10;
          window.scrollTo({ top: Math.max(y, 0), behavior: firstRoute ? 'auto' : 'smooth' });
        });
      }
    }
  }

  firstRoute = false;
}

/* scrollspy: highlights the small tab of whichever home section you're reading */
(function initScrollSpy() {
  const secs = ['section-about', 'section-projects', 'section-hardware', 'section-contact']
    .map(s => document.getElementById(s)).filter(Boolean);
  if (!secs.length) return;

  const spy = new IntersectionObserver(entries => {
    if (Date.now() < spyPauseUntil) return;
    const visible = entries.filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const id = visible.target.id.replace(/^section-/, '') || 'about';
    $$('.subtabs-group[data-for="about"] .sub-tab').forEach(t =>
      t.classList.toggle('active', t.getAttribute('href') === '#' + id));
  }, { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.2, 0.5] });

  secs.forEach(s => spy.observe(s));
})();

window.addEventListener('hashchange', route);
route();

/* devlog gallery (hardware shots intentionally not here) + click to zoom lightbox */
(function initGallery() {
  const grid = $('#gallery-grid');
  if (!grid) return;

  // generated from stardance devlogs — newest first
  const DEVLOG_IMAGES = [
    '2026-08-22-1.png', '2026-08-22-2.png', '2026-08-22-3.png',
    '2026-08-20-1.png', '2026-08-20-2.png', '2026-08-20-3.png',
    '2026-08-18-1.png', '2026-08-18-2.png', '2026-08-18-3.png', '2026-08-18-4.png',
    '2026-08-15-1.png', '2026-08-15-2.png', '2026-08-15-3.png',
    '2026-08-10-1.png', '2026-08-10-2.jpg',
    '2026-07-29-1.png', '2026-07-29-2.png',
    '2026-07-25-1.png', '2026-07-25-2.png', '2026-07-25-3.png', '2026-07-25-4.png',
    '2026-07-23-1.png',
    '2026-07-20-1.png', '2026-07-20-2.png',
    '2026-07-11-1.png', '2026-07-11-2.png', '2026-07-11-3.png', '2026-07-11-4.png',
    '2026-07-09-1.png',
    '2026-07-03-1.png',
    '2026-07-02-1.png'
  ];

  for (const file of DEVLOG_IMAGES) {
    const date = file.slice(0, 10);
    const item = document.createElement('figure');
    item.className = 'gallery-item';
    const img = document.createElement('img');
    img.src = `deltavr-assets/gallery/devlog/${file}`;
    img.alt = `devlog ${date}`;
    img.loading = 'lazy';
    const cap = document.createElement('figcaption');
    cap.className = 'gallery-caption';
    cap.textContent = `devlog ${date}`;
    item.append(img, cap);
    grid.appendChild(item);

    item.addEventListener('click', () => openLightbox(img.src, cap.textContent));
  }

  const modal = $('#img-modal');
  const modalImg = $('#img-modal-img');
  const modalCap = $('#img-modal-caption');

  function openLightbox(src, caption) {
    modalImg.src = src;
    modalCap.textContent = caption;
    modal.classList.add('open');
  }

  $('#close-img-modal')?.addEventListener('click', () => modal.classList.remove('open'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) modal.classList.remove('open');
  });
})();