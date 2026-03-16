/* ============================================================
   TracePal — main.js
   Canvas-based tracing practice for touch / Apple Pencil
   ============================================================ */

'use strict';

// ── Image definitions (SVG paths in a 300×300 logical coordinate space) ──────
const IMAGES = [
  {
    id: 'circle',
    label: 'Circle',
    pathD: 'M 150 30 A 120 120 0 1 1 150 270 A 120 120 0 1 1 150 30 Z'
  },
  {
    id: 'square',
    label: 'Square',
    pathD: 'M 60 60 L 240 60 L 240 240 L 60 240 L 60 60 Z'
  },
  {
    id: 'apple',
    label: 'Apple',
    // Round body with a small concave indent at the top centre.
    // Start at the indent point, work clockwise.
    pathD: 'M 150,82 C 130,55 90,52 72,72 C 48,85 38,120 44,158 ' +
           'C 52,205 96,252 150,255 ' +
           'C 204,252 248,205 256,158 ' +
           'C 262,120 252,85 228,72 ' +
           'C 210,52 170,55 150,82 Z'
  },
  {
    id: 'banana',
    label: 'Banana',
    // Elongated curved banana with tapered ends.
    // Start at bottom-left, curve up through the top, back down.
    pathD: 'M 60,220 ' +
           'C 50,180 45,140 55,100 ' +
           'C 70,50 110,25 160,20 ' +
           'C 210,18 250,35 270,70 ' +
           'C 280,95 275,125 260,155 ' +
           'C 245,185 220,210 190,225 ' +
           'C 160,238 130,242 100,238 ' +
           'C 80,235 65,228 60,220 Z'
  },
  {
    id: 'dog',
    label: 'Dog',
    // Cartoon dog-head outline: round face with floppy-ear bumps at the top.
    pathD: 'M 110,82 Q 78,38 58,68 Q 38,100 62,132 ' +
           'Q 50,162 66,188 Q 80,222 115,242 ' +
           'Q 132,252 150,254 Q 168,252 185,242 ' +
           'Q 220,222 234,188 Q 250,162 238,132 ' +
           'Q 262,100 242,68 Q 222,38 190,82 ' +
           'Q 168,56 150,60 Q 132,56 110,82 Z'
  },
  {
    id: 'zero',
    label: '0',
    pathD: 'M 150 25 C 195 25 220 65 220 125 C 220 185 195 225 150 225 C 105 225 80 185 80 125 C 80 65 105 25 150 25 Z'
  },
  {
    id: 'one',
    label: '1',
    // Print-style 1: small top flag, straight vertical stroke down
    pathD: 'M 135 45 L 165 45 L 150 55 L 150 225'
  },
  {
    id: 'two',
    label: '2',
    // Print-style 2: curved top, diagonal down, flat base
    pathD: 'M 100 60 C 130 40 170 40 195 65 C 210 85 210 110 195 135 C 175 165 140 190 110 215 L 190 215'
  },
  {
    id: 'three',
    label: '3',
    pathD: 'M 115 45 C 175 40 190 75 180 105 C 170 130 140 135 160 150 C 190 165 195 195 170 215 C 130 235 95 220 100 185'
  },
  {
    id: 'four',
    label: '4',
    // Print-style 4: diagonal down-left, horizontal right, then vertical down (continuous single stroke)
    pathD: 'M 165 40 L 115 75 L 115 215 L 185 215 L 185 85'
  },
  {
    id: 'five',
    label: '5',
    // Print-style 5: horizontal top, vertical down, curved belly closing right
    pathD: 'M 190 50 L 110 50 L 100 130 C 122 103 220 118 220 170 C 220 215 190 242 150 242 C 110 242 88 215 88 180'
  },
  {
    id: 'six',
    label: '6',
    // Print-style 6: curved stroke down from top-right, looping into closed circle at bottom (simplified single stroke)
    pathD: 'M 185 45 C 145 35 95 75 95 145 C 95 205 125 245 165 245 C 205 245 225 205 225 155 C 225 105 195 75 165 75 C 125 75 105 105 105 145'
  },
  {
    id: 'seven',
    label: '7',
    pathD: 'M 105 50 L 195 50 L 145 215'
  },
  {
    id: 'eight',
    label: '8',
    // Print-style 8: two equal stacked loops starting from the waist
    pathD: 'M 150 145 C 192 145 218 122 218 90 C 218 58 192 35 150 35 C 108 35 82 58 82 90 C 82 122 108 145 150 145 C 192 145 218 168 218 200 C 218 232 192 255 150 255 C 108 255 82 232 82 200 C 82 168 108 145 150 145'
  },
  {
    id: 'nine',
    label: '9',
    // Print-style 9: circle at top, tail curving down-right
    pathD: 'M 215 92 C 215 50 188 30 150 30 C 112 30 85 52 85 92 C 85 132 112 155 150 155 C 188 155 215 132 215 92 C 215 130 198 210 168 248'
  }
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

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioMuted = false;
let hasUserGesture = false;
let pendingSpeech = null; // buffered while waiting for first user gesture

// Chrome blocks speechSynthesis until a user gesture has occurred.
// We listen for the first interaction, then flush any buffered speech.
document.addEventListener('click',      unlockAudio, { once: true, capture: true });
document.addEventListener('touchstart', unlockAudio, { once: true, capture: true });

function unlockAudio() {
  hasUserGesture = true;
  if (pendingSpeech !== null) {
    const text = pendingSpeech;
    pendingSpeech = null;
    speak(text);
  }
}

function speak(text, options) {
  if (audioMuted) return;
  if (!('speechSynthesis' in window)) return;
  if (!hasUserGesture) {
    pendingSpeech = text; // will be spoken on first gesture
    return;
  }
  const rate = (options && options.rate) || 0.9;
  const pitch = (options && options.pitch) || 1.0;
  speechSynthesis.cancel(); // clear any stuck utterance
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
  const dotsContainer = document.getElementById('dot-indicators');
  IMAGES.forEach(function (img, i) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', function () { loadImage(i); });
    dotsContainer.appendChild(dot);
  });

  // Button handlers
  document.getElementById('prev-btn').addEventListener('click', function () {
    loadImage((currentIdx - 1 + IMAGES.length) % IMAGES.length);
  });
  document.getElementById('next-btn').addEventListener('click', function () {
    loadImage((currentIdx + 1) % IMAGES.length);
  });
  document.getElementById('reset-btn').addEventListener('click', resetTracing);
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

// ── Load an image by index ────────────────────────────────────────────────────
function loadImage(idx) {
  currentIdx = idx;
  const img  = IMAGES[idx];

  shapeLabel.textContent = img.label;
  speak(img.label);

  const result  = samplePath(img.pathD, NUM_SAMPLES);
  sampledPoints = result.points;

  resetTracing();
  updateDots();
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
  const img   = IMAGES[currentIdx];
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
  speak('Perfect! ' + IMAGES[currentIdx].label + '!');
  render();

  const overlay = document.createElement('div');
  overlay.className   = 'success-overlay';
  overlay.textContent = '\u2B50';  // ⭐
  canvasWrapper.appendChild(overlay);

  setTimeout(function () {
    if (isComplete) {
      loadImage((currentIdx + 1) % IMAGES.length);
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
function updateDots() {
  document.querySelectorAll('.dot').forEach(function (dot, i) {
    dot.classList.toggle('active', i === currentIdx);
  });
}
