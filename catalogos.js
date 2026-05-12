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
  document.getElementById('cubaFsImg').src=a.photo;
  document.getElementById('cubaFsNm').textContent=a.nm;
  document.getElementById('cubaFsDim').textContent=(a.marca?a.marca+' · ':'')+a.dim;
  document.getElementById('cubaFsPr').textContent=a.pr>0?'R$ '+a.pr.toLocaleString('pt-BR'):'';
  document.getElementById('cubaFsMd').classList.add('on');
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
  document.getElementById('cubaFsImg').src=c.photo;
  document.getElementById('cubaFsNm').textContent=c.nm;
  document.getElementById('cubaFsDim').textContent=(c.brand?c.brand+' · ':'')+c.dim;
  document.getElementById('cubaFsPr').textContent=c.pr>0?'R$ '+c.pr.toLocaleString('pt-BR'):'';
  document.getElementById('cubaFsMd').classList.add('on');
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
  document.getElementById('infoList').innerHTML='<div class="infrow"><div class="infic">📍</div><div><div class="infl">Endereço</div><div class="infv">'+e.end+'</div></div></div><div class="infrow"><div class="infic">🏙️</div><div><div class="infl">Cidade</div><div class="infv">'+e.cidade+'</div></div></div><div class="infrow"><div class="infic">📱</div><div><div class="infl">WhatsApp</div><div class="infv">'+e.tel+'</div></div></div><div class="infrow"><div class="infic">📸</div><div><div class="infl">Instagram</div><div class="infv">'+e.ig+'</div></div></div><div class="infrow"><div class="infic">✉️</div><div><div class="infl">E-mail</div><div class="infv">'+e.email+'</div></div></div><div class="infrow"><div class="infic">🏦</div><div><div class="infl">Banco</div><div class="infv">'+e.banco+'</div></div></div>';
}
function buildPT(){
  var cats=['Granito','Granito Preto','Granito Branco','Mármore','Quartzito'],h='';
  cats.forEach(function(cat){var ss=CFG.stones.filter(function(s){return s.cat===cat;});if(!ss.length)return;h+='<div class="ptcat">'+cat+'</div>';ss.forEach(function(s){h+='<div class="ptrow"><span class="ptnm">'+s.nm+(s.fin==='Escovada'?' (Escovada)':'')+'</span><span class="ptpr">R$ '+s.pr.toLocaleString('pt-BR')+'/m²</span></div>';});});
  document.getElementById('ptWrap').innerHTML=h;
}

// ═══ CONFIG ═══
function buildCfg(){
  var h='';
  if(cfgTab===0){
    // PEDRAS
    CFG.stones.forEach(function(s,i){
      var bg=s.photo?('<img class="csw-bg" src="'+s.photo+'" alt="'+s.nm+'" style="width:100%;height:100%;object-fit:cover;display:block;">'):'';
      h+='<div class="cfgsec">';
      h+='<div class="cfgphoto"><div class="'+(s.photo?'':'cfgphoto-bg '+s.tx)+'">'+(s.photo?bg:'')+'</div>';
      h+='<div class="cfgphoto-overlay"><div class="cfgphoto-info"><div class="cfgphoto-nm">'+s.nm+'</div><div class="cfgphoto-cat">'+s.cat+' · '+s.fin+'</div></div><div class="cfgphoto-price">R$ '+s.pr+'</div>';
      h+='<button class="cfgphoto-btn" data-pp="stone" data-idx="'+i+'">📷 '+(s.photo?'Trocar':'Adicionar')+'</button></div></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Nome</span><input class="cfginp" style="width:150px;text-align:right;" value="'+s.nm+'" onchange="CFG.stones['+i+'].nm=this.value;buildMat();buildCatalog();svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Categoria</span><select class="cfginp" style="width:140px;" onchange="CFG.stones['+i+'].cat=this.value;buildMat();buildCatalog();buildPT();svCFG();">';
      ['Granito Cinza','Granito Preto','Granito Branco','Granito Verde','Mármore','Travertino','Quartzito','Ultra Compacto'].forEach(function(cat){h+='<option '+(s.cat===cat?'selected':'')+'>'+cat+'</option>';});
      h+='</select></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Preço R$/m²</span><input class="cfginp cfginp-w" type="number" value="'+s.pr+'" onchange="CFG.stones['+i+'].pr=+this.value;buildMat();buildCatalog();buildPT();svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Acabamento</span><select class="cfginp" style="width:120px;" onchange="CFG.stones['+i+'].fin=this.value;svCFG();"><option '+(s.fin==='Polida'?'selected':'')+'>Polida</option><option '+(s.fin==='Escovada'?'selected':'')+'>Escovada</option></select></div>';
      h+='<div style="padding:9px 13px;border-top:1px solid #0c0c10;display:flex;justify-content:space-between;align-items:center;">';
      h+='<div style="display:flex;gap:6px;">';
      h+='<button class="cfgbtn" onclick="if('+i+'>0){var a=CFG.stones.splice('+i+',1)[0];CFG.stones.splice('+(i-1)+',0,a);svCFG();buildCatalog();buildCfg();}" style="font-size:.8rem;padding:5px 10px;">↑</button>';
      h+='<button class="cfgbtn" onclick="if('+(i+1)+'<CFG.stones.length){var a=CFG.stones.splice('+i+',1)[0];CFG.stones.splice('+(i+1)+',0,a);svCFG();buildCatalog();buildCfg();}" style="font-size:.8rem;padding:5px 10px;">↓</button>';
      h+="</div>";
      h+='<button class="cfgdel" onclick="if(confirm(\'Remover '+s.nm+'?\')){CFG.stones.splice('+i+',1);buildMat();buildCatalog();buildPT();svCFG();buildCfg();}">✕ Remover</button></div>';
      h+='</div>';
    });
    h+='<button class="cfgadd" onclick="CFG.stones.push({id:\'s_\'+Date.now(),nm:\'Nova Pedra\',cat:\'Granito\',fin:\'Polida\',pr:300,tx:\'tx-andorinha\',photo:\'\',desc:\'\'});buildMat();buildCatalog();buildPT();svCFG();buildCfg();">+ Nova Pedra</button>';
  }
  else if(cfgTab===1){
    // CUBAS COZINHA
    h+='<div style="font-size:.75rem;color:var(--t2);margin-bottom:12px;line-height:1.6;">Toque em <b>📷</b> na foto para trocar pela imagem da sua galeria.</div>';
    CFG.coz.forEach(function(c,i){
      h+='<div class="cfgsec">';
      h+='<div class="cfg-cuba-row"><div class="cfg-cuba-thumb">'+(c.photo?'<img src="'+c.photo+'" alt="">':'<div style="font-size:1.4rem;color:var(--t3);display:grid;place-items:center;width:100%;height:100%;">🔧</div>')+'<button class="cfg-cuba-thumb-btn" data-pp="coz" data-idx="'+i+'">📷</button></div>';
      h+='<div class="cfg-cuba-info"><div class="cfg-cuba-nm">'+c.brand+' — '+c.nm+'</div><div class="cfg-cuba-dim">'+c.dim+'</div>';
      h+='<div style="display:flex;gap:8px;margin-top:5px;"><div style="flex:1;"><div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">Venda R$</div><input class="cfginp" type="number" value="'+c.pr+'" style="width:100%;" onchange="CFG.coz['+i+'].pr=+this.value;buildCubaList();svCFG();"></div><div style="flex:1;"><div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">M.O. R$</div><input class="cfginp" type="number" value="'+c.inst+'" style="width:100%;" onchange="CFG.coz['+i+'].inst=+this.value;buildCubaList();svCFG();"></div></div>';
      h+='</div></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Nome</span><input class="cfginp cfginp-w" value="'+c.nm+'" onchange="CFG.coz['+i+'].nm=this.value;svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Dimensões</span><input class="cfginp cfginp-w" value="'+c.dim+'" onchange="CFG.coz['+i+'].dim=this.value;svCFG();"></div>';
      h+='<div style="display:flex;gap:6px;padding:8px 13px;border-top:1px solid #0c0c10;">';
      h+='<button class="cfgbtn" onclick="if('+i+'>0){var x=CFG.coz.splice('+i+',1)[0];CFG.coz.splice('+(i-1)+',0,x);svCFG();buildCubaList();buildCfg();}">↑</button>';
      h+='<button class="cfgbtn" onclick="if('+(i+1)+'<CFG.coz.length){var x=CFG.coz.splice('+i+',1)[0];CFG.coz.splice('+(i+1)+',0,x);svCFG();buildCubaList();buildCfg();}">↓</button>';
      h+='<button class="cfgdel" onclick="if(confirm(\'Remover esta cuba?\')){CFG.coz.splice('+i+',1);svCFG();buildCubaList();buildCfg();}">✕ Remover</button>';
      h+='</div>';
      h+='</div>';
    });
    h+='<button class="cfgadd" onclick="CFG.coz.push({id:\'c_\'+Date.now(),nm:\'Nova Cuba\',brand:\'Inox\',dim:\'??cm\',pr:0,inst:110,instCli:160,photo:\'\'});svCFG();buildCfg();">+ Nova Cuba</button>';
  }
  else if(cfgTab===2){
    // CUBAS BANHEIRO
    h+='<div style="font-size:.75rem;color:var(--t2);margin-bottom:12px;line-height:1.6;">Toque em <b>📷</b> na foto para trocar pela imagem da sua galeria.</div>';
    CFG.lav.forEach(function(c,i){
      var isEsc=c.tipo==='Esculpida';
      h+='<div class="cfgsec">';
      h+='<div class="cfg-cuba-row"><div class="cfg-cuba-thumb">'+(c.photo?'<img src="'+c.photo+'" alt="">':'<div style="font-size:1.4rem;color:var(--t3);display:grid;place-items:center;width:100%;height:100%;">'+(isEsc?'🪨':'🚿')+'</div>')+'<button class="cfg-cuba-thumb-btn" data-pp="lav" data-idx="'+i+'">📷</button></div>';
      h+='<div class="cfg-cuba-info"><div class="cfg-cuba-nm">'+(c.brand?c.brand+' — ':'')+c.nm+'</div><div class="cfg-cuba-dim">'+c.dim+(c.tipo?' · '+c.tipo:'')+'</div>';
      if(!isEsc){h+='<div style="display:flex;gap:8px;margin-top:5px;"><div style="flex:1;"><div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">Venda R$</div><input class="cfginp" type="number" value="'+c.pr+'" style="width:100%;" onchange="CFG.lav['+i+'].pr=+this.value;buildCubaList();svCFG();"></div><div style="flex:1;"><div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">M.O. R$</div><input class="cfginp" type="number" value="'+c.inst+'" style="width:100%;" onchange="CFG.lav['+i+'].inst=+this.value;buildCubaList();svCFG();"></div></div>';}
      else{h+='<div style="margin-top:5px;"><div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">M.O. Esculpida R$</div><input class="cfginp" type="number" value="'+c.inst+'" style="width:110px;" onchange="CFG.lav['+i+'].inst=+this.value;buildCubaList();svCFG();"></div>';}
      h+='</div></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Nome</span><input class="cfginp cfginp-w" value="'+c.nm+'" onchange="CFG.lav['+i+'].nm=this.value;svCFG();"></div>';
      h+='<div style="display:flex;gap:6px;padding:8px 13px;border-top:1px solid #0c0c10;">';
      h+='<button class="cfgbtn" onclick="if('+i+'>0){var x=CFG.lav.splice('+i+',1)[0];CFG.lav.splice('+(i-1)+',0,x);svCFG();buildCubaList();buildCfg();}">↑</button>';
      h+='<button class="cfgbtn" onclick="if('+(i+1)+'<CFG.lav.length){var x=CFG.lav.splice('+i+',1)[0];CFG.lav.splice('+(i+1)+',0,x);svCFG();buildCubaList();buildCfg();}">↓</button>';
      h+='<button class="cfgdel" onclick="if(confirm(\'Remover esta cuba?\')){CFG.lav.splice('+i+',1);svCFG();buildCubaList();buildCfg();}">✕ Remover</button>';
      h+='</div>';
      h+='</div>';
    });
    h+='<button class="cfgadd" onclick="CFG.lav.push({id:\'l_\'+Date.now(),nm:\'Nova Cuba\',brand:\'Marca\',dim:\'??cm\',tipo:\'Louça\',pr:0,inst:220,instCli:280,photo:\'\'});svCFG();buildCfg();">+ Nova Cuba</button>';
  }
  else if(cfgTab===3){
    // SERVIÇOS — editável: nome, preço, adicionar, remover, reordenar
    h+='<div style="font-size:.72rem;color:var(--t2);margin-bottom:12px;line-height:1.6;">Edite o nome e preço de cada serviço. Adicione novos acabamentos conforme necessário.</div>';

    // CFG.svList: array de {k, l, preco, grp, u}
    // Se não existir ainda, inicializa a partir de DEF_SV_LIST
    if(!CFG.svList){
      CFG.svList=[
        {k:'s_reta',    l:'Sainha Reta',           preco:CFG.sv.s_reta||70,    grp:'Sainha/Frontão',u:'sf'},
        {k:'s_45',      l:'Sainha 45°',             preco:CFG.sv.s_45||130,     grp:'Sainha/Frontão',u:'sf'},
        {k:'s_boleada', l:'Sainha Boleada',         preco:CFG.sv.s_boleada||170,grp:'Sainha/Frontão',u:'sf'},
        {k:'s_slim',    l:'Sainha Slim',            preco:CFG.sv.s_slim||50,    grp:'Sainha/Frontão',u:'sf'},
        {k:'frontao',   l:'Frontão Reto',           preco:CFG.sv.frontao||90,   grp:'Sainha/Frontão',u:'sf'},
        {k:'frontao_chf',l:'Frontão Chanfrado',     preco:CFG.sv.frontao_chf||110,grp:'Sainha/Frontão',u:'sf'},
        {k:'rodape',    l:'Rodapé de Pedra',        preco:CFG.sv.rodape||55,    grp:'Sainha/Frontão',u:'sf'},
        {k:'sol1',      l:'Soleira 1 lado',          preco:CFG.sv.sol1||35,      grp:'Soleira/Peitoril',u:'ml'},
        {k:'sol2',      l:'Soleira 2 lados',         preco:CFG.sv.sol2||60,      grp:'Soleira/Peitoril',u:'ml'},
        {k:'peit_reto', l:'Peitoril Reto',          preco:CFG.sv.peit_reto||40, grp:'Soleira/Peitoril',u:'ml'},
        {k:'peit_ping', l:'c/ Pingadeira',          preco:CFG.sv.peit_ping||70, grp:'Soleira/Peitoril',u:'ml'},
        {k:'peit_col',  l:'c/ Pedra Colada+Pingadeira',preco:CFG.sv.peit_col||120,grp:'Soleira/Peitoril',u:'ml'},
        {k:'peit_portal',l:'p/ Portal Madeira',     preco:CFG.sv.peit_portal||180,grp:'Soleira/Peitoril',u:'ml'},
        {k:'forn',      l:'Furo Torneira',          preco:CFG.sv.forn||45,      grp:'Furos & Recortes',u:'un'},
        {k:'fralo',     l:'Furo Ralo',              preco:CFG.sv.fralo||45,     grp:'Furos & Recortes',u:'un'},
        {k:'cook',      l:'Recorte Cooktop',        preco:CFG.sv.cook||140,     grp:'Furos & Recortes',u:'un'},
        {k:'reb_n',     l:'Rebaixo Normal',         preco:CFG.sv.reb_n||200,    grp:'Rebaixo',u:'un'},
        {k:'reb_a',     l:'Rebaixo Americano',      preco:CFG.sv.reb_a||380,    grp:'Rebaixo',u:'un'},
        {k:'tubo',      l:'Tubo Metálico',          preco:CFG.sv.tubo||60,      grp:'Fixação',u:'un'},
        {k:'cant',      l:'Cantoneira',             preco:CFG.sv.cant||110,     grp:'Fixação',u:'un'},
        {k:'inst',      l:'Instalação Padrão',      preco:CFG.sv.inst||280,     grp:'Instalação',u:'un'},
        {k:'inst_c',    l:'Instalação Complexa',    preco:CFG.sv.inst_c||420,   grp:'Instalação',u:'un'},
        {k:'desl_for',  l:'Deslocamento fora cidade',preco:CFG.sv.desl_for||3.5,grp:'Deslocamento',u:'km'}
      ];
      svCFG();
    }

    // Sync CFG.sv from svList
    function syncSvList(){
      CFG.svList.forEach(function(sv){CFG.sv[sv.k]=sv.preco;});
      svCFG();
    }

    // Group display
    var grps={};
    CFG.svList.forEach(function(sv,i){
      if(!grps[sv.grp])grps[sv.grp]=[];
      grps[sv.grp].push({sv:sv,i:i});
    });

    Object.keys(grps).forEach(function(grpNm){
      h+='<div class="cfgsec">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
      h+='<div class="cfghd" style="margin:0;">'+grpNm+'</div>';
      h+='<button class="cfgbtn" style="font-size:.68rem;padding:4px 10px;" onclick="CFG.svList.push({k:\'sv_\'+(Date.now()),l:\'Novo Acabamento\',preco:0,grp:\''+grpNm+'\',u:\'ml\'});syncSvList=function(){CFG.svList.forEach(function(sv){CFG.sv[sv.k]=sv.preco;});svCFG();};svCFG();buildCfg();">+ Adicionar</button>';
      h+='</div>';
      grps[grpNm].forEach(function(item){
        var sv=item.sv,i=item.i;
        h+='<div class="cfg-row" style="gap:6px;flex-wrap:wrap;">';
        // Nome editável
        h+='<input class="cfginp" value="'+escH(sv.l)+'" style="flex:1;min-width:120px;text-align:left;" onchange="CFG.svList['+i+'].l=this.value;svCFG();" placeholder="Nome do serviço">';
        // Preço
        h+='<input class="cfginp cfginp-w" type="number" value="'+sv.preco+'" style="width:72px;" onchange="CFG.svList['+i+'].preco=+this.value;CFG.sv[CFG.svList['+i+'].k]=+this.value;svCFG();" placeholder="R$">';
        // Unidade
        h+='<select class="cfginp" style="width:58px;padding:6px 4px;" onchange="CFG.svList['+i+'].u=this.value;svCFG();">';
        h+='<option '+(sv.u==='sf'?'selected':'')+'>sf</option>';
        h+='<option '+(sv.u==='ml'?'selected':'')+'>ml</option>';
        h+='<option '+(sv.u==='un'?'selected':'')+'>un</option>';
        h+='<option '+(sv.u==='km'?'selected':'')+'>km</option>';
        h+='</select>';
        // Mover e remover
        h+='<button class="cfgbtn" onclick="if('+i+'>0){var x=CFG.svList.splice('+i+',1)[0];CFG.svList.splice('+(i-1)+',0,x);svCFG();buildCfg();}">↑</button>';
        h+='<button class="cfgbtn" onclick="if('+(i+1)+'<CFG.svList.length){var x=CFG.svList.splice('+i+',1)[0];CFG.svList.splice('+(i+1)+',0,x);svCFG();buildCfg();}">↓</button>';
        h+='<button class="cfgdel" onclick="if(confirm(\'Remover '+escH(sv.l)+'?\')){CFG.svList.splice('+i+',1);delete CFG.sv[\''+sv.k+'\'];svCFG();buildCfg();}">✕</button>';
        h+='</div>';
      });
      h+='</div>';
    });

    // Botão para adicionar novo grupo
    h+='<button class="cfgadd" onclick="var g=prompt(\'Nome do novo grupo:\');if(g){CFG.svList.push({k:\'sv_\'+(Date.now()),l:\'Novo Acabamento\',preco:0,grp:g,u:\'ml\'});svCFG();buildCfg();}">+ Novo Grupo de Serviços</button>';
    h+='<div class="cfgsec"><div class="cfghd">Custos Fixos Mensais</div>';
    CFG.fixos.forEach(function(f,i){
      h+='<div class="cfg-row"><input class="cfginp" value="'+f.n+'" style="flex:1;text-align:left;" onchange="CFG.fixos['+i+'].n=this.value;renderFixos();svCFG();"><input class="cfginp cfginp-w" type="number" value="'+f.v+'" onchange="CFG.fixos['+i+'].v=+this.value;renderFixos();svCFG();"><button class="cfgdel" onclick="CFG.fixos.splice('+i+',1);renderFixos();svCFG();buildCfg();">✕</button></div>';
    });
    h+='<button class="cfgadd" onclick="CFG.fixos.push({n:\'Novo custo\',v:0});renderFixos();svCFG();buildCfg();">+ Adicionar custo fixo</button>';
    h+='</div>';
  }
  else if(cfgTab===6){
    // ACESSÓRIOS
    h+='<div style="font-size:.75rem;color:var(--t2);margin-bottom:12px;line-height:1.6;">Adicione seus acessórios. Toque em 📷 para adicionar foto da galeria.</div>';
    (CFG.ac||[]).forEach(function(a,i){
      h+='<div class="cfgsec">';
      // Foto
      h+='<div style="width:100%;height:120px;position:relative;overflow:hidden;background:var(--s3);border-bottom:1px solid var(--bd);">';
      if(a.photo){
        h+='<img src="'+a.photo+'" style="width:100%;height:100%;object-fit:cover;display:block;">';
      } else {
        h+='<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2.5rem;color:var(--t4);">🔩</div>';
      }
      h+='<button data-pp="ac" data-idx="'+i+'" style="position:absolute;bottom:7px;right:7px;background:rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.25);border-radius:8px;color:#fff;font-size:.7rem;padding:5px 10px;cursor:pointer;font-family:Outfit,sans-serif;">📷 '+(a.photo?'Trocar':'Adicionar')+'</button>';
      h+='</div>';
      // Campos
      h+='<div class="cfg-row"><span class="cfg-lbl">Nome</span><input class="cfginp" value="'+escH(a.nm)+'" style="width:160px;text-align:right;" onchange="CFG.ac['+i+'].nm=this.value;svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Marca</span><input class="cfginp" value="'+escH(a.marca||'')+'" style="width:160px;text-align:right;" placeholder="opcional" onchange="CFG.ac['+i+'].marca=this.value;svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Dimensões</span><input class="cfginp" value="'+escH(a.dim||'')+'" style="width:160px;text-align:right;" placeholder="Ex: 60cm" onchange="CFG.ac['+i+'].dim=this.value;svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Preço R$</span><input class="cfginp cfginp-w" type="number" value="'+(a.pr||0)+'" onchange="CFG.ac['+i+'].pr=+this.value;svCFG();"></div>';
      h+='<div style="padding:9px 13px 4px;"><label style="font-size:.62rem;color:var(--t3);letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px;display:block;">Descrição</label><textarea class="cfginp" rows="2" style="width:100%;text-align:left;resize:none;" onchange="CFG.ac['+i+'].desc=this.value;svCFG();">'+escH(a.desc||'')+'</textarea></div>';
      h+='<div style="padding:9px 13px;display:flex;gap:6px;">';
      h+='<button class="cfgbtn" onclick="if('+i+'>0){var x=CFG.ac.splice('+i+',1)[0];CFG.ac.splice('+(i-1)+',0,x);svCFG();buildAcList();buildCfg();}">↑ Subir</button>';
      h+='<button class="cfgbtn" onclick="if('+(i+1)+'<CFG.ac.length){var x=CFG.ac.splice('+i+',1)[0];CFG.ac.splice('+(i+1)+',0,x);svCFG();buildAcList();buildCfg();}">↓ Descer</button>';
      h+='<button class="cfgdel" onclick="if(confirm(\'Remover '+escH(a.nm)+'?\')){CFG.ac.splice('+i+',1);svCFG();buildCfg();}">✕</button>';
      h+='</div>';
      h+='</div>';
    });
    h+='<button class="cfgadd" onclick="CFG.ac.push({id:\'ac_\'+Date.now(),nm:\'Novo Acessório\',marca:\'\',dim:\'\',pr:0,desc:\'\',photo:\'\'});svCFG();buildCfg();">+ Adicionar Acessório</button>';
  }
  else if(cfgTab===4){
    // EMPRESA — completo e organizado
    var e=CFG.emp;
    h+='<div class="cfgsec">';
    h+='<div class="cfghd">🏢 Identidade da Empresa</div>';
    h+='<div style="padding:12px 13px 6px;">';
    // Logo upload
    h+='<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--bd);">';
    h+='<div id="cfgLogoPreview" onclick="document.getElementById(\'fileLogoInp\').click()" style="width:70px;height:70px;border-radius:16px;background:linear-gradient(145deg,#c9a84c,#8b6014);display:flex;align-items:center;justify-content:center;font-family:Cormorant Garamond,serif;font-size:1.6rem;font-weight:700;color:#1a0e00;cursor:pointer;flex-shrink:0;overflow:hidden;">';
    if(e.logoUrl){
      h+='<img src="'+e.logoUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';
    } else {
      var w2=(e.nome||'HR').trim().split(/\s+/);
      var ini2=w2.length>=2?w2[0][0]+w2[1][0]:w2[0].substring(0,2);
      h+=ini2.toUpperCase();
    }
    h+='</div>';
    h+='<div style="flex:1;">';
    h+='<div style="font-size:.75rem;font-weight:700;color:var(--t2);margin-bottom:4px;">Logo da empresa</div>';
    h+='<div style="font-size:.65rem;color:var(--t3);line-height:1.5;margin-bottom:8px;">Aparece na tela inicial e nos documentos. Toque na logo para alterar.</div>';
    h+='<button onclick="document.getElementById(\'fileLogoInp\').click()" style="background:var(--gdim);border:1px solid var(--gold3);border-radius:8px;padding:6px 12px;color:var(--gold2);font-family:Outfit,sans-serif;font-size:.7rem;cursor:pointer;">📷 Alterar Logo</button>';
    h+='<input type="file" id="fileLogoInp" accept="image/*" style="display:none;" onchange="var r=new FileReader();r.onload=function(e2){CFG.emp.logoUrl=e2.target.result;svCFG();updEmp();buildCfg();};r.readAsDataURL(this.files[0]);">';
    if(e.logoUrl)h+=' <button onclick="delete CFG.emp.logoUrl;svCFG();updEmp();buildCfg();" style="background:var(--s3);border:1px solid var(--bd2);border-radius:8px;padding:6px 10px;color:var(--t3);font-family:Outfit,sans-serif;font-size:.7rem;cursor:pointer;margin-left:4px;">✕ Remover</button>';
    h+='</div></div>';

    // Dados básicos
    var campos=[
      ['nome','🏢 Nome da Empresa','text','HR Mármores e Granitos'],
      ['tipo','🪨 Tipo (ex: Marmoraria)','text','Marmoraria'],
      ['cnpj','📄 CNPJ','text','64.639.182/0001-28'],
    ];
    campos.forEach(function(x){
      h+='<div class="cfg-row"><span class="cfg-lbl">'+x[0]==='nome'?'Nome':x[0]==='tipo'?'Tipo':x[0]==='cnpj'?'CNPJ':''+x[1]+'</span>';
      h+='<input class="cfginp" type="'+x[2]+'" value="'+(e[x[0]]||'')+'" placeholder="'+x[3]+'" style="flex:1;text-align:right;" onchange="CFG.emp[\''+x[0]+'\']=this.value;updEmp();svCFG();"></div>';
    });
    h+='</div></div>';

    // Contato
    h+='<div class="cfgsec"><div class="cfghd">📞 Contato</div><div style="padding:6px 13px 10px;">';
    var contato=[
      ['tel','Telefone / WhatsApp','tel','(74) 99148-4460'],
      ['email','E-mail','email','giliardhangel18@gmail.com'],
      ['ig','Instagram','text','@HR Marmores e Granitos'],
      ['site','Site','url',''],
    ];
    contato.forEach(function(x){
      h+='<div class="cfg-row" style="padding:7px 0;border-bottom:1px solid var(--bd);"><span class="cfg-lbl">'+({'tel':'Telefone','email':'E-mail','ig':'Instagram','site':'Site'}[x[0]])+'</span>';
      h+='<input class="cfginp" type="'+x[2]+'" value="'+(e[x[0]]||'')+'" placeholder="'+x[3]+'" style="flex:1;text-align:right;" onchange="CFG.emp[\''+x[0]+'\']=this.value;updEmp();svCFG();"></div>';
    });
    h+='</div></div>';

    // Endereço
    h+='<div class="cfgsec"><div class="cfghd">📍 Endereço</div><div style="padding:6px 13px 10px;">';
    var enderecos=[
      ['end','Endereço','Av. Dep. Rodolfo Queiroz, 653'],
      ['bairro','Bairro','Centro'],
      ['cidade','Cidade','Pilão Arcado — BA'],
    ];
    enderecos.forEach(function(x){
      h+='<div class="cfg-row" style="padding:7px 0;border-bottom:1px solid var(--bd);"><span class="cfg-lbl">'+x[0]==='end'?'Endereço':x[0]==='bairro'?'Bairro':'Cidade'+'</span>';
      h+='<input class="cfginp" type="text" value="'+(e[x[0]]||'')+'" placeholder="'+x[2]+'" style="flex:1;text-align:right;" onchange="CFG.emp[\''+x[0]+'\']=this.value;updEmp();svCFG();"></div>';
    });
    h+='</div></div>';

    // Financeiro
    h+='<div class="cfgsec"><div class="cfghd">💳 Dados Financeiros</div><div style="padding:6px 13px 10px;">';
    var fin=[['banco','Banco','SICOOB Credirochas'],['chavePix','Chave Pix',''],['titular','Titular','']];
    fin.forEach(function(x){
      h+='<div class="cfg-row" style="padding:7px 0;border-bottom:1px solid var(--bd);"><span class="cfg-lbl">'+({banco:'Banco',chavePix:'Chave Pix',titular:'Titular'}[x[0]])+'</span>';
      h+='<input class="cfginp" type="text" value="'+(e[x[0]]||'')+'" placeholder="'+x[2]+'" style="flex:1;text-align:right;" onchange="CFG.emp[\''+x[0]+'\']=this.value;svCFG();"></div>';
    });
    h+='</div></div>';

    // Horário de funcionamento
    h+='<div class="cfgsec"><div class="cfghd">🕐 Horário de Funcionamento</div>';
    h+='<div style="padding:10px 13px;">';
    h+='<input class="cfginp" type="text" value="'+(e.horario||'Seg–Sex: 8h às 18h | Sáb: 8h às 13h')+'" placeholder="Ex: Seg–Sex: 8h às 18h" style="width:100%;" onchange="CFG.emp.horario=this.value;svCFG();">';
    h+='</div></div>';

    // IA
    h+='<div class="cfgsec"><div class="cfghd">🤖 Inteligência Artificial</div>';
    h+='<div style="padding:10px 13px;font-size:.72rem;color:var(--t3);line-height:1.7;margin-bottom:6px;">A API Key permite usar IA para interpretar projetos. Obtenha em <span style="color:#10a37f;">platform.openai.com</span> → API Keys. Gratuito para quem tem ChatGPT Pro.</div>';
    h+='<div class="cfg-row"><span class="cfg-lbl">API Key OpenAI (ChatGPT)</span><input class="cfginp" type="password" value="'+(e.apiKey||'')+'" placeholder="sk-proj-..." style="flex:1;text-align:right;font-family:monospace;" onchange="CFG.emp.apiKey=this.value;svCFG();toast(\'✓ API Key salva!\');"></div>';
    h+='<div style="padding:9px 13px;"><button onclick="testarAPIKey()" style="padding:7px 14px;background:var(--gdim);border:1px solid var(--gold3);border-radius:8px;color:var(--gold2);font-family:Outfit,sans-serif;font-size:.75rem;cursor:pointer;">Testar conexão</button><span id="apiTestResult" style="font-size:.72rem;color:var(--t3);margin-left:10px;"></span></div>';
    h+='</div>';

    // Sincronização
    h+='<div class="cfgsec"><div class="cfghd">☁️ Sincronização Automática</div>';
    h+='<div style="padding:13px;">';
    if(SYNC.on){
      h+='<div style="background:#0a1f12;border:1px solid var(--grn);border-radius:9px;padding:11px 13px;margin-bottom:10px;display:flex;align-items:center;gap:8px;">';
      h+='<span style="font-size:1.1rem;">✅</span><div style="flex:1;"><div style="font-size:.82rem;font-weight:600;color:var(--grn);">Sincronização ativa</div><div style="font-size:.68rem;color:var(--t3);margin-top:2px;">Todos os celulares da equipe veem os mesmos dados automaticamente.</div></div></div>';
      h+='<button class="btn btn-o" style="font-size:.78rem;padding:10px;" onclick="SYNC._doPush();toast(\'↑ Sincronizando...\');">↑ Sincronizar agora</button>';
    } else {
      h+='<div style="background:#1a1008;border:1px solid var(--gold3);border-radius:9px;padding:11px 13px;margin-bottom:10px;display:flex;align-items:center;gap:8px;">';
      h+='<span style="font-size:1.1rem;">⏳</span><div style="flex:1;"><div style="font-size:.82rem;font-weight:600;color:var(--gold2);">Conectando...</div><div style="font-size:.68rem;color:var(--t3);margin-top:2px;">Verifique sua conexão com a internet.</div></div></div>';
      h+='<button class="btn btn-g" style="font-size:.78rem;padding:10px;" onclick="SYNC.init();toast(\'Reconectando...\');">Tentar reconectar</button>';
    }
    h+='</div></div>';

    // Backup
    h+='<div class="cfgsec"><div class="cfghd">💾 Backup de Dados</div>';
    h+='<div style="padding:12px 13px;">';
    h+='<div style="font-size:.75rem;color:var(--t2);margin-bottom:12px;line-height:1.7;">Salve pedras, cubas, orçamentos e configurações em arquivo de backup.</div>';
    h+='<button class="btn btn-g" style="font-size:.8rem;padding:12px;margin-bottom:8px;width:100%;" onclick="baixarBackup()">📥 Baixar Backup Completo</button>';
    h+='<div style="border-top:1px solid var(--bd);padding-top:12px;margin-top:4px;">';
    h+='<button class="btn btn-o" style="font-size:.8rem;padding:12px;width:100%;" onclick="document.getElementById(\'fileBackup\').click()">📂 Carregar Backup</button>';
    h+='<input type="file" id="fileBackup" accept=".json" style="display:none;" onchange="carregarBackup(this)">';
    h+='</div></div></div>';

    // Perigo
    h+='<div class="cfgsec"><div class="cfghd" style="color:var(--red);">⚠️ Zona de Perigo</div>';
    h+='<div style="padding:12px 13px;">';
    h+='<button class="btn btn-red" onclick="if(confirm(\'APAGAR TUDO? Não pode ser desfeito!\')){localStorage.clear();location.reload();}">Apagar todos os dados</button>';
    h+='</div></div>';
  }
  else if(cfgTab===5){
    // CATÁLOGO DE CUBAS (visual)
    var allCubs=[{label:'🍳 Cubas para Cozinha',lista:CFG.coz},{label:'🚿 Cubas para Banheiro/Lavabo',lista:CFG.lav}];
    allCubs.forEach(function(grp){
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:18px 17px 10px;">'+grp.label+'</div>';
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 17px;">';
      grp.lista.forEach(function(cu,i){
        var isEsc=cu.tipo==='Esculpida';
        var cli=cu.tipo==='Cliente';
        var tot=cu.pr+cu.inst;
        var prStr=cu.pr>0?'R$ '+cu.pr:'Consultar';
        var totStr=cu.pr>0?'R$ '+tot:'Consultar';
        h+='<div style="background:var(--s1);border:1px solid var(--bd);border-radius:14px;overflow:hidden;">';
        // photo
        if(cu.photo){
          h+='<div style="height:85px;overflow:hidden;"><img src="'+cu.photo+'" alt="" style="width:100%;height:100%;object-fit:cover;"></div>';
        } else {
          h+='<div style="height:85px;background:var(--s3);display:grid;place-items:center;font-size:2rem;">'+(isEsc?'🪨':cli?'📦':'🚰')+'</div>';
        }
        h+='<div style="padding:9px 10px 10px;">';
        h+='<div style="font-size:.66rem;font-weight:700;color:var(--t2);line-height:1.3;margin-bottom:3px;">'+cu.brand+'</div>';
        h+='<div style="font-size:.76rem;font-weight:700;color:var(--text);margin-bottom:2px;">'+cu.nm+'</div>';
        h+='<div style="font-size:.6rem;color:var(--t4);margin-bottom:6px;">'+cu.dim+'</div>';
        h+='<div style="display:flex;justify-content:space-between;align-items:baseline;">';
        h+='<div><div style="font-size:.52rem;color:var(--t4);">Cuba</div><div style="font-size:.78rem;font-weight:700;color:var(--gold2);">'+prStr+'</div></div>';
        h+='<div style="text-align:right;"><div style="font-size:.52rem;color:var(--t4);">M.O.</div><div style="font-size:.78rem;color:var(--t2);">R$ '+cu.inst+'</div></div>';
        h+='</div>';
        if(cu.pr>0){h+='<div style="margin-top:5px;background:var(--gdim);border-radius:6px;padding:4px 8px;display:flex;justify-content:space-between;"><span style="font-size:.58rem;color:var(--gold3);">Total</span><span style="font-size:.78rem;font-weight:700;color:var(--gold2);">'+totStr+'</span></div>';}
        h+='</div></div>';
      });
      h+='</div>';
    });
    // Cliente card
    h+='<div style="margin:12px 17px;background:var(--s2);border:1px solid var(--bd2);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;">';
    h+='<div style="font-size:1.8rem;">📦</div>';
    h+='<div><div style="font-weight:700;font-size:.84rem;">Cuba do Cliente</div><div style="font-size:.7rem;color:var(--t3);margin-top:2px;">Cliente compra, HR instala · Cozinha: R$ 160 · Banheiro: R$ 280</div></div>';
    h+='</div>';
  }
  else if(cfgTab===6){
    // ACESSÓRIOS
    h+='<div style="font-size:.75rem;color:var(--t2);margin-bottom:12px;line-height:1.6;">Adicione seus acessórios — dispensers, calhas, escorredores, etc. Toque em 📷 para adicionar foto da galeria.</div>';
    (CFG.ac||[]).forEach(function(a,i){
      h+='<div class="cfgsec">';
      // Foto
      h+='<div style="position:relative;height:110px;background:var(--s3);overflow:hidden;">';
      if(a.photo){
        h+='<img src="'+a.photo+'" style="width:100%;height:100%;object-fit:cover;">';
      } else {
        h+='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;color:var(--t3);">🔩</div>';
      }
      h+='<button data-pp="ac" data-idx="'+i+'" style="position:absolute;bottom:7px;right:7px;background:rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:.68rem;padding:5px 10px;cursor:pointer;font-family:Outfit,sans-serif;">📷 '+(a.photo?'Trocar':'Adicionar foto')+'</button>';
      h+='</div>';
      // Campos
      h+='<div class="cfg-row"><span class="cfg-lbl">Nome</span><input class="cfginp" style="width:160px;text-align:right;" value="'+escH(a.nm)+'" onchange="CFG.ac['+i+'].nm=this.value;svCFG();buildAcList();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Marca</span><input class="cfginp" style="width:140px;text-align:right;" value="'+escH(a.marca||'')+'" placeholder="Opcional" onchange="CFG.ac['+i+'].marca=this.value;svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Dimensões</span><input class="cfginp" style="width:140px;text-align:right;" value="'+escH(a.dim||'')+'" placeholder="Ex: 30cm, Sob medida" onchange="CFG.ac['+i+'].dim=this.value;svCFG();"></div>';
      h+='<div class="cfg-row"><span class="cfg-lbl">Preço R$</span><input class="cfginp cfginp-w" type="number" value="'+(a.pr||0)+'" placeholder="0 = Consultar" onchange="CFG.ac['+i+'].pr=+this.value;svCFG();buildAcList();"></div>';
      h+='<div style="padding:8px 13px;border-top:1px solid #0c0c10;"><label style="font-size:.62rem;color:var(--t3);">Descrição</label><textarea style="width:100%;background:var(--s3);border:1px solid var(--bd2);border-radius:8px;color:var(--tx);padding:8px 10px;font-size:.78rem;font-family:Outfit,sans-serif;outline:none;resize:none;margin-top:4px;" rows="2" onchange="CFG.ac['+i+'].desc=this.value;svCFG();">'+escH(a.desc||'')+'</textarea></div>';
      h+='<div style="padding:9px 13px;display:flex;gap:6px;">';
      h+='<button class="cfgbtn" onclick="if('+i+'>0){var x=CFG.ac.splice('+i+',1)[0];CFG.ac.splice('+(i-1)+',0,x);svCFG();buildAcList();buildCfg();}">↑ Subir</button>';
      h+='<button class="cfgbtn" onclick="if('+(i+1)+'<CFG.ac.length){var x=CFG.ac.splice('+i+',1)[0];CFG.ac.splice('+(i+1)+',0,x);svCFG();buildAcList();buildCfg();}">↓ Descer</button>';
      h+='<button class="cfgdel" onclick="if(confirm(\'Remover '+escH(a.nm)+'?\')){CFG.ac.splice('+i+',1);svCFG();buildAcList();buildCfg();}">✕</button>';
      h+='</div>';
      h+='</div>';
    });
    h+='<button class="cfgadd" onclick="CFG.ac.push({id:\'ac_\'+Date.now(),nm:\'Novo Acessório\',marca:\'\',dim:\'\',pr:0,desc:\'\',photo:\'\'});svCFG();buildCfg();">+ Adicionar Acessório</button>';
  }
  // Add save confirmation button at bottom
  h+='<div style="padding:16px 17px 32px;"><button onclick="svCFG();toast(\'✓ Configurações salvas!\');syncSVDefsFromList();buildCatalog();renderAmbientes();" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--gold),var(--gold3));border:none;border-radius:12px;font-family:Outfit,sans-serif;font-size:.88rem;font-weight:900;color:#000;cursor:pointer;">✓ Salvar Configurações</button></div>';
  document.getElementById('cfgBody').innerHTML=h;
}
function importarDados(){
  var el=document.getElementById('cfgImport');
  var txt=el?el.value.trim():'';
  if(!txt)return;
  try{var d=JSON.parse(txt);if(d.cfg){CFG=d.cfg;localStorage.setItem('hr_cfg',JSON.stringify(CFG));}if(d.q)DB.q=d.q;if(d.j)DB.j=d.j;if(d.t)DB.t=d.t;DB.sv();toast('✓ Dados restaurados!');setTimeout(function(){location.reload();},800);}
  catch(e){toast('❌ Dados inválidos');}
}

// ═══ CONFIRM BANNER ═══
function showCB(q,onY,onN){document.getElementById('cbQ').textContent=q;document.getElementById('cbWrap').classList.add('on');cbYcb=onY;cbNcb=onN;var pg=document.getElementById('pg0');if(pg)pg.scrollTop=0;}
function hideCB(){document.getElementById('cbWrap').classList.remove('on');cbYcb=null;cbNcb=null;}

