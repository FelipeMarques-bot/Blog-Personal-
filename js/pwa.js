(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  var deferredPrompt = null;
  var btns = document.querySelectorAll('.btn-install');

  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function refresh() {
    btns.forEach(function (b) {
      b.style.display = standalone() ? 'none' : '';
    });
  }

  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    deferredPrompt = ev;
    refresh();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    refresh();
    if (typeof toast === 'function') toast('App instalado! Procure o ícone FitApp na sua tela.');
  });

  function abrirInstrucoes() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);
    var passos = ios
      ? ['Abra este site no <b>Safari</b>.', 'Toque no ícone <b>Compartilhar</b> (quadrado com seta para cima, na barra de baixo).', 'Role a lista e toque em <b>"Adicionar à Tela de Início"</b>.', 'Confirme em <b>Adicionar</b>. O ícone FitApp aparece na sua tela.']
      : ['Toque no menu do navegador (três pontos ⋮).', 'Escolha <b>"Instalar aplicativo"</b> ou <b>"Adicionar à tela inicial"</b>.', 'Confirme. O ícone FitApp aparece na sua tela.'];

    var overlay = document.createElement('div');
    overlay.id = 'pwa-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(4,5,12,.85);backdrop-filter:blur(4px);z-index:99;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = document.createElement('div');
    box.style.cssText = 'width:min(420px,100%);background:#10121c;border:1px solid rgba(57,255,20,.3);border-radius:16px;padding:24px;font-family:inherit;';
    var html = '<div style="font-size:.75rem;letter-spacing:2px;color:#39ff14;font-weight:800;">' + (ios ? 'INSTALAR NO IPHONE / IPAD' : 'INSTALAR NO ANDROID') + '</div>';
    html += '<h3 style="margin:6px 0 14px;color:#fff;">Leva 10 segundos ' + (ios ? '🍎' : '🤖') + '</h3><ol style="margin:0 0 18px;padding-left:20px;color:#c9cdd8;line-height:1.9;font-size:.92rem;">';
    passos.forEach(function (p) { html += '<li>' + p + '</li>'; });
    html += '</ol><button id="pwa-fechar" style="width:100%;padding:12px;border-radius:10px;border:none;background:#39ff14;color:#07070d;font-weight:800;letter-spacing:1px;cursor:pointer;">ENTENDI</button>';
    box.innerHTML = html;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function fechar() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    document.getElementById('pwa-fechar').addEventListener('click', fechar);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) fechar(); });
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; refresh(); });
      } else if (standalone()) {
        if (typeof toast === 'function') toast('Você já está usando o app instalado!');
      } else {
        abrirInstrucoes();
      }
    });
  });

  refresh();
})();
