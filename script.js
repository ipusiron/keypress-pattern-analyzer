'use strict';

/**
 * KeyPress Pattern Analyzer
 * Keystroke dynamics capture and visualization
 */

(function () {
  const Core = window.KeystrokeCore;
  let language = navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  try {
    const saved = localStorage.getItem('language');
    if (saved === 'ja' || saved === 'en') language = saved;
  } catch { /* Optional. */ }
  const requestedLanguage = new URLSearchParams(location.search).get('lang');
  if (requestedLanguage === 'ja' || requestedLanguage === 'en') language = requestedLanguage;
  let statusKey = '';
  const t = key => window.KeystrokeMessages[language][key];
  let captureTimer = null;
  let composing = false;
  let importing = false;
  function notify(message) {
    statusKey = message;
    document.getElementById('status').textContent = message ? t(message) : '';
  }
  const ms = value => Number.isFinite(value) ? value.toFixed(1) + ' ms' : '—';
  // DOM refs
  const els = {
    mode: document.getElementById('mode'),
    imeToggle: document.getElementById('imeToggle'),
    phrase: document.getElementById('phrase'),
    btnStart: document.getElementById('btnStart'),
    btnStop: document.getElementById('btnStop'),
    btnClear: document.getElementById('btnClear'),
    editor: document.getElementById('editor'),
    btnSave: document.getElementById('btnSave'),
    btnExport: document.getElementById('btnExport'),
    btnImport: document.getElementById('btnImport'),
    btnCompare: document.getElementById('btnCompare'),
    summary: {
      keystrokes: null,
      duration: null,
      avgDwell: null,
    },
    viz: {
      timeline: document.getElementById('timeline'),
      rhythm: document.getElementById('rhythm'),
      heatmap: document.getElementById('heatmap'),
    }
  };

  // State management
  const state = {
    running: false,
    startedAt: 0,
    events: [],   // {type:'down'|'up', code, key, t}
    metrics: {},  // Calculated metrics
    profiles: [], // Saved profiles
    currentProfile: null,
    context: null,
    keyStates: new Map(), // Track key press states
    digraphs: new Map(), // Track digraph timings
  };

  // Fixed phrase for testing
  const DEFAULT_PHRASE = 'the quick brown fox jumps over the lazy dog';

  // Configuration object for styling and visualization
  const CONFIG = {
    visualization: {
      timeline: {
        barHeight: 20,
        fontSize: 12,
        fontFamily: 'monospace',
        margin: { top: 30, right: 20, bottom: 30, left: 60 },
        minWidth: 800
      },
      rhythm: {
        lineWidth: 2,
        pointRadius: 3,
        fontSize: 10,
        fontFamily: 'monospace',
        margin: { top: 20, right: 20, bottom: 40, left: 40 },
        minHeight: 200
      },
      heatmap: {
        cellSize: 40,
        borderRadius: 4,
        fontSize: 10,
        fontFamily: 'monospace',
        spacing: 2,
        keyboardLayout: {
          rows: [
            ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
            ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
            [' ']
          ],
          // Key mapping for special keys
          keyMap: {
            'Backspace': 'BS',
            'CapsLock': 'Caps',
            'Enter': '↵',
            'Shift': '⇧',
            'ShiftLeft': '⇧',
            'ShiftRight': '⇧',
            'Control': 'Ctrl',
            'ControlLeft': 'Ctrl',
            'ControlRight': 'Ctrl',
            'Alt': 'Alt',
            'AltLeft': 'Alt',
            'AltRight': 'Alt',
            'Win': '⊞',
            'Meta': '⊞',
            'MetaLeft': '⊞',
            'MetaRight': '⊞',
            'OS': '⊞',
            'Tab': '⇥',
            ' ': 'Space',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'Escape': 'Esc',
            'Delete': 'Del',
            'Home': 'Home',
            'End': 'End',
            'PageUp': 'PgUp',
            'PageDown': 'PgDn'
          }
        }
      }
    },
    colors: {
      // These will be overridden by CSS custom properties
      primary: '#007acc',
      accent: '#ff6b35',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      text: '#333333',
      textMuted: '#6c757d',
      background: '#ffffff',
      surface: '#f8f9fa',
      border: '#dee2e6'
    }
  };

  // Function to get theme-aware colors and styling from CSS custom properties
  function getThemeColors() {
    try {
      const style = getComputedStyle(document.documentElement);
      return {
        primary: style.getPropertyValue('--primary').trim() || '#4da3ff',
        accent: style.getPropertyValue('--accent').trim() || '#7bd389',
        success: style.getPropertyValue('--success').trim() || '#7bd389',
        warning: style.getPropertyValue('--warning').trim() || '#ffc107',
        danger: style.getPropertyValue('--danger').trim() || '#ff6b6b',
        text: style.getPropertyValue('--text').trim() || '#e6ecff',
        textMuted: style.getPropertyValue('--muted').trim() || '#9fb0d8',
        background: style.getPropertyValue('--bg').trim() || '#0b0d12',
        surface: style.getPropertyValue('--panel').trim() || '#141926',
        border: style.getPropertyValue('--border').trim() || '#1f2640'
      };
    } catch (error) {
      console.warn('Failed to get CSS custom properties, using fallback colors:', error);
      return {
        primary: '#4da3ff',
        accent: '#7bd389',
        success: '#7bd389',
        warning: '#ffc107',
        danger: '#ff6b6b',
        text: '#e6ecff',
        textMuted: '#9fb0d8',
        background: '#0b0d12',
        surface: '#141926',
        border: '#1f2640'
      };
    }
  }

  // Function to get visualization configuration from CSS custom properties
  function getVizConfig() {
    const style = getComputedStyle(document.documentElement);
    const config = JSON.parse(JSON.stringify(CONFIG.visualization)); // Deep copy
    
    // Override with CSS custom properties where available
    const barHeight = style.getPropertyValue('--viz-bar-height').trim();
    if (barHeight) config.timeline.barHeight = parseInt(barHeight);
    
    const fontSize = style.getPropertyValue('--viz-font-size').trim();
    if (fontSize) {
      config.timeline.fontSize = parseInt(fontSize);
      config.rhythm.fontSize = parseInt(fontSize);
      config.heatmap.fontSize = parseInt(fontSize);
    }
    
    const fontFamily = style.getPropertyValue('--viz-font-family').trim();
    if (fontFamily) {
      config.timeline.fontFamily = fontFamily;
      config.rhythm.fontFamily = fontFamily;
      config.heatmap.fontFamily = fontFamily;
    }
    
    const lineWidth = style.getPropertyValue('--viz-line-width').trim();
    if (lineWidth) config.rhythm.lineWidth = parseInt(lineWidth);
    
    const pointRadius = style.getPropertyValue('--viz-point-radius').trim();
    if (pointRadius) config.rhythm.pointRadius = parseInt(pointRadius);
    
    const cellSize = style.getPropertyValue('--viz-cell-size').trim();
    if (cellSize) config.heatmap.cellSize = parseInt(cellSize);
    
    const borderRadius = style.getPropertyValue('--viz-border-radius').trim();
    if (borderRadius) config.heatmap.borderRadius = parseInt(borderRadius);
    
    const spacing = style.getPropertyValue('--viz-spacing').trim();
    if (spacing) config.heatmap.spacing = parseInt(spacing);
    
    return config;
  }

  // Initialize
  function init() {
    loadProfiles();
    loadTheme();
    bindEvents();
    initTooltips();
    updateUI();
    els.phrase.value = DEFAULT_PHRASE;
    applyLanguage();
    clearVisualizations(); // Show initial keyboard layout
    window.addEventListener('resize', () => {
      if (state.metrics.totalKeys) renderVisualizations();
      else clearVisualizations();
    });
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    const set = (selector, key) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = t(key);
    };
    for (const [selector, key] of Object.entries({
      '.subtitle': 'subtitle', '.note-box': 'note', 'label[for=mode]': 'mode',
      '#mode option[value=fixed]': 'fixed', '#mode option[value=custom]': 'custom',
      '#mode option[value=free]': 'free', '#imeLabel': 'ime', 'label[for=phrase]': 'phrase',
      '#btnStart': 'start', '#btnStop': 'stop', '#btnClear': 'clear', '#btnSave': 'save',
      '#btnExport': 'export', '#btnImport': 'import', '#btnCompare': 'compare', '#btnDelete': 'delete',
      'label[for=editor]': 'input', '#captureNote': 'captureNote', '#privacyNote': 'privacy',
      '#helpTitle': 'help', '#helpClose': 'close', '.analysis-summary h3': 'reading'
    })) set(selector, key);
    for (const [selector, key] of [
      ['main .section-header h2', 'headings'], ['.stat__label', 'stats'],
      ['.analysis-card h3', 'cards'], ['.metric-label', 'labels'], ['.viz-header h3', 'viz'],
      ['thead th', 'columns']
    ]) document.querySelectorAll(selector).forEach((el, i) => { el.textContent = t(key)[i]; });
    document.querySelectorAll('.help-button').forEach((button, i) => {
      button.setAttribute('aria-label', t('help'));
      button.dataset.helpText = t('helps')[i];
    });
    document.getElementById('helpDialog').close();
    document.getElementById('helpText').textContent = '';
    document.getElementById('themeToggle').setAttribute('aria-label', t('theme'));
    document.getElementById('languageToggle').textContent = t('languageName');
    document.getElementById('languageToggle').lang = language === 'ja' ? 'en' : 'ja';
    notify(statusKey);
    updateUI();
    renderDigraphTable();
    if (state.metrics.totalKeys) { performAnalysis(); renderVisualizations(); }
    else { hideAnalysis(); clearVisualizations(); }
    if (document.getElementById('comparison').textContent) compareProfiles();
  }

  function initTooltips() {
    document.querySelectorAll('button[data-tooltip]').forEach(button => button.removeAttribute('data-tooltip'));
    document.querySelectorAll('.help-icon, .viz-help').forEach((icon, i) => {
      const text = icon.querySelector('.tooltip')?.textContent.trim() || icon.getAttribute('title') || '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'help-button';
      button.textContent = '?';
      button.setAttribute('aria-label', t('help'));
      button.dataset.help = String(i);
      button.addEventListener('click', () => {
        document.getElementById('helpText').textContent = button.dataset.helpText || text;
        document.getElementById('helpDialog').showModal();
      });
      icon.replaceWith(button);
    });
    document.getElementById('helpClose').addEventListener('click', () => document.getElementById('helpDialog').close());
  }

  function loadTheme() {
    document.body.classList.toggle('light-mode', document.documentElement.classList.contains('light-mode'));
    document.getElementById('themeIcon').textContent =
      document.documentElement.classList.contains('light-mode') ? '🌙' : '☀️';
  }

  function toggleTheme() {
    const light = !document.documentElement.classList.contains('light-mode');
    document.documentElement.classList.toggle('light-mode', light);
    loadTheme();
    try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch { /* Session-only setting. */ }
    if (state.metrics.totalKeys) renderVisualizations();
    else clearVisualizations();
  }

  function bindEvents() {
    document.getElementById('languageToggle').addEventListener('click', () => {
      language = language === 'ja' ? 'en' : 'ja';
      try { localStorage.setItem('language', language); } catch { /* Session-only. */ }
      applyLanguage();
    });
    els.btnStart.addEventListener('click', startCapture);
    els.btnStop.addEventListener('click', stopCapture);
    els.btnClear.addEventListener('click', clearAll);
    els.btnSave.addEventListener('click', saveProfile);
    els.btnExport.addEventListener('click', exportJSON);
    els.btnImport.addEventListener('click', importJSON);
    els.btnCompare.addEventListener('click', compareProfiles);
    
    els.editor.addEventListener('keydown', handleKeyDown);
    els.editor.addEventListener('keyup', handleKeyUp);
    els.editor.addEventListener('blur', () => stopCapture('blur'));
    window.addEventListener('blur', () => stopCapture('windowBlur'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopCapture('hidden');
    });
    els.editor.addEventListener('compositionstart', () => { composing = true; compositionBoundary(); });
    els.editor.addEventListener('compositionend', () => { composing = false; compositionBoundary(); });
    els.editor.addEventListener('input', () => {
      if (els.editor.value.length > Core.LIMITS.text) {
        els.editor.value = els.editor.value.slice(0, Core.LIMITS.text);
        stopCapture('textLimit');
      }
    });
    document.getElementById('btnDelete').addEventListener('click', deleteProfiles);
    
    els.mode.addEventListener('change', updateMode);
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Handle file import
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleFileImport);
    document.body.appendChild(fileInput);
    els.fileInput = fileInput;
  }

  function updateMode() {
    const mode = els.mode.value;
    if (mode === 'fixed') {
      els.phrase.value = DEFAULT_PHRASE;
      els.phrase.disabled = true;
    } else if (mode === 'custom') {
      els.phrase.disabled = false;
    } else if (mode === 'free') {
      els.phrase.value = '';
      els.phrase.disabled = true;
    }
  }

  function startCapture() {
    if (state.running || importing) return;
    clearAll();
    state.running = true;
    state.startedAt = performance.now();
    state.context = { mode: els.mode.value, phrase: els.phrase.value,
      ignoreIME: els.imeToggle.checked, imeUsed: false };
    updateUI();
    els.editor.focus();
    notify('recording');
    captureTimer = setTimeout(() => stopCapture('timeLimit'), Core.LIMITS.time);
  }

  function stopCapture(message) {
    if (!state.running) return;
    state.running = false;
    clearTimeout(captureTimer);
    calculateMetrics();
    state.keyStates.clear();
    updateUI();
    renderVisualizations();
    renderDigraphTable();
    performAnalysis();
    notify(typeof message === 'string' ? message : 'stopped');
  }

  function clearAll() {
    clearTimeout(captureTimer);
    state.running = false;
    state.events = [];
    state.metrics = {};
    state.keyStates.clear();
    state.digraphs.clear();
    els.editor.value = '';
    composing = false;
    updateUI();
    clearVisualizations();
    hideAnalysis();
    notify('');
  }

  function performAnalysis() {
    if (!state.metrics.totalKeys) { hideAnalysis(); return; }
    const m = state.metrics;
    const values = {
      wpmValue: Number.isFinite(m.wpm) ? m.wpm.toFixed(1) + ' WPM' : '—',
      efficiencyValue: m.dwellTimes.length + ' / ' + m.totalKeys,
      stabilityValue: ms(m.stdDD),
      avgDwellValue: ms(m.avgDwell),
      avgFlightValue: ms(m.avgFlight),
      rhythmValue: ms(m.stdFlight),
      topDigraphValue: m.ddTimes.length + ' / ' + m.flightTimes.length,
      styleValue: String(m.incomplete),
      uniquenessValue: String(m.interruptions)
    };
    for (const [id, value] of Object.entries(values)) document.getElementById(id).textContent = value;
    document.getElementById('analysisText').textContent = t('interpretation');
    showAnalysis();
  }

  function showAnalysis() {
    document.getElementById('analysisSection').hidden = false;
  }

  function hideAnalysis() {
    document.getElementById('analysisSection').hidden = true;
    document.querySelectorAll('#analysisSection .metric-value').forEach(el => { el.textContent = '—'; });
    document.getElementById('analysisText').textContent = '';
  }

  function recordEvent(event) {
    if (!state.running) return false;
    const elapsed = performance.now() - state.startedAt;
    if (elapsed > Core.LIMITS.time || state.events.length >= Core.LIMITS.events) {
      stopCapture('eventLimit');
      return false;
    }
    state.events.push({ ...event, t: Math.max(0, elapsed) });
    if (state.events.length === Core.LIMITS.events) stopCapture('eventLimit');
    return true;
  }

  function compositionBoundary() {
    if (!state.running) return;
    state.context.imeUsed = true;
    state.keyStates.clear();
    recordEvent({ type: 'break' });
  }

  function handleKeyDown(e) {
    if (!state.running || e.repeat) return;
    if (els.imeToggle.checked && (e.isComposing || composing || e.keyCode === 229)) {
      compositionBoundary();
      return;
    }
    const code = (e.code || 'Unknown').slice(0, 50);
    if (state.keyStates.has(code)) return;
    const key = (e.key || 'Unknown').slice(0, 50);
    if (recordEvent({ type: 'down', code, key }) && state.running) state.keyStates.set(code, key);
  }

  function handleKeyUp(e) {
    if (!state.running || (els.imeToggle.checked && (e.isComposing || composing || e.keyCode === 229))) return;
    const code = (e.code || 'Unknown').slice(0, 50);
    if (!state.keyStates.has(code)) return;
    const key = state.keyStates.get(code);
    state.keyStates.delete(code);
    recordEvent({ type: 'up', code, key });
  }

  function calculateMetrics() {
    state.metrics = Core.analyze(state.events, els.editor.value);
    state.digraphs = state.metrics.digraphs;
  }

  const average = values => Core.mean(values);

  function updateUI() {
    els.btnStart.disabled = state.running || importing;
    els.btnStop.disabled = !state.running;
    els.btnClear.disabled = state.running;
    els.editor.disabled = !state.running;
    els.mode.disabled = state.running;
    els.imeToggle.disabled = state.running;
    els.phrase.disabled = state.running || els.mode.value !== 'custom';
    els.btnSave.disabled = state.running || importing || !state.metrics.totalKeys;
    els.btnExport.disabled = state.profiles.length === 0;
    els.btnImport.disabled = state.running || importing;
    els.btnCompare.disabled = state.running || state.profiles.length < 2;
    document.getElementById('btnDelete').disabled = state.running || importing;
    const values = document.querySelectorAll('.grid.three .stat__value');
    const m = state.metrics;
    values[0].textContent = m.totalKeys || '—';
    values[1].textContent = m.totalKeys ? (m.duration / 1000).toFixed(2) + ' s' : '—';
    values[2].textContent = m.totalKeys ? ms(m.avgDwell) + ' / ' + ms(m.avgDD) : '—';
    document.getElementById('profileCount').textContent = state.profiles.length + ' / 50';
    els.editor.placeholder = state.running ? t('typePlaceholder') : t('beginPlaceholder');
  }

  function renderVisualizations() {
    renderTimeline();
    renderRhythm();
    renderHeatmap();
  }

  function renderTimeline() {
    try {
      const canvas = createCanvas(els.viz.timeline);
      if (!canvas) {
        console.error('Failed to create canvas for timeline');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      const events = state.events;
      const colors = getThemeColors();
      const vizConfig = getVizConfig();
      
      if (events.length === 0) {
        return;
      }
    
    const width = canvas.width;
    const height = canvas.height;
    const config = vizConfig.timeline;
    const padding = config.margin.left;
    const barHeight = config.barHeight;
    const isLight = document.documentElement.classList.contains('light-mode');
    
    ctx.clearRect(0, 0, width, height);
    
    const maxTime = Math.max(1, events[events.length - 1].t);
    const scale = (width - 2 * padding) / maxTime;
    
    // Track text positions to avoid overlaps
    const textPositions = [];
    
    // Draw key press bars with improved colors and visibility
    (state.metrics.strokes || []).forEach(event => {
      if (event.type === 'down') {
        const upEvent = event.up === null ? null : { t: event.up };
        
        if (upEvent) {
          const x = padding + event.t * scale;
          const w = Math.max(2, (upEvent.t - event.t) * scale); // Minimum width for visibility
          const y = height / 2 - barHeight / 2;
          
          // Enhanced bar colors using theme colors
          const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, colors.primary || '#4da3ff');
          gradient.addColorStop(1, colors.accent || '#7bd389');
          ctx.fillStyle = gradient;
          
          // Draw bar with rounded corners effect
          ctx.fillRect(x, y, w, barHeight);
          
          // Add subtle border for definition
          ctx.strokeStyle = colors.border || '#1f2640';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, w, barHeight);
          
          // Enhanced multi-layer text positioning with adaptive sizing
          if (w >= 6) { // Show label for even smaller bars
            const text = event.key.toUpperCase();
            const dwellTime = upEvent.t - event.t;
            
            // Calculate adaptive font size based on density and importance
            const density = Math.min(events.length / 50, 1); // 0-1 density factor
            const importance = Math.min(dwellTime / 200, 1); // 0-1 importance factor
            const baseFontSize = Math.max(8, config.fontSize - density * 3 + importance * 2);
            const adaptiveFontSize = Math.min(12, Math.max(8, baseFontSize));
            
            ctx.font = `bold ${adaptiveFontSize}px ${config.fontFamily}`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width + 4;
            const textHeight = adaptiveFontSize + 2;
            
            // Define 4 positioning layers with adequate spacing
            const layers = [
              { y: y - textHeight - 4, priority: 1, name: 'above' },      // Above bar
              { y: y + barHeight/2 - textHeight/2, priority: 0, name: 'center' }, // Center of bar
              { y: y + barHeight + 4, priority: 2, name: 'below' },       // Below bar
              { y: y - textHeight * 2 - 8, priority: 3, name: 'far-above' } // Far above
            ];
            
            // Calculate preferred X position (center of bar)
            let preferredX = x + w/2 - textWidth/2;
            preferredX = Math.max(padding + 2, Math.min(preferredX, width - padding - textWidth - 2));
            
            let bestPosition = null;
            let bestLayer = null;
            
            // Try each layer systematically
            for (const layer of layers.sort((a, b) => a.priority - b.priority)) {
              // Check if layer Y position is within canvas bounds
              if (layer.y < 0 || layer.y + textHeight > height) continue;
              
              let finalX = preferredX;
              let hasCollision = false;
              
              // Check for collisions at preferred position
              for (const pos of textPositions) {
                if (Math.abs(finalX - pos.x) < textWidth + 2 && 
                    Math.abs(layer.y - pos.y) < textHeight + 2) {
                  hasCollision = true;
                  break;
                }
              }
              
              // If collision, try alternative X positions
              if (hasCollision) {
                const alternativePositions = [
                  preferredX + textWidth + 4,  // Right side
                  preferredX - textWidth - 4,  // Left side
                  preferredX + textWidth * 0.7, // Slight right offset
                  preferredX - textWidth * 0.7  // Slight left offset
                ];
                
                for (const altX of alternativePositions) {
                  // Ensure within bounds
                  const clampedX = Math.max(padding + 2, Math.min(altX, width - padding - textWidth - 2));
                  
                  // Check collision at alternative position
                  let altHasCollision = false;
                  for (const pos of textPositions) {
                    if (Math.abs(clampedX - pos.x) < textWidth + 2 && 
                        Math.abs(layer.y - pos.y) < textHeight + 2) {
                      altHasCollision = true;
                      break;
                    }
                  }
                  
                  if (!altHasCollision) {
                    finalX = clampedX;
                    hasCollision = false;
                    break;
                  }
                }
              }
              
              // If no collision found, use this layer
              if (!hasCollision) {
                bestPosition = { x: finalX, y: layer.y };
                bestLayer = layer;
                break;
              }
            }
            
            // Render the text if a good position was found
            if (bestPosition) {
              // Draw background with layer-appropriate styling
              const alpha = bestLayer.name === 'center' ? 0.95 : 0.85;
              ctx.fillStyle = isLight ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
              ctx.fillRect(bestPosition.x, bestPosition.y, textWidth, textHeight);
              
              // Add subtle border for better definition
              ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(bestPosition.x, bestPosition.y, textWidth, textHeight);
              
              // Render high contrast text
              ctx.fillStyle = isLight ? '#1A202C' : '#F7FAFC';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, bestPosition.x + textWidth/2, bestPosition.y + textHeight/2);
              
              // Add timing info for important events
              if (dwellTime > 100 && adaptiveFontSize >= 10) {
                ctx.font = `${Math.max(7, adaptiveFontSize - 2)}px ${config.fontFamily}`;
                ctx.fillStyle = isLight ? '#4A5568' : '#A0AEC0';
                ctx.fillText(`${dwellTime}ms`, bestPosition.x + textWidth/2, bestPosition.y + textHeight + 10);
              }
              
              // Reset font and alignment
              ctx.font = `bold ${adaptiveFontSize}px ${config.fontFamily}`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'alphabetic';
              
              // Store position for future collision detection
              textPositions.push({ 
                x: bestPosition.x, 
                y: bestPosition.y, 
                width: textWidth, 
                height: textHeight,
                layer: bestLayer.name
              });
            }
          }
        }
      }
    });
    
    // Enhanced time axis with scale markers
    ctx.strokeStyle = colors.border || '#1f2640';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Add time scale markers
    const numMarkers = 5;
    ctx.fillStyle = colors.textMuted || '#9fb0d8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= numMarkers; i++) {
      const markerX = padding + (width - 2 * padding) * i / numMarkers;
      const timeMs = maxTime * i / numMarkers;
      
      // Draw marker line
      ctx.beginPath();
      ctx.moveTo(markerX, height - padding);
      ctx.lineTo(markerX, height - padding + 5);
      ctx.stroke();
      
      // Draw time label
      ctx.fillText(`${(timeMs / 1000).toFixed(1)}s`, markerX, height - padding + 18);
    }
    
    ctx.textAlign = 'left';
    } catch (error) {
      console.error('Error in renderTimeline:', error);
    }
  }

  function renderRhythm() {
    try {
      const canvas = createCanvas(els.viz.rhythm);
      if (!canvas) {
        console.error('Failed to create canvas for rhythm');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      const events = state.events.filter(e => e.type === 'down');
      const colors = getThemeColors();
      const vizConfig = getVizConfig();
      const isLight = document.documentElement.classList.contains('light-mode');
      
      if (events.length < 2) {
        return;
      }
    
    const width = canvas.width;
    const height = canvas.height;
    const config = vizConfig.rhythm;
    const padding = config.margin.left;
    
    ctx.clearRect(0, 0, width, height);
    
    // Calculate intervals
    const intervals = state.metrics.ddTimes || [];
    if (!intervals.length) return;
    
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);
    const avgInterval = average(intervals);
    const xScale = (width - 2 * padding) / intervals.length;
    const yScale = (height - 2 * padding - 20) / Math.max(1, maxInterval);
    
    // Draw background grid for better readability
    ctx.strokeStyle = colors.border || '#1f2640';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 1; i < gridLines; i++) {
      const y = padding + (height - 2 * padding) * i / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Create gradient for the waveform using theme colors
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, colors.success || '#7bd389'); // Green at top (fast)
    gradient.addColorStop(0.5, colors.primary || '#4da3ff'); // Primary color in middle
    gradient.addColorStop(1, colors.warning || '#ffc107'); // Warning color at bottom (slow)
    
    // Draw filled area under waveform
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    intervals.forEach((interval, i) => {
      const x = padding + i * xScale;
      const y = height - padding - interval * yScale;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + (intervals.length - 1) * xScale, height - padding);
    ctx.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    const primaryColor = colors.primary || '#4da3ff';
    const primaryWithAlpha = primaryColor + (primaryColor.startsWith('#') ? '30' : '');
    fillGradient.addColorStop(0, primaryColor + (primaryColor.startsWith('#') ? '30' : ''));
    fillGradient.addColorStop(1, primaryColor + (primaryColor.startsWith('#') ? '10' : ''));
    ctx.fillStyle = fillGradient;
    ctx.fill();
    
    // Draw main waveform line
    ctx.strokeStyle = colors.primary || '#4da3ff';
    ctx.lineWidth = config.lineWidth;
    ctx.beginPath();
    
    intervals.forEach((interval, i) => {
      const x = padding + i * xScale;
      const y = height - padding - interval * yScale;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw data points for better visibility
    ctx.fillStyle = colors.accent || '#7bd389';
    intervals.forEach((interval, i) => {
      const x = padding + i * xScale;
      const y = height - padding - interval * yScale;
      
      ctx.beginPath();
      ctx.arc(x, y, config.pointRadius, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw average line with label
    const avgY = height - padding - avgInterval * yScale;
    ctx.strokeStyle = isLight ? '#DC2626' : '#FCA5A5';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, avgY);
    ctx.lineTo(width - padding, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Add average label
    ctx.fillStyle = isLight ? '#DC2626' : '#FCA5A5';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Avg: ${avgInterval.toFixed(0)}ms`, width - padding - 5, avgY - 5);
    
    // Add Y-axis labels
    ctx.fillStyle = colors.textMuted;
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxInterval.toFixed(0)}ms`, padding - 5, padding + 5);
    ctx.fillText(`${minInterval.toFixed(0)}ms`, padding - 5, height - padding + 5);
    
    ctx.textAlign = 'left';
    } catch (error) {
      console.error('Error in renderRhythm:', error);
    }
  }

  function renderHeatmap() {
    try {
      const canvas = createCanvas(els.viz.heatmap);
      if (!canvas) {
        console.error('Failed to create canvas for heatmap');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      const colors = getThemeColors();
      const vizConfig = getVizConfig();
      
      // Count key frequencies
      const keyFreq = new Map();
      state.events.filter(e => e.type === 'down').forEach(event => {
        const count = keyFreq.get(event.key) || 0;
        keyFreq.set(event.key, count + 1);
      });
      
      document.getElementById('keyCounts').textContent = [...keyFreq].map(([key, count]) =>
        JSON.stringify(key) + ': ' + count).join(' / ');
      
      // Always render keyboard layout, even with no data
      const hasData = keyFreq.size > 0;
    
    const width = canvas.width;
    const height = canvas.height;
    const config = vizConfig.heatmap;
    
    ctx.clearRect(0, 0, width, height);
    
    // Use keyboard layout from config
    const rows = config.keyboardLayout.rows;
    
    const maxFreq = hasData ? Math.max(...keyFreq.values()) : 1;
    // Use configurable key size
    const keySize = Math.min(config.cellSize, (width - 120) / 14); // Adjusted for Backspace row
    const keyGap = config.spacing;
    // Calculate total width based on the longest row (first row with Backspace)
    // Account for variable key widths in the calculation
    let maxRowWidth = 0;
    rows.forEach(row => {
      let rowWidth = 0;
      row.forEach(key => {
        let keyWidth = keySize;
        if (key === 'Backspace') keyWidth = keySize * 1.5;
        else if (key === 'Tab') keyWidth = keySize * 1.2;
        else if (key === 'CapsLock') keyWidth = keySize * 1.3;
        else if (key === 'Enter') keyWidth = keySize * 1.4;
        else if (key === ' ') keyWidth = keySize * 6.0;  // Space bar - much wider to fill the row
        rowWidth += keyWidth + keyGap;
      });
      rowWidth -= keyGap; // Remove last gap
      maxRowWidth = Math.max(maxRowWidth, rowWidth);
    });
    
    const totalWidth = maxRowWidth;
    const startX = (width - totalWidth) / 2;
    
    // Draw legend first at the top when there's data
    let legendHeight = 0;
    if (hasData && maxFreq > 0) {
      const legendY = 20;
      const legendWidth = 200;
      const legendBarHeight = 12;
      const legendX = (width - legendWidth) / 2;
      
      // Legend gradient
      const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
      const isLight = document.documentElement.classList.contains('light-mode');
      
      if (isLight) {
        gradient.addColorStop(0, 'rgba(30, 100, 255, 0.4)');    // Light blue
        gradient.addColorStop(0.5, 'rgba(130, 60, 155, 0.7)');  // Purple
        gradient.addColorStop(1, 'rgba(230, 20, 155, 1.0)');    // Red
      } else {
        gradient.addColorStop(0, 'rgba(0, 0, 255, 0.6)');       // Blue
        gradient.addColorStop(0.5, 'rgba(127, 90, 127, 0.8)');  // Purple
        gradient.addColorStop(1, 'rgba(255, 180, 0, 1.0)');     // Yellow/red
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(legendX, legendY, legendWidth, legendBarHeight);
      ctx.strokeStyle = colors.border;
      ctx.strokeRect(legendX, legendY, legendWidth, legendBarHeight);
      
      // Legend labels
      ctx.fillStyle = colors.text;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('1' + t('count'), legendX, legendY + legendBarHeight + 15);
      ctx.textAlign = 'right';
      ctx.fillText(maxFreq + t('count'), legendX + legendWidth, legendY + legendBarHeight + 15);
      ctx.textAlign = 'center';
      ctx.fillText(t('frequency'), legendX + legendWidth / 2, legendY + legendBarHeight + 15);
      
      legendHeight = 50; // Space for legend
    }
    
    const startY = 25 + legendHeight;
    
    // Create a set of all keys in the layout
    const layoutKeys = new Set();
    rows.forEach(row => row.forEach(key => layoutKeys.add(key)));
    
    // Find keys that were pressed but not in layout
    const extraKeys = [];
    keyFreq.forEach((freq, key) => {
      if (!layoutKeys.has(key) && key !== ' ') {
        extraKeys.push(key);
      }
    });
    
    rows.forEach((row, rowIdx) => {
      let currentX = startX;
      
      // Row-specific horizontal offset for staggered layout
      if (rowIdx === 2) currentX += keySize * 0.5;  // A row offset
      else if (rowIdx === 3) currentX += keySize * 1.5;  // Z row offset (larger to center the row)
      else if (rowIdx === 4) currentX += keySize * 3.0;  // Space bar centered offset
      
      row.forEach((key, colIdx) => {
        // Adjust key width for special keys
        let keyWidth = keySize;
        if (key === 'Backspace') keyWidth = keySize * 1.5;
        else if (key === 'Tab') keyWidth = keySize * 1.2;
        else if (key === 'CapsLock') keyWidth = keySize * 1.3;
        else if (key === 'Enter') keyWidth = keySize * 1.4;
        else if (key === ' ') keyWidth = keySize * 6.0;  // Space bar - much wider to fill the row
        
        const x = currentX;
        const y = startY + rowIdx * (keySize + keyGap);
        const freq = keyFreq.get(key) || 0;
        const intensity = hasData ? freq / maxFreq : 0;
        
        // Color based on frequency - proper heatmap, or base color if no data
        if (hasData && intensity > 0) {
          const isLight = document.documentElement.classList.contains('light-mode');
          
          if (isLight) {
            // Light mode: blue to red gradient
            const red = Math.floor(30 + intensity * 200);
            const green = Math.floor(100 - intensity * 80);
            const blue = Math.floor(255 - intensity * 100);
            const alpha = 0.4 + intensity * 0.6;
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          } else {
            // Dark mode: blue to yellow/red gradient
            const red = Math.floor(intensity * 255);
            const green = Math.floor(intensity * 180);
            const blue = Math.floor(255 - intensity * 255);
            const alpha = 0.6 + intensity * 0.4;
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          }
        } else {
          // Show neutral keyboard layout color
          const isLight = document.documentElement.classList.contains('light-mode');
          ctx.fillStyle = isLight ? '#f8f9fa' : colors.surface || '#141926';
        }
        
        ctx.fillRect(x, y, keyWidth, keySize);
        ctx.strokeStyle = colors.border;
        ctx.strokeRect(x, y, keyWidth, keySize);
        
        // Draw key label with proper mapping
        ctx.fillStyle = colors.text;
        ctx.font = `${config.fontSize}px ${config.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Use key mapping for display names, fallback to original key
        const displayKey = config.keyboardLayout.keyMap[key] || key.toUpperCase();
        ctx.fillText(displayKey, x + keyWidth / 2, y + keySize / 2);
        
        // Update currentX for next key
        currentX += keyWidth + keyGap;
      });
    });
    
    // Space bar is now handled in the regular keyboard layout (row 4), no separate rendering needed
    
    // Draw extra keys that are not in the standard layout
    if (extraKeys.length > 0) {
      const extraY = startY + rows.length * (keySize + keyGap) + 5;
      extraKeys.slice(0, 14).forEach((key, index) => {
        const extraX = startX + index * (keySize + keyGap);
        const freq = keyFreq.get(key) || 0;
        const intensity = freq / maxFreq;
        
        // Color based on frequency
        if (intensity > 0) {
          const isLight = document.documentElement.classList.contains('light-mode');
          if (isLight) {
            const red = Math.floor(30 + intensity * 200);
            const green = Math.floor(100 - intensity * 80);
            const blue = Math.floor(255 - intensity * 100);
            const alpha = 0.4 + intensity * 0.6;
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          } else {
            const red = Math.floor(intensity * 255);
            const green = Math.floor(intensity * 180);
            const blue = Math.floor(255 - intensity * 255);
            const alpha = 0.6 + intensity * 0.4;
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          }
        } else {
          ctx.fillStyle = colors.background;
        }
        
        ctx.fillRect(extraX, extraY, keySize, keySize);
        ctx.strokeStyle = colors.border;
        ctx.strokeRect(extraX, extraY, keySize, keySize);
        
        // Draw key label
        ctx.fillStyle = colors.text;
        ctx.font = `${Math.max(8, config.fontSize - 2)}px ${config.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayKey = config.keyboardLayout.keyMap[key] || key.toUpperCase();
        ctx.fillText(displayKey, extraX + keySize / 2, extraY + keySize / 2);
      });
    }
    
    // Legend is now drawn at the top, no need to draw it here again
    } catch (error) {
      console.error('Error in renderHeatmap:', error);
    }
  }

  function createCanvas(container) {
    const canvas = container.querySelector('canvas') || document.createElement('canvas');
    const minWidth = container.id === 'heatmap' ? 640 : 400;
    canvas.width = Math.max(minWidth, container.clientWidth - 28);
    canvas.height = container.id === 'heatmap' ? 380 : 200;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('viz')[['timeline', 'rhythm', 'heatmap'].indexOf(container.id)]);
    container.appendChild(canvas);
    return canvas;
  }

  function clearVisualizations() {
    // Clear visualization boxes (headers and help icons are now outside in HTML)
    els.viz.timeline.replaceChildren();
    els.viz.rhythm.replaceChildren();
    els.viz.heatmap.replaceChildren();
    
    // Clear digraph table
    const tbody = document.querySelector('table tbody');
    renderDigraphTable();
    
    // Show empty keyboard layout
    renderHeatmap();
  }

  function renderDigraphTable() {
    const tbody = document.querySelector('table tbody');
    tbody.replaceChildren();
    const rows = [...state.digraphs.values()].sort((a, b) => b.DD.length - a.DD.length).slice(0, 10);
    if (!rows.length) {
      const cell = tbody.insertRow().insertCell();
      cell.colSpan = 4;
      cell.textContent = t('noData');
    }
    for (const pair of rows) {
      const row = tbody.insertRow();
      for (const value of [pair.keys.join(' → '), ms(average(pair.DD)), ms(average(pair.UD)),
        pair.DD.length + ' / ' + pair.UD.length]) row.insertCell().textContent = value;
    }
  }

  function saveProfile() {
    if (state.running || importing || !state.metrics.totalKeys) return;
    if (state.profiles.length >= Core.LIMITS.profiles) {
      notify('profileLimit');
      return;
    }
    const name = prompt(t('namePrompt'));
    if (name === null) return;
    try {
      const profile = Core.validateProfiles([{ version: 2, name, timestamp: Date.now(),
        text: els.editor.value, events: state.events, context: state.context }])[0];
      state.profiles = Core.mergeProfiles(state.profiles, [profile]);
      document.getElementById('comparison').textContent = '';
      notify(saveProfiles() ? 'saved' :
        'saveFailed');
      updateUI();
    } catch {
      notify('invalidSave');
    }
  }

  function loadProfiles() {
    try {
      const saved = localStorage.getItem('keystroke_profiles');
      if (saved) state.profiles = Core.parseProfiles(saved);
    } catch {
      state.profiles = [];
      notify('loadFailed');
    }
  }

  function saveProfiles() {
    try {
      const json = Core.exportProfiles(state.profiles);
      if (new TextEncoder().encode(json).length > Core.LIMITS.bytes) return false;
      localStorage.setItem('keystroke_profiles', json);
      return true;
    } catch {
      return false;
    }
  }

  function deleteProfiles() {
    if (state.running || importing || !confirm(t('deleteConfirm'))) return;
    try {
      localStorage.removeItem('keystroke_profiles');
      state.profiles = [];
      document.getElementById('comparison').textContent = '';
      notify('deleted');
    } catch {
      notify('deleteFailed');
    }
    updateUI();
  }

  function exportJSON() {
    if (!state.profiles.length) return;
    const blob = new Blob([Core.exportProfiles(state.profiles)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'keystroke_profiles.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importJSON() {
    if (!state.running && !importing) els.fileInput.click();
  }

  async function handleFileImport(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || state.running || importing) return;
    if (file.size > Core.LIMITS.bytes) {
      notify('sizeLimit');
      return;
    }
    importing = true;
    updateUI();
    try {
      const profiles = Core.parseProfiles(await file.text());
      state.profiles = Core.mergeProfiles(state.profiles, profiles);
      document.getElementById('comparison').textContent = '';
      notify(saveProfiles() ? 'imported' :
        'importUnsaved');
    } catch {
      notify('invalidImport');
    } finally {
      importing = false;
      updateUI();
    }
  }

  function compareProfiles() {
    if (state.profiles.length < 2) return;
    const lines = [t('cosineNote')];
    for (let i = 0; i < state.profiles.length - 1; i++) {
      for (let j = i + 1; j < state.profiles.length; j++) {
        const a = state.profiles[i], b = state.profiles[j];
        const value = Core.comparable(a, b) ? Core.cosine(a.metrics, b.metrics) : null;
        lines.push(a.name + ' / ' + b.name + ': ' +
          (value === null ? t('incomparable') : value.toFixed(4)));
      }
    }
    document.getElementById('comparison').textContent = lines.join('\n');
  }


  // Start the app
  document.addEventListener('DOMContentLoaded', init);
})();
