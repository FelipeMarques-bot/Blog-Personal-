const DB_KEY = 'fitapp_db_v1';
const WHATSAPP_PADRAO = '5511999999999';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isoOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return isoOf(new Date());
}

function brDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function mondayOf(d) {
  const dt = new Date(d);
  const dow = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - dow);
  return dt;
}

function mondayISO() {
  return isoOf(mondayOf(new Date()));
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const base = seedDB();
      const db = Object.assign(base, JSON.parse(raw));
      if (!Array.isArray(db.alunos)) db.alunos = [];
      if (!db.checkins || typeof db.checkins !== 'object') db.checkins = {};
      if (!db.settings || typeof db.settings !== 'object') db.settings = base.settings;
      if (!db.admin || typeof db.admin !== 'object') db.admin = base.admin;
      return db;
    } catch (e) {}
  }
  const db = seedDB();
  saveDB(db);
  return db;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function resetDB() {
  localStorage.removeItem(DB_KEY);
}

function seedDB() {
  const hoje = new Date();
  function passou(n) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - n);
    return isoOf(d);
  }

  const planoJoao = {
    titulo: 'Hipertrofia - Agosto/Setembro',
    objetivo: 'Ganho de massa muscular',
    semanas: []
  };
  const diasJoao = [
    { dia: 'Segunda', foco: 'Peito e TrÃ­ceps', exercicios: ['Supino reto com barra - 4x10', 'Supino inclinado com halteres - 4x12', 'Crucifixo na mÃ¡quina - 3x12', 'TrÃ­ceps testa - 4x12', 'TrÃ­ceps corda - 3x15'] },
    { dia: 'Quarta', foco: 'Costas e BÃ­ceps', exercicios: ['Barra fixa assistida - 4x8', 'Remada curvada - 4x10', 'Puxada frontal - 3x12', 'Rosca direta - 4x12', 'Rosca martelo - 3x12'] },
    { dia: 'Sexta', foco: 'Pernas completo', exercicios: ['Agachamento livre - 4x10', 'Leg press 45 - 4x12', 'Cadeira extensora - 3x15', 'Mesa flexora - 3x12', 'Panturrilha em pÃ© - 4x15'] },
    { dia: 'SÃ¡bado', foco: 'Ombros e Core', exercicios: ['Desenvolvimento halteres - 4x10', 'ElevaÃ§Ã£o lateral - 4x12', 'Encolhimento - 3x12', 'Prancha - 3x40s', 'Abdominal na polia - 3x15'] }
  ];
  for (let s = 1; s <= 4; s++) {
    planoJoao.semanas.push({
      nome: 'Semana ' + s,
      dias: diasJoao.map((d, i) => ({
        dia: d.dia,
        foco: d.foco,
        progressao: s <= 2 ? 'Carga moderada' : 'Adicione 2-5% de carga',
        exercicios: d.exercicios.map((ex, j) => (s >= 3 && j < 2 ? ex.replace(/(\d+)$/, (m) => String(Number(m) + 1)) : ex))
      }))
    });
  }

  const planoMaria = {
    titulo: 'Emagrecimento e Condicionamento',
    objetivo: 'Perda de peso e definiÃ§Ã£o',
    semanas: []
  };
  const diasMaria = [
    { dia: 'Segunda', foco: 'Circuitos full body A', exercicios: ['Agachamento com salto - 3x12', 'FlexÃ£o de braÃ§o - 3x10', 'Remada com halter - 3x12', 'Prancha - 3x30s', 'Bike 10min intensidade moderada'] },
    { dia: 'Quarta', foco: 'HIIT + Core', exercicios: ['Burpee - 4x10', 'Mountain climber - 4x20', 'Polichinelo - 4x30', 'Abdominal bicicleta - 3x20', 'Esteira HIIT 15min'] },
    { dia: 'Sexta', foco: 'Membros inferiores + cardio', exercicios: ['Afundo - 3x12 cada perna', 'ElevaÃ§Ã£o pÃ©lvica - 3x15', 'Stiff com halteres - 3x12', 'Panturrilha - 3x20', 'Escada 12min'] }
  ];
  for (let s = 1; s <= 4; s++) {
    planoMaria.semanas.push({
      nome: 'Semana ' + s,
      dias: diasMaria.map((d) => ({
        dia: d.dia,
        foco: d.foco,
        progressao: s === 1 ? 'Foco na tÃ©cnica' : 'Reduza descanso para 40s',
        exercicios: [...d.exercicios]
      }))
    });
  }

  const alunos = [
    {
      id: uid(),
      nome: 'JoÃ£o Pereira',
      email: 'joao@email.com',
      senha: '123456',
      diasSemana: 4,
      status: 'ativo',
      verificado: true,
      criadoEm: passou(60),
      plano: planoJoao
    },
    {
      id: uid(),
      nome: 'Maria Souza',
      email: 'maria@email.com',
      senha: '123456',
      diasSemana: 3,
      status: 'ativo',
      verificado: true,
      criadoEm: passou(30),
      plano: planoMaria
    }
  ];

  const checkins = {};
  checkins['joao@email.com'] = [];
  checkins['maria@email.com'] = [];
  for (let n = 35; n >= 1; n--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - n);
    const wd = d.getDay();
    if ([1, 3, 5, 6].includes(wd) && n % 9 !== 0) checkins['joao@email.com'].push(isoOf(d));
    if ((wd === 1 || wd === 3 || wd === 5) && n % 5 !== 0) checkins['maria@email.com'].push(isoOf(d));
  }

  return {
    alunos,
    checkins,
    session: null,
    adminSession: false,
    settings: {
      whatsapp: WHATSAPP_PADRAO,
      frases: [
        'Disciplina Ã© escolher entre o que vocÃª quer agora e o que vocÃª quer mais.',
        'O corpo alcanÃ§a o que a mente acredita.',
        'VocÃª nÃ£o precisa ser extremo, apenas consistente.',
        'Cada treino Ã© um tijolo na construÃ§Ã£o da sua melhor versÃ£o.',
        'NinguÃ©m se arrependeu do treino que fez. SÃ³ do que pulou.'
      ]
    },
    admin: {
      email: 'admin@fitapp.com',
      senha: 'rafael2026'
    }
  };
}

function getAluno(db, email) {
  return db.alunos.find((a) => a.email.toLowerCase() === String(email || '').toLowerCase()) || null;
}

function alunoLogado(db) {
  return db.session ? getAluno(db, db.session) : null;
}

function isChecked(db, email, dateISO) {
  const arr = db.checkins[email] || [];
  return arr.includes(dateISO);
}

function marcarTreino(db, email, dateISO) {
  if (!db.checkins[email]) db.checkins[email] = [];
  if (!db.checkins[email].includes(dateISO)) db.checkins[email].push(dateISO);
  if (window.Cloud) window.Cloud.addCheckin(email, dateISO);
}

function desmarcarTreino(db, email, dateISO) {
  db.checkins[email] = (db.checkins[email] || []).filter((d) => d !== dateISO);
  if (window.Cloud) window.Cloud.delCheckin(email, dateISO);
}

function contagemPeriodo(db, email, inicioISO, fimISO) {
  const arr = db.checkins[email] || [];
  return arr.filter((d) => (!inicioISO || d >= inicioISO) && (!fimISO || d <= fimISO)).length;
}

function treinosSemanaAtual(db, email) {
  return contagemPeriodo(db, email, mondayISO(), todayISO());
}

function treinosMesAtual(db, email) {
  const hoje = new Date();
  const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  return contagemPeriodo(db, email, inicio, todayISO());
}

function sequenciaDias(db, email) {
  let n = 0;
  const d = new Date();
  if (!isChecked(db, email, isoOf(d))) d.setDate(d.getDate() - 1);
  while (isChecked(db, email, isoOf(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function totalTreinos(db, email) {
  return (db.checkins[email] || []).length;
}

function indiceSemanaMes() {
  const dom = new Date().getDate();
  return Math.min(Math.floor((dom - 1) / 7), 3);
}

function treinoDoDia(plano) {
  if (!plano || !plano.semanas || !plano.semanas.length) return null;
  const wi = Math.min(indiceSemanaMes(), plano.semanas.length - 1);
  const semana = plano.semanas[wi];
  if (!semana.dias || !semana.dias.length) return null;
  const feitos = 0;
  const db = loadDB();
  const aluno = alunoLogado(db);
  const feitosSemana = aluno ? treinosSemanaAtual(db, aluno.email) : 0;
  const di = feitosSemana % semana.dias.length;
  return { semanaIndex: wi, diaIndex: di, dia: semana.dias[di] };
}

function melhorSequencia(db, email) {
  const arr = [...(db.checkins[email] || [])].sort();
  const dias = (a, b) => Math.round(
    (Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
     Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5
  );
  let best = 0, cur = 0, prev = null;
  for (const d of arr) {
    cur = prev && dias(prev, d) === 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
    prev = d;
  }
  return best;
}

function contagemUltimasSemanas(db, email) {
  const rotulos = ['HÃ¡ 3 semanas', 'HÃ¡ 2 semanas', 'Semana passada', 'Esta semana'];
  const out = [];
  for (let i = 3; i >= 0; i--) {
    const seg = new Date();
    seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7) - i * 7);
    const fim = new Date(seg);
    fim.setDate(fim.getDate() + 6);
    out.push({
      label: rotulos[3 - i],
      n: contagemPeriodo(db, email, isoOf(seg), isoOf(fim))
    });
  }
  return out;
}

function ultimoTreino(db, email) {
  const arr = db.checkins[email] || [];
  if (!arr.length) return '';
  return arr.reduce(function (a, b) { return b > a ? b : a; });
}

var FRASES_PADRAO = [
  'Disciplina Ã© escolher entre o que vocÃª quer agora e o que vocÃª quer mais.',
  'O corpo alcanÃ§a o que a mente acredita.',
  'VocÃª nÃ£o precisa ser extremo, apenas consistente.',
  'Cada treino Ã© um tijolo na construÃ§Ã£o da sua melhor versÃ£o.',
  'NinguÃ©m se arrependeu do treino que fez. SÃ³ do que pulou.',
  'A dor de treinar dura uma hora. A dor de desistir dura a vida inteira.',
  'MotivaÃ§Ã£o te faz comeÃ§ar. HÃ¡bito te faz continuar.',
  'Se fosse fÃ¡cil, todo mundo faria. VocÃª nÃ£o Ã© todo mundo.',
  'Um dia ruim de treino ainda Ã© melhor que um dia perfeito sem treino.',
  'Seu Ãºnico adversÃ¡rio Ã© quem vocÃª foi ontem.',
  'ForÃ§a nÃ£o vem do que vocÃª pode fazer. Vem de superar aquilo que vocÃª nÃ£o conseguia.',
  'NÃ£o conte os dias. FaÃ§a os dias contarem.',
  'O suor de hoje Ã© a confianÃ§a de amanhÃ£.',
  'Desculpas nÃ£o queimam calorias.',
  'VocÃª estÃ¡ a um treino de distÃ¢ncia de um humor melhor.',
  'ConstÃ¢ncia transforma mais que intensidade.',
  'Comece onde vocÃª estÃ¡. Use o que vocÃª tem. FaÃ§a o que vocÃª pode.',
  'O progresso esconde-se nos dias em que ninguÃ©m estÃ¡ vendo.',
  'Levantar-se e aparecer jÃ¡ Ã© metade da vitÃ³ria.',
  'Treine porque vocÃª ama seu corpo, nÃ£o porque odeia ele.',
  'Pequenos passos diÃ¡rios vencem grandes saltos ocasionais.',
  'Daqui a seis meses vocÃª vai desejar ter comeÃ§ado hoje.',
  'Foco no processo. O resultado Ã© consequÃªncia.',
  'Nada muda se nada muda. Bora treinar.',
  'Energia e persistÃªncia conquistam todas as coisas.',
  'A barra nÃ£o vai levantar sozinha.',
  'Sua meta nÃ£o vai correr atrÃ¡s de vocÃª.',
  'Quem quer vence. Quem quer muito, treina mesmo cansado.',
  'Hoje Ã© o dia mais barato para investir na sua saÃºde.',
  'VocÃª nÃ£o precisa de sorte. Precisa de constÃ¢ncia.'
];

function fraseDoDia(db) {
  var pool = [];
  var seen = {};
  function add(f) {
    f = String(f == null ? '' : f).trim();
    if (!f) return;
    if (seen[f.toLowerCase()]) return;
    seen[f.toLowerCase()] = true;
    pool.push(f);
  }
  var custom = (db.settings && db.settings.frases) ? db.settings.frases : [];
  custom.forEach(add);
  FRASES_PADRAO.forEach(function (f) { if (pool.length < 30) add(f); });
  while (pool.length < 30) pool.push('Foco, forÃ§a e fÃ©.');
  var d = new Date();
  var dias = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  var idx = ((dias % pool.length) + pool.length) % pool.length;
  return { texto: pool[idx], indice: idx, total: pool.length };
}

function medidasDe(db, email) {
  return (db.medidas && db.medidas[email]) ? db.medidas[email] : [];
}

function addMedida(db, email, reg) {
  if (!db.medidas) db.medidas = {};
  if (!db.medidas[email]) db.medidas[email] = [];
  var arr = db.medidas[email];
  var existente = arr.find(function (r) { return r.data === reg.data; });
  if (existente) {
    Object.assign(existente, reg);
    reg = existente;
  } else {
    arr.push(reg);
  }
  arr.sort(function (a, b) { return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0); });
  return reg;
}

function delMedida(db, email, id) {
  if (!db.medidas || !db.medidas[email]) return;
  db.medidas[email] = db.medidas[email].filter(function (r) { return r.id !== id; });
}

function cargasDe(db, email) {
  if (!db.cargas) db.cargas = {};
  if (!db.cargas[email]) db.cargas[email] = {};
  return db.cargas[email];
}

function cargasHist(db, email, exercicio) {
  return cargasDe(db, email)[exercicio] || [];
}

function registrarCarga(db, email, exercicio, dataISO, peso) {
  var mapa = cargasDe(db, email);
  var h = mapa[exercicio] || [];
  var existente = h.find(function (r) { return r.data === dataISO; });
  if (existente) existente.peso = peso;
  else h.push({ data: dataISO, peso: peso });
  h.sort(function (a, b) { return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0); });
  while (h.length > 30) h.shift();
  mapa[exercicio] = h;
  return h;
}

function fmtNum(n, casas) {
  if (n === '' || n === null || n === undefined || isNaN(Number(n))) return '';
  return Number(n).toFixed(casas === undefined ? 1 : casas).replace('.', ',');
}

function toast(texto, cor) {
  let zone = document.querySelector('.toast-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.className = 'toast-zone';
    document.body.appendChild(zone);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (cor === 'pink' ? ' pink' : '');
  t.textContent = texto;
  zone.appendChild(t);
  setTimeout(() => t.remove(), 3800);
}
