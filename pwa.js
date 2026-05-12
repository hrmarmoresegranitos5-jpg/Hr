// PWA Service Worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(function(reg){
    // Força verificação imediata de atualização
    reg.update();
    // Quando novo SW estiver esperando, ativa imediatamente
    reg.addEventListener('updatefound', function(){
      var newWorker = reg.installing;
      if(newWorker){
        newWorker.addEventListener('statechange', function(){
          if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
            newWorker.postMessage({type:'SKIP_WAITING'});
          }
        });
      }
    });
  }).catch(function(){});
  // Recarrega quando novo SW assumir
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    window.location.reload();
  });
}

// PWA Install Button
var _pwaEvt = null;
var _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
var _isInApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

function _pwaShowBtn(){
  var btn = document.getElementById('btnInstalarPWA');
  if(btn && !_isInApp) btn.classList.add('on');
}
function pwaInstalar(){
  if(_pwaEvt){
    _pwaEvt.prompt();
    _pwaEvt.userChoice.then(function(r){
      _pwaEvt = null;
      if(r.outcome==='accepted'){
        var btn=document.getElementById('btnInstalarPWA');
        if(btn) btn.classList.remove('on');
        toast('App instalado com sucesso! 🎉');
      }
    });
  } else if(_isIOS){
    toast('No iPhone: toque em Compartilhar ↑ → "Adicionar à Tela de Início"');
  } else {
    toast('Para instalar: menu do navegador → "Adicionar à tela inicial"');
  }
}
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault();
  _pwaEvt = e;
  _pwaShowBtn();
});
window.addEventListener('appinstalled', function(){
  var btn=document.getElementById('btnInstalarPWA');
  if(btn) btn.classList.remove('on');
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

</script>
