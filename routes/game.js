const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Sortear próxima pergunta (monitor)
router.post('/next-question', async (req, res) => {
  try {
    const session = await pool.query(`SELECT * FROM game_session WHERE active = TRUE ORDER BY id DESC LIMIT 1`);
    if (session.rows.length === 0) return res.status(400).json({ error: 'Nenhuma sessão ativa' });

    const gs = session.rows[0];
    const asked = gs.asked_questions || [];

    // Busca pergunta não sorteada ainda
    const result = await pool.query(
      `SELECT * FROM questions WHERE id != ALL($1) ORDER BY RANDOM() LIMIT 1`,
      [asked.length > 0 ? asked : [0]]
    );

    if (result.rows.length === 0) return res.status(400).json({ error: 'Todas as perguntas já foram sorteadas' });

    const question = result.rows[0];
    const newAsked = [...asked, question.id];

    await pool.query(
      `UPDATE game_session SET asked_questions = $1, current_question_id = $2 WHERE id = $3`,
      [newAsked, question.id, gs.id]
    );

    res.json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao sortear pergunta' });
  }
});

// Marcar célula na cartela do aluno
router.post('/mark', async (req, res) => {
  const { player_id, question_id } = req.body;
  try {
    // Verifica se a pergunta já foi sorteada
    const session = await pool.query(`SELECT * FROM game_session WHERE active = TRUE ORDER BY id DESC LIMIT 1`);
    const gs = session.rows[0];
    const asked = gs.asked_questions || [];

    if (!asked.includes(question_id)) {
      return res.status(400).json({ error: 'Essa pergunta ainda não foi sorteada' });
    }

    await pool.query(
      `UPDATE player_answers SET marked = TRUE WHERE player_id = $1 AND question_id = $2`,
      [player_id, question_id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar célula' });
  }
});

// Desmarcar célula na cartela do aluno
router.post('/unmark', async (req, res) => {
  const { player_id, question_id } = req.body;
  try {
    await pool.query(
      `UPDATE player_answers SET marked = FALSE WHERE player_id = $1 AND question_id = $2`,
      [player_id, question_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desmarcar célula' });
  }
});

// Tentar bingo
router.post('/bingo', async (req, res) => {
  const { player_id } = req.body;
  try {
    const session = await pool.query(`SELECT * FROM game_session WHERE active = TRUE ORDER BY id DESC LIMIT 1`);
    const gs = session.rows[0];
    const asked = gs.asked_questions || [];

    // Busca cartela do jogador
    const playerResult = await pool.query(`SELECT * FROM players WHERE id = $1`, [player_id]);
    const player = playerResult.rows[0];
    const card = player.card; // array 25 posições

    // Busca marcações do jogador
    const answersResult = await pool.query(
      `SELECT question_id, marked FROM player_answers WHERE player_id = $1`,
      [player_id]
    );
    const markedIds = answersResult.rows.filter(a => a.marked).map(a => a.question_id);

    // Monta grid 5x5 com base na cartela
    const grid = card.map(cell => ({
      question_id: cell.question_id,
      marked: markedIds.includes(cell.question_id),
      valid: asked.includes(cell.question_id)
    }));

    // Verifica linhas, colunas e diagonais
    const isMarkedAndValid = (index) => grid[index].marked && grid[index].valid;

    let valid = false;
    for (let i = 0; i < 5; i++) {
      // Linha
      if ([0,1,2,3,4].every(j => isMarkedAndValid(i * 5 + j))) { valid = true; break; }
      // Coluna
      if ([0,1,2,3,4].every(j => isMarkedAndValid(j * 5 + i))) { valid = true; break; }
    }
    // Diagonal principal
    if (!valid && [0,1,2,3,4].every(i => isMarkedAndValid(i * 5 + i))) valid = true;
    // Diagonal secundária
    if (!valid && [0,1,2,3,4].every(i => isMarkedAndValid(i * 5 + (4 - i)))) valid = true;

    // Registra tentativa
    await pool.query(
      `INSERT INTO bingo_attempts (player_id, valid) VALUES ($1, $2)`,
      [player_id, valid]
    );

    if (valid) {
      await pool.query(
        `UPDATE game_session SET active = FALSE, winner_id = $1 WHERE id = $2`,
        [player_id, gs.id]
      );
    }

    res.json({ valid, player_name: player.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao validar bingo' });
  }
});

// Novo jogo — reseta tudo
router.post('/reset', async (req, res) => {
  try {
    await pool.query(`DELETE FROM bingo_attempts`);
    await pool.query(`DELETE FROM player_answers`);
    await pool.query(`UPDATE game_session SET active = FALSE, winner_id = NULL`);
    await pool.query(`DELETE FROM players WHERE is_monitor = FALSE`);
    await pool.query(`INSERT INTO game_session (active, asked_questions) VALUES (TRUE, '{}')`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao resetar jogo' });
  }
});

// Histórico de perguntas já sorteadas
router.get('/history', async (req, res) => {
  try {
    const session = await pool.query(`SELECT * FROM game_session ORDER BY id DESC LIMIT 1`);
    const gs = session.rows[0];
    const asked = gs.asked_questions || [];

    if (asked.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT * FROM questions WHERE id = ANY($1) ORDER BY id`,
      [asked]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// Estado da sessão
router.get('/session', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM game_session ORDER BY id DESC LIMIT 1`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar sessão' });
  }
});

module.exports = router;
