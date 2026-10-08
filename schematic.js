/* schematic viewer · injects the kicad svg straight into the dom and zooms by
   resizing its layout box (transform:scale() makes chrome rasterize the svg at
   the old size and stretch the texture = blurry). layout-size changes force the
   browser to re-render the vectors sharp at every zoom level.
   wheel zooms at cursor, drag pans, buttons zoom/reset/download */

const BOARDS = {
  hmd: {
    src: 'deltavr-assets/schematics/hmd/deltavr hmd.svg',
    label: 'deltavr hmd.svg'
  },
  controller: {
    src: 'deltavr-assets/schematics/controller/deltavr_controller.svg',
    label: 'deltavr_controller.svg'
  }
};

let inited = false;
let current = null;
let zoom = 1;
let pos = { x: 0, y: 0 };
let svgEl = null;
let naturalW = 1000;
let naturalH = 700;
let framePending = false;

const $id = id => document.getElementById(id);

function clamp(z) { return Math.min(16, Math.max(0.1, z)); }

/* resize the svg's layout box to natural*zoom so it renders vector-sharp,
   pan is a plain translate (no scale anywhere) */
function apply() {
  const canvas = $id('sch-canvas');
  const label = $id('sch-zoom-label');
  if (!canvas || !svgEl) return;

  const w = naturalW * zoom;
  const h = naturalH * zoom;
  svgEl.style.width = w + 'px';
  svgEl.style.height = h + 'px';
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
}

/* batch wheel/button spam into one layout pass per frame */
function scheduleApply() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => { framePending = false; apply(); });
}

function centerFit() {
  const stage = $id('sch-stage');
  if (!stage || !svgEl) return;
  zoom = Math.min((stage.clientWidth - 24) / naturalW, 2);
  zoom = clamp(zoom);
  pos.x = (stage.clientWidth - naturalW * zoom) / 2;
  pos.y = 14;
  apply();
}

async function loadBoard(id) {
  if (!BOARDS[id] || current === id) return;
  current = id;

  const empty = $id('sch-empty');
  const holder = $id('sch-canvas');
  const label = $id('sch-file-label');
  if (label) label.textContent = BOARDS[id].label;
  if (empty) { empty.textContent = 'loading schematic…'; empty.style.display = 'flex'; }
  if (holder) holder.innerHTML = '';

  try {
    const res = await fetch(BOARDS[id].src);
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;

    // kicad plots carry a proper viewBox - read the real aspect from it
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (vb.length === 4) {
      naturalW = vb[2];
      naturalH = vb[3];
    } else {
      // ancient exports without viewBox: synthesize one from mm dims
      naturalW = parseFloat(svg.getAttribute('width')) || 1123;
      naturalH = parseFloat(svg.getAttribute('height')) || 794;
      svg.setAttribute('viewBox', `0 0 ${naturalW} ${naturalH}`);
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svgEl = svg;

    holder.appendChild(svg);

    if (empty) empty.style.display = 'none';
    centerFit();

    const dl = $id('sch-download');
    if (dl) dl.href = BOARDS[id].src;
  } catch {
    if (empty) { empty.textContent = 'failed to load schematic 😔'; empty.style.display = 'flex'; }
  }
}

function init() {
  const stage = $id('sch-stage');
  if (!stage) return;

  stage.addEventListener('wheel', e => {
    e.preventDefault(); // keep the page still while zooming
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const rect = stage.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const newZoom = clamp(zoom * factor);
    // keep the point under the cursor pinned while zooming
    pos.x = mx - ((mx - pos.x) * newZoom) / zoom;
    pos.y = my - ((my - pos.y) * newZoom) / zoom;
    zoom = newZoom;
    scheduleApply();
  }, { passive: false });

  let drag = null;
  stage.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    pos.x = drag.ox + (e.clientX - drag.x);
    pos.y = drag.oy + (e.clientY - drag.y);
    scheduleApply();
  });
  const endDrag = () => { drag = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  $id('sch-zin')?.addEventListener('click', () => { zoom = clamp(zoom * 1.25); scheduleApply(); });
  $id('sch-zout')?.addEventListener('click', () => { zoom = clamp(zoom * 0.8); scheduleApply(); });
  $id('sch-reset')?.addEventListener('click', centerFit);

  $id('sch-board-toggle')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-board]');
    if (!btn) return;
    document.querySelectorAll('#sch-board-toggle .opt').forEach(o => o.classList.toggle('active', o === btn));
    loadBoard(btn.dataset.board);
  });

  window.addEventListener('resize', () => { if (svgEl && current) centerFit(); });

  inited = true;
  loadBoard('hmd');
}

document.addEventListener('panel:shown', e => {
  if (e.detail.id === 'schematic' && !inited) init();
});
if (document.getElementById('panel-schematic')?.classList.contains('active') && !inited) init();
