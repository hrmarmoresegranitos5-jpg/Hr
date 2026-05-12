// ══════════════════════════════════
// CONFIGURAÇÕES, EMPRESA, PREÇOS
// ══════════════════════════════════

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
    h+='<div class="cfgsec"><div class="cfghd">📡 Sincronização Celular ↔ Tablet</div>';
    h+='<div style="padding:13px;">';
    h+='<div style="font-size:.76rem;color:var(--t2);line-height:1.65;margin-bottom:12px;">Use o mesmo <b>código</b> em todos os dispositivos para sincronizar dados em tempo real.</div>';
    var syncAtivo=SYNC.on||!!localStorage.getItem('hr_sync_code');
    if(syncAtivo){
      h+='<div style="background:#0a1f12;border:1px solid var(--grn);border-radius:9px;padding:11px 13px;margin-bottom:10px;display:flex;align-items:center;gap:8px;">';
      h+='<span style="font-size:1rem;">✅</span><div style="flex:1;"><div style="font-size:.8rem;font-weight:600;color:var(--grn);">Sincronização ativa</div><div style="font-size:.65rem;color:var(--t3);">Código: <b style="color:var(--gold2);">'+SYNC.code+'</b></div></div></div>';
      h+='<button class="btn btn-o" style="font-size:.78rem;padding:10px;margin-bottom:8px;" onclick="SYNC.push();toast(\'↑ Enviado!\')">↑ Enviar dados agora</button>';
      h+='<button class="btn btn-red" style="font-size:.78rem;padding:10px;" onclick="SYNC.stop();buildCfg();">Desativar sincronização</button>';
    } else {
      h+='<div style="display:flex;gap:8px;margin-bottom:8px;">';
      h+='<input id="syncCodeInp" class="cfginp" style="flex:1;text-align:left;" placeholder="Ex: HR2025, MeuNegocio123..." value="'+SYNC.code+'">';
      h+='<button class="btn btn-g btn-sm" onclick="var c=document.getElementById(\'syncCodeInp\').value.trim().replace(/\\s+/g,\'_\');if(!c){toast(\'Digite um código\');return;}SYNC.init(c);buildCfg();">Ativar</button>';
      h+='</div>';
      h+='<div style="font-size:.65rem;color:var(--t4);line-height:1.6;">⚠️ Requer internet. Use o mesmo código em todos os dispositivos.</div>';
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
function showCB(q,onY,onN){
  var _cbQ=document.getElementById('cbQ');
  var _cbW=document.getElementById('cbWrap');
  if(!_cbQ||!_cbW){console.error('showCB: #cbQ ou #cbWrap não encontrado');return;}
  _cbQ.textContent=q;
  _cbW.classList.add('on');
  cbYcb=onY;cbNcb=onN;
  var pg=document.getElementById('pg0');if(pg)pg.scrollTop=0;
}
function hideCB(){
  var _cbW=document.getElementById('cbWrap');
  if(_cbW)_cbW.classList.remove('on');
  cbYcb=null;cbNcb=null;
}

// ═══ UTILS ═══
function fm(v){return parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fd(s){try{var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return s||'';}}
function dDiff(s){try{var t=new Date(s+'T00:00:00');var n=new Date();n.setHours(0,0,0,0);return Math.ceil((t-n)/86400000);}catch(e){return 0;}}
function addD(s,n){try{var d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];}catch(e){return s;}}
function td(){return new Date().toISOString().split('T')[0];}
function lastEnd(){var a=DB.j.filter(function(j){return !j.done&&j.end;}).sort(function(a,b){return new Date(b.end)-new Date(a.end);});return a.length?a[0].end:null;}
// ═══════════════════════════════════════════════
// ORÇAMENTOS HISTÓRICO
// ═══════════════════════════════════════════════

var _orcFilter = '';

function renderOrc() {
  // Summary cards
  var total = DB.q.length;
  var totalVista = DB.q.reduce(function(s,q){return s+(q.vista||0);},0);
  var thisMonth = (new Date()).toISOString().slice(0,7);
  var mesCount = DB.q.filter(function(q){return (q.date||'').slice(0,7)===thisMonth;}).length;
  var sumEl = document.getElementById('orcSummary');
  if(sumEl) sumEl.innerHTML =
    '<div class="orc-sum-card"><div class="orc-sum-v">'+total+'</div><div class="orc-sum-l">Total</div></div>' +
    '<div class="orc-sum-card"><div class="orc-sum-v">'+mesCount+'</div><div class="orc-sum-l">Este mês</div></div>' +
    '<div class="orc-sum-card"><div class="orc-sum-v">R$ '+(totalVista/1000).toFixed(0)+'k</div><div class="orc-sum-l">Em orçamentos</div></div>';
  filterOrc();
}

function filterOrc() {
  _orcFilter = (document.getElementById('orcSearch')||{value:''}).value.trim().toLowerCase();
  var filtered = _orcFilter
    ? DB.q.filter(function(q){ return (q.cli||'').toLowerCase().indexOf(_orcFilter) >= 0; })
    : DB.q;
  buildOrcList(filtered);
}

function buildOrcList(list) {
  var el = document.getElementById('orcList');
  if(!el) return;
  if(!list.length) {
    el.innerHTML = '<div class="orc-empty"><div class="orc-empty-icon">📋</div>' +
      (_orcFilter ? 'Nenhum orçamento para "'+_orcFilter+'"' : 'Nenhum orçamento ainda.<br>Faça um orçamento para começar!') + '</div>';
    return;
  }
  var tipo_icons = {Cozinha:'🍳',Banheiro:'🚿',Lavabo:'🪴',Soleira:'🚪',Peitoril:'🏠',Escada:'📐',Fachada:'🏛️',Outro:'📦'};
  var h = '';
  list.forEach(function(q,idx) {
    var icon = tipo_icons[q.tipo]||'📦';
    var dateStr = q.date ? fd(q.date) : '';
    var pdsCount = (q.pds||[]).length + (q.sfPcs||[]).length;
    h += '<div class="qcard" id="qc-'+q.id+'" onclick="togQCard(\''+q.id+'\')">';
    // Head
    h += '<div class="qcard-head">';
    h +=   '<div class="qcard-badge">'+icon+'</div>';
    h +=   '<div class="qcard-info">';
    h +=     '<div class="qcard-cli">'+escH(q.cli)+'</div>';
    h +=     '<div class="qcard-meta">'+dateStr+' · '+q.tipo+' · '+escH(q.mat||'')+'</div>';
    h +=   '</div>';
    h +=   '<div class="qcard-val">R$ '+fm(q.vista)+'</div>';
    h +=   '<span class="qcard-chev">▼</span>';
    h += '</div>';
    // Body (hidden until expanded)
    h += '<div class="qcard-body">';
    // Pills
    h += '<div class="qcard-pills">';
    if(q.m2) h += '<div class="qpill gold">'+q.m2.toFixed(3)+' m²</div>';
    if(pdsCount) h += '<div class="qpill">'+pdsCount+' peça'+(pdsCount>1?'s':'')+'</div>';
    if(q.mat) h += '<div class="qpill">'+escH(q.mat)+'</div>';
    if(q.tel) h += '<div class="qpill">'+escH(q.tel)+'</div>';
    h += '</div>';
    // Detail table
    h += '<div class="qcard-detail">';
    if(q.pds&&q.pds.length) {
      q.pds.forEach(function(p){
        h += '<div class="qdr"><span class="k">'+escH(p.desc||'Peça')+'</span><span class="v">'+p.w+'×'+p.h+'cm'+(p.q>1?' ×'+p.q:'')+'</span></div>';
      });
    }
    if(q.sfPcs&&q.sfPcs.length) {
      q.sfPcs.forEach(function(p){
        h += '<div class="qdr"><span class="k">'+escH(p.l||'Sainha/Frontão')+'</span><span class="v">'+p.w+'ml×'+p.h+'cm'+(p.q>1?' ×'+p.q:'')+'</span></div>';
      });
    }
    if(q.acN&&q.acN.length) {
      h += '<div class="qdr"><span class="k">Serviços incluso</span><span class="v" style="font-size:.68rem;text-align:right;max-width:180px;">'+q.acN.join(', ')+'</span></div>';
    }
    if(q.cidade) h += '<div class="qdr"><span class="k">Cidade</span><span class="v">'+escH(q.cidade)+'</span></div>';
    if(q.end) h += '<div class="qdr"><span class="k">Endereço</span><span class="v" style="font-size:.72rem;text-align:right;max-width:180px;">'+escH(q.end)+'</span></div>';
    if(q.obs) h += '<div class="qdr"><span class="k">Obs.</span><span class="v grn" style="font-size:.72rem;max-width:180px;text-align:right;">'+escH(q.obs)+'</span></div>';
    h += '</div>';
    // Totals
    h += '<div class="qcard-total"><span class="k">À Vista (melhor)</span><span class="v">R$ '+fm(q.vista)+'</span></div>';
    // Buttons
    h += '<div class="qcard-btns">';
    h += '<button class="btn btn-g" onclick="orcEditar(\''+q.id+'\',event)">✏️ Editar</button>';
    h += '<button class="btn btn-o" onclick="orcCopiar(\''+q.id+'\',event)">📋 Copiar</button>';
    h += '<button class="btn btn-o" onclick="orcPDF(\''+q.id+'\',event)">📄 PDF</button>';
    h += '<button class="btn btn-contrato" data-cid="'+q.id+'" onclick="gerarContrId(this,event)">📜 Contrato</button>';
    h += '<button class="btn btn-red" onclick="orcDel(\''+q.id+'\',event)">🗑</button>';
    h += '</div>';
    h += '</div>'; // qcard-body
    h += '</div>'; // qcard
  });
  el.innerHTML = h;
}

function togQCard(id) {
  var el = document.getElementById('qc-'+id);
  if(el) el.classList.toggle('open');
}

function orcEditar(id, e){orcRefazer(id,e);}

function orcRefazer(id, e) {
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;

  // Preencher dados do cliente
  var cliEl=document.getElementById('oCliente'); if(cliEl)cliEl.value=q.cli||'';
  var telEl=document.getElementById('oTel'); if(telEl)telEl.value=q.tel||'';
  var cidEl=document.getElementById('oCidade'); if(cidEl)cidEl.value=q.cidade||'';
  var endEl=document.getElementById('oEnd'); if(endEl)endEl.value=q.end||'';
  var obsEl=document.getElementById('oObs'); if(obsEl)obsEl.value=q.obs||'';

  // Selecionar material
  var mat=CFG.stones.find(function(s){return s.nm===q.mat;});
  if(mat){selMat=mat.id;buildMat();}

  // Reconstruir ambientes
  ambientes=[];

  if(q.ambSnap&&q.ambSnap.length){
    // Orçamento novo: tem snapshot completo dos ambientes
    q.ambSnap.forEach(function(snap,idx){
      var ambId=Date.now()+idx;
      ambientes.push({
        id:ambId,
        tipo:snap.tipo||'Cozinha',
        pecas:snap.pecas.map(function(p){return {id:Date.now()+Math.random(),desc:p.desc||'',w:p.w||0,h:p.h||0,q:p.q||1};}) ,
        selCuba:snap.selCuba||null,
        svState:JSON.parse(JSON.stringify(snap.svState||{})),
        acState:JSON.parse(JSON.stringify(snap.acState||{}))
      });
    });
  } else {
    // Orçamento antigo: reconstruir do que temos
    var tipos=(q.tipo||'Cozinha').split('+');
    tipos.forEach(function(tipo,idx){
      tipo=tipo.trim();
      var ambId=Date.now()+idx;
      var pecas=[];
      if(idx===0&&q.pds&&q.pds.length){
        q.pds.forEach(function(p){
          pecas.push({id:Date.now()+Math.random(),desc:p.desc||'',w:p.w||0,h:p.h||0,q:p.q||1});
        });
      } else {
        pecas.push({id:Date.now()+Math.random(),desc:'',w:0,h:0,q:1});
      }
      ambientes.push({id:ambId,tipo:tipo,pecas:pecas,selCuba:null,svState:{},acState:{}});
    });
  }

  if(!ambientes.length)addAmbiente();

  renderAmbientes();
  go(0);
  setTimeout(function(){document.getElementById('pg0').scrollTop=0;},100);
  toast('✓ Orçamento carregado! Edite e recalcule.');
}

function orcCopiar(id, e) {
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;
  var pTxt = (q.pds||[]).map(function(p){return '• '+(p.desc||'Peça')+' — '+p.w+'×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
  if(q.sfPcs&&q.sfPcs.length) pTxt += '\n'+(q.sfPcs||[]).map(function(p){return '• '+p.l+' — '+p.w+'ml×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
  var aTxt = (q.acN&&q.acN.length) ? (q.acN||[]).map(function(a){return '• '+a;}).join('\n') : '• Acabamento profissional';
  var txt = 'HR MARMORES E GRANITOS\nORCAMENTO — '+(q.cli||'Cliente')+'\n\nMaterial: '+(q.mat||'')+'\n\n'+(q.tipo||'Projeto')+':\n'+pTxt+'\n\nIncluso:\n'+aTxt+'\n• Fabricacao e acabamento completo\n\n==================\nPARCELADO\nR$ '+fm(q.parc)+' — ate 8x de R$ '+fm(q.p8||0)+'\n\nA VISTA\nR$ '+fm(q.vista)+'\n==================\n'+CFG.emp.nome+'\n'+CFG.emp.tel;
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(txt).then(function(){toast('✓ Copiado!');}).catch(function(){_copiarFallback(txt);});return;}
  _copiarFallback(txt);
}




function orcPDF(id, e) {
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;
  pendQ = q;
  gerarPDF();
}

function orcDel(id, e) {
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;
  if(!confirm('Excluir orçamento de '+q.cli+'?')) return;
  DB.q = DB.q.filter(function(x){return x.id!=id;});
  DB.sv();
  renderOrc();
  toast('✓ Excluído');
}