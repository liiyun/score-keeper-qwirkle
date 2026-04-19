const STORAGE_KEY_TEAM_A = 'score-keeper:team-a';
const STORAGE_KEY_TEAM_B = 'score-keeper:team-b';

let teamAScore = 0;
let teamBScore = 0;

const teamAScoreEl = document.getElementById('team-a-score');
const teamBScoreEl = document.getElementById('team-b-score');

function parseStoredScore(value) {
  if (value === null || value === '') return 0;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function saveScoresToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_TEAM_A, String(teamAScore));
    localStorage.setItem(STORAGE_KEY_TEAM_B, String(teamBScore));
  } catch (_) {
    /* ignore quota / private mode */
  }
}

function loadScoresFromLocalStorage() {
  teamAScore = Math.max(0, parseStoredScore(localStorage.getItem(STORAGE_KEY_TEAM_A)));
  teamBScore = Math.max(0, parseStoredScore(localStorage.getItem(STORAGE_KEY_TEAM_B)));
  displayTeamAScore();
  displayTeamBScore();
}

function displayTeamAScore() {
  teamAScoreEl.textContent = String(teamAScore);
}

function displayTeamBScore() {
  teamBScoreEl.textContent = String(teamBScore);
}

function incrementTeamA() {
  teamAScore += 1;
  displayTeamAScore();
  saveScoresToLocalStorage();
}

function decrementTeamA() {
  teamAScore = Math.max(0, teamAScore - 1);
  displayTeamAScore();
  saveScoresToLocalStorage();
}

function incrementTeamB() {
  teamBScore += 1;
  displayTeamBScore();
  saveScoresToLocalStorage();
}

function decrementTeamB() {
  teamBScore = Math.max(0, teamBScore - 1);
  displayTeamBScore();
  saveScoresToLocalStorage();
}

loadScoresFromLocalStorage();

document.getElementById('team-a-increment').addEventListener('click', incrementTeamA);
document.getElementById('team-a-decrement').addEventListener('click', decrementTeamA);
document.getElementById('team-b-increment').addEventListener('click', incrementTeamB);
document.getElementById('team-b-decrement').addEventListener('click', decrementTeamB);
