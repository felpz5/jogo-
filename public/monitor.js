const socket = io();
const player = JSON.parse(localStorage.getItem('player'));

if (!player || !player.is_monitor) window.location.href = '/';

document.getElementById('monitorName').textContent = player.name;

const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const endGameBtn = document.getElementById('endGameBtn');
const newGameBtn = document.getElementById('newGameBtn');
const refreshRankingBtn = document.getElementById('refreshRankingBtn');
const currentQuestion = document.getElementById('currentQuestion');
const currentAnswer = document.getElementById('currentAnswer');
const historyList = document.getElementById('historyList');
const bingoAttempts = document.getElementById('bingoAttempts');
const rankingList = document.getElementById('rankingList');

let attemptCount = 0;

// Sortear próxima pergunta
nextQuestionBtn.addEventListener('click', async () => {
  nextQuestionBtn.disabled = true;

  const res = await fetch('/api/game/next-question', { method: 'POST' });
  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    nextQuestionBtn.disabled = false;
    return;
  }

  currentQuestion.textContent = data.question;
  currentAnswer.style.display = 'inline-flex';
  document.getElementById('answerText').textContent = data.answer;

  const asked = historyList.querySelectorAll('.history-item').length + 1;
  const counter = document.getElementById('questionCounter');
  if (counter) counter.textContent = `#${asked}`;
  const statQ = document.getElementById('statQuestions');
  if (statQ) statQ.textContent = asked;

  socket.emit('new_question', data);
  addToHistory(data);

  nextQuestionBtn.disabled = false;
});

// Novo jogo
newGameBtn.addEventListener('click', async () => {
  if (!confirm('Isso vai apagar todos os jogadores e reiniciar o jogo. Confirmar?')) return;
  const res = await fetch('/api/game/reset', { method: 'POST' });
  if (!res.ok) { alert('Erro ao reiniciar o jogo'); return; }
  socket.emit('game_reset');
  // Limpa UI
  currentQuestion.textContent = 'Nenhuma pergunta sorteada ainda. Clique em "Sortear Pergunta" para começar!';
  currentAnswer.style.display = 'none';
  document.getElementById('questionCounter').textContent = '#0';
  document.getElementById('statQuestions').textContent = '0';
  document.getElementById('statAttempts').textContent = '0';
  document.getElementById('statStatus').textContent = 'Ativo';
  bingoAttempts.innerHTML = '<div class="empty-state">Nenhuma tentativa ainda</div>';
  historyList.innerHTML = '<div class="empty-state">Nenhuma pergunta sorteada</div>';
  attemptCount = 0;
  loadRanking();
});

// Encerrar jogo
endGameBtn.addEventListener('click', () => {
  if (!confirm('Deseja encerrar o jogo?')) return;
  const statS = document.getElementById('statStatus');
  if (statS) statS.textContent = 'Encerrado';
  socket.emit('game_over', { winner_name: 'Monitor encerrou o jogo' });
});

// Atualizar ranking
refreshRankingBtn.addEventListener('click', loadRanking);

// Recebe tentativas de bingo
socket.on('bingo_result', (data) => {
  const empty = bingoAttempts.querySelector('.empty-state');
  if (empty) empty.remove();
  const div = document.createElement('div');
  div.classList.add('attempt-item', data.valid ? 'valid' : 'invalid');
  const icon = data.valid
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  div.innerHTML = `<span class="attempt-dot"></span>${icon} ${data.player_name}`;
  bingoAttempts.prepend(div);
  attemptCount++;
  const statA = document.getElementById('statAttempts');
  if (statA) statA.textContent = attemptCount;
});

// Jogo encerrado
socket.on('game_finished', (data) => {
  alert(`🏁 Jogo encerrado! Vencedor: ${data.winner_name}`);
  const statS = document.getElementById('statStatus');
  if (statS) statS.textContent = 'Encerrado';
  loadRanking();
});

function addToHistory(question) {
  const empty = historyList.querySelector('.empty-state');
  if (empty) empty.remove();
  const num = historyList.querySelectorAll('.history-item').length + 1;
  const div = document.createElement('div');
  div.classList.add('history-item');
  div.innerHTML = `<span class="history-num">${num}</span><span>${question.question}</span>`;
  historyList.prepend(div);
}

async function loadRanking() {
  const res = await fetch('/api/players/ranking/all');
  const ranking = await res.json();
  rankingList.innerHTML = '';

  const statP = document.getElementById('statPlayers');
  if (statP) statP.textContent = ranking.length;

  if (ranking.length === 0) {
    rankingList.innerHTML = '<div class="empty-state">Nenhum jogador ainda</div>';
    return;
  }

  ranking.forEach((p, i) => {
    const div = document.createElement('div');
    div.classList.add('ranking-item');
    const medal = i === 0
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#fbbf24" opacity="0.2"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b"/></svg>`
      : i === 1
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#94a3b8" opacity="0.2"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#94a3b8"/></svg>`
      : i === 2
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#fb923c" opacity="0.2"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#fb923c"/></svg>`
      : `<span style="font-size:0.75rem;color:#94a3b8;font-weight:700">${i + 1}.</span>`;
    div.innerHTML = `<span>${medal} ${p.name}</span><span class="rank-score">${p.correct} acertos</span>`;
    rankingList.appendChild(div);
  });
}

async function loadHistory() {
  const res = await fetch('/api/game/history');
  const history = await res.json();
  if (history.length > 0) {
    history.forEach(q => addToHistory(q));
    const statQ = document.getElementById('statQuestions');
    if (statQ) statQ.textContent = history.length;
    const counter = document.getElementById('questionCounter');
    if (counter) counter.textContent = `#${history.length}`;
  }
}

loadHistory();
loadRanking();
