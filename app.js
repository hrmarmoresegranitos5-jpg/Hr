function initCFG(){
  var CFG_VER = 18;
  var storedVer = +localStorage.getItem('hr_cfg_ver') || 0;

  if(!CFG || storedVer < CFG_VER){
    if(!CFG){
      CFG={stones:JSON.parse(JSON.stringify(DEF_STONES)),coz:JSON.parse(JSON.stringify(DEF_COZ)),lav:JSON.parse(JSON.stringify(DEF_LAV)),ac:JSON.parse(JSON.stringify(DEF_ACESS)),emp:JSON.parse(JSON.stringify(DEF_EMP)),sv:JSON.parse(JSON.stringify(DEF_SV)),fixos:JSON.parse(JSON.stringify(DEF_FIXOS))};
    } else {
      // Refresh coz/lav catalog
      CFG.coz = JSON.parse(JSON.stringify(DEF_COZ));
      CFG.lav = JSON.parse(JSON.stringify(DEF_LAV));
      // ── Atualizar pedras: substituir verde_ub combinado pelas duas pedras separadas ──
      var hasUb = CFG.stones.find(function(s){return s.id==='verde_ub';});
      var hasPerla = CFG.stones.find(function(s){return s.id==='verde_perla';});
      if(hasUb && !hasPerla){
        // Atualiza nome e tx do verde_ub
        hasUb.nm = 'Verde Ubatuba';
        hasUb.tx = 'tx-verde-ub';
        hasUb.desc = 'Granito verde escuro com reflexos dourados. Extraído em Ubatuba-SP. Alta dureza e resistência. Muito valorizado em projetos de alto padrão.';
        // Insere Verde Pérola logo depois
        var ubIdx = CFG.stones.indexOf(hasUb);
        CFG.stones.splice(ubIdx+1, 0, {
          id:'verde_perla',nm:'Verde Pérola',cat:'Granito Verde',fin:'Polida',pr:340,
          tx:'tx-verde-perla',photo:'',
          desc:'Granito verde com tons pérola e reflexos prateados. Mais claro que o Verde Ubatuba, com movimento elegante. Polimento de alto brilho. Para quem quer um verde refinado e sofisticado.'
        });
      }
    }
    if(!CFG.sv['frontao_chf'])CFG.sv['frontao_chf']=DEF_SV['frontao_chf']||110;
    localStorage.setItem('hr_cfg_ver', CFG_VER);
  }
  // Sync SV labels/prices from svList if it exists
  // Patch v18: força preços novos no CFG existente
  var _p={s_reta:80,s_45:150,s_boleada:190,s_slim:56,frontao:102,frontao_chf:120,rodape:60,forn:50,fralo:50,cook:160,reb_n:200,reb_a:430,tubo:70,cant:115,inst:320,inst_c:500,desl_for:4.0};
  Object.keys(_p).forEach(function(k){CFG.sv[k]=_p[k];});
  var _pr={andorinha:320,verde_ub:340,verde_perla:340,bege:380,p_indiano:450,p_gabriel:500,p_gabriel_e:540,via_lactea:750,dallas:400,itaunas:510,nepal:540,prime:730,mrm_branco:300,siena:580,siena_e:620,parana:1490,nano:930,super_nano:980,perla:1640,carrara:1640,trav_classic:400,trav_noce:440};
  CFG.stones.forEach(function(s){if(_pr[s.id])s.pr=_pr[s.id];});
  syncSVDefsFromList();
  // Apply photos from CUBA_IMGS for any cuba without a custom photo
  CFG.coz.forEach(function(c){if(!c.photo&&CUBA_IMGS[c.id])c.photo=CUBA_IMGS[c.id];});
  CFG.lav.forEach(function(c){if(!c.photo&&CUBA_IMGS[c.id])c.photo=CUBA_IMGS[c.id];});
  // Always refresh photos in case CUBA_IMGS was updated (override old embedded photos)
  CFG.coz.forEach(function(c){if(CUBA_IMGS[c.id])c.photo=CUBA_IMGS[c.id];});
  CFG.lav.forEach(function(c){if(CUBA_IMGS[c.id])c.photo=CUBA_IMGS[c.id];});
  // Garantir que ac existe (usuários com cfg antiga)
  if(!CFG.ac)CFG.ac=JSON.parse(JSON.stringify(DEF_ACESS));
  svCFG();
}
function syncSVDefsFromList(){
  if(!CFG.svList)return;
  // Update CFG.sv prices and labels
  CFG.svList.forEach(function(sv){CFG.sv[sv.k]=sv.preco;});

  // Rebuild SV_DEFS from svList so new services appear in orçamento
  // Group svList items by grp
  var grpMap={};
  CFG.svList.forEach(function(sv){
    if(!grpMap[sv.grp])grpMap[sv.grp]=[];
    grpMap[sv.grp].push({k:sv.k,l:sv.l,u:sv.u||'un',fx:sv.fx||0});
  });

  // Map svList groups to SV_DEFS ambiente groups
  // All ambientes share the same svList groups
  var ambs=['Cozinha','Banheiro','Lavabo','Soleira','Peitoril','Escada','Fachada','Mesa/Tampo','Outro'];
  ambs.forEach(function(amb){
    var def=SV_DEFS[amb];
    if(!def)return;
    def.forEach(function(grp){
      // Update labels and add new items from svList for this group
      var svItems=grpMap[grp.g];
      if(!svItems)return;
      // Update existing items labels
      grp.its.forEach(function(it){
        var sv=CFG.svList.find(function(x){return x.k===it.k;});
        if(sv){it.l=sv.l;it.u=sv.u||it.u;}
      });
      // Add new items that are in svList but not in grp.its
      svItems.forEach(function(svIt){
        var exists=grp.its.find(function(it){return it.k===svIt.k;});
        if(!exists){grp.its.push({k:svIt.k,l:svIt.l,u:svIt.u||'un',fx:svIt.fx||0});}
      });
    });
  });
}

function svCFG(){localStorage.setItem('hr_cfg',JSON.stringify(CFG));if(SYNC.on)SYNC.push();}

// ═══ STATE ═══
var selMat=null,pendQ=null,fType='in',catF='Todos',cubaCat='coz',cfgTab=0,editTrId=null,editJobId=null,fileTarget=null,cbYcb=null,cbNcb=null;
// Ambientes: cada um tem id, tipo, pecas[], selCuba
var ambientes=[];
var _cubaPickKey=null;

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
  window.addEventListener('orientationchange',function(){
    // Android muda dimensões de forma assíncrona — tentar várias vezes até estabilizar
    var tries=0;
    var lastW=0,lastH=0;
    function tryLayout(){
      var W=window.innerWidth,H=window.innerHeight;
      setLayout();
      tries++;
      // Se dimensões mudaram ou ainda não estabilizaram, tentar de novo
      if(tries<10&&(W!==lastW||H!==lastH||W===H)){
        lastW=W;lastH=H;
        setTimeout(tryLayout,200);
      }
    }
    setTimeout(tryLayout,100);
  });
  setLayout();

  initCFG();
  selMat=CFG.stones[0].id;
  var now=new Date();
  document.getElementById('hdrDate').textContent=now.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
  document.getElementById('jStart').value=td();
  document.getElementById('fData').value=td();
  // Listeners
  document.addEventListener('click',dispatch);
  // oTipo is now per-ambiente, no global listener needed
  document.getElementById('diasIn').addEventListener('input',prevDias);
  document.getElementById('jDias').addEventListener('input',prevJobDias);
  document.getElementById('fileInp').addEventListener('change',onFile);
  document.querySelectorAll('.ov').forEach(function(o){o.addEventListener('click',function(e){if(e.target===o)closeAll();});});
  // Build
  buildMat();addAmbiente();buildCatalog();buildCubaList();buildAcList();renderAg();renderFin();updEmp();updUrgDot();renderFixos();renderInfoList();renderOrc();
  // Sync automático via Supabase — sem precisar configurar nada
  setTimeout(function(){SYNC.init();},1500);
  // Handle any tap that happened before DOMContentLoaded finished
  if(window._pendingPg!==null){var pp=window._pendingPg;window._pendingPg=null;openApp(pp);}
});

// ═══ SPLASH ═══
function openApp(pg){
  var splash=document.getElementById('sSplash');
  splash.classList.remove('on');
  splash.style.display='none';
  var a=document.getElementById('sApp');
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
  el=e.target.closest('[data-qa]');if(el){openFin(el.dataset.qa);return;}
  // Finance type selector in modal
  el=e.target.closest('[data-ftp]');if(el){setFT(el.dataset.ftp);return;}
  // Finance type in edit modal
  el=e.target.closest('[data-tet]');if(el){setTET(el.dataset.tet);return;}
  // Job actions
  el=e.target.closest('[data-togjob]');if(el){togJob(+el.dataset.togjob);return;}
  el=e.target.closest('[data-editjob]');if(el){editJob(+el.dataset.editjob);return;}
  el=e.target.closest('[data-pagrest]');if(el){pagRest(+el.dataset.pagrest);return;}
  el=e.target.closest('[data-deljob]');if(el){delJob(+el.dataset.deljob);return;}
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
  el=e.target.closest('#btnAI');if(el){document.getElementById('aiDesc').value='';document.getElementById('aiStatus').textContent='';document.getElementById('aiStatus').className='ai-status';document.getElementById('aiResultBox').style.display='none';document.getElementById('btnAIAplicar').style.display='none';showMd('aiMd');return;}
  el=e.target.closest('#btnAIEnviar');if(el){aiInterpretar();return;}
  el=e.target.closest('#btnAIAplicar');if(el){aiAplicar();return;}
  el=e.target.closest('#btnCalc');if(el){calcular();return;}
  el=e.target.closest('#btnCopy');if(el){copiar();return;}
  el=e.target.closest('#btnPDF');if(el){gerarPDF();return;}
  el=e.target.closest('#btnSaveAg');if(el){salvarAgenda();return;}
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
function showMd(id){closeAll();document.getElementById(id).classList.add('on');}

// ═══ PHOTO PICKER ═══
function pickPhoto(target,idx){fileTarget={t:target,i:idx};document.getElementById('fileInp').click();}
function onFile(e){
  var file=e.target.files[0];if(!file||!fileTarget)return;
  var r=new FileReader();
  r.onload=function(ev){
    // Resize image before saving to avoid localStorage overflow
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement('canvas');
      var maxW=500;
      var scale=Math.min(1,maxW/img.width);
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      var d=canvas.toDataURL('image/jpeg',0.78);
      var t=fileTarget.t,i=fileTarget.i;
      if(t==='stone')CFG.stones[i].photo=d;
      else if(t==='coz')CFG.coz[i].photo=d;
      else if(t==='lav')CFG.lav[i].photo=d;
      else if(t==='ac')CFG.ac[i].photo=d;
      svCFG();
      buildMat();buildCatalog();buildCubaList();buildCfg();
      toast('✓ Foto atualizada!');
    };
    img.src=ev.target.result;
  };
  r.readAsDataURL(file);
  e.target.value='';
}

