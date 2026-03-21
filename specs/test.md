# TracePal - Test Specification

## Purpose
This document defines test coverage requirements for all TracePal features. Update this spec after every major decision (new feature, refactoring, architectural change).

## Test Framework
- **Unit tests**: TBD (future: Jest for JS, pytest for Python)
- **Integration tests**: Manual testing on Chrome, Safari (iOS/iPadOS)
- **E2E**: Manual trace testing + voice verification

## Test Execution
```bash
# Start app locally
cd ~/TracePal
source venv/bin/activate
python app.py

# Open browser: http://localhost:8081/
# Manual testing required (canvas tracing, voice, touch)
```

## Core Features Test Matrix

### 1. Shape Tracing (All 25 Shapes)
| Shape ID | Test Case | Steps | Expected | Status |
|----------|-----------|-------|----------|--------|
| circle | Basic shape | Trace circle path | 95% coverage → auto-complete, green fill | ✅ |
| square | Basic shape | Trace square path | 95% coverage → auto-complete, green fill | ✅ |
| apple | Organic shape | Trace apple outline | Path recognition, completion trigger | ✅ |
| banana | Organic shape | Trace banana curve | Tolerance handles curves (22px) | ✅ |
| dog | Complex shape | Trace dog silhouette | Complex path works | ✅ |
| zero | Number 0 | Trace circular path | Number shape recognition | ✅ |
| one | Number 1 | Trace vertical line | Single stroke accepted | ✅ |
| two | Number 2 | Trace curved path | Multi-stroke handled | ✅ |
| three | Number 3 | Trace dual curves | Complex number path | ✅ |
| four | Number 4 | Trace angular path | Vertical-from-top design (final iteration) | ✅ |
| five-nine | Numbers 5-9 | Trace each | All number shapes recognizable | ✅ |
| A/a | Letters | Trace uppercase/lowercase | Print-style letterforms (Veya design) | ✅ |
| B/b-E/e | Letters | Trace uppercase/lowercase | All letter shapes LD-accessible | ✅ |

**Test file:** `static/js/main.js` (shape definitions + tracing logic)

### 2. Completion Detection
| Test Case | Steps | Expected | Status |
|-----------|-------|----------|--------|
| 95% threshold | Trace 95% of path | Auto-complete triggers, instant color-fill | ✅ |
| Under 95% | Trace <90% of path | No auto-complete, continue tracing | ✅ |
| Tolerance check | Trace within 22px of path | Points marked as "on track" | ✅ |
| Out of tolerance | Trace >50px from path | No coverage credited | ✅ |
| Start indicator | Page loads | Blinking green dot shows starting point | ✅ |

### 3. Voice Feedback (Web Speech API)
| Test Case | Steps | Expected | Status |
|-----------|-------|----------|--------|
| Shape announcement | Shape loads | Voice announces shape name (e.g., "Circle") | ✅ |
| Completion voice | Auto-complete triggers | Voice says "Perfect!" | ✅ |
| Mute toggle | Click mute button | Voice silenced, no announcements | ✅ |
| Unmute | Click mute again | Voice restored | ✅ |
| Chrome compatibility | Test on Chrome | Web Speech API works | ✅ |
| Safari compatibility | Test on Safari (iOS) | Voice works (fallback if needed) | ⚠️ Manual |

**Implementation:** `static/js/main.js` - `speak()` function (simple direct pattern, no gesture-gating)

### 4. Canvas Rendering
| Test Case | Steps | Expected | Status |
|-----------|-------|----------|--------|
| SVG load | Shape selected | SVG path renders on canvas | ✅ |
| Guide line | Before tracing | 20px wide guide line visible | ✅ |
| User stroke | During tracing | 8px user stroke follows input | ✅ |
| Completion path | Auto-complete | Green completion path drawn | ✅ |
| Touch input | Touch/stroke on canvas | Tracing registers correctly | ✅ |
| Mouse input | Click+drag on desktop | Tracing works with mouse | ✅ |

### 5. Shuffling & Navigation
| Test Case | Steps | Expected | Status |
|-----------|-------|----------|--------|
| Sequential order | Page loads | Shapes in IMAGES array order | ✅ |
| Shuffle toggle | Enable shuffle | Randomized order (Fisher-Yates) | ✅ |
| Next shape | After completion | Auto-advance to next shape | ✅ |
| All 25 shapes | Scroll through | All shapes accessible | ✅ |

### 6. Mobile/Tablet Accessibility (LD Users)
| Test Case | Steps | Expected | Status |
|-----------|-------|----------|--------|
| iPhone layout | Safari on iPhone | Canvas scales correctly, touch works | ✅ |
| iPad layout | Safari on iPad | Large canvas, Apple Pencil support | ✅ |
| Touch precision | Trace on touch device | Accurate path registration | ✅ |
| Visual clarity | High contrast | Clear guide line vs user stroke | ⚠️ Manual |
| No animation delay | Completion | Instant fill (no animation) | ✅ |

## Refactoring Test Checklist

### Before Any Refactoring
1. **Read this spec** - Identify affected shapes/features
2. **Manual smoke test** - Trace 2-3 shapes, verify voice
3. **Update this spec** - Add test cases if behavior changes

### After Refactoring
1. **Test all 25 shapes** - Ensure path recognition unchanged
2. **Voice test** - Verify shape announcements + "Perfect!"
3. **Mobile test** - iPhone/iPad touch tracing
4. **Update this spec** - Document what changed

### Test Coverage Requirements
| Change Type | Required Tests |
|-------------|----------------|
| New shape | Manual trace test + SVG path verification |
| Voice changes | All voice announcements tested |
| Canvas refactor | All 25 shapes + touch + mouse |
| UI changes | Mobile layout manual test |
| Performance | No regression in tracing responsiveness |

## Manual Testing Checklist (Per Release)

### Desktop (Chrome/Firefox/Safari)
- [ ] All 25 shapes load
- [ ] Mouse tracing works
- [ ] Voice announcements work
- [ ] Mute toggle works
- [ ] Completion auto-triggers at 95%

### Mobile (iPhone Safari)
- [ ] Touch tracing accurate
- [ ] Canvas scales correctly
- [ ] Voice works (or graceful fallback)
- [ ] No touch delay
- [ ] LD-accessible (clear paths, instant feedback)

### Tablet (iPad Safari + Apple Pencil)
- [ ] Apple Pencil precision
- [ ] Large canvas usable
- [ ] All shapes traceable
- [ ] Voice feedback appropriate
- [ ] Print-style letterforms (Veya design)

## Veya Design Principles Verification
Per release, verify against Veya's LD accessibility principles:
- [ ] Print-style (not cursive) letterforms
- [ ] High contrast, clear stroke paths
- [ ] No animation delays (instant feedback)
- [ ] Blinking green start indicator
- [ ] 95% threshold (not perfection required)
- [ ] Voice feedback supportive ("Perfect!")

## Known Test Gaps
- ❌ No automated unit tests (future: Jest)
- ❌ No visual regression testing for SVG paths
- ❌ No performance benchmarks (tracing latency)
- ⚠️ All testing relies on manual verification

## Test Maintenance Rules
1. **New shape** → Add to test matrix + verify path recognition
2. **Voice change** → Test all announcements + mute toggle
3. **Canvas refactor** → Test all 25 shapes + touch/mouse
4. **Major decision** → Submit PR with test updates for human review

## Human Review Required
After updating this spec or making changes:
- **Primary contact**: dummyharp (Discord: dummyharp)
- **Design review**: Veya (for LD accessibility)
- **Submit PR**: Include test changes + spec updates
- **Review on**: iPhone + iPad (touch tracing verification)

## Last Updated
- **Date**: 2026-03-21
- **Change**: Initial test spec created per PROJECT.md convention
- **PR**: Pending (part of project-manifest PR)
- **Shapes**: 25 total (5 base + 10 numbers + 10 letters)
