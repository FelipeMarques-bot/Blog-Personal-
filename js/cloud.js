(function () {
  const HDRS = {
    apikey: SB_ANON_KEY,
    Authorization: 'Bearer ' + SB_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function restUrl(table, query) {
    return SB_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  }

  function rpcUrl(fn) {
    return SB_URL + '/rest/v1/rpc/' + fn;
  }

  const REQ_TIMEOUT = 10000;

  async function req(method, table, query, body) {
    const ctl = new AbortController();
    const timer = setTimeout(function () { ctl.abort(); }, REQ_TIMEOUT);
    let resp;
    try {
      resp = await fetch(restUrl(table, query), {
        method: method,
        headers: HDRS,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctl.signal
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('Supabase ' + resp.status + ': ' + txt.slice(0, 200));
    }
    const text = await resp.text();
    return text ? JSON.parse(text) : [];
  }

  function avisarOffline() {
    try {
      var ultimo = Number(localStorage.getItem('deleonfit_aviso_offline_em') || 0);
      if (Date.now() - ultimo > 3600000) {
        localStorage.setItem('deleonfit_aviso_offline_em', String(Date.now()));
        if (typeof toast === 'function') {
          toast('Nuvem indisponível agora. Os dados continuam sendo salvos neste dispositivo.', 'pink');
        }
      }
    } catch (e) {}
  }

  function rpcBoolean(fn, body) {
    const ctl = new AbortController();
    const timer = setTimeout(function () { ctl.abort(); }, REQ_TIMEOUT);
    return fetch(rpcUrl(fn), {
      method: 'POST',
      headers: HDRS,
      body: JSON.stringify(body),
      signal: ctl.signal
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('rpc ' + fn + ' ' + r.status);
      return r.json();
    }).then(function (v) {
      return v === true;
    }).catch(function () {
      clearTimeout(timer);
      return null;
    });
  }

  function toRow(a) {
    return {
      nome: a.nome, email: a.email,
      dias_semana: a.diasSemana || 3, status: a.status || 'ativo',
      verificado: !!a.verificado, criado_em: a.criadoEm || todayISO(),
      plano: a.plano || null
    };
  }

  function fromRow(r) {
    return {
      id: r.id, nome: r.nome, email: r.email,
      diasSemana: r.dias_semana, status: r.status, verificado: r.verificado,
      criadoEm: r.criado_em, plano: r.plano || null
    };
  }

  async function pushAluno(aluno, db) {
    try {
      if (UUID_RE.test(aluno.id)) {
        await req('PATCH', 'deleon_alunos', 'id=eq.' + aluno.id, toRow(aluno));
      } else {
        const rows = await req('POST', 'deleon_alunos', null, toRow(aluno));
        if (rows && rows[0]) {
          const salvo = fromRow(rows[0]);
          Object.assign(aluno, { id: salvo.id, criadoEm: salvo.criadoEm });
          if (db) saveDB(db);
        }
      }
    } catch (e) { console.warn('cloud pushAluno', e); toast('Falha ao sincronizar com a nuvem', 'pink'); }
  }

  window.Cloud = {
    ready: (async () => {
      try {
        const [alunosRows, checkinsRows, configRows, medidasRows, cargasRows] = await Promise.all([
          req('GET', 'deleon_alunos', 'select=*'),
          req('GET', 'deleon_checkins', 'select=*'),
          req('GET', 'deleon_config', 'select=*'),
          req('GET', 'deleon_medidas', 'select=*').catch(function () { return []; }),
          req('GET', 'deleon_cargas', 'select=*').catch(function () { return []; })
        ]);
        const db = loadDB();
        const cacheAntigo = db.alunos || [];
        db.alunos = alunosRows.map(function (r) {
          const obj = fromRow(r);
          const ant = cacheAntigo.find(function (x) {
            return x.id === r.id || (x.email || '').toLowerCase() === (r.email || '').toLowerCase();
          });
          if (ant && ant.senha) obj.senha = ant.senha;
          return obj;
        });
        db.checkins = {};
        checkinsRows.forEach(function (r) {
          if (!db.checkins[r.aluno_email]) db.checkins[r.aluno_email] = [];
          db.checkins[r.aluno_email].push(r.data);
        });
        db.medidas = db.medidas || {};
        medidasRows.forEach(function (r) {
          if (!r || !r.dados) return;
          var reg = Object.assign({}, r.dados, { data: r.data });
          if (!db.medidas[r.aluno_email]) db.medidas[r.aluno_email] = [];
          var arr = db.medidas[r.aluno_email];
          var pos = arr.findIndex(function (x) { return x.data === reg.data; });
          if (pos >= 0) arr[pos] = Object.assign(arr[pos], reg); else arr.push(reg);
          if (UUID_RE.test(String(r.id))) arr.forEach(function (x) { if (x.data === r.data) x.cid = r.id; });
        });
        Object.keys(db.medidas).forEach(function (em) {
          db.medidas[em].sort(function (a, b) { return a.data < b.data ? -1 : 1; });
        });
        db.cargas = db.cargas || {};
        cargasRows.forEach(function (r) {
          if (!r || !Array.isArray(r.historico)) return;
          if (!db.cargas[r.aluno_email]) db.cargas[r.aluno_email] = {};
          db.cargas[r.aluno_email][r.exercicio] = r.historico;
        });
        configRows.forEach(function (r) {
          if (r.chave === 'settings' && r.valor) db.settings = Object.assign({}, db.settings, r.valor);
        });
        saveDB(db);
      } catch (e) {
        console.warn('cloud hydrate falhou (usando dados locais)', e);
        window.Cloud.offline = true;
        avisarOffline();
      }
    })(),

    pushAluno: function (aluno) {
      const db = loadDB();
      return pushAluno(aluno, db);
    },

    buscarAluno: function (email) {
      return req('GET', 'deleon_alunos', 'email=ilike.' + encodeURIComponent(String(email || '').trim()))
        .then(function (rows) { return rows && rows[0] ? fromRow(rows[0]) : null; })
        .catch(function () { return null; });
    },

    delAluno: function (aluno) {
      Promise.all([
        req('DELETE', 'deleon_checkins', 'aluno_email=eq.' + encodeURIComponent(aluno.email), null),
        req('DELETE', 'deleon_medidas', 'aluno_email=eq.' + encodeURIComponent(aluno.email), null),
        req('DELETE', 'deleon_cargas', 'aluno_email=eq.' + encodeURIComponent(aluno.email), null),
        req('DELETE', 'deleon_alunos', 'id=eq.' + aluno.id, null)
      ]).catch(function (e) { console.warn('cloud delAluno', e); });
    },

    addCheckin: function (email, data) {
      req('POST', 'deleon_checkins', null, { aluno_email: email, data: data })
        .catch(function (e) {
          if (String(e).indexOf('409') === -1) console.warn('cloud addCheckin', e);
        });
    },

    delCheckin: function (email, data) {
      req('DELETE', 'deleon_checkins', 'aluno_email=eq.' + encodeURIComponent(email) + '&data=eq.' + data, null)
        .catch(function (e) { console.warn('cloud delCheckin', e); });
    },

    addMedida: function (email, reg) {
      const payload = { aluno_email: email, data: reg.data, dados: reg };
      req('POST', 'deleon_medidas', null, payload).catch(function (e) {
        if (String(e).indexOf('409') === -1) throw e;
        return req('PATCH', 'deleon_medidas',
          'aluno_email=eq.' + encodeURIComponent(email) + '&data=eq.' + reg.data,
          { dados: reg });
      }).then(function (rows) {
        if (rows && rows[0] && UUID_RE.test(String(rows[0].id))) {
          reg.cid = rows[0].id;
          saveDB(loadDB());
        }
      }).catch(function (e) { console.warn('cloud addMedida (salvo local)', e); });
    },

    delMedida: function (email, reg) {
      const query = reg.cid && UUID_RE.test(String(reg.cid))
        ? 'id=eq.' + reg.cid
        : 'aluno_email=eq.' + encodeURIComponent(email) + '&data=eq.' + reg.data;
      req('DELETE', 'deleon_medidas', query, null)
        .catch(function (e) { console.warn('cloud delMedida', e); });
    },

    setCarga: function (email, exercicio, historico) {
      const agora = new Date().toISOString();
      const payload = { aluno_email: email, exercicio: exercicio, historico: historico, atualizado_em: agora };
      req('POST', 'deleon_cargas', null, payload).catch(function (e) {
        if (String(e).indexOf('409') === -1) throw e;
        return req('PATCH', 'deleon_cargas',
          'aluno_email=eq.' + encodeURIComponent(email) + '&exercicio=eq.' + encodeURIComponent(exercicio),
          { historico: historico, atualizado_em: agora });
      }).then(function (rows) {
        if (rows && rows[0] && UUID_RE.test(String(rows[0].id))) { /* uuid do cloud disponível */ }
      }).catch(function (e) { console.warn('cloud setCarga (salvo local)', e); });
    },

    pushConfig: function (chave, valor) {
      req('POST', 'deleon_config', null, { chave: chave, valor: valor })
        .catch(function (e) { console.warn('cloud pushConfig', e); });
    },

    verificarAdmin: function (email, senha) {
      return rpcBoolean('verificar_admin', { p_email: email, p_senha: senha });
    },

    verificarAluno: function (email, senha) {
      return rpcBoolean('verificar_aluno', { p_email: email, p_senha: senha });
    },

    cadastrarAluno: function (email, senha) {
      return rpcBoolean('cadastrar_aluno', { p_email: email, p_senha: senha });
    },

    adminDefinirSenhaAluno: function (adminEmail, adminSenha, alunoEmail, novaSenha) {
      return rpcBoolean('admin_definir_senha_aluno', {
        p_admin_email: adminEmail,
        p_admin_senha: adminSenha,
        p_email_aluno: alunoEmail,
        p_nova_senha: novaSenha
      });
    },

    atualizarAcessoAdmin: function (senhaAtual, novoEmail, novaSenha) {
      return rpcBoolean('atualizar_acesso_admin', {
        p_senha_atual: senhaAtual,
        p_novo_email: novoEmail || '',
        p_nova_senha: novaSenha || ''
      });
    },

    buscarEmailAdmin: function () {
      const ctl = new AbortController();
      const timer = setTimeout(function () { ctl.abort(); }, REQ_TIMEOUT);
      return fetch(rpcUrl('admin_email_atual'), { headers: HDRS, signal: ctl.signal })
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error('admin_email_atual');
          return r.json();
        })
        .then(function (v) { return typeof v === 'string' ? v : null; })
        .catch(function () {
          clearTimeout(timer);
          return null;
        });
    }
  };

  window.CloudReady = function (fn) {
    var done = false;
    function run() { if (!done) { done = true; fn(); } }
    Promise.resolve(window.Cloud ? window.Cloud.ready : null).then(run, run);
    setTimeout(run, 4000);
  };
})();
