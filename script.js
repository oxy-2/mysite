/* thing */

'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* scroll to top */
(function initBrandScroll() {
  const brand = $('#brand-link');
  if (!brand) return;
  brand.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* entrance diagonal loading screen (FIX THIS BULLSHIT) */
(function initDiagonalWaveLoader() {
  const overlay = $('#loader-overlay');
  const canvas = $('#loader-wave-canvas');
  const welcome = $('#loader-welcome');
  if (!overlay || !canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const SPACING = 20;
  const cols = Math.ceil(width / SPACING) + 1;
  const rows = Math.ceil(height / SPACING) + 1;
  const maxDiag = cols + rows;

  let waveFront = 0;
  let retracting = false;
  let isLoaded = false;

  window.addEventListener('load', () => { isLoaded = true; });

  function renderWave() {
    ctx.clearRect(0, 0, width, height);

    if (!retracting) {
      waveFront += 0.8;
      if (waveFront > maxDiag) {
        waveFront = maxDiag;
        if (isLoaded) {
          retracting = true;
        } else {
          waveFront = 0;
        }
      }
    } else {
      // roll back / peel animation towards top-left
      waveFront -= 1.1;

      // fade welcome text as wave peels back
      const fadeProgress = waveFront / maxDiag;
      if (welcome) {
        welcome.style.opacity = Math.max(0, fadeProgress).toFixed(2);
      }

      if (waveFront <= 0) {
        overlay.classList.add('hidden');
        document.body.classList.remove('loading');
        return;
      }
    }

    // draw diagonal dot matrix wave curtain
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const diagPos = c + r;
        const distToFront = waveFront - diagPos;

        if (distToFront >= 0) {
          const radius = Math.min(6, Math.max(1, distToFront * 0.8));
          const opacity = Math.min(0.95, Math.max(0.1, 1 - distToFront * 0.05));
          ctx.beginPath();
          ctx.arc(c * SPACING, r * SPACING, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(17, 17, 17, ${opacity.toFixed(2)})`;
          ctx.fill();
        }
      }
    }

    requestAnimationFrame(renderWave);
  }

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  renderWave();
})();

/* fullscreen dot matrix */
(function initDotMatrixBg() {
  const canvas = $('#dot-matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const SPACING = 24;
  const BASE_RADIUS = 1.1;
  const MAX_RADIUS = 4.2;
  const INFLUENCE_DIST = 140;

  let width = 0, height = 0, cols = 0, rows = 0;
  let dots = [];
  const mouse = { x: -1000, y: -1000 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.ceil(width / SPACING) + 1;
    rows = Math.ceil(height / SPACING) + 1;
    dots = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          x: c * SPACING,
          y: r * SPACING,
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

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const dx = mouse.x - dot.x;
      const dy = mouse.y - dot.y;
      const dist = Math.hypot(dx, dy);

      let targetR = BASE_RADIUS;
      if (dist < INFLUENCE_DIST) {
        const factor = 1 - dist / INFLUENCE_DIST;
        targetR = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * factor * factor;
      }
      targetR += Math.sin(dot.phase + time) * 0.25;

      dot.radius += (targetR - dot.radius) * 0.12;

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, Math.max(0.5, dot.radius), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(17, 17, 17, ${(0.12 + (dot.radius / MAX_RADIUS) * 0.4).toFixed(3)})`;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  render();
})();

/* 3d draggable dot matrix heart <3 */
(function init3DHeartCAD() {
  const canvas = $('#cad-3d-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const vertices = [];
  const thicknesses = [-12, 0, 12];

  thicknesses.forEach(zOffset => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.12) {
      const x = 16 * Math.pow(Math.sin(angle), 3);
      const y = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));

      for (let ring = 0.9; ring <= 1.1; ring += 0.1) {
        vertices.push({
          x: x * 4.5 * ring,
          y: y * 4.5 * ring,
          z: zOffset
        });
      }
    }
  });

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

  function render3D() {
    if (!isDragging) {
      targetRotY += 0.006;
    }

    rotX += (targetRotX - rotX) * 0.1;
    rotY += (targetRotY - rotY) * 0.1;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 10;
    const fov = 260;

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

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
      ctx.fillStyle = `rgba(17, 17, 17, ${alpha.toFixed(2)})`;
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
