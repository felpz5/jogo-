const socket = io();
const player = JSON.parse(localStorage.getItem('player'));

if (!player || player.is_monitor) window.location.href = '/';

document.getElementById('playerName').textContent = player.name;

const card = player.card;
const bingoCard = document.getElementById('bingoCard');
const questionBox = document.getElementById('questionBox');
const waitingBox = document.getElementById('waitingBox');
const currentQuestion = document.getElementById('currentQuestion');
const bingoBtn = document.getElementById('bingoBtn');
const bingoMsg = document.getElementById('bingoMsg');

let markedIds = [];
let askedQuestionIds = [];
let gameOver = false;

// Carrega estado inicial: perguntas já sorteadas e células já marcadas
async function loadInitialState() {
  const [historyRes, answersRes] = await Promise.all([
    fetch('/api/game/history'),
    fetch(`/api/players/${player.id}/answers`)
  ]);
  const history = await historyRes.json();
  const answers = await answersRes.json();

  askedQuestionIds = history.map(q => q.id);
  markedIds = answers.filter(a => a.marked).map(a => a.question_id);

  // Atualiza visual das células já marcadas
  document.querySelectorAll('.bingo-cell').forEach(div => {
    const qid = parseInt(div.dataset.questionId);
    if (markedIds.includes(qid)) div.classList.add('marked');
  });

  if (askedQuestionIds.length > 0) {
    questionBox.classList.remove('hidden');
    waitingBox.classList.add('hidden');
  }

  updateBingoBtn();
}

// Verifica se há linha, coluna ou diagonal completa
function checkBingoPossible() {
  const grid = card.map(cell => markedIds.includes(cell.question_id) && askedQuestionIds.includes(cell.question_id));

  for (let i = 0; i < 5; i++) {
    if ([0,1,2,3,4].every(j => grid[i * 5 + j])) return true; // linha
    if ([0,1,2,3,4].every(j => grid[j * 5 + i])) return true; // coluna
  }
  if ([0,1,2,3,4].every(i => grid[i * 5 + i])) return true;       // diagonal principal
  if ([0,1,2,3,4].every(i => grid[i * 5 + (4 - i)])) return true; // diagonal secundária
  return false;
}

function updateBingoBtn() {
  const possible = checkBingoPossible();
  bingoBtn.disabled = !possible;
  bingoBtn.classList.toggle('bingo-btn-ready', possible);
}

// Renderiza cartela
card.forEach((cell, index) => {
  const div = document.createElement('div');
  div.classList.add('bingo-cell');
  div.dataset.questionId = cell.question_id;
  div.dataset.index = index;

  div.innerHTML = `
    <span class="cell-text">${cell.answer}</span>
    <span class="cell-check">
      <svg viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4" stroke="#4a044e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </span>
  `;

  div.addEventListener('click', () => {
    if (gameOver) return;
    if (!askedQuestionIds.includes(cell.question_id)) return; // bloqueia se pergunta não foi sorteada

    if (markedIds.includes(cell.question_id)) {
      markedIds = markedIds.filter(id => id !== cell.question_id);
      div.classList.remove('marked');

      fetch('/api/game/unmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id, question_id: cell.question_id })
      });
    } else {
      markedIds.push(cell.question_id);
      div.classList.add('marked');

      fetch('/api/game/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id, question_id: cell.question_id })
      });
    }

    updateBingoBtn();
  });

  bingoCard.appendChild(div);
});

loadInitialState();

// Jogo resetado — volta para login
socket.on('game_reset', () => {
  localStorage.removeItem('player');
  window.location.href = '/';
});

// Recebe nova pergunta do monitor
socket.on('question_received', (question) => {
  askedQuestionIds.push(question.id);
  currentQuestion.textContent = question.question;
  questionBox.classList.remove('hidden');
  waitingBox.classList.add('hidden');
  const num = document.getElementById('questionNum');
  if (num) num.textContent = `#${askedQuestionIds.length}`;
  updateBingoBtn();
});

// Resultado de tentativa de bingo
socket.on('bingo_result', (data) => {
  if (data.player_id === player.id) {
    if (!data.valid) {
      bingoMsg.textContent = '❌ Seu bingo não é válido, o jogo continua!';
      bingoMsg.className = 'bingo-msg error-msg';
    }
  } else if (data.valid) {
    bingoMsg.textContent = `🎉 ${data.player_name} fez BINGO!`;
    bingoMsg.className = 'bingo-msg success-msg';
  }
});

// Jogo encerrado
socket.on('game_finished', async (data) => {
  gameOver = true;
  bingoBtn.disabled = true;
  bingoMsg.textContent = `🏁 Jogo encerrado! Vencedor: ${data.winner_name}`;
  bingoMsg.className = 'bingo-msg finish-msg';

  const res = await fetch(`/api/players/${player.id}/result`);
  const results = await res.json();

  const resultSection = document.getElementById('resultSection');
  const resultList = document.getElementById('resultList');
  resultSection.classList.remove('hidden');

  results.forEach(r => {
    const div = document.createElement('div');
    div.classList.add('result-item', r.marked ? 'correct' : 'wrong');
    const icon = r.marked
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    div.innerHTML = `
      <span class="result-icon">${icon}</span>
      <span class="result-question">${r.question}</span>
      <span class="result-answer">${r.answer}</span>
    `;
    resultList.appendChild(div);
  });

  const rankRes = await fetch('/api/players/ranking/all');
  const ranking = await rankRes.json();

  const rankingSection = document.getElementById('rankingSection');
  const rankingList = document.getElementById('rankingList');
  rankingSection.classList.remove('hidden');

  ranking.forEach((p, i) => {
    const div = document.createElement('div');
    div.classList.add('ranking-item');
    const medal = i === 0
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b"/></svg>`
      : i === 1
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#94a3b8"/></svg>`
      : i === 2
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#fb923c"/></svg>`
      : `<span style="font-size:0.75rem;font-weight:700">${i + 1}.</span>`;
    div.innerHTML = `<span>${medal} ${p.name}</span><span>${p.correct} acertos</span>`;
    rankingList.appendChild(div);
  });
});

// Botão BINGO — começa desabilitado
bingoBtn.disabled = true;

bingoBtn.addEventListener('click', async () => {
  if (gameOver) return;
  bingoMsg.textContent = '⏳ Verificando...';
  bingoMsg.className = 'bingo-msg';

  const res = await fetch('/api/game/bingo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_id: player.id })
  });

  const data = await res.json();
  socket.emit('bingo_attempt', { ...data, player_id: player.id });

  if (data.valid) {
    socket.emit('game_over', { winner_name: player.name });
  }
});
