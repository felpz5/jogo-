require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const questions = [
  { question: "Padrão de necrose típico da tuberculose", answer: "Caseosa" },
  { question: "Padrão de necrose em que proteínas são desnaturadas preservando a arquitetura do tecido", answer: "Coagulativa" },
  { question: "Padrão de necrose típico do infarto cerebral", answer: "Liquefativa" },
  { question: "Padrão de necrose observado na pancreatite aguda", answer: "Gordurosa" },
  { question: "Padrão de necrose observado nas paredes dos vasos em doenças imunológicas", answer: "Fibrinoide" },
  { question: "Retração e condensação da cromatina nuclear na necrose", answer: "Picnose" },
  { question: "Fragmentação do núcleo na necrose", answer: "Cariorrexe" },
  { question: "Dissolução e desaparecimento do núcleo na necrose", answer: "Cariólise" },
  { question: "Tipo de morte celular que NÃO desencadeia inflamação significativa", answer: "Apoptose" },
  { question: "Acúmulo de partículas de carbono nos pulmões", answer: "Antracose" },
  { question: "Acúmulo anormal de triglicerídeos no citoplasma das células", answer: "Esteatose" },
  { question: "Pigmento granular marrom-amarelado chamado de pigmento de desgaste", answer: "Lipofuscina" },
  { question: "Pigmento granular derivado do ferro formado na degradação da hemoglobina", answer: "Hemossiderina" },
  { question: "Pigmento produzido pelos melanócitos que protege contra radiação UV", answer: "Melanina" },
  { question: "Principal forma de armazenamento de glicose nas células", answer: "Glicogênio" },
  { question: "Cinco sinais cardinais da inflamação: rubor, calor, tumor, dor e...", answer: "Functio laesa" },
  { question: "Mediador químico responsável pela vasodilatação inicial na inflamação", answer: "Histamina" },
  { question: "Mediadores que causam dor na inflamação aguda", answer: "Bradicinina" },
  { question: "Moléculas que promovem o rolamento dos leucócitos no endotélio", answer: "Selectinas" },
  { question: "Moléculas que promovem a adesão firme dos leucócitos ao endotélio", answer: "Integrinas" },
  { question: "Molécula principal na transmigração dos leucócitos pelo endotélio", answer: "PECAM-1" },
  { question: "Principais opsoninas que facilitam a fagocitose", answer: "IgG e C3b" },
  { question: "Célula inflamatória predominante na apendicite aguda", answer: "Neutrófilo" },
  { question: "Principal causa de obstrução do lúmen do apêndice", answer: "Fecalito" },
  { question: "Forma grave de apendicite com necrose da parede do apêndice", answer: "Gangrenosa" }
];

async function setup() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    await pool.query(schema);
    console.log('Tabelas criadas com sucesso!');

    // Insere monitores fixos
    const monitors = ['Karol monitora', 'Erik monitor', 'Eduarda monitora'];
    for (const name of monitors) {
      await pool.query(
        `INSERT INTO players (name, is_monitor) VALUES ($1, TRUE) ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    }
    console.log('Monitores cadastrados!');

    // Insere perguntas
    for (const q of questions) {
      await pool.query(
        `INSERT INTO questions (question, answer) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [q.question, q.answer]
      );
    }
    console.log('Perguntas inseridas!');

    // Cria sessão inicial
    await pool.query(`INSERT INTO game_session (active) VALUES (TRUE)`);
    console.log('Sessão de jogo criada!');

  } catch (err) {
    console.error('Erro no setup:', err.message);
  } finally {
    await pool.end();
  }
}

setup();
