// ══════════════════════════════════
// INICIALIZAÇÃO, SPLASH, NAVEGAÇÃO, DISPATCH
// ══════════════════════════════════

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded',function(){
  // Force correct layout on resize / orientation change
  // ── LAYOUT ENGINE COMPLETO ──
window.setLayout=function(){
    var W=window.innerWidth, H=window.innerHeight;
    var isLandscape=W>H;
    var shell=document.getElementById('shell');
    var sApp=document.getElementById('sApp');
    var hdr=document.getElementById('hdr');
    var pages=document.getElementById('pages');
    var nav=document.getElementById('nav');
    var hap=document.getElementById('hdrAndPages');
    if(!shell||!sApp||!hdr||!pages||!nav||!hap)return;
    if(!sApp.classList.contains('on')){
      shell.style.cssText='position:fixed;top:0;left:0;width:'+W+'px;height:'+H+'px;overflow:hidden;background:#070709;';
      return;
    }

    // Shell e sApp = tela inteira
    shell.style.cssText='position:fixed;top:0;left:0;width:'+W+'px;height:'+H+'px;overflow:hidden;background:var(--bg);';
    sApp.style.cssText='position:absolute;top:0;left:0;width:'+W+'px;height:'+H+'px;';

    var isTablet=W>=900;
    var navW=isTablet?88:76;

    if(isLandscape){
      // 1. Posicionar nav à esquerda
      nav.style.cssText='position:absolute;top:0;left:0;width:'+navW+'px;height:'+H+'px;'
        +'display:flex;flex-direction:column;align-items:center;background:var(--s1);'
        +'border-right:1px solid var(--bd);overflow-y:auto;overflow-x:hidden;z-index:20;padding-top:8px;';

      // 2. Estilo dos NI
      document.querySelectorAll('.ni').forEach(function(ni){
        ni.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;'
          +'gap:3px;width:'+navW+'px;padding:13px 2px;cursor:pointer;position:relative;'
          +'touch-action:manipulation;background:none;border:none;font-family:Outfit,sans-serif;color:var(--tx);';
      });
      document.querySelectorAll('.ni-l').forEach(function(l){l.style.fontSize=isTablet?'.48rem':'.42rem';});

      // 3. HAP ocupa o resto
      hap.style.cssText='position:absolute;top:0;left:'+navW+'px;width:'+(W-navW)+'px;height:'+H+'px;overflow:hidden;';

      // 4. HDR no topo do HAP
      hdr.style.cssText='position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:9px;'
        +'padding:10px 17px 9px;background:var(--s1);border-bottom:1px solid var(--bd);z-index:10;';
      var hdrH=hdr.offsetHeight;
      if(!hdrH||hdrH<20)hdrH=48;

      // 5. Pages abaixo do HDR
      pages.style.cssText='position:absolute;top:'+hdrH+'px;left:0;right:0;bottom:0;overflow:hidden;';

    } else {
      // 1. Estilo dos NI portrait
      document.querySelectorAll('.ni').forEach(function(ni){
        ni.style.cssText='flex:1;min-width:52px;padding:9px 2px 7px;cursor:pointer;position:relative;'
          +'touch-action:manipulation;background:none;border:none;font-family:Outfit,sans-serif;color:var(--tx);'
          +'display:flex;flex-direction:column;align-items:center;gap:2px;';
      });
      document.querySelectorAll('.ni-l').forEach(function(l){l.style.fontSize='.44rem';});

      // 2. NAV na base - medir primeiro temporariamente visível
      nav.style.cssText='position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:row;'
        +'background:var(--s1);border-top:1px solid var(--bd);z-index:20;'
        +'padding-bottom:env(safe-area-inset-bottom,0);overflow-x:auto;';
      var navH=nav.offsetHeight;
      if(!navH||navH<40)navH=58;

      // 3. HAP ocupa de cima até o nav
      hap.style.cssText='position:absolute;top:0;left:0;right:0;bottom:'+navH+'px;overflow:hidden;';

      // 4. HDR no topo
      hdr.style.cssText='position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:9px;'
        +'padding:12px 17px 10px;background:var(--s1);border-bottom:1px solid var(--bd);z-index:10;';
      var hdrH=hdr.offsetHeight;
      if(!hdrH||hdrH<20)hdrH=56;

      // 5. Pages abaixo do HDR
      pages.style.cssText='position:absolute;top:'+hdrH+'px;left:0;right:0;bottom:0;overflow:hidden;';
    }

    // Pages ativas e inativas
    document.querySelectorAll('.pg').forEach(function(pg){
      if(pg.classList.contains('on')){
        pg.style.cssText='display:block;position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;-webkit-overflow-scrolling:touch;';
      } else {
        pg.style.cssText='display:none;';
      }
    });

    // Cores do ni ativo
    aplicarEstiloNi();
  }
window.aplicarEstiloNi=function(){
    document.querySelectorAll('.ni').forEach(function(ni){
      var isOn=ni.classList.contains('on');
      var l=ni.querySelector('.ni-l');
      if(l)l.style.color=isOn?'var(--gold)':'var(--t4)';
    });
  }
  window.addEventListener('resize',setLayout);

  // ── ORIENTAÇÃO: listener robusto para Android PWA ──
  function _onOrientationChange(){
    var tries=0, lastW=0, lastH=0;
    function tryLayout(){
      var W=window.innerWidth, H=window.innerHeight;
      setLayout();
      tries++;
      if(tries<15&&(W!==lastW||H!==lastH||W===H)){
        lastW=W; lastH=H;
        setTimeout(tryLayout,150);
      }
    }
    setTimeout(tryLayout,50);
  }
  window.addEventListener('orientationchange',_onOrientationChange);
  // API moderna — mais confiável no Android Chrome PWA
  if(screen.orientation){
    screen.orientation.addEventListener('change',_onOrientationChange);
  }
  // visualViewport garante que o layout atualiza ao girar
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',function(){
      setLayout();
    });
  }
  setLayout();

  initCFG();
  selMat=CFG.stones[0].id;
  var now=new Date();
  var _hdrDate=document.getElementById('hdrDate');
  if(_hdrDate)_hdrDate.textContent=now.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
  var _jStart=document.getElementById('jStart');if(_jStart)_jStart.value=td();
  var _fData=document.getElementById('fData');if(_fData)_fData.value=td();
  // Listeners
  document.addEventListener('click',dispatch);
  var _diasIn=document.getElementById('diasIn');if(_diasIn)_diasIn.addEventListener('input',prevDias);
  var _jDias=document.getElementById('jDias');if(_jDias)_jDias.addEventListener('input',prevJobDias);
  var _fileInp=document.getElementById('fileInp');if(_fileInp)_fileInp.addEventListener('change',onFile);
  document.querySelectorAll('.ov').forEach(function(o){o.addEventListener('click',function(e){if(e.target===o)closeAll();});});
  // Build
  buildMat();addAmbiente();buildCatalog();buildCubaList();buildAcList();renderAg();renderFin();updEmp();updUrgDot();renderFixos();renderInfoList();renderOrc();bUpdDot();
  // Init sync if previously configured
  var savedCode=localStorage.getItem('hr_sync_code');
  if(savedCode)setTimeout(function(){if(typeof firebase!=='undefined')SYNC.init(savedCode);},3000);
  // Handle any tap that happened before DOMContentLoaded finished
  if(window._pendingPg!==null){var pp=window._pendingPg;window._pendingPg=null;openApp(pp);}
});

// ═══ SPLASH ═══
function openApp(pg){
  var splash=document.getElementById('sSplash');
  if(!splash){console.error('openApp: #sSplash não encontrado');return;}
  splash.classList.remove('on');
  splash.style.display='none';
  var a=document.getElementById('sApp');
  if(!a){console.error('openApp: #sApp não encontrado');return;}
  a.classList.add('on');
  a.style.display='block';
  setLayout();
  requestAnimationFrame(function(){
    setLayout();
    go(pg);
  });
  window._pendingPg=null;
}
function voltarSplash(){
  closeAll();
  var splash=document.getElementById('sSplash');
  var app=document.getElementById('sApp');
  var intro=document.getElementById('sIntro');
  if(intro){intro.style.display='none';}
  if(splash){splash.classList.add('on');splash.style.display='flex';}
  if(app){app.classList.remove('on');}
}

// ═══ NAV ═══
function go(n){
  // Access control: Empresa(5) and Config(6) require admin
  var _ADMIN_ONLY=[5,6];
  if(_ADMIN_ONLY.indexOf(+n)>=0 && !_adOn){
    toast('Requer acesso de proprietário 🔒');
    openAdminPin();
    return;
  }
  closeAll();
  var _sApp=document.getElementById('sApp');
  var _sSplash=document.getElementById('sSplash');
  var _sIntro=document.getElementById('sIntro');
  if(_sApp){_sApp.classList.add('on');}
  if(_sSplash){_sSplash.classList.remove('on');_sSplash.style.display='none';}
  if(_sIntro){_sIntro.style.display='none';}
  var actualId=n===7?'2b':n;
  document.querySelectorAll('.ni').forEach(function(t){t.classList.toggle('on',+t.dataset.pg===n);});
  document.querySelectorAll('.pg').forEach(function(p){
    p.classList.remove('on');
    p.style.cssText='display:none;';
  });
  var pg=document.getElementById('pg'+actualId);
  if(pg){
    pg.classList.add('on');
    pg.style.cssText='display:block;position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;-webkit-overflow-scrolling:touch;';
    pg.scrollTop=0;
  }
  aplicarEstiloNi();
  if(n===2)buildCubaList();
  if(n===7)renderOrc();
  if(n===8)buildAcList();
  if(n===3)renderAg();
  if(n===4)renderFin();
  if(n===5)updEmp();
  if(n===6){cfgTab=0;document.querySelectorAll('.cfgtab').forEach(function(t){t.classList.toggle('on',t.dataset.cftab==='0');});buildCfg();}
  if(n===9){if(typeof renderTum==='function')renderTum();}
}

// ═══ DISPATCH ═══
function dispatch(e){
  var el;
  // Close modal
  el=e.target.closest('[data-close]');if(el){closeAll();return;}
  // Nav
  el=e.target.closest('[data-pg]');if(el&&el.dataset.pg!==undefined&&el.classList.contains('ni')){go(+el.dataset.pg);return;}
  // Config tab
  el=e.target.closest('[data-cftab]');if(el){cfgTab=+el.dataset.cftab;document.querySelectorAll('.cfgtab').forEach(function(t){t.classList.toggle('on',t.dataset.cftab===el.dataset.cftab);});buildCfg();return;}
  // Cuba cat tabs
  el=e.target.closest('[data-ccat]');if(el){cubaCat=el.dataset.ccat;document.querySelectorAll('[data-ccat]').forEach(function(t){t.classList.toggle('on',t.dataset.ccat===cubaCat);});buildCubaList();return;}
  // Catalog filter
  el=e.target.closest('[data-catf]');if(el){catF=el.dataset.catf;document.querySelectorAll('[data-catf]').forEach(function(x){x.classList.toggle('on',x.dataset.catf===catF);});buildCatGrid();return;}
  // Pick mat
  el=e.target.closest('[data-mat]');if(el){pickMat(el.dataset.mat);return;}
  // Stone detail
  el=e.target.closest('[data-stone]');if(el){openStone(el.dataset.stone);return;}
  // Pick cuba
  el=e.target.closest('[data-pcuba]');if(el){pickCuba(el.dataset.pcuba,el.dataset.ctype);return;}
  // QA finance buttons
  el=e.target.closest('[data-ftab]');if(el){finTab(el.dataset.ftab);return;}
  el=e.target.closest('[data-qa]');if(el){openFin(el.dataset.qa);return;}
  // Boletos
  el=e.target.closest('[data-btipo]');if(el){bSetTipo(el.dataset.btipo);return;}
  el=e.target.closest('[data-openboleto]');if(el){openBoletoDetail(+el.dataset.openboleto);return;}
  el=e.target.closest('[data-bfiltro]');if(el){bSetFiltro(el.dataset.bfiltro);return;}
  el=e.target.closest('#btnSvBoleto');if(el){saveBoleto();return;}
  el=e.target.closest('#btnBDetPagar');if(el){bMarcarPago(_editBoletoId);return;}
  el=e.target.closest('#btnBDetEdit');if(el){closeAll();setTimeout(function(){editBoleto(_editBoletoId);},100);return;}
  el=e.target.closest('#btnBDetDel');if(el){delBoleto(_editBoletoId);return;}
  // Finance type selector in modal
  el=e.target.closest('[data-ftp]');if(el){setFT(el.dataset.ftp);return;}
  // Finance type in edit modal
  el=e.target.closest('[data-tet]');if(el){setTET(el.dataset.tet);return;}
  // Job actions
  el=e.target.closest('[data-togjob]');if(el){togJob(+el.dataset.togjob);return;}
  el=e.target.closest('[data-editjob]');if(el){editJob(+el.dataset.editjob);closeJobDetail&&closeJobDetail();return;}
  el=e.target.closest('[data-pagrest]');if(el){pagRest(+el.dataset.pagrest);return;}
  el=e.target.closest('[data-deljob]');if(el){delJob(+el.dataset.deljob);closeJobDetail&&closeJobDetail();return;}
  el=e.target.closest('[data-openjob]');if(el){openJobDetail(+el.dataset.openjob);return;}
  el=e.target.closest('[data-dtab]');if(el){detailTab(el.dataset.dtab);return;}
  el=e.target.closest('[data-setstatus]');if(el){setJobStatus(_detailJobId,el.dataset.setstatus);return;}
  el=e.target.closest('[data-recpend]');if(el){receberPend(+el.dataset.recpend);if(typeof renderJobDetail==='function')renderJobDetail();return;}
  // Peca remove
  el=e.target.closest('[data-rmpc]');if(el){remPeca(+el.dataset.rmpc);return;}
  // Edit transaction
  el=e.target.closest('[data-edittr]');if(el){openEditTr(+el.dataset.edittr);return;}
  // Photo pick
  el=e.target.closest('[data-pp]');if(el){pickPhoto(el.dataset.pp,+el.dataset.idx);return;}
  // Buttons
  el=e.target.closest('#btnAddPeca');if(el){addPeca();return;}
  el=e.target.closest('#btnAddAmbiente');if(el){addAmbiente();return;}
  el=e.target.closest('[data-ai-amb]');if(el){abrirAIMd(+el.dataset.aiAmb);return;}
  el=e.target.closest('[data-amb-tipo]');if(el){setAmbTipo(+el.dataset.ambId,el.dataset.ambTipo);return;}
  el=e.target.closest('[data-rm-amb]');if(el){rmAmbiente(+el.dataset.rmAmb);return;}
  el=e.target.closest('[data-add-peca]');if(el){addPecaAmb(+el.dataset.addPeca);return;}
  el=e.target.closest('[data-rmpc]');if(el){remPeca(+el.dataset.rmpc);return;}
  el=e.target.closest('[data-sv]');if(el&&el.dataset.amb){togSV(el.dataset.sv,+el.dataset.amb);return;}
  el=e.target.closest('[data-tog-ac]');if(el){togAcAmb(+el.dataset.ambAc,el.dataset.togAc);return;}
  el=e.target.closest('#btnAI');if(el){var _ad=document.getElementById('aiDesc');var _as=document.getElementById('aiStatus');var _arb=document.getElementById('aiResultBox');var _baa=document.getElementById('btnAIAplicar');if(_ad)_ad.value='';if(_as){_as.textContent='';_as.className='ai-status';}if(_arb)_arb.style.display='none';if(_baa)_baa.style.display='none';showMd('aiMd');return;}
  el=e.target.closest('#btnAIEnviar');if(el){aiInterpretar();return;}
  el=e.target.closest('#btnAIAplicar');if(el){aiAplicar();return;}
  el=e.target.closest('#btnCalc');if(el){calcular();return;}
  el=e.target.closest('#btnCopy');if(el){copiar();return;}
  el=e.target.closest('#btnPDF');if(el){gerarPDF();return;}
  el=e.target.closest('#btnFechamento');if(el){abrirFechamento();return;}
  el=e.target.closest('#btnNewJob');if(el){openJobModal(null);return;}
  el=e.target.closest('#btnSvJob');if(el){saveJob();return;}
  el=e.target.closest('#btnSvFin');if(el){saveFin();return;}
  el=e.target.closest('#btnConfAg');if(el){confirmarAgenda();return;}
  el=e.target.closest('#btnSvTrEd');if(el){saveTrEdit();return;}
  el=e.target.closest('#btnDelTr');if(el){delTr();return;}
  el=e.target.closest('#cbY');if(el){if(cbYcb)cbYcb();return;}
  el=e.target.closest('#cbN');if(el){if(cbNcb)cbNcb();return;}
}
function closeAll(){document.querySelectorAll('.ov').forEach(function(o){o.classList.remove('on');});}
function showMd(id){
  closeAll();
  var _md=document.getElementById(id);
  if(!_md){console.error('showMd: elemento #'+id+' não encontrado');return;}
  _md.classList.add('on');
}