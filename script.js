'use strict';

/**
 * KeyPress Pattern Analyzer
 * Keystroke dynamics capture and visualization
 */

(function () {
  const Core = window.KeystrokeCore;
  let captureTimer = null;
  let composing = false;
  let importing = false;
  function notify(message) {
    document.getElementById('status').textContent = message;
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
    // Suppress browser extension errors that don't affect functionality
    window.addEventListener('error', function(e) {
      if (e.filename && e.filename.includes('content.js')) {
        e.preventDefault();
        console.info('Browser extension error suppressed (does not affect KeyPress Pattern Analyzer)');
        return false;
      }
    });
    
    window.addEventListener('unhandledrejection', function(e) {
      if (e.reason && e.reason.message && e.reason.message.includes('message port closed')) {
        e.preventDefault();
        console.info('Browser extension promise rejection suppressed (does not affect KeyPress Pattern Analyzer)');
        return false;
      }
    });
    
    loadProfiles();
    loadTheme();
    bindEvents();
    initTooltips();
    updateUI();
    els.phrase.value = DEFAULT_PHRASE;
    clearVisualizations(); // Show initial keyboard layout
  }

  function initTooltips() {
    // Enhance button tooltips with better positioning
    const buttons = document.querySelectorAll('button[data-tooltip]');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', function() {
        // Additional tooltip logic if needed
      });
    });

    // Custom tooltips for visualization help icons
    const vizHelpIcons = document.querySelectorAll('.viz-header .viz-help');
    vizHelpIcons.forEach(icon => {
      let activeTooltip = null;
      
      const showTooltip = (e) => {
        // Remove any existing tooltip
        if (activeTooltip) {
          activeTooltip.remove();
          activeTooltip = null;
        }
        
        const tooltipText = icon.getAttribute('title');
        if (!tooltipText) return;
        
        // Remove title attribute to prevent native tooltip
        icon.setAttribute('data-original-title', tooltipText);
        icon.removeAttribute('title');
        
        // Create tooltip element
        activeTooltip = document.createElement('div');
        activeTooltip.className = 'custom-viz-tooltip';
        activeTooltip.innerHTML = tooltipText;
        
        // Apply high z-index and styling
        Object.assign(activeTooltip.style, {
          position: 'fixed',
          background: 'var(--panel)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          lineHeight: '1.4',
          maxWidth: '300px',
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          zIndex: '2147483647', // Maximum safe z-index value
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          opacity: '0',
          transform: 'translateY(-5px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease'
        });
        
        document.body.appendChild(activeTooltip);
        
        // Position tooltip - ALWAYS above to avoid card overlapping
        const iconRect = icon.getBoundingClientRect();
        const tooltipRect = activeTooltip.getBoundingClientRect();
        
        // ALWAYS position above the icon to avoid stacking context issues
        let left = iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2);
        let top = iconRect.top - tooltipRect.height - 12; // Above with more space
        
        // Boundary adjustments for horizontal positioning
        const margin = 10;
        if (left < margin) left = margin;
        if (left + tooltipRect.width > window.innerWidth - margin) {
          left = window.innerWidth - tooltipRect.width - margin;
        }
        
        // If tooltip goes above viewport, position at top of screen
        if (top < margin) {
          top = margin;
        }
        
        activeTooltip.style.left = `${left}px`;
        activeTooltip.style.top = `${top}px`;
        
        // Animate in
        requestAnimationFrame(() => {
          activeTooltip.style.opacity = '1';
          activeTooltip.style.transform = 'translateY(0)';
        });
      };
      
      const hideTooltip = () => {
        if (activeTooltip) {
          activeTooltip.style.opacity = '0';
          activeTooltip.style.transform = 'translateY(-5px)';
          setTimeout(() => {
            if (activeTooltip && activeTooltip.parentNode) {
              activeTooltip.remove();
            }
            activeTooltip = null;
          }, 200);
        }
        
        // Restore title attribute for accessibility
        const originalTitle = icon.getAttribute('data-original-title');
        if (originalTitle) {
          icon.setAttribute('title', originalTitle);
        }
      };
      
      // Event listeners
      icon.addEventListener('mouseenter', showTooltip);
      icon.addEventListener('mouseleave', hideTooltip);
      icon.addEventListener('focus', showTooltip);
      icon.addEventListener('blur', hideTooltip);
      
      // Mobile support
      icon.addEventListener('touchstart', (e) => {
        e.preventDefault();
        showTooltip(e);
        setTimeout(hideTooltip, 3000);
      });
      
      // Click support
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeTooltip) {
          hideTooltip();
        } else {
          showTooltip(e);
        }
      });
    });

    // Mobile touch support for other help icons
    const otherHelpIcons = document.querySelectorAll('.help-icon, .stat-help');
    otherHelpIcons.forEach(icon => {
      icon.addEventListener('touchstart', function(e) {
        e.preventDefault();
        this.classList.add('active');
        setTimeout(() => {
          this.classList.remove('active');
        }, 3000);
      });
    });
  }


  function loadTheme() {
    try {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      // Validate theme value to prevent injection
      if (savedTheme !== 'light' && savedTheme !== 'dark') {
        console.warn('Invalid theme value, using default');
        return;
      }
      
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.body.classList.add('light-mode');
        document.getElementById('themeIcon').textContent = '🌙';
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
      // Fallback to dark theme is default (no action needed)
    }
  }

  function toggleTheme() {
    const isLight = document.documentElement.classList.contains('light-mode');
    const themeIcon = document.getElementById('themeIcon');
    
    if (isLight) {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
      themeIcon.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
      themeIcon.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    }
    
    // Re-render visualizations if they exist
    if (state.metrics.totalKeys) {
      renderVisualizations();
    }
  }

  function getThemeColors() {
    const isLight = document.documentElement.classList.contains('light-mode');
    return {
      primary: isLight ? '#0066cc' : '#4da3ff',
      secondary: isLight ? '#28a745' : '#7bd389',
      text: isLight ? '#1a1d23' : '#e6ecff',
      muted: isLight ? '#6c757d' : '#9fb0d8',
      border: isLight ? '#e1e5eb' : '#1f2640',
      background: isLight ? '#f8f9fa' : '#0f1422',
      panel: isLight ? '#ffffff' : '#141926'
    };
  }

  function bindEvents() {
    els.btnStart.addEventListener('click', startCapture);
    els.btnStop.addEventListener('click', stopCapture);
    els.btnClear.addEventListener('click', clearAll);
    els.btnSave.addEventListener('click', saveProfile);
    els.btnExport.addEventListener('click', exportJSON);
    els.btnImport.addEventListener('click', importJSON);
    els.btnCompare.addEventListener('click', compareProfiles);
    
    els.editor.addEventListener('keydown', handleKeyDown);
    els.editor.addEventListener('keyup', handleKeyUp);
    els.editor.addEventListener('blur', () => stopCapture('入力欄から離れたため停止しました。未解放キーは欠測です。'));
    window.addEventListener('blur', () => stopCapture('ウィンドウから離れたため停止しました。'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopCapture('ページが非表示になったため停止しました。');
    });
    els.editor.addEventListener('compositionstart', () => { composing = true; compositionBoundary(); });
    els.editor.addEventListener('compositionend', () => { composing = false; compositionBoundary(); });
    els.editor.addEventListener('input', () => {
      if (els.editor.value.length > Core.LIMITS.text) {
        els.editor.value = els.editor.value.slice(0, Core.LIMITS.text);
        stopCapture('入力文字数の上限で停止しました。');
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
    notify('記録中です。秘密情報は入力しないでください。');
    captureTimer = setTimeout(() => stopCapture('時間上限で停止しました。'), Core.LIMITS.time);
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
    hideAnalysis();
    notify(typeof message === 'string' ? message : '記録を停止しました。');
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
    if (!state.metrics.totalKeys) return;
    
    const analysis = analyzeKeystrokePattern();
    displayAnalysisResults(analysis);
    showAnalysis();
  }

  function generateDetailedSummary(wpm, benchmarks, metrics, stability, uniqueness, digraphAnalysis, styleDetails) {
    let summary = '';
    
    // タイピング速度分析
    summary += `🎯 **タイピング速度分析**\n`;
    summary += `あなたの速度: ${wpm}WPM\n`;
    if (wpm >= benchmarks.wpm.expert) {
      summary += `→ 上級者レベル（平均${benchmarks.wpm.average}WPMを大きく上回る高速タイピング）\n`;
    } else if (wpm >= benchmarks.wpm.average) {
      summary += `→ 平均以上（平均${benchmarks.wpm.average}WPMを上回る良好な速度）\n`;
    } else if (wpm >= benchmarks.wpm.beginner) {
      summary += `→ 標準レベル（平均${benchmarks.wpm.average}WPMに向けて向上の余地あり）\n`;
    } else {
      summary += `→ 初心者レベル（練習により${benchmarks.wpm.beginner}WPM以上を目指せます）\n`;
    }
    summary += '\n';
    
    // タイミング特性分析
    summary += `⏱️ **タイミング特性分析**\n`;
    summary += `Dwell Time（キー押下時間）: ${metrics.avgDwell.toFixed(0)}ms\n`;
    if (metrics.avgDwell < benchmarks.dwellTime.fast) {
      summary += `→ 平均${benchmarks.dwellTime.average}msより短く、軽快なタッチ\n`;
    } else if (metrics.avgDwell > benchmarks.dwellTime.slow) {
      summary += `→ 平均${benchmarks.dwellTime.average}msより長く、確実な押下\n`;
    } else {
      summary += `→ 平均的な${benchmarks.dwellTime.average}ms前後で標準的\n`;
    }
    
    summary += `Flight Time（キー間移動時間）: ${metrics.avgFlight.toFixed(0)}ms\n`;
    if (metrics.avgFlight < benchmarks.flightTime.fast) {
      summary += `→ 平均${benchmarks.flightTime.average}msより短く、素早い指移動\n`;
    } else if (metrics.avgFlight > benchmarks.flightTime.slow) {
      summary += `→ 平均${benchmarks.flightTime.average}msより長く、慎重な選択\n`;
    } else {
      summary += `→ 平均的な${benchmarks.flightTime.average}ms前後で標準的\n`;
    }
    summary += '\n';
    
    // 安定性・一貫性分析
    summary += `📊 **安定性・一貫性分析**\n`;
    summary += `安定性スコア: ${stability.toFixed(0)}%\n`;
    if (stability >= benchmarks.stability.veryStable) {
      summary += `→ 非常に安定（平均${benchmarks.stability.stable}%を大きく上回る一貫性）\n`;
    } else if (stability >= benchmarks.stability.stable) {
      summary += `→ 安定（平均${benchmarks.stability.stable}%前後の良好な一貫性）\n`;
    } else {
      summary += `→ 不安定（平均${benchmarks.stability.stable}%を下回り、リズム改善の余地あり）\n`;
    }
    summary += `特徴: ${styleDetails.join('、')}\n\n`;
    
    // Digraphパターン分析
    if (digraphAnalysis.fast.length > 0 || digraphAnalysis.slow.length > 0) {
      summary += `🔤 **文字組み合わせパターン分析**\n`;
      if (digraphAnalysis.fast.length > 0) {
        summary += `高速処理パターン: ${digraphAnalysis.fast.slice(0, 5).join(', ')}\n`;
        summary += `→ これらの組み合わせは得意で素早く入力できています\n`;
      }
      if (digraphAnalysis.slow.length > 0) {
        summary += `時間要するパターン: ${digraphAnalysis.slow.slice(0, 5).join(', ')}\n`;
        summary += `→ これらの組み合わせは練習により改善可能です\n`;
      }
      if (digraphAnalysis.consistent.length > 0) {
        summary += `安定パターン: ${digraphAnalysis.consistent.slice(0, 3).join(', ')}\n`;
      }
      summary += '\n';
    }
    
    // 個人特性サマリー
    summary += `🎭 **個人特性サマリー**\n`;
    summary += `パターン多様性: ${uniqueness}%\n`;
    if (uniqueness >= 70) {
      summary += `→ 多様なキー組み合わせを使用し、豊富な表現力を持つタイピング\n`;
    } else if (uniqueness >= 50) {
      summary += `→ 標準的なキーパターンで、バランスの取れたタイピング\n`;
    } else {
      summary += `→ 特定のパターンに集中する効率重視のタイピング\n`;
    }
    
    // セキュリティ的総合評価
    summary += '\n🔒 **セキュリティ的総合評価**\n';
    
    // 個人識別性の評価
    let identifiabilityScore = 0;
    let spoofingResistance = '';
    let recommendedSecurity = '';
    
    // 安定性による識別性（高すぎても低すぎても問題）
    if (stability >= 70 && stability <= 85) {
      identifiabilityScore += 3; // 理想的な安定性
      summary += `✓ 安定性が理想的範囲（${stability.toFixed(0)}%）- 個人識別に適している\n`;
    } else if (stability > 85) {
      identifiabilityScore += 1;
      summary += `△ 安定性が高すぎ（${stability.toFixed(0)}%）- パターンが単調で模倣されやすい\n`;
    } else if (stability < 50) {
      identifiabilityScore += 1;
      summary += `△ 安定性が低い（${stability.toFixed(0)}%）- 本人認証時に誤判定の可能性\n`;
    } else {
      identifiabilityScore += 2;
      summary += `○ 安定性が適度（${stability.toFixed(0)}%）- 識別可能だが改善の余地あり\n`;
    }
    
    // パターンの多様性による耐性
    if (uniqueness >= 60) {
      identifiabilityScore += 3;
      summary += `✓ パターン多様性が高い（${uniqueness}%）- なりすまし困難\n`;
    } else if (uniqueness >= 40) {
      identifiabilityScore += 2;
      summary += `○ パターン多様性が中程度（${uniqueness}%）- 一定の耐性あり\n`;
    } else {
      identifiabilityScore += 1;
      summary += `△ パターンが単調（${uniqueness}%）- 観察により模倣される可能性\n`;
    }
    
    // タイミングの独自性
    const dwellUniqueness = Math.abs(metrics.avgDwell - benchmarks.dwellTime.average) / benchmarks.dwellTime.average;
    const flightUniqueness = Math.abs(metrics.avgFlight - benchmarks.flightTime.average) / benchmarks.flightTime.average;
    
    if (dwellUniqueness > 0.3 || flightUniqueness > 0.3) {
      identifiabilityScore += 2;
      summary += `✓ 独特なタイミング特性 - 個人特有のパターンが顕著\n`;
    } else if (dwellUniqueness > 0.15 || flightUniqueness > 0.15) {
      identifiabilityScore += 1;
      summary += `○ やや特徴的なタイミング - 識別には十分\n`;
    } else {
      summary += `△ 平均的なタイミング - 追加認証要素推奨\n`;
    }
    
    // 総合セキュリティレベル判定
    summary += '\n**🛡️ 生体認証適合性評価**\n';
    if (identifiabilityScore >= 7) {
      spoofingResistance = '高耐性';
      recommendedSecurity = '単体認証可能';
      summary += `🔒 高セキュリティレベル（${identifiabilityScore}/8点）\n`;
      summary += `→ キーストローク認証単体での使用が可能\n`;
      summary += `→ 攻撃者による模倣は非常に困難\n`;
      summary += `→ 継続認証システムに最適\n`;
    } else if (identifiabilityScore >= 5) {
      spoofingResistance = '中耐性';
      recommendedSecurity = '多要素認証推奨';
      summary += `⚡ 中セキュリティレベル（${identifiabilityScore}/8点）\n`;
      summary += `→ 他の認証要素との組み合わせ推奨\n`;
      summary += `→ 訓練された攻撃者には注意が必要\n`;
      summary += `→ パスワードとの併用で効果的\n`;
    } else {
      spoofingResistance = '低耐性';
      recommendedSecurity = '補助的認証のみ';
      summary += `⚠️ 低セキュリティレベル（${identifiabilityScore}/8点）\n`;
      summary += `→ 主要認証手段としては不適切\n`;
      summary += `→ 行動分析や異常検知での補助利用\n`;
      summary += `→ パターン改善により向上可能\n`;
    }
    
    // 音響解析との連携評価
    summary += '\n**🎤 音響解析連携評価**\n';
    if (digraphAnalysis.fast.length > 2 && digraphAnalysis.slow.length > 2) {
      summary += `✓ 音量パターンとの相関分析に適している\n`;
      summary += `→ Mic Gain Loggerとの併用で識別精度向上\n`;
      summary += `→ 複合的サイドチャネル攻撃の検証に有効\n`;
    } else {
      summary += `○ 基本的な音響パターン分析が可能\n`;
      summary += `→ より多様な入力での再分析を推奨\n`;
    }
    
    // 推奨セキュリティ対策
    summary += '\n**📋 推奨セキュリティ対策**\n';
    if (identifiabilityScore >= 7) {
      summary += `• キーストローク認証システムの主要要素として活用\n`;
      summary += `• リアルタイム継続認証の実装\n`;
      summary += `• 異常検知システムでの高精度判定\n`;
    } else if (identifiabilityScore >= 5) {
      summary += `• 従来認証との多要素組み合わせ\n`;
      summary += `• 定期的なパターン更新による精度向上\n`;
      summary += `• 環境要因を考慮した閾値調整\n`;
    } else {
      summary += `• より安定したパターン確立のための練習\n`;
      summary += `• 他の生体認証手段との併用検討\n`;
      summary += `• 行動ログ分析での補助利用\n`;
    }
    
    return summary;
  }

  function analyzeKeystrokePattern() {
    const metrics = state.metrics;
    const events = state.events;
    const text = els.editor.value;
    
    // 平均的な値（研究データに基づく目安）
    const benchmarks = {
      wpm: { beginner: 20, average: 35, expert: 60 },
      dwellTime: { fast: 80, average: 120, slow: 180 },
      flightTime: { fast: 120, average: 180, slow: 250 },
      stability: { unstable: 50, stable: 70, veryStable: 85 }
    };
    
    // Calculate WPM (already in metrics)
    const wpm = metrics.wpm;
    
    // Calculate typing efficiency (actual characters vs expected)
    const actualChars = text.length;
    const expectedChars = els.phrase.value.length || actualChars;
    const efficiency = expectedChars > 0 ? Math.round((actualChars / expectedChars) * 100) : 100;
    
    // Calculate stability (coefficient of variation for intervals)
    const cv = metrics.stdDD > 0 ? (metrics.stdDD / metrics.avgDD) * 100 : 0;
    const stability = Math.max(0, 100 - cv);
    
    // Calculate rhythm consistency (based on flight time variance)
    const rhythmConsistency = metrics.stdFlight > 0 ? 
      Math.max(0, 100 - (metrics.stdFlight / metrics.avgFlight) * 100) : 100;
    
    // 詳細なDigraph分析
    let digraphAnalysis = { fast: [], slow: [], consistent: [], variable: [] };
    let topDigraph = '—';
    let maxCount = 0;
    
    if (state.digraphs.size > 0) {
      for (const [digraph, data] of state.digraphs) {
        if (data.DD.length > maxCount) {
          maxCount = data.DD.length;
          topDigraph = digraph;
        }
        
        if (data.DD.length >= 2) {
          const avgTime = data.DD.reduce((a, b) => a + b, 0) / data.DD.length;
          const std = standardDeviation(data.DD);
          const cv = (std / avgTime) * 100;
          
          if (avgTime < 200) digraphAnalysis.fast.push(digraph);
          if (avgTime > 400) digraphAnalysis.slow.push(digraph);
          if (cv < 20) digraphAnalysis.consistent.push(digraph);
          if (cv > 40) digraphAnalysis.variable.push(digraph);
        }
      }
    }
    
    // より詳細なタイピングスタイル分析
    let typingStyle = '';
    let styleDetails = [];
    
    // Dwell time 分析
    if (metrics.avgDwell < benchmarks.dwellTime.fast) {
      typingStyle = '軽快型';
      styleDetails.push('キーを軽くタッチする傾向');
    } else if (metrics.avgDwell > benchmarks.dwellTime.slow) {
      typingStyle = '重厚型';
      styleDetails.push('キーをしっかり押し込む傾向');
    } else {
      typingStyle = 'バランス型';
      styleDetails.push('標準的なキー押下強度');
    }
    
    // Flight time 分析
    if (metrics.avgFlight < benchmarks.flightTime.fast) {
      styleDetails.push('指の移動が素早い');
    } else if (metrics.avgFlight > benchmarks.flightTime.slow) {
      styleDetails.push('慎重に次のキーを選択');
    }
    
    // 安定性分析
    if (cv > 30) {
      typingStyle += ' (不安定)';
      styleDetails.push('リズムのばらつきが大きい');
    } else if (cv < 15) {
      typingStyle += ' (高安定)';
      styleDetails.push('非常に一定したリズム');
    }
    
    // Calculate uniqueness score based on pattern variety
    const uniqueDigraphs = state.digraphs.size;
    const totalDigraphs = Math.max(1, metrics.totalKeys - 1);
    const uniqueness = Math.round((uniqueDigraphs / totalDigraphs) * 100);
    
    // 平均との比較分析を含むより詳細なサマリー生成
    let summaryText = generateDetailedSummary(wpm, benchmarks, metrics, stability, uniqueness, digraphAnalysis, styleDetails);
    
    return {
      wpm: wpm,
      efficiency: efficiency,
      stability: stability.toFixed(1),
      avgDwell: metrics.avgDwell.toFixed(1),
      avgFlight: metrics.avgFlight.toFixed(1),
      rhythmConsistency: rhythmConsistency.toFixed(1),
      topDigraph: topDigraph + (maxCount > 1 ? ` (×${maxCount})` : ''),
      typingStyle: typingStyle,
      uniqueness: uniqueness,
      summaryText: summaryText
    };
  }

  function formatAnalysisText(text) {
    // HTML escape function to prevent XSS
    function escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    
    // First escape the text, then apply safe formatting
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold** -> <strong>
      .replace(/\n/g, '<br>') // 改行を<br>に変換
      .replace(/→/g, '&nbsp;&nbsp;→') // 矢印の前にスペースを追加
      .replace(/(🎯|⏱️|📊|🔤|🎭|🏆|🔒|⚡|⚠️|✓|○|△|🛡️|🎤|📋)/g, '<span style="font-size: 1.1em;">$1</span>'); // 絵文字を少し大きく
  }

  function displayAnalysisResults(analysis) {
    // Performance metrics
    document.getElementById('wpmValue').textContent = analysis.wpm + ' WPM';
    document.getElementById('efficiencyValue').textContent = analysis.efficiency + '%';
    document.getElementById('stabilityValue').textContent = analysis.stability + '%';
    
    // Timing characteristics
    document.getElementById('avgDwellValue').textContent = analysis.avgDwell + 'ms';
    document.getElementById('avgFlightValue').textContent = analysis.avgFlight + 'ms';
    document.getElementById('rhythmValue').textContent = analysis.rhythmConsistency + '%';
    
    // Personal characteristics
    document.getElementById('topDigraphValue').textContent = analysis.topDigraph;
    document.getElementById('styleValue').textContent = analysis.typingStyle;
    document.getElementById('uniquenessValue').textContent = analysis.uniqueness + '%';
    
    // Summary text with proper formatting
    const analysisElement = document.getElementById('analysisText');
    analysisElement.innerHTML = formatAnalysisText(analysis.summaryText);
    
    // Add color coding
    updateValueColors('wpmValue', analysis.wpm, [20, 40]);
    updateValueColors('efficiencyValue', analysis.efficiency, [80, 95]);
    updateValueColors('stabilityValue', parseFloat(analysis.stability), [60, 80]);
    updateValueColors('rhythmValue', parseFloat(analysis.rhythmConsistency), [60, 80]);
    updateValueColors('uniquenessValue', analysis.uniqueness, [50, 70]);
  }

  function updateValueColors(elementId, value, thresholds) {
    const element = document.getElementById(elementId);
    element.classList.remove('highlight', 'good', 'warning');
    
    if (value >= thresholds[1]) {
      element.classList.add('good');
    } else if (value >= thresholds[0]) {
      element.classList.add('highlight');
    } else {
      element.classList.add('warning');
    }
  }

  function showAnalysis() {
    document.getElementById('analysisSection').style.display = 'block';
  }

  function hideAnalysis() {
    document.getElementById('analysisSection').style.display = 'none';
  }

  function recordEvent(event) {
    if (!state.running) return false;
    const elapsed = performance.now() - state.startedAt;
    if (elapsed > Core.LIMITS.time || state.events.length >= Core.LIMITS.events) {
      stopCapture('記録の上限で停止しました。');
      return false;
    }
    state.events.push({ ...event, t: Math.max(0, elapsed) });
    if (state.events.length === Core.LIMITS.events) stopCapture('記録の上限で停止しました。');
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
    // Enable/disable buttons
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
    document.getElementById('btnDelete').disabled = state.running || importing || !state.profiles.length;
    
    // Update summary stats
    const statsContainer = document.querySelector('.grid.three');
    if (state.metrics.totalKeys) {
      statsContainer.innerHTML = `
        <div class="stat">
          <span class="stat-help" title="総キー押下回数（スペースキー含む）">?</span>
          <div class="stat__label">Keystrokes</div>
          <div class="stat__value">${state.metrics.totalKeys}</div>
        </div>
        <div class="stat">
          <span class="stat-help" title="タイピング開始から終了までの総時間">?</span>
          <div class="stat__label">Duration</div>
          <div class="stat__value">${(state.metrics.duration / 1000).toFixed(2)}s</div>
        </div>
        <div class="stat">
          <span class="stat-help" title="Dwell: キー押下時間の平均 / DD: 連続キー間隔の平均">?</span>
          <div class="stat__label">Avg Dwell / DD</div>
          <div class="stat__value">${ms(state.metrics.avgDwell)} / ${ms(state.metrics.avgDD)}</div>
        </div>
      `;
    } else {
      statsContainer.innerHTML = `
        <div class="stat">
          <span class="stat-help" title="総キー押下回数（スペースキー含む）">?</span>
          <div class="stat__label">Keystrokes</div>
          <div class="stat__value">—</div>
        </div>
        <div class="stat">
          <span class="stat-help" title="タイピング開始から終了までの総時間">?</span>
          <div class="stat__label">Duration</div>
          <div class="stat__value">—</div>
        </div>
        <div class="stat">
          <span class="stat-help" title="Dwell: キー押下時間の平均 / DD: 連続キー間隔の平均">?</span>
          <div class="stat__label">Avg Dwell / DD</div>
          <div class="stat__value">—</div>
        </div>
      `;
    }
    
    // Update button texts
    els.btnStart.textContent = state.running ? 'Recording...' : 'Start';
    els.editor.placeholder = state.running ? 'Type here... (半角英数字推奨 / Half-width characters recommended)' : 'Click Start to begin recording';
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
      
      console.log('Debug Timeline: events length:', events.length);
      if (events.length === 0) {
        console.log('Debug Timeline: No events to render');
        return;
      }
    
    const width = canvas.width;
    const height = canvas.height;
    const config = vizConfig.timeline;
    const padding = config.margin.left;
    const barHeight = config.barHeight;
    const isLight = document.documentElement.classList.contains('light-mode');
    
    ctx.clearRect(0, 0, width, height);
    
    const maxTime = events[events.length - 1].t;
    const scale = (width - 2 * padding) / maxTime;
    
    // Track text positions to avoid overlaps
    const textPositions = [];
    
    // Draw key press bars with improved colors and visibility
    state.events.forEach(event => {
      if (event.type === 'down') {
        const upEvent = state.events.find(e => 
          e.type === 'up' && e.code === event.code && e.t > event.t
        );
        
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
            const dwellTime = event.dwellTime || 0;
            
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
      
      console.log('Debug Rhythm: down events length:', events.length);
      if (events.length < 2) {
        console.log('Debug Rhythm: Not enough events to render');
        return;
      }
    
    const width = canvas.width;
    const height = canvas.height;
    const config = vizConfig.rhythm;
    const padding = config.margin.left;
    
    ctx.clearRect(0, 0, width, height);
    
    // Calculate intervals
    const intervals = [];
    for (let i = 0; i < events.length - 1; i++) {
      intervals.push(events[i + 1].t - events[i].t);
    }
    
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);
    const avgInterval = average(intervals);
    const xScale = (width - 2 * padding) / intervals.length;
    const yScale = (height - 2 * padding - 20) / maxInterval;
    
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
    ctx.fillStyle = colors.muted;
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
      
      console.log('Debug Heatmap: key frequencies:', keyFreq.size);
      
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
      ctx.fillText('1回', legendX, legendY + legendBarHeight + 15);
      ctx.textAlign = 'right';
      ctx.fillText(`${maxFreq}回`, legendX + legendWidth, legendY + legendBarHeight + 15);
      ctx.textAlign = 'center';
      ctx.fillText('使用頻度', legendX + legendWidth / 2, legendY + legendBarHeight + 15);
      
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
      extraKeys.forEach((key, index) => {
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
    // Check if canvas already exists to avoid recreating
    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) {
      return existingCanvas; // Return existing canvas
    }
    
    // Clear container (no need to preserve titles/icons - they're now outside)
    container.innerHTML = '';
    
    // No need to recreate help icons or titles - they're now in the viz-header outside the viz-box
    
    const canvas = document.createElement('canvas');
    // Ensure minimum width for proper visualization, allow horizontal scroll if needed
    const minWidth = container.id === 'heatmap' ? 400 : 300;
    canvas.width = Math.max(minWidth, container.offsetWidth - 28); // Account for padding
    canvas.style.marginTop = '10px';
    canvas.style.maxWidth = 'none'; // Allow canvas to exceed container width
    
    // Different heights for different visualization types
    if (container.id === 'heatmap') {
      canvas.height = 280; // Much taller for keyboard layout + legend + extra keys
    } else if (container.id === 'timeline') {
      canvas.height = 120; // Shorter for timeline
    } else {
      canvas.height = 160; // Default for rhythm
    }
    
    container.appendChild(canvas);
    return canvas;
  }

  function clearVisualizations() {
    // Clear visualization boxes (headers and help icons are now outside in HTML)
    els.viz.timeline.innerHTML = '';
    els.viz.rhythm.innerHTML = '';
    els.viz.heatmap.innerHTML = '';
    
    // Clear digraph table
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="muted center">No data</td></tr>';
    
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
      cell.textContent = 'データなし';
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
      notify('保存上限は50件です。保存プロファイルを削除してください。');
      return;
    }
    const name = prompt('プロファイル名（50文字以内）');
    if (name === null) return;
    try {
      const profile = Core.validateProfiles([{ version: 2, name, timestamp: Date.now(),
        text: els.editor.value, events: state.events, context: state.context }])[0];
      state.profiles.push(profile);
      notify(saveProfiles() ? 'プロファイルを保存しました。' :
        '永続保存に失敗しました。この画面内には残っています。JSONを出力してください。');
      updateUI();
    } catch {
      notify('保存できません。名前・記録データを確認してください。');
    }
  }

  function loadProfiles() {
    try {
      const saved = localStorage.getItem('keystroke_profiles');
      if (saved) state.profiles = Core.parseProfiles(saved);
    } catch {
      state.profiles = [];
      notify('保存済みデータを読み込めません。元の保存内容は変更していません。');
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
    if (state.running || importing || !confirm('保存済みプロファイルをすべて削除しますか？')) return;
    try {
      localStorage.removeItem('keystroke_profiles');
      state.profiles = [];
      document.getElementById('comparison').textContent = '';
      notify('保存済みプロファイルを削除しました。ダウンロード済みJSONは削除されません。');
    } catch {
      notify('削除に失敗しました。ブラウザーのサイトデータ設定から削除してください。');
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
      notify('JSONは5,000,000バイト以下にしてください。');
      return;
    }
    importing = true;
    updateUI();
    try {
      const profiles = Core.parseProfiles(await file.text());
      if (state.profiles.length + profiles.length > Core.LIMITS.profiles) throw new Error('count');
      state.profiles = [...state.profiles, ...profiles];
      document.getElementById('comparison').textContent = '';
      notify(saveProfiles() ? '検証済みプロファイルを読み込み、保存しました。' :
        '読込は完了しましたが永続保存に失敗しました。JSONを出力してください。');
    } catch {
      notify('読込を拒否しました。JSONの形式・値・件数を確認してください。既存データは変更していません。');
    } finally {
      importing = false;
      updateUI();
    }
  }

  function compareProfiles() {
    if (state.profiles.length < 2) return;
    const lines = ['コサイン類似度（本人一致率ではありません）。全時間が2倍でも1になります。'];
    for (let i = 0; i < state.profiles.length - 1; i++) {
      for (let j = i + 1; j < state.profiles.length; j++) {
        const a = state.profiles[i], b = state.profiles[j];
        const value = Core.comparable(a, b) ? Core.cosine(a.metrics, b.metrics) : null;
        lines.push(a.name + ' / ' + b.name + ': ' +
          (value === null ? '比較不可（欠測・条件不一致・条件不明・ゼロベクトル）' : value.toFixed(4)));
      }
    }
    document.getElementById('comparison').textContent = lines.join('\n');
  }


  // Start the app
  document.addEventListener('DOMContentLoaded', init);
})();
