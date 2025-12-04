# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyPress Pattern Analyzer is a fully functional web-based tool for analyzing keystroke dynamics and typing patterns. It captures and visualizes timing patterns in keyboard input to demonstrate keystroke biometric authentication concepts for security education and research.

## Architecture

Pure frontend application (no build process, no dependencies):

- **index.html**: Single-page HTML with semantic structure, Content Security Policy headers, and accessibility features
- **script.js**: Self-contained IIFE (~1900 lines) implementing all capture, analysis, and visualization logic
- **style.css**: CSS custom properties for theming (light/dark mode) with visualization-specific variables
- **Data persistence**: localStorage for profiles, JSON export/import for portability

### Core Components (script.js)

- **State Management**: Single `state` object tracks running status, events array, metrics, profiles, keyStates Map, and digraphs Map
- **Event Capture**: `handleKeyDown`/`handleKeyUp` use `performance.now()` for high-precision timestamps
- **Metrics Calculation**: `calculateMetrics()` computes dwell times, flight times, DD/UD intervals, WPM
- **Visualizations**: Three Canvas-based renderers (`renderTimeline`, `renderRhythm`, `renderHeatmap`) with theme-aware colors via `getThemeColors()`
- **Analysis Engine**: `analyzeKeystrokePattern()` generates 8-point security evaluation with detailed scoring

### Key Data Structures

```javascript
// Event format
{ type: 'down'|'up', code: string, key: string, t: number, dwell?: number }

// Digraph timings (stored in Map)
{ DD: number[], UD: number[], DU: number[], UU: number[] }

// Metrics object
{ totalKeys, duration, avgDwell, stdDwell, avgFlight, stdFlight, avgDD, stdDD, wpm, dwellTimes[], flightTimes[], ddTimes[] }
```

## Development

No build step required. Open `index.html` directly in browser or serve via any static server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .
```

GitHub Pages deployment configured via `.nojekyll` file.

## Technical Notes

- IME composition filtering via `e.isComposing` check (toggleable)
- Event limit of 10,000 keystrokes to prevent memory exhaustion
- Input sanitization: key codes limited to 50 chars, key values to 10 chars
- Profile names sanitized and limited to 50 chars, max 50 profiles stored
- Canvas visualizations use configurable sizing via CSS custom properties (`--viz-*`)
- Tooltip system supports both hover and touch for mobile accessibility

## Related Documentation

- **ALGORITHMS.md**: Detailed calculation formulas for all timing metrics and security scoring
- **TECHNICAL.md**: Authentication theory, similarity calculations, and integration patterns
