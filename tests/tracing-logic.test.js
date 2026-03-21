'use strict';

const {
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
} = require('../static/js/tracing-logic');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate evenly-spaced points along a circle (deterministic). */
function makeCirclePoints(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

/** Generate points along a horizontal line segment. */
function makeLinePoints(x0, y0, x1, y1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
  }
  return pts;
}

function freshCoverageMap(n) {
  return new Array(n).fill(false);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Completion Detection (95% threshold)
// ─────────────────────────────────────────────────────────────────────────────
describe('Completion detection at 95% threshold', () => {
  const N = 100;
  const points = makeLinePoints(0, 150, 300, 150, N); // 101 points

  test('coverage below 95% does not trigger completion', () => {
    const map = freshCoverageMap(points.length);
    // Mark 90 of 101 points ≈ 89%
    for (let i = 0; i < 90; i++) map[i] = true;
    const cov = getCoverage(map);
    expect(cov).toBeLessThan(DEFAULTS.COMPLETION_RATIO);
  });

  test('coverage at exactly 95% triggers completion', () => {
    const map = freshCoverageMap(points.length);
    // Mark 96 of 101 = 95.05%
    for (let i = 0; i < 96; i++) map[i] = true;
    const cov = getCoverage(map);
    expect(cov).toBeGreaterThanOrEqual(DEFAULTS.COMPLETION_RATIO);
  });

  test('coverage at 100% is above threshold', () => {
    const map = new Array(points.length).fill(true);
    expect(getCoverage(map)).toBe(1.0);
  });

  test('empty coverage map returns 0', () => {
    const map = freshCoverageMap(points.length);
    expect(getCoverage(map)).toBe(0);
  });

  test('single point covered returns correct fraction', () => {
    const map = freshCoverageMap(points.length);
    map[0] = true;
    expect(getCoverage(map)).toBeCloseTo(1 / points.length, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Coverage Map Calculation
// ─────────────────────────────────────────────────────────────────────────────
describe('Coverage map calculation', () => {
  const N = 50;
  const points = makeLinePoints(0, 150, 300, 150, N); // horizontal line, 51 pts

  test('point on the path marks nearby samples as covered', () => {
    const map = freshCoverageMap(points.length);
    // Trace exactly on sample point index 25 (midpoint)
    const px = points[25].x;
    const py = points[25].y;
    const result = updateCoverage(points, map, px, py);

    expect(result.onTrack).toBe(true);
    expect(result.feedbackState).toBe('on-track');
    // At least the target point should be covered
    expect(map[25]).toBe(true);
  });

  test('point within tolerance marks as on-track', () => {
    const map = freshCoverageMap(points.length);
    // Slightly off the line (within 22px tolerance)
    const result = updateCoverage(points, map, points[10].x, points[10].y + 15);
    expect(result.onTrack).toBe(true);
  });

  test('point beyond tolerance but within NEAR_PATH marks as off-track', () => {
    const map = freshCoverageMap(points.length);
    // 30px off — beyond tolerance (22) but within NEAR_PATH (50)
    const result = updateCoverage(points, map, points[10].x, points[10].y + 30);
    expect(result.onTrack).toBe(false);
    expect(result.feedbackState).toBe('off-track');
    // Coverage should not increase
    expect(result.coverage).toBe(0);
  });

  test('point far from path gives no feedback', () => {
    const map = freshCoverageMap(points.length);
    // Way off — beyond NEAR_PATH
    const result = updateCoverage(points, map, points[10].x, points[10].y + 100);
    expect(result.onTrack).toBe(false);
    expect(result.feedbackState).toBe('none');
  });

  test('covering all points yields 100%', () => {
    const map = freshCoverageMap(points.length);
    for (const pt of points) {
      updateCoverage(points, map, pt.x, pt.y);
    }
    expect(getCoverage(map)).toBe(1.0);
  });

  test('coverage never decreases as more points are traced', () => {
    const map = freshCoverageMap(points.length);
    let prevCoverage = 0;
    for (let i = 0; i < points.length; i += 3) {
      updateCoverage(points, map, points[i].x, points[i].y);
      const cov = getCoverage(map);
      expect(cov).toBeGreaterThanOrEqual(prevCoverage);
      prevCoverage = cov;
    }
  });

  test('nearby samples within window are also marked', () => {
    const map = freshCoverageMap(points.length);
    // Points are 6px apart (300/50). Tolerance is 22px, so ±4 index window
    // should cover neighbors that are within 22px.
    updateCoverage(points, map, points[25].x, points[25].y);
    // Check that some neighbors are also marked
    const markedCount = map.filter(Boolean).length;
    expect(markedCount).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Shape Path Recognition (nearestSample + tolerance)
// ─────────────────────────────────────────────────────────────────────────────
describe('Shape path recognition', () => {
  test('nearestSample finds exact point', () => {
    const points = [{ x: 10, y: 20 }, { x: 50, y: 60 }, { x: 100, y: 100 }];
    const result = nearestSample(points, 50, 60);
    expect(result.idx).toBe(1);
    expect(result.dist).toBe(0);
  });

  test('nearestSample returns closest when between points', () => {
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];
    const result = nearestSample(points, 90, 0);
    expect(result.idx).toBe(1); // closest to (100,0)
    expect(result.dist).toBe(10);
  });

  test('nearestSample with single point', () => {
    const result = nearestSample([{ x: 50, y: 50 }], 0, 0);
    expect(result.idx).toBe(0);
    expect(result.dist).toBeCloseTo(Math.sqrt(5000), 5);
  });

  test('point on circle path is recognized as on-track', () => {
    const points = makeCirclePoints(150, 150, 100, 100);
    const map = freshCoverageMap(points.length);
    // Trace a point exactly on the circle
    const result = updateCoverage(points, map, points[0].x, points[0].y);
    expect(result.onTrack).toBe(true);
  });

  test('point inside circle (far from edge) is not on-track', () => {
    const points = makeCirclePoints(150, 150, 100, 100);
    const map = freshCoverageMap(points.length);
    // Center of the circle — 100px from any path point
    const result = updateCoverage(points, map, 150, 150);
    expect(result.onTrack).toBe(false);
  });

  test('tolerance boundary: exactly at 22px is on-track', () => {
    const points = [{ x: 100, y: 100 }];
    const map = freshCoverageMap(1);
    // Exactly 22px away
    const result = updateCoverage(points, map, 100 + 22, 100);
    expect(result.onTrack).toBe(true);
  });

  test('tolerance boundary: just beyond 22px is off-track', () => {
    const points = [{ x: 100, y: 100 }];
    const map = freshCoverageMap(1);
    const result = updateCoverage(points, map, 100 + 23, 100);
    expect(result.onTrack).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Shuffle (Fisher-Yates) — deterministic with seeded random
// ─────────────────────────────────────────────────────────────────────────────
describe('Shuffle / randomize (Fisher-Yates)', () => {
  test('shuffle produces a permutation (same elements)', () => {
    const arr = [0, 1, 2, 3, 4];
    fisherYatesShuffle(arr, () => 0.5);
    expect(arr.sort()).toEqual([0, 1, 2, 3, 4]);
  });

  test('deterministic random produces deterministic order', () => {
    let callCount = 0;
    const fakeRandom = () => {
      // Cycle through deterministic values
      return [0.1, 0.9, 0.3, 0.7, 0.5][callCount++ % 5];
    };
    const a = [0, 1, 2, 3, 4];
    fisherYatesShuffle(a, fakeRandom);

    callCount = 0;
    const b = [0, 1, 2, 3, 4];
    fisherYatesShuffle(b, fakeRandom);

    expect(a).toEqual(b);
  });

  test('shuffle with identity random (always 1.0) swaps every element down', () => {
    // When random always returns values that floor to i, no swaps happen
    const arr = [0, 1, 2, 3];
    fisherYatesShuffle(arr, () => 0.999);
    // With Math.floor(0.999 * (i+1)) = i for each i, so arr[i] swaps with arr[i] (no change)
    expect(arr).toEqual([0, 1, 2, 3]);
  });

  test('empty array shuffle is safe', () => {
    const arr = [];
    fisherYatesShuffle(arr);
    expect(arr).toEqual([]);
  });

  test('single element shuffle is safe', () => {
    const arr = [42];
    fisherYatesShuffle(arr);
    expect(arr).toEqual([42]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Coordinate conversion helpers
// ─────────────────────────────────────────────────────────────────────────────
describe('Coordinate conversion', () => {
  test('toLogical scales display coords to 300×300 space', () => {
    const result = toLogical(150, 300, 600);
    expect(result.x).toBe(75);
    expect(result.y).toBe(150);
  });

  test('toDisplay scales logical coords to display size', () => {
    const result = toDisplay(150, 150, 600);
    expect(result.x).toBe(300);
    expect(result.y).toBe(300);
  });

  test('round-trip: toLogical → toDisplay returns original', () => {
    const displaySize = 500;
    const original = { x: 123, y: 456 };
    const logical = toLogical(original.x, original.y, displaySize);
    const back = toDisplay(logical.x, logical.y, displaySize);
    expect(back.x).toBeCloseTo(original.x, 10);
    expect(back.y).toBeCloseTo(original.y, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Multi-stroke detection
// ─────────────────────────────────────────────────────────────────────────────
describe('Multi-stroke detection', () => {
  // Two strokes mimicking number 4:
  // Stroke 1: horizontal line y=150, x from 0→200
  // Stroke 2: vertical line x=150, y from 0→250
  const stroke1 = makeLinePoints(0, 150, 200, 150, 50);   // 51 points
  const stroke2 = makeLinePoints(150, 0, 150, 250, 50);   // 51 points
  const strokePoints = [stroke1, stroke2];

  function freshMultiMaps() {
    return [freshCoverageMap(stroke1.length), freshCoverageMap(stroke2.length)];
  }

  test('nearestStrokeSample finds correct stroke for point near stroke 1', () => {
    const result = nearestStrokeSample(strokePoints, 100, 152);
    expect(result.strokeIdx).toBe(0);
    expect(result.dist).toBeCloseTo(2, 0);
  });

  test('nearestStrokeSample finds correct stroke for point near stroke 2', () => {
    const result = nearestStrokeSample(strokePoints, 148, 50);
    expect(result.strokeIdx).toBe(1);
    expect(result.dist).toBeCloseTo(2, 0);
  });

  test('nearestStrokeSample handles intersection point (nearest to both)', () => {
    // Point at (150, 150) is on both strokes — should pick one (dist ≈ 0)
    const result = nearestStrokeSample(strokePoints, 150, 150);
    expect(result.dist).toBeCloseTo(0, 0);
  });

  test('getMultiStrokeCoverage returns 0 for empty maps', () => {
    const maps = freshMultiMaps();
    expect(getMultiStrokeCoverage(maps)).toBe(0);
  });

  test('getMultiStrokeCoverage aggregates across strokes', () => {
    const maps = freshMultiMaps();
    // Mark all of stroke 1 as covered
    for (let i = 0; i < maps[0].length; i++) maps[0][i] = true;
    // Stroke 2 untouched
    const cov = getMultiStrokeCoverage(maps);
    // 51 of 102 total points
    expect(cov).toBeCloseTo(51 / 102, 5);
  });

  test('getMultiStrokeCoverage returns 1 when all strokes fully covered', () => {
    const maps = freshMultiMaps();
    for (let i = 0; i < maps[0].length; i++) maps[0][i] = true;
    for (let i = 0; i < maps[1].length; i++) maps[1][i] = true;
    expect(getMultiStrokeCoverage(maps)).toBe(1);
  });

  test('updateMultiStrokeCoverage marks correct stroke on-track', () => {
    const maps = freshMultiMaps();
    // Trace on stroke 1 (horizontal at y=150)
    const result = updateMultiStrokeCoverage(strokePoints, maps, 100, 150);
    expect(result.onTrack).toBe(true);
    expect(result.strokeIdx).toBe(0);
    expect(result.feedbackState).toBe('on-track');
    // Stroke 1 coverage should increase
    expect(result.strokeCoverage).toBeGreaterThan(0);
  });

  test('updateMultiStrokeCoverage does not affect other strokes', () => {
    const maps = freshMultiMaps();
    // Trace on stroke 1
    updateMultiStrokeCoverage(strokePoints, maps, 50, 150);
    // Stroke 2 coverage should still be 0
    expect(getCoverage(maps[1])).toBe(0);
  });

  test('updateMultiStrokeCoverage marks off-track within NEAR_PATH', () => {
    const maps = freshMultiMaps();
    // 30px off stroke 1 — beyond tolerance but within NEAR_PATH
    const result = updateMultiStrokeCoverage(strokePoints, maps, 100, 150 + 30);
    expect(result.onTrack).toBe(false);
    expect(result.feedbackState).toBe('off-track');
  });

  test('updateMultiStrokeCoverage returns none beyond NEAR_PATH', () => {
    const maps = freshMultiMaps();
    // Far from both strokes (stroke1 at y=150, stroke2 at x=150)
    const result = updateMultiStrokeCoverage(strokePoints, maps, 0, 0);
    expect(result.feedbackState).toBe('none');
  });

  test('each stroke can independently reach 95% completion', () => {
    const maps = freshMultiMaps();
    // Cover all of stroke 1
    for (const pt of stroke1) {
      updateMultiStrokeCoverage(strokePoints, maps, pt.x, pt.y);
    }
    const stroke1Cov = getCoverage(maps[0]);
    expect(stroke1Cov).toBeGreaterThanOrEqual(DEFAULTS.COMPLETION_RATIO);
    // Stroke 2 should still be 0
    expect(getCoverage(maps[1])).toBe(0);
  });

  test('shape completes only when ALL strokes reach 95%', () => {
    const maps = freshMultiMaps();
    // Cover stroke 1 fully
    for (const pt of stroke1) {
      updateMultiStrokeCoverage(strokePoints, maps, pt.x, pt.y);
    }
    // Overall < 95% because stroke 2 is untouched
    expect(getMultiStrokeCoverage(maps)).toBeLessThan(DEFAULTS.COMPLETION_RATIO);

    // Now cover stroke 2
    for (const pt of stroke2) {
      updateMultiStrokeCoverage(strokePoints, maps, pt.x, pt.y);
    }
    // Both strokes at 100%, overall should be 100%
    expect(getMultiStrokeCoverage(maps)).toBe(1);
  });

  test('three-stroke shape (A) coverage works correctly', () => {
    // Simulate letter A: left diagonal, right diagonal, crossbar
    const leftDiag  = makeLinePoints(75, 240, 150, 45, 40);
    const rightDiag = makeLinePoints(150, 45, 225, 240, 40);
    const crossbar  = makeLinePoints(105, 165, 195, 165, 30);
    const aStrokes  = [leftDiag, rightDiag, crossbar];
    const aMaps     = [freshCoverageMap(41), freshCoverageMap(41), freshCoverageMap(31)];

    // Trace all three strokes
    for (const pt of leftDiag)  updateMultiStrokeCoverage(aStrokes, aMaps, pt.x, pt.y);
    for (const pt of rightDiag) updateMultiStrokeCoverage(aStrokes, aMaps, pt.x, pt.y);
    for (const pt of crossbar)  updateMultiStrokeCoverage(aStrokes, aMaps, pt.x, pt.y);

    expect(getCoverage(aMaps[0])).toBeGreaterThanOrEqual(DEFAULTS.COMPLETION_RATIO);
    expect(getCoverage(aMaps[1])).toBeGreaterThanOrEqual(DEFAULTS.COMPLETION_RATIO);
    expect(getCoverage(aMaps[2])).toBeGreaterThanOrEqual(DEFAULTS.COMPLETION_RATIO);
    expect(getMultiStrokeCoverage(aMaps)).toBeGreaterThanOrEqual(DEFAULTS.COMPLETION_RATIO);
  });

  test('four-stroke shape (E) coverage works correctly', () => {
    // Simulate letter E: spine + 3 bars
    const spine     = makeLinePoints(90, 45, 90, 240, 40);
    const topBar    = makeLinePoints(90, 45, 205, 45, 30);
    const midBar    = makeLinePoints(90, 142, 185, 142, 25);
    const bottomBar = makeLinePoints(90, 240, 205, 240, 30);
    const eStrokes  = [spine, topBar, midBar, bottomBar];
    const eMaps     = [freshCoverageMap(41), freshCoverageMap(31), freshCoverageMap(26), freshCoverageMap(31)];

    for (const pt of spine)     updateMultiStrokeCoverage(eStrokes, eMaps, pt.x, pt.y);
    for (const pt of topBar)    updateMultiStrokeCoverage(eStrokes, eMaps, pt.x, pt.y);
    for (const pt of midBar)    updateMultiStrokeCoverage(eStrokes, eMaps, pt.x, pt.y);
    for (const pt of bottomBar) updateMultiStrokeCoverage(eStrokes, eMaps, pt.x, pt.y);

    expect(getMultiStrokeCoverage(eMaps)).toBeGreaterThanOrEqual(DEFAULTS.COMPLETION_RATIO);
  });
});
