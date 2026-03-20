/* ============================================================
   TracePal — main.js
   Canvas-based tracing practice for touch / Apple Pencil
   ============================================================ */

'use strict';

// ── Image definitions (SVG files in a 300×300 logical coordinate space) ──────
const IMAGES = [
  { id: 'circle',  label: 'Circle', svgFile: '/static/assets/icons/circle.svg' },
  { id: 'square',  label: 'Square', svgFile: '/static/assets/icons/square.svg' },
  { id: 'apple',   label: 'Apple',  svgFile: '/static/assets/icons/apple.svg' },
  { id: 'banana',  label: 'Banana', svgFile: '/static/assets/icons/banana.svg' },
  { id: 'dog',     label: 'Dog',    svgFile: '/static/assets/icons/dog.svg' },
  { id: 'zero',    label: '0',      svgFile: '/static/assets/icons/zero.svg' },
  { id: 'one',     label: '1',      svgFile: '/static/assets/icons/one.svg' },
  { id: 'two',     label: '2',      svgFile: '/static/assets/icons/two.svg' },
  { id: 'three',   label: '3',      svgFile: '/static/assets/icons/three.svg' },
  { id: 'four',    label: '4',      svgFile: '/static/assets/icons/four.svg' },
  { id: 'five',    label: '5',      svgFile: '/static/assets/icons/five.svg' },
  { id: 'six',     label: '6',      svgFile: '/static/assets/icons/six.svg' },
  { id: 'seven',   label: '7',      svgFile: '/static/assets/icons/seven.svg' },
  { id: 'eight',   label: '8',      svgFile: '/static/assets/icons/eight.svg' },
  { id: 'nine',    label: '9',      svgFile: '/static/assets/icons/nine.svg' },
  { id: 'a_upper', label: 'A',      svgFile: '/static/assets/icons/a_upper.svg' },
  { id: 'a_lower', label: 'a',      svgFile: '/static/assets/icons/a_lower.svg' },
  { id: 'b_upper', label: 'B',      svgFile: '/static/assets/icons/b_upper.svg' },
  { id: 'b_lower', label: 'b',      svgFile: '/static/assets/icons/b_lower.svg' },
  { id: 'c_upper', label: 'C',      svgFile: '/static/assets/icons/c_upper.svg' },
  { id: 'c_lower', label: 'c',      svgFile: '/static/assets/icons/c_lower.svg' },
  { id: 'd_upper', label: 'D',      svgFile: '/static/assets/icons/d_upper.svg' },
  { id: 'd_lower', label: 'd',      svgFile: '/static/assets/icons/d_lower.svg' },
  { id: 'e_upper', label: 'E',      svgFile: '/static/assets/icons/e_upper.svg' },
  { id: 'e_lower', label: 'e',      svgFile: '/static/assets/icons/e_lower.svg' }
];

// ── Constants ──────────────────────────────────────────────────────────────────
const LOGICAL_SIZE      = 300;   // SVG coordinate space (px)
const NUM_SAMPLES       = 250;   // points sampled along the path
const TOLERANCE         = 22;    // logical px — max distance to be "on track"
const NEAR_PATH         = 50;    // logical px — threshold to start giving feedback
const COMPLETION_RATIO  = 0.95;  // fraction of path that must be covered (95%)
const GUIDE_LINE_WIDTH  = 20;    // logical px — guide stroke thickness
const USER_LINE_WIDTH   = 8;     // logical px — user stroke thickness

// ── State ─────────────────────────────────────────────────────────────────────
let currentIdx    = 0;
let sampledPoints = [];   // [{x, y}] in logical coords
let coverageMap   = [];   // parallel bool array — true = this sample was visited
let userPath      = [];   // [{x, y, onTrack}] in logical coords
let isTracing     = false;
let isComplete    = false;
let lastLogical   = null;
let mouseIsDown   = false;
let completionPath = null; // [{x, y, onTrack}] — drawn after auto-complete
let isShuffled     = false;
let imageOrder     = [];   // index mapping: imageOrder[i] = original IMAGES index

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioMuted = false;

function speak(text, options) {
  if (audioMuted) return;
  if (!('speechSynthesis' in window)) return;
  const rate = (options && options.rate) || 0.9;
  const pitch = (options && options.pitch) || 1.0;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1.0;
  speechSynthesis.speak(utterance);
}

// ── DOM refs (filled in after ready) ─────────────────────────────────────────
let canvasEl, ctx, canvasWrapper;
let feedbackMsg, progressBar, shapeLabel, startIndicatorEl;
let displaySize = 0;   // CSS pixels — updated on setup/resize

// ── Shuffle helpers ──────────────────────────────────────────────────────────
function initOrder() {
  imageOrder = IMAGES.map(function (_, i) { return i; });
}

function shuffleOrder() {
  // Fisher-Yates shuffle
  for (let i = imageOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = imageOrder[i];
    imageOrder[i] = imageOrder[j];
    imageOrder[j] = tmp;
  }
}

initOrder(); // default: sequential

// ── jQuery ready ──────────────────────────────────────────────────────────────
$(document).ready(function () {
  canvasEl         = document.getElementById('trace-canvas');
  ctx              = canvasEl.getContext('2d');
  canvasWrapper    = document.getElementById('canvas-wrapper');
  feedbackMsg      = document.getElementById('feedback-msg');
  progressBar      = document.getElementById('progress-bar');
  shapeLabel       = document.getElementById('shape-label');
  startIndicatorEl = document.getElementById('start-indicator');

  // Build dot indicators
  buildDots();

  // Button handlers
  document.getElementById('prev-btn').addEventListener('click', function () {
    loadImage((currentIdx - 1 + imageOrder.length) % imageOrder.length);
  });
  document.getElementById('next-btn').addEventListener('click', function () {
    loadImage((currentIdx + 1) % imageOrder.length);
  });
  document.getElementById('reset-btn').addEventListener('click', resetTracing);
  document.getElementById('shuffle-btn').addEventListener('click', toggleShuffle);
  document.getElementById('mute-btn').addEventListener('click', function () {
    audioMuted = !audioMuted;
    this.textContent = audioMuted ? '\uD83D\uDD07 Unmute' : '\uD83D\uDD0A Mute';
  });

  // Touch / mouse events on canvas
  setupInputEvents();

  // Initial load (defer one frame so layout is computed)
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      setupCanvas();
      loadImage(0);
    });
  });

  // Resize handler
  window.addEventListener('resize', function () {
    setupCanvas();
    render();
    updateStartIndicator();
  });
});

// ── Canvas setup (handles Retina / high-DPI) ──────────────────────────────────
function setupCanvas() {
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvasWrapper.getBoundingClientRect();
  displaySize = rect.width;                  // wrapper is square

  canvasEl.width  = Math.round(displaySize * dpr);
  canvasEl.height = Math.round(displaySize * dpr);

  // Scale all drawing by dpr so we work in CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ── Path sampling using the SVG DOM ──────────────────────────────────────────
function samplePath(pathD, n) {
  const NS    = 'http://www.w3.org/2000/svg';
  const svg   = document.createElementNS(NS, 'svg');
  svg.setAttribute('width',  '300');
  svg.setAttribute('height', '300');
  svg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;';
  document.body.appendChild(svg);

  const pathEl = document.createElementNS(NS, 'path');
  pathEl.setAttribute('d', pathD);
  svg.appendChild(pathEl);

  const len    = pathEl.getTotalLength();
  const points = [];
  for (let i = 0; i <= n; i++) {
    const pt = pathEl.getPointAtLength((i / n) * len);
    points.push({ x: pt.x, y: pt.y });
  }

  document.body.removeChild(svg);
  return { points: points, length: len };
}

// ── Load SVG path data from external file ────────────────────────────────────
function loadSvgPathData(svgFileUrl, callback) {
  fetch(svgFileUrl)
    .then(response => response.text())
    .then(svgText => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const pathEl = svgDoc.querySelector('path');
      if (pathEl) {
        callback(pathEl.getAttribute('d'));
      } else {
        console.error('No path element found in SVG:', svgFileUrl);
        callback(null);
      }
    })
    .catch(err => {
      console.error('Failed to load SVG:', svgFileUrl, err);
      callback(null);
    });
}

// ── Load an image by index ────────────────────────────────────────────────────
function loadImage(idx) {
  currentIdx = idx;
  const img  = IMAGES[imageOrder[idx]];

  shapeLabel.textContent = img.label;
  speak(img.label);

  // Load SVG path data from external file
  loadSvgPathData(img.svgFile, function(pathD) {
    if (pathD) {
      img.pathD = pathD;  // Store path data on image object for render()
      const result  = samplePath(pathD, NUM_SAMPLES);
      sampledPoints = result.points;
      resetTracing();
      updateDots();
    } else {
      console.error('Failed to load path data for:', img.label);
    }
  });
}

// ── Reset tracing state ───────────────────────────────────────────────────────
function resetTracing() {
  isComplete     = false;
  isTracing      = false;
  mouseIsDown    = false;
  userPath       = [];
  coverageMap    = new Array(sampledPoints.length).fill(false);
  lastLogical    = null;
  completionPath = null;

  setFeedback('none', '');
  progressBar.style.width = '0%';
  progressBar.setAttribute('aria-valuenow', '0');

  canvasWrapper.className = 'canvas-wrapper';

  // Remove any lingering success overlay
  const overlay = canvasWrapper.querySelector('.success-overlay');
  if (overlay) overlay.remove();

  setupCanvas();
  render();
  updateStartIndicator();

  // Restore start indicator visibility
  startIndicatorEl.style.opacity = '1';
}

// ── Coordinate helpers ────────────────────────────────────────────────────────
function toLogical(dx, dy) {
  const scale = LOGICAL_SIZE / displaySize;
  return { x: dx * scale, y: dy * scale };
}

function toDisplay(lx, ly) {
  const scale = displaySize / LOGICAL_SIZE;
  return { x: lx * scale, y: ly * scale };
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function render() {
  if (!ctx || displaySize === 0) return;
  ctx.clearRect(0, 0, displaySize, displaySize);
  drawGuide();
  if (completionPath) {
    drawPath(completionPath);
  } else {
    drawUserPath();
  }
}

function drawGuide() {
  const img   = IMAGES[imageOrder[currentIdx]];
  const scale = displaySize / LOGICAL_SIZE;

  ctx.save();
  ctx.scale(scale, scale);

  // Light fill so the shape interior is visible
  const guide = new Path2D(img.pathD);
  ctx.fillStyle = 'rgba(200,200,200,0.12)';
  ctx.fill(guide);

  // Thick light-gray stroke as the tracing guide
  ctx.strokeStyle   = '#c8c8c8';
  ctx.lineWidth     = GUIDE_LINE_WIDTH;
  ctx.lineJoin      = 'round';
  ctx.lineCap       = 'round';
  ctx.stroke(guide);

  ctx.restore();
}

function drawUserPath() {
  drawPath(userPath);
}

function drawPath(path) {
  if (path.length < 2) return;

  const scale = displaySize / LOGICAL_SIZE;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineWidth = USER_LINE_WIDTH;
  ctx.lineJoin  = 'round';
  ctx.lineCap   = 'round';

  // Draw each segment with its own colour
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = curr.onTrack ? '#007bff' : '#ff8c00';
    ctx.stroke();
  }

  ctx.restore();
}

// ── Start-indicator positioning ───────────────────────────────────────────────
function updateStartIndicator() {
  if (!sampledPoints.length || displaySize === 0) return;

  const start  = sampledPoints[0];
  const dPos   = toDisplay(start.x, start.y);

  startIndicatorEl.style.left = dPos.x + 'px';
  startIndicatorEl.style.top  = dPos.y + 'px';
}

// ── Nearest sample point ──────────────────────────────────────────────────────
function nearestSample(lx, ly) {
  let minDist = Infinity;
  let minIdx  = 0;
  for (let i = 0; i < sampledPoints.length; i++) {
    const dx = sampledPoints[i].x - lx;
    const dy = sampledPoints[i].y - ly;
    const d  = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return { idx: minIdx, dist: Math.sqrt(minDist) };
}

// ── Coverage percentage ───────────────────────────────────────────────────────
function getCoverage() {
  let count = 0;
  for (let i = 0; i < coverageMap.length; i++) {
    if (coverageMap[i]) count++;
  }
  return count / coverageMap.length;
}

// ── Touch / mouse event setup ─────────────────────────────────────────────────
function setupInputEvents() {
  // Touch (iOS Safari / Apple Pencil)
  canvasEl.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (isComplete) return;
    const p = getEventPos(e);
    startTrace(p.x, p.y);
  }, { passive: false });

  canvasEl.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (!isTracing || isComplete) return;
    const p = getEventPos(e);
    continueTrace(p.x, p.y);
  }, { passive: false });

  canvasEl.addEventListener('touchend', function (e) {
    e.preventDefault();
    endTrace();
  }, { passive: false });

  canvasEl.addEventListener('touchcancel', function (e) {
    e.preventDefault();
    endTrace();
  }, { passive: false });

  // Mouse (desktop / browser testing)
  canvasEl.addEventListener('mousedown', function (e) {
    mouseIsDown = true;
    if (isComplete) return;
    const p = getEventPos(e);
    startTrace(p.x, p.y);
  });

  canvasEl.addEventListener('mousemove', function (e) {
    if (!mouseIsDown || !isTracing || isComplete) return;
    const p = getEventPos(e);
    continueTrace(p.x, p.y);
  });

  canvasEl.addEventListener('mouseup',    function () { mouseIsDown = false; endTrace(); });
  canvasEl.addEventListener('mouseleave', function () { if (mouseIsDown) { mouseIsDown = false; endTrace(); } });
}

function getEventPos(e) {
  const rect  = canvasEl.getBoundingClientRect();
  const src   = e.touches ? e.touches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

// ── Trace lifecycle ───────────────────────────────────────────────────────────
function startTrace(dx, dy) {
  isTracing = true;
  // Hide the start indicator once the user begins
  startIndicatorEl.style.opacity = '0';

  const lp = toLogical(dx, dy);
  lastLogical = lp;
  processPoint(lp.x, lp.y);
}

function continueTrace(dx, dy) {
  const lp = toLogical(dx, dy);

  if (lastLogical) {
    // Interpolate between last and current for smooth coverage detection
    const STEPS = 6;
    for (let i = 1; i <= STEPS; i++) {
      const t  = i / STEPS;
      const ix = lastLogical.x + (lp.x - lastLogical.x) * t;
      const iy = lastLogical.y + (lp.y - lastLogical.y) * t;
      processPoint(ix, iy);
      if (isComplete) return;
    }
  }

  lastLogical = lp;
}

function endTrace() {
  isTracing   = false;
  lastLogical = null;

  // If the user barely touched, clear the feedback
  if (!isComplete && getCoverage() < 0.03) {
    setFeedback('none', '');
  }
}

// ── Process a single logical point ───────────────────────────────────────────
function processPoint(lx, ly) {
  const { idx, dist } = nearestSample(lx, ly);

  // Only give feedback when close to the path
  if (dist > NEAR_PATH) {
    userPath.push({ x: lx, y: ly, onTrack: false });
    render();
    return;
  }

  const onTrack = dist <= TOLERANCE;
  userPath.push({ x: lx, y: ly, onTrack: onTrack });

  // Mark nearby sample points as covered when on track
  if (onTrack) {
    for (let i = Math.max(0, idx - 4); i <= Math.min(sampledPoints.length - 1, idx + 4); i++) {
      const dx = sampledPoints[i].x - lx;
      const dy = sampledPoints[i].y - ly;
      if (Math.sqrt(dx * dx + dy * dy) <= TOLERANCE) {
        coverageMap[i] = true;
      }
    }
    setFeedback('on-track', 'Great tracing! Keep going!');
  } else {
    setFeedback('off-track', 'Get back on the line!');
  }

  // Update progress bar
  const coverage = getCoverage();
  const pct      = Math.min(100, Math.round(coverage * 100));
  progressBar.style.width = pct + '%';
  progressBar.setAttribute('aria-valuenow', pct);

  // Check for completion
  if (coverage >= COMPLETION_RATIO) {
    animateCompletion();
    return;
  }

  render();
}

// ── Auto-complete animation ───────────────────────────────────────────────────
function animateCompletion() {
  if (isComplete) return;
  isComplete = true;
  isTracing  = false;

  setFeedback('on-track', 'Almost there!');

  // Collect uncovered point indices
  const remainingIndices = [];
  for (let i = 0; i < sampledPoints.length; i++) {
    if (!coverageMap[i]) remainingIndices.push(i);
  }

  let idx = 0;
  const interval = setInterval(function () {
    if (idx >= remainingIndices.length) {
      clearInterval(interval);
      progressBar.style.width = '100%';
      progressBar.setAttribute('aria-valuenow', '100');
      // Draw full green path to show completion
      completionPath = sampledPoints.map(function(pt) {
        return { x: pt.x, y: pt.y, onTrack: true };
      });
      showCompletionSuccess();
      return;
    }

    const ptIdx = remainingIndices[idx];
    const pt    = sampledPoints[ptIdx];
    coverageMap[ptIdx] = true;
    userPath.push({ x: pt.x, y: pt.y, onTrack: true });

    const pct = Math.min(100, Math.round(getCoverage() * 100));
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', pct);

    render();
    idx++;
  }, 20);
}

function showCompletionSuccess() {
  setFeedback('complete', 'Perfect! \u2705');  // ✅
  speak('Perfect! ' + IMAGES[imageOrder[currentIdx]].label + '!');
  render();

  const overlay = document.createElement('div');
  overlay.className   = 'success-overlay';
  overlay.textContent = '\u2B50';  // ⭐
  canvasWrapper.appendChild(overlay);

  setTimeout(function () {
    if (isComplete) {
      loadImage((currentIdx + 1) % imageOrder.length);
    }
  }, 2000);
}

// ── Feedback state helper ─────────────────────────────────────────────────────
function setFeedback(state, msg) {
  feedbackMsg.textContent = msg;
  feedbackMsg.className   = 'feedback-msg' + (state !== 'none' ? ' ' + state : '');

  canvasWrapper.classList.remove('on-track', 'off-track', 'complete');
  if (state === 'on-track')  canvasWrapper.classList.add('on-track');
  if (state === 'off-track') canvasWrapper.classList.add('off-track');
  if (state === 'complete')  canvasWrapper.classList.add('complete');
}

// ── Dot indicators ────────────────────────────────────────────────────────────
function buildDots() {
  const dotsContainer = document.getElementById('dot-indicators');
  dotsContainer.innerHTML = '';
  imageOrder.forEach(function (_, i) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', function () { loadImage(i); });
    dotsContainer.appendChild(dot);
  });
}

function updateDots() {
  document.querySelectorAll('.dot').forEach(function (dot, i) {
    dot.classList.toggle('active', i === currentIdx);
  });
}

// ── Shuffle ──────────────────────────────────────────────────────────────────
function toggleShuffle() {
  const btn = document.getElementById('shuffle-btn');
  if (isShuffled) {
    // Unshuffle: restore sequential order
    isShuffled = false;
    initOrder();
    btn.classList.remove('btn-info');
    btn.classList.add('btn-outline-info');
  } else {
    // Shuffle
    isShuffled = true;
    shuffleOrder();
    btn.classList.remove('btn-outline-info');
    btn.classList.add('btn-info');
  }
  buildDots();
  loadImage(0);
}
