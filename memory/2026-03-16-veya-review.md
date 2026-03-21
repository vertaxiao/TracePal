# Veya Design Review - TracePal SVG Icons (2026-03-16)

## Current Icons Analysis

### Banana
**Current:** Curved crescent with stem
**Problem:** Shape is too abstract - lacks distinctive banana features
**Fix needed:** 
- More pronounced curve (banana's natural arc)
- Thicker body, tapered ends
- Small stem nub at top
- Single continuous path for tracing

### Dog
**Current:** Quadrilateral body with pointy ears
**Problem:** Doesn't read as "dog" - could be any animal
**Fix needed:**
- Distinctive snout/nose
- Floppy or perked ears (clear dog ears)
- Tail shape (curved up or down)
- Four legs or sitting posture
- Side profile is most recognizable

### One (Number 1)
**Current:** Blocky numeral with serifs
**Problem:** Too complex for tracing - multiple angles
**Fix needed:**
- Simple straight vertical stem
- Small top flag (diagonal)
- Optional small base serif
- Minimal anchor points

### Four (Number 4)
**Current:** Three simple lines
**Problem:** Too minimal - doesn't look like "4"
**Fix needed:**
- Vertical stem
- Horizontal crossbar
- Diagonal from top-left to crossbar
- Clear "4" shape, not just angles

## Design Principles for Neurodiversity Tracing

1. **Instant recognizability** - Shape must read immediately
2. **Single continuous path** - No lifting pen during tracing
3. **Minimal anchor points** - Reduce motor planning load
4. **Distinctive features** - One clear identifying element
5. **Familiar proportions** - Match real-world expectations

## Implementation Brief for Claude

**Task:** Redesign 4 SVG icons with above specs
**Location:** `/Users/verta/TracePal/static/assets/icons/`
**Files:** banana.svg, dog.svg, one.svg, four.svg
**Constraints:**
- Single `<path>` element per file
- viewBox="0 0 300 300"
- fill="#FFE135" (banana) or no fill (numbers/dog)
- stroke="#B89628" stroke-width="4"
- Test: Can a child trace without lifting pen?

**Success criteria:**
- Banana looks like banana (not crescent moon)
- Dog looks like dog (not generic quadruped)
- Numbers read as numerals (not abstract shapes)
- All paths are continuous (no breaks)
