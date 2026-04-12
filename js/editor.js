/* ═══════════════════════════════════════
   editor.js — 캔버스, 분할, 갤러리 로직
   ═══════════════════════════════════════ */

/* ── DOM 참조 ── */
const cv = document.getElementById('mainCanvas');
const ctx = cv.getContext('2d');
const colsIn = document.getElementById('cols');
const rowsIn = document.getElementById('rows');
const overlay = document.getElementById('overlay');
const statusBar = document.getElementById('statusBar');

/* ── 전역 변수 ── */
let origImg = null;
let scale = 1, offX = 0, offY = 0;
let linesX = [], linesY = [];
const SNAP = 22;
let tiles = [], savedSet = new Set();
let gridCols = 4, gridRows = 5;
let dragLine = null;
let resizeTimer;

/* ══════════════════════════════════════
   화면 전환
   ══════════════════════════════════════ */
function goScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-editor' && origImg) {
    setTimeout(() => { fitCanvas(); redraw(); }, 50);
  }
}

/* ══════════════════════════════════════
   프리셋 & 열/행 조정
   ══════════════════════════════════════ */
function applyPreset(btn) {
  document.querySelectorAll('.t-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  colsIn.value = btn.dataset.c;
  rowsIn.value = btn.dataset.r;
  gridCols = +btn.dataset.c;
  gridRows = +btn.dataset.r;
  if (origImg) { resetLines(); redraw(); }
}

function adjustVal(id, d) {
  const inp = document.getElementById(id);
  let v = Math.min(20, Math.max(1, (+inp.value || 1) + d));
  inp.value = v;
  if (id === 'cols') gridCols = v; else gridRows = v;
  syncPreset();
  if (origImg) { resetLines(); redraw(); }
}

function syncPreset() {
  document.querySelectorAll('.t-preset').forEach(b => {
    b.classList.toggle('active', +b.dataset.c === gridCols && +b.dataset.r === gridRows);
  });
}

colsIn.addEventListener('change', () => {
  gridCols = Math.min(20, Math.max(1, +colsIn.value || 1));
  colsIn.value = gridCols;
  syncPreset();
  if (origImg) { resetLines(); redraw(); }
});

rowsIn.addEventListener('change', () => {
  gridRows = Math.min(20, Math.max(1, +rowsIn.value || 1));
  rowsIn.value = gridRows;
  syncPreset();
  if (origImg) { resetLines(); redraw(); }
});

/* ══════════════════════════════════════
   이미지 로드
   ══════════════════════════════════════ */
function openImage() {
  document.getElementById('fileInput').click();
}

function loadImage(e) {
  const f = e.target.files[0];
  if (f) readFile(f);
}

function readFile(f) {
  const r = new FileReader();
  r.onload = ev => {
    const img = new Image();
    img.onload = () => {
      origImg = img;
      overlay.style.display = 'none';
      fitCanvas();
      resetLines();
      redraw();
      statusBar.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
}

/* ══════════════════════════════════════
   캔버스 크기 맞춤
   ══════════════════════════════════════ */
function fitCanvas() {
  if (!origImg) return;
  const area = document.getElementById('canvasArea');
  const W = area.clientWidth, H = area.clientHeight;
  scale = Math.min(W / origImg.naturalWidth, H / origImg.naturalHeight, .95);
  const cw = Math.round(origImg.naturalWidth * scale);
  const ch = Math.round(origImg.naturalHeight * scale);
  cv.width = cw;
  cv.height = ch;
  offX = (W - cw) / 2;
  offY = (H - ch) / 2;
  cv.style.marginLeft = offX + 'px';
  cv.style.marginTop = offY + 'px';
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (origImg) { fitCanvas(); redraw(); }
  }, 150);
});

/* ══════════════════════════════════════
   그리드 라인
   ══════════════════════════════════════ */
function resetLines() {
  linesX = [];
  linesY = [];
  for (let i = 1; i < gridCols; i++)
    linesX.push(Math.round(origImg.naturalWidth * i / gridCols * scale));
  for (let i = 1; i < gridRows; i++)
    linesY.push(Math.round(origImg.naturalHeight * i / gridRows * scale));
}

/* ══════════════════════════════════════
   캔버스 그리기
   ══════════════════════════════════════ */
function redraw() {
  if (!origImg) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(origImg, 0, 0, cv.width, cv.height);

  // 그리드 선
  ctx.strokeStyle = 'rgba(255,80,80,.8)';
  ctx.lineWidth = 2;
  linesX.forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); ctx.stroke(); });
  linesY.forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke(); });

  // 셀 번호
  const xs = [0, ...linesX, cv.width];
  const ys = [0, ...linesY, cv.height];
  let n = 1;
  ctx.font = `bold ${Math.max(10, Math.min(18, cv.width / gridCols / 3.5))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < ys.length - 1; r++) {
    for (let c = 0; c < xs.length - 1; c++) {
      const cx = (xs[c] + xs[c + 1]) / 2;
      const cy = (ys[r] + ys[r + 1]) / 2;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(cx - 12, cy - 9, 24, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(n++, cx, cy);
    }
  }
}

/* ══════════════════════════════════════
   라인 드래그
   ══════════════════════════════════════ */
function findLine(px, py) {
  for (let i = 0; i < linesX.length; i++)
    if (Math.abs(px - linesX[i]) < SNAP) return { axis: 'x', idx: i };
  for (let i = 0; i < linesY.length; i++)
    if (Math.abs(py - linesY[i]) < SNAP) return { axis: 'y', idx: i };
  return null;
}

function evPos(e) {
  const r = cv.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}

function moveLine(e) {
  if (!dragLine) return;
  const p = evPos(e);
  if (dragLine.axis === 'x')
    linesX[dragLine.idx] = Math.max(4, Math.min(cv.width - 4, p.x));
  else
    linesY[dragLine.idx] = Math.max(4, Math.min(cv.height - 4, p.y));
  redraw();
}

cv.addEventListener('mousedown', e => { dragLine = findLine(...Object.values(evPos(e))); });
cv.addEventListener('touchstart', e => { dragLine = findLine(...Object.values(evPos(e))); }, { passive: true });
cv.addEventListener('mousemove', moveLine);
cv.addEventListener('touchmove', e => { e.preventDefault(); moveLine(e); }, { passive: false });
window.addEventListener('mouseup', () => { dragLine = null; });
window.addEventListener('touchend', () => { dragLine = null; });

/* ══════════════════════════════════════
   이미지 분할
   ══════════════════════════════════════ */
function splitImage() {
  if (!origImg) return;
  tiles = [];
  savedSet.clear();

  const rxs = [0, ...linesX.map(v => Math.round(v / cv.width * origImg.naturalWidth)), origImg.naturalWidth];
  const rys = [0, ...linesY.map(v => Math.round(v / cv.height * origImg.naturalHeight)), origImg.naturalHeight];

  for (let r = 0; r < rys.length - 1; r++) {
    for (let c = 0; c < rxs.length - 1; c++) {
      const sx = rxs[c], sy = rys[r];
      const sw = rxs[c + 1] - rxs[c];
      const sh = rys[r + 1] - rys[r];
      const tc = document.createElement('canvas');
      tc.width = sw;
      tc.height = sh;
      tc.getContext('2d').drawImage(origImg, sx, sy, sw, sh, 0, 0, sw, sh);
      tiles.push(tc.toDataURL('image/png'));
    }
  }

  goScreen('screen-gallery');
  buildGallery();
}

/* ══════════════════════════════════════
   갤러리
   ══════════════════════════════════════ */
function buildGallery() {
  const grid = document.getElementById('galGrid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${gridCols},1fr)`;
  tiles.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.loading = 'lazy';
    img.onclick = () => downloadOne(i);
    grid.appendChild(img);
  });
  updateSaveCount();
}

function updateSaveCount() {
  document.getElementById('saveCount').textContent = `${savedSet.size} / ${tiles.length} 저장됨`;
  document.querySelectorAll('#galGrid img').forEach((img, i) => {
    img.classList.toggle('saved', savedSet.has(i));
  });
}

/* ══════════════════════════════════════
   다운로드
   ══════════════════════════════════════ */
function downloadOne(i) {
  const blob = dataURLtoBlob(tiles[i]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `emoticon_${String(i + 1).padStart(2, '0')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  savedSet.add(i);
  updateSaveCount();
}

function downloadAllSeq() {
  const prog = document.getElementById('dlProgress');
  const txt = document.getElementById('dlText');
  const bar = document.getElementById('dlBar');
  prog.classList.add('show');
  let idx = 0;

  function next() {
    if (idx >= tiles.length) {
      prog.classList.remove('show');
      updateSaveCount();
      return;
    }
    txt.textContent = `저장 중... ${idx + 1} / ${tiles.length}`;
    bar.style.width = ((idx + 1) / tiles.length * 100) + '%';
    downloadOne(idx);
    idx++;
    setTimeout(next, 800);
  }
  next();
}

function downloadZip() {
  const prog = document.getElementById('dlProgress');
  const txt = document.getElementById('dlText');
  const bar = document.getElementById('dlBar');
  prog.classList.add('show');
  txt.textContent = 'ZIP 준비 중...';
  bar.style.width = '0%';

  loadJSZip().then(() => {
    const zip = new JSZip();
    tiles.forEach((d, i) => {
      const b64 = d.split(',')[1];
      zip.file(`emoticon_${String(i + 1).padStart(2, '0')}.png`, b64, { base64: true });
    });

    zip.generateAsync({ type: 'blob' }, meta => {
      bar.style.width = meta.percent.toFixed(0) + '%';
      txt.textContent = `압축 중... ${meta.percent.toFixed(0)}%`;
    }).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'emoticons.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      tiles.forEach((_, i) => savedSet.add(i));
      updateSaveCount();
      prog.classList.remove('show');
    });
  });
}
