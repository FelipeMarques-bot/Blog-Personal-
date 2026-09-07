(function () {
  var btnSair = document.getElementById('btn-sair-admin');
  if (btnSair) {
    btnSair.addEventListener('click', function () {
      try {
        var d = loadDB();
        d.adminSession = false;
        saveDB(d);
      } catch (e) {}
      window.location.reload();
    });
  }
})();

CloudReady(function () {
  var db = loadDB();

  var gate = document.getElementById('gate');
  var painel = document.getElementById('painel');

  function mostrarPainel() {
    gate.style.display = 'none';
    painel.style.display = 'block';
    renderTudo();
  }

  var formErro = document.getElementById('gate-erro');
  function mostrarGateErro(msg) {
    formErro.textContent = msg;
    formErro.classList.add('visible');
    setTimeout(function () { formErro.classList.remove('visible'); }, 4000);
  }

  function acessoConfereCacheLocal(email, senha) {
    return !!(db.admin &&
      email.toLowerCase() === String(db.admin.email || '').toLowerCase() &&
      senha === db.admin.senha);
  }

  document.getElementById('form-admin').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var email = document.getElementById('admin-email').value.trim();
    var senha = document.getElementById('admin-senha').value;
    var btnEntrar = this.querySelector('button[type="submit"]');

    if (!window.Cloud || !window.Cloud.verificarAdmin) {
      if (acessoConfereCacheLocal(email, senha)) {
        db.adminSession = true;
        saveDB(db);
        mostrarPainel();
      } else {
        mostrarGateErro('Sem conexão com a nuvem e credenciais não conferem.');
      }
      return;
    }

    if (btnEntrar) btnEntrar.disabled = true;
    window.Cloud.verificarAdmin(email, senha).then(function (ok) {
      if (btnEntrar) btnEntrar.disabled = false;
      if (ok === true || (ok === null && acessoConfereCacheLocal(email, senha))) {
        db.adminSession = true;
        saveDB(db);
        mostrarPainel();
        return;
      }
      mostrarGateErro(ok === false ? 'Credenciais incorretas.' : 'Nuvem indisponível. Tente novamente em instantes.');
    });
  });

  document.querySelectorAll('.admin-tabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.admin-tabs button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      ['alunos', 'treinos', 'config'].forEach(function (t) {
        document.getElementById('tab-' + t).style.display = t === btn.dataset.tab ? 'block' : 'none';
      });
    });
  });

  if (db.adminSession) mostrarPainel();

  function renderResumo() {
    var ativos = db.alunos.filter(function (a) { return a.status === 'ativo'; }).length;
    var pendentes = db.alunos.filter(function (a) { return a.status === 'pendente'; }).length;
    var hoje = db.alunos.filter(function (a) { return isChecked(db, a.email, todayISO()); }).length;
    var comPlano = db.alunos.filter(function (a) { return !!(a.plano && a.plano.semanas && a.plano.semanas.length); }).length;
    document.getElementById('resumo-stats').innerHTML =
      statCard(ativos, 'Alunos ativos', 'neon') +
      statCard(pendentes, 'Aguardando plano', '') +
      statCard(hoje, 'Treinaram hoje', 'cyan') +
      statCard(comPlano, 'Planos publicados', 'pink');
  }

  function statCard(valor, label, cor) {
    return '<div class="stat-card ' + cor + '"><div><div class="label">' + label +
      '</div><div class="value">' + valor + '</div></div></div>';
  }

  function renderTabela() {
    var tbody = document.getElementById('tbody-alunos');
    tbody.innerHTML = '';
    db.alunos.forEach(function (a) {
      var tr = document.createElement('tr');
      var temPlano = !!(a.plano && a.plano.semanas && a.plano.semanas.length);
      tr.innerHTML =
        '<td><b>' + escapeHtml(a.nome) + '</b><br><span style="color:var(--muted);font-size:.8rem;">' + escapeHtml(a.email) + '</span></td>' +
        '<td><span class="badge-status ' + a.status + '">' + a.status + '</span>' + (a.verificado ? '' : ' <span style="color:#ffd54d;font-size:.72rem;">e-mail não verificado</span>') + '</td>' +
        '<td>' + a.diasSemana + '</td>' +
        '<td>' + (temPlano ? '<b style="color:var(--neon);">publicado</b>' : '<span style="color:var(--muted);">nenhum</span>') + '</td>' +
        '<td>' + treinosMesAtual(db, a.email) + '/' + (a.diasSemana * 4) + '</td>' +
        '<td>' + sequenciaDias(db, a.email) + ' dias</td>' +
        '<td><div class="mini-actions">' +
          '<button class="mini-btn" data-acao="editar" data-id="' + a.id + '">Editar</button>' +
          '<button class="mini-btn" data-acao="plano" data-id="' + a.id + '">Treino</button>' +
          '<button class="mini-btn" data-acao="progresso" data-id="' + a.id + '">Progresso</button>' +
          '<button class="mini-btn" data-acao="status" data-id="' + a.id + '">' + (a.status === 'bloqueado' ? 'Ativar' : 'Bloquear') + '</button>' +
          '<button class="mini-btn danger" data-acao="excluir" data-id="' + a.id + '">Excluir</button>' +
        '</div></td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-acao]').forEach(function (b) {
      b.addEventListener('click', function () {
        var acao = b.dataset.acao;
        var aluno = db.alunos.find(function (x) { return x.id === b.dataset.id; });
        if (!aluno) return;
        if (acao === 'editar') carregarFormAluno(aluno);
        if (acao === 'plano') selecionarParaPlano(aluno);
        if (acao === 'progresso') abrirProgresso(aluno);
        if (acao === 'status') {
          aluno.status = aluno.status === 'bloqueado' ? 'ativo' : 'bloqueado';
          saveDB(db);
          if (window.Cloud) window.Cloud.pushAluno(aluno);
          toast('Status de ' + aluno.nome.split(' ')[0] + ': ' + aluno.status, 'pink');
          renderTudo();
        }
        if (acao === 'excluir') {
          if (confirm('Excluir ' + aluno.nome + ' e todo o histórico de treinos?')) {
            db.alunos = db.alunos.filter(function (x) { return x.id !== aluno.id; });
            delete db.checkins[aluno.email];
            if (db.session === aluno.email) db.session = null;
            saveDB(db);
            if (window.Cloud) window.Cloud.delAluno(aluno);
            toast('Aluno excluído.', 'pink');
            renderTudo();
          }
        }
      });
    });
  }

  function abrirProgresso(aluno) {
    var meta = aluno.diasSemana || 3;
    document.getElementById('mp-nome').textContent = 'PROGRESSO - ' + aluno.nome.toUpperCase();
    document.getElementById('mp-streak').textContent = sequenciaDias(db, aluno.email);
    document.getElementById('mp-recorde').textContent = melhorSequencia(db, aluno.email);
    document.getElementById('mp-total').textContent = totalTreinos(db, aluno.email);

    var semanas = contagemUltimasSemanas(db, aluno.email);
    document.getElementById('mp-bars').innerHTML = semanas.map(function (s) {
      var pct = Math.min(100, Math.round((s.n / meta) * 100));
      var cor = s.n >= meta ? 'var(--neon)' : (pct >= 50 ? 'var(--cyan)' : '#ff5c8a');
      return '<div class="bar-row"><span class="bar-label">' + s.label + '</span>' +
        '<span class="bar-track"><i class="bar-fill" style="width:' + pct + '%;background:' + cor + ';"></i></span>' +
        '<b class="bar-val">' + s.n + '/' + meta + '</b></div>';
    }).join('');

    var ultimo = ultimoTreino(db, aluno.email);
    var mes = treinosMesAtual(db, aluno.email);
    var extra = ultimo
      ? 'Último treino: ' + brDate(ultimo) + ' • Este mês: ' + mes + '/' + (meta * 4) + ' treinos'
      : 'Este aluno ainda não fez nenhum check-in.';
    if (!ultimo) extra += ' Que tal cobrar no WhatsApp?';
    document.getElementById('mp-extra').textContent = extra;

    renderMedidasAluno(aluno);

    document.getElementById('modal-progresso').style.display = 'flex';
  }

  function renderMedidasAluno(aluno) {
    var box = document.getElementById('mp-medidas');
    if (!box) return;
    var lista = medidasDe(db, aluno.email);
    if (!lista.length) {
      box.innerHTML = '<p style="color:var(--muted);font-size:.85rem;">Sem registros de medidas/peso ainda.</p>';
      return;
    }
    var linhas = lista.slice(-5).reverse().map(function (r, i, arr) {
      var prev = arr[i + 1] || null;
      var dPeso = (prev && prev.peso != null && r.peso != null) ? Math.round((r.peso - prev.peso) * 10) / 10 : null;
      return '<tr>' +
        '<td><b>' + brDate(r.data) + '</b></td>' +
        '<td>' + (r.peso != null ? fmtNum(r.peso) + ' kg' : '—') +
          (dPeso != null ? ' <span style="color:' + (dPeso <= 0 ? 'var(--neon)' : '#ff8ac2') + ';font-size:.72rem;">' + (dPeso > 0 ? '+' : '') + fmtNum(dPeso) + '</span>' : '') + '</td>' +
        '<td>' + (r.peito != null ? fmtNum(r.peito) : '—') + '</td>' +
        '<td>' + (r.cintura != null ? fmtNum(r.cintura) : '—') + '</td>' +
        '<td>' + (r.quadril != null ? fmtNum(r.quadril) : '—') + '</td>' +
        '<td>' + (r.bracoD != null || r.bracoE != null ? [r.bracoD, r.bracoE].map(function (v) { return fmtNum(v); }).join(' / ') : '—') + '</td>' +
        '</tr>';
    }).join('');
    box.innerHTML =
      '<h3 style="margin-bottom:10px;">MEDIDAS E PESO (últimas 5)</h3>' +
      '<div class="table-wrap"><table class="tb mp-tb">' +
      '<thead><tr><th>Data</th><th>Peso</th><th>Peito</th><th>Cintura</th><th>Quadril</th><th>Braço D/E</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody></table></div>';
  }

  document.getElementById('mp-fechar').addEventListener('click', function () {
    document.getElementById('modal-progresso').style.display = 'none';
  });
  document.getElementById('modal-progresso').addEventListener('click', function (ev) {
    if (ev.target === this) this.style.display = 'none';
  });

  function carregarFormAluno(aluno) {
    document.getElementById('titulo-form-aluno').textContent = 'EDITAR ALUNO';
    document.getElementById('edit-id').value = aluno.id;
    document.getElementById('al-nome').value = aluno.nome;
    document.getElementById('al-email').value = aluno.email;
    document.getElementById('al-senha').value = '';
    document.getElementById('al-senha').placeholder = 'Deixe vazio para manter';
    document.getElementById('al-dias').value = String(aluno.diasSemana);
    document.getElementById('btn-limpar-form').style.display = 'inline-flex';
    document.getElementById('card-form-aluno').scrollIntoView({ behavior: 'smooth' });
  }

  function limparFormAluno() {
    document.getElementById('titulo-form-aluno').textContent = 'NOVO ALUNO';
    document.getElementById('edit-id').value = '';
    document.getElementById('al-nome').value = '';
    document.getElementById('al-email').value = '';
    document.getElementById('al-senha').value = '';
    document.getElementById('al-senha').placeholder = 'Ex.: 123456';
    document.getElementById('al-dias').value = '3';
    document.getElementById('btn-limpar-form').style.display = 'none';
  }

  document.getElementById('btn-limpar-form').addEventListener('click', limparFormAluno);

  function definirSenhaRemota(emailAluno, novaSenha) {
    if (!(window.Cloud && window.Cloud.adminDefinirSenhaAluno && db.admin)) return;
    window.Cloud.adminDefinirSenhaAluno(db.admin.email, db.admin.senha, emailAluno, novaSenha)
      .then(function (ok) {
        if (ok === false) toast('Não consegui atualizar a senha na nuvem.', 'pink');
      });
  }

  document.getElementById('btn-salvar-aluno').addEventListener('click', function () {
    var nome = document.getElementById('al-nome').value.trim();
    var email = document.getElementById('al-email').value.trim().toLowerCase();
    var senha = document.getElementById('al-senha').value;
    var dias = parseInt(document.getElementById('al-dias').value, 10);
    var editId = document.getElementById('edit-id').value;

    if (nome.length < 3) { toast('Informe o nome do aluno.', 'pink'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast('E-mail inválido.', 'pink'); return; }
    var duplicado = db.alunos.some(function (a) { return a.email.toLowerCase() === email && a.id !== editId; });
    if (duplicado) { toast('Já existe aluno com este e-mail.', 'pink'); return; }

    if (editId) {
      var aluno = db.alunos.find(function (x) { return x.id === editId; });
      if (!aluno) return;
      var trocouEmail = aluno.email !== email;
      var senhaAnterior = aluno.senha;
      aluno.nome = nome;
      aluno.email = email;
      aluno.diasSemana = dias;
      if (senha) {
        aluno.senha = senha;
        definirSenhaRemota(email, senha);
      } else if (trocouEmail && senhaAnterior) {
        definirSenhaRemota(email, senhaAnterior);
      }
      if (trocouEmail) {
        db.checkins[email] = db.checkins[aluno.email] || [];
        delete db.checkins[aluno.email];
      }
      toast('Aluno atualizado!');
      if (window.Cloud) window.Cloud.pushAluno(aluno);
    } else {
      if (senha.length < 4) { toast('Defina uma senha inicial (mín. 4).', 'pink'); return; }
      var novo = {
        id: uid(),
        nome: nome,
        email: email,
        senha: senha,
        diasSemana: dias,
        status: 'pendente',
        verificado: false,
        criadoEm: todayISO(),
        plano: null
      };
      db.alunos.push(novo);
      definirSenhaRemota(email, senha);
      toast('Aluno criado! Publique o treino dele.');
      if (window.Cloud) window.Cloud.pushAluno(novo);
    }
    saveDB(db);
    limparFormAluno();
    renderTudo();
  });
  var DIAS_OPTS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  var alunoPlanoSel = null;
  var editorSujo = false;

  document.getElementById('editor-semanas').addEventListener('input', function () { editorSujo = true; });

  function diaOptions(sel) {
    return DIAS_OPTS.map(function (d) {
      return '<option' + (d === sel ? ' selected' : '') + '>' + d + '</option>';
    }).join('');
  }

  function diaRow(diaSel, focoVal, exVal) {
    return '<div class="day-editor">' +
      '<select class="pe-dia">' + diaOptions(diaSel) + '</select>' +
      '<input class="pe-foco" type="text" placeholder="Foco (Ex.: Peito e tríceps)" value="' + escapeHtml(focoVal || '') + '">' +
      '<textarea class="pe-ex" rows="4" placeholder="Um exercício por linha. Ex.: Supino reto - 4x10">' + escapeHtml(exVal || '') + '</textarea>' +
      '</div>';
  }

  function construirEditor(aluno, plano) {
    var p = (plano && plano.semanas) ? plano : null;
    var wrap = document.getElementById('editor-semanas');
    var html = '';
    for (var s = 0; s < 4; s++) {
      var sem = p && p.semanas[s] ? p.semanas[s] : null;
      html += '<div class="week-editor"><h3>SEMANA ' + (s + 1) + '</h3>';
      var nDias = Math.max(aluno.diasSemana, sem && sem.dias ? sem.dias.length : 0);
      for (var d = 0; d < nDias; d++) {
        var dd = sem && sem.dias && sem.dias[d] ? sem.dias[d] : null;
        html += diaRow(dd ? dd.dia : DIAS_OPTS[Math.min(d, 6)], dd ? dd.foco : '', dd ? (dd.exercicios || []).join('\n') : '');
      }
      html += '</div>';
      html += '<button type="button" class="add-dia-btn">+ ADICIONAR DIA</button>';
      html += '</div>';
    }
    wrap.innerHTML = html;
    editorSujo = false;
  }

  document.getElementById('editor-semanas').addEventListener('click', function (ev) {
    var btn = ev.target.closest('.add-dia-btn');
    if (!btn) return;
    var week = btn.closest('.week-editor');
    var usados = Array.prototype.map.call(week.querySelectorAll('.pe-dia'), function (s) { return s.value; });
    var livre = DIAS_OPTS.filter(function (d) { return usados.indexOf(d) === -1; })[0] || 'Segunda';
    btn.insertAdjacentHTML('beforebegin', diaRow(livre, '', ''));
    editorSujo = true;
  });

  function selecionarParaPlano(aluno) {
    alunoPlanoSel = aluno.id;
    document.querySelector('[data-tab="treinos"]').click();
    document.getElementById('sel-aluno-plano').value = aluno.id;
    document.getElementById('pl-titulo').value = (aluno.plano && aluno.plano.titulo) || '';
    document.getElementById('pl-objetivo').value = (aluno.plano && aluno.plano.objetivo) || '';
    construirEditor(aluno, aluno.plano);
  }

  function popularSelectAlunos() {
    var sel = document.getElementById('sel-aluno-plano');
    var cop = document.getElementById('sel-copiar');
    var valorAtual = sel.value;
    sel.innerHTML = '';
    cop.innerHTML = '<option value="">- selecionar -</option>';
    db.alunos.forEach(function (a) {
      sel.insertAdjacentHTML('beforeend', '<option value="' + a.id + '">' + escapeHtml(a.nome) + '</option>');
      cop.insertAdjacentHTML('beforeend', '<option value="' + a.id + '">' + escapeHtml(a.nome) + '</option>');
    });
    if (valorAtual && db.alunos.some(function (a) { return a.id === valorAtual; })) sel.value = valorAtual;
  }

  document.getElementById('sel-aluno-plano').addEventListener('change', function () {
    var v = this.value;
    var a = db.alunos.find(function (x) { return x.id === v; });
    if (a) selecionarParaPlano(a);
  });

  document.getElementById('sel-copiar').addEventListener('change', function () {
    if (!this.value) return;
    var vid = this.value;
    var origem = db.alunos.find(function (x) { return x.id === vid; });
    var vidAlvo = document.getElementById('sel-aluno-plano').value;
    var alvo = db.alunos.find(function (x) { return x.id === vidAlvo; });
    this.value = '';
    if (!origem || !alvo) return;
    if (!origem.plano) { toast('O aluno de origem não tem plano publicado.', 'pink'); return; }
    var clone = JSON.parse(JSON.stringify(origem.plano));
    document.getElementById('pl-titulo').value = clone.titulo || '';
    document.getElementById('pl-objetivo').value = clone.objetivo || '';
    construirEditor(alvo, clone);
    toast('Plano de ' + origem.nome.split(' ')[0] + ' carregado. Revise e publique.');
  });

  document.getElementById('btn-salvar-plano').addEventListener('click', function () {
    var vid = document.getElementById('sel-aluno-plano').value;
    var aluno = db.alunos.find(function (x) { return x.id === vid; });
    if (!aluno) { toast('Selecione um aluno.', 'pink'); return; }
    var semanas = [];
    document.querySelectorAll('#editor-semanas .week-editor').forEach(function (we, si) {
      var dias = [];
      we.querySelectorAll('.day-editor').forEach(function (de) {
        var foco = de.querySelector('.pe-foco').value.trim();
        var exs = de.querySelector('.pe-ex').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        if (!foco && !exs.length) return;
        dias.push({
          dia: de.querySelector('.pe-dia').value,
          foco: foco || 'Treino',
          progressao: '',
          exercicios: exs
        });
      });
      semanas.push({ nome: 'Semana ' + (si + 1), dias: dias });
    });
    if (!semanas.some(function (s) { return s.dias.length; })) { toast('Preencha pelo menos um treino antes de publicar.', 'pink'); return; }
    aluno.plano = {
      titulo: document.getElementById('pl-titulo').value.trim() || 'Plano mensal',
      objetivo: document.getElementById('pl-objetivo').value.trim(),
      semanas: semanas
    };
    if (aluno.status === 'pendente') aluno.status = 'ativo';
    saveDB(db);
    if (window.Cloud) window.Cloud.pushAluno(aluno);
    toast('Plano publicado para ' + aluno.nome.split(' ')[0] + '!');
    renderTudo();
  });

  document.getElementById('btn-limpar-plano').addEventListener('click', function () {
    var vid = document.getElementById('sel-aluno-plano').value;
    var aluno = db.alunos.find(function (x) { return x.id === vid; });
    if (!aluno) return;
    if (!confirm('Remover o plano publicado de ' + aluno.nome + '?')) return;
    aluno.plano = null;
    saveDB(db);
    if (window.Cloud) window.Cloud.pushAluno(aluno);
    selecionarParaPlano(aluno);
    toast('Plano removido.', 'pink');
    renderTudo();
  });

  function renderConfig() {
    document.getElementById('cfg-whats').value = db.settings.whatsapp || '';
    document.getElementById('cfg-frases').value = (db.settings.frases || []).join('\n');
    var campoEmail = document.getElementById('cfg-admin-email');
    campoEmail.value = (db.admin && db.admin.email) || '';
    if (window.Cloud && window.Cloud.buscarEmailAdmin) {
      window.Cloud.buscarEmailAdmin().then(function (em) {
        if (em) {
          campoEmail.value = em;
          if (!db.admin) db.admin = {};
          db.admin.email = em;
        }
      });
    }
  }

  document.getElementById('btn-salvar-config').addEventListener('click', function () {
    db.settings.whatsapp = document.getElementById('cfg-whats').value.replace(/\D/g, '') || '5511999999999';
    db.settings.frases = document.getElementById('cfg-frases').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    saveDB(db);
    if (window.Cloud) window.Cloud.pushConfig('settings', db.settings);
    toast('Configurações salvas!');
  });

  document.getElementById('btn-salvar-admin').addEventListener('click', function () {
    var atual = document.getElementById('cfg-admin-atual').value;
    var novoEmail = document.getElementById('cfg-admin-email').value.trim().toLowerCase();
    var novaSenha = document.getElementById('cfg-admin-nova').value;
    if (!atual) { toast('Informe a senha atual para confirmar.', 'pink'); return; }
    if (novaSenha && novaSenha.length < 6) { toast('Nova senha muito curta (min. 6).', 'pink'); return; }
    var btn = this;
    btn.disabled = true;
    window.Cloud.atualizarAcessoAdmin(atual, novoEmail, novaSenha).then(function (ok) {
      btn.disabled = false;
      if (ok !== true) {
        toast(ok === false ? 'Senha atual incorreta.' : 'Nuvem indisponível. Não foi possível atualizar.', 'pink');
        return;
      }
      if (!db.admin) db.admin = {};
      if (novoEmail) db.admin.email = novoEmail;
      if (novaSenha) db.admin.senha = novaSenha;
      saveDB(db);
      document.getElementById('cfg-admin-atual').value = '';
      document.getElementById('cfg-admin-nova').value = '';
      toast('Acesso admin atualizado!');
    });
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    if (!confirm('Isso apaga TUDO e restaura os dados de demonstração. Continuar?')) return;
    resetDB();
    window.location.reload();
  });

  function renderTudo() {
    db = loadDB();
    renderResumo();
    renderTabela();
    popularSelectAlunos();
    var sel = document.getElementById('sel-aluno-plano');
    var precisaRebuild = !editorSujo;
    if (precisaRebuild) {
      var idAlvo = alunoPlanoSel || (sel.options.length ? sel.options[0].value : null);
      var a = idAlvo ? db.alunos.find(function (x) { return x.id === idAlvo; }) : null;
      if (a) {
        alunoPlanoSel = a.id;
        sel.value = a.id;
        document.getElementById('pl-titulo').value = (a.plano && a.plano.titulo) || '';
        document.getElementById('pl-objetivo').value = (a.plano && a.plano.objetivo) || '';
        construirEditor(a, a.plano);
      } else {
        document.getElementById('editor-semanas').innerHTML = '';
      }
    }
    renderConfig();
  }

  renderResumo();
  renderTabela();
  popularSelectAlunos();
});
