// ═══════════════════════════════════════════════
// ── GERADOR DE PDF PARA TÚMULOS — VERSÃO 3.0 ──
function gerarPDFTumulo(q){
  if(typeof html2canvas==='undefined'||typeof window.jspdf==='undefined'){
    toast('Carregando bibliotecas PDF...');
    var s1=document.createElement('script');
    s1.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s1.onload=function(){
      var s2=document.createElement('script');
      s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s2.onload=function(){gerarPDFTumulo(q);};
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    return;
  }

  var emp=CFG.emp;
  var tum=(q.tum&&typeof q.tum==='object')?q.tum:{};
  if(!tum.dims||typeof tum.dims!=='object') tum.dims={};
  var res=q.tumCalc||{};
  var pdfCount=parseInt(localStorage.getItem('hr_pdf_count')||'0',10);
  var orcNum='ORC-'+String(pdfCount).padStart(4,'0');
  localStorage.setItem('hr_pdf_count',pdfCount+1);
  var fileName='Orcamento_'+orcNum+'_Tumulo_'+q.cli.replace(/[^a-zA-Z0-9]/g,'_')+'.pdf';

  var TIPOS_LABEL={simples:'Túmulo Simples',gaveta_dupla:'Gaveta Dupla',gaveta_tripla:'Gaveta Tripla',
    capela:'Capela / Monumento',revestimento:'Revestimento / Reforma',reforma:'Reforma Completa',jazigo:'Jazigo — Estrutura Completa'};
  var tipoLabel=TIPOS_LABEL[tum.tipo]||tum.tipo||'Túmulo';
  var mat=CFG.stones.find(function(s){return s.id===tum.stoneId;})||{nm:q.mat||'',tx:'',photo:''};
  var vista=q.vista||res.venda||0;
  var parc=vista*1.12;
  var p8=parc/8;
  var ent=vista*0.5;
  var economia=parc-vista;

  function fd(d){if(!d)return new Date().toLocaleDateString('pt-BR');try{return new Date(d).toLocaleDateString('pt-BR');}catch(e){return d;}}

  var F="font-family:'Outfit',Arial,sans-serif;";
  var d=tum.dims||{};
  var compartStr=(tum.compartimentos||tum.gavetas||1);
  var compartLabel=compartStr>1?compartStr+' gavetas':compartStr+' gaveta';
  var dimGeral='';
  if(d.comp||d.larg){
    dimGeral=(d.comp?d.comp+' cm':'—')+' × '+(d.larg?d.larg+' cm':'—');
    if(d.alt||d.altEst) dimGeral+=' × '+(d.alt||d.altEst)+' cm';
  }

  // ─── Cabeçalho mini para pág 2+ ───────────────────────────────────
  function miniHeader(secLabel, pgLabel){
    return ''
      +'<div style="'+F+'background:#0f0c00;padding:10px 32px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
        +'<div style="display:flex;align-items:center;gap:14px;">'
          +'<div style="font-size:13px;font-weight:900;color:#C9A84C;letter-spacing:-0.3px;">'+emp.nome+'</div>'
          +'<div style="width:1px;height:16px;background:rgba(201,168,76,0.25);"></div>'
          +'<div style="font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:700;">'+secLabel+'</div>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:10px;">'
          +'<div style="font-size:8px;font-weight:700;color:rgba(201,168,76,0.6);">'+orcNum+'</div>'
          +'<div style="font-size:7px;color:rgba(255,255,255,0.25);">'+pgLabel+'</div>'
        +'</div>'
      +'</div>'
      +'<div style="height:2px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);flex-shrink:0;"></div>';
  }

  // ─── Rodapé mini ──────────────────────────────────────────────────
  function miniFooter(pgLabel){
    return ''
      +'<div style="height:2px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);flex-shrink:0;"></div>'
      +'<div style="'+F+'background:#0f0c00;padding:7px 32px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
        +'<div style="font-size:8px;color:rgba(255,255,255,0.25);">'+emp.end+' — '+emp.cidade+'</div>'
        +'<div style="font-size:8px;color:rgba(201,168,76,0.5);font-weight:700;">'+orcNum+' · '+pgLabel+'</div>'
      +'</div>';
  }

  function sh(t){
    return '<div style="'+F+'display:flex;align-items:center;gap:10px;margin:0 0 14px;">'
      +'<div style="width:3px;height:18px;background:#C9A84C;border-radius:2px;flex-shrink:0;"></div>'
      +'<span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#7a4400;font-weight:900;">'+t+'</span>'
      +'<div style="flex:1;height:1px;background:#e8dfc4;"></div>'
      +'</div>';
  }

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 1 — CAPA COMPLETA
  // ══════════════════════════════════════════════════════════════════

  // ── Cabeçalho de capa ─────────────────────────────────────────────
  var capaCabecalho=''
    +'<div style="height:5px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);flex-shrink:0;"></div>'
    +'<div style="'+F+'background:#0f0c00;padding:18px 36px 16px;display:flex;justify-content:space-between;align-items:flex-end;flex-shrink:0;">'
      +'<div>'
        +'<div style="font-size:7px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(201,168,76,0.4);margin-bottom:5px;font-weight:700;">PROJETO FUNERÁRIO PREMIUM</div>'
        +'<div style="font-size:26px;font-weight:900;color:#C9A84C;letter-spacing:-0.5px;line-height:1;">'+emp.nome+'</div>'
        +'<div style="font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.3);margin-top:3px;">MÁRMORE · GRANITO · QUARTZITO</div>'
      +'</div>'
      +'<div style="text-align:right;">'
        +'<div style="font-size:12px;color:#C9A84C;font-weight:800;margin-bottom:2px;">'+emp.tel+'</div>'
        +(emp.ig?'<div style="font-size:9px;color:rgba(201,168,76,0.4);">'+emp.ig+'</div>':'')
        +'<div style="font-size:8px;color:rgba(255,255,255,0.18);margin-top:1px;">'+emp.cidade+'</div>'
      +'</div>'
    +'</div>'
    +'<div style="'+F+'background:#f5f0e5;border-top:1px solid #ddd3b0;border-bottom:2px solid #C9A84C;padding:6px 36px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
      +'<div style="display:flex;gap:20px;align-items:center;">'
        +'<div><div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;">ORÇAMENTO</div>'
          +'<div style="font-size:11px;font-weight:900;color:#7a4400;">'+orcNum+'</div></div>'
        +'<div style="width:1px;height:22px;background:#ddd3b0;"></div>'
        +'<div><div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;">EMISSÃO</div>'
          +'<div style="font-size:10px;font-weight:700;color:#555;">'+fd(q.dt||q.date)+'</div></div>'
        +'<div style="width:1px;height:22px;background:#ddd3b0;"></div>'
        +'<div><div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;">TIPO DE PROJETO</div>'
          +'<div style="font-size:10px;font-weight:700;color:#555;">'+tipoLabel+'</div></div>'
        +'<div style="width:1px;height:22px;background:#ddd3b0;"></div>'
        +'<div><div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;">VALIDADE</div>'
          +'<div style="font-size:10px;font-weight:700;color:#555;">7 dias</div></div>'
      +'</div>'
    +'</div>';

  // ── Bloco cliente ─────────────────────────────────────────────────
  var capaCliente=''
    +'<div style="'+F+'background:#fdfaf3;padding:16px 36px 14px;border-bottom:1px solid #ede5cc;flex-shrink:0;">'
      +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:6px;">ORÇAMENTO PREPARADO EXCLUSIVAMENTE PARA</div>'
      +'<div style="font-size:28px;font-weight:900;color:#1a1a1a;line-height:1.1;margin-bottom:4px;">'+escH(q.cli)+'</div>'
      +(tum.falecido?'<div style="font-size:11px;color:#888;margin-top:2px;">Em memória de: <strong style="color:#7a4400;">'+escH(tum.falecido)+'</strong></div>':'')
      +(tum.cemiterio?'<div style="font-size:10px;color:#aaa;margin-top:2px;">📍 '+escH(tum.cemiterio)+(tum.quadra?' — Quadra '+escH(tum.quadra):'')+(tum.lote?', Lote '+escH(tum.lote):'')+'</div>':'')
    +'</div>';

  // ── Resumo do projeto (4 cards) ───────────────────────────────────
  var capaResumo=''
    +'<div style="'+F+'padding:14px 36px 10px;flex-shrink:0;">'
      +sh('Resumo do Projeto')
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">'
        // Card material
        +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.35);border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:6px;">MATERIAL</div>'
          +'<div style="font-size:16px;font-weight:900;color:#C9A84C;line-height:1.2;margin-bottom:3px;">'+(mat.nm||q.mat||'—')+'</div>'
          +'<div style="font-size:9px;color:rgba(255,255,255,0.3);">'+(mat.cat||'Pedra Natural')+(mat.fin?' · '+mat.fin:'')+'</div>'
        +'</div>'
        // Card dimensionamento
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:6px;">DIMENSIONAMENTO</div>'
          +'<div style="font-size:22px;font-weight:900;color:#1a1a1a;line-height:1;">'+(res.m2Total?(+res.m2Total).toFixed(3):'—')+'</div>'
          +'<div style="font-size:9px;color:#999;margin-top:2px;">área total de pedra</div>'
          +(dimGeral?'<div style="font-size:8.5px;color:#777;margin-top:6px;font-weight:700;">'+dimGeral+'</div>':'')
          +'<div style="font-size:9px;color:#999;margin-top:4px;">'+compartLabel+'</div>'
        +'</div>'
        // Card tipo
        +'<div style="background:#0f0c00;border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:6px;">TIPO DE JAZIGO</div>'
          +'<div style="font-size:15px;font-weight:900;color:#fff;line-height:1.3;margin-bottom:3px;">'+tipoLabel+'</div>'
          +(dimGeral?'<div style="font-size:8.5px;color:rgba(255,255,255,0.35);">'+dimGeral+'</div>':'')
        +'</div>'
      +'</div>'
    +'</div>';

  // ── Bloco investimento ────────────────────────────────────────────
  var capaInvestimento=''
    +'<div style="'+F+'padding:10px 36px 0;flex-shrink:0;">'
      +'<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:12px;overflow:hidden;">'
        +'<div style="padding:8px 20px;border-bottom:1px solid rgba(201,168,76,0.2);display:flex;justify-content:space-between;align-items:center;">'
          +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:900;">INVESTIMENTO DO PROJETO</div>'
          +'<div style="font-size:7px;background:rgba(201,168,76,0.12);color:rgba(201,168,76,0.7);padding:3px 10px;border-radius:20px;letter-spacing:1px;font-weight:700;">'+emp.nome.toUpperCase()+'</div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">'
          +'<div style="padding:16px 22px;border-right:1px solid rgba(201,168,76,0.15);">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:6px;">À VISTA</div>'
            +'<div style="font-size:32px;font-weight:900;color:#C9A84C;line-height:1;margin-bottom:8px;">R$ '+fm(vista)+'</div>'
            +'<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(46,120,46,0.2);border:1px solid rgba(100,180,100,0.35);color:#7dcc7d;font-size:8px;font-weight:900;padding:4px 12px;border-radius:20px;">▼ Economize R$ '+fm(economia)+'</div>'
          +'</div>'
          +'<div style="padding:16px 22px;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:6px;">PARCELADO EM ATÉ 8×</div>'
            +'<div style="font-size:24px;font-weight:900;color:#fff;line-height:1;margin-bottom:5px;">8× R$ '+fm(p8)+'</div>'
            +'<div style="font-size:9px;color:rgba(255,255,255,0.35);">Total parcelado: R$ '+fm(parc)+'</div>'
            +'<div style="font-size:8.5px;color:rgba(201,168,76,0.45);margin-top:3px;">ENTRADA 50%: R$ '+fm(ent)+' + saldo na entrega</div>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>';

  // ── Foto de referência ────────────────────────────────────────────
  var capaFoto='';
  if(tum.foto||q.fotoTumulo){
    var fotoSrc=tum.foto||q.fotoTumulo;
    capaFoto=''
      +'<div style="padding:10px 36px 0;flex-shrink:0;">'
        +'<div style="border-radius:8px;overflow:hidden;border:1px solid #ddd3b0;">'
          +'<img src="'+fotoSrc+'" style="width:100%;height:130px;object-fit:cover;display:block;" crossorigin="anonymous"/>'
        +'</div>'
      +'</div>';
  }

  // ── Rodapé de capa ────────────────────────────────────────────────
  var capaRodape=''
    +'<div style="flex:1;"></div>'
    +'<div style="height:2px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);flex-shrink:0;"></div>'
    +'<div style="'+F+'background:#0f0c00;padding:8px 36px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
      +'<div style="font-size:8px;color:rgba(255,255,255,0.2);">'+emp.end+' — '+emp.cidade+'</div>'
      +'<div style="font-size:8px;color:rgba(201,168,76,0.5);font-weight:700;">'+orcNum+' · Pg 1/4</div>'
    +'</div>';

  var pag1=''
    +'<div id="pdfPag1" style="width:794px;height:1123px;'+F+'background:#fff;color:#1a1a1a;display:flex;flex-direction:column;overflow:hidden;">'
      +capaCabecalho
      +capaCliente
      +capaResumo
      +capaInvestimento
      +capaFoto
      +capaRodape
    +'</div>';

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 2 — DETALHES TÉCNICOS
  // ══════════════════════════════════════════════════════════════════

  // ── Especificações ────────────────────────────────────────────────
  var especHtml=''
    +sh('Especificações do Jazigo')
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px;text-align:center;">'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:4px;">COMP.</div>'
        +'<div style="font-size:24px;font-weight:900;color:#1a1a1a;line-height:1;">'+(d.comp||'—')+'</div>'
        +'<div style="font-size:9px;color:#bbb;margin-top:2px;">cm</div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px;text-align:center;">'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:4px;">LARG.</div>'
        +'<div style="font-size:24px;font-weight:900;color:#1a1a1a;line-height:1;">'+(d.larg||'—')+'</div>'
        +'<div style="font-size:9px;color:#bbb;margin-top:2px;">cm</div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px;text-align:center;">'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:4px;">COMPART.</div>'
        +'<div style="font-size:24px;font-weight:900;color:#1a1a1a;line-height:1;">'+compartStr+'</div>'
        +'<div style="font-size:9px;color:#bbb;margin-top:2px;">gaveta'+(compartStr>1?'s':'')+'</div>'
      +'</div>'
      +'<div style="background:#0f0c00;border-radius:10px;padding:14px;text-align:center;">'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:4px;">TOTAL PEDRA</div>'
        +'<div style="font-size:20px;font-weight:900;color:#C9A84C;line-height:1;">'+(res.m2Total?(+res.m2Total).toFixed(3):'—')+'</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:2px;">m²</div>'
      +'</div>'
    +'</div>';

  // ── Material selecionado ──────────────────────────────────────────
  var matFotoHtml='';
  if(mat.photo) matFotoHtml='background-image:url(\''+mat.photo+'\');background-size:cover;background-position:center;';

  var matDetalheHtml=''
    +sh('Material Selecionado')
    +'<div style="border:2px solid #C9A84C;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
      +'<div style="height:72px;position:relative;overflow:hidden;'+(mat.photo?matFotoHtml:'background:#0f0c00;')+'">'
        +'<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,0.8) 0%,rgba(0,0,0,0.35) 60%,rgba(0,0,0,0.05) 100%);">'
          +'<div style="position:absolute;left:18px;top:50%;transform:translateY(-50%);">'
            +'<div style="font-size:6.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.7);font-weight:900;margin-bottom:4px;">MATERIAL SELECIONADO</div>'
            +'<div style="font-size:20px;font-weight:900;color:#C9A84C;line-height:1;">'+(mat.nm||q.mat||'—')+'</div>'
            +(mat.cat?'<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:2px;">'+mat.cat+(mat.fin?' · '+mat.fin:'')+'</div>':'')
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 2fr;background:#fff;">'
        +'<div style="padding:10px 14px;border-right:1px solid #e8dfc4;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;margin-bottom:3px;font-weight:900;">CATEGORIA</div>'
          +'<div style="font-size:12px;font-weight:700;color:#1a1a1a;">'+(mat.cat||'—')+'</div>'
        +'</div>'
        +'<div style="padding:10px 14px;border-right:1px solid #e8dfc4;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;margin-bottom:3px;font-weight:900;">ACABAMENTO</div>'
          +'<div style="font-size:12px;font-weight:700;color:#1a1a1a;">'+(mat.fin||'Polida')+'</div>'
        +'</div>'
        +'<div style="padding:10px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;margin-bottom:3px;font-weight:900;">CARACTERÍSTICAS</div>'
          +'<div style="font-size:9.5px;color:#666;line-height:1.5;">'+(mat.desc||'Material natural de alta qualidade, durável e com excelente acabamento para projetos funerários.')+'</div>'
        +'</div>'
      +'</div>'
    +'</div>';

  // ── Peças e dimensões ─────────────────────────────────────────────
  var PECAS_LABEL={
    tampo:'Tampo (Tampa Superior)',tampo2:'Tampa 2ª Gaveta',tampo3:'Tampa 3ª Gaveta',
    frente:'Frente / Frontal',lateral_d:'Lateral Direita',lateral_e:'Lateral Esquerda',
    fundo:'Fundo / Tardoz',base:'Base / Soleira',cruz:'Cruz / Símbolo',
    gaveta:'Gaveta',gaveta2:'2ª Gaveta',gaveta3:'3ª Gaveta',painel:'Painel de Fundo',
    degrau:'Degrau / Piso',chapim:'Chapim / Arremate',lateral_int:'Lateral Interna',
    peitoril:'Peitoril',coluna:'Coluna',arco:'Arco / Verga',
  };

  var pecasList=res.pecas||(tum.pecas)||[];
  if((!pecasList||!pecasList.length)&&res.pecasCalc&&res.pecasCalc.length){
    pecasList=res.pecasCalc.map(function(pc){
      var dim=pc.dim||'';
      var match=dim.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
      var w=match?parseFloat(match[1])/100:0;
      var h=match?parseFloat(match[2])/100:0;
      return {nome:pc.nm||pc.nome||pc.desc||'Peça',qtd:pc.qt||pc.q||pc.qtd||1,comp:w,larg:h,m2:pc.m2||0,dims:dim};
    });
  }
  if(!pecasList||!pecasList.length){
    var dd2=tum.dims||{};
    var comp2=parseFloat(dd2.comp)||0;
    var larg2=parseFloat(dd2.larg)||0;
    var alt2=parseFloat(dd2.alt||dd2.altEst)||0;
    var esp2=parseFloat(dd2.esp||dd2.espTampa)||0.02;
    var tipo2=tum.tipo||'simples';
    var pecasAuto=[];
    if(comp2&&larg2){
      pecasAuto.push({id:'tampo',comp:comp2,larg:larg2,esp:esp2,qtd:1});
      if(alt2) pecasAuto.push({id:'frente',comp:comp2,larg:alt2,esp:esp2,qtd:1});
      if(alt2&&larg2) pecasAuto.push({id:'lateral_d',comp:larg2,larg:alt2,esp:esp2,qtd:1});
      if(alt2&&larg2) pecasAuto.push({id:'lateral_e',comp:larg2,larg:alt2,esp:esp2,qtd:1});
      if(alt2&&comp2) pecasAuto.push({id:'fundo',comp:comp2,larg:alt2,esp:esp2,qtd:1});
      pecasAuto.push({id:'base',comp:comp2,larg:larg2,esp:esp2,qtd:1});
      if(tipo2==='gaveta_dupla') pecasAuto.push({id:'gaveta',comp:comp2,larg:larg2,esp:esp2,qtd:2});
      if(tipo2==='gaveta_tripla') pecasAuto.push({id:'gaveta',comp:comp2,larg:larg2,esp:esp2,qtd:3});
    }
    pecasList=pecasAuto;
  }

  var pecasRows='';
  var totalM2=0;
  if(pecasList&&pecasList.length){
    pecasList.forEach(function(p,i){
      var nm=p.nome||(PECAS_LABEL[p.id]||p.id||('Peça '+(i+1)));
      var qtd=parseFloat(p.qtd)||1;
      var c=parseFloat(p.comp||p.comprimento)||0;
      var l=parseFloat(p.larg||p.largura)||0;
      var e=parseFloat(p.esp||p.espessura)||0;
      var m2=parseFloat(p.m2)||(c&&l?(c*l*qtd):0);
      totalM2+=m2;
      var dimStr='';
      if(c&&l){
        var cDisp=c>10?c.toFixed(0):Math.round(c*100);
        var lDisp=l>10?l.toFixed(0):Math.round(l*100);
        dimStr=cDisp+' × '+lDisp+' cm';
        if(e){ var eDisp=e>5?e.toFixed(0):Math.round(e*100); dimStr+=' esp.'+eDisp+'cm'; }
      } else if(p.dims){ dimStr=p.dims; }
      var bg=i%2===0?'#fff':'#faf7f0';
      pecasRows+=''
        +'<tr>'
          +'<td style="padding:8px 14px;background:'+bg+';border-bottom:1px solid #f0e8d8;">'
            +'<div style="display:flex;align-items:center;gap:9px;">'
              +'<div style="background:#0f0c00;color:#C9A84C;font-size:8px;font-weight:900;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+(i+1)+'</div>'
              +'<div style="font-size:12px;font-weight:600;color:#1a1a1a;">'+escH(nm)+'</div>'
            +'</div>'
          +'</td>'
          +'<td style="padding:8px 14px;background:'+bg+';border-bottom:1px solid #f0e8d8;font-size:11px;color:#555;text-align:center;white-space:nowrap;">'+escH(dimStr)+'</td>'
          +'<td style="padding:8px 14px;background:'+bg+';border-bottom:1px solid #f0e8d8;font-size:11px;color:#888;text-align:center;">'+(qtd>1?'×'+qtd:'—')+'</td>'
          +'<td style="padding:8px 14px;background:'+bg+';border-bottom:1px solid #f0e8d8;font-size:12px;text-align:right;font-weight:700;color:#7a4400;">'+(m2?m2.toFixed(3)+' m²':'—')+'</td>'
        +'</tr>';
    });
    pecasRows+=''
      +'<tr style="background:#f5f0e5;">'
        +'<td colspan="3" style="padding:10px 14px;font-size:9px;font-weight:900;color:#7a4400;letter-spacing:1.5px;text-transform:uppercase;">TOTAL DE PEDRA</td>'
        +'<td style="padding:10px 14px;text-align:right;font-size:14px;font-weight:900;color:#7a4400;">'+totalM2.toFixed(3)+' m²</td>'
      +'</tr>';
  }

  var secaoPecasHtml='';
  if(pecasRows){
    secaoPecasHtml=sh('Peças e Dimensões')
      +'<div style="border:1px solid #e0d8c8;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
        +'<table style="width:100%;border-collapse:collapse;">'
          +'<thead><tr style="background:#0f0c00;">'
            +'<th style="padding:10px 14px;text-align:left;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">PEÇA / DESCRIÇÃO</th>'
            +'<th style="padding:10px 14px;text-align:center;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">DIMENSÕES</th>'
            +'<th style="padding:10px 14px;text-align:center;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">QTD</th>'
            +'<th style="padding:10px 14px;text-align:right;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">M²</th>'
          +'</tr></thead>'
          +'<tbody>'+pecasRows+'</tbody>'
        +'</table>'
      +'</div>';
  }

  // ── Acabamentos ───────────────────────────────────────────────────
  var acabList=tum.acabamentos||[];
  var ACAB_LABELS={
    molduras:'Molduras decorativas',pingadeiras:'Pingadeiras',lapide:'Lápide personalizada',
    foto_porcelana:'Foto em porcelana',cruz:'Cruz',polimento:'Polimento profissional',
    resina:'Tratamento com resina',jateamento:'Jateamento',laser:'Gravação a laser',
    florao:'Florão em bronze'
  };
  var ACAB_DESC={
    molduras:'Adorno em relevo ao redor da estrutura.',
    pingadeiras:'Proteção contra água nas bordas.',
    lapide:'Inscrita com nome, datas e homenagem.',
    foto_porcelana:'Foto gravada em porcelana de alta durabilidade.',
    cruz:'Cruz em granito ou mármore instalada no topo.',
    polimento:'Acabamento espelhado em toda a superfície.',
    resina:'Proteção com resina epóxi impermeabilizante.',
    jateamento:'Textura jateada para contraste estético.',
    laser:'Inscrições e ornamentos gravados a laser.',
    florao:'Ornamento decorativo em bronze.'
  };

  var acabHtml='';
  if(acabList.length){
    var todoAcab=[
      'polimento','molduras','lapide','foto_porcelana','cruz',
      'resina','jateamento','laser','florao','pingadeiras'
    ];
    acabHtml=sh('Acabamentos e Opcionais')
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">';
    todoAcab.forEach(function(a){
      var ativo=acabList.indexOf(a)>=0;
      var lbl=ACAB_LABELS[a]||a;
      var desc=ACAB_DESC[a]||'';
      acabHtml+=''
        +'<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:'+(ativo?'#fdfaf3':'#f8f8f8')+';border:1px solid '+(ativo?'#C9A84C':'#e8e8e8')+';border-radius:8px;">'
          +'<div style="width:20px;height:20px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;'+(ativo?'background:#0f0c00;color:#C9A84C;':'background:#eee;color:#ccc;')+'">'+( ativo?'✓':'○')+'</div>'
          +'<div style="flex:1;min-width:0;">'
            +'<div style="font-size:11px;font-weight:'+(ativo?'700':'500')+';color:'+(ativo?'#1a1a1a':'#bbb')+';line-height:1.2;">'+lbl+'</div>'
            +(ativo&&desc?'<div style="font-size:8.5px;color:#888;margin-top:2px;">'+desc+'</div>':'')
            +(ativo?'<div style="font-size:7.5px;color:#C9A84C;font-weight:900;margin-top:3px;text-transform:uppercase;letter-spacing:1px;">INCLUSO</div>':'')
          +'</div>'
        +'</div>';
    });
    acabHtml+='</div>';
  }

  // ── Cards de acabamento da pedra ──────────────────────────────────
  var acabPedraHtml='';
  if(tum.acabPedra||tum.acabamento||mat.fin){
    acabPedraHtml=''
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:8px;padding:10px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:4px;">ACABAMENTO DA PEDRA</div>'
          +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+(tum.acabPedra||tum.acabamento||'4 laterais')+'</div>'
          +'<div style="font-size:8.5px;color:#999;margin-top:2px;">padrão de toda a superfície</div>'
        +'</div>'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:8px;padding:10px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:4px;">MATERIAL</div>'
          +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+(mat.nm||q.mat||'—')+'</div>'
          +'<div style="font-size:8.5px;color:#999;margin-top:2px;">'+(mat.cat||'Pedra natural')+'</div>'
        +'</div>'
      +'</div>';
  }

  var obsHtml='';
  if(tum.obs){
    obsHtml='<div style="background:#fffbf0;border-left:3px solid #C9A84C;padding:10px 14px;border-radius:0 7px 7px 0;margin-bottom:12px;">'
      +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;margin-bottom:3px;font-weight:900;">OBSERVAÇÕES</div>'
      +'<div style="font-size:10px;color:#555;line-height:1.6;">'+escH(tum.obs)+'</div>'
    +'</div>';
  }

  var pag2=''
    +'<div id="pdfPag2" style="width:794px;height:1123px;'+F+'background:#fff;color:#1a1a1a;display:flex;flex-direction:column;overflow:hidden;">'
      +miniHeader('DETALHES DO PROJETO','Pg 2/4')
      +'<div style="padding:18px 36px 14px;flex:1;overflow:hidden;">'
        +especHtml
        +secaoPecasHtml
        +matDetalheHtml
      +'</div>'
      +miniFooter('Pg 2/4')
    +'</div>';

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 3 — PROPOSTA DE INVESTIMENTO + ACABAMENTOS
  // ══════════════════════════════════════════════════════════════════

  var propHero=''
    +'<div style="background:linear-gradient(135deg,#0f0c00 0%,#1c1500 60%,#261c00 100%);padding:28px 36px 24px;text-align:center;flex-shrink:0;">'
      +'<div style="font-size:7px;letter-spacing:4px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:900;margin-bottom:8px;">PROPOSTA EXCLUSIVA PARA</div>'
      +'<div style="font-size:32px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:4px;">'+escH(q.cli)+'</div>'
      +'<div style="font-size:10px;color:rgba(255,255,255,0.3);">'+orcNum+' · Emitido em '+fd(q.dt||q.date)+'</div>'
    +'</div>';

  var propValores=''
    +'<div style="padding:18px 36px 0;flex-shrink:0;">'
      +'<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:14px;overflow:hidden;">'
        +'<div style="text-align:center;padding:20px 24px 14px;border-bottom:1px solid rgba(201,168,76,0.2);">'
          +'<div style="font-size:7px;letter-spacing:4px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:8px;">À VISTA — MELHOR OPÇÃO</div>'
          +'<div style="font-size:46px;font-weight:900;color:#C9A84C;line-height:1;margin-bottom:10px;">R$ '+fm(vista)+'</div>'
          +'<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(46,120,46,0.2);border:1px solid rgba(100,180,100,0.35);color:#7dcc7d;font-size:9px;font-weight:900;padding:5px 16px;border-radius:20px;">▼ Você economiza R$ '+fm(economia)+' pagando à vista</div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">'
          +'<div style="padding:14px 24px;border-right:1px solid rgba(201,168,76,0.12);text-align:center;">'
            +'<div style="font-size:6.5px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:6px;">PARCELADO</div>'
            +'<div style="font-size:26px;font-weight:900;color:#fff;line-height:1;margin-bottom:4px;">8× R$ '+fm(p8)+'</div>'
            +'<div style="font-size:9px;color:rgba(255,255,255,0.25);">Total parcelado: R$ '+fm(parc)+'</div>'
          +'</div>'
          +'<div style="padding:14px 24px;text-align:center;">'
            +'<div style="font-size:6.5px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:6px;">ENTRADA — 50%</div>'
            +'<div style="font-size:26px;font-weight:900;color:#fff;line-height:1;margin-bottom:4px;">R$ '+fm(ent)+'</div>'
            +'<div style="font-size:9px;color:rgba(255,255,255,0.25);">na assinatura / medição</div>'
          +'</div>'
        +'</div>'
        +'<div style="padding:8px 24px;border-top:1px solid rgba(201,168,76,0.1);text-align:center;">'
          +'<div style="font-size:8.5px;color:rgba(255,255,255,0.2);">COMPARATIVO &nbsp;·&nbsp; À vista: R$ '+fm(vista)+' &nbsp;·&nbsp; Parcelado: R$ '+fm(parc)+' &nbsp;·&nbsp; Economia: <span style="color:#7dcc7d;">R$ '+fm(economia)+'</span></div>'
        +'</div>'
      +'</div>'
    +'</div>';

  var propPagamento=''
    +'<div style="padding:14px 36px 0;flex-shrink:0;">'
      +sh('Condições de Pagamento')
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:4px;">1ª PARCELA — ENTRADA</div>'
          +'<div style="font-size:22px;font-weight:900;color:#C9A84C;margin-bottom:4px;">R$ '+fm(ent)+'</div>'
          +'<div style="font-size:9.5px;color:#888;">Na assinatura do contrato e medição em campo</div>'
        +'</div>'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#bca060;font-weight:900;margin-bottom:4px;">2ª PARCELA — ENTREGA</div>'
          +'<div style="font-size:22px;font-weight:900;color:#C9A84C;margin-bottom:4px;">R$ '+fm(ent)+'</div>'
          +'<div style="font-size:9.5px;color:#888;">Na entrega e instalação completa no cemitério</div>'
        +'</div>'
      +'</div>'
    +'</div>';

  var pag3=''
    +'<div id="pdfPag3" style="width:794px;height:1123px;'+F+'background:#fff;color:#1a1a1a;display:flex;flex-direction:column;overflow:hidden;">'
      +miniHeader('PROPOSTA DE INVESTIMENTO','Pg 3/4')
      +propHero
      +propValores
      +propPagamento
      +(acabHtml?'<div style="padding:14px 36px 0;flex:1;">'+acabHtml+'</div>':('<div style="flex:1;padding:14px 36px 0;">'+acabPedraHtml+obsHtml+'</div>'))
      +miniFooter('Pg 3/4')
    +'</div>';

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 4 — NOSSA EMPRESA
  // ══════════════════════════════════════════════════════════════════

  var difsHtml=sh('Por que Escolher a HR Mármores?')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">'
      +[
        {ic:'🏛️',t:'Tradição e Experiência',d:'Anos de dedicação ao mercado funerário, com centenas de projetos entregues com excelência.'},
        {ic:'📐',t:'Medição em Campo',d:'Visita técnica inclusa para conferência e aprovação definitiva das medidas antes da fabricação.'},
        {ic:'⚙️',t:'Fabricação Própria',d:'Maquinário de precisão milimétrica para corte e usinagem das peças em granito e mármore.'},
        {ic:'🚛',t:'Instalação Completa',d:'Nossa equipe realiza a entrega, instalação e nivelamento. Vedação profissional inclusa.'},
        {ic:'🛡️',t:'Garantia Total',d:'Garantia contra defeitos de fabricação e instalação. Suporte pós-entrega para qualquer ajuste.'},
        {ic:'⭐',t:'Projeto Personalizado',d:'Cada jazigo é único. Desenvolvemos o projeto conforme as necessidades e desejos da família.'},
      ].map(function(x){
        return '<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">'
          +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.4);border-radius:8px;padding:9px;flex-shrink:0;font-size:16px;line-height:1;">'+x.ic+'</div>'
          +'<div><div style="font-size:12px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">'+x.t+'</div>'
          +'<div style="font-size:9.5px;color:#666;line-height:1.5;">'+x.d+'</div></div>'
        +'</div>';
      }).join('')
    +'</div>';

  var prazoHtml=sh('Prazo e Garantia')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">'
      +'<div style="background:#0f0c00;border-radius:10px;padding:18px;text-align:center;">'
        +'<div style="font-size:24px;margin-bottom:8px;">📅</div>'
        +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:5px;">PRAZO DE EXECUÇÃO</div>'
        +'<div style="font-size:14px;font-weight:900;color:#C9A84C;margin-bottom:3px;">Após aprovação e entrada</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,0.3);">conforme escopo do projeto</div>'
      +'</div>'
      +'<div style="background:#0f0c00;border-radius:10px;padding:18px;text-align:center;">'
        +'<div style="font-size:24px;margin-bottom:8px;">🛡️</div>'
        +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:5px;">GARANTIA</div>'
        +'<div style="font-size:14px;font-weight:900;color:#C9A84C;margin-bottom:3px;">Fabricação e Instalação</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,0.3);">suporte pós-entrega incluso</div>'
      +'</div>'
    +'</div>';

  var rodapeFinal=''
    +'<div style="background:#0f0c00;border-radius:12px;padding:22px 28px;text-align:center;margin-bottom:14px;">'
      +'<div style="font-size:22px;font-weight:900;color:#C9A84C;margin-bottom:5px;">'+emp.nome+'</div>'
      +'<div style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.3);margin-bottom:16px;">MÁRMORE · GRANITO · QUARTZITO · PROJETOS FUNERÁRIOS</div>'
      +'<div style="display:flex;justify-content:center;gap:36px;flex-wrap:wrap;">'
        +'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:4px;">WHATSAPP</div>'
          +'<div style="font-size:14px;font-weight:900;color:#C9A84C;">'+emp.tel+'</div>'
        +'</div>'
        +(emp.ig?'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:4px;">INSTAGRAM</div>'
          +'<div style="font-size:14px;font-weight:900;color:#C9A84C;">'+emp.ig+'</div>'
        +'</div>':'')
        +'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:4px;">ENDEREÇO</div>'
          +'<div style="font-size:10.5px;font-weight:700;color:rgba(201,168,76,0.7);">'+emp.end+', '+emp.cidade+'</div>'
        +'</div>'
        +'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:4px;">CNPJ</div>'
          +'<div style="font-size:10.5px;color:rgba(255,255,255,0.25);">'+emp.cnpj+'</div>'
        +'</div>'
      +'</div>'
      +'<div style="margin-top:14px;font-size:8px;color:rgba(255,255,255,0.12);">Este orçamento é válido por 7 dias a partir da data de emissão · '+orcNum+'</div>'
    +'</div>';

  var pag4=''
    +'<div id="pdfPag4" style="width:794px;height:1123px;'+F+'background:#fff;color:#1a1a1a;display:flex;flex-direction:column;overflow:hidden;">'
      +miniHeader('NOSSA EMPRESA','Pg 4/4')
      +'<div style="padding:18px 36px 12px;flex:1;">'
        +difsHtml
        +prazoHtml
        +rodapeFinal
      +'</div>'
      +miniFooter('Pg 4/4')
    +'</div>';

  // ══════════════════════════════════════════════════════════════════
  // CONTAINER COMPLETO
  // ══════════════════════════════════════════════════════════════════
  var recHtml=''
    +'<div id="pdfReceipt" style="width:794px;'+F+'background:#d0ccc6;">'
      +'<div style="background:#fff;margin-bottom:14px;">'+pag1+'</div>'
      +'<div style="background:#fff;margin-bottom:14px;">'+pag2+'</div>'
      +'<div style="background:#fff;margin-bottom:14px;">'+pag3+'</div>'
      +'<div style="background:#fff;">'+pag4+'</div>'
    +'</div>';

  // ══════════════════════════════════════════════════════════════════
  // OVERLAY / PREVIEW / GERAÇÃO DO PDF
  // ══════════════════════════════════════════════════════════════════
  var ov=document.createElement('div');
  ov.id='pdfOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;display:flex;flex-direction:column;';

  var barEl=document.createElement('div');
  barEl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 13px;background:#0f0c00;border-bottom:1px solid rgba(201,168,76,.55);flex-shrink:0;flex-wrap:wrap;';
  barEl.innerHTML=''
    +'<span style="flex:1;'+F+'font-size:.75rem;color:#C9A84C;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">⚱️ '+orcNum+' — '+escH(q.cli)+'</span>'
    +'<button id="pdfBtnClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;'+F+'">✕</button>'
    +'<button id="pdfBtnDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;'+F+'white-space:nowrap;">⏳ Gerando...</button>'
    +(navigator.share?'<button id="pdfBtnShare" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;'+F+'white-space:nowrap;">↗ Compartilhar</button>':'')
    +'<button id="pdfBtnPrint" style="background:#C9A84C;border:none;color:#000;padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;'+F+'white-space:nowrap;">🖨 Imprimir</button>';

  var preview=document.createElement('div');
  preview.style.cssText='flex:1;overflow-y:auto;background:#555;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
  preview.innerHTML='<div style="text-align:center;color:#C9A84C;padding:60px 20px;'+F+'font-size:.85rem;letter-spacing:.5px;">⏳ Gerando PDF com 4 páginas A4, aguarde...</div>';

  ov.appendChild(barEl);
  ov.appendChild(preview);
  document.body.appendChild(ov);

  document.getElementById('pdfBtnClose').onclick=function(){ov.remove();};
  document.getElementById('pdfBtnPrint').onclick=function(){
    var w=window.open('','_blank');
    if(w){
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8">'
        +'<link rel="preconnect" href="https://fonts.googleapis.com">'
        +'<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet">'
        +'<style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:#e0ddd8;font-family:Outfit,Arial,sans-serif;}'
        +'@page{size:A4;margin:0;}@media print{.pag-break{page-break-after:always;display:block;}body{background:#fff;}}'
        +'</style></head><body>'
        +'<div class="pag-break">'+pag1.replace(/<div id="pdfPag1"[^>]*>/,'<div>')+'</div>'
        +'<div class="pag-break">'+pag2.replace(/<div id="pdfPag2"[^>]*>/,'<div>')+'</div>'
        +'<div class="pag-break">'+pag3.replace(/<div id="pdfPag3"[^>]*>/,'<div>')+'</div>'
        +'<div>'+pag4.replace(/<div id="pdfPag4"[^>]*>/,'<div>')+'</div>'
        +'<script>window.onload=function(){window.print();};<\/script>'
        +'</body></html>');
      w.document.close();
    }
  };

  var offscreen=document.createElement('div');
  offscreen.style.cssText='position:fixed;left:-9999px;top:0;width:794px;background:#d0ccc6;z-index:-1;';
  offscreen.innerHTML=recHtml;
  document.body.appendChild(offscreen);

  setTimeout(function(){
    var jsPDF=window.jspdf.jsPDF;
    var pageW=595.28;
    var pageH=841.89;

    var pagIds=['pdfPag1','pdfPag2','pdfPag3','pdfPag4'];
    var pagEls=pagIds.map(function(id){return offscreen.querySelector('#'+id);}).filter(Boolean);

    if(!pagEls.length){
      html2canvas(offscreen.querySelector('#pdfReceipt'),{scale:2,useCORS:true,backgroundColor:'#d0ccc6',logging:false,width:794,windowWidth:794}).then(function(canvas){
        document.body.removeChild(offscreen);
        var ratio=canvas.height/canvas.width;
        var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
        var imgH=pageW*ratio;
        var pagesCount=Math.ceil(imgH/pageH);
        for(var i=0;i<pagesCount;i++){
          if(i>0) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',0,-i*pageH,pageW,imgH);
        }
        finalizarPDF(pdf,canvas,[canvas]);
      });
      return;
    }

    var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
    var capturas=[];

    function capturarPagina(idx){
      if(idx>=pagEls.length){
        capturas.forEach(function(canvas,i){
          if(i>0) pdf.addPage();
          var imgH=pageW*(canvas.height/canvas.width);
          pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',0,0,pageW,imgH>pageH?pageH:imgH);
        });
        finalizarPDF(pdf,capturas[0],capturas);
        return;
      }
      html2canvas(pagEls[idx],{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:794,windowWidth:794}).then(function(canvas){
        capturas.push(canvas);
        capturarPagina(idx+1);
      });
    }

    function finalizarPDF(pdf,_firstCanvas,capturas){
      document.body.removeChild(offscreen);
      var pdfBlob=pdf.output('blob');

      var previewDiv=document.createElement('div');
      previewDiv.style.cssText='display:flex;flex-direction:column;gap:14px;align-items:center;width:100%;max-width:700px;';
      capturas.forEach(function(canvas,i){
        var img=document.createElement('img');
        img.src=canvas.toDataURL('image/jpeg',0.9);
        img.style.cssText='width:100%;display:block;box-shadow:0 4px 32px rgba(0,0,0,.7);';
        var label=document.createElement('div');
        label.style.cssText='font-size:8px;color:rgba(201,168,76,0.4);letter-spacing:2px;text-transform:uppercase;font-family:Outfit,sans-serif;margin-top:-10px;padding-bottom:2px;';
        label.textContent='PÁGINA '+(i+1)+' DE '+capturas.length;
        previewDiv.appendChild(img);
        previewDiv.appendChild(label);
      });

      preview.innerHTML='';
      preview.appendChild(previewDiv);

      function enableBtn(id,label,cb){
        var b=document.getElementById(id);
        if(!b)return;
        b.innerHTML=label;b.disabled=false;
        b.style.color='#C9A84C';b.style.borderColor='rgba(201,168,76,.55)';b.style.background='#1e1800';
        b.onclick=cb;
      }
      enableBtn('pdfBtnDown','⬇ Salvar PDF',function(){
        var url=URL.createObjectURL(pdfBlob);
        var a=document.createElement('a');a.href=url;a.download=fileName;
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(function(){URL.revokeObjectURL(url);},30000);
        toast('PDF salvo: '+fileName);
      });
      if(navigator.share){
        enableBtn('pdfBtnShare','↗ Compartilhar',function(){
          var pdfFile=new File([pdfBlob],fileName,{type:'application/pdf'});
          var sd={title:'Orçamento '+orcNum+' — '+q.cli,text:emp.nome+'\nR$ '+fm(vista)+' à vista'};
          if(navigator.canShare&&navigator.canShare({files:[pdfFile]})) sd.files=[pdfFile];
          navigator.share(sd).catch(function(){});
        });
      }
    }

    capturarPagina(0);
  },400);
}

// ORÇAMENTOS HISTÓRICO
// ═══════════════════════════════════════════════
