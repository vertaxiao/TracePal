/* ============================================================
   TracePal - SVG Shape Validation Tests
   Verify that multi-stroke SVG paths match correct letter/number forms.
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

describe('SVG Shape Validation', () => {
  const SVG_DIR = path.join(__dirname, '..', 'static', 'assets', 'icons');

  function loadSvgPaths(svgFile) {
    const svgPath = path.join(SVG_DIR, svgFile);
    const content = fs.readFileSync(svgPath, 'utf8');

    // Extract path d attributes
    const pathRegex = /<path[^>]*d="([^"]*)"[^>]*>/g;
    const paths = [];
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
      // Split on M commands to detect multi-stroke subpaths
      const subPaths = match[1].split(/(?=M\s)/).map(s => s.trim()).filter(s => s.length > 0);
      subPaths.forEach(sp => paths.push(sp));
    }
    return paths;
  }

  function parsePathCommands(pathD) {
    // Simple parser for M (move) and L (line) commands
    const commands = [];
    const regex = /([ML])\s*(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)/g;
    let match;
    while ((match = regex.exec(pathD)) !== null) {
      commands.push({
        type: match[1],
        x: parseFloat(match[2]),
        y: parseFloat(match[3]),
      });
    }
    return commands;
  }

  describe('Number 4 (2 strokes)', () => {
    let paths;
    beforeAll(() => {
      paths = loadSvgPaths('four.svg');
    });

    test('has exactly 2 strokes', () => {
      expect(paths.length).toBe(2);
    });

    test('stroke 1: L-shape (diagonal + horizontal)', () => {
      const commands = parsePathCommands(paths[0]);
      expect(commands.length).toBeGreaterThanOrEqual(2);
      
      // Should start at top-right area
      expect(commands[0].x).toBeGreaterThan(150);
      expect(commands[0].y).toBeLessThan(100);
      
      // Should go to middle-left
      expect(commands[commands.length - 1].x).toBeGreaterThan(150); // ends on right
      expect(commands[commands.length - 1].y).toBeGreaterThan(100); // ends in middle
    });

    test('stroke 2: vertical stem', () => {
      const commands = parsePathCommands(paths[1]);
      expect(commands.length).toBeGreaterThanOrEqual(2);
      
      // Should start at top
      expect(commands[0].y).toBeLessThan(100);
      
      // Should end at bottom
      expect(commands[commands.length - 1].y).toBeGreaterThan(200);
      
      // X should stay roughly same (vertical)
      const xDiff = Math.abs(commands[0].x - commands[commands.length - 1].x);
      expect(xDiff).toBeLessThan(30);
    });

    test('stroke 1 starts near stroke 2 (connected at top)', () => {
      const stroke1 = parsePathCommands(paths[0]);
      const stroke2 = parsePathCommands(paths[1]);
      
      const startDist = Math.sqrt(
        Math.pow(stroke1[0].x - stroke2[0].x, 2) +
        Math.pow(stroke1[0].y - stroke2[0].y, 2)
      );
      
      // Should start at same point (top of 4)
      expect(startDist).toBeLessThan(50);
    });
  });

  describe('Letter A (2 strokes)', () => {
    let paths;
    beforeAll(() => {
      paths = loadSvgPaths('a_upper.svg');
    });

    test('has exactly 2 strokes', () => {
      expect(paths.length).toBe(2);
    });

    test('stroke 1: V-shape (bottom-left to top to bottom-right)', () => {
      const commands = parsePathCommands(paths[0]);
      expect(commands.length).toBeGreaterThanOrEqual(3);

      // Start at bottom-left
      expect(commands[0].x).toBeLessThan(120);
      expect(commands[0].y).toBeGreaterThan(200);

      // Middle point at top-center (peak)
      expect(commands[1].x).toBeGreaterThan(130);
      expect(commands[1].x).toBeLessThan(170);
      expect(commands[1].y).toBeLessThan(100);

      // End at bottom-right
      expect(commands[commands.length - 1].x).toBeGreaterThan(180);
      expect(commands[commands.length - 1].y).toBeGreaterThan(200);
    });

    test('stroke 2: horizontal crossbar', () => {
      const commands = parsePathCommands(paths[1]);
      expect(commands.length).toBeGreaterThanOrEqual(2);

      // Y should stay roughly same (horizontal)
      const yDiff = Math.abs(commands[0].y - commands[commands.length - 1].y);
      expect(yDiff).toBeLessThan(30);

      // Should be in middle vertical range
      expect(commands[0].y).toBeGreaterThan(100);
      expect(commands[0].y).toBeLessThan(180);

      // Should go left to right
      expect(commands[commands.length - 1].x).toBeGreaterThan(commands[0].x);
    });

    test('V-shape peak is at top center', () => {
      const commands = parsePathCommands(paths[0]);
      // The peak (second point) should be the highest point
      const peakY = commands[1].y;
      expect(peakY).toBeLessThan(commands[0].y);
      expect(peakY).toBeLessThan(commands[commands.length - 1].y);
    });
  });

  describe('Letter E (2 strokes)', () => {
    let paths;
    beforeAll(() => {
      paths = loadSvgPaths('e_upper.svg');
    });

    test('has exactly 2 strokes', () => {
      expect(paths.length).toBe(2);
    });

    test('stroke 1: C-shape (top-right → top-left → bottom-left → bottom-right)', () => {
      const commands = parsePathCommands(paths[0]);
      expect(commands.length).toBeGreaterThanOrEqual(4);

      // Start at top-right
      expect(commands[0].x).toBeGreaterThan(150);
      expect(commands[0].y).toBeLessThan(100);

      // Goes to top-left
      expect(commands[1].x).toBeLessThan(120);
      expect(commands[1].y).toBeLessThan(100);

      // Down to bottom-left
      expect(commands[2].x).toBeLessThan(120);
      expect(commands[2].y).toBeGreaterThan(200);

      // End at bottom-right
      expect(commands[commands.length - 1].x).toBeGreaterThan(150);
      expect(commands[commands.length - 1].y).toBeGreaterThan(200);
    });

    test('stroke 2: middle horizontal crossbar', () => {
      const commands = parsePathCommands(paths[1]);
      expect(commands.length).toBeGreaterThanOrEqual(2);

      // Y should stay roughly same (horizontal)
      const yDiff = Math.abs(commands[0].y - commands[commands.length - 1].y);
      expect(yDiff).toBeLessThan(30);

      // Should be in middle
      expect(commands[0].y).toBeGreaterThan(120);
      expect(commands[0].y).toBeLessThan(180);

      // Should go left to right
      expect(commands[commands.length - 1].x).toBeGreaterThan(commands[0].x);

      // Should start on left side (at spine)
      expect(commands[0].x).toBeLessThan(120);
    });

    test('crossbar connects to C-shape spine', () => {
      const cShape = parsePathCommands(paths[0]);
      const crossbar = parsePathCommands(paths[1]);

      // The spine X (left side of C) should be near the crossbar start X
      const spineX = cShape[1].x; // top-left point
      expect(Math.abs(crossbar[0].x - spineX)).toBeLessThan(30);
    });
  });

  describe('SVG file format', () => {
    test('multi-stroke SVGs use M (moveto) for stroke separation', () => {
      const four = fs.readFileSync(path.join(SVG_DIR, 'four.svg'), 'utf8');
      const a = fs.readFileSync(path.join(SVG_DIR, 'a_upper.svg'), 'utf8');
      const e = fs.readFileSync(path.join(SVG_DIR, 'e_upper.svg'), 'utf8');
      
      // Should have multiple M commands (pen lifts between strokes)
      const mCount = (str) => (str.match(/M\s+\d+/g) || []).length;
      expect(mCount(four)).toBeGreaterThanOrEqual(2); // 4 has 2 M commands
      expect(mCount(a)).toBeGreaterThanOrEqual(2); // A has 2 M commands
      expect(mCount(e)).toBeGreaterThanOrEqual(2); // E has 2 M commands
    });

    test('number 4 path matches original working shape', () => {
      const four = fs.readFileSync(path.join(SVG_DIR, 'four.svg'), 'utf8');
      // Original working path from b6372f0
      expect(four).toMatch(/M 170,50 L 55,190 L 210,190 M 170,50 L 170,258/);
    });

    test('letter A path matches original working shape', () => {
      const a = fs.readFileSync(path.join(SVG_DIR, 'a_upper.svg'), 'utf8');
      // Original working path from b6372f0
      expect(a).toMatch(/M 75 240 L 150 45 L 225 240 M 105 165 L 195 165/);
    });

    test('letter E path matches original working shape', () => {
      const e = fs.readFileSync(path.join(SVG_DIR, 'e_upper.svg'), 'utf8');
      // Original working path from b6372f0
      expect(e).toMatch(/M 205 45 L 90 45 L 90 240 L 205 240 M 90 142 L 185 142/);
    });

    test('multi-stroke SVGs have stroke="none" (no visible stroke)', () => {
      const four = fs.readFileSync(path.join(SVG_DIR, 'four.svg'), 'utf8');
      const a = fs.readFileSync(path.join(SVG_DIR, 'a_upper.svg'), 'utf8');
      const e = fs.readFileSync(path.join(SVG_DIR, 'e_upper.svg'), 'utf8');
      
      expect(four).toMatch(/stroke="none"/);
      expect(a).toMatch(/stroke="none"/);
      expect(e).toMatch(/stroke="none"/);
    });

    test('multi-stroke SVGs do NOT have colored stroke attributes', () => {
      const four = fs.readFileSync(path.join(SVG_DIR, 'four.svg'), 'utf8');
      const a = fs.readFileSync(path.join(SVG_DIR, 'a_upper.svg'), 'utf8');
      const e = fs.readFileSync(path.join(SVG_DIR, 'e_upper.svg'), 'utf8');
      
      // Should NOT have stroke="#..." attributes
      expect(four).not.toMatch(/stroke="#[0-9a-fA-F]+/);
      expect(a).not.toMatch(/stroke="#[0-9a-fA-F]+/);
      expect(e).not.toMatch(/stroke="#[0-9a-fA-F]+/);
    });

    test('multi-stroke SVGs do NOT have data-stroke attributes (single path)', () => {
      const four = fs.readFileSync(path.join(SVG_DIR, 'four.svg'), 'utf8');
      const a = fs.readFileSync(path.join(SVG_DIR, 'a_upper.svg'), 'utf8');
      const e = fs.readFileSync(path.join(SVG_DIR, 'e_upper.svg'), 'utf8');
      
      // New format: single path with M commands, no data-stroke
      expect(four).not.toMatch(/data-stroke=/);
      expect(a).not.toMatch(/data-stroke=/);
      expect(e).not.toMatch(/data-stroke=/);
    });
  });
});
