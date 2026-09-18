const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Login / entrada no jogo
router.post('/login', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });

  try {
    // Verifica se já existe
    let result = await pool.query(`SELECT * FROM players WHERE name = $1`, [name]);

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Busca todas as respostas para montar cartela
    const questionsResult = await pool.query(`SELECT id, answer FROM questions`);
    const answers = questionsResult.rows;

    // Embaralha e pega 25
    const shuffled = answers.sort(() => Math.random() - 0.5).slice(0, 25);
    const card = shuffled.map(q => ({ question_id: q.id, answer: q.answer, marked: false }));

    // Insere novo aluno
    const insert = await pool.query(
      `INSERT INTO players (name, is_monitor, card) VALUES ($1, FALSE, $2) RETURNING *`,
      [name, JSON.stringify(card)]
    );

    // Registra as respostas do aluno na tabela player_answers
    const player = insert.rows[0];
    for (const cell of card) {
      await pool.query(
        `INSERT INTO player_answers (player_id, question_id, marked) VALUES ($1, $2, FALSE)`,
        [player.id, cell.question_id]
      );
    }

    return res.json(player);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Busca dados do jogador
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM players WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Jogador não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar jogador' });
  }
});

// Ranking
router.get('/ranking/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name,
        COUNT(CASE WHEN pa.marked = TRUE THEN 1 END) AS correct
      FROM players p
      LEFT JOIN player_answers pa ON pa.player_id = p.id
      WHERE p.is_monitor = FALSE
      GROUP BY p.id, p.name
      ORDER BY correct DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

// Marcações do jogador
router.get('/:id/answers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT question_id, marked FROM player_answers WHERE player_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
});

// Resultado individual do aluno ao fim do jogo
router.get('/:id/result', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.question, q.answer, pa.marked
      FROM player_answers pa
      JOIN questions q ON q.id = pa.question_id
      JOIN game_session gs ON pa.question_id = ANY(gs.asked_questions)
      WHERE pa.player_id = $1
      ORDER BY q.id
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resultado' });
  }
});

module.exports = router;
