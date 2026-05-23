/* ============================================
   Fates Character Sheet — Application Logic
   ============================================ */

(() => {
  'use strict';

  // ── Constants ──
  const STORAGE_CHARS = 'fates-characters';
  const STORAGE_ACTIVE = 'fates-active-character';
  const STORAGE_ACCENT = 'fates-accent-color';

  const ATTRIBUTES = [
    'Athletics', 'Burglary', 'Contacts', 'Crafts',
    'Deceive', 'Drive', 'Empathy', 'Fight',
    'Investigate', 'Lore', 'Notice', 'Physique',
    'Provoke', 'Rapport', 'Resources', 'Shoot',
    'Stealth', 'Will',
  ];

  const TEXT_FIELD_IDS = [
    'name', 'race', 'concept', 'trouble',
    'aspect1', 'aspect2', 'aspect3', 'tier',
    'refresh', 'xp',
    'consequence-mild', 'consequence-moderate', 'consequence-severe',
    'extras', 'stunts',
  ];

  const ACCENT_PRESETS = [
    { name: 'Gold',    hex: '#c9a84c', h: 43,  s: 55, l: 54 },
    { name: 'Teal',    hex: '#4cb5a5', h: 170, s: 45, l: 50 },
    { name: 'Crimson', hex: '#c94c5a', h: 354, s: 55, l: 54 },
    { name: 'Violet',  hex: '#8b6cc9', h: 264, s: 45, l: 60 },
    { name: 'Sky',     hex: '#4c96c9', h: 207, s: 55, l: 54 },
    { name: 'Silver',  hex: '#9ea5b0', h: 218, s: 10, l: 65 },
  ];

  // ── Utility Functions ──
  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  }

  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }

  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }

  // ── Accent Color ──
  function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function applyAccent(hex) {
    const { h, s, l } = hexToHSL(hex);
    const root = document.documentElement.style;
    root.setProperty('--accent-h', h);
    root.setProperty('--accent-s', s + '%');
    root.setProperty('--accent-l', l + '%');
    const picker = document.getElementById('accent-picker');
    if (picker) picker.value = hex;
    try { localStorage.setItem(STORAGE_ACCENT, hex); } catch { /* ignore */ }
  }

  // ── Build Attributes ──
  function buildAttributes() {
    const root = document.getElementById('attributes-root');
    const opts = Array.from({ length: 11 }, (_, i) =>
      `<option value="${i}">${i}</option>`
    ).join('');

    const row = (name) => {
      const id = `attr-${name.toLowerCase()}`;
      return `<div class="attr-row">
        <label for="${id}">${name}</label>
        <select id="${id}" data-field="attr:${name}">${opts}</select>
      </div>`;
    };

    const left = ATTRIBUTES.filter((_, i) => i % 2 === 0).map(row).join('');
    const right = ATTRIBUTES.filter((_, i) => i % 2 === 1).map(row).join('');
    root.innerHTML = `
      <div class="attrs-column">${left}</div>
      <div class="attrs-column">${right}</div>
    `;
  }

  // ── Build Stress Boxes ──
  function buildStress(containerId, prefix, trackName) {
    const container = document.getElementById(containerId);
    container.innerHTML = [1, 2, 3, 4].map(n => {
      const id = `${prefix}-stress-${n}`;
      return `<div class="stress-slot">
        <input type="checkbox" id="${id}" data-field="${prefix}:${n}"
               aria-label="${trackName} box ${n}" />
        <label for="${id}">
          <span class="stress-slot-num">${n}</span>
        </label>
      </div>`;
    }).join('');
  }

  // ── Character Data ──
  function getAllChars() {
    return loadJSON(STORAGE_CHARS) || {};
  }

  function saveAllChars(chars) {
    saveJSON(STORAGE_CHARS, chars);
  }

  function getFormFields() {
    const fields = {};
    TEXT_FIELD_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) fields[id] = el;
    });
    document.querySelectorAll('[data-field^="attr:"]').forEach(el => {
      fields[el.dataset.field] = el;
    });
    document.querySelectorAll('[data-field^="physical:"], [data-field^="mental:"]').forEach(el => {
      fields[el.dataset.field] = el;
    });
    return fields;
  }

  function gatherData() {
    const data = {};
    Object.entries(getFormFields()).forEach(([key, el]) => {
      if (el.type === 'checkbox') data[key] = el.checked;
      else data[key] = el.value;
    });
    return data;
  }

  function populateSheet(data) {
    if (!data) return;
    Object.entries(data).forEach(([key, val]) => {
      const el = document.querySelector(`[data-field="${key}"]`) ||
                 document.getElementById(key);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = Boolean(val);
      else el.value = val == null ? '' : String(val);
    });
  }

  function clearSheet() {
    Object.values(getFormFields()).forEach(el => {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });
  }

  // ── Active Character ──
  let activeCharId = null;

  function saveActiveChar() {
    if (!activeCharId) return;
    const chars = getAllChars();
    const data = gatherData();
    chars[activeCharId] = {
      ...chars[activeCharId],
      fields: data,
      displayName: data.name || 'Unnamed Character',
      lastModified: new Date().toISOString(),
    };
    saveAllChars(chars);
    try { localStorage.setItem(STORAGE_ACTIVE, activeCharId); } catch { /* */ }
    flashSaveIndicator();
  }

  function loadChar(id) {
    const chars = getAllChars();
    const char = chars[id];
    if (!char) return;
    activeCharId = id;
    clearSheet();
    populateSheet(char.fields || {});
    try { localStorage.setItem(STORAGE_ACTIVE, id); } catch { /* */ }
    updateTitleName();
    hideModal();
  }

  function createNewChar() {
    const id = uuid();
    const chars = getAllChars();
    chars[id] = {
      displayName: 'New Character',
      fields: {},
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    saveAllChars(chars);
    activeCharId = id;
    clearSheet();
    try { localStorage.setItem(STORAGE_ACTIVE, id); } catch { /* */ }
    updateTitleName();
    hideModal();
    // Focus the name field
    setTimeout(() => {
      const nameField = document.getElementById('name');
      if (nameField) nameField.focus();
    }, 100);
  }

  function deleteChar(id) {
    if (!confirm('Delete this character? This cannot be undone.')) return;
    const chars = getAllChars();
    delete chars[id];
    saveAllChars(chars);
    if (activeCharId === id) {
      activeCharId = null;
      clearSheet();
    }
    renderCharList();
  }

  function updateTitleName() {
    const nameEl = document.getElementById('name');
    const titleEl = document.getElementById('active-char-name');
    if (titleEl) {
      const name = nameEl ? nameEl.value.trim() : '';
      titleEl.textContent = name ? ` — ${name}` : '';
    }
  }

  // ── Save Indicator ──
  let saveTimeout;
  function flashSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.textContent = 'Saved';
    el.classList.add('show');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => el.classList.remove('show'), 1500);
  }

  // ── Auto-save ──
  function bindAutosave() {
    let timer;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(saveActiveChar, 300);
    };
    const page = document.querySelector('.page');
    page.addEventListener('input', () => { debounced(); updateTitleName(); });
    page.addEventListener('change', debounced);
  }

  // ── Modal ──
  function showModal() {
    renderCharList();
    const overlay = document.getElementById('char-modal');
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  function hideModal() {
    const overlay = document.getElementById('char-modal');
    overlay.classList.remove('visible');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }

  function renderCharList() {
    const chars = getAllChars();
    const list = document.getElementById('char-list');
    const entries = Object.entries(chars);

    if (entries.length === 0) {
      list.innerHTML = '<li class="empty-state">No saved characters yet.</li>';
      return;
    }

    // Sort by last modified, newest first
    entries.sort((a, b) =>
      (b[1].lastModified || '').localeCompare(a[1].lastModified || '')
    );

    list.innerHTML = entries.map(([id, char]) => {
      const name = char.displayName || 'Unnamed';
      const race = char.fields?.race || '';
      const meta = race ? `${race}` : 'No details';
      const modified = char.lastModified
        ? new Date(char.lastModified).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
          })
        : '';

      return `<li class="char-list-item" data-id="${id}">
        <div class="char-info" data-action="load" data-id="${id}">
          <span class="char-name">${escapeHTML(name)}</span>
          <span class="char-meta">${escapeHTML(meta)}${modified ? ' · ' + modified : ''}</span>
        </div>
        <div class="char-actions">
          <button class="char-delete-btn" data-action="delete" data-id="${id}" title="Delete character">✕</button>
        </div>
      </li>`;
    }).join('');
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Migrate from legacy single-character storage ──
  function migrateFromLegacy() {
    const LEGACY_KEY = 'fates-character-sheet-v1';
    const raw = loadJSON(LEGACY_KEY);
    if (!raw) return;

    // Only migrate if we haven't already
    const chars = getAllChars();
    const id = uuid();
    chars[id] = {
      displayName: raw.name || 'Imported Character',
      fields: raw,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    saveAllChars(chars);

    // Remove the legacy key so we don't re-import
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* */ }

    // Set as active so it loads immediately
    try { localStorage.setItem(STORAGE_ACTIVE, id); } catch { /* */ }
  }

  // ── Init ──
  function init() {
    buildAttributes();
    buildStress('physical-stress', 'physical', 'Physical stress');
    buildStress('mental-stress', 'mental', 'Mental stress');

    // Migrate legacy data before anything else
    migrateFromLegacy();

    // Load saved accent
    const savedAccent = localStorage.getItem(STORAGE_ACCENT);
    if (savedAccent) applyAccent(savedAccent);

    // Accent color picker
    const picker = document.getElementById('accent-picker');
    if (picker) {
      if (savedAccent) picker.value = savedAccent;
      picker.addEventListener('input', (e) => applyAccent(e.target.value));
    }

    // Modal events
    const modal = document.getElementById('char-modal');
    document.getElementById('btn-new-char').addEventListener('click', createNewChar);

    const charList = document.getElementById('char-list');
    charList.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (action === 'load') loadChar(id);
      else if (action === 'delete') deleteChar(id);
    });

    // Title bar actions
    document.getElementById('btn-save').addEventListener('click', saveActiveChar);
    document.getElementById('btn-print').addEventListener('click', () => window.print());
    document.getElementById('btn-manage').addEventListener('click', showModal);

    // Auto-save
    bindAutosave();

    // Decide: show modal or load last character
    const chars = getAllChars();
    const lastActive = localStorage.getItem(STORAGE_ACTIVE);
    if (lastActive && chars[lastActive]) {
      loadChar(lastActive);
    } else if (Object.keys(chars).length > 0) {
      showModal();
    } else {
      showModal();
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
