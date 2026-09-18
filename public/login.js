const enterBtn = document.getElementById('enterBtn');
const nameInput = document.getElementById('nameInput');
const loginError = document.getElementById('loginError');

enterBtn.addEventListener('click', login);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

async function login() {
  const name = nameInput.value.trim();
  if (!name) {
    loginError.textContent = 'Digite seu nome!';
    return;
  }

  enterBtn.disabled = true;
  loginError.textContent = '';

  try {
    const res = await fetch('/api/players/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const player = await res.json();

    if (!res.ok) {
      loginError.textContent = player.error || 'Erro ao entrar.';
      enterBtn.disabled = false;
      return;
    }

    localStorage.setItem('player', JSON.stringify(player));

    if (player.is_monitor) {
      window.location.href = '/monitor.html';
    } else {
      window.location.href = '/player.html';
    }
  } catch (err) {
    loginError.textContent = 'Erro de conexão.';
    enterBtn.disabled = false;
  }
}
