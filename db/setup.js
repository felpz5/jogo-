require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const questions = [
  // TEMA 1: NECROSE E MORTE CELULAR
  { question: "Padrão de necrose típico da tuberculose", answer: "Caseosa" },
  { question: "Padrão de necrose em que a desnaturação de proteínas preserva a arquitetura do tecido — típico de infartos em órgãos sólidos", answer: "Coagulativa" },
  { question: "Padrão de necrose típico do infarto cerebral e de infecções bacterianas", answer: "Liquefativa" },
  { question: "Padrão de necrose observado na pancreatite aguda, com saponificação pelo cálcio", answer: "Gordurosa" },
  { question: "Padrão de necrose nas paredes dos vasos em doenças imunológicas como lúpus e poliarterite nodosa", answer: "Fibrinoide" },
  { question: "Retração e condensação da cromatina nuclear na necrose", answer: "Picnose" },
  { question: "Fragmentação do núcleo na necrose", answer: "Cariorrexe" },
  { question: "Dissolução e desaparecimento do núcleo na necrose", answer: "Cariólise" },
  { question: "Tipo de morte celular que NÃO desencadeia inflamação significativa e forma corpos apoptóticos", answer: "Apoptose" },
  { question: "Na necrose, a célula sofre tumefação; na apoptose, a célula...", answer: "Encolhe" },
  { question: "Qual é a sequência correta das alterações nucleares na necrose?", answer: "Picnose → Cariorrexe → Cariólise" },
  { question: "Na necrose, o que acontece com a membrana plasmática?", answer: "Perde integridade" },

  // TEMA 2: ACÚMULOS INTRACELULARES E PIGMENTOS
  { question: "Acúmulo de partículas de carbono nos pulmões e linfonodos regionais", answer: "Antracose" },
  { question: "Acúmulo anormal de triglicerídeos no citoplasma das células, principalmente hepatócitos", answer: "Esteatose" },
  { question: "Pigmento granular marrom-amarelado chamado de 'pigmento de desgaste', acumulado em cardiomiócitos e neurônios", answer: "Lipofuscina" },
  { question: "Pigmento granular derivado do ferro, formado na degradação da hemoglobina", answer: "Hemossiderina" },
  { question: "Pigmento produzido pelos melanócitos que protege contra radiação UV", answer: "Melanina" },
  { question: "Principal forma de armazenamento de glicose nas células, que pode se acumular no diabetes mellitus", answer: "Glicogênio" },
  { question: "Na esteatose macrovesicular, o grande vacúolo lipídico desloca o núcleo do hepatócito para...", answer: "A periferia" },
  { question: "Processo pelo qual ácidos graxos liberados na necrose gordurosa se ligam ao cálcio", answer: "Saponificação" },

  // TEMA 3: INFLAMAÇÃO AGUDA
  { question: "Quinto sinal cardinal da inflamação, além de rubor, calor, tumor e dor", answer: "Functio laesa" },
  { question: "Fenômeno vascular que causa rubor e calor na inflamação aguda", answer: "Vasodilatação" },
  { question: "Mediador químico responsável pela vasodilatação inicial na inflamação aguda", answer: "Histamina" },
  { question: "Mediadores que causam dor na inflamação aguda", answer: "Bradicinina e prostaglandinas" },
  { question: "Moléculas que promovem o rolamento dos leucócitos no endotélio", answer: "Selectinas" },
  { question: "Moléculas que promovem a adesão firme dos leucócitos ao endotélio", answer: "Integrinas" },
  { question: "Molécula principal na transmigração dos leucócitos através das junções endoteliais", answer: "PECAM-1 (CD31)" },
  { question: "Principais opsoninas que facilitam o reconhecimento e a fagocitose de microrganismos", answer: "IgG e C3b" },
  { question: "Qual é a sequência do recrutamento leucocitário na inflamação aguda?", answer: "Marginação → Rolamento → Adesão → Transmigração → Quimiotaxia" },
  { question: "Na fagocitose, a fusão do fagossomo com o lisossomo forma o...", answer: "Fagolisossomo" },

  // TEMA 4: APENDICITE AGUDA
  { question: "Causa mais comum de obstrução do lúmen do apêndice", answer: "Fecalito" },
  { question: "Principal achado histológico que confirma o diagnóstico de apendicite aguda", answer: "Neutrófilos na muscular própria" },
  { question: "Célula inflamatória predominante na apendicite aguda", answer: "Neutrófilo" },
  { question: "Forma grave de apendicite com necrose da parede do apêndice", answer: "Gangrenosa" },
  { question: "Qual é a sequência da evolução da apendicite aguda?", answer: "Obstrução → Pressão ↑ → Isquemia → Inflamação/necrose → Perfuração" },
  { question: "Complicação da apendicite gangrenosa decorrente do enfraquecimento da parede", answer: "Perfuração" },
  { question: "Achado macroscópico da apendicite aguda: serosa com material esbranquiçado sobre a superfície", answer: "Exsudato fibrinopurulento" },
  { question: "Por que a obstrução do lúmen do apêndice causa isquemia da parede?", answer: "Aumento da pressão intraluminal compromete o fluxo vascular" }
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

    // Limpa e reinsere perguntas
    await pool.query(`TRUNCATE questions CASCADE`);
    for (const q of questions) {
      await pool.query(
        `INSERT INTO questions (question, answer) VALUES ($1, $2)`,
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
