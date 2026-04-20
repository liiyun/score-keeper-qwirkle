const STORAGE_KEY_APP = 'score-keeper:app';
const STORAGE_KEY_TEAM_A = 'score-keeper:team-a';
const STORAGE_KEY_TEAM_B = 'score-keeper:team-b';

/** @typedef {{ at: string, scores: [number, number] }} HistoryEntry */
/** @typedef {{ id: string, name: string, history: HistoryEntry[] }} Game */
/** @typedef {{ version: 1, games: Game[], activeGameId: string | null }} AppState */

/** @type {AppState} */
let appState = { version: 1, games: [], activeGameId: null };

const teamAScoreEl = document.getElementById('team-a-score');
const teamBScoreEl = document.getElementById('team-b-score');
const scoreInputHaa = document.getElementById('score-input-haa');
const scoreInputLii = document.getElementById('score-input-lii');
const liveClockEl = document.getElementById('live-clock');
const pageTitleEl = document.getElementById('page-title');

function formatPageTitle(gameName) {
  const safe = String(gameName).replace(/"/g, "'");
  return `Score Keeper for "${safe}"`;
}
const gameSelectEl = document.getElementById('game-select');
const newGameNameEl = document.getElementById('new-game-name');
const createGameBtn = document.getElementById('create-game');
const applyScoresBtn = document.getElementById('apply-scores');
const revertBtn = document.getElementById('revert-btn');
const historyLogEl = document.getElementById('history-log');
const gameResetListEl = document.getElementById('game-reset-list');

/** Clears “add points” inputs when the active game changes. */
let lastRenderedGameId = null;

function newGameId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `g-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

/** @returns {[number, number]} */
function getTailScores(game) {
  const h = game.history;
  const last = h[h.length - 1];
  return [last.scores[0], last.scores[1]];
}

function clampNonNegative(n) {
  return Math.max(0, Math.floor(Number(n)) || 0);
}

function parseStoredScore(value) {
  if (value === null || value === '') return 0;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

/** @returns {AppState} */
function defaultAppState() {
  const id = newGameId();
  const game = {
    id,
    name: 'Game',
    history: [{ at: nowIso(), scores: [0, 0] }],
  };
  return { version: 1, games: [game], activeGameId: id };
}

/** @returns {AppState | null} */
function loadRawAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APP);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.version === 1 && Array.isArray(data.games)) return data;
  } catch (_) {}
  return null;
}

function migrateLegacyIfNeeded() {
  const existing = loadRawAppState();
  if (existing) return existing;

  const a = localStorage.getItem(STORAGE_KEY_TEAM_A);
  const b = localStorage.getItem(STORAGE_KEY_TEAM_B);
  if (a !== null || b !== null) {
    const haa = Math.max(0, parseStoredScore(a));
    const lii = Math.max(0, parseStoredScore(b));
    const id = newGameId();
    const migrated = {
      version: 1,
      games: [{ id, name: 'Game', history: [{ at: nowIso(), scores: [haa, lii] }] }],
      activeGameId: id,
    };
    try {
      localStorage.removeItem(STORAGE_KEY_TEAM_A);
      localStorage.removeItem(STORAGE_KEY_TEAM_B);
    } catch (_) {}
    return migrated;
  }

  return null;
}

function loadAppState() {
  const migrated = migrateLegacyIfNeeded();
  if (migrated) {
    appState = normalizeAppState(migrated);
    saveAppState();
    return;
  }
  appState = defaultAppState();
  saveAppState();
}

/** @param {AppState} state */
function normalizeAppState(state) {
  const games = state.games.filter((g) => g && g.id && typeof g.name === 'string' && Array.isArray(g.history) && g.history.length > 0);
  if (games.length === 0) return defaultAppState();
  let activeGameId = state.activeGameId;
  if (!activeGameId || !games.some((g) => g.id === activeGameId)) {
    activeGameId = games[0].id;
  }
  for (const g of games) {
    g.history = g.history.filter((e) => e && e.at && Array.isArray(e.scores) && e.scores.length === 2);
    if (g.history.length === 0) {
      g.history = [{ at: nowIso(), scores: [0, 0] }];
    }
  }
  return { version: 1, games, activeGameId };
}

function saveAppState() {
  try {
    localStorage.setItem(STORAGE_KEY_APP, JSON.stringify(appState));
  } catch (_) {}
}

function getActiveGame() {
  const id = appState.activeGameId;
  return appState.games.find((g) => g.id === id) ?? appState.games[0] ?? null;
}

/** @param {number} haa @param {number} lii */
function commitScores(haa, lii) {
  const game = getActiveGame();
  if (!game) return;

  const h = clampNonNegative(haa);
  const l = clampNonNegative(lii);
  const [curH, curL] = getTailScores(game);
  if (h === curH && l === curL) return;

  game.history.push({ at: nowIso(), scores: [h, l] });
  saveAppState();
  render();
}

function render() {
  const game = getActiveGame();
  if (!game) return;

  const [haa, lii] = getTailScores(game);

  if (lastRenderedGameId !== game.id) {
    scoreInputHaa.value = '';
    scoreInputLii.value = '';
    lastRenderedGameId = game.id;
  }

  teamAScoreEl.textContent = String(haa);
  teamBScoreEl.textContent = String(lii);

  const titleText = formatPageTitle(game.name);
  document.title = titleText;
  pageTitleEl.textContent = titleText;

  gameSelectEl.innerHTML = '';
  for (const g of appState.games) {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    gameSelectEl.appendChild(opt);
  }
  gameSelectEl.value = game.id;

  historyLogEl.innerHTML = '';
  for (const entry of game.history) {
    const li = document.createElement('li');
    const t = new Date(entry.at);
    const timeStr = t.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    li.textContent = `${timeStr} — Haa: ${entry.scores[0]}, Lii: ${entry.scores[1]}`;
    historyLogEl.appendChild(li);
  }

  revertBtn.disabled = game.history.length <= 1;

  gameResetListEl.innerHTML = '';
  for (const g of appState.games) {
    const row = document.createElement('div');
    row.className = 'game-reset-row';
    row.setAttribute('role', 'listitem');
    const nameWrap = document.createElement('div');
    nameWrap.className = 'game-reset-name-wrap';
    const nameBtn = document.createElement('button');
    nameBtn.type = 'button';
    nameBtn.className = 'game-reset-name game-reset-name-trigger';
    nameBtn.textContent = g.name;
    nameBtn.dataset.editNameGameId = g.id;
    nameBtn.title = 'Click to edit name';
    nameBtn.setAttribute('aria-label', `Edit name: ${g.name}`);
    nameWrap.appendChild(nameBtn);

    const actions = document.createElement('div');
    actions.className = 'game-reset-actions';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn-reset-game';
    resetBtn.textContent = 'Reset score';
    resetBtn.dataset.resetGameId = g.id;
    resetBtn.setAttribute('aria-label', `Reset score for ${g.name} to zero and clear its history`);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete-game btn-icon';
    deleteBtn.dataset.deleteGameId = g.id;
    deleteBtn.setAttribute('aria-label', `Delete ${g.name}`);
    deleteBtn.title = `Delete ${g.name}`;
    deleteBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

    actions.appendChild(resetBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(nameWrap);
    row.appendChild(actions);
    gameResetListEl.appendChild(row);
  }
}

function onIncrementA() {
  const game = getActiveGame();
  if (!game) return;
  const [h, l] = getTailScores(game);
  commitScores(h + 1, l);
}

function onDecrementA() {
  const game = getActiveGame();
  if (!game) return;
  const [h, l] = getTailScores(game);
  commitScores(Math.max(0, h - 1), l);
}

function onIncrementB() {
  const game = getActiveGame();
  if (!game) return;
  const [h, l] = getTailScores(game);
  commitScores(h, l + 1);
}

function onDecrementB() {
  const game = getActiveGame();
  if (!game) return;
  const [h, l] = getTailScores(game);
  commitScores(h, Math.max(0, l - 1));
}

function onApplyScores() {
  const game = getActiveGame();
  if (!game) return;
  const [curH, curL] = getTailScores(game);

  const rawH = scoreInputHaa.value.trim();
  const rawL = scoreInputLii.value.trim();
  const deltaH = rawH === '' ? 0 : Number.parseInt(rawH, 10);
  const deltaL = rawL === '' ? 0 : Number.parseInt(rawL, 10);

  if (rawH !== '' && !Number.isFinite(deltaH)) return;
  if (rawL !== '' && !Number.isFinite(deltaL)) return;

  if (deltaH === 0 && deltaL === 0) return;

  const newH = Math.max(0, curH + deltaH);
  const newL = Math.max(0, curL + deltaL);
  commitScores(newH, newL);
  scoreInputHaa.value = '';
  scoreInputLii.value = '';
}

function onRevert() {
  const game = getActiveGame();
  if (!game || game.history.length <= 1) return;
  game.history.pop();
  saveAppState();
  render();
}

function onGameSelectChange() {
  const id = gameSelectEl.value;
  if (!id || !appState.games.some((g) => g.id === id)) return;
  appState.activeGameId = id;
  saveAppState();
  render();
}

function onResetGameById(gameId) {
  const target = appState.games.find((g) => g.id === gameId);
  if (!target) return;
  if (!window.confirm(`Reset score for "${target.name.replace(/"/g, "'")}" to 0–0 and clear its history?`)) return;
  target.history = [{ at: nowIso(), scores: [0, 0] }];
  saveAppState();
  render();
}

function beginEditGameName(trigger) {
  const gameId = trigger.getAttribute('data-edit-name-game-id');
  const game = appState.games.find((g) => g.id === gameId);
  if (!game) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'game-reset-name-input';
  input.value = game.name;
  input.maxLength = 80;
  input.setAttribute('aria-label', 'Board game name');

  const finish = (save) => {
    input.removeEventListener('blur', onBlur);
    input.removeEventListener('keydown', onKey);
    if (save) {
      const trimmed = input.value.trim();
      if (!trimmed) {
        window.alert('Name cannot be empty.');
        render();
        return;
      }
      if (trimmed.length > 80) {
        window.alert('Name is too long (80 characters max).');
        render();
        return;
      }
      game.name = trimmed;
      saveAppState();
    }
    render();
  };

  const onBlur = () => finish(true);

  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.removeEventListener('blur', onBlur);
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.removeEventListener('blur', onBlur);
      finish(false);
    }
  };

  trigger.replaceWith(input);
  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKey);
  input.focus();
  input.select();
}

function onDeleteGameById(gameId) {
  if (appState.games.length <= 1) {
    window.alert('You need at least one game. Create another game before deleting this one.');
    return;
  }
  const target = appState.games.find((g) => g.id === gameId);
  if (!target) return;
  if (!window.confirm(`Delete "${target.name}" and all its scores? This cannot be undone.`)) return;

  const wasActive = appState.activeGameId === gameId;
  appState.games = appState.games.filter((g) => g.id !== gameId);

  if (wasActive || !appState.games.some((g) => g.id === appState.activeGameId)) {
    appState.activeGameId = appState.games[0].id;
    lastRenderedGameId = null;
  }

  saveAppState();
  render();
}

function onCreateGame() {
  const name = newGameNameEl.value.trim();
  if (!name) return;

  const id = newGameId();
  const newGame = {
    id,
    name,
    history: [{ at: nowIso(), scores: [0, 0] }],
  };
  appState.games.push(newGame);
  appState.activeGameId = id;
  newGameNameEl.value = '';
  saveAppState();
  render();
}

function updateLiveClock() {
  const now = new Date();
  liveClockEl.dateTime = now.toISOString();
  liveClockEl.textContent = now.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

loadAppState();
render();

updateLiveClock();
setInterval(updateLiveClock, 1000);

document.getElementById('team-a-increment').addEventListener('click', onIncrementA);
document.getElementById('team-a-decrement').addEventListener('click', onDecrementA);
document.getElementById('team-b-increment').addEventListener('click', onIncrementB);
document.getElementById('team-b-decrement').addEventListener('click', onDecrementB);
applyScoresBtn.addEventListener('click', onApplyScores);
revertBtn.addEventListener('click', onRevert);
gameSelectEl.addEventListener('change', onGameSelectChange);
createGameBtn.addEventListener('click', onCreateGame);
newGameNameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    onCreateGame();
  }
});

gameResetListEl.addEventListener('click', (e) => {
  const nameTrigger = e.target.closest('[data-edit-name-game-id]');
  if (nameTrigger && gameResetListEl.contains(nameTrigger)) {
    beginEditGameName(nameTrigger);
    return;
  }

  const t = e.target.closest('button');
  if (!t || !gameResetListEl.contains(t)) return;

  const resetId = t.getAttribute('data-reset-game-id');
  if (resetId) {
    onResetGameById(resetId);
    return;
  }
  const deleteId = t.getAttribute('data-delete-game-id');
  if (deleteId) {
    onDeleteGameById(deleteId);
  }
});
