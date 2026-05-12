// ══════════════════════════════════
// CATÁLOGO PEDRAS, CATÁLOGO CUBAS
// ══════════════════════════════════

// ═══ CATÁLOGO PEDRAS ═══
function buildCatalog(){
  var cats=['Todos','Granito Cinza','Granito Preto','Granito Branco','Granito Verde','Mármore','Travertino','Quartzito','Ultra Compacto'];
  document.getElementById('fbar').innerHTML=cats.map(function(c){
    return '<div class="fb '+(c===catF?'on':'')+'" data-catf="'+c+'">'+c+'</div>';
  }).join('');
  buildCatGrid();
}

function buildCatGrid(){
  var GRUPOS=[
    {cat:'Granito Cinza', icon:'🩶', desc:'Alta dureza, resistente a manchas e calor. Ideal para cozinhas e bancadas de uso intenso.'},
    {cat:'Granito Preto', icon:'🖤', desc:'Elegância e sofisticação. Polimento espelhado intenso, muito valorizado em projetos de alto padrão.'},
    {cat:'Granito Branco', icon:'🤍', desc:'Amplifica a luminosidade. Combina com qualquer estilo de decoração.'},
    {cat:'Granito Verde', icon:'💚', desc:'Tons únicos com reflexos metálicos naturais. Alta durabilidade para projetos exclusivos.'},
    {cat:'Mármore', icon:'🌿', desc:'Clássico e atemporal. Veios naturais únicos em cada chapa. Exige selagem periódica.'},
    {cat:'Travertino', icon:'🟤', desc:'Pedra sedimentar com poros naturais. Tom bege-terroso, rústico e elegante.'},
    {cat:'Quartzito', icon:'💎', desc:'Resistência superior ao granito com beleza do mármore. Baixa porosidade natural.'},
    {cat:'Ultra Compacto', icon:'⚡', desc:'Zero porosidade — não risca, não mancha, não exige selagem. O mais resistente disponível.'}
  ];

  var stones = catF==='Todos' ? CFG.stones : CFG.stones.filter(function(s){return s.cat===catF;});
  var catGrid = document.getElementById('catGrid');
  catGrid.style.cssText = 'padding:0 0 16px;';
  var h = '';

  function cardHtml(s){
    var img = s.photo ? '<img class="csw-bg" src="'+s.photo+'" alt="">' : '';
    // Short description: first sentence only, max 60 chars
    var shortDesc = s.desc ? s.desc.split('.')[0].trim() : '';
    if(shortDesc.length > 58) shortDesc = shortDesc.substring(0,58)+'…';
    return '<div class="ccard" data-stone="'+s.id+'">'
      +'<div class="csw '+(s.photo?'':s.tx)+'">'+img+'<div class="cshine"></div></div>'
      +'<div class="cbody">'
        +'<div class="cnm">'+s.nm+'</div>'
        +(shortDesc?'<div class="cdes">'+shortDesc+'</div>':'')
        +'<div class="cprc"><span class="cprice">R$ '+s.pr.toLocaleString('pt-BR')+'</span><span class="cunit">/m²</span></div>'
      +'</div>'
    +'</div>';
  }

  if(catF==='Todos'){
    GRUPOS.forEach(function(grp){
      var itens = stones.filter(function(s){return s.cat===grp.cat;});
      if(!itens.length) return;
      // Group header — full width block
      h += '<div class="cat-grp-hdr">'
        + '<span class="cat-grp-icon">'+grp.icon+'</span>'
        + '<span class="cat-grp-nm">'+grp.cat+'</span>'
        + '</div>';
      h += '<p class="cat-grp-desc">'+grp.desc+'</p>';
      // Card grid
      h += '<div class="cgrid cat-cards">';
      itens.forEach(function(s){ h += cardHtml(s); });
      h += '</div>';
      h += '<div class="cat-divider"></div>';
    });
  } else {
    var grp = GRUPOS.find(function(g){return g.cat===catF;}) || {icon:'🪨',desc:''};
    h += '<div class="cat-grp-hdr"><span class="cat-grp-icon">'+grp.icon+'</span><span class="cat-grp-nm">'+catF+'</span></div>';
    h += '<p class="cat-grp-desc">'+grp.desc+'</p>';
    h += '<div class="cgrid cat-cards">';
    stones.forEach(function(s){ h += cardHtml(s); });
    h += '</div>';
  }

  catGrid.innerHTML = h;
}

function openStone(id){
  var s=CFG.stones.find(function(x){return x.id===id;});if(!s)return;
  var bg=s.photo?'<img src="'+s.photo+'" style="width:100%;height:140px;object-fit:cover;border-radius:12px;margin-bottom:13px;" alt="">':'<div class="'+s.tx+'" style="width:100%;height:140px;border-radius:12px;margin-bottom:13px;position:relative;overflow:hidden;"><div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.12),transparent 50%);"></div></div>';
  document.getElementById('stoneMdC').innerHTML=bg+'<div style="font-family:Cormorant Garamond,serif;font-size:1.3rem;font-weight:700;margin-bottom:3px;">'+s.nm+'</div><div style="font-size:.62rem;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-bottom:7px;">'+s.cat+' · '+s.fin+'</div><div style="font-size:.82rem;color:var(--t2);line-height:1.65;margin-bottom:11px;">'+s.desc+'</div><div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:10px;padding:11px 14px;display:flex;justify-content:space-between;align-items:baseline;"><span style="font-size:.78rem;color:var(--gold3);">Preço</span><span style="font-family:Cormorant Garamond,serif;font-size:1.4rem;font-weight:700;color:var(--gold2);">R$ '+s.pr.toLocaleString('pt-BR')+'<span style="font-size:.7rem;color:var(--t3);">/m²</span></span></div>';
  showMd('stoneMd');
}

// ═══ CATÁLOGO CUBAS ═══
function buildCubaList(){
  var lista=cubaCat==='coz'?CFG.coz:CFG.lav;
  var cols=window.innerWidth>=900?3:window.innerWidth>=700?3:2;
  var h='';
  var grupos={};
  lista.forEach(function(c){var g=c.tipo||'HR';if(!grupos[g])grupos[g]=[];grupos[g].push(c);});
  var ordemCoz=['HR'];
  var ordemLav=['Louça','Sobrepor','Esculpida'];
  var ordem=cubaCat==='coz'?ordemCoz:ordemLav;
  var instCli=cubaCat==='coz'?160:280;
  ordem.forEach(function(gname){
    var items=grupos[gname];if(!items||!items.length)return;
    var isEsc=gname==='Esculpida';
    if(isEsc){
      h+='<div style="font-size:.57rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:14px 0 9px;">Cubas Esculpidas na Pedra</div>';
      h+='<div style="background:var(--s3);border:1px solid var(--bd2);border-radius:11px;padding:13px 14px;margin-bottom:10px;">';
      h+='<div style="font-size:.7rem;color:var(--t2);line-height:1.6;margin-bottom:10px;">Cuba escavada direto na pedra. Informe as dimensões para calcular o preço.</div>';
      h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
      h+='<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Comprimento (cm)</div><input type="number" id="escW" placeholder="50" min="20" onclick="event.stopPropagation()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:8px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;"></div>';
      h+='<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Largura (cm)</div><input type="number" id="escH" placeholder="40" min="20" onclick="event.stopPropagation()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:8px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;"></div>';
      h+='<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Profundidade (cm)</div><input type="number" id="escD" placeholder="20" min="10" onclick="event.stopPropagation()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:8px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;"></div>';
      h+='</div>';
      h+='<div style="font-size:.68rem;color:var(--t3);margin-bottom:10px;">O preço inclui mão de obra de escavação + pedra removida (fundo e paredes da cuba).</div>';
      items.forEach(function(esc){
        h+='<button onclick="pickEsculpida(\''+esc.id+'\')" style="width:100%;background:var(--gdim);border:1px solid var(--gold3);border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-family:Outfit,sans-serif;">';
        h+='<div style="text-align:left;"><div style="font-size:.82rem;font-weight:700;color:var(--tx);">'+esc.nm+'</div><div style="font-size:.65rem;color:var(--t3);margin-top:2px;">M.O. base: R$ '+esc.inst+'</div></div>';
        h+='<div style="font-size:.72rem;color:var(--gold2);font-weight:700;">Selecionar →</div>';
        h+='</button>';
      });
      h+='</div>';
      return;
    }
    h+='<div style="font-size:.57rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:14px 0 9px;">'+(cubaCat==='coz'?'Cubas Inox HR':'Cubas '+gname)+'</div>';
    var cols=window.innerWidth>=900?4:window.innerWidth>=700?3:2;
    h+='<div style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:10px;margin-bottom:4px;">';
    items.filter(function(c){return c.pr>0;}).forEach(function(c){
      var imgH=c.photo?('<img src="'+c.photo+'" alt="'+c.nm+'" onclick="abrirCubaFs(\''+c.id+'\',\''+cubaCat+'\')" style="cursor:zoom-in;">'):'<div style="font-size:2rem;color:var(--t3);">🚰</div>';
      h+='<div class="cubacard"><div class="ccimg">'+imgH+'</div><div class="ccbody">'
        +'<div class="ccbrand">'+c.brand+'</div>'
        +'<div class="ccnm">'+c.nm+'</div>'
        +'<div class="ccdim">'+c.dim+'</div>'
        +'<div style="margin-top:9px;background:var(--gdim);border:1px solid var(--gold3);border-radius:9px;padding:10px 13px;display:flex;justify-content:space-between;align-items:baseline;">'
        +'<span style="font-size:.62rem;color:var(--gold3);letter-spacing:1px;text-transform:uppercase;">Preço</span>'
        +'<span style="font-family:\'Cormorant Garamond\',serif;font-size:1.35rem;font-weight:700;color:var(--gold2);">R$ '+c.pr.toLocaleString('pt-BR')+'</span>'
        +'</div>'
        +'</div></div>';
    });
  });
    h+='</div>';
  // Buttons
  h+='<div style="display:flex;gap:8px;margin-top:12px;">'
   +'<button onclick="gerarCatalogoPDF()" style="flex:1;padding:12px;border-radius:11px;border:none;background:linear-gradient(135deg,#1a0a00,#2a1200);border:1px solid var(--gold3);color:var(--gold2);font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;"><span>📄</span> Gerar Catálogo PDF</button>'
   +'<button onclick="compartilharCatalogoCubas()" style="flex:1;padding:12px;border-radius:11px;border:none;background:#0a1f0f;border:1px solid #1a4a2a;color:#4ade80;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;"><span>📤</span> WhatsApp</button>'
   +'</div>';
  h+='</div>';
  var clw=document.getElementById('cubaListWrap');if(clw)clw.innerHTML=h;
}

// ═══ ACESSÓRIOS ═══
function buildAcList(){
  var cols=window.innerWidth>=900?3:window.innerWidth>=700?3:2;
  var h='';
  var ac=CFG.ac||[];
  if(!ac.length){
    h+='<div style="text-align:center;padding:50px 20px;color:var(--t3);">'
     +'<div style="font-size:2.5rem;margin-bottom:10px;">🔩</div>'
     +'<div style="font-size:.85rem;font-weight:600;margin-bottom:6px;">Nenhum acessório cadastrado</div>'
     +'<div style="font-size:.75rem;">Vá em Config → Acessórios para adicionar</div>'
     +'</div>';
  } else {
    ac.forEach(function(a,i){
      var imgH=a.photo
        ?'<img src="'+a.photo+'" alt="'+a.nm+'" onclick="abrirAcFs('+i+')" style="cursor:zoom-in;width:100%;height:100%;object-fit:cover;display:block;">'
        :'<div style="font-size:2.5rem;color:var(--t3);display:flex;align-items:center;justify-content:center;height:100%;">🔩</div>';
      h+='<div class="cubacard">'
        +'<div class="ccimg">'+imgH+'</div>'
        +'<div class="ccbody">'
          +(a.marca?'<div class="ccbrand">'+a.marca+'</div>':'')
          +'<div class="ccnm">'+a.nm+'</div>'
          +(a.dim?'<div class="ccdim">'+a.dim+'</div>':'')
          +(a.desc?'<div style="font-size:.72rem;color:var(--t3);line-height:1.55;margin-bottom:10px;">'+a.desc+'</div>':'')
          +(a.pr>0
            ?'<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:9px;padding:10px 13px;display:flex;justify-content:space-between;align-items:baseline;">'
              +'<span style="font-size:.62rem;color:var(--gold3);letter-spacing:1px;text-transform:uppercase;">Preço</span>'
              +'<span style="font-family:\'Cormorant Garamond\',serif;font-size:1.35rem;font-weight:700;color:var(--gold2);">R$ '+a.pr.toLocaleString('pt-BR')+'</span>'
             +'</div>'
            :'<div style="background:var(--s3);border-radius:9px;padding:9px 13px;font-size:.78rem;color:var(--t3);">Preço a consultar</div>')
        +'</div></div>';
    });
  }
  // Botões
  h+='<div style="display:flex;gap:8px;margin-top:12px;">'
   +'<button onclick="gerarCatalogoAcPDF()" style="flex:1;padding:12px;border-radius:11px;border:none;background:linear-gradient(135deg,#1a0a00,#2a1200);border:1px solid var(--gold3);color:var(--gold2);font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;"><span>📄</span> Gerar PDF</button>'
   +'<button onclick="go(6);setTimeout(function(){cfgTab=6;document.querySelectorAll(\'.cfgtab\').forEach(function(t){t.classList.toggle(\'on\',t.dataset.cftab===\'6\');});buildCfg();},100);" style="flex:1;padding:12px;border-radius:11px;border:1px solid var(--bd2);background:transparent;color:var(--t2);font-family:Outfit,sans-serif;font-size:.82rem;cursor:pointer;">⚙️ Gerenciar</button>'
   +'</div>';
  h+='</div>';
  var el=document.getElementById('acListWrap');
  if(el)el.innerHTML=h;
}

function abrirAcFs(i){
  var a=(CFG.ac||[])[i];
  if(!a||!a.photo)return;
  var _img=document.getElementById('cubaFsImg');
  var _nm=document.getElementById('cubaFsNm');
  var _dim=document.getElementById('cubaFsDim');
  var _pr=document.getElementById('cubaFsPr');
  var _md=document.getElementById('cubaFsMd');
  if(!_img||!_nm||!_dim||!_pr||!_md){console.error('abrirAcFs: elemento do modal não encontrado');return;}
  _img.src=a.photo;
  _nm.textContent=a.nm;
  _dim.textContent=(a.marca?a.marca+' · ':'')+a.dim;
  _pr.textContent=a.pr>0?'R$ '+a.pr.toLocaleString('pt-BR'):'';
  _md.classList.add('on');
}

function gerarCatalogoAcPDF(){
  var ac=CFG.ac||[];
  if(!ac.length){toast('Nenhum acessório cadastrado');return;}
  var emp=CFG.emp;
  function card(a){
    var foto=a.photo
      ?'<img src="'+a.photo+'" style="width:100%;height:180px;object-fit:cover;display:block;background:#f5f5f5;">'
      :'<div style="width:100%;height:180px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:3rem;">🔩</div>';
    return '<div style="break-inside:avoid;background:#fff;border:1px solid #e0d8cc;border-radius:12px;overflow:hidden;margin-bottom:16px;">'
      +foto
      +'<div style="padding:14px 16px;">'
        +(a.marca?'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#b08040;font-weight:700;margin-bottom:3px;">'+a.marca+'</div>':'')
        +'<div style="font-size:16px;font-weight:900;color:#1a1a1a;margin-bottom:2px;">'+a.nm+'</div>'
        +(a.dim?'<div style="font-size:11px;color:#888;margin-bottom:8px;">'+a.dim+'</div>':'')
        +(a.desc?'<div style="font-size:11px;color:#666;line-height:1.5;margin-bottom:10px;">'+a.desc+'</div>':'')
        +(a.pr>0
          ?'<div style="background:#faf5ea;border:1px solid #e8d89c;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">'
            +'<span style="font-size:10px;color:#8b6014;font-weight:700;text-transform:uppercase;">Preço</span>'
            +'<span style="font-size:20px;font-weight:900;color:#8b6014;">R$ '+a.pr.toLocaleString('pt-BR')+'</span>'
           +'</div>'
          :'<div style="background:#f5f5f5;border-radius:8px;padding:9px 14px;font-size:11px;color:#999;">Preço a consultar</div>')
      +'</div></div>';
  }
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>'
    +'*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
    +'body{font-family:Arial,Helvetica,sans-serif;background:#fff;}'
    +'.page{max-width:800px;margin:0 auto;}'
    +'.hdr{background:#0f0c00;padding:28px 36px;display:flex;justify-content:space-between;align-items:center;}'
    +'.brand{font-size:24px;font-weight:900;color:#C9A84C;}'
    +'.tag{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.4);margin-top:4px;}'
    +'.hdr-r{text-align:right;}'
    +'.hdr-tel{font-size:13px;font-weight:700;color:#C9A84C;}'
    +'.hdr-city{font-size:10px;color:rgba(255,255,255,.3);margin-top:3px;}'
    +'.tbar{background:#f7f2e8;border-bottom:3px solid #C9A84C;padding:14px 36px;}'
    +'.tbar-title{font-size:18px;font-weight:900;color:#5a3a06;}'
    +'.tbar-sub{font-size:10px;color:#999;margin-top:2px;}'
    +'.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:24px 36px;}'
    +'.foot{background:#0f0c00;padding:16px 36px;display:flex;justify-content:space-between;}'
    +'.foot-l{font-size:10px;color:rgba(201,168,76,.45);}'
    +'.foot-r{font-size:10px;color:rgba(255,255,255,.2);text-align:right;}'
    +'</style></head><body><div class="page">'
    +'<div class="hdr"><div><div class="brand">'+emp.nome+'</div><div class="tag">Mármores · Granitos · Acessórios</div></div>'
    +'<div class="hdr-r"><div class="hdr-tel">'+emp.tel+'</div><div class="hdr-city">'+emp.cidade+'</div></div></div>'
    +'<div class="tbar"><div class="tbar-title">🔩 Catálogo de Acessórios</div><div class="tbar-sub">Produtos disponíveis para bancadas</div></div>'
    +'<div class="grid">'+ac.map(card).join('')+'</div>'
    +'<div class="foot"><div class="foot-l">CNPJ: '+emp.cnpj+' · '+emp.ig+'</div><div class="foot-r">'+emp.end+'</div></div>'
    +'</div><script>window.onload=function(){setTimeout(function(){window.print();},400);}<\/script></body></html>';
  var w=window.open('','_blank','width=900,height=700');
  if(w){w.document.write(html);w.document.close();toast('📄 Catálogo aberto — Imprimir → Salvar como PDF');}
  else{var b=new Blob([html],{type:'text/html'});var u=URL.createObjectURL(b);var a2=document.createElement('a');a2.href=u;a2.download='Catalogo_Acessorios_HR.html';a2.click();setTimeout(function(){URL.revokeObjectURL(u);},5000);}
}

// ═══ CUBA FULLSCREEN ═══
function abrirCubaFs(id, tipo){
  var lista=tipo==='coz'?CFG.coz:CFG.lav;
  var c=lista.find(function(x){return x.id===id;});
  if(!c||!c.photo)return;
  var _img=document.getElementById('cubaFsImg');
  var _nm=document.getElementById('cubaFsNm');
  var _dim=document.getElementById('cubaFsDim');
  var _pr=document.getElementById('cubaFsPr');
  var _md=document.getElementById('cubaFsMd');
  if(!_img||!_nm||!_dim||!_pr||!_md){console.error('abrirCubaFs: elemento do modal não encontrado');return;}
  _img.src=c.photo;
  _nm.textContent=c.nm;
  _dim.textContent=(c.brand?c.brand+' · ':'')+c.dim;
  _pr.textContent=c.pr>0?'R$ '+c.pr.toLocaleString('pt-BR'):'';
  _md.classList.add('on');
}

// ═══ GERAR CATÁLOGO PDF ═══
function gerarCatalogoPDF(){
  var lista=cubaCat==='coz'?CFG.coz:CFG.lav;
  var isCoz=cubaCat==='coz';
  var titulo=isCoz?'Cubas para Cozinha':'Cubas para Banheiro & Lavabo';
  var emp=CFG.emp;

  // Build items with photos (only cubas with price and photo)
  var itens=lista.filter(function(c){return c.pr>0;});

  // Build card HTML for each cuba
  function cubaCard(c){
    var foto=c.photo
      ?'<img src="'+c.photo+'" style="width:100%;height:160px;object-fit:contain;display:block;background:#f5f5f5;">'
      :'<div style="width:100%;height:160px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:2.5rem;">🚰</div>';
    return '<div style="break-inside:avoid;background:#fff;border:1px solid #e0d8cc;border-radius:12px;overflow:hidden;margin-bottom:16px;">'
      +foto
      +'<div style="padding:14px 16px;">'
        +'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#b08040;font-weight:700;margin-bottom:3px;">'+c.brand+'</div>'
        +'<div style="font-size:16px;font-weight:900;color:#1a1a1a;margin-bottom:2px;line-height:1.2;">'+c.nm+'</div>'
        +'<div style="font-size:11px;color:#888;margin-bottom:12px;">'+c.dim+'</div>'
        +'<div style="background:#faf5ea;border:1px solid #e8d89c;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">'
          +'<span style="font-size:10px;color:#8b6014;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Preço</span>'
          +'<span style="font-size:20px;font-weight:900;color:#8b6014;">R$ '+c.pr.toLocaleString('pt-BR')+'</span>'
        +'</div>'
      +'</div>'
    +'</div>';
  }

  var cardsHtml=itens.map(cubaCard).join('');

  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
  +'<style>'
  +'*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
  +'body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;}'
  +'.page{max-width:800px;margin:0 auto;}'
  // Header
  +'.hdr{background:#0f0c00;padding:28px 36px;display:flex;justify-content:space-between;align-items:center;}'
  +'.hdr-brand{}'
  +'.hdr-logo{font-size:28px;font-weight:900;color:#C9A84C;letter-spacing:-.5px;line-height:1;}'
  +'.hdr-tag{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.45);margin-top:4px;}'
  +'.hdr-right{text-align:right;}'
  +'.hdr-tel{font-size:13px;font-weight:700;color:#C9A84C;}'
  +'.hdr-city{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;}'
  // Title bar
  +'.tbar{background:#f7f2e8;border-bottom:3px solid #C9A84C;padding:14px 36px;display:flex;justify-content:space-between;align-items:center;}'
  +'.tbar-title{font-size:18px;font-weight:900;color:#5a3a06;letter-spacing:-.3px;}'
  +'.tbar-ic{font-size:22px;}'
  +'.tbar-sub{font-size:10px;color:#999;margin-top:2px;}'
  // Grid
  +'.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:24px 36px;}'
  // Footer
  +'.foot{background:#0f0c00;padding:16px 36px;display:flex;justify-content:space-between;align-items:center;margin-top:8px;}'
  +'.foot-txt{font-size:10px;color:rgba(201,168,76,.5);}'
  +'.foot-addr{font-size:10px;color:rgba(255,255,255,.25);text-align:right;}'
  +'@media print{'
    +'.page{max-width:100%;}'
    +'body{background:#fff;}'
  +'}'
  +'</style></head><body>'
  +'<div class="page">'
  // Header
  +'<div class="hdr">'
    +'<div class="hdr-brand">'
      +'<div class="hdr-logo">'+emp.nome+'</div>'
      +'<div class="hdr-tag">Mármores · Granitos · Quartzitos</div>'
    +'</div>'
    +'<div class="hdr-right">'
      +'<div class="hdr-tel">'+emp.tel+'</div>'
      +'<div class="hdr-city">'+emp.cidade+'</div>'
    +'</div>'
  +'</div>'
  // Title bar
  +'<div class="tbar">'
    +'<div>'
      +'<div class="tbar-title">'+(isCoz?'🍳':'🚿')+' '+titulo+'</div>'
      +'<div class="tbar-sub">Modelos disponíveis · Preços de venda</div>'
    +'</div>'
  +'</div>'
  // Cards grid
  +'<div class="grid">'+cardsHtml+'</div>'
  // Footer
  +'<div class="foot">'
    +'<div class="foot-txt">CNPJ: '+emp.cnpj+' · '+emp.ig+'</div>'
    +'<div class="foot-addr">'+emp.end+'</div>'
  +'</div>'
  +'</div>'
  // Auto print
  +'<script>window.onload=function(){setTimeout(function(){window.print();},400);}<\/script>'
  +'</body></html>';

  // Baixar como HTML (funciona no Android - open in new window é bloqueado)
  var blob=new Blob([html],{type:'text/html;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  var cat=isCoz?'Cozinha':'Banheiro';
  a.href=url;a.download='Catalogo_Cubas_'+cat+'_HR.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},8000);
  toast('📥 Catálogo baixado! Abra o arquivo e use Compartilhar → Imprimir → Salvar PDF');
}

// ═══ COMPARTILHAR CATÁLOGO CUBAS ═══
function compartilharCatalogoCubas(){
  var lista=cubaCat==='coz'?CFG.coz:CFG.lav;
  var titulo=cubaCat==='coz'?'🍳 CUBAS PARA COZINHA':'🚿 CUBAS PARA BANHEIRO/LAVABO';
  var emp=CFG.emp;
  var txt=emp.nome+'\n'+emp.tel+'\n'+(emp.ig||'')+'\n\n';
  txt+='━━━━━━━━━━━━━━━━━━━━\n';
  txt+=titulo+'\n';
  txt+='━━━━━━━━━━━━━━━━━━━━\n\n';
  lista.filter(function(c){return c.pr>0;}).forEach(function(c){
    txt+='◆ '+c.nm+'\n';
    txt+='  '+c.brand+' · '+c.dim+'\n';
    txt+='  💰 R$ '+c.pr.toLocaleString('pt-BR')+'\n\n';
  });
  txt+='━━━━━━━━━━━━━━━━━━━━\n';
  txt+='📍 '+emp.end+'\n';
  txt+='📞 '+emp.tel;
  var url='https://wa.me/?text='+encodeURIComponent(txt);
  window.open(url,'_blank');
}

// ═══ EMPRESA ═══
function updEmp(){
  var e=CFG.emp;
  // Header
  var hnm=document.querySelector('.hnm');
  if(hnm)hnm.innerHTML=(e.nome||'HR Mármores e Granitos')+' <span class="hsub">& GRANITOS · '+(e.cidade||'PILÃO ARCADO').toUpperCase()+'</span>';
  // Splash hero — update from CFG
  var el;
  el=document.getElementById('spName'); if(el)el.textContent=e.nome||'HR Mármores e Granitos';
  el=document.getElementById('spTagline'); if(el)el.textContent=(e.tipo||'Marmoraria')+' · '+(e.cidade||'Pilão Arcado — BA');
  el=document.getElementById('spTel'); if(el)el.textContent=e.tel||'';
  el=document.getElementById('spIg'); if(el)el.textContent=e.ig||'';
  el=document.getElementById('spAddr'); if(el)el.textContent=e.end?(e.end+' · '+e.cidade):(e.cidade||'');
  el=document.getElementById('spCnpj'); if(el)el.textContent=e.cnpj?'CNPJ '+e.cnpj:'';
  // Logo
  el=document.getElementById('spLogo');
  if(el){
    var logoSrc=e.logoUrl||DEF_EMP.logoUrl||'';
    if(logoSrc){el.innerHTML='<img src="'+logoSrc+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';el.style.padding='0';}
    else{var w2=(e.nome||'HR').trim().split(' ');el.textContent=(w2.length>=2?w2[0][0]+w2[1][0]:w2[0].substring(0,2)).toUpperCase();el.style.padding='';}
  }
}
function renderInfoList(){
  var e=CFG.emp;
  var _il=document.getElementById('infoList');
  if(!_il)return;
  _il.innerHTML='<div class="infrow"><div class="infic">📍</div><div><div class="infl">Endereço</div><div class="infv">'+e.end+'</div></div></div><div class="infrow"><div class="infic">🏙️</div><div><div class="infl">Cidade</div><div class="infv">'+e.cidade+'</div></div></div><div class="infrow"><div class="infic">📱</div><div><div class="infl">WhatsApp</div><div class="infv">'+e.tel+'</div></div></div><div class="infrow"><div class="infic">📸</div><div><div class="infl">Instagram</div><div class="infv">'+e.ig+'</div></div></div><div class="infrow"><div class="infic">✉️</div><div><div class="infl">E-mail</div><div class="infv">'+e.email+'</div></div></div><div class="infrow"><div class="infic">🏦</div><div><div class="infl">Banco</div><div class="infv">'+e.banco+'</div></div></div>';
}
function buildPT(){
  var cats=['Granito','Granito Preto','Granito Branco','Mármore','Quartzito'],h='';
  cats.forEach(function(cat){var ss=CFG.stones.filter(function(s){return s.cat===cat;});if(!ss.length)return;h+='<div class="ptcat">'+cat+'</div>';ss.forEach(function(s){h+='<div class="ptrow"><span class="ptnm">'+s.nm+(s.fin==='Escovada'?' (Escovada)':'')+'</span><span class="ptpr">R$ '+s.pr.toLocaleString('pt-BR')+'/m²</span></div>';});});
  var _ptw=document.getElementById('ptWrap');if(_ptw)_ptw.innerHTML=h;
}