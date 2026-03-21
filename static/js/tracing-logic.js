/* ============================================================
   TracePal — tracing-logic.js
   Pure computation functions extracted from main.js for testability.
   No DOM, no canvas, no side effects.
   ============================================================ */

'use strict';

const DEFAULTS = {
  LOGICAL_SIZE: 300,
  NUM_SAMPLES: 250,
  TOLERANCE: 22,
  NEAR_PATH: 50,
  COMPLETION_RATIO: 0.95,
};

/**
 * Find the nearest sampled point to a given logical coordinate.
 * Returns { idx, dist }.
 */
function nearestSample(sampledPoints, lx, ly) {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < sampledPoints.length; i++) {
    const dx = sampledPoints[i].x - lx;
    const dy = sampledPoints[i].y - ly;
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return { idx: minIdx, dist: Math.sqrt(minDist) };
}

/**
 * Calculate the fraction of coverageMap entries that are true.
 */
function getCoverage(coverageMap) {
  let count = 0;
  for (let i = 0; i < coverageMap.length; i++) {
    if (coverageMap[i]) count++;
  }
  return count / coverageMap.length;
}

/**
 * Update the coverage map based on a single logical point.
 * Returns { onTrack, coverage, feedbackState } without side effects.
 * Mutates coverageMap in place (same semantics as main.js).
 */
function updateCoverage(sampledPoints, coverageMap, lx, ly, tolerance, nearPath) {
  tolerance = tolerance != null ? tolerance : DEFAULTS.TOLERANCE;
  nearPath = nearPath != null ? nearPath : DEFAULTS.NEAR_PATH;

  const { idx, dist } = nearestSample(sampledPoints, lx, ly);

  if (dist > nearPath) {
    return { onTrack: false, coverage: getCoverage(coverageMap), feedbackState: 'none' };
  }

  const onTrack = dist <= tolerance;

  if (onTrack) {
    for (let i = Math.max(0, idx - 4); i <= Math.min(sampledPoints.length - 1, idx + 4); i++) {
      const dx = sampledPoints[i].x - lx;
      const dy = sampledPoints[i].y - ly;
      if (Math.sqrt(dx * dx + dy * dy) <= tolerance) {
        coverageMap[i] = true;
      }
    }
  }

  return {
    onTrack: onTrack,
    coverage: getCoverage(coverageMap),
    feedbackState: onTrack ? 'on-track' : 'off-track',
  };
}

/**
 * Fisher-Yates shuffle of an array (in place). Returns the array.
 * Uses an optional random function for deterministic testing.
 */
function fisherYatesShuffle(arr, randomFn) {
  randomFn = randomFn || Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Convert display coordinates to logical coordinates.
 */
function toLogical(dx, dy, displaySize, logicalSize) {
  logicalSize = logicalSize || DEFAULTS.LOGICAL_SIZE;
  const scale = logicalSize / displaySize;
  return { x: dx * scale, y: dy * scale };
}

/**
 * Convert logical coordinates to display coordinates.
 */
function toDisplay(lx, ly, displaySize, logicalSize) {
  logicalSize = logicalSize || DEFAULTS.LOGICAL_SIZE;
  const scale = displaySize / logicalSize;
  return { x: lx * scale, y: ly * scale };
}

// Export for Node.js / Jest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULTS,
    nearestSample,
    getCoverage,
    updateCoverage,
    fisherYatesShuffle,
    toLogical,
    toDisplay,
  };
}
