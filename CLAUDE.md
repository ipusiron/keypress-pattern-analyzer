# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyPress Pattern Analyzer is a web-based tool for analyzing keystroke dynamics and typing patterns, aimed at security education and research. It captures and visualizes timing patterns in keyboard input (dwell/flight times, digraphs, error patterns) to demonstrate the concept of keystroke biometric authentication.

## Architecture

This is a pure frontend application designed to run on GitHub Pages:
- **index.html**: Main HTML structure with disabled UI elements awaiting implementation
- **script.js**: JavaScript module with placeholder state management and event handling structure (currently unimplemented)
- **style.css**: Dark-themed cybersecurity aesthetic styling
- No build process or dependencies - runs directly in browser
- Uses localStorage for profile persistence (future implementation)

## Implementation Status

The project is currently a UI scaffold with no functional implementation. All interactive elements are disabled with "準備中" (under preparation) labels. The core keystroke capture and analysis logic needs to be implemented.

## Key Features to Implement

1. **Keystroke Capture**: Record keydown/keyup events with precise timestamps
2. **Metrics Calculation**: 
   - Dwell time (key press duration)
   - Flight time (time between key releases and next key press)
   - DD/UD times (down-down, up-down intervals)
3. **Visualization**: Timeline, rhythm waveform, keyboard heatmap
4. **n-gram Analysis**: Digraph timing patterns
5. **Profile Management**: Save/load/compare typing profiles using localStorage
6. **Export/Import**: JSON format for data persistence

## Development Notes

- The app is designed for educational/research purposes in cybersecurity
- IME composition events should be handled (checkbox present but disabled)
- Three planned modes: Fixed Phrase, Custom Phrase, Free Text
- GitHub Pages deployment via .nojekyll file present
- MIT License