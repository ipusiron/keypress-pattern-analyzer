# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyPress Pattern Analyzer is a fully functional web-based tool for analyzing keystroke dynamics and typing patterns. It captures and visualizes timing patterns for education. It does not verify identity, assess impersonation resistance or provide authentication scores.

## Architecture

Pure frontend application (no build process, no dependencies):

- **index.html**: Single-page HTML with semantic structure, a meta CSP, and accessibility features
- **script.js**: Self-contained IIFE implementing capture, UI state and visualization logic; timing and validation are in logic.js
- **style.css**: CSS custom properties for theming (light/dark mode) with visualization-specific variables
- **Data persistence**: localStorage for profiles, JSON export/import for portability

### Core Components (script.js)

- **State Management**: Single `state` object tracks running status, events array, metrics, profiles, keyStates Map, and digraphs Map
- **Event Capture**: `handleKeyDown`/`handleKeyUp` use `performance.now()` for high-precision timestamps
- **Metrics Calculation**: `calculateMetrics()` computes dwell times, flight times, DD/UD intervals, WPM
- **Visualizations**: Three Canvas-based renderers (`renderTimeline`, `renderRhythm`, `renderHeatmap`) with theme-aware colors via `getThemeColors()`
- **Core**: logic.js provides DOM-independent timing, validation and cosine comparison; CommonJS tests and classic browser scripts support file URLs.
- **Messages**: messages.js contains Japanese and English UI text. Re-render derived content on language changes.
- **Results**: descriptive statistics and limitations only; no authentication suitability ratings.

### Key Data Structures

```javascript
// Event format
{ type: 'down'|'up', code: string, key: string, t: number, dwell?: number }

// Digraph timings (stored in Map)
{ keys: [string, string], DD: number[], UD: number[] }

// Metrics object
{ totalKeys, duration, avgDwell, stdDwell, avgFlight, stdFlight, avgDD, stdDD, wpm, dwellTimes[], flightTimes[], ddTimes[] }
```

## Development

No build step required. Open `index.html` directly in browser or serve via any static server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npm test
```

GitHub Pages deploys the main branch root. The `.nojekyll` file disables Jekyll processing.

## Technical Notes

- IME composition filtering via `e.isComposing` check (toggleable)
- Event limit of 10,000 events (down, up and break combined) to prevent memory exhaustion
- Input sanitization: key codes limited to 50 chars, key values to 50 chars
- Profile names limited to 50 UTF-16 code units, max 50 profiles; raw text and events are saved without anonymization
- Canvas visualizations use configurable sizing via CSS custom properties (`--viz-*`)
- Help buttons open a native dialog with keyboard and touch support

## Related Documentation

- **ALGORITHMS.md**: Timing formulas and missing observations
- **TECHNICAL.md**: Measurement limitations and distinctions from authentication research
## Verification and publication

Run npm test on Node.js 22; do not install dependencies. Test known timing fixtures, import failures, empty runs and storage failures.
Validate Japanese/English, both themes, narrow layouts, HTTP and file URLs in available browsers.
Back up existing screenshots outside this repository before replacing them. Preserve the README metadata structure.
Use a working branch and PR, not a direct push to main. Do not weaken tests to make CI pass.
Never log raw keystrokes or typed text. JSON imports are untrusted; recompute all derived metrics.
