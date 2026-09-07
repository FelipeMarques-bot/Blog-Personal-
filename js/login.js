CloudReady(function () {
  var db = loadDB();

  var elErro = document.getElementById('erro');
  var formLogin = document.getElementById('form-login');
  var formCadastro = document.getElementById('form-cadastro');
  var painelCodigo = document.getElementById('painel-codigo');
  var tabsArea = document.getElementById('tabs-area');
  var codigoGerado = null;
  var emailPendente = null;

  function mostrarErro(msg) {
    elErro.textContent = msg;
    elErro.classList.add('visible');
    setTimeout(function () { elErro.classList.remove('visible'); }, 5000);
  }

  function gerarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function iniciarVerificacao(email) {
    emailPendente = email;
    codigoGerado = gerarCodigo();
    document.getElementById('email-alvo').textContent = email;
    document.getElementById('codigo-demo').textContent = codigoGerado;
    formLogin.style.display = 'none';
    formCadastro.style.display = 'none';
    tabsArea.style.display = 'none';
    document.getElementById('titulo-form').textContent = 'VERIFICAR E-MAIL';
    document.getElementById('sub-form').textContent = 'Falta só um passo para entrar.';
    painelCodigo.style.display = 'block';
  }

  function concluirEntrada(email) {
    db.session = email;
    saveDB(db);
    window.location.href = 'aluno.html';
  }

  document.getElementById('tab-entrar').addEventListener('click', function () {
    this.classList.add('active');
    document.getElementById('tab-criar').classList.remove('active');
    formLogin.style.display = 'block';
    formCadastro.style.display = 'none';
    document.getElementById('titulo-form').textContent = 'ACESSO DO ALUNO';
    document.getElementById('sub-form').textContent = 'Entre com seu e-mail e senha para ver seu treino.';
  });

  document.getElementById('tab-criar').addEventListener('click', function () {
    this.classList.add('active');
    document.getElementById('tab-entrar').classList.remove('active');
    formCadastro.style.display = 'block';
    formLogin.style.display = 'none';
    document.getElementById('titulo-form').textContent = 'CRIAR MINHA CONTA';
    document.getElementById('sub-form').textContent = 'Cadastre-se e aguarde o personal publicar seu treino.';
  });

  function validarEEntrar(aluno) {
    if (aluno.status === 'bloqueado') {
      mostrarErro('Acesso suspenso. Fale com o personal pelo WhatsApp.');
      return;
    }
    if (!aluno.verificado) {
      iniciarVerificacao(aluno.email);
      return;
    }
    concluirEntrada(aluno.email);
  }

  function erroFinal() {
    mostrarErro('E-mail ou senha incorretos.');
  }

  formLogin.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var email = document.getElementById('email').value.trim().toLowerCase();
    var senha = document.getElementById('senha').value.trim();
    if (!email || !senha) { mostrarErro('Preencha e-mail e senha.'); return; }
    var aluno = getAluno(db, email);
    if (aluno && aluno.senha === senha) { validarEEntrar(aluno); return; }
    if (!window.Cloud || !window.Cloud.verificarAluno) { erroFinal(); return; }
    window.Cloud.verificarAluno(email, senha).then(function (ok) {
      if (ok === false) { erroFinal(); return; }
      if (ok === null) { mostrarErro('Nuvem indisponível agora. Tente novamente.'); return; }
      window.Cloud.buscarAluno(email).then(function (remoto) {
        var alvo = remoto || aluno;
        if (!alvo) { erroFinal(); return; }
        if (remoto) {
          remoto.senha = senha;
          var existente = getAluno(db, remoto.email);
          if (existente) Object.assign(existente, remoto);
          else db.alunos.push(remoto);
          saveDB(db);
        }
        validarEEntrar(getAluno(db, alvo.email));
      });
    });
  });

  formCadastro.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nome = document.getElementById('nome').value.trim();
    var email = document.getElementById('cad-email').value.trim().toLowerCase();
    var senha = document.getElementById('cad-senha').value;
    if (!nome || nome.length < 3) { mostrarErro('Informe seu nome completo.'); return; }
    if (senha.length < 4) { mostrarErro('A senha precisa ter ao menos 4 caracteres.'); return; }
    if (getAluno(db, email)) { mostrarErro('Já existe uma conta com este e-mail.'); return; }
    var novo = {
      id: uid(),
      nome: nome,
      email: email,
      senha: senha,
      diasSemana: 3,
      status: 'pendente',
      verificado: false,
      criadoEm: todayISO(),
      plano: null
    };
    db.alunos.push(novo);
    saveDB(db);
    function finalizarCadastro() {
      if (window.Cloud) window.Cloud.pushAluno(novo);
      toast('Conta criada! Confirme seu e-mail.');
      iniciarVerificacao(email);
    }
    if (window.Cloud && window.Cloud.cadastrarAluno) {
      window.Cloud.cadastrarAluno(email, senha).then(function (ok) {
        if (ok === false) {
          db.alunos = db.alunos.filter(function (x) { return x !== novo; });
          saveDB(db);
          mostrarErro('Já existe uma conta com este e-mail.');
          return;
        }
        finalizarCadastro();
      });
    } else {
      finalizarCadastro();
    }
  });

  document.getElementById('btn-verificar').addEventListener('click', function () {
    var digitado = document.getElementById('codigo').value.trim();
    if (!emailPendente) { mostrarErro('Sessão expirada. Tente novamente.'); return; }
    if (digitado !== codigoGerado) { mostrarErro('Código incorreto. Verifique e tente de novo.'); return; }
    var aluno = getAluno(db, emailPendente);
    if (!aluno) { mostrarErro('Conta não encontrada.'); return; }
    aluno.verificado = true;
    saveDB(db);
    if (window.Cloud) window.Cloud.pushAluno(aluno);
    concluirEntrada(aluno.email);
  });

  document.getElementById('btn-reenviar').addEventListener('click', function () {
    if (!emailPendente) return;
    codigoGerado = gerarCodigo();
    document.getElementById('codigo-demo').textContent = codigoGerado;
    toast('Novo código gerado.', 'pink');
  });

  document.getElementById('esqueci').addEventListener('click', function (ev) {
    ev.preventDefault();
    var num = (db.settings && db.settings.whatsapp) || '5555997135782';
    var msg = encodeURIComponent('Olá Deleon! Esqueci minha senha da área do aluno.');
    window.open('https://wa.me/' + num + '?text=' + msg, '_blank');
    toast('Abrimos o WhatsApp para você pedir a redefinição.');
  });
});
