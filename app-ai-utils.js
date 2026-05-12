// ══════════════════════════════════
// IA, UTILITÁRIOS, PWA
// ══════════════════════════════════

// ═══ TESTAR API KEY ═══
function testarAPIKey(){
  var key=CFG.emp&&CFG.emp.apiKey;
  var el=document.getElementById('apiTestResult');
  if(!key){if(el)el.textContent='⚠️ Nenhuma chave configurada';return;}
  if(el)el.textContent='⏳ Testando...';
  fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:10,messages:[{role:'user',content:'oi'}]})
  }).then(function(r){return r.json();}).then(function(d){
    if(el)el.textContent=d.error?'❌ '+d.error.message:'✅ Conectado!';
  }).catch(function(){if(el)el.textContent='❌ Sem conexão';});
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Admin PIN
var _adB='';
var _adOn=localStorage.getItem('hr_adm')==='1';
function openAdminPin(){
  if(_adOn){
    _adOn=false;
    localStorage.setItem('hr_adm','0');
    _applyMode();
    toast('Modo funcionario ativado');
    return;
  }
  _adB='';
  _adDots();
  var m=document.getElementById('adMsg');
  if(m)m.textContent='';
  showMd('adminPinMd');
}
function adPin(d){
  if(_adB.length>=4)return;
  _adB+=d;
  _adDots();
  if(_adB.length===4)setTimeout(_adOk,120);
}
function adPinDel(){
  _adB=_adB.slice(0,-1);
  _adDots();
}
function _adDots(){
  for(var i=0;i<4;i++){
    var d=document.getElementById('ad'+i);
    if(!d)continue;
    d.style.background=i<_adB.length?'var(--gold2)':'transparent';
    d.style.borderColor=i<_adB.length?'var(--gold)':'var(--bd2)';
  }
}
function _adOk(){
  var p=(typeof CFG!=='undefined'&&CFG&&CFG.emp&&CFG.emp.adminPin)?CFG.emp.adminPin:'1818';
  if(_adB===p){
    _adOn=true;
    localStorage.setItem('hr_adm','1');
    closeAll();
    _applyMode();
    toast('Bem-vindo, proprietario!');
  } else {
    var m=document.getElementById('adMsg');
    if(m)m.textContent='Senha incorreta';
    _adB='';
    _adDots();
  }
}
function _spPart(){
  var h=document.querySelector('.sp-hero');
  var s=document.getElementById('sSplash');
  if(!h||!s||!s.classList.contains('on'))return;
  for(var i=0;i<7;i++){
    (function(){
      var p=document.createElement('div');
      var sz=2+Math.random()*7;
      var dur=(1.8+Math.random()*2.4).toFixed(1);
      var hue=Math.random()>.5?'rgba(201,168,76,':'rgba(255,230,120,';
      var op=(.15+Math.random()*.35).toFixed(2);
      p.style.cssText=(
        'position:absolute;border-radius:50%;'
        +'background:'+hue+op+');'
        +'width:'+sz+'px;height:'+sz+'px;'
        +'left:'+(5+Math.random()*90)+'%;'
        +'bottom:'+(5+Math.random()*20)+'%;'
        +'animation:spFloat '+dur+'s ease-out forwards;'
        +'pointer-events:none;'
      );
      h.appendChild(p);
      setTimeout(function(){try{h.removeChild(p);}catch(e){}},(+dur+.5)*1000);
    })();
  }
  setTimeout(_spPart,1800);
}
setTimeout(function(){
  _applyMode();
  _spPart();
},400);

function _applyMode(){
  if(_adOn){
    document.body.classList.remove('func-mode');
    var btn=document.getElementById('btnAdm');
    if(btn){btn.innerHTML='&#x1F451;';btn.style.color='var(--gold2)';btn.style.borderColor='rgba(201,168,76,.3)';}
    // Show Empresa and Config in nav
    document.querySelectorAll('[data-pg="5"],[data-pg="6"]').forEach(function(el){
      el.style.opacity='';el.style.pointerEvents='';
      var lk=el.querySelector('.nav-lock');if(lk)lk.remove();
    });
  } else {
    document.body.classList.add('func-mode');
    var btn=document.getElementById('btnAdm');
    if(btn){btn.innerHTML='&#x1F512;';btn.style.color='var(--t3)';btn.style.borderColor='var(--bd)';}
    // Dim Empresa and Config nav items
    document.querySelectorAll('[data-pg="5"],[data-pg="6"]').forEach(function(el){
      el.style.opacity='.4';el.style.pointerEvents='auto';
      if(!el.querySelector('.nav-lock')){
        var lk=document.createElement('span');
        lk.className='nav-lock';lk.textContent='🔒';
        el.appendChild(lk);
      }
    });
  }
}



// ══ PWA Service Worker — registro único com atualização automática ══
if ('serviceWorker' in navigator) {
  // cache-bust força browser a buscar sw.js novo do servidor a cada carregamento
  navigator.serviceWorker.register('sw.js').then(function(reg) {
    reg.update();

    reg.addEventListener('updatefound', function() {
      var newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', function() {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

  }).catch(function(err) {
    console.warn('SW erro:', err);
  });

  var _swRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (!_swRefreshing) { _swRefreshing = true; window.location.reload(); }
  });
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SW_ACTIVATED' && !_swRefreshing) {
      _swRefreshing = true; window.location.reload();
    }
  });
}


var _pwaEvt = null;
var _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
var _isInApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function _pwaShowBtn(){
  var btn = document.getElementById('btnInstalarPWA');
  if(btn && !_isInApp) btn.classList.add('on');
}

function _pwaHideBtn(){
  var btn = document.getElementById('btnInstalarPWA');
  if(btn) btn.classList.remove('on');
}

function pwaInstalar(){
  if(_pwaEvt){
    // Android / Chrome — prompt nativo
    _pwaEvt.prompt();
    _pwaEvt.userChoice.then(function(r){
      _pwaEvt = null;
      if(r.outcome === 'accepted'){
        _pwaHideBtn();
        toast('App instalado! Procure o ícone na tela inicial 📲');
      }
    });
  } else if(_isIOS){
    // iOS — Safari não tem prompt nativo, mostra modal com instruções
    _pwaShowIOSModal();
  } else {
    // Outros — instrução genérica
    toast('Abra o menu do navegador e toque em "Adicionar à tela inicial"');
  }
}

// Modal de instruções iOS
function _pwaShowIOSModal(){
  // Remove modal anterior se existir
  var old = document.getElementById('_iosInstModal');
  if(old) old.remove();

  var isIPad = /ipad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  var shareIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12l4-4 4 4"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M20 21H4a1 1 0 01-1-1v-4"/><path d="M21 16v4a1 1 0 01-1 1"/></svg>';

  var m = document.createElement('div');
  m.id = '_iosInstModal';
  m.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);padding:0 12px 0;';

  m.innerHTML =
    '<div style="background:#1c1c1e;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:24px 24px 40px;color:#fff;font-family:Outfit,sans-serif;">'
    // Handle
    + '<div style="width:40px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;margin:0 auto 20px;"></div>'
    // Título
    + '<div style="font-size:1.1rem;font-weight:800;margin-bottom:6px;color:#fff;">Instalar no iPhone</div>'
    + '<div style="font-size:.8rem;color:rgba(255,255,255,0.5);margin-bottom:22px;">Adicione o app à tela inicial para acesso rápido, como um app normal.</div>'
    // Passo 1
    + '<div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.06);border-radius:14px;padding:14px 16px;margin-bottom:10px;">'
    +   '<div style="width:32px;height:32px;border-radius:50%;background:#007AFF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800;font-size:.9rem;">1</div>'
    +   '<div>'
    +     '<div style="font-size:.88rem;font-weight:700;margin-bottom:2px;">Toque em ' + (isIPad ? 'Compartilhar' : 'Compartilhar') + '</div>'
    +     '<div style="font-size:.75rem;color:rgba(255,255,255,0.5);">Ícone ' + (isIPad ? 'no topo da tela' : 'na barra inferior do Safari') + '</div>'
    +   '</div>'
    +   '<div style="margin-left:auto;flex-shrink:0;">' + shareIcon + '</div>'
    + '</div>'
    // Passo 2
    + '<div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.06);border-radius:14px;padding:14px 16px;margin-bottom:10px;">'
    +   '<div style="width:32px;height:32px;border-radius:50%;background:#007AFF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800;font-size:.9rem;">2</div>'
    +   '<div>'
    +     '<div style="font-size:.88rem;font-weight:700;margin-bottom:2px;">Role e toque em</div>'
    +     '<div style="font-size:.8rem;color:#C9A84C;font-weight:700;">"Adicionar à Tela de Início"</div>'
    +   '</div>'
    +   '<div style="margin-left:auto;flex-shrink:0;font-size:1.4rem;">＋</div>'
    + '</div>'
    // Passo 3
    + '<div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.06);border-radius:14px;padding:14px 16px;margin-bottom:24px;">'
    +   '<div style="width:32px;height:32px;border-radius:50%;background:#007AFF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800;font-size:.9rem;">3</div>'
    +   '<div>'
    +     '<div style="font-size:.88rem;font-weight:700;margin-bottom:2px;">Toque em <span style="color:#C9A84C;">Adicionar</span></div>'
    +     '<div style="font-size:.75rem;color:rgba(255,255,255,0.5);">Canto superior direito da tela</div>'
    +   '</div>'
    +   '<div style="margin-left:auto;flex-shrink:0;font-size:1.1rem;">✓</div>'
    + '</div>'
    // Botão fechar
    + '<button onclick="document.getElementById(\'_iosInstModal\').remove()" style="width:100%;background:#007AFF;border:none;border-radius:14px;padding:15px;color:#fff;font-size:.95rem;font-weight:700;font-family:Outfit,sans-serif;cursor:pointer;touch-action:manipulation;">Entendi</button>'
    + '</div>';

  // Fecha ao tocar no fundo
  m.addEventListener('click', function(e){
    if(e.target === m) m.remove();
  });

  document.body.appendChild(m);
}

window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault();
  _pwaEvt = e;
  _pwaShowBtn();
});

window.addEventListener('appinstalled', function(){
  _pwaHideBtn();
  _pwaEvt = null;
});

if(_isIOS && !_isInApp){ _pwaShowBtn(); }

// ── Micro-interactions ──
document.addEventListener('DOMContentLoaded', function(){

  // Ripple effect on buttons
  document.body.addEventListener('touchstart', function(e){
    var btn = e.target.closest('.btn-g, .btn-o, .qa, .sp-btn-main, .sp-btn-cat, .ni');
    if(!btn) return;
    var r = document.createElement('span');
    var rect = btn.getBoundingClientRect();
    var x = (e.touches[0].clientX - rect.left);
    var y = (e.touches[0].clientY - rect.top);
    r.style.cssText = 'position:absolute;width:80px;height:80px;background:rgba(255,255,255,.08);border-radius:50%;transform:translate(-50%,-50%) scale(0);left:'+x+'px;top:'+y+'px;animation:ripple .4s ease-out forwards;pointer-events:none;';
    btn.style.position = btn.style.position || 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(r);
    setTimeout(function(){if(r.parentNode)r.parentNode.removeChild(r);}, 500);
  }, {passive:true});

  // Number counter animation for finance values
  window._animateNum = function(el, target, prefix){
    var start = 0, dur = 600, startTime = null;
    function step(ts){
      if(!startTime) startTime = ts;
      var p = Math.min((ts-startTime)/dur, 1);
      var ease = 1-Math.pow(1-p, 3);
      el.textContent = (prefix||'') + 'R$ ' + (start + (target-start)*ease).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if(p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };
});

// Ripple CSS
(function(){
  var s = document.createElement('style');
  s.textContent = '@keyframes ripple{to{transform:translate(-50%,-50%) scale(4);opacity:0;}}';
  document.head.appendChild(s);
})();

function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('on');setTimeout(function(){t.classList.remove('on');},2500);}