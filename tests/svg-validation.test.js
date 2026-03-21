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
      paths.push(match[1]);
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

  describe('Letter A (3 strokes)', () => {
    let paths;
    beforeAll(() => {
      paths = loadSvgPaths('a_upper.svg');
    });

    test('has exactly 3 strokes', () => {
      expect(paths.length).toBe(3);
    });

    test('stroke 1: left diagonal (bottom-left to top)', () => {
      const commands = parsePathCommands(paths[0]);
      expect(commands.length).toBeGreaterThanOrEqual(2);
      
      // Start at bottom-left
      expect(commands[0].x).toBeLessThan(120);
      expect(commands[0].y).toBeGreaterThan(200);
      
      // End at top-center
      expect(commands[commands.length - 1].x).toBeGreaterThan(130);
      expect(commands[commands.length - 1].x).toBeLessThan(170);
      expect(commands[commands.length - 1].y).toBeLessThan(100);
    });

    test('stroke 2: right diagonal (top to bottom-right)', () => {
      const commands = parsePathCommands(paths[1]);
      expect(commands.length).toBeGreaterThanOrEqual(2);
      
      // Start at top-center
      expect(commands[0].x).toBeGreaterThan(130);
      expect(commands[0].x).toBeLessThan(170);
      expect(commands[0].y).toBeLessThan(100);
      
      // End at bottom-right
      expect(commands[commands.length - 1].x).toBeGreaterThan(180);
      expect(commands[commands.length - 1].y).toBeGreaterThan(200);
    });

    test('stroke 3: horizontal crossbar', () => {
      const commands = parsePathCommands(paths[2]);
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

    test('stroke 1 and stroke 2 meet at top (A peak)', () => {
      const stroke1 = parsePathCommands(paths[0]);
      const stroke2 = parsePathCommands(paths[1]);
      
      const end1 = stroke1[stroke1.length - 1];
      const start2 = stroke2[0];
      
      const dist = Math.sqrt(
        Math.pow(end1.x - start2.x, 2) +
        Math.pow(end1.y - start2.y, 2)
      );
      
      // Should meet at top peak
      expect(dist).toBeLessThan(50);
    });
  });

  describe('Letter E (4 strokes)', () => {
    let paths;
    beforeAll(() => {
      paths = loadSvgPaths('e_upper.svg');
    });

    test('has exactly 4 strokes', () => {
      expect(paths.length).toBe(4);
    });

    test('stroke 1: vertical spine', () => {
      const commands = parsePathCommands(paths[0]);
      expect(commands.length).toBeGreaterThanOrEqual(2);
      
      // Should start at top
      expect(commands[0].y).toBeLessThan(100);
      
      // Should end at bottom
      expect(commands[commands.length - 1].y).toBeGreaterThan(200);
      
      // X should stay roughly same (vertical)
      const xDiff = Math.abs(commands[0].x - commands[commands.length - 1].x);
      expect(xDiff).toBeLessThan(30);
      
      // Should be on left side
      expect(commands[0].x).toBeLessThan(120);
    });

    test('stroke 2: top horizontal', () => {
      const commands = parsePathCommands(paths[1]);
      
      // Y should stay roughly same (horizontal)
      const yDiff = Math.abs(commands[0].y - commands[commands.length - 1].y);
      expect(yDiff).toBeLessThan(30);
      
      // Should be at top
      expect(commands[0].y).toBeLessThan(100);
      
      // Should go left to right
      expect(commands[commands.length - 1].x).toBeGreaterThan(commands[0].x);
      expect(commands[0].x).toBeLessThan(120); // start on left
    });

    test('stroke 3: middle horizontal', () => {
      const commands = parsePathCommands(paths[2]);
      
      // Y should stay roughly same (horizontal)
      const yDiff = Math.abs(commands[0].y - commands[commands.length - 1].y);
      expect(yDiff).toBeLessThan(30);
      
      // Should be in middle
      expect(commands[0].y).toBeGreaterThan(120);
      expect(commands[0].y).toBeLessThan(180);
      
      // Should go left to right
      expect(commands[commands.length - 1].x).toBeGreaterThan(commands[0].x);
    });

    test('stroke 4: bottom horizontal', () => {
      const commands = parsePathCommands(paths[3]);
      
      // Y should stay roughly same (horizontal)
      const yDiff = Math.abs(commands[0].y - commands[commands.length - 1].y);
      expect(yDiff).toBeLessThan(30);
      
      // Should be at bottom
      expect(commands[0].y).toBeGreaterThan(200);
      
      // Should go left to right
      expect(commands[commands.length - 1].x).toBeGreaterThan(commands[0].x);
    });

    test('all horizontals connect to spine (same X start)', () => {
      const spine = parsePathCommands(paths[0]);
      const top = parsePathCommands(paths[1]);
      const middle = parsePathCommands(paths[2]);
      const bottom = parsePathCommands(paths[3]);
      
      // All horizontals should start near spine X
      const spineX = spine[0].x;
      
      expect(Math.abs(top[0].x - spineX)).toBeLessThan(30);
      expect(Math.abs(middle[0].x - spineX)).toBeLessThan(30);
      expect(Math.abs(bottom[0].x - spineX)).toBeLessThan(30);
    });
  });

  describe('SVG file format', () => {
    test('multi-stroke SVGs have data-stroke attributes', () => {
      const four = fs.readFileSync(path.join(SVG_DIR, 'four.svg'), 'utf8');
      const a = fs.readFileSync(path.join(SVG_DIR, 'a_upper.svg'), 'utf8');
      const e = fs.readFileSync(path.join(SVG_DIR, 'e_upper.svg'), 'utf8');
      
      expect(four).toMatch(/data-stroke="\d+"/);
      expect(a).toMatch(/data-stroke="\d+"/);
      expect(e).toMatch(/data-stroke="\d+"/);
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
  });
});
