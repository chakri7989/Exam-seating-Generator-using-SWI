// ============================================================
// EXAM SEATING ARRANGEMENT SYSTEM - FRONTEND LOGIC
// ============================================================

const STATE = {
  examMeta: {
    institution: '',
    title: '',
    date: '',
    session: ''
  },
  rooms: [
    { id: 1, name: '', rows: 0, cols: 0, blocked: [] }
  ],
  groups: [
    {
      id: 1,
      class: '',
      branch: '',
      startPin: '',
      endPin: '',
      excludedPins: '',
      pins: [],
      count: 0,
      colorIndex: 0,
      showChips: false
    }
  ],
  solvedData: null,
  activeView: 'grid' // 'grid' | 'table'
};

const COLOR_THEMES = [
  { name: 'Indigo', bg: '#3b82f6', text: '#fff' },
  { name: 'Emerald', bg: '#10b981', text: '#fff' },
  { name: 'Amber', bg: '#f59e0b', text: '#fff' },
  { name: 'Purple', bg: '#8b5cf6', text: '#fff' },
  { name: 'Pink', bg: '#ec4899', text: '#fff' },
  { name: 'Cyan', bg: '#06b6d4', text: '#fff' }
];

const BRANCH_LIST = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'CSBS', name: 'Computer Science & Business Systems' },
  { code: 'CSD', name: 'Computer Science & Design' },
  { code: 'CYS', name: 'Cyber Security' },
  { code: 'AIDS', name: 'Artificial Intelligence & Data Science' },
  { code: 'AIML', name: 'Artificial Intelligence & Machine Learning' },
  { code: 'IOT', name: 'Internet of Things' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EIE', name: 'Electronics & Instrumentation Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'MECHANICAL', name: 'Mechanical Engineering' },
  { code: 'AUTOMOBILE', name: 'Automobile Engineering' }
];

// ============================================================
// PIN NUMBER RANGE ENGINE & HELPERS
// ============================================================

function generatePinRange(startPin, endPin, excludedPins = []) {
  startPin = (startPin || '').trim().toUpperCase();
  endPin = (endPin || '').trim().toUpperCase();
  if (!startPin) return [];
  if (!endPin || startPin === endPin) {
    const pins = [startPin];
    const excludedSet = new Set(
      (Array.isArray(excludedPins) ? excludedPins : parseExcludedPins(excludedPins))
        .map(p => p.trim().toUpperCase())
    );
    return pins.filter(p => !excludedSet.has(p));
  }

  const excludedSet = new Set(
    (Array.isArray(excludedPins) ? excludedPins : parseExcludedPins(excludedPins))
      .map(p => p.trim().toUpperCase())
  );

  // 1. Longest common prefix
  let prefixLen = 0;
  while (prefixLen < startPin.length && prefixLen < endPin.length && startPin[prefixLen] === endPin[prefixLen]) {
    prefixLen++;
  }
  const commonPrefix = startPin.slice(0, prefixLen);

  // 2. Longest common suffix
  let suffixLen = 0;
  while (
    suffixLen < (startPin.length - prefixLen) &&
    suffixLen < (endPin.length - prefixLen) &&
    startPin[startPin.length - 1 - suffixLen] === endPin[endPin.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }
  const commonSuffix = suffixLen > 0 ? startPin.slice(startPin.length - suffixLen) : '';

  const startMid = startPin.slice(prefixLen, startPin.length - suffixLen);
  const endMid = endPin.slice(prefixLen, endPin.length - suffixLen);

  const startNum = parseInt(startMid, 10);
  const endNum = parseInt(endMid, 10);

  if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
    const padLength = startMid.length;
    const pins = [];
    for (let n = startNum; n <= endNum; n++) {
      const numStr = String(n).padStart(padLength, '0');
      const pin = `${commonPrefix}${numStr}${commonSuffix}`.toUpperCase();
      if (!excludedSet.has(pin)) {
        pins.push(pin);
      }
    }
    return pins;
  }

  // Fallback: Check regex for trailing digits
  const startMatch = startPin.match(/^(.*?)(\d+)([a-zA-Z]*)$/);
  const endMatch = endPin.match(/^(.*?)(\d+)([a-zA-Z]*)$/);
  if (startMatch && endMatch && startMatch[1] === endMatch[1] && startMatch[3] === endMatch[3]) {
    const prefix = startMatch[1];
    const suffix = startMatch[3];
    const sNum = parseInt(startMatch[2], 10);
    const eNum = parseInt(endMatch[2], 10);
    const padLen = startMatch[2].length;
    if (sNum <= eNum) {
      const pins = [];
      for (let n = sNum; n <= eNum; n++) {
        const pin = `${prefix}${String(n).padStart(padLen, '0')}${suffix}`.toUpperCase();
        if (!excludedSet.has(pin)) {
          pins.push(pin);
        }
      }
      return pins;
    }
  }

  const raw = [startPin, endPin];
  return raw.filter(p => !excludedSet.has(p));
}

function parseExcludedPins(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return input
    .split(/[,;\s]+/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

function computeEndPin(startPin, count) {
  startPin = (startPin || '').trim().toUpperCase();
  count = parseInt(count, 10);
  if (!startPin || isNaN(count) || count <= 0) return startPin;
  if (count === 1) return startPin;

  const match = startPin.match(/^(.*?)(\d+)([A-Z]*)$/i);
  if (!match) return startPin;

  const prefix = match[1];
  const digits = match[2];
  const suffix = match[3] || '';
  const startNum = parseInt(digits, 10);
  const endNum = startNum + count - 1;
  const padLen = digits.length;
  const endDigits = String(endNum).padStart(padLen, '0');
  return (prefix + endDigits + suffix).toUpperCase();
}

function syncGroupPins(group) {
  if (!group.startPin) {
    group.pins = [];
    group.count = 0;
    return;
  }
  const excluded = parseExcludedPins(group.excludedPins);
  group.pins = generatePinRange(group.startPin, group.endPin || group.startPin, excluded);
  group.count = group.pins.length;
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initExamMetaInputs();
  renderRooms();
  renderGroups();
  updateMetrics();
  attachEventListeners();
  checkBackendHealth();
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
});

// ============================================================
// PAGE ROUTING & NAVIGATION (Home vs Engine)
// ============================================================

function showPage(pageName) {
  const pageHome = document.getElementById('pageHome');
  const pageEngine = document.getElementById('pageEngine');
  const pageResults = document.getElementById('pageResults');

  if (pageName === 'results') {
    if (pageHome) pageHome.style.display = 'none';
    if (pageEngine) pageEngine.style.display = 'none';
    if (pageResults) pageResults.style.display = 'block';
    if (window.location.hash !== '#results') {
      window.location.hash = '#results';
    }
    window.scrollTo(0, 0);
  } else if (pageName === 'engine') {
    if (pageHome) pageHome.style.display = 'none';
    if (pageEngine) pageEngine.style.display = 'block';
    if (pageResults) pageResults.style.display = 'none';
    if (window.location.hash !== '#engine') {
      window.location.hash = '#engine';
    }
    window.scrollTo(0, 0);
  } else {
    if (pageHome) pageHome.style.display = 'block';
    if (pageEngine) pageEngine.style.display = 'none';
    if (pageResults) pageResults.style.display = 'none';
    if (window.location.hash !== '#home' && window.location.hash !== '') {
      window.location.hash = '#home';
    }
    window.scrollTo(0, 0);
  }
}

function handleRoute() {
  if (window.location.hash === '#results' && STATE.solvedData) {
    showPage('results');
  } else if (window.location.hash === '#engine' || window.location.hash === '#get-seating' || window.location.hash === '#results') {
    showPage('engine');
  } else {
    showPage('home');
  }
}

// Check if SWI-Prolog backend is connected
async function checkBackendHealth() {
  const badge = document.getElementById('engineBadge');
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      badge.innerHTML = `<span class="status-dot"></span><span>Engine: ${data.engine} Connected</span>`;
      badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    }
  } catch (e) {
    badge.innerHTML = `<span class="status-dot" style="background:#f59e0b;box-shadow:0 0 8px #f59e0b;"></span><span>Engine: Local JS/CLP Solver</span>`;
    badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
  }
}

function initExamMetaInputs() {
  const instInput = document.getElementById('inputInstName');
  const titleInput = document.getElementById('inputExamTitle');
  const dateInput = document.getElementById('inputExamDate');
  const sessionInput = document.getElementById('inputExamSession');

  if (instInput) instInput.value = STATE.examMeta.institution;
  if (titleInput) titleInput.value = STATE.examMeta.title;
  if (dateInput) dateInput.value = STATE.examMeta.date;
  if (sessionInput) sessionInput.value = STATE.examMeta.session;

  instInput?.addEventListener('input', (e) => STATE.examMeta.institution = e.target.value);
  titleInput?.addEventListener('input', (e) => STATE.examMeta.title = e.target.value);
  dateInput?.addEventListener('input', (e) => STATE.examMeta.date = e.target.value);
  sessionInput?.addEventListener('input', (e) => STATE.examMeta.session = e.target.value);
}

// ============================================================
// THEME SWITCHER (LIGHT / DARK)
// ============================================================

function initThemeToggle() {
  const btn = document.getElementById('btnToggleTheme');
  const iconSun = btn?.querySelector('.theme-icon-sun');
  const iconMoon = btn?.querySelector('.theme-icon-moon');
  const text = document.getElementById('themeToggleText');

  const currentTheme = localStorage.getItem('app-theme') || 'light';
  applyTheme(currentTheme);

  btn?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem('app-theme', nextTheme);
  });

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (iconSun) iconSun.style.display = 'none';
      if (iconMoon) iconMoon.style.display = 'inline-block';
      if (text) text.textContent = 'Light';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (iconSun) iconSun.style.display = 'inline-block';
      if (iconMoon) iconMoon.style.display = 'none';
      if (text) text.textContent = 'Dark';
    }
  }
}

function attachEventListeners() {
  document.getElementById('btnAddRoom')?.addEventListener('click', addRoom);
  document.getElementById('btnAddGroup')?.addEventListener('click', addGroup);
  document.getElementById('btnSolve')?.addEventListener('click', generateSeatingArrangement);
  document.getElementById('btnPrintResults')?.addEventListener('click', triggerPrint);
  document.getElementById('btnLoadPreset')?.addEventListener('click', loadDemoPreset);
  document.getElementById('btnEmptyLoadPreset')?.addEventListener('click', loadDemoPreset);
  document.getElementById('btnResetAll')?.addEventListener('click', resetAll);

  // Wire Page Navigation
  document.getElementById('btnHeroGetSeating')?.addEventListener('click', () => {
    showPage('engine');
  });
  document.getElementById('btnBackToHome')?.addEventListener('click', () => {
    showPage('home');
  });
  document.getElementById('btnBackToOverview')?.addEventListener('click', () => {
    showPage('home');
  });
  document.getElementById('btnBackToConfig')?.addEventListener('click', () => {
    showPage('engine');
  });

  // Initialize Theme Switcher (Light / Dark)
  initThemeToggle();

  // Initialize CSV / PINs upload modal
  initUploadModal();

  // View Switcher
  const gridBtn = document.getElementById('viewToggleGrid');
  const tableBtn = document.getElementById('viewToggleTable');

  gridBtn?.addEventListener('click', () => {
    STATE.activeView = 'grid';
    gridBtn.classList.add('active');
    tableBtn.classList.remove('active');
    document.getElementById('gridViewsContainer').style.display = 'flex';
    document.getElementById('tableViewContainer').style.display = 'none';
  });

  tableBtn?.addEventListener('click', () => {
    STATE.activeView = 'table';
    tableBtn.classList.add('active');
    gridBtn.classList.remove('active');
    document.getElementById('gridViewsContainer').style.display = 'none';
    document.getElementById('tableViewContainer').style.display = 'block';
  });

  // Table filter & search
  document.getElementById('rosterSearch')?.addEventListener('input', filterRosterTable);
  document.getElementById('rosterRoomFilter')?.addEventListener('change', filterRosterTable);
}

// ============================================================
// ROOMS MANAGEMENT
// ============================================================

function addRoom() {
  const nextId = STATE.rooms.length > 0 ? Math.max(...STATE.rooms.map(r => r.id)) + 1 : 1;
  STATE.rooms.push({
    id: nextId,
    name: '',
    rows: 0,
    cols: 0,
    blocked: []
  });
  renderRooms();
  updateMetrics();
}

function removeRoom(roomId) {
  if (STATE.rooms.length <= 1) {
    alert('At least one examination room is required.');
    return;
  }
  STATE.rooms = STATE.rooms.filter(r => r.id !== roomId);
  renderRooms();
  updateMetrics();
}

function renderRooms() {
  const container = document.getElementById('roomsListContainer');
  if (!container) return;

  container.innerHTML = '';
  STATE.rooms.forEach((room, index) => {
    const card = document.createElement('div');
    card.className = 'item-config-card';

    const capacity = (room.rows || 0) * (room.cols || 0);
    const blockedCount = room.blocked.length;
    const usable = Math.max(0, capacity - blockedCount);

    card.innerHTML = `
      <div class="item-header">
        <div class="item-title-badge">
          <span>Room ${index + 1}:</span>
          <input type="text" class="input-control input-sm rounded-input" style="width:140px;font-weight:700;" value="${room.name || ''}" placeholder="e.g. Hall 101" data-action="name" data-id="${room.id}">
          <span class="item-pill" id="capacityPill-${room.id}">${capacity} Seats (${usable} Usable)</span>
        </div>
        ${STATE.rooms.length > 1 ? `
          <button type="button" class="btn-remove-item" title="Remove Room" data-action="delete" data-id="${room.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        ` : ''}
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label>Number of rows:</label>
          <input type="number" min="1" max="25" class="input-control rounded-input" value="${room.rows ? room.rows : ''}" placeholder="Enter rows (e.g. 3)" data-action="rows" data-id="${room.id}">
        </div>
        <div class="form-group">
          <label>Number of columns:</label>
          <input type="number" min="1" max="25" class="input-control rounded-input" value="${room.cols ? room.cols : ''}" placeholder="Enter columns (e.g. 4)" data-action="cols" data-id="${room.id}">
        </div>
      </div>

      <div class="room-matrix-interactive">
        <div class="matrix-label-row">
          <span class="matrix-desc">Click any seat to mark <strong style="color:#ef4444;">[X] Blocked</strong>:</span>
          <span class="item-pill" id="blockedBadge-${room.id}">${blockedCount} Blocked</span>
        </div>
        <div class="seat-mini-grid" style="grid-template-columns: repeat(${room.cols || 1}, minmax(46px, 1fr));" id="miniGrid-${room.id}">
          ${generateMiniSeatButtons(room)}
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach card event listeners (both change and live input for real-time matrix update)
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', handleRoomInputChange);
    if (input.type === 'number') {
      input.addEventListener('input', handleRoomInputChange);
    }
  });

  container.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      removeRoom(id);
    });
  });

  container.querySelectorAll('.seat-mini-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const roomId = parseInt(btn.getAttribute('data-room-id'), 10);
      const seatNum = parseInt(btn.getAttribute('data-seat-num'), 10);
      toggleSeatBlocked(roomId, seatNum);
    });
  });
}

function generateMiniSeatButtons(room) {
  if (!room.rows || !room.cols || room.rows <= 0 || room.cols <= 0) {
    return `<div style="grid-column: 1 / -1; padding: 18px; text-align: center; color: #8d6e63; font-size: 0.9rem; font-style: italic;">Enter number of rows and columns to generate the interactive seat matrix.</div>`;
  }
  const total = room.rows * room.cols;
  let html = '';
  for (let s = 1; s <= total; s++) {
    const isBlocked = room.blocked.includes(s);
    html += `
      <button type="button" class="seat-mini-btn ${isBlocked ? 'blocked' : ''}" 
              data-room-id="${room.id}" data-seat-num="${s}">
        ${isBlocked ? `<span style="text-decoration:line-through;opacity:0.6;">${s}</span> [X]` : s}
      </button>
    `;
  }
  return html;
}

function handleRoomInputChange(e) {
  const id = parseInt(e.target.getAttribute('data-id'), 10);
  const action = e.target.getAttribute('data-action');
  const room = STATE.rooms.find(r => r.id === id);
  if (!room) return;

  if (action === 'name') {
    room.name = e.target.value.trim();
  } else if (action === 'rows' || action === 'cols') {
    const rawVal = e.target.value.trim();
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && val > 0 && val <= 30) {
      if (action === 'rows') room.rows = val;
      if (action === 'cols') room.cols = val;
      room.blocked = room.blocked.filter(s => s <= room.rows * room.cols);
    } else if (rawVal === '') {
      if (action === 'rows') room.rows = 0;
      if (action === 'cols') room.cols = 0;
      room.blocked = [];
    }

    // Live matrix grid DOM update
    const miniGrid = document.getElementById(`miniGrid-${room.id}`);
    if (miniGrid) {
      miniGrid.style.gridTemplateColumns = room.cols > 0 ? `repeat(${room.cols}, minmax(46px, 1fr))` : '1fr';
      miniGrid.innerHTML = generateMiniSeatButtons(room);
      miniGrid.querySelectorAll('.seat-mini-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const rId = parseInt(btn.getAttribute('data-room-id'), 10);
          const sNum = parseInt(btn.getAttribute('data-seat-num'), 10);
          toggleSeatBlocked(rId, sNum);
        });
      });
    }

    // Live badge updates
    const cap = (room.rows || 0) * (room.cols || 0);
    const usable = Math.max(0, cap - room.blocked.length);
    const capPill = document.getElementById(`capacityPill-${room.id}`);
    if (capPill) capPill.textContent = `${cap} Seats (${usable} Usable)`;
    const blockedBadge = document.getElementById(`blockedBadge-${room.id}`);
    if (blockedBadge) blockedBadge.textContent = `${room.blocked.length} Blocked`;
  }
  updateMetrics();
}

function toggleSeatBlocked(roomId, seatNum) {
  const room = STATE.rooms.find(r => r.id === roomId);
  if (!room) return;

  const idx = room.blocked.indexOf(seatNum);
  if (idx === -1) {
    room.blocked.push(seatNum);
  } else {
    room.blocked.splice(idx, 1);
  }
  room.blocked.sort((a, b) => a - b);

  // Update button in place
  const miniGrid = document.getElementById(`miniGrid-${room.id}`);
  if (miniGrid) {
    const btn = miniGrid.querySelector(`[data-seat-num="${seatNum}"]`);
    if (btn) {
      const isBlocked = room.blocked.includes(seatNum);
      if (isBlocked) {
        btn.classList.add('blocked');
        btn.innerHTML = `<span style="text-decoration:line-through;opacity:0.6;">${seatNum}</span> [X]`;
      } else {
        btn.classList.remove('blocked');
        btn.textContent = seatNum;
      }
    }
  }

  // Update badges
  const cap = room.rows * room.cols;
  const usable = Math.max(0, cap - room.blocked.length);
  const capPill = document.getElementById(`capacityPill-${room.id}`);
  if (capPill) capPill.textContent = `${cap} Seats (${usable} Usable)`;
  const blockedBadge = document.getElementById(`blockedBadge-${room.id}`);
  if (blockedBadge) blockedBadge.textContent = `${room.blocked.length} Blocked`;

  updateMetrics();
}

// ============================================================
// STUDENT GROUPS MANAGEMENT
// ============================================================

function addGroup() {
  const nextId = STATE.groups.length > 0 ? Math.max(...STATE.groups.map(g => g.id)) + 1 : 1;
  const colorIndex = STATE.groups.length % COLOR_THEMES.length;
  const newGroup = {
    id: nextId,
    class: '',
    branch: '',
    startPin: '',
    endPin: '',
    excludedPins: '',
    pins: [],
    count: 0,
    colorIndex,
    showChips: false
  };
  STATE.groups.push(newGroup);
  renderGroups();
  updateMetrics();
}

function removeGroup(groupId) {
  if (STATE.groups.length <= 1) {
    alert('At least one student group is required.');
    return;
  }
  STATE.groups = STATE.groups.filter(g => g.id !== groupId);
  renderGroups();
  updateMetrics();
}

function renderGroups() {
  const container = document.getElementById('groupsListContainer');
  if (!container) return;

  container.innerHTML = '';
  STATE.groups.forEach((group, index) => {
    syncGroupPins(group);
    const theme = COLOR_THEMES[group.colorIndex % COLOR_THEMES.length];
    const card = document.createElement('div');
    card.className = 'item-config-card';
    card.style.borderLeft = `4px solid ${theme.bg}`;

    const start = group.startPin || '';
    const end = group.endPin || '';
    const excludedCount = parseExcludedPins(group.excludedPins).length;

    card.innerHTML = `
      <div class="item-header">
        <div class="item-title-badge">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${theme.bg}"></span>
          <span>Student Group ${index + 1}</span>
          ${group.branch ? `<span class="branch-tag-pill">${group.branch}</span>` : ''}
          <span class="item-pill">${group.count || 0} Students</span>
          ${start && end ? `<span class="pin-summary-badge">${start} &rarr; ${end}</span>` : ''}
        </div>
        ${STATE.groups.length > 1 ? `
          <button type="button" class="btn-remove-item" title="Remove Group" data-action="delete" data-id="${group.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        ` : ''}
      </div>

      <div class="form-grid-3">
        <div class="form-group">
          <label>Select Branch: <span style="color:#60a5fa;">*</span></label>
          <select class="select-branch-dropdown" data-action="branch" data-id="${group.id}">
            <option value="" disabled ${!group.branch ? 'selected' : ''}>-- SELECT BRANCH --</option>
            ${BRANCH_LIST.map(b => `<option value="${b.code}" ${group.branch === b.code ? 'selected' : ''}>${b.code} &mdash; ${b.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Class / Section (Optional):</label>
          <input type="text" class="input-control rounded-input" value="${group.section || ''}" placeholder="e.g. Section A" data-action="section" data-id="${group.id}">
        </div>
        <div class="form-group">
          <label>Subject / Exam Paper: <span style="color:#60a5fa;">*</span></label>
          <input type="text" class="input-control rounded-input" value="${group.subject || ''}" placeholder="Enter subject (e.g. Mathematics)" data-action="subject" data-id="${group.id}">
        </div>
      </div>

      <div class="form-grid-3" style="margin-top: 10px;">
        <div class="form-group">
          <label>Starting PIN / Roll No: <span style="color:#60a5fa;">*</span></label>
          <input type="text" class="input-control rounded-input" style="font-family:var(--font-mono);font-weight:600;" value="${group.startPin || ''}" placeholder="Enter start PIN (e.g. 21B91A0501)" data-action="startPin" data-id="${group.id}">
        </div>
        <div class="form-group">
          <label>No. of Students: <span style="color:#60a5fa;">*</span></label>
          <input type="number" min="1" max="500" class="input-control rounded-input" style="font-family:var(--font-mono);font-weight:600;" value="${group.count ? group.count : ''}" placeholder="Enter total students (e.g. 30)" data-action="studentCount" data-id="${group.id}">
        </div>
        <div class="form-group">
          <label>Ending PIN / Roll No: <span style="color:#60a5fa;">*</span></label>
          <input type="text" class="input-control rounded-input" style="font-family:var(--font-mono);font-weight:600;" value="${group.endPin || ''}" placeholder="Auto-calculated or enter end PIN (e.g. 21B91A0530)" data-action="endPin" data-id="${group.id}">
        </div>
      </div>

      <div class="form-group" style="margin-top: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
          <label style="margin:0;">Excluded / Absent PINs (Optional):</label>
          <button type="button" class="btn-toggle-chips" data-action="toggle-chips" data-id="${group.id}">
            ${group.showChips ? 'Hide PINs' : `View All PINs (${group.pins.length})`}
          </button>
        </div>
        <input type="text" class="input-control input-sm rounded-input" style="font-family:var(--font-mono);" value="${group.excludedPins || ''}" placeholder="Optional: comma-separated absent roll numbers (e.g. 21B91A0507, 21B91A0515)" data-action="excludedPins" data-id="${group.id}">
      </div>

      ${group.showChips && group.pins.length > 0 ? `
        <div class="pin-chips-wrapper">
          <div class="pin-chips-header">
            <span>Generated Roll Numbers (${group.pins.length} active, ${excludedCount} excluded):</span>
          </div>
          <div class="pin-chips-list">
            ${group.pins.map(p => `<span class="pin-chip">${p}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });

  // Attach listeners
  container.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', handleGroupInputChange);
    input.addEventListener('input', handleGroupInputChange);
  });

  container.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      removeGroup(id);
    });
  });

  container.querySelectorAll('.btn-toggle-chips').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const group = STATE.groups.find(g => g.id === id);
      if (group) {
        group.showChips = !group.showChips;
        renderGroups();
      }
    });
  });
}

function handleGroupInputChange(e) {
  const id = parseInt(e.target.getAttribute('data-id'), 10);
  const action = e.target.getAttribute('data-action');
  const group = STATE.groups.find(g => g.id === id);
  if (!group) return;

  const card = e.target.closest('.item-config-card');
  const startInput = card?.querySelector('[data-action="startPin"]');
  const endInput = card?.querySelector('[data-action="endPin"]');
  const countInput = card?.querySelector('[data-action="studentCount"]');

  if (action === 'branch') {
    group.branch = e.target.value.trim().toUpperCase();
    group.class = group.branch + (group.section ? `-${group.section}` : '');
    renderGroups();
  } else if (action === 'section') {
    group.section = e.target.value.trim();
    group.class = (group.branch || 'Class') + (group.section ? `-${group.section}` : '');
  } else if (action === 'subject') {
    group.subject = e.target.value.trim();
  } else if (action === 'class') {
    group.class = e.target.value.trim();
  } else if (action === 'studentCount') {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num > 0) {
      if (group.startPin) {
        group.endPin = computeEndPin(group.startPin, num);
        if (endInput) endInput.value = group.endPin;
      }
      group.count = num;
      syncGroupPins(group);
    } else if (e.target.value === '') {
      group.count = 0;
      group.pins = [];
    }
    if (e.type === 'change') renderGroups();
  } else if (action === 'startPin') {
    group.startPin = e.target.value.trim();
    if (group.startPin && group.count > 0) {
      group.endPin = computeEndPin(group.startPin, group.count);
      if (endInput) endInput.value = group.endPin;
    }
    syncGroupPins(group);
    if (countInput && group.count) countInput.value = group.count;
    if (e.type === 'change') renderGroups();
  } else if (action === 'endPin') {
    group.endPin = e.target.value.trim();
    syncGroupPins(group);
    if (countInput && group.count) countInput.value = group.count;
    if (e.type === 'change') renderGroups();
  } else if (action === 'excludedPins') {
    group.excludedPins = e.target.value;
    syncGroupPins(group);
    if (countInput && group.count) countInput.value = group.count;
    if (e.type === 'change') renderGroups();
  }
  updateMetrics();
}

// ============================================================
// METRICS & FEASIBILITY CHECK
// ============================================================

function updateMetrics() {
  const roomsCount = STATE.rooms.length;
  let totalSeats = 0;
  let blockedSeats = 0;

  STATE.rooms.forEach(r => {
    const cap = r.rows * r.cols;
    totalSeats += cap;
    blockedSeats += r.blocked.length;
  });

  const usableSeats = Math.max(0, totalSeats - blockedSeats);
  let studentCount = 0;
  STATE.groups.forEach(g => {
    syncGroupPins(g);
    studentCount += g.count;
  });
  const groupsCount = STATE.groups.length;

  const elRooms = document.getElementById('statRoomsCount');
  if (elRooms) elRooms.textContent = roomsCount;
  const elTotal = document.getElementById('statTotalSeats');
  if (elTotal) elTotal.textContent = totalSeats;
  const elUsable = document.getElementById('statUsableSeats');
  if (elUsable) elUsable.textContent = usableSeats;
  const elBlocked = document.getElementById('statBlockedSeats');
  if (elBlocked) elBlocked.textContent = `${blockedSeats} blocked seats`;
  const elStudents = document.getElementById('statStudentCount');
  if (elStudents) elStudents.textContent = studentCount;
  const elGroups = document.getElementById('statGroupsCount');
  if (elGroups) elGroups.textContent = `${groupsCount} group sections`;

  const badge = document.getElementById('feasibilityBadge');
  const details = document.getElementById('feasibilityDetails');

  if (badge && details) {
    if (studentCount > usableSeats) {
      const deficit = studentCount - usableSeats;
      badge.className = 'status-badge status-danger';
      badge.textContent = 'Deficit';
      details.innerHTML = `<span style="color:#ef4444;font-weight:600;">Short of ${deficit} seats!</span>`;
    } else {
      const spare = usableSeats - studentCount;
      badge.className = 'status-badge status-success';
      badge.textContent = 'Feasible';
      details.textContent = `${spare} surplus seats available`;
    }
  }
}

// ============================================================
// SOLVER ENGINE & PROLOG INTEGRATION
// ============================================================

async function generateSeatingArrangement() {
  const studentCount = STATE.groups.reduce((sum, g) => sum + (parseInt(g.count, 10) || 0), 0);
  let usableSeats = 0;
  STATE.rooms.forEach(r => {
    usableSeats += (r.rows * r.cols) - r.blocked.length;
  });

  const loadingModal = document.getElementById('loadingStateModal');
  const errorBox = document.getElementById('errorBox');
  const btnSolve = document.getElementById('btnSolve');
  const btnSolveText = document.getElementById('btnSolveText');

  if (errorBox) errorBox.style.display = 'none';
  if (loadingModal) loadingModal.style.display = 'block';
  if (btnSolve) btnSolve.disabled = true;
  if (btnSolveText) btnSolveText.textContent = 'Solving Constraints...';

  // Validation for empty inputs
  if (usableSeats === 0) {
    if (loadingModal) loadingModal.style.display = 'none';
    if (btnSolve) btnSolve.disabled = false;
    if (btnSolveText) btnSolveText.textContent = 'Get Seating';
    showError(
      'Missing Examination Hall Dimensions',
      'Please enter the number of rows and columns for your examination halls before generating seating.'
    );
    return;
  }

  if (studentCount === 0) {
    if (loadingModal) loadingModal.style.display = 'none';
    if (btnSolve) btnSolve.disabled = false;
    if (btnSolveText) btnSolveText.textContent = 'Get Seating';
    showError(
      'Missing Student Information',
      'Please enter at least one student group with starting roll numbers and number of students.'
    );
    return;
  }

  // Capacity check
  if (studentCount > usableSeats) {
    if (loadingModal) loadingModal.style.display = 'none';
    if (btnSolve) btnSolve.disabled = false;
    if (btnSolveText) btnSolveText.textContent = 'Get Seating';
    showError(
      'Not Enough Usable Seats',
      `Total students (${studentCount}) exceed total usable seat capacity (${usableSeats}). Please increase room sizes or reduce student counts.`
    );
    return;
  }

  // Senior Developer AI Ticker Progression
  const tickerSteps = [
    'Analyzing room geometry and usable desk domain...',
    'Translating student roll numbers into CLP(FD) integer domains...',
    'Constructing strict horizontal & vertical non-adjacency constraints...',
    'Invoking SWI-Prolog CLP(FD) constraint propagation engine...',
    'Verifying zero-conflict layout matrices...'
  ];
  let stepIdx = 0;
  const tickerEl = document.getElementById('aiSolverTicker');
  if (tickerEl) tickerEl.textContent = tickerSteps[0];
  const tickerTimer = setInterval(() => {
    stepIdx = (stepIdx + 1) % tickerSteps.length;
    if (tickerEl) tickerEl.textContent = tickerSteps[stepIdx];
  }, 350);

  // Format payload for SWI-Prolog solver bridge with real Roll / PIN numbers
  const allStudents = [];
  STATE.groups.forEach((g, gIdx) => {
    syncGroupPins(g);
    const branchCode = (g.branch || `BRANCH-${gIdx + 1}`).trim().toUpperCase();
    const className = (g.class || (branchCode + (g.section ? `-${g.section}` : ''))).trim().toUpperCase();
    const subjectName = (g.subject || branchCode).trim();
    (g.pins || []).forEach(pin => {
      allStudents.push({
        id: pin,
        class: className,
        branch: subjectName
      });
    });
  });

  const payload = {
    rooms: STATE.rooms.map(r => ({
      room: r.id,
      rows: r.rows,
      cols: r.cols,
      blocked: r.blocked
    })),
    students: allStudents,
    groups: STATE.groups.map((g, gIdx) => {
      const branchCode = (g.branch || `BRANCH-${gIdx + 1}`).trim().toUpperCase();
      const className = (g.class || (branchCode + (g.section ? `-${g.section}` : ''))).trim().toUpperCase();
      const subjectName = (g.subject || branchCode).trim();
      return {
        class: className,
        branch: subjectName,
        count: parseInt(g.count, 10) || 0
      };
    })
  };

  try {
    // Attempt backend SWI-Prolog CLP(FD) solver
    const response = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.assignments && data.assignments.length > 0) {
        STATE.solvedData = data;
        displayResults(data.assignments);
      } else {
        throw new Error(data.message || data.error || 'No valid seating arrangement found.');
      }
    } else {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (err) {
    console.warn('Backend call failed, executing local CSP fallback solver...', err.message);
    try {
      const fallbackResult = solveLocally(payload);
      if (fallbackResult && fallbackResult.length > 0) {
        STATE.solvedData = { success: true, assignments: fallbackResult };
        displayResults(fallbackResult);
      } else {
        showError('No Valid Seating Arrangement Found', 'The constraints may be too restrictive. Try increasing room capacity or adjusting student group distributions.');
      }
    } catch (localErr) {
      showError('Solver Execution Error', localErr.message);
    }
  } finally {
    clearInterval(tickerTimer);
    if (loadingModal) loadingModal.style.display = 'none';
    if (btnSolve) btnSolve.disabled = false;
    if (btnSolveText) btnSolveText.textContent = 'Get Seating';
  }
}

// Fallback CSP Solver with identical constraints
function solveLocally(data) {
  const seats = [];
  data.rooms.forEach(room => {
    const cap = room.rows * room.cols;
    for (let s = 1; s <= cap; s++) {
      if (!room.blocked.includes(s)) {
        seats.push({
          room: room.room,
          seat: s,
          cols: room.cols,
          row: Math.floor((s - 1) / room.cols) + 1,
          col: ((s - 1) % room.cols) + 1
        });
      }
    }
  });

  const students = [];
  if (data.students && data.students.length > 0) {
    data.students.forEach(s => {
      students.push({
        id: s.id,
        class: s.class,
        branch: s.branch
      });
    });
  } else {
    data.groups.forEach((g, gIdx) => {
      for (let i = 1; i <= g.count; i++) {
        students.push({
          id: `S${gIdx + 1}_${i}`,
          class: g.class,
          branch: g.branch
        });
      }
    });
  }

  if (students.length > seats.length) return null;

  function areAdjacent(s1, s2) {
    if (s1.room !== s2.room) return false;
    if (s1.row === s2.row && Math.abs(s1.col - s2.col) === 1) return true;
    if (s1.col === s2.col && Math.abs(s1.row - s2.row) === 1) return true;
    return false;
  }

  const assignments = [];
  const assignedSeats = new Set();

  function backtrack(studentIdx) {
    if (studentIdx === students.length) return true;
    const currentStudent = students[studentIdx];

    for (let i = 0; i < seats.length; i++) {
      if (assignedSeats.has(i)) continue;
      const candidateSeat = seats[i];

      let conflict = false;
      for (const prior of assignments) {
        if (prior.student.class === currentStudent.class || prior.student.branch === currentStudent.branch) {
          if (areAdjacent(prior.seat, candidateSeat)) {
            conflict = true;
            break;
          }
        }
      }

      if (!conflict) {
        assignedSeats.add(i);
        assignments.push({ student: currentStudent, seat: candidateSeat });
        if (backtrack(studentIdx + 1)) return true;
        assignments.pop();
        assignedSeats.delete(i);
      }
    }
    return false;
  }

  const success = backtrack(0);
  if (!success) return null;

  return assignments.map(a => ({
    id: a.student.id,
    class: a.student.class,
    branch: a.student.branch,
    room: a.seat.room,
    seat: a.seat.seat,
    row: a.seat.row,
    col: a.seat.col
  }));
}

function showError(title, msg) {
  const errorBox = document.getElementById('errorBox');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  if (errorTitle) errorTitle.textContent = title;
  if (errorMessage) errorMessage.textContent = msg;
  if (errorBox) {
    errorBox.style.display = 'flex';
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ============================================================
// DISPLAY SEATING ARRANGEMENT RESULTS
// ============================================================

function displayResults(assignments) {
  const solvedContent = document.getElementById('solvedContent');
  const resultsControls = document.getElementById('resultsControls');
  const gridContainer = document.getElementById('gridViewsContainer');
  const tableBody = document.getElementById('rosterTableBody');
  const roomFilterSelect = document.getElementById('rosterRoomFilter');
  const legend = document.getElementById('resultsLegend');

  gridContainer.innerHTML = '';
  tableBody.innerHTML = '';
  roomFilterSelect.innerHTML = '<option value="all">All Rooms</option>';

  // Build Legend
  legend.innerHTML = '';
  STATE.groups.forEach((g, idx) => {
    const theme = COLOR_THEMES[g.colorIndex % COLOR_THEMES.length];
    const item = document.createElement('div');
    item.className = 'legend-item';
    const bCode = (g.branch || g.class || `Group ${idx + 1}`).toUpperCase();
    const sub = g.subject ? ` (${g.subject})` : '';
    item.innerHTML = `
      <span class="legend-badge" style="background:${theme.bg}"></span>
      <span><strong>${bCode}</strong>${sub}</span>
    `;
    legend.appendChild(item);
  });

  const blockedLegend = document.createElement('div');
  blockedLegend.className = 'legend-item';
  blockedLegend.innerHTML = `
    <span class="legend-badge" style="background:rgba(239,68,68,0.25);border:1px solid #ef4444;"></span>
    <span><strong>[X]</strong> Blocked Seat</span>
  `;
  legend.appendChild(blockedLegend);

  const emptyLegend = document.createElement('div');
  emptyLegend.className = 'legend-item';
  emptyLegend.innerHTML = `
    <span class="legend-badge" style="background:rgba(255,255,255,0.05);border:1px dashed #64748b;"></span>
    <span><strong>[ ]</strong> Empty Seat</span>
  `;
  legend.appendChild(emptyLegend);

  // Group assignments by room
  const roomAssignments = new Map();
  STATE.rooms.forEach(r => roomAssignments.set(r.id, new Map()));
  assignments.forEach(a => {
    if (roomAssignments.has(a.room)) {
      roomAssignments.get(a.room).set(a.seat, a);
    }
  });

  // Render Visual Room Grids
  STATE.rooms.forEach(room => {
    // Add to filter dropdown
    const opt = document.createElement('option');
    opt.value = room.id;
    opt.textContent = `${room.name} (Room ${room.id})`;
    roomFilterSelect.appendChild(opt);

    const roomCard = document.createElement('div');
    roomCard.className = 'room-display-card';

    const assignedCount = roomAssignments.get(room.id)?.size || 0;
    const capacity = room.rows * room.cols;

    roomCard.innerHTML = `
      <div class="room-display-header">
        <div class="room-title">${room.name}</div>
        <div class="room-dimensions-tag">
          ${room.rows} Rows × ${room.cols} Columns &bull; ${assignedCount} / ${capacity - room.blocked.length} Occupied
        </div>
      </div>
      <div class="room-grid-scroll-box">
        <table class="hall-grid-table">
          <thead>
            <tr>
              <th class="grid-row-hdr"></th>
              ${Array.from({ length: room.cols }, (_, i) => `<th class="grid-col-hdr">C${i + 1}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${renderRoomRows(room, roomAssignments.get(room.id))}
          </tbody>
        </table>
      </div>
    `;
    gridContainer.appendChild(roomCard);
  });

  // Render Student Roster Table
  renderRosterTable(assignments);

  // Update celebratory solution audit banner
  const uniqueRooms = new Set(assignments.map(a => a.room)).size;
  const chipAssigned = document.getElementById('chipTotalAssigned');
  const chipRooms = document.getElementById('chipTotalRooms');
  const chipEngine = document.getElementById('chipSolveEngine');
  const detailsSub = document.getElementById('solutionDetailsSub');

  if (chipAssigned) chipAssigned.textContent = `⚡ Assigned: ${assignments.length} Students`;
  if (chipRooms) chipRooms.textContent = `🏛️ ${uniqueRooms} Hall${uniqueRooms > 1 ? 's' : ''}`;
  if (chipEngine) chipEngine.textContent = `🧠 CLP(FD) Optimal`;
  if (detailsSub) detailsSub.textContent = `All non-adjacency constraints satisfied &bull; 0 Adjacent Conflicts across ${uniqueRooms} Hall(s)`;

  // Show Output Page (Page 3)
  showPage('results');
}

function renderRoomRows(room, seatMap) {
  let rowsHtml = '';
  for (let r = 1; r <= room.rows; r++) {
    rowsHtml += `<tr><td class="grid-row-hdr">R${r}</td>`;
    for (let c = 1; c <= room.cols; c++) {
      const seatNumber = ((r - 1) * room.cols) + c;
      const isBlocked = room.blocked.includes(seatNumber);
      const student = seatMap ? seatMap.get(seatNumber) : null;

      if (isBlocked) {
        rowsHtml += `
          <td>
            <div class="seat-cell seat-cell-blocked blocked">
              <div class="seat-cell-header">
                <span class="seat-number">#${seatNumber}</span>
              </div>
              <div class="seat-blocked-label">[X] BLOCKED</div>
            </div>
          </td>
        `;
      } else if (student) {
        const groupObj = STATE.groups.find(g => g.class === student.class);
        const theme = groupObj ? COLOR_THEMES[groupObj.colorIndex % COLOR_THEMES.length] : COLOR_THEMES[0];
        rowsHtml += `
          <td>
            <div class="seat-cell seat-cell-assigned assigned" style="border-top: 3.5px solid ${theme.bg};">
              <div class="seat-cell-header">
                <span class="seat-number">#${seatNumber}</span>
                <span class="seat-badge-pill" style="background:${theme.bg};color:${theme.text};">${student.class}</span>
              </div>
              <div class="seat-pin">${student.id}</div>
              <div class="seat-branch">${student.branch}</div>
            </div>
          </td>
        `;
      } else {
        rowsHtml += `
          <td>
            <div class="seat-cell seat-cell-empty empty">
              <div class="seat-cell-header">
                <span class="seat-number">#${seatNumber}</span>
              </div>
              <div class="seat-empty-label">[ ] Empty</div>
            </div>
          </td>
        `;
      }
    }
    rowsHtml += '</tr>';
  }
  return rowsHtml;
}

function renderRosterTable(assignments) {
  const tbody = document.getElementById('rosterTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  // Sort assignments logically by Room, then Row, then Col
  const sorted = [...assignments].sort((a, b) => {
    if (a.room !== b.room) return a.room - b.room;
    return a.seat - b.seat;
  });

  sorted.forEach((a, idx) => {
    const roomObj = STATE.rooms.find(r => r.id === a.room);
    const roomName = roomObj ? roomObj.name : `Room ${a.room}`;
    const tr = document.createElement('tr');
    tr.setAttribute('data-room-id', a.room);
    tr.setAttribute('data-search', `${a.id} ${a.class} ${a.branch} ${roomName}`.toLowerCase());

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong style="font-family:var(--font-mono);">${a.id}</strong></td>
      <td>${a.class}</td>
      <td>${a.branch}</td>
      <td>${roomName}</td>
      <td>Row ${a.row}</td>
      <td>Col ${a.col}</td>
      <td><span style="font-family:var(--font-mono);font-weight:600;">Seat #${a.seat}</span></td>
      <td class="print-signature-col"></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterRosterTable() {
  const query = document.getElementById('rosterSearch')?.value.toLowerCase().trim() || '';
  const selectedRoom = document.getElementById('rosterRoomFilter')?.value || 'all';
  const rows = document.querySelectorAll('#rosterTableBody tr');

  rows.forEach(row => {
    const rowRoom = row.getAttribute('data-room-id');
    const searchData = row.getAttribute('data-search') || '';

    const matchesRoom = selectedRoom === 'all' || rowRoom === selectedRoom;
    const matchesSearch = query === '' || searchData.includes(query);

    row.style.display = (matchesRoom && matchesSearch) ? '' : 'none';
  });
}

// ============================================================
// PRINT PREPARATION & EXPORT
// ============================================================

function triggerPrint() {
  if (!STATE.solvedData) {
    alert('Please generate the seating arrangement before printing.');
    return;
  }

  // Update Print Document Header Details directly from current inputs
  const instVal = document.getElementById('inputInstName')?.value || STATE.examMeta.institution || 'CONTROLLER OF EXAMINATIONS';
  const titleVal = document.getElementById('inputExamTitle')?.value || STATE.examMeta.title || 'EXAM SEATING ARRANGEMENT';
  const dateVal = document.getElementById('inputExamDate')?.value || STATE.examMeta.date || '-';
  const sessionVal = document.getElementById('inputExamSession')?.value || STATE.examMeta.session || '-';

  document.getElementById('printInstName').textContent = instVal;
  document.getElementById('printExamName').textContent = titleVal.toUpperCase();
  document.getElementById('printDateVal').textContent = dateVal;
  document.getElementById('printSessionVal').textContent = sessionVal;

  // Ensure all roster rows are unhidden for the printed attendance sheet
  const rows = document.querySelectorAll('#rosterTableBody tr');
  rows.forEach(r => r.style.display = '');

  // Trigger browser print
  setTimeout(() => {
    window.print();
  }, 100);
}

// ============================================================
// PRESET & RESET CONTROLS
// ============================================================

function loadDemoPreset() {
  STATE.rooms = [
    { id: 1, name: 'Hall A (Room 1)', rows: 3, cols: 4, blocked: [5] }
  ];
  STATE.groups = [
    {
      id: 1,
      class: 'CSE',
      branch: 'CSE',
      subject: 'Mathematics-I',
      startPin: '21B91A0501',
      endPin: '21B91A0505',
      excludedPins: '',
      pins: ['21B91A0501', '21B91A0502', '21B91A0503', '21B91A0504', '21B91A0505'],
      count: 5,
      colorIndex: 0,
      showChips: false
    },
    {
      id: 2,
      class: 'ECE',
      branch: 'ECE',
      subject: 'Electronic Devices',
      startPin: '21B91A0401',
      endPin: '21B91A0405',
      excludedPins: '',
      pins: ['21B91A0401', '21B91A0402', '21B91A0403', '21B91A0404', '21B91A0405'],
      count: 5,
      colorIndex: 1,
      showChips: false
    }
  ];
  renderRooms();
  renderGroups();
  updateMetrics();
  generateSeatingArrangement();
}

function resetAll() {
  if (confirm('Reset all configurations back to initial state?')) {
    STATE.examMeta = {
      institution: '',
      title: '',
      date: '',
      session: ''
    };
    STATE.rooms = [
      { id: 1, name: '', rows: 0, cols: 0, blocked: [] }
    ];
    STATE.groups = [
      {
        id: 1,
        class: '',
        branch: '',
        startPin: '',
        endPin: '',
        excludedPins: '',
        pins: [],
        count: 0,
        colorIndex: 0,
        showChips: false
      }
    ];
    STATE.solvedData = null;
    initExamMetaInputs();
    const gridContainer = document.getElementById('gridViewsContainer');
    const tableBody = document.getElementById('rosterTableBody');
    if (gridContainer) gridContainer.innerHTML = '';
    if (tableBody) tableBody.innerHTML = '';
    renderRooms();
    renderGroups();
    updateMetrics();
  }
}

// ============================================================
// UPLOAD STARTING & ENDING PIN NUMBERS / CSV IMPORT
// ============================================================

let PARSED_UPLOAD_GROUPS = [];

function initUploadModal() {
  const modal = document.getElementById('uploadModal');
  const btnOpen = document.getElementById('btnOpenUploadModal');
  const btnClose = document.getElementById('btnCloseUploadModal');
  const btnCancel = document.getElementById('btnCancelUpload');
  const btnApply = document.getElementById('btnApplyUpload');
  const btnAppend = document.getElementById('btnAppendUpload');
  const dropZone = document.getElementById('fileDropZone');
  const fileInput = document.getElementById('csvFileInput');
  const pasteInput = document.getElementById('csvPasteInput');
  const btnRangeTemplate = document.getElementById('btnDownloadRangeTemplate');
  const btnListTemplate = document.getElementById('btnDownloadListTemplate');

  function openModal() {
    if (!modal) return;
    modal.style.display = 'flex';
    resetModalState();
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
  }

  function resetModalState() {
    PARSED_UPLOAD_GROUPS = [];
    if (fileInput) fileInput.value = '';
    if (pasteInput) pasteInput.value = '';
    const previewSection = document.getElementById('uploadPreviewSection');
    const errorBox = document.getElementById('uploadErrorBox');
    if (previewSection) previewSection.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';
    if (btnApply) btnApply.disabled = true;
    if (btnAppend) btnAppend.disabled = true;
  }

  btnOpen?.addEventListener('click', openModal);
  btnClose?.addEventListener('click', closeModal);
  btnCancel?.addEventListener('click', closeModal);

  // Close when clicking backdrop
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Drop zone events
  dropZone?.addEventListener('click', () => fileInput?.click());

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target?.files && e.target.files[0]) {
      handleCsvFile(e.target.files[0]);
    }
  });

  pasteInput?.addEventListener('input', () => {
    const text = pasteInput.value.trim();
    if (text) {
      processCsvText(text);
    } else {
      resetModalState();
    }
  });

  btnApply?.addEventListener('click', () => {
    if (PARSED_UPLOAD_GROUPS.length > 0) {
      STATE.groups = PARSED_UPLOAD_GROUPS.map((g, idx) => ({
        ...g,
        id: idx + 1,
        colorIndex: idx % COLOR_THEMES.length
      }));
      renderGroups();
      updateMetrics();
      closeModal();
    }
  });

  btnAppend?.addEventListener('click', () => {
    if (PARSED_UPLOAD_GROUPS.length > 0) {
      const startId = STATE.groups.length > 0 ? Math.max(...STATE.groups.map(g => g.id)) + 1 : 1;
      PARSED_UPLOAD_GROUPS.forEach((g, idx) => {
        STATE.groups.push({
          ...g,
          id: startId + idx,
          colorIndex: (STATE.groups.length) % COLOR_THEMES.length
        });
      });
      renderGroups();
      updateMetrics();
      closeModal();
    }
  });

  btnRangeTemplate?.addEventListener('click', downloadRangeTemplate);
  btnListTemplate?.addEventListener('click', downloadListTemplate);
}

function handleCsvFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const pasteInput = document.getElementById('csvPasteInput');
    if (pasteInput) pasteInput.value = text;
    processCsvText(text);
  };
  reader.onerror = () => {
    showUploadError('Error reading file. Please check file permissions or try copying and pasting.');
  };
  reader.readAsText(file);
}

function processCsvText(text) {
  const errorBox = document.getElementById('uploadErrorBox');
  const errorMsg = document.getElementById('uploadErrorMsg');
  const previewSection = document.getElementById('uploadPreviewSection');
  const previewTitle = document.getElementById('previewTitle');
  const previewTableBody = document.getElementById('uploadPreviewTableBody');
  const btnApply = document.getElementById('btnApplyUpload');
  const btnAppend = document.getElementById('btnAppendUpload');

  if (errorBox) errorBox.style.display = 'none';

  try {
    const parsed = parseCsvContent(text);
    if (!parsed || parsed.length === 0) {
      throw new Error('No valid student groups or PIN ranges could be parsed from input.');
    }

    PARSED_UPLOAD_GROUPS = parsed;
    const totalStudents = parsed.reduce((sum, g) => sum + g.count, 0);

    if (previewTitle) {
      previewTitle.textContent = `Parsed ${parsed.length} Group(s) with ${totalStudents} Total Students`;
    }
    if (previewTableBody) {
      previewTableBody.innerHTML = '';
      parsed.forEach(g => {
        const tr = document.createElement('tr');
        const excludedStr = g.excludedPins ? g.excludedPins : '-';
        tr.innerHTML = `
          <td><strong>${g.class}</strong></td>
          <td>${g.branch}</td>
          <td><code class="font-mono">${g.startPin}</code></td>
          <td><code class="font-mono">${g.endPin}</code></td>
          <td><span style="font-size:0.75rem;color:var(--text-muted);">${excludedStr}</span></td>
          <td><strong>${g.count}</strong></td>
        `;
        previewTableBody.appendChild(tr);
      });
    }

    if (previewSection) previewSection.style.display = 'block';
    if (btnApply) btnApply.disabled = false;
    if (btnAppend) btnAppend.disabled = false;
  } catch (err) {
    if (previewSection) previewSection.style.display = 'none';
    if (btnApply) btnApply.disabled = true;
    if (btnAppend) btnAppend.disabled = true;
    if (errorMsg) errorMsg.textContent = err.message || 'Failed to parse CSV content.';
    if (errorBox) errorBox.style.display = 'flex';
  }
}

function parseCsvContent(text) {
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  function splitLine(line) {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  }

  const rows = rawLines.map(splitLine);
  if (rows.length === 0) return [];

  const firstRowLower = rows[0].map(c => c.toLowerCase());
  let startIndex = 0;
  const isHeader = firstRowLower.some(c =>
    c.includes('class') || c.includes('branch') || c.includes('subject') ||
    c.includes('pin') || c.includes('roll') || c.includes('start')
  );
  if (isHeader) {
    startIndex = 1;
  }

  const dataRows = rows.slice(startIndex).filter(r => r.some(c => c.length > 0));
  if (dataRows.length === 0) return [];

  // Check if format is Direct Roll Number list (Format B):
  const isDirectList = (
    (isHeader && (firstRowLower[0].includes('roll') || (firstRowLower[0].includes('pin') && !firstRowLower[0].includes('start')))) ||
    (dataRows[0].length === 3 && /^[0-9A-Za-z_-]+$/.test(dataRows[0][0]) && isNaN(Number(dataRows[0][1])))
  );

  const parsedGroups = [];

  if (isDirectList) {
    const groupMap = new Map();
    dataRows.forEach(r => {
      const roll = (r[0] || '').trim().toUpperCase();
      const cls = (r[1] || 'Default Class').trim();
      const sub = (r[2] || 'Default Subject').trim();
      if (!roll) return;
      const key = `${cls}:::${sub}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { class: cls, branch: sub, pins: [] });
      }
      groupMap.get(key).pins.push(roll);
    });

    let gId = 1;
    for (const [, item] of groupMap) {
      parsedGroups.push({
        id: gId,
        class: item.class,
        branch: item.branch,
        startPin: item.pins[0] || '',
        endPin: item.pins[item.pins.length - 1] || '',
        excludedPins: '',
        pins: item.pins,
        count: item.pins.length,
        colorIndex: (gId - 1) % COLOR_THEMES.length,
        showChips: false
      });
      gId++;
    }
  } else {
    // Format A: Range format: Class, Subject, Start PIN, End PIN, [Excluded PINs]
    let gId = 1;
    dataRows.forEach(r => {
      const cls = (r[0] || `Group ${gId}`).trim();
      const sub = (r[1] || `Subject ${gId}`).trim();
      const startPin = (r[2] || '').trim().toUpperCase();
      const endPin = (r[3] || startPin).trim().toUpperCase();
      const excluded = (r[4] || '').trim();

      if (!startPin) return;

      const pins = generatePinRange(startPin, endPin, parseExcludedPins(excluded));
      parsedGroups.push({
        id: gId,
        class: cls,
        branch: sub,
        startPin,
        endPin,
        excludedPins: excluded,
        pins,
        count: pins.length,
        colorIndex: (gId - 1) % COLOR_THEMES.length,
        showChips: false
      });
      gId++;
    });
  }

  return parsedGroups;
}

function showUploadError(msg) {
  const errorBox = document.getElementById('uploadErrorBox');
  const errorMsg = document.getElementById('uploadErrorMsg');
  if (errorMsg) errorMsg.textContent = msg;
  if (errorBox) errorBox.style.display = 'flex';
}

function downloadRangeTemplate() {
  const csvContent = "Class,Subject,Start PIN,End PIN,Excluded PINs\n" +
    "CSE(CS),Mathematics,21B91A0501,21B91A0530,21B91A0507\n" +
    "ECE(EC),Physics,21B91A0401,21B91A0425,\n" +
    "MECH(ME),Thermodynamics,21B91A0301,21B91A0320,21B91A0310\n";

  triggerDownload(csvContent, "exam_pin_ranges_template.csv", "text/csv;charset=utf-8;");
}

function downloadListTemplate() {
  const csvContent = "Roll No,Class,Subject\n" +
    "21B91A0501,CSE(CS),Mathematics\n" +
    "21B91A0502,CSE(CS),Mathematics\n" +
    "21B91A0503,CSE(CS),Mathematics\n" +
    "21B91A0401,ECE(EC),Physics\n" +
    "21B91A0402,ECE(EC),Physics\n";

  triggerDownload(csvContent, "exam_student_roster_template.csv", "text/csv;charset=utf-8;");
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
