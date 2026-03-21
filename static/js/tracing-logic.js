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
 * Find the nearest stroke and sample point across multiple strokes.
 * strokePoints: array of point arrays [[{x,y}], [{x,y}], ...]
 * Returns { strokeIdx, sampleIdx, dist }.
 */
function nearestStrokeSample(strokePoints, lx, ly) {
  var minDist = Infinity;
  var minStrokeIdx = 0;
  var minSampleIdx = 0;
  for (var s = 0; s < strokePoints.length; s++) {
    var result = nearestSample(strokePoints[s], lx, ly);
    if (result.dist < minDist) {
      minDist = result.dist;
      minStrokeIdx = s;
      minSampleIdx = result.idx;
    }
  }
  return { strokeIdx: minStrokeIdx, sampleIdx: minSampleIdx, dist: minDist };
}

/**
 * Calculate aggregate coverage across multiple stroke coverage maps.
 * strokeCoverageMaps: array of boolean arrays
 */
function getMultiStrokeCoverage(strokeCoverageMaps) {
  var totalCovered = 0;
  var totalPoints = 0;
  for (var s = 0; s < strokeCoverageMaps.length; s++) {
    var map = strokeCoverageMaps[s];
    for (var i = 0; i < map.length; i++) {
      totalPoints++;
      if (map[i]) totalCovered++;
    }
  }
  return totalPoints === 0 ? 0 : totalCovered / totalPoints;
}

/**
 * Update coverage for a multi-stroke shape based on a single logical point.
 * Finds the nearest stroke, updates that stroke's coverage map.
 * Returns { onTrack, strokeIdx, coverage, strokeCoverage, feedbackState }.
 */
function updateMultiStrokeCoverage(strokePoints, strokeCoverageMaps, lx, ly, tolerance, nearPath) {
  tolerance = tolerance != null ? tolerance : DEFAULTS.TOLERANCE;
  nearPath = nearPath != null ? nearPath : DEFAULTS.NEAR_PATH;

  var nearest = nearestStrokeSample(strokePoints, lx, ly);

  if (nearest.dist > nearPath) {
    return {
      onTrack: false,
      strokeIdx: nearest.strokeIdx,
      coverage: getMultiStrokeCoverage(strokeCoverageMaps),
      strokeCoverage: getCoverage(strokeCoverageMaps[nearest.strokeIdx]),
      feedbackState: 'none',
    };
  }

  var onTrack = nearest.dist <= tolerance;
  var pts = strokePoints[nearest.strokeIdx];
  var map = strokeCoverageMaps[nearest.strokeIdx];

  if (onTrack) {
    for (var i = Math.max(0, nearest.sampleIdx - 4); i <= Math.min(pts.length - 1, nearest.sampleIdx + 4); i++) {
      var dx = pts[i].x - lx;
      var dy = pts[i].y - ly;
      if (Math.sqrt(dx * dx + dy * dy) <= tolerance) {
        map[i] = true;
      }
    }
  }

  return {
    onTrack: onTrack,
    strokeIdx: nearest.strokeIdx,
    coverage: getMultiStrokeCoverage(strokeCoverageMaps),
    strokeCoverage: getCoverage(map),
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
    nearestStrokeSample,
    getMultiStrokeCoverage,
    updateMultiStrokeCoverage,
    fisherYatesShuffle,
    toLogical,
    toDisplay,
  };
}
