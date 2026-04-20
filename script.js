// ===== CONFIG =====
const MONTH_NAMES = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Sol","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
];

const WEEKDAYS = ["","","","","","",""];
const DAYS_PER_MONTH = 28;
const TOTAL_MONTHS = 13;

// ===== STATE =====
const state = {
  currentMonthIdx: null,
  notes: {},      // key: "m-d" → string
  titles: {},     // key: monthIndex → string
};

// ===== HELPERS =====
function getTodayIn13() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now - start) / 86400000); // 1-365
  const monthIdx = Math.floor((dayOfYear - 1) / DAYS_PER_MONTH); // 0-12
  const dayInMonth = ((dayOfYear - 1) % DAYS_PER_MONTH) + 1;     // 1-28
  return { monthIdx, dayInMonth, dayOfYear };
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now - start) / 86400000);
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getTotalDays() {
  return isLeapYear(new Date().getFullYear()) ? 366 : 365;
}

// ===== STORAGE =====
function saveData() {
  localStorage.setItem('cal13_notes', JSON.stringify(state.notes));
  localStorage.setItem('cal13_titles', JSON.stringify(state.titles));
}

function loadData() {
  try {
    state.notes = JSON.parse(localStorage.getItem('cal13_notes')) || {};
    state.titles = JSON.parse(localStorage.getItem('cal13_titles')) || {};
  } catch(e) {
    state.notes = {};
    state.titles = {};
  }
}

// ===== NOTE KEY =====
function noteKey(monthIdx, day) {
  return `${monthIdx}-${day}`;
}

// ===== RENDER MONTH CARDS =====
function renderGrid() {
  const grid = document.getElementById('monthsGrid');
  grid.innerHTML = '';
  const today = getTodayIn13();

  for (let m = 0; m < TOTAL_MONTHS; m++) {
    const card = document.createElement('div');
    card.className = 'month-card';
    if (m === today.monthIdx) card.classList.add('is-current-month');
    card.dataset.month = m;

    const numLabel = `${String(m + 1).padStart(2, '0')}. Ay`;
    const title = state.titles[m] || '';

    // Mini day grid
    let miniDays = '';
    for (let d = 1; d <= DAYS_PER_MONTH; d++) {
      const isToday = (m === today.monthIdx && d === today.dayInMonth);
      const hasNote = !!state.notes[noteKey(m, d)];
      let cls = 'mini-day';
      if (isToday) cls += ' is-today';
      if (hasNote) cls += ' has-note';
      miniDays += `<div class="${cls}"></div>`;
    }

    card.innerHTML = `
      <div class="card-num">${numLabel}</div>
      <div class="card-name">${MONTH_NAMES[m]}</div>
      <div class="card-title">${title || '&nbsp;'}</div>
      <div class="card-days">${miniDays}</div>
    `;

    card.addEventListener('click', () => openModal(m));
    grid.appendChild(card);

    // Stagger animation
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, m * 50);
  }
}

// ===== OPEN MODAL =====
function openModal(monthIdx) {
  state.currentMonthIdx = monthIdx;
  const today = getTodayIn13();

  document.getElementById('modalMonthNum').textContent = `${String(monthIdx + 1).padStart(2, '0')}. Ay`;
  document.getElementById('modalMonthTitle').textContent = MONTH_NAMES[monthIdx];
  document.getElementById('modalTitleInput').value = state.titles[monthIdx] || '';

  renderModalCalendar(monthIdx, today);
  renderNoteList(monthIdx);

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ===== MODAL CALENDAR =====
function renderModalCalendar(monthIdx, today) {
  const container = document.getElementById('modalCalendar');
  
  let html = `<div class="cal-weekdays">`;
  WEEKDAYS.forEach(d => html += `<div class="cal-weekday">${d}</div>`);
  html += `</div><div class="cal-days">`;

  for (let d = 1; d <= DAYS_PER_MONTH; d++) {
    const isToday = (monthIdx === today.monthIdx && d === today.dayInMonth);
    const hasNote = !!state.notes[noteKey(monthIdx, d)];
    let cls = 'cal-day';
    if (isToday) cls += ' today';
    if (hasNote) cls += ' has-note';
    html += `<div class="${cls}" data-day="${d}">${d}</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll('.cal-day').forEach(el => {
    el.addEventListener('click', () => {
      openDayNote(monthIdx, parseInt(el.dataset.day));
    });
  });
}

// ===== NOTE LIST =====
function renderNoteList(monthIdx) {
  const display = document.getElementById('noteDisplay');
  const notesForMonth = [];

  for (let d = 1; d <= DAYS_PER_MONTH; d++) {
    const k = noteKey(monthIdx, d);
    if (state.notes[k]) {
      notesForMonth.push({ day: d, text: state.notes[k] });
    }
  }

  if (notesForMonth.length === 0) {
    display.innerHTML = `<div class="no-notes">Henüz not eklenmemiş.</div>`;
    return;
  }

  display.innerHTML = notesForMonth.map(n => `
    <div class="note-item">
      <span class="note-item-date">${MONTH_NAMES[monthIdx]} ${n.day}</span>
      <span class="note-item-text">${escapeHtml(n.text)}</span>
      <button class="note-delete" data-day="${n.day}" title="Sil">✕</button>
    </div>
  `).join('');

  display.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day);
      delete state.notes[noteKey(monthIdx, day)];
      saveData();
      renderNoteList(monthIdx);
      renderModalCalendar(monthIdx, getTodayIn13());
      renderGrid();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== CLOSE MODAL =====
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
  state.currentMonthIdx = null;
}

// ===== DAY NOTE =====
let currentDayNoteData = null;

function openDayNote(monthIdx, day) {
  currentDayNoteData = { monthIdx, day };
  const k = noteKey(monthIdx, day);
  document.getElementById('dayNoteDate').textContent = `${MONTH_NAMES[monthIdx]} — ${day}. Gün`;
  document.getElementById('dayNoteInput').value = state.notes[k] || '';
  document.getElementById('dayNoteOverlay').classList.add('active');
}

function closeDayNote() {
  document.getElementById('dayNoteOverlay').classList.remove('active');
  currentDayNoteData = null;
}

// ===== COUNTER =====
function updateCounter() {
  const dayOfYear = getDayOfYear();
  const totalDays = getTotalDays();
  document.getElementById('counterCurrent').textContent = dayOfYear;
  document.getElementById('counterTotal').textContent = totalDays;
  const pct = (dayOfYear / totalDays) * 100;
  document.getElementById('counterFill').style.width = pct + '%';
}

// ===== YEAR =====
function updateYear() {
  document.getElementById('yearDisplay').textContent = new Date().getFullYear();
}

// ===== THEME =====
function initTheme() {
  const saved = localStorage.getItem('cal13_theme') || 'theme-light';
  setTheme(saved);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.theme === saved) btn.classList.add('active');
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
    });
  });
}

function setTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('cal13_theme', theme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// ===== EVENTS =====
function bindEvents() {
  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Save title
  document.getElementById('saveTitleBtn').addEventListener('click', () => {
    const val = document.getElementById('modalTitleInput').value.trim();
    if (state.currentMonthIdx !== null) {
      state.titles[state.currentMonthIdx] = val;
      saveData();
      renderGrid();
    }
  });

  document.getElementById('modalTitleInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('saveTitleBtn').click();
  });

  // Day note close
  document.getElementById('dayNoteClose').addEventListener('click', closeDayNote);
  document.getElementById('dayNoteOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('dayNoteOverlay')) closeDayNote();
  });

  // Save day note
  document.getElementById('saveDayNote').addEventListener('click', () => {
    if (!currentDayNoteData) return;
    const text = document.getElementById('dayNoteInput').value.trim();
    const k = noteKey(currentDayNoteData.monthIdx, currentDayNoteData.day);
    if (text) {
      state.notes[k] = text;
    } else {
      delete state.notes[k];
    }
    saveData();

    // Re-render open modal
    if (state.currentMonthIdx !== null) {
      renderModalCalendar(state.currentMonthIdx, getTodayIn13());
      renderNoteList(state.currentMonthIdx);
    }
    renderGrid();
    closeDayNote();
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('dayNoteOverlay').classList.contains('active')) {
        closeDayNote();
      } else if (document.getElementById('modalOverlay').classList.contains('active')) {
        closeModal();
      }
    }
  });
}

// ===== INIT =====
function init() {
  loadData();
  initTheme();
  updateYear();
  updateCounter();
  renderGrid();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
