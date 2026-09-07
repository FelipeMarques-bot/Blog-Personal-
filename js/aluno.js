(function () {
  var btnSair = document.getElementById('btn-sair');
  if (btnSair) {
    btnSair.addEventListener('click', function () {
      try {
        var d = loadDB();
        d.session = null;
        saveDB(d);
      } catch (e) {}
      window.location.href = './';
    });
  }
})();

CloudReady(function () {
  var db = loadDB();
  var aluno = alunoLogado(db);

  if (!aluno) {
    window.location.href = 'login.html';
    return;
  }

  var conteudoEl = document.getElementById('conteudo');
  if (conteudoEl) conteudoEl.style.display = 'block';

  function safe(rotulo, fn) {
    try { fn(); } catch (e) { console.warn('aluno.js [' + rotulo + ']', e); }
  }

  var semanaTab = Math.min(indiceSemanaMes(), (aluno.plano && aluno.plano.semanas ? aluno.plano.semanas.length : 4) - 1);
  var sugestao = treinoDoDia(aluno.plano);

  var num = (db.settings && db.settings.whatsapp) || '5555997135782';
  var msgWa = encodeURIComponent('Olá Deleon! Sou aluno e preciso falar com você.');
  document.querySelectorAll('.wa-link').forEach(function (a) {
    a.href = 'https://wa.me/' + num + '?text=' + msgWa;
  });
  document.querySelectorAll('img.logo-img').forEach(function (img) {
    img.addEventListener('load', function () { img.classList.add('has'); });
    if (img.complete && img.naturalWidth > 0) img.classList.add('has');
  });

  document.getElementById('user-chip').textContent = aluno.nome;
  document.getElementById('primeiro-nome').textContent = aluno.nome.split(' ')[0].toUpperCase();

  function temPlano() {
    return !!(aluno.plano && aluno.plano.semanas && aluno.plano.semanas.length);
  }

  function renderBanner() {
    var banner = document.getElementById('banner-msg');
    var hojeFeito = isChecked(db, aluno.email, todayISO());
    var hora = new Date().getHours();
    var streak = sequenciaDias(db, aluno.email);
    if (hojeFeito) {
      banner.className = 'banner-msg good';
      banner.textContent = streak > 1
        ? 'Parabéns! Treino de hoje concluído. Você está com ' + streak + ' dias seguidos de disciplina.'
        : 'Parabéns! Treino de hoje concluído. Amanhã tem mais!';
    } else if (hora >= 20) {
      banner.className = 'banner-msg warn';
      banner.textContent = 'O dia está acabando e seu treino ainda está lá. Não deixe para depois!';
    } else {
      banner.className = 'banner-msg warn';
      banner.textContent = 'Não deixe de treinar hoje! Seu corpo agradece e sua meta depende disso.';
    }
  }

  function renderStats() {
    var meta = aluno.diasSemana || 3;
    var semana = treinosSemanaAtual(db, aluno.email);
    var mes = treinosMesAtual(db, aluno.email);
    var total = totalTreinos(db, aluno.email);
    var streak = sequenciaDias(db, aluno.email);

    document.getElementById('st-streak').textContent = streak;
    document.getElementById('st-total').textContent = total;
    document.getElementById('st-semana-txt').textContent = semana + ' de ' + meta + ' treinos';

    var pctSemana = Math.min(100, Math.round((semana / meta) * 100));
    var ring = document.getElementById('ring-semana');
    ring.style.setProperty('--pct', pctSemana);
    ring.setAttribute('data-text', semana + '/' + meta);

    var metaMes = meta * 4;
    var pctMes = Math.min(100, Math.round((mes / metaMes) * 100));
    document.getElementById('st-mes-txt').textContent = mes + ' / ' + metaMes + ' treinos (' + pctMes + '%)';
    document.getElementById('barra-mes').style.width = pctMes + '%';
  }

  function renderToday() {
    var d = new Date();
    var dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    document.getElementById('hoje-data').textContent = dias[d.getDay()] + ', ' + d.getDate() + ' de ' + meses[d.getMonth()];

    var card = document.getElementById('today-card');
    var btn = document.getElementById('btn-checkin');
    var undo = document.getElementById('btn-desmarcar');
    var focoEl = document.getElementById('hoje-foco');
    var subEl = document.getElementById('hoje-sub');

    var feito = isChecked(db, aluno.email, todayISO());
    var s = sugestao;

    if (!s) {
      focoEl.innerHTML = 'SEM TREINO HOJE';
      subEl.textContent = 'Seu personal ainda não publicou o plano.';
      btn.disabled = true;
      btn.textContent = 'AGUARDAR PLANO';
      return;
    }

    if (feito) {
      card.classList.add('done-state');
      focoEl.innerHTML = 'TREINO CONCLUÍDO <span>HOJE!</span>';
      subEl.textContent = s.dia.foco + ' - você cumpriu o treino de hoje. Parabéns!';
      btn.disabled = true;
      btn.textContent = 'TREINO MARCADO';
      undo.style.display = 'block';
    } else {
      card.classList.remove('done-state');
      focoEl.innerHTML = 'TREINO DE <span>HOJE</span>: ' + escapeHtml(s.dia.foco.toUpperCase());
      subEl.textContent = 'Semana ' + (s.semanaIndex + 1) + ' - ' + (s.dia.progressao || '');
      btn.disabled = false;
      btn.textContent = 'MARCAR TREINO FEITO';
      undo.style.display = 'none';
    }
  }

  function renderCalendario() {
    var cal = document.getElementById('calendario');
    var agora = new Date();
    var ano = agora.getFullYear();
    var mes = agora.getMonth();
    var primeiro = new Date(ano, mes, 1);
    var totalDias = new Date(ano, mes + 1, 0).getDate();
    var offset = (primeiro.getDay() + 6) % 7;

    var html = '';
    ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach(function (d) {
      html += '<div class="dow">' + d + '</div>';
    });
    for (var i = 0; i < offset; i++) html += '<div></div>';

    for (var dia = 1; dia <= totalDias; dia++) {
      var iso = ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
      var classes = 'day';
      if (isChecked(db, aluno.email, iso)) classes += ' done';
      if (iso === todayISO()) classes += ' today';
      else if (iso > todayISO()) classes += ' future';
      else if (!isChecked(db, aluno.email, iso)) classes += ' missed';
      html += '<div class="' + classes + '">' + dia + '</div>';
    }
    cal.innerHTML = html;
  }

  function renderExtras() {
    var frase = fraseDoDia(db);
    document.getElementById('frase-dia').textContent = '"' + frase.texto + '"';
    var info = document.getElementById('frase-dia-info');
    if (info) info.textContent = 'Frase ' + (frase.indice + 1) + ' de ' + frase.total + ' \u2022 muda todo dia';

    var meta = aluno.diasSemana || 3;
    var semana = treinosSemanaAtual(db, aluno.email);
    var restam = Math.max(0, meta - semana);
    var resumo = 'Você fez ' + semana + ' de ' + meta + ' treinos desta semana. ';
    if (restam === 0) resumo += 'META BATIDA! Semana perfeita de assiduidade.';
    else resumo += 'Faltam ' + restam + ' treino(s) para fechar a meta. Não deixe de treinar!';
    document.getElementById('resumo-semana').textContent = resumo;
  }

  function renderDesempenho() {
    var sec = document.getElementById('secao-desempenho');
    if (!sec) return;
    var total = totalTreinos(db, aluno.email);
    var temCargas = Object.keys(cargasDe(db, aluno.email)).length > 0;
    if (!total && !medidasDe(db, aluno.email).length && !temCargas) { sec.style.display = 'none'; return; }
    sec.style.display = 'block';

    var meta = aluno.diasSemana || 3;
    var semanas = contagemUltimasSemanas(db, aluno.email);
    var soma = semanas.reduce(function (acc, s) { return acc + s.n; }, 0);
    var media = Math.round((soma / semanas.length) * 10) / 10;
    var mes = treinosMesAtual(db, aluno.email);
    var pctMeta = Math.min(100, Math.round((mes / (meta * 4)) * 100));

    document.getElementById('dp-recorde').textContent = melhorSequencia(db, aluno.email);
    document.getElementById('dp-media').textContent = media;
    document.getElementById('dp-meta').textContent = pctMeta + '%';
  }

  function renderTabs() {
    var tabsEl = document.getElementById('week-tabs');
    tabsEl.innerHTML = '';
    aluno.plano.semanas.forEach(function (s, i) {
      var b = document.createElement('button');
      b.textContent = s.nome || ('Semana ' + (i + 1));
      if (i === semanaTab) b.classList.add('active');
      b.addEventListener('click', function () {
        semanaTab = i;
        renderTabs();
        renderDias();
      });
      tabsEl.appendChild(b);
    });
  }

  function cargaUltHtml(nomeEx) {
    var h = cargasHist(db, aluno.email, nomeEx);
    if (!h.length) return '';
    var ult = h[h.length - 1];
    var ant = h.length > 1 ? h[h.length - 2] : null;
    var seta = '';
    if (ant && ult.peso > ant.peso) seta = ' <i class="delta bom">\u25B2</i>';
    else if (ant && ult.peso < ant.peso) seta = ' <i class="delta ruim">\u25BC</i>';
    return '<small class="ex-ultimo">\u00FAlt. ' + fmtNum(ult.peso) + ' kg' + seta + '</small>';
  }

  function salvarCarga(nomeEx, peso, liEl) {
    registrarCarga(db, aluno.email, nomeEx, todayISO(), peso);
    saveDB(db);
    if (window.Cloud) window.Cloud.setCarga(aluno.email, nomeEx, cargasHist(db, aluno.email, nomeEx));
    toast('Carga salva: ' + fmtNum(peso) + ' kg \u2022 ' + nomeEx.split(' - ')[0].trim());
    if (liEl) {
      var span = liEl.querySelector('.ex-carga');
      if (span) {
        var antigo = span.querySelector('.ex-ultimo');
        if (antigo) antigo.remove();
        span.insertAdjacentHTML('beforeend', cargaUltHtml(nomeEx));
      }
    }
    safe('cargas', renderCargas);
  }

  function renderDias() {
    var track = document.getElementById('dias-grid');
    track.innerHTML = '';
    var semana = aluno.plano.semanas[semanaTab];
    var dias = Array.isArray(semana) ? semana : (semana ? semana.dias : null);
    if (!dias || !dias.length) {
      track.innerHTML = '<p style="color:var(--muted);padding:16px 4px;">Nenhum dia cadastrado nesta semana.</p>';
      renderCarExtras(0);
      return;
    }
    dias.forEach(function (d, di) {
      var sugerido = sugestao && sugestao.semanaIndex === semanaTab && sugestao.diaIndex === di;
      var card = document.createElement('div');
      card.className = 'day-card' + (sugerido ? ' suggested' : '');
      var exsFiltrados = (Array.isArray(d.exercicios) ? d.exercicios : String(d.exercicios || '').split('\n')).filter(Boolean);
      var lis = exsFiltrados.map(function (ex, ei) {
        var hist = cargasHist(db, aluno.email, ex);
        var hojeReg = hist.length && hist[hist.length - 1].data === todayISO() ? hist[hist.length - 1].peso : null;
        return '<li>' +
          '<span class="ex-nome">' + escapeHtml(ex) + '</span>' +
          '<span class="ex-carga">' +
            '<input type="number" step="0.5" min="0" inputmode="decimal" placeholder="kg" aria-label="Peso em kg - ' + escapeHtml(ex) + '" data-ex-i="' + ei + '" value="' + (hojeReg != null ? hojeReg : '') + '">' +
            '<em>kg</em>' + cargaUltHtml(ex) +
          '</span>' +
        '</li>';
      }).join('');
      card.innerHTML =
        '<div class="dc-badges">' +
          '<span class="badge-dia">' + escapeHtml(d.dia) + '</span>' +
          '<span class="badge-semana">Semana ' + (semanaTab + 1) + ' do m\u00eas</span>' +
        '</div>' +
        '<h4>' + escapeHtml(d.foco) + '</h4>' +
        (sugerido ? '<span class="badge-hoje">INDICADO PARA HOJE</span>' : '') +
        (d.progressao ? '<p class="dc-progressao">' + escapeHtml(d.progressao) + '</p>' : '') +
        '<ul>' + lis + '</ul>';
      track.appendChild(card);

      card.querySelectorAll('.ex-carga input').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var v = String(inp.value).trim().replace(',', '.');
          if (v === '' || isNaN(Number(v))) return;
          var liEl = inp.closest('li');
          salvarCarga(exsFiltrados[Number(inp.dataset.exI)], Number(v), liEl);
          inp.classList.add('saved-flash');
          setTimeout(function () { inp.classList.remove('saved-flash'); }, 900);
        });
      });
    });
    renderCarExtras(dias.length);

    var alvo = track.querySelector('.day-card.suggested') || track.querySelector('.day-card');
    if (alvo) {
      requestAnimationFrame(function () {
        track.scrollTo({ left: Math.max(0, alvo.offsetLeft - 16), behavior: 'smooth' });
      });
    }
  }

  function renderCarExtras(n) {
    var countEl = document.getElementById('car-count');
    var dotsEl = document.getElementById('car-dots');
    if (countEl) countEl.textContent = n ? (n + ' treino(s) nesta semana') : '';
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (var i = 0; i < n; i++) {
      (function (idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = i === 0 ? 'active' : '';
        b.setAttribute('aria-label', 'Ir para treino ' + (idx + 1));
        b.addEventListener('click', function () {
          var c = document.getElementById('dias-grid').children[idx];
          if (c) c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        dotsEl.appendChild(b);
      })(i);
    }
  }

  document.getElementById('btn-checkin').addEventListener('click', function () {
    marcarTreino(db, aluno.email, todayISO());
    saveDB(db);
    toast('Treino registrado! Parabéns pela disciplina.');
    atualizarTudo();
  });

  document.getElementById('btn-desmarcar').addEventListener('click', function () {
    desmarcarTreino(db, aluno.email, todayISO());
    saveDB(db);
    toast('Check-in de hoje removido.', 'pink');
    atualizarTudo();
  });

  (function monitorarCarrossel() {
    var trackEl = document.getElementById('dias-grid');
    if (!trackEl || typeof trackEl.addEventListener !== 'function') return;
    trackEl.addEventListener('scroll', function () {
      var dotsEl = document.getElementById('car-dots');
      if (!dotsEl || !dotsEl.children.length) return;
      var cards = trackEl.querySelectorAll('.day-card');
      if (!cards.length) return;
      var melhor = 0, menorDist = Infinity;
      cards.forEach(function (c, i) {
        var dist = Math.abs(c.offsetLeft - trackEl.scrollLeft - 16);
        if (dist < menorDist) { menorDist = dist; melhor = i; }
      });
      Array.prototype.forEach.call(dotsEl.children, function (d, i) {
        d.classList.toggle('active', i === melhor);
      });
    }, { passive: true });
  })();

  document.querySelectorAll('.car-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = document.getElementById(b.dataset.target);
      if (c) c.scrollBy({ left: c.clientWidth * 0.9 * Number(b.dataset.dir), behavior: 'smooth' });
    });
  });

  var CAMPOS_MEDIDA = [
    { k: 'peso', el: 'md-peso', rotulo: 'Peso', unid: 'kg', menorMelhor: true },
    { k: 'peito', el: 'md-peito', rotulo: 'Peito', unid: 'cm', menorMelhor: false },
    { k: 'cintura', el: 'md-cintura', rotulo: 'Cintura', unid: 'cm', menorMelhor: true },
    { k: 'quadril', el: 'md-quadril', rotulo: 'Quadril', unid: 'cm', menorMelhor: true },
    { k: 'bracoD', el: 'md-braco-d', rotulo: 'Bra\u00e7o D.', unid: 'cm', menorMelhor: false },
    { k: 'bracoE', el: 'md-braco-e', rotulo: 'Bra\u00e7o E.', unid: 'cm', menorMelhor: false },
    { k: 'coxaD', el: 'md-coxa-d', rotulo: 'Coxa D.', unid: 'cm', menorMelhor: false },
    { k: 'coxaE', el: 'md-coxa-e', rotulo: 'Coxa E.', unid: 'cm', menorMelhor: false }
  ];

  function deltaChipPara(campo, d) {
    if (!d) return '';
    var bom = campo.menorMelhor ? d < 0 : d > 0;
    var sinal = d > 0 ? '+' : '';
    return '<i class="delta ' + (bom ? 'bom' : 'ruim') + '">' + sinal + fmtNum(d) + '</i>';
  }

  function graficoPesoSVG(pts) {
    if (pts.length < 2) {
      return pts.length === 1
        ? '<div class="md-chart-empty">Registre mais uma medi\u00e7\u00e3o para ver o gr\u00e1fico da evolu\u00e7\u00e3o do peso.</div>'
        : '';
    }
    var W = 320, H = 110, P = 16;
    var vals = pts.map(function (p) { return p.peso; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 0.6) { max += 0.3; min -= 0.3; }
    function x(i) { return P + (W - 2 * P) * (i / (pts.length - 1)); }
    function y(v) { return H - P - (H - 2 * P) * ((v - min) / (max - min)); }
    var line = pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.peso).toFixed(1); }).join(' ');
    var area = P + ',' + (H - P) + ' ' + line + ' ' + (W - P) + ',' + (H - P);
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.peso).toFixed(1) + '" r="2.5" fill="#00e5ff" />';
    }).join('');
    var primeiro = pts[0], ultimo = pts[pts.length - 1];
    var lblIni = '<text x="' + P + '" y="' + (H - 4) + '" class="md-lbl">' + brDate(primeiro.data).slice(0, 5) + ' \u2022 ' + fmtNum(primeiro.peso) + 'kg</text>';
    var lblFim = '<text x="' + (W - P) + '" y="' + (H - 4) + '" text-anchor="end" class="md-lbl">' + brDate(ultimo.data).slice(0, 5) + ' \u2022 ' + fmtNum(ultimo.peso) + 'kg</text>';
    return '<div class="md-chart"><h4 class="mini-title">EVOLU\u00c7\u00c3O DO <span style="color:var(--cyan);">PESO</span></h4>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Evolu\u00e7\u00e3o do peso">' +
      '<polygon points="' + area + '" fill="rgba(0,229,255,.12)" />' +
      '<polyline points="' + line + '" fill="none" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />' +
      dots + lblIni + lblFim + '</svg></div>';
  }

  function renderMedidas() {
    var histEl = document.getElementById('medida-hist');
    var tendEl = document.getElementById('medida-tendencia');
    if (!histEl || !tendEl) return;
    var lista = medidasDe(db, aluno.email);

    if (!lista.length) {
      histEl.innerHTML = '<p style="color:var(--muted);font-size:0.88rem;">Nenhuma medi\u00e7\u00e3o registrada ainda. Comece hoje e acompanhe sua evolu\u00e7\u00e3o semana a semana!</p>';
      tendEl.innerHTML = '';
      return;
    }

    var primeiro = lista[0], ultimo = lista[lista.length - 1];
    var resumo = '';
    if (lista.length > 1 && primeiro.peso != null && ultimo.peso != null && ultimo.data !== primeiro.data) {
      resumo = '<div class="md-resumo">' +
        '<span>Primeiro registro: <b>' + brDate(primeiro.data) + '</b> \u2022 ' + fmtNum(primeiro.peso) + ' kg</span>' +
        '<span>\u00daltimo: <b>' + brDate(ultimo.data) + '</b> \u2022 ' + fmtNum(ultimo.peso) + ' kg</span>' +
        deltaChipPara(CAMPOS_MEDIDA[0], ultimo.peso - primeiro.peso) +
        '</div>';
    } else if (ultimo.peso != null) {
      resumo = '<div class="md-resumo"><span>Peso atual: <b>' + fmtNum(ultimo.peso) + ' kg</b></span></div>';
    }

    var rows = lista.slice().reverse().map(function (r) {
      var idxReal = lista.indexOf(r);
      var prev = idxReal > 0 ? lista[idxReal - 1] : null;
      var chips = CAMPOS_MEDIDA.map(function (c) {
        if (r[c.k] == null) return '';
        var d = (prev && prev[c.k] != null && r.data !== prev.data) ? Math.round((r[c.k] - prev[c.k]) * 10) / 10 : null;
        return '<span class="md-chip"><small>' + c.rotulo + '</small><b>' + fmtNum(r[c.k]) + ' <small>' + c.unid + '</small></b>' + deltaChipPara(c, d) + '</span>';
      }).join('');
      return '<div class="md-row">' +
        '<div class="md-head"><b>' + brDate(r.data) + '</b>' +
        '<button type="button" class="undo-link md-del" data-id="' + escapeHtml(r.id) + '">excluir</button></div>' +
        '<div class="md-chips">' + chips + '</div></div>';
    }).join('');
    histEl.innerHTML = resumo + rows;

    histEl.querySelectorAll('.md-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.id;
        var reg = lista.find(function (x) { return x.id === id; });
        delMedida(db, aluno.email, id);
        saveDB(db);
        if (window.Cloud && reg) window.Cloud.delMedida(aluno.email, reg);
        toast('Medi\u00e7\u00e3o exclu\u00edda.', 'pink');
        renderMedidas();
      });
    });

    tendEl.innerHTML = graficoPesoSVG(lista.filter(function (r) { return r.peso != null; }));
  }

  function renderCargas() {
    var el = document.getElementById('cargas-resumo');
    if (!el) return;
    var mapa = cargasDe(db, aluno.email);
    var nomes = Object.keys(mapa).filter(function (n) { return (mapa[n] || []).length; });
    if (!nomes.length) {
      el.innerHTML = '<p style="color:var(--muted);font-size:0.88rem;">Sem registros ainda. Preencha o campo "kg" nos exerc\u00edcios do seu treino para acompanhar a evolu\u00e7\u00e3o aqui.</p>';
      return;
    }
    var itens = nomes.map(function (n) {
      var h = mapa[n];
      var ini = h[0], fim = h[h.length - 1];
      var ganho = (ini && fim && fim.data !== ini.data) ? Math.round((fim.peso - ini.peso) * 10) / 10 : null;
      return { n: n, ini: ini, fim: fim, ganho: ganho };
    }).sort(function (a, b) { return (b.ganho != null ? b.ganho : -999) - (a.ganho != null ? a.ganho : -999); });

    el.innerHTML =
      '<div class="cg-topo"><span>' + itens.length + ' exerc\u00edcio(s) com carga registrada</span></div>' +
      '<div class="cg-lista">' + itens.map(function (it) {
        var range = fmtNum(it.fim.peso) + ' kg';
        if (it.ini && it.fim.data !== it.ini.data) range = fmtNum(it.ini.peso) + ' \u2192 <b>' + fmtNum(it.fim.peso) + '</b> kg';
        return '<div class="cg-row">' +
          '<span class="cg-nome">' + escapeHtml(it.n) + '</span>' +
          '<span class="cg-val"><b>' + range + '</b>' +
          (it.ganho != null ? deltaChipPara({ menorMelhor: false }, it.ganho) : '') +
          '<small>' + brDate(it.fim.data) + '</small></span>' +
        '</div>';
      }).join('') + '</div>';
  }

  function coletarMedidaForm() {
    var reg = { id: uid(), data: document.getElementById('md-data').value };
    var algumValor = false;
    CAMPOS_MEDIDA.forEach(function (c) {
      var v = document.getElementById(c.el).value.trim().replace(',', '.');
      if (v === '' || isNaN(Number(v))) return;
      reg[c.k] = Number(v);
      algumValor = true;
    });
    return algumValor ? reg : null;
  }

  document.getElementById('form-medida').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var reg = coletarMedidaForm();
    if (!reg) { toast('Informe pelo menos o peso ou uma medida.', 'pink'); return; }
    addMedida(db, aluno.email, reg);
    saveDB(db);
    if (window.Cloud) window.Cloud.addMedida(aluno.email, reg);
    toast(reg.data === todayISO() ? 'Medi\u00e7\u00e3o de hoje registrada!' : 'Medi\u00e7\u00e3o registrada!');
    CAMPOS_MEDIDA.forEach(function (c) { document.getElementById(c.el).value = ''; });
    renderMedidas();
  });

  var mdDataEl = document.getElementById('md-data');
  if (mdDataEl) mdDataEl.value = todayISO();

  function atualizarTudo() {
    safe('stats', renderStats);
    safe('banner', renderBanner);
    safe('today', renderToday);
    safe('calendario', renderCalendario);
    safe('extras', renderExtras);
    safe('desempenho', renderDesempenho);
    safe('cargas', renderCargas);
    safe('medidas', renderMedidas);
  }

  function initTimer() {
    var REST_KEY = 'deleonfit_rest_until';
    var REST_DUR_KEY = 'deleonfit_rest_dur';
    var TITULO_PAGINA = 'Meu Treino | Área do Aluno';
    var restTimer = null;
    var restWake = null;

    registrarSW();

    function fmtRest(s) {
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    function beepRest() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 350, 700].forEach(function (t) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 880; o.type = 'sine';
          g.gain.setValueAtTime(0.0001, ctx.currentTime + t / 1000);
          g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t / 1000 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t / 1000 + 0.28);
          o.start(ctx.currentTime + t / 1000);
          o.stop(ctx.currentTime + t / 1000 + 0.3);
        });
      } catch (e) {}
      if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    }

    var restAudio = null;
    var swRegRest = null;

    function registrarSW() {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(function (reg) { swRegRest = reg; }).catch(function () {});
        }
      } catch (e) {}
    }

    function wavFundo() {
      try {
        var sr = 8000, n = sr * 4;
        var buf = new ArrayBuffer(44 + n * 2);
        var v = new DataView(buf);
        function str(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
        str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
        str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        str(36, 'data'); v.setUint32(40, n * 2, true);
        for (var i = 0; i < n; i++) {
          v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 4000 * i) / sr) * 14000), true);
        }
        return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
      } catch (e) { return ''; }
    }

    function iniciarAudioFundo() {
      pararAudioFundo();
      try {
        var src = wavFundo();
        if (!src) return;
        restAudio = new Audio(src);
        restAudio.loop = true;
        restAudio.volume = 0.07;
        var p = restAudio.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }

    function atualizarMedia(durSeg, decorrido) {
      try {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Timer de descanso',
          artist: decorrido != null ? ('Faltam ' + fmtRest(Math.max(0, Math.round(durSeg - decorrido)))) : 'Deleon Fit',
          album: 'Deleon Marques',
          artwork: [
            { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';
        if (durSeg) navigator.mediaSession.setPositionState({ duration: durSeg, playbackRate: 1, position: Math.min(decorrido || 0, durSeg) });
      } catch (e) {}
    }

    function pararAudioFundo() {
      try { if (restAudio) { restAudio.pause(); restAudio.removeAttribute('src'); restAudio = null; } } catch (e) {}
      try {
        if ('mediaSession' in navigator) { navigator.mediaSession.playbackState = 'paused'; navigator.mediaSession.metadata = null; }
      } catch (e) {}
    }

    function pedirPermissaoNotificacao() {
      try {
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      } catch (e) {}
    }

    function notificarFim() {
      try {
        if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(function (reg) {
            reg.showNotification('\u23F0 Descanso encerrado!', {
              body: 'Bora para a pr\u00f3xima s\u00e9rie!',
              icon: 'assets/icon-192.png',
              tag: 'deleonfit-rest',
              requireInteraction: true
            });
          });
        }
      } catch (e) {}
    }

    function notifRest(txt) {
      try {
        if (!swRegRest || !('Notification' in window) || Notification.permission !== 'granted') return;
        swRegRest.showNotification('\u23F3 Descanso: ' + txt, {
          body: 'Deleon Fit \u2022 treino em andamento',
          icon: 'assets/icon-192.png',
          tag: 'deleonfit-rest',
          silent: true
        });
      } catch (e) {}
    }

    function fecharNotifRest() {
      try {
        if (!swRegRest) return;
        swRegRest.getNotifications({ tag: 'deleonfit-rest' }).then(function (ns) {
          ns.forEach(function (n) { n.close(); });
        }).catch(function () {});
      } catch (e) {}
    }

    function releaseWake() {
      if (restWake) { try { restWake.release(); } catch (e) {} restWake = null; }
    }

    function modoParado() {
      var disp = document.getElementById('rest-display');
      disp.classList.remove('running');
      var ativa = document.querySelector('.rest-preset.active');
      disp.textContent = fmtRest(Number((ativa && ativa.dataset.s) || 45));
      document.getElementById('rest-bar').style.width = '0%';
      var btn = document.getElementById('rest-start');
      btn.disabled = false;
      btn.textContent = 'INICIAR DESCANSO';
    }

    function stopRest(concluido) {
      clearInterval(restTimer); restTimer = null;
      ultimoSegNotif = -1;
      localStorage.removeItem(REST_KEY);
      localStorage.removeItem(REST_DUR_KEY);
      document.title = TITULO_PAGINA;
      pararAudioFundo();
      fecharNotifRest();
      releaseWake();
      modoParado();
      if (concluido) {
        toast('Descanso encerrado! Bora para a próxima série.');
        beepRest();
        notificarFim();
      }
    }

    var ultimoSegNotif = -1;

    function tickRest(until, durSeg) {
      var left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      document.getElementById('rest-display').textContent = fmtRest(left);
      document.getElementById('rest-bar').style.width = Math.min(100, Math.round(((durSeg - left) / durSeg) * 100)) + '%';
      document.title = '\u23F3 ' + fmtRest(left) + ' - descanso | Deleon Fit';
      atualizarMedia(durSeg, durSeg - left);
      if (left !== ultimoSegNotif && (left % 5 === 0 || left <= 10)) {
        ultimoSegNotif = left;
        notifRest(fmtRest(left));
      }
      if (left <= 0) stopRest(true);
    }

    function iniciarContagem(until, durSeg) {
      clearInterval(restTimer);
      tickRest(until, durSeg);
      restTimer = setInterval(function () { tickRest(until, durSeg); }, 250);
    }

    function startRest(segundos) {
      var until = Date.now() + segundos * 1000;
      localStorage.setItem(REST_KEY, String(until));
      localStorage.setItem(REST_DUR_KEY, String(segundos));
      var btn = document.getElementById('rest-start');
      btn.disabled = true;
      btn.textContent = 'DESCANSANDO...';
      document.getElementById('rest-display').classList.add('running');
      pedirPermissaoNotificacao();
      iniciarAudioFundo();
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(function (l) { restWake = l; }).catch(function () {});
      }
      iniciarContagem(until, segundos);
    }

    document.querySelectorAll('.rest-preset').forEach(function (p) {
      p.addEventListener('click', function () {
        if (restTimer) return;
        document.querySelectorAll('.rest-preset').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('rest-display').textContent = fmtRest(Number(this.dataset.s));
      });
    });

    document.getElementById('rest-start').addEventListener('click', function () {
      var ativa = document.querySelector('.rest-preset.active');
      startRest(Number((ativa && ativa.dataset.s) || 45));
    });

    document.getElementById('rest-stop').addEventListener('click', function () { stopRest(false); });

    (function resumeRest() {
      var until = Number(localStorage.getItem(REST_KEY));
      var dur = Number(localStorage.getItem(REST_DUR_KEY));
      if (!until || !dur) return;
      if (until <= Date.now()) {
        localStorage.removeItem(REST_KEY);
        localStorage.removeItem(REST_DUR_KEY);
        return;
      }
      var btn = document.getElementById('rest-start');
      btn.disabled = true;
      btn.textContent = 'DESCANSANDO...';
      document.getElementById('rest-display').classList.add('running');
      iniciarAudioFundo();
      iniciarContagem(until, dur);
    })();

    var restCard = document.getElementById('rest-card');
    if ('IntersectionObserver' in window && restCard) {
      var ioRest = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!restTimer) { restCard.classList.remove('rest-mini'); return; }
          if (!en.isIntersecting) restCard.classList.add('rest-mini');
        });
      }, { threshold: 0 });
      ioRest.observe(restCard);
    }

    document.querySelectorAll('.rest-preset').forEach(function (p) {
      p.addEventListener('click', function () {
        if (restTimer) return;
        restCard.classList.remove('rest-mini');
      });
    });

    var btnExpandir = function () {
      if (restCard.classList.contains('rest-mini')) {
        restCard.classList.remove('rest-mini');
        restCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    restCard.addEventListener('click', btnExpandir);
  }

  safe('timer', initTimer);

  if (!temPlano()) {
    document.getElementById('sem-plano').style.display = 'block';
    document.getElementById('com-plano').style.display = 'none';
  } else {
    document.getElementById('plano-titulo').textContent = aluno.plano.titulo || 'MEU PLANO';
    document.getElementById('plano-objetivo').textContent = aluno.plano.objetivo || '';
    safe('tabs', renderTabs);
    safe('dias', renderDias);
  }

  atualizarTudo();
});
