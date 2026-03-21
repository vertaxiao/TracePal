# TracePal - Project Manifest

## Overview
Shape tracing app for learning disabilities (LD) accessibility - traces shapes/numbers with instant completion + voice feedback.

## Primary Human Contact
- **dummyharp** (Discord: dummyharp, ID: 824792309479506010)

## Collaborators
- **Verta** - AI coordinator/PM
- **Claude** - ACP coding agent (implementation)
- **Veya** - Shape design expert (SVG paths, LD accessibility)

## Documents
| Type | Path | Auto-load? | Description |
|------|------|------------|-------------|
| Core App | app.py | ✅ | Flask main application |
| Memory | memory/decisions.md | ✅ | Design decisions log |
| Memory | memory/2026-03-16-veya-review.md | ✅ | Veya design reviews |
| Static JS | static/js/main.js | ✅ | Shape tracing + voice logic |
| Templates | templates/index.html | ✅ | Main UI with mute toggle |

## Agent Rules
- Before shape changes → consult Veya design principles (LD accessibility, print-style)
- Before voice changes → read voice implementation in `main.js`
- Test on Chrome (Web Speech API compatibility)
- After design decisions → log to `memory/decisions.md`

## Current Status
- Last updated: 2026-03-21
- Active agents: verta, claude, veya
- Location: `~/TracePal`
- Start command: `cd ~/TracePal && source venv/bin/activate && python app.py`
- URL: `http://localhost:8081/` (Tailscale: `http://vertas-mac-mini.tailebbeec.ts.net:8081/`)
- GitHub: `bingxiao1/TracePal`

## Shapes Implemented
- **5 base shapes:** circle, square, apple, banana, dog
- **10 numbers:** 0-9 (Veya designed, print-style, LD-accessible)
- **95% completion threshold** with auto-complete + instant color-fill
- **Voice:** Shape name on load, "Perfect!" on completion, mute toggle

## Known Issues (Resolved)
- ✅ Voice fixed: Removed over-engineered gesture-gating, use simple `speak()` pattern
- ✅ Number 4 redesigned multiple iterations for natural stroke recognition

## Design Principles (Veya)
- Print-style letterforms (not cursive)
- High contrast, clear stroke paths
- No animation delays (instant feedback)
- Blinking green start indicator
