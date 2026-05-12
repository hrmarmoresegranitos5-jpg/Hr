// ══════════════════════════════════
// DADOS PADRÃO: DB, CFG, DEF_STONES, DEF_COZ, DEF_LAV
// ══════════════════════════════════

// ═══ DB ═══
var DB={
  q:JSON.parse(localStorage.getItem('hr_q')||'[]'),
  j:JSON.parse(localStorage.getItem('hr_j')||'[]'),
  t:JSON.parse(localStorage.getItem('hr_t')||'[]'),
  b:JSON.parse(localStorage.getItem('hr_b')||'[]'),
  sv:function(){localStorage.setItem('hr_q',JSON.stringify(this.q));localStorage.setItem('hr_j',JSON.stringify(this.j));localStorage.setItem('hr_t',JSON.stringify(this.t));localStorage.setItem('hr_b',JSON.stringify(this.b));if(SYNC.on)SYNC.push();}
};
var CFG=JSON.parse(localStorage.getItem('hr_cfg')||'null');

// ═══ SYNC (Firebase) ═══
var SYNC={
  db:null,
  code:localStorage.getItem('hr_sync_code')||'',
  on:false,
  _push:null,
  init:function(code){
    if(!code){this.code='';localStorage.removeItem('hr_sync_code');this.on=false;return;}
    // Firebase project — free Realtime DB
    var cfg={apiKey:"AIzaSyD_placeholder",databaseURL:"https://hr-marmores-default-rtdb.firebaseio.com"};
    try{
      if(typeof firebase==='undefined'){
        // Load Firebase on demand
        var fb1=document.createElement('script');
        fb1.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        fb1.onload=function(){
          var fb2=document.createElement('script');
          fb2.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
          fb2.onload=function(){SYNC.init(SYNC.code);};
          document.head.appendChild(fb2);
        };
        document.head.appendChild(fb1);
        toast('Carregando sincronização...');
        return;
      }
      if(!firebase.apps.length)firebase.initializeApp(cfg);
      else firebase.app();
      this.db=firebase.database();
      this.code=code;
      localStorage.setItem('hr_sync_code',code);
      this.on=true;
      this._listen();
      toast('✓ Sincronização ativa — código: '+code);
    }catch(e){toast('Sync: configure o Firebase (ver instruções)');}
  },
  _listen:function(){
    if(!this.db||!this.code)return;
    var self=this;
    this.db.ref('hr/'+this.code).on('value',function(snap){
      var d=snap.val();
      if(!d||!d._ts)return;
      var localTs=+localStorage.getItem('hr_sync_ts')||0;
      if(d._ts>localTs+2000){
        // Remote is newer — pull
        if(d.cfg){CFG=d.cfg;localStorage.setItem('hr_cfg',JSON.stringify(CFG));}
        if(d.q)DB.q=d.q;
        if(d.j)DB.j=d.j;
        if(d.t)DB.t=d.t;
        if(d.b)DB.b=d.b;
        DB.sv();
        localStorage.setItem('hr_sync_ts',d._ts);
        buildMat();buildSV();buildCatalog();buildCubaList();renderAg();renderFin();updEmp();
        toast('↓ Dados sincronizados!');
      }
    });
  },
  push:function(){
    if(!this.db||!this.code)return;
    var ts=Date.now();
    localStorage.setItem('hr_sync_ts',ts);
    this.db.ref('hr/'+this.code).set({cfg:CFG,q:DB.q,j:DB.j,t:DB.t,b:DB.b,_ts:ts});
  },
  stop:function(){
    if(this.db&&this.code)this.db.ref('hr/'+this.code).off();
    this.on=false;this.code='';
    localStorage.removeItem('hr_sync_code');
    localStorage.removeItem('hr_sync_ts');
    toast('Sincronização desativada');
  }
};

// ═══ DEFAULTS ═══
var DEF_STONES=[
  {id:'andorinha',nm:'Cinza Andorinha/Corumbá',cat:'Granito Cinza',fin:'Polida',pr:320,tx:'tx-andorinha',photo:'',desc:'Granito nacional cinza com cristais brancos. Alta dureza e resistência — não risca, não mancha com facilidade e suporta calor. Excelente custo-benefício para cozinhas e bancadas de uso intenso.'},
  {id:'verde_ub',nm:'Verde Ubatuba',cat:'Granito Verde',fin:'Polida',pr:340,tx:'tx-verde-ub',photo:'',desc:'Granito verde escuro extraído em Ubatuba-SP. Pontos dourados naturais criam efeito exclusivo em cada chapa. Muito resistente e durável — perfeito para projetos sofisticados que exigem personalidade.'},
  {id:'verde_perla',nm:'Verde Pérola',cat:'Granito Verde',fin:'Polida',pr:340,tx:'tx-verde-perla',photo:'',desc:'Granito verde com tons pérola e reflexos prateados. Mais claro que o Verde Ubatuba, com movimento elegante. Polimento de alto brilho. Para quem quer um verde refinado e sofisticado.'},
  {id:'bege',nm:'Bege Bahia',cat:'Travertino',fin:'Polida',pr:380,tx:'tx-bege',photo:'',desc:'Travertino bege natural com veios suaves e calorosos. Combina com ambientes rústicos, móveis amadeirados e cerâmicas neutras. Muito usado em bancadas e pisos que valorizam o estilo natural.'},
  {id:'p_indiano',nm:'Preto Indiano',cat:'Granito Preto',fin:'Polida',pr:450,tx:'tx-p-indiano',photo:'',desc:'Granito importado da Índia. Preto absoluto e uniforme com polimento espelhado de altíssima qualidade — reflete como espelho. Um dos granitos mais sofisticados do mercado para cozinhas de alto padrão.'},
  {id:'p_gabriel',nm:'Preto São Gabriel',cat:'Granito Preto',fin:'Polida',pr:500,tx:'tx-sao-gabriel',photo:'',desc:'Granito brasileiro de São Gabriel-RS. Preto profundo com micropigmentos brancos e prateados que criam efeito galáctico único. Considerado um dos granitos nacionais mais nobres — cada chapa tem movimento próprio.'},
  {id:'p_gabriel_e',nm:'Preto São Gabriel Escovado',cat:'Granito Preto',fin:'Escovada',pr:540,tx:'tx-p-indiano',photo:'',desc:'Preto São Gabriel com acabamento escovado. Superfície aveludada e fosca esconde riscos e marcas do uso diário. Visual contemporâneo muito usado em projetos de design moderno.'},
  {id:'via_lactea',nm:'Preto Via Láctea',cat:'Granito Preto',fin:'Polida',pr:750,tx:'tx-via-lactea',photo:'',desc:'Granito preto com constelações de cristais brancos e cinza — imita a Via Láctea. Material exótico e exclusivo: cada chapa tem padrão único e irrepetível. Destaque absoluto em qualquer ambiente.'},
  {id:'dallas',nm:'Branco Dallas/Fortaleza',cat:'Granito Branco',fin:'Polida',pr:400,tx:'tx-dallas',photo:'',desc:'Granito branco nacional com movimento suave em tons cinza e creme. Amplifica a luminosidade do ambiente. Ótimo custo-benefício para quem quer o clássico branco com alta durabilidade e sem selagem.'},
  {id:'itaunas',nm:'Branco Itaúnas',cat:'Granito Branco',fin:'Polida',pr:510,tx:'tx-itaunas',photo:'',desc:'Granito branco premium do Espírito Santo. Veios delicados em dourado e cinza criam movimento elegante. Mais sofisticado que o Dallas — ideal para projetos que querem branco com personalidade.'},
  {id:'nepal',nm:'Branco Nepal',cat:'Granito Branco',fin:'Polida',pr:540,tx:'tx-nepal',photo:'',desc:'Granito branco com veios em creme e bege quente. Diferente dos brancos frios, tem calor natural que harmoniza com madeiras e cerâmicas claras. Atemporal e muito valorizado em residências de alto padrão.'},
  {id:'prime',nm:'Branco Prime',cat:'Granito Branco',fin:'Polida',pr:730,tx:'tx-prime',photo:'',desc:'Granito branco de altíssimo padrão com veios dourados naturais. Polimento espelhado intenso e movimento dramático. Para projetos que exigem o máximo em sofisticação — um dos mais valorizados do mercado nacional.'},
  {id:'mrm_branco',nm:'Mármore Branco Comercial',cat:'Mármore',fin:'Polida',pr:300,tx:'tx-mrm-branco',photo:'',desc:'Mármore calcítico clássico — branco com veios cinza naturais. Material poroso que exige selagem periódica. Pela beleza única dos veios naturais, é muito utilizado em banheiros, lavabos e projetos decorativos de luxo.'},
  {id:'siena',nm:'Branco Siena',cat:'Granito Branco',fin:'Polida',pr:580,tx:'tx-siena',photo:'',desc:'Granito branco com veios dourados e bege marcantes. Alta resistência e durabilidade. Polimento espelhado intenso. Uma das pedras mais elegantes do mercado — não requer selagem como o mármore.'},
  {id:'siena_e',nm:'Branco Siena Escovado',cat:'Granito Branco',fin:'Escovada',pr:620,tx:'tx-siena',photo:'',desc:'Branco Siena com acabamento escovado. Textura aveludada e contemporânea esconde riscos e marcas de uso diário. Excelente para famílias com uso intenso da cozinha.'},
  {id:'parana',nm:'Branco Paraná',cat:'Mármore',fin:'Polida',pr:1490,tx:'tx-parana',photo:'',desc:'Mármore Branco Paraná — um dos materiais mais exclusivos disponíveis. Fundo branco puro com veios dramáticos em cinza e dourado. Cada chapa é única e irrepetível. Exige cuidados especiais, mas entrega altíssimo luxo.'},
  {id:'nano',nm:'Branco Nano',cat:'Ultra Compacto',fin:'Polida',pr:930,tx:'tx-nano',photo:'',desc:'Superfície ultra compacta de última geração produzida com alta pressão e temperatura. Zero porosidade — não absorve líquidos, não mancha, não risca. Resistente a ácidos, calor e impacto. Ideal para cozinhas de uso intenso.'},
  {id:'super_nano',nm:'Branco Super Nano',cat:'Ultra Compacto',fin:'Polida',pr:980,tx:'tx-nano',photo:'',desc:'Versão premium do Branco Nano com dureza máxima. Praticamente impossível de riscar. Ideal para cozinhas profissionais e famílias com alto uso diário. Sem necessidade de qualquer manutenção ou selagem.'},
  {id:'perla',nm:'Perla Santana',cat:'Quartzito',fin:'Polida',pr:1640,tx:'tx-perla',photo:'',desc:'Quartzito natural do Ceará com textura cristalina única. Visual próximo ao mármore de luxo com veios suaves — porém com dureza e resistência superiores ao próprio granito. Baixíssima porosidade natural. Alta exclusividade.'},
  {id:'carrara',nm:'Ultra Compacto Carrara',cat:'Ultra Compacto',fin:'Polida',pr:1640,tx:'tx-carrara',photo:'',desc:'Superfície ultra compacta inspirada no Mármore Carrara italiano. Fundo branco com veios cinza delicados, produzida com tecnologia europeia. Zero porosidade absoluta — nunca mancha, nunca risca, nunca precisa de selagem. A beleza do mármore com a resistência superior.'},
  {id:'trav_classic',nm:'Travertino Clássico',cat:'Travertino',fin:'Polida',pr:400,tx:'tx-bege',photo:'',desc:'Travertino clássico em tons bege e marrom quente. Pedra sedimentar com poros naturais que dão textura e identidade única. Muito usado em fachadas, pisos externos, revestimentos e bancadas rústicas. Ideal para ambientes naturais.'},
  {id:'trav_noce',nm:'Travertino Noce',cat:'Travertino',fin:'Polida',pr:440,tx:'tx-bege',photo:'',desc:'Travertino Noce em tons tabaco escuro e marrom profundo. Mais escuro que o Clássico, com poros que realçam os veios naturais. Muito usado em fachadas comerciais, pisos de grande formato e ambientes de alto padrão que buscam personalidade rústica.'}
];
var DEF_COZ=[
  {id:'tramontina_prime',nm:'Tramontina Inox Prime',brand:'Tramontina',dim:'56×34×17cm',custo:313,pr:345,inst:110,instCli:160,photo:''},
  {id:'meganox_gourmet',nm:'Gourmet c/ Tábua',brand:'Meganox',dim:'60×42cm',custo:310,pr:341,inst:110,instCli:160,photo:''},
  {id:'premium_304_6040',nm:'Quadrada Inox 304 Premium',brand:'Premium 304',dim:'60×40cm',custo:648,pr:713,inst:110,instCli:160,photo:''},
  {id:'brinovar_5040',nm:'Gourmet 304 Escovado',brand:'Brinovar',dim:'50×40×20cm',custo:342,pr:376,inst:110,instCli:160,photo:''},
  {id:'meranox_padrao',nm:'Inox Padrão',brand:'Meranox',dim:'60×40cm',custo:0,pr:0,inst:110,instCli:160,photo:''},
  {id:'escorredor_inox',nm:'Inox c/ Escorredor',brand:'Premium',dim:'60×40cm',custo:0,pr:0,inst:110,instCli:160,photo:''}
];
var DEF_LAV=[
  {id:'icasa_red',nm:'Redonda 30cm',brand:'Icasa',dim:'30cm',tipo:'Louça',custo:176,pr:194,inst:220,instCli:280,photo:''},
  {id:'beltempo_oval',nm:'Oval Sobrepor',brand:'Beltempo',dim:'43×25cm',tipo:'Sobrepor',custo:158,pr:174,inst:220,instCli:280,photo:''},
  {id:'lorenz_oval_emb',nm:'Oval Embutir',brand:'Lorenzetti',dim:'40cm',tipo:'Louça',custo:130,pr:143,inst:220,instCli:280,photo:''},
  {id:'docol_red_emb',nm:'Redonda Embutir',brand:'Docol',dim:'39×14cm',tipo:'Louça',custo:100,pr:110,inst:220,instCli:280,photo:''},
  {id:'deca_quad_emb',nm:'Quadrada Embutir',brand:'Deca',dim:'30×30cm',tipo:'Louça',custo:400,pr:440,inst:220,instCli:280,photo:''},
  {id:'esc_sim',nm:'Esculpida Simples',brand:'HR',dim:'Na pedra',tipo:'Esculpida',custo:0,pr:0,inst:320,instCli:0,photo:''},
  {id:'esc_com',nm:'Esculpida Complexa',brand:'HR',dim:'Na pedra',tipo:'Esculpida',custo:0,pr:0,inst:450,instCli:0,photo:''},
  {id:'esc_mxc',nm:'Esculpida Muito Complexa',brand:'HR',dim:'Na pedra',tipo:'Esculpida',custo:0,pr:0,inst:800,instCli:0,photo:''}
];
var DEF_EMP={nome:'HR Mármores e Granitos',cnpj:'64.639.182/0001-28',tel:'(74) 99148-4460',end:'Av. Dep. Rodolfo Queiroz, 653 — Centro',cidade:'Pilão Arcado — BA',ig:'@HR Marmores e Granitos',email:'giliardhangel18@gmail.com',banco:'SICOOB Credirochas',apiKey:'sk-proj-THoSk6E4FD5xr_hiULkKdm-55HiWZ3801a70ENAE7Iuyx3zNMPvpk3X25Ju38FmUC6e0KRm-SaT3BlbkFJiviiJg9kCsFP0-y6eXLg7CrnzLxHJpvr-exR6ElniDwum48jPHuRHwZX7yrxxp7oJ3_wgvQMA',logoUrl:'data:image/jpeg;base64,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'};
var DEF_ACESS=[
  {id:'disp_det',nm:'Dispenser de Detergente',marca:'',dim:'Embutir na bancada',pr:0,desc:'Dispenser embutido para detergente, instalado no tampo da bancada.',photo:''},
  {id:'calha_umida',nm:'Calha Úmida',marca:'',dim:'Sob medida',pr:0,desc:'Calha escavada na pedra para escorrer água. Integrada ao tampo.',photo:''},
  {id:'escorredor',nm:'Escorredor de Louça',marca:'',dim:'Embutir',pr:0,desc:'Escorredor em inox ou pedra esculpida integrado à bancada.',photo:''}
];
var DEF_SV={s_reta:80,s_45:150,s_boleada:190,s_slim:56,frontao:102,frontao_chf:120,rodape:60,sol1:38,sol2:65,peit_reto:45,peit_ping:78,peit_col:132,peit_portal:200,forn:50,fralo:50,cook:160,reb_n:200,reb_a:430,tubo:70,cant:115,inst:320,inst_c:500,desl_for:4.0,
tum_tampa:0,tum_lat:0,tum_front:0,tum_base:0,tum_det:85,tum_sainha:80,tum_mol:120,tum_ping:80,tum_gav1:0,tum_gav2:0,tum_gav3:0,tum_lapide:350,tum_plaq:180,tum_foto:220,tum_cruz:280,tum_rec:90,tum_pol:150,tum_bisel:65,tum_fund:0,tum_lev:0,tum_reb:0,tum_conc:0,tum_cpiso:0,tum_acob:0,tum_cim:0,tum_cola:0,tum_rej:0,tum_ferro:0,tum_tijolo:0,tum_frete:0,tum_mont:450,tum_montc:750,
  ac_sifao:45,ac_flex:25,ac_veda:15,ac_sil:20,ac_paraf:30,ac_bucha:20,ac_sup:60,ac_outros:0,
  bp_boleada:25,bp_antiderap:18,bp_pingad:30,bp_mcana:35,bp_chanfro:20,
  bp_c_arred:45,bp_c_curva:80,bp_c_infinita:120};
var DEF_FIXOS=[{n:'Aluguel',v:1000},{n:'Funcionários',v:5500},{n:'Energia',v:150},{n:'Água',v:40},{n:'Internet',v:100},{n:'Alimentação',v:200},{n:'Limpeza',v:200}];

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
    // Túmulo keys — garantir que todas existam no CFG atual
    ['tum_tampa','tum_lat','tum_front','tum_base','tum_det','tum_sainha','tum_mol','tum_ping','tum_gav1','tum_gav2','tum_gav3','tum_lapide','tum_plaq','tum_foto','tum_cruz','tum_rec','tum_pol','tum_bisel','tum_fund','tum_lev','tum_reb','tum_conc','tum_cpiso','tum_acob','tum_cim','tum_cola','tum_rej','tum_ferro','tum_tijolo','tum_frete','tum_mont','tum_montc'].forEach(function(k){if(CFG.sv[k]===undefined)CFG.sv[k]=DEF_SV[k]||0;});
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