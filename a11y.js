/* ============================================================
   DrayConnect — Accessibility preferences widget
   IS 5568 / Regulation 35 user-comfort tool.
   Scope fence: only toggles a11y-* classes on <html>. It never
   mutates content DOM, alt text, or ARIA. Not an "auto-fix" overlay.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'drayconnect_a11y_v1';
  var DEFAULTS = {
    version: 1,
    links: false,
    contrast: 'off',        // off | high | invert | mono
    textSize: 100,          // 100 | 115 | 130 | 150
    lineSpacing: 0,         // 0 | 16 | 20
    readableFont: false,
    highlightHeadings: false,
    cursorBlack: false,
    cursorLarge: false,
    reduceMotion: false
  };

  // Single source of truth: same class mapping as the <head> bootstrap.
  function applyPrefs(el, p) {
    var c = el.classList;
    c.toggle('a11y-links', !!p.links);
    c.toggle('a11y-contrast-high', p.contrast === 'high');
    c.toggle('a11y-contrast-invert', p.contrast === 'invert');
    c.toggle('a11y-contrast-mono', p.contrast === 'mono');
    c.toggle('a11y-text-115', p.textSize === 115);
    c.toggle('a11y-text-130', p.textSize === 130);
    c.toggle('a11y-text-150', p.textSize === 150);
    c.toggle('a11y-lines-16', p.lineSpacing === 16);
    c.toggle('a11y-lines-20', p.lineSpacing === 20);
    c.toggle('a11y-readable-font', !!p.readableFont);
    c.toggle('a11y-highlight-headings', !!p.highlightHeadings);
    c.toggle('a11y-cursor-black', !!p.cursorBlack);
    c.toggle('a11y-cursor-large', !!p.cursorLarge);
    c.toggle('a11y-reduce-motion', !!p.reduceMotion);
  }

  var prefs = load();
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.version === 1) return Object.assign({}, DEFAULTS, p);
      }
    } catch (e) {}
    return Object.assign({}, DEFAULTS);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
  }
  function commit() {
    applyPrefs(document.documentElement, prefs);
    save();
    render();
  }

  // Re-apply (bootstrap already ran, but this covers late load / no-bootstrap)
  applyPrefs(document.documentElement, prefs);

  // ---- Labels ----
  var CONTRAST_LABEL = { off: 'רגיל', high: 'ניגודיות גבוהה', invert: 'צבעים הפוכים', mono: 'שחור-לבן' };
  var LINES_LABEL = { 0: 'רגיל', 16: 'מוגדל', 20: 'כפול' };

  var TOGGLES = [
    { key: 'links', type: 'binary', label: 'הדגשת קישורים' },
    { key: 'contrast', type: 'cycle', label: 'ניגודיות', next: cycleContrast, valueLabel: function (p) { return CONTRAST_LABEL[p.contrast]; }, active: function (p) { return p.contrast !== 'off'; } },
    { key: 'textSize', type: 'cycle', label: 'גודל טקסט', next: cycleText, valueLabel: function (p) { return p.textSize + '%'; }, active: function (p) { return p.textSize !== 100; } },
    { key: 'lineSpacing', type: 'cycle', label: 'מרווח שורות', next: cycleLines, valueLabel: function (p) { return LINES_LABEL[p.lineSpacing]; }, active: function (p) { return p.lineSpacing !== 0; } },
    { key: 'readableFont', type: 'binary', label: 'גופן קריא' },
    { key: 'highlightHeadings', type: 'binary', label: 'הדגשת כותרות' },
    { key: 'cursorBlack', type: 'binary', label: 'סמן שחור' },
    { key: 'cursorLarge', type: 'binary', label: 'סמן גדול' },
    { key: 'reduceMotion', type: 'binary', label: 'עצירת אנימציות' }
  ];

  function cycleContrast(v) { return { off: 'high', high: 'invert', invert: 'mono', mono: 'off' }[v]; }
  function cycleText(v) { return { 100: 115, 115: 130, 130: 150, 150: 100 }[v]; }
  function cycleLines(v) { return { 0: 16, 16: 20, 20: 0 }[v]; }

  // ---- Build DOM ----
  var A11Y_ICON =
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="4.2" r="1.9"/><path d="M4 8h16M12 8v6M9 20l3-6 3 6"/></svg>';

  var trigger = document.createElement('button');
  trigger.id = 'a11y-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'פתיחת תפריט נגישות');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'a11y-panel');
  trigger.setAttribute('aria-keyshortcuts', 'Alt+A');
  trigger.innerHTML = A11Y_ICON;

  var panel = document.createElement('div');
  panel.id = 'a11y-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'a11y-title');
  panel.hidden = true;

  var head = document.createElement('div');
  head.className = 'a11y-head';
  var title = document.createElement('h2');
  title.id = 'a11y-title';
  title.textContent = 'התאמות נגישות';
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.id = 'a11y-close';
  closeBtn.setAttribute('aria-label', 'סגירת תפריט נגישות');
  closeBtn.innerHTML = '&times;';
  head.appendChild(title);
  head.appendChild(closeBtn);

  var grid = document.createElement('div');
  grid.className = 'a11y-grid';

  var buttons = {};
  TOGGLES.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'a11y-toggle';
    b.dataset.key = t.key;
    b.addEventListener('click', function () { onToggle(t); });
    grid.appendChild(b);
    buttons[t.key] = b;
  });

  var reset = document.createElement('button');
  reset.type = 'button';
  reset.id = 'a11y-reset';
  reset.textContent = 'איפוס הגדרות נגישות';
  reset.addEventListener('click', function () {
    prefs = Object.assign({}, DEFAULTS);
    commit();
    announce('הגדרות הנגישות אופסו.');
  });

  var stLink = document.createElement('a');
  stLink.href = 'accessibility.html';
  stLink.id = 'a11y-statement-link';
  stLink.textContent = 'להצהרת הנגישות המלאה';

  panel.appendChild(head);
  panel.appendChild(grid);
  panel.appendChild(reset);
  panel.appendChild(stLink);

  var live = document.createElement('div');
  live.id = 'a11y-live';
  live.className = 'a11y-sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');

  document.body.appendChild(trigger);
  document.body.appendChild(panel);
  document.body.appendChild(live);

  function announce(msg) { live.textContent = ''; window.setTimeout(function () { live.textContent = msg; }, 40); }

  function onToggle(t) {
    if (t.type === 'binary') {
      prefs[t.key] = !prefs[t.key];
    } else {
      prefs[t.key] = t.next(prefs[t.key]);
    }
    commit();
    var b = buttons[t.key];
    announce(b.getAttribute('aria-label'));
  }

  function render() {
    TOGGLES.forEach(function (t) {
      var b = buttons[t.key];
      var on, valueText, aria;
      if (t.type === 'binary') {
        on = !!prefs[t.key];
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        valueText = on ? 'פעיל' : 'כבוי';
        aria = t.label + ': ' + valueText;
      } else {
        on = t.active(prefs);
        b.removeAttribute('aria-pressed'); // cycles carry value in the name, not pressed-state
        valueText = t.valueLabel(prefs);
        aria = t.label + ': ' + valueText;
      }
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-label', aria);
      b.innerHTML = '<span class="a11y-tg-label">' + t.label + '</span><span class="a11y-tg-value">' + valueText + '</span>';
    });
  }
  render();

  // ---- Open / close + focus management ----
  var lastFocus = null;
  function focusables() {
    return [].slice.call(panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }
  function openPanel() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('click', onOutside, true);
    var f = focusables();
    if (f.length) f[0].focus();
  }
  function closePanel(returnFocus) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('click', onOutside, true);
    if (returnFocus !== false) (lastFocus || trigger).focus();
  }
  function isOpen() { return !panel.hidden; }
  function togglePanel() { isOpen() ? closePanel() : openPanel(); }

  trigger.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', function () { closePanel(); });

  function onOutside(e) {
    if (!panel.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) closePanel(false);
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Alt+A from any focus context — use e.code (layout-independent)
  document.addEventListener('keydown', function (e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyA') {
      e.preventDefault();
      togglePanel();
      if (isOpen()) announce('תפריט הנגישות נפתח');
    }
  });
})();
