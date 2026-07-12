// ════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ════════════════════════════════════════════════════════════

function showSplash(onDone) {
  const sAppEl = document.getElementById('sApp');
  if (sAppEl) sAppEl.style.display = 'none';

  const splash = document.createElement('div');
  splash.id = 'splash';

  const style = document.createElement('style');
  style.textContent = `
    #splash {
      position:fixed;inset:0;z-index:9999;
      background:#080810;
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;
    }
    #splashBg {
      position:absolute;inset:0;
      background:
        radial-gradient(ellipse 80% 60% at 50% 30%, rgba(201,168,76,0.09) 0%, transparent 65%),
        radial-gradient(ellipse 50% 40% at 20% 80%, rgba(80,100,200,0.06) 0%, transparent 60%),
        linear-gradient(180deg,#0D0D1C 0%,#080810 100%);
    }
    /* Partículas douradas */
    .sp-p {
      position:absolute;border-radius:50%;
      background:rgba(212,175,55,0.5);
      animation:spFloat var(--d,3s) ease-in-out infinite alternate;
      animation-delay:var(--dl,0s);
    }
    @keyframes spFloat {
      from{transform:translateY(0) scale(1);opacity:var(--op,.3)}
      to{transform:translateY(-14px) scale(1.3);opacity:calc(var(--op,.3)*2)}
    }
    /* Linhas decorativas laterais */
    .sp-line {
      position:absolute;width:1px;
      background:linear-gradient(180deg,transparent,rgba(212,175,55,0.3),transparent);
      animation:spLineFade 2.5s ease-in-out infinite alternate;
      animation-delay:var(--dl,0s);
    }
    @keyframes spLineFade {
      from{opacity:0.2;transform:scaleY(0.7)}
      to{opacity:0.7;transform:scaleY(1)}
    }
    #splashInner {
      display:flex;flex-direction:column;align-items:center;
      gap:0;padding:0 32px;
      position:relative;z-index:1;
      animation:splashIn 600ms cubic-bezier(.34,1.56,.64,1) both;
    }
    @keyframes splashIn {
      from{opacity:0;transform:scale(.8) translateY(30px)}
      to{opacity:1;transform:scale(1) translateY(0)}
    }
    @keyframes splashOut {
      from{opacity:1;transform:scale(1);filter:blur(0)}
      to{opacity:0;transform:scale(1.06);filter:blur(6px)}
    }
    /* Logo container com glow */
    #splashLogoWrap {
      position:relative;
      width:200px;height:200px;
      display:flex;align-items:center;justify-content:center;
      margin-bottom:4px;
    }
    #splashLogoGlow {
      position:absolute;inset:-20px;border-radius:50%;
      background:radial-gradient(circle,rgba(201,168,76,0.2) 0%,transparent 65%);
      animation:glowPulse 2.5s ease-in-out infinite alternate;
    }
    @keyframes glowPulse {
      from{transform:scale(1);opacity:0.6}
      to{transform:scale(1.15);opacity:1}
    }
    #splashLogoRing {
      position:absolute;inset:0;border-radius:50%;
      border:1px solid rgba(212,175,55,0.25);
      animation:ringExpand 2s ease-out infinite;
    }
    #splashLogoRing2 {
      position:absolute;inset:-12px;border-radius:50%;
      border:1px solid rgba(212,175,55,0.1);
      animation:ringExpand 2s ease-out infinite;
      animation-delay:.6s;
    }
    @keyframes ringExpand {
      from{transform:scale(0.9);opacity:0.6}
      to{transform:scale(1.08);opacity:0}
    }
    #splashLogo {
      width:180px;height:180px;
      object-fit:contain;
      position:relative;z-index:1;
      filter:drop-shadow(0 0 24px rgba(212,175,55,0.35)) drop-shadow(0 8px 32px rgba(0,0,0,0.8));
      animation:logoShimmer 3s ease-in-out infinite alternate;
    }
    @keyframes logoShimmer {
      from{filter:drop-shadow(0 0 16px rgba(212,175,55,0.25)) drop-shadow(0 8px 32px rgba(0,0,0,0.8))}
      to{filter:drop-shadow(0 0 36px rgba(212,175,55,0.55)) drop-shadow(0 0 60px rgba(212,175,55,0.15)) drop-shadow(0 8px 32px rgba(0,0,0,0.8))}
    }
    #splashNome {
      font-family:'Outfit',sans-serif;
      font-size:1.6rem;font-weight:800;letter-spacing:-.02em;
      background:linear-gradient(135deg,#EDD060 0%,#C9A84C 40%,#EDD060 80%);
      background-size:200% 100%;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
      animation:textShimmer 3s ease-in-out infinite;
      margin-bottom:4px;
    }
    @keyframes textShimmer {
      0%{background-position:0% center}
      50%{background-position:100% center}
      100%{background-position:0% center}
    }
    #splashSub {
      font-family:'Outfit',sans-serif;
      font-size:.68rem;font-weight:400;
      color:rgba(180,175,165,0.6);letter-spacing:.06em;
      margin-bottom:32px;
    }
    #splashBar {
      width:120px;height:2px;
      background:rgba(255,255,255,0.05);
      border-radius:10px;overflow:hidden;
    }
    #splashBarFill {
      height:100%;width:0%;
      background:linear-gradient(90deg,#8B6820,#EDD060,#C9A84C);
      border-radius:10px;
      transition:width 1.6s cubic-bezier(.4,0,.2,1);
      box-shadow:0 0 10px rgba(237,208,96,0.6);
    }
  `;
  document.head.appendChild(style);

  splash.innerHTML = `
    <div id="splashBg"></div>
    <div id="splashParticles"></div>
    <div id="splashInner">
      <div id="splashLogoWrap">
        <div id="splashLogoGlow"></div>
        <div id="splashLogoRing"></div>
        <div id="splashLogoRing2"></div>
        <img id="splashLogo" src="${typeof LOGO_B64!=='undefined'?LOGO_B64:'logo.png'}" alt="Ceará Planejados">
      </div>
      <div id="splashNome">Ceará Planejados</div>
      <div id="splashSub">Vidraçaria · Marcenaria · Serralheria</div>
      <div id="splashBar"><div id="splashBarFill"></div></div>
    </div>
  `;
  document.body.appendChild(splash);

  // Partículas
  const pp = splash.querySelector('#splashParticles');
  [
    {x:10,y:18,s:3,op:.35,d:'2.8s',dl:'0s'},
    {x:85,y:12,s:2,op:.25,d:'3.3s',dl:'.5s'},
    {x:92,y:68,s:4,op:.2, d:'2.6s',dl:'.9s'},
    {x:6, y:74,s:2,op:.3, d:'3.6s',dl:'.2s'},
    {x:50,y:90,s:3,op:.2, d:'3s',  dl:'1s' },
    {x:72,y:28,s:2,op:.15,d:'4s',  dl:'.7s'},
    {x:22,y:58,s:2,op:.2, d:'3.8s',dl:'1.3s'},
    {x:60,y:82,s:2,op:.18,d:'2.9s',dl:'.4s'},
  ].forEach(p => {
    const el = document.createElement('div');
    el.className = 'sp-p';
    el.style.cssText = `left:${p.x}%;top:${p.y}%;width:${p.s}px;height:${p.s}px;--op:${p.op};--d:${p.d};--dl:${p.dl}`;
    pp.appendChild(el);
  });
  // Linhas verticais
  [
    {x:8,h:80,dl:'0s'},{x:92,h:60,dl:'.4s'},{x:50,h:40,dl:'.8s'}
  ].forEach(l => {
    const el = document.createElement('div');
    el.className = 'sp-line';
    el.style.cssText = `left:${l.x}%;top:${(100-l.h)/2}%;height:${l.h}%;--dl:${l.dl}`;
    pp.appendChild(el);
  });

  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('splashBarFill');
      if (fill) fill.style.width = '100%';
    }, 100);
  });

  setTimeout(() => {
    splash.style.animation = 'splashOut 450ms cubic-bezier(.4,0,1,1) both';
    setTimeout(() => {
      splash.remove();
      style.remove();
      const sApp2 = document.getElementById('sApp');
      if (sApp2) sApp2.style.display = '';
      onDone();
    }, 430);
  }, 2100);
}

// ════════════════════════════════════════════════════════════
// PWA INSTALL PROMPT
// ════════════════════════════════════════════════════════════

let _pwaPrompt = null;
const _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
const _isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const _isAndroid = /android/i.test(navigator.userAgent);

// Captura o prompt ANTES da splash (Android/Chrome)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _pwaPrompt = e;
  const banner = document.getElementById('pwaInstallBanner');
  if (banner && !banner.classList.contains('show')) banner.classList.add('show');
});

window.addEventListener('appinstalled', () => {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.remove('show');
  _pwaPrompt = null;
});

function setupPWAButtons() {
  if (_isInstalled) return; // já instalado, não mostra nada

  const banner     = document.getElementById('pwaInstallBanner');
  const installBtn = document.getElementById('pwaInstallBtn');
  const closeBtn   = document.getElementById('pwaInstallClose');
  const subEl      = banner ? banner.querySelector('.pib-sub') : null;

  if (!banner) return;

  if (_isIOS) {
    // iOS Safari: instrução manual
    if (subEl) subEl.textContent = 'Safari → botão Compartilhar → "Adicionar à Tela de Início"';
    if (installBtn) { installBtn.textContent = 'Ver instruções'; installBtn.style.fontSize = '.65rem'; }
    banner.classList.add('show');
    if (installBtn) {
      installBtn.addEventListener('click', () => {
        alert('Instalar no iPhone/iPad:\n\n1. Toque no botão Compartilhar (□ com seta ↑) no Safari\n2. Role a lista e toque em "Adicionar à Tela de Início"\n3. Toque em "Adicionar" para confirmar');
      });
    }
  } else if (_pwaPrompt) {
    // Prompt já capturado: exibe banner
    banner.classList.add('show');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        try {
          _pwaPrompt.prompt();
          const { outcome } = await _pwaPrompt.userChoice;
          if (outcome === 'accepted') {
            banner.classList.remove('show');
            _pwaPrompt = null;
          }
        } catch(e) { console.warn('PWA prompt error:', e); }
      });
    }
  }
  // Android/Chrome sem prompt ainda: aguarda o evento chegar naturalmente
  // (o listener 'beforeinstallprompt' no topo vai mostrar o banner quando disponível)

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      banner.classList.remove('show');
      sessionStorage.setItem('pwaBannerClosed', '1');
    });
  }

  // Não mostra se o usuário fechou nesta sessão
  if (sessionStorage.getItem('pwaBannerClosed')) {
    banner.classList.remove('show');
  }
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════

function initApp() {
  loadCFG(); // carrega preços/configurações do localStorage
  try {
    // Header date
    function getDataHdr() {
      const d = new Date();
      const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
    }
    const hdrDataEl = document.getElementById('hdrData');
    if (hdrDataEl) hdrDataEl.textContent = getDataHdr();

    // Injetar logo real no header
    try {
      const img = document.getElementById('hdrLogoImg');
      const fallback = document.getElementById('hdrLogoFallback');
      if (img && typeof LOGO_B64 !== 'undefined') {
        img.src = LOGO_B64;
        img.style.display = 'block';
        if (fallback) fallback.style.display = 'none';
      }
    } catch(e) {}

    // ── Indicador offline ────────────────────────────────────
    function _atualizarOfflineBanner() {
      var el = document.getElementById('offlineBanner');
      if (!el) {
        el = document.createElement('div');
        el.id = 'offlineBanner';
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;' +
          'background:rgba(220,100,60,.95);color:#fff;font-size:.72rem;font-weight:700;' +
          'text-align:center;padding:5px 12px;letter-spacing:.03em;' +
          'transform:translateY(-100%);transition:transform 200ms ease;pointer-events:none;';
        document.body.appendChild(el);
      }
      var online = navigator.onLine;
      el.textContent = '📡 Sem conexão — dados locais';
      el.style.transform = online ? 'translateY(-100%)' : 'translateY(0)';
    }
    _atualizarOfflineBanner();
    window.addEventListener('online',  _atualizarOfflineBanner);
    window.addEventListener('offline', _atualizarOfflineBanner);


      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(()=>{});
      });

    // Destino inicial: respeita atalho PWA (?pg=...) mas nunca no carregamento normal
    const urlParams = new URLSearchParams(window.location.search);
    const pgParam = urlParams.get('pg');
    const paginaInicial = (pgParam && NAV_ITEMS.some(n => n.id === pgParam)) ? pgParam : 'home';

    // Garante que o #sApp existe antes de rodar o splash
    const sAppEl = document.getElementById('sApp');
    if (!sAppEl) { console.error('Ceará: #sApp não encontrado'); return; }

    // Mostra splash, depois monta o app
    showSplash(() => {
      paginaAtiva = paginaInicial;
      buildNav();
      renderPage();
      setupPWAButtons();
    });

  } catch(err) {
    // Se houver erro, mostra o app diretamente sem splash
    console.error('Ceará init error:', err);
    const sApp = document.getElementById('sApp');
    if (sApp) sApp.style.display = '';
    try { buildNav(); renderPage(); } catch(e2) { console.error('Ceará render error:', e2); }
  }
}

// Inicia quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ── Detecção e aplicação automática de updates do SW ──────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          newSW.postMessage('skipWaiting');
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
        }
      });
    });
  });
}
