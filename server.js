require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('Conectado ao banco Neon com sucesso!'))
  .catch(err => console.error('Erro ao conectar ao banco:', err.message));

app.use(express.json());
app.use(express.static('public'));

// Rotas
const playersRouter = require('./routes/players');
const gameRouter = require('./routes/game');
app.use('/api/players', playersRouter);
app.use('/api/game', gameRouter);

// Socket.io — tempo real
io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  // Monitor sorteia pergunta → emite para todos
  socket.on('new_question', (question) => {
    io.emit('question_received', question);
  });

  // Alguém tentou bingo
  socket.on('bingo_attempt', (data) => {
    io.emit('bingo_result', data);
  });

  // Novo jogo — reseta e redireciona todos
  socket.on('game_reset', () => {
    io.emit('game_reset');
  });

  // Jogo encerrado
  socket.on('game_over', (data) => {
    io.emit('game_finished', data);
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
  });
});

// Exporta io para uso nas rotas se necessário
app.set('io', io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
