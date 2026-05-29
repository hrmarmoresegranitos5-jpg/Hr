// ═══════════════════════════════════════════════
// ── GERADOR DE PDF PARA TÚMULOS — VERSÃO PREMIUM ──
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
    capela:'Capela / Monumento',revestimento:'Revestimento / Reforma',reforma:'Reforma Completa',jazigo:'Jazigo Completo'};
  var tipoLabel=TIPOS_LABEL[tum.tipo]||tum.tipo||'Túmulo';
  var mat=CFG.stones.find(function(s){return s.id===tum.stoneId;})||{nm:q.mat||'',tx:'',photo:''};
  var vista=q.vista||res.venda||0;
  var parc=vista*1.12;
  var p8=parc/8;
  var ent=vista*0.5;
  var economia=parc-vista;

  function fd(d){if(!d)return new Date().toLocaleDateString('pt-BR');try{return new Date(d).toLocaleDateString('pt-BR');}catch(e){return d;}}

  // ── Fonte base para todos os elementos ──
  var F="font-family:'Outfit',Arial,sans-serif;";

  // ── Seção header (título de seção) ──
  function sh(t){
    return '<div style="'+F+'display:flex;align-items:center;gap:10px;margin:0 0 16px;">'
      +'<div style="width:3px;height:16px;background:#C9A84C;border-radius:2px;flex-shrink:0;"></div>'
      +'<span style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#7a4400;font-weight:900;">'+t+'</span>'
      +'<div style="flex:1;height:1px;background:#e8dfc4;"></div>'
      +'</div>';
  }

  // ── Cabeçalho padrão (compacto, elegante) ──
  var headerHtml=''
    +'<div style="height:4px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);"></div>'
    +'<div style="'+F+'background:#0f0c00;padding:14px 36px;display:flex;justify-content:space-between;align-items:center;gap:20px;">'
      +'<div>'
        +'<div style="font-size:20px;font-weight:900;color:#C9A84C;letter-spacing:-0.5px;line-height:1;">'+emp.nome+'</div>'
        +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.4);margin-top:3px;">MÁRMORE · GRANITO · QUARTZITO · PROJETOS FUNERÁRIOS</div>'
      +'</div>'
      +'<div style="text-align:right;">'
        +'<div style="font-size:9px;color:rgba(201,168,76,0.85);font-weight:700;">'+emp.tel+'</div>'
        +(emp.ig?'<div style="font-size:8px;color:rgba(255,255,255,0.35);">'+emp.ig+'</div>':'')
        +'<div style="font-size:7.5px;color:rgba(255,255,255,0.2);margin-top:2px;">'+emp.cidade+'</div>'
      +'</div>'
    +'</div>'
    +'<div style="'+F+'background:#f7f2e8;border-bottom:2px solid #C9A84C;padding:7px 36px;display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="display:flex;align-items:center;gap:8px;">'
        +'<div style="background:#C9A84C;color:#000;font-size:8px;font-weight:900;padding:3px 10px;border-radius:4px;letter-spacing:1.5px;">'+orcNum+'</div>'
        +'<div style="font-size:8px;color:#888;letter-spacing:1px;text-transform:uppercase;">Projeto Funerário</div>'
      +'</div>'
      +'<div style="font-size:8px;color:#999;">Emissão: <strong style="color:#5a3800;">'+fd(q.dt||q.date)+'</strong> &nbsp;·&nbsp; Validade: <strong style="color:#5a3800;">7 dias</strong></div>'
    +'</div>';

  // ── Rodapé padrão (compacto) ──
  var footerHtml=''
    +'<div style="height:3px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);margin-top:auto;"></div>'
    +'<div style="'+F+'background:#0f0c00;padding:10px 36px;display:flex;justify-content:space-between;align-items:center;gap:16px;">'
      +'<div>'
        +'<div style="font-size:10px;font-weight:900;color:#C9A84C;line-height:1;margin-bottom:2px;">'+emp.nome+'</div>'
        +'<div style="font-size:7.5px;color:rgba(201,168,76,0.35);">'+emp.end+' — '+emp.cidade+'</div>'
      +'</div>'
      +'<div style="text-align:right;">'
        +'<div style="font-size:8.5px;color:rgba(201,168,76,0.75);font-weight:700;">'+emp.tel+'</div>'
        +'<div style="font-size:7px;color:rgba(255,255,255,0.18);">CNPJ: '+emp.cnpj+' &nbsp;·&nbsp; '+orcNum+'</div>'
      +'</div>'
    +'</div>';

  // ══════════════════════════════════════════════════════
  // PÁGINA 1 — CAPA PREMIUM
  // ══════════════════════════════════════════════════════

  var d=tum.dims||{};
  var dimGeral='';
  if(d.comp||d.larg||d.alt||d.altEst){
    dimGeral=(d.comp?d.comp+' cm':'—')+' × '+(d.larg?d.larg+' cm':'—');
    if(d.alt||d.altEst) dimGeral+=' × '+(d.alt||d.altEst)+' cm';
  }

  var compartStr=(tum.compartimentos||tum.gavetas||1);
  var compartLabel=compartStr>1?compartStr+' gavetas':compartStr+' gaveta';

  // Capa — bloco hero escuro
  var heroCapa=''
    +'<div style="'+F+'background:linear-gradient(135deg,#0f0c00 0%,#1c1500 60%,#261c00 100%);padding:32px 36px 28px;position:relative;overflow:hidden;">'
      // Marca d'água decorativa
      +'<div style="position:absolute;right:-10px;top:-10px;font-size:100px;opacity:0.04;line-height:1;">⚱</div>'
      +'<div style="font-size:7px;letter-spacing:4px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:900;margin-bottom:8px;">PROJETO FUNERÁRIO PREMIUM</div>'
      +'<div style="font-size:28px;font-weight:900;color:#C9A84C;line-height:1.1;margin-bottom:4px;">'+emp.nome+'</div>'
      +'<div style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1px;margin-bottom:24px;">'+tipoLabel.toUpperCase()+'</div>'
      // Grid info hero
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(201,168,76,0.15);border-radius:8px;overflow:hidden;margin-bottom:20px;">'
        +'<div style="background:#0f0c00;padding:12px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);margin-bottom:5px;font-weight:900;">ORÇAMENTO</div>'
          +'<div style="font-size:14px;font-weight:900;color:#C9A84C;line-height:1;">'+orcNum+'</div>'
        +'</div>'
        +'<div style="background:#0f0c00;padding:12px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);margin-bottom:5px;font-weight:900;">EMISSÃO</div>'
          +'<div style="font-size:12px;font-weight:700;color:#fff;line-height:1;">'+fd(q.dt||q.date)+'</div>'
        +'</div>'
        +'<div style="background:#0f0c00;padding:12px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);margin-bottom:5px;font-weight:900;">TIPO</div>'
          +'<div style="font-size:11px;font-weight:700;color:#fff;line-height:1.2;">'+tipoLabel+'</div>'
        +'</div>'
        +'<div style="background:#0f0c00;padding:12px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);margin-bottom:5px;font-weight:900;">VALIDADE</div>'
          +'<div style="font-size:12px;font-weight:700;color:#fff;line-height:1;">7 dias</div>'
        +'</div>'
      +'</div>'
      // Cliente destaque
      +'<div style="border-top:1px solid rgba(201,168,76,0.2);padding-top:18px;">'
        +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.45);margin-bottom:6px;font-weight:900;">ORÇAMENTO PREPARADO EXCLUSIVAMENTE PARA</div>'
        +'<div style="font-size:26px;font-weight:900;color:#fff;line-height:1;margin-bottom:6px;">'+escH(q.cli)+'</div>'
        +(tum.falecido?'<div style="font-size:10px;color:rgba(255,255,255,0.4);">Em memória de: <strong style="color:rgba(201,168,76,0.7);">'+escH(tum.falecido)+'</strong></div>':'')
        +(tum.cemiterio?'<div style="font-size:9.5px;color:rgba(255,255,255,0.3);margin-top:3px;">📍 '+escH(tum.cemiterio)+(tum.quadra?' — Quadra '+escH(tum.quadra):'')+(tum.lote?', Lote '+escH(tum.lote):'')+'</div>':'')
      +'</div>'
    +'</div>';

  // Capa — resumo do projeto
  var resumoCapa=''
    +'<div style="'+F+'padding:22px 36px 0;">'
      +sh('Resumo do Projeto')
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">MATERIAL</div>'
          +'<div style="font-size:15px;font-weight:900;color:#7a4400;line-height:1.2;">'+(mat.nm||q.mat||'—')+'</div>'
          +(mat.cat?'<div style="font-size:8.5px;color:#888;margin-top:3px;">'+mat.cat+(mat.fin?' · '+mat.fin:'')+'</div>':'')
        +'</div>'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">DIMENSIONAMENTO</div>'
          +'<div style="font-size:22px;font-weight:900;color:#1a1a1a;line-height:1;">'+(res.m2Total?(+res.m2Total).toFixed(3)+' m²':'—')+'</div>'
          +'<div style="font-size:8px;color:#aaa;margin-top:3px;">área total de pedra</div>'
          +(dimGeral?'<div style="font-size:8px;color:#888;margin-top:2px;">'+dimGeral+'</div>':'')
        +'</div>'
        +'<div style="background:#0f0c00;border-radius:10px;padding:14px 16px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);margin-bottom:5px;font-weight:900;">TIPO DE JAZIGO</div>'
          +'<div style="font-size:14px;font-weight:900;color:#C9A84C;line-height:1.2;">'+tipoLabel+'</div>'
          +(dimGeral?'<div style="font-size:8px;color:rgba(255,255,255,0.25);margin-top:5px;">'+dimGeral+'</div>':'')
          +(compartStr?'<div style="font-size:8px;color:rgba(201,168,76,0.4);margin-top:2px;">'+compartLabel+'</div>':'')
        +'</div>'
      +'</div>';

  // Capa — bloco de investimento
  var investCapa=''
      +sh('Investimento do Projeto')
      +'<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:12px;overflow:hidden;margin-bottom:18px;">'
        +'<div style="padding:18px 22px 16px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid rgba(201,168,76,0.15);">'
          +'<div>'
            +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:900;margin-bottom:6px;">À VISTA — MELHOR OPÇÃO</div>'
            +'<div style="font-size:36px;font-weight:900;color:#C9A84C;line-height:1;margin-bottom:6px;">R$ '+fm(vista)+'</div>'
            +'<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(46,120,46,0.25);border:1px solid rgba(100,180,100,0.4);color:#7dcc7d;font-size:8px;font-weight:900;padding:3px 10px;border-radius:20px;">▼ Você economiza R$ '+fm(economia)+' pagando à vista</div>'
          +'</div>'
          +'<div style="text-align:right;border-left:1px solid rgba(201,168,76,0.15);padding-left:22px;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:6px;">PARCELADO EM ATÉ 8×</div>'
            +'<div style="font-size:22px;font-weight:900;color:#fff;line-height:1;margin-bottom:4px;">8× R$ '+fm(p8)+'</div>'
            +'<div style="font-size:9px;color:rgba(255,255,255,0.35);">Total parcelado: R$ '+fm(parc)+'</div>'
            +'<div style="font-size:8.5px;color:rgba(201,168,76,0.4);margin-top:2px;">ENTRADA 50%: R$ '+fm(ent)+' + saldo na entrega</div>'
          +'</div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;padding:14px 22px;gap:16px;">'
          +'<div>'
            +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:4px;">1ª PARCELA — ENTRADA</div>'
            +'<div style="font-size:16px;font-weight:900;color:#C9A84C;">R$ '+fm(ent)+'</div>'
            +'<div style="font-size:8px;color:rgba(255,255,255,0.3);">Na assinatura do contrato e medição</div>'
          +'</div>'
          +'<div>'
            +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:4px;">2ª PARCELA — ENTREGA</div>'
            +'<div style="font-size:16px;font-weight:900;color:#C9A84C;">R$ '+fm(ent)+'</div>'
            +'<div style="font-size:8px;color:rgba(255,255,255,0.3);">Na entrega e instalação completa</div>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>';

  // Info extra (obs, foto)
  var fotoBloco='';
  if(tum.foto||q.fotoTumulo){
    var fotoSrc=tum.foto||q.fotoTumulo;
    fotoBloco=''
      +'<div style="padding:0 36px;">'
        +'<div style="border-radius:10px;overflow:hidden;border:1px solid #e8dfc4;margin-bottom:18px;">'
          +'<img src="'+fotoSrc+'" style="width:100%;max-height:260px;object-fit:cover;display:block;" crossorigin="anonymous"/>'
          +'<div style="background:#0f0c00;padding:7px 16px;display:flex;justify-content:space-between;align-items:center;">'
            +'<span style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:900;">REFERÊNCIA DO PROJETO</span>'
            +'<span style="font-size:7.5px;color:rgba(255,255,255,0.25);">'+tipoLabel+'</span>'
          +'</div>'
        +'</div>'
      +'</div>';
  }

  var obsBloco='';
  if(tum.obs){
    obsBloco=''
      +'<div style="'+F+'padding:0 36px 18px;">'
        +'<div style="background:#fffbf0;border-left:3px solid #C9A84C;padding:12px 16px;border-radius:0 8px 8px 0;">'
          +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">OBSERVAÇÕES DO PROJETO</div>'
          +'<div style="font-size:10px;color:#555;line-height:1.65;">'+escH(tum.obs)+'</div>'
        +'</div>'
      +'</div>';
  }

  var pag1=''
    +'<div id="pdfPag1" style="width:700px;'+F+'background:#fff;color:#1a1a1a;page-break-after:always;display:flex;flex-direction:column;min-height:1050px;">'
      +headerHtml
      +heroCapa
      +resumoCapa
      +investCapa
      +fotoBloco
      +obsBloco
      +footerHtml
    +'</div>';

  // ══════════════════════════════════════════════════════
  // PÁGINA 2 — DETALHES DO PROJETO (PEÇAS + MATERIAL)
  // ══════════════════════════════════════════════════════

  var PECAS_LABEL={
    tampo:'Tampo (Tampa Superior)',tampo2:'Tampa 2ª Gaveta',tampo3:'Tampa 3ª Gaveta',
    frente:'Frente / Frontal',lateral_d:'Lateral Direita',lateral_e:'Lateral Esquerda',
    fundo:'Fundo / Tardoz',base:'Base / Soleira',cruz:'Cruz / Símbolo',
    gaveta:'Gaveta',gaveta2:'2ª Gaveta',gaveta3:'3ª Gaveta',painel:'Painel de Fundo',
    degrau:'Degrau / Piso',chapim:'Chapim / Arremate',lateral_int:'Lateral Interna',
    peitoril:'Peitoril',coluna:'Coluna',arco:'Arco / Verga',
  };

  var pecasRows='';
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
    var dd=tum.dims||{};
    var comp=parseFloat(dd.comp)||0;
    var larg=parseFloat(dd.larg)||0;
    var alt=parseFloat(dd.alt||dd.altEst)||0;
    var esp=parseFloat(dd.esp||dd.espTampa)||0.02;
    var tipo=tum.tipo||'simples';
    var pecasAuto=[];
    if(comp&&larg){
      pecasAuto.push({id:'tampo',comp:comp,larg:larg,esp:esp,qtd:1});
      if(alt) pecasAuto.push({id:'frente',comp:comp,larg:alt,esp:esp,qtd:1});
      if(alt&&larg) pecasAuto.push({id:'lateral_d',comp:larg,larg:alt,esp:esp,qtd:1});
      if(alt&&larg) pecasAuto.push({id:'lateral_e',comp:larg,larg:alt,esp:esp,qtd:1});
      if(alt&&comp) pecasAuto.push({id:'fundo',comp:comp,larg:alt,esp:esp,qtd:1});
      pecasAuto.push({id:'base',comp:comp,larg:larg,esp:esp,qtd:1});
      if(tipo==='gaveta_dupla') pecasAuto.push({id:'gaveta',comp:comp,larg:larg,esp:esp,qtd:2});
      if(tipo==='gaveta_tripla') pecasAuto.push({id:'gaveta',comp:comp,larg:larg,esp:esp,qtd:3});
    }
    pecasList=pecasAuto;
  }

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
      } else if(p.dims){
        dimStr=p.dims;
      }
      var isEven=i%2===0;
      pecasRows+=''
        +'<tr>'
          +'<td style="padding:7px 14px;background:'+(isEven?'#fff':'#faf6ef')+';border-bottom:1px solid #f0e8d8;">'
            +'<div style="display:flex;align-items:center;gap:8px;">'
              +'<div style="background:#0f0c00;color:#C9A84C;font-size:7.5px;font-weight:900;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+(i+1)+'</div>'
              +'<div style="font-size:11px;font-weight:600;color:#1a1a1a;">'+escH(nm)+'</div>'
            +'</div>'
          +'</td>'
          +'<td style="padding:7px 14px;background:'+(isEven?'#fff':'#faf6ef')+';border-bottom:1px solid #f0e8d8;font-size:10px;color:#666;text-align:center;white-space:nowrap;">'+escH(dimStr)+'</td>'
          +'<td style="padding:7px 14px;background:'+(isEven?'#fff':'#faf6ef')+';border-bottom:1px solid #f0e8d8;font-size:10px;color:#888;text-align:center;">'+(qtd>1?'×'+qtd:'—')+'</td>'
          +'<td style="padding:7px 14px;background:'+(isEven?'#fff':'#faf6ef')+';border-bottom:1px solid #f0e8d8;font-size:11px;text-align:right;font-weight:700;color:#5a3800;">'+(m2?m2.toFixed(3)+' m²':'—')+'</td>'
        +'</tr>';
    });
    pecasRows+=''
      +'<tr style="background:#f7f2e8;">'
        +'<td colspan="3" style="padding:10px 14px;font-size:8.5px;font-weight:900;color:#7a4400;letter-spacing:1px;">TOTAL DE PEDRA</td>'
        +'<td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:900;color:#7a4400;">'+totalM2.toFixed(3)+' m²</td>'
      +'</tr>';
  }

  var secaoPecasHtml='';
  if(pecasRows){
    secaoPecasHtml=sh('Peças e Dimensões')
      +'<div style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
        +'<table style="width:100%;border-collapse:collapse;">'
          +'<thead><tr style="background:#0f0c00;">'
            +'<th style="padding:9px 14px;text-align:left;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">PEÇA / DESCRIÇÃO</th>'
            +'<th style="padding:9px 14px;text-align:center;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">DIMENSÕES</th>'
            +'<th style="padding:9px 14px;text-align:center;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">QTD</th>'
            +'<th style="padding:9px 14px;text-align:right;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">M²</th>'
          +'</tr></thead>'
          +'<tbody>'+pecasRows+'</tbody>'
        +'</table>'
      +'</div>';
  }

  // Bloco de material compacto
  var matHtml=sh('Material Selecionado')
    +'<div style="border:2px solid #C9A84C;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
      +'<div class="'+(mat.photo?'':mat.tx)+'" style="height:70px;width:100%;position:relative;overflow:hidden;'+(mat.photo?'background-image:url(\''+mat.photo+'\');background-size:cover;background-position:center;':'')+'">'
        +'<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.5) 55%,rgba(0,0,0,0.15) 100%);">'
          +'<div style="position:absolute;left:18px;top:50%;transform:translateY(-50%);">'
            +'<div style="font-size:6px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.7);font-weight:900;margin-bottom:4px;">MATERIAL SELECIONADO</div>'
            +'<div style="font-size:18px;font-weight:900;color:#C9A84C;line-height:1;">'+(mat.nm||q.mat||'—')+'</div>'
            +(mat.cat?'<div style="font-size:8.5px;color:rgba(255,255,255,0.4);margin-top:2px;">'+mat.cat+(mat.fin?' · '+mat.fin:'')+'</div>':'')
          +'</div>'
          +'<div style="position:absolute;right:18px;top:50%;transform:translateY(-50%);text-align:right;">'
            +'<div style="font-size:6px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:900;margin-bottom:3px;">TOTAL DE PEDRA</div>'
            +'<div style="font-size:17px;font-weight:900;color:#fff;">'+(res.m2Total?(+res.m2Total).toFixed(3)+' m²':'—')+'</div>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 2fr;background:#fff;border-top:1px solid #e8dfc4;">'
        +'<div style="padding:10px 14px;border-right:1px solid #e8dfc4;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:3px;font-weight:900;">CATEGORIA</div>'
          +'<div style="font-size:11.5px;font-weight:700;color:#1a1a1a;">'+(mat.cat||'—')+'</div>'
        +'</div>'
        +'<div style="padding:10px 14px;border-right:1px solid #e8dfc4;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:3px;font-weight:900;">ACABAMENTO</div>'
          +'<div style="font-size:11.5px;font-weight:700;color:#1a1a1a;">'+(mat.fin||'Polida')+'</div>'
        +'</div>'
        +'<div style="padding:10px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:3px;font-weight:900;">CARACTERÍSTICAS</div>'
          +'<div style="font-size:9.5px;color:#666;line-height:1.5;">'+(mat.desc||'Material de alta qualidade, durável e com excelente acabamento para projetos funerários.')+'</div>'
        +'</div>'
      +'</div>'
    +'</div>';

  // Acabamentos e serviços especiais
  var acabList=tum.acabamentos||[];
  var acabHtml='';
  if(acabList&&acabList.length){
    var ACAB_LABELS={
      molduras:'Molduras decorativas',pingadeiras:'Pingadeiras',lapide:'Lápide personalizada',
      foto_porcelana:'Foto em porcelana',cruz:'Cruz',polimento:'Polimento profissional',
      resina:'Tratamento com resina',jateamento:'Jateamento',laser:'Gravação a laser',
      florao:'Florão em bronze'
    };
    var acabRows='';
    acabList.forEach(function(a){
      var nm=ACAB_LABELS[a]||a;
      var isInc=true; // presume incluído se está na lista
      acabRows+=''
        +'<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f0e8d8;">'
          +'<div style="width:18px;height:18px;background:#0f0c00;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;">✓</div>'
          +'<div style="font-size:10.5px;font-weight:600;color:#1a1a1a;flex:1;">'+nm+'</div>'
          +'<div style="font-size:8px;font-weight:900;color:#C9A84C;letter-spacing:1px;">INCLUSO</div>'
        +'</div>';
    });
    if(acabRows){
      acabHtml=sh('Acabamentos e Serviços Inclusos')
        +'<div style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;margin-bottom:20px;background:#fff;">'
          +acabRows
        +'</div>';
    }
  }

  // Bloco acabamento final (4 laterais, material resumo)
  var acabFinalHtml='';
  if(mat.fin||mat.cat){
    acabFinalHtml=''
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:8px;padding:12px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">ACABAMENTO DA PEDRA</div>'
          +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+(mat.fin||'Polida')+'</div>'
          +'<div style="font-size:8.5px;color:#888;margin-top:2px;">padrão de toda a superfície</div>'
        +'</div>'
        +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:8px;padding:12px 14px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">MATERIAL</div>'
          +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+(mat.nm||q.mat||'—')+'</div>'
          +'<div style="font-size:8.5px;color:#888;margin-top:2px;">'+(mat.cat||'Pedra natural')+'</div>'
        +'</div>'
      +'</div>';
  }

  var pag2=''
    +'<div id="pdfPag2" style="width:700px;'+F+'background:#fff;color:#1a1a1a;page-break-after:always;display:flex;flex-direction:column;min-height:1050px;">'
      +headerHtml
      +'<div style="padding:22px 36px 18px;flex:1;">'
        +secaoPecasHtml
        +matHtml
        +acabHtml
        +acabFinalHtml
      +'</div>'
      +footerHtml
    +'</div>';

  // ══════════════════════════════════════════════════════
  // PÁGINA 3 — PROPOSTA DE INVESTIMENTO + EMPRESA
  // ══════════════════════════════════════════════════════

  // Proposta de investimento premium
  var propostaHtml=''
    +sh('Proposta de Investimento')
    +'<div style="text-align:center;margin-bottom:16px;">'
      +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#888;font-weight:900;margin-bottom:4px;">PROPOSTA EXCLUSIVA PARA</div>'
      +'<div style="font-size:22px;font-weight:900;color:#1a1a1a;margin-bottom:2px;">'+escH(q.cli)+'</div>'
      +'<div style="font-size:9px;color:#888;">'+orcNum+' · Emitido em '+fd(q.dt||q.date)+'</div>'
    +'</div>'
    +'<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:14px;overflow:hidden;margin-bottom:14px;">'
      +'<div style="padding:22px 26px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.2);">'
        +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:900;margin-bottom:8px;">À VISTA — MELHOR OPÇÃO</div>'
        +'<div style="font-size:44px;font-weight:900;color:#C9A84C;line-height:1;margin-bottom:10px;">R$ '+fm(vista)+'</div>'
        +'<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(46,120,46,0.25);border:1px solid rgba(100,180,100,0.4);color:#7dcc7d;font-size:9px;font-weight:900;padding:4px 14px;border-radius:20px;">▼ Você economiza R$ '+fm(economia)+' pagando à vista</div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid rgba(201,168,76,0.15);">'
        +'<div style="padding:14px 20px;border-right:1px solid rgba(201,168,76,0.15);">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:5px;">PARCELADO</div>'
          +'<div style="font-size:20px;font-weight:900;color:#fff;line-height:1;margin-bottom:3px;">8× R$ '+fm(p8)+'</div>'
          +'<div style="font-size:8.5px;color:rgba(255,255,255,0.3);">Total parcelado: R$ '+fm(parc)+'</div>'
        +'</div>'
        +'<div style="padding:14px 20px;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;margin-bottom:5px;">ENTRADA — 50%</div>'
          +'<div style="font-size:20px;font-weight:900;color:#fff;line-height:1;margin-bottom:3px;">R$ '+fm(ent)+'</div>'
          +'<div style="font-size:8.5px;color:rgba(255,255,255,0.3);">na assinatura / medição</div>'
        +'</div>'
      +'</div>'
      +'<div style="padding:10px 20px;display:flex;justify-content:center;gap:28px;">'
        +'<div style="font-size:8.5px;color:rgba(255,255,255,0.35);">À vista: <strong style="color:rgba(201,168,76,0.8);">R$ '+fm(vista)+'</strong></div>'
        +'<div style="font-size:8.5px;color:rgba(255,255,255,0.2);">·</div>'
        +'<div style="font-size:8.5px;color:rgba(255,255,255,0.35);">Parcelado: <strong style="color:rgba(255,255,255,0.5);">R$ '+fm(parc)+'</strong></div>'
        +'<div style="font-size:8.5px;color:rgba(255,255,255,0.2);">·</div>'
        +'<div style="font-size:8.5px;color:rgba(255,255,255,0.35);">Economia: <strong style="color:#7dcc7d;">R$ '+fm(economia)+'</strong></div>'
      +'</div>'
    +'</div>'
    // Condições de pagamento
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;">'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">1ª PARCELA — ENTRADA</div>'
        +'<div style="font-size:20px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:4px;">R$ '+fm(ent)+'</div>'
        +'<div style="font-size:8.5px;color:#888;line-height:1.5;">Na assinatura do contrato e medição em campo</div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:14px 16px;">'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">2ª PARCELA — ENTREGA</div>'
        +'<div style="font-size:20px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:4px;">R$ '+fm(ent)+'</div>'
        +'<div style="font-size:8.5px;color:#888;line-height:1.5;">Na entrega e instalação completa no cemitério</div>'
      +'</div>'
    +'</div>';

  // Por que escolher a HR Mármores
  var porqueHtml=sh('Por que Escolher a HR Mármores?')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">'
      +[
        {ic:'🏛️',t:'Tradição e Experiência',d:'Anos de dedicação ao mercado funerário, com centenas de projetos entregues com excelência.'},
        {ic:'📐',t:'Medição em Campo',d:'Visita técnica inclusa para conferência e aprovação definitiva das medidas antes da fabricação.'},
        {ic:'⚙️',t:'Fabricação Própria',d:'Maquinário de precisão milimétrica para corte e usinagem das peças em granito e mármore.'},
        {ic:'🚛',t:'Instalação Completa',d:'Nossa equipe realiza a entrega, instalação e nivelamento. Vedação profissional inclusa sem custo adicional.'},
        {ic:'🛡️',t:'Garantia Total',d:'Garantia contra defeitos de fabricação e instalação. Suporte pós-entrega para qualquer ajuste necessário.'},
        {ic:'⭐',t:'Projeto Personalizado',d:'Cada jazigo é único. Desenvolvemos o projeto conforme as necessidades e desejos da família.'},
      ].map(function(x){
        return '<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;">'
          +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.4);border-radius:7px;padding:8px;flex-shrink:0;font-size:14px;">'+x.ic+'</div>'
          +'<div><div style="font-size:10.5px;font-weight:700;color:#1a1a1a;margin-bottom:3px;">'+x.t+'</div>'
          +'<div style="font-size:9px;color:#666;line-height:1.5;">'+x.d+'</div></div>'
        +'</div>';
      }).join('')
    +'</div>';

  // Prazo e garantia
  var prazoHtml=sh('Prazo e Garantia')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">'
      +'<div style="background:#0f0c00;border-radius:10px;padding:16px 18px;text-align:center;">'
        +'<div style="font-size:24px;margin-bottom:6px;">📅</div>'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:4px;">PRAZO DE EXECUÇÃO</div>'
        +'<div style="font-size:14px;font-weight:900;color:#C9A84C;">Após aprovação e entrada</div>'
        +'<div style="font-size:8.5px;color:rgba(255,255,255,0.3);margin-top:3px;">conforme escopo do projeto</div>'
      +'</div>'
      +'<div style="background:#0f0c00;border-radius:10px;padding:16px 18px;text-align:center;">'
        +'<div style="font-size:24px;margin-bottom:6px;">🛡️</div>'
        +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.45);font-weight:900;margin-bottom:4px;">GARANTIA</div>'
        +'<div style="font-size:14px;font-weight:900;color:#C9A84C;">Fabricação e Instalação</div>'
        +'<div style="font-size:8.5px;color:rgba(255,255,255,0.3);margin-top:3px;">suporte pós-entrega incluso</div>'
      +'</div>'
    +'</div>';

  // Rodapé final da última página
  var rodapeFinalHtml=''
    +'<div style="background:#0f0c00;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:18px;">'
      +'<div style="font-size:20px;font-weight:900;color:#C9A84C;margin-bottom:4px;">'+emp.nome+'</div>'
      +'<div style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.35);margin-bottom:14px;">MÁRMORE · GRANITO · QUARTZITO · PROJETOS FUNERÁRIOS</div>'
      +'<div style="display:flex;justify-content:center;gap:32px;flex-wrap:wrap;">'
        +'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:3px;">WHATSAPP</div>'
          +'<div style="font-size:13px;font-weight:900;color:#C9A84C;">'+emp.tel+'</div>'
        +'</div>'
        +(emp.ig?'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:3px;">INSTAGRAM</div>'
          +'<div style="font-size:13px;font-weight:900;color:#C9A84C;">'+emp.ig+'</div>'
        +'</div>':'')
        +'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:3px;">ENDEREÇO</div>'
          +'<div style="font-size:10px;font-weight:700;color:rgba(201,168,76,0.7);">'+emp.end+', '+emp.cidade+'</div>'
        +'</div>'
        +'<div style="text-align:center;">'
          +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.35);font-weight:900;margin-bottom:3px;">CNPJ</div>'
          +'<div style="font-size:10px;color:rgba(255,255,255,0.3);">'+emp.cnpj+'</div>'
        +'</div>'
      +'</div>'
      +'<div style="margin-top:14px;font-size:7.5px;color:rgba(255,255,255,0.15);">Este orçamento é válido por 7 dias a partir da data de emissão · '+orcNum+'</div>'
    +'</div>';

  var pag3=''
    +'<div id="pdfPag3" style="width:700px;'+F+'background:#fff;color:#1a1a1a;display:flex;flex-direction:column;min-height:1050px;">'
      +headerHtml
      +'<div style="padding:22px 36px 18px;flex:1;">'
        +propostaHtml
        +porqueHtml
        +prazoHtml
        +rodapeFinalHtml
      +'</div>'
      +footerHtml
    +'</div>';

  // ══════════════════════════════════════════════════════
  // CONTAINER COMPLETO (3 páginas)
  // ══════════════════════════════════════════════════════
  var recHtml=''
    +'<div id="pdfReceipt" style="width:700px;'+F+'background:#e0ddd8;">'
      +'<div style="background:#fff;margin-bottom:12px;">'+pag1.replace(/<div id="pdfPag1"[^>]*>/,'<div>').replace(/<\/div>\s*$/,'</div>')+'</div>'
      +'<div style="height:12px;background:#e0ddd8;"></div>'
      +'<div style="background:#fff;margin-bottom:12px;">'+pag2.replace(/<div id="pdfPag2"[^>]*>/,'<div>').replace(/<\/div>\s*$/,'</div>')+'</div>'
      +'<div style="height:12px;background:#e0ddd8;"></div>'
      +'<div style="background:#fff;">'+pag3.replace(/<div id="pdfPag3"[^>]*>/,'<div>').replace(/<\/div>\s*$/,'</div>')+'</div>'
    +'</div>';

  // ══════════════════════════════════════════════════════
  // OVERLAY / PREVIEW / GERAÇÃO DO PDF
  // ══════════════════════════════════════════════════════

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
  preview.style.cssText='flex:1;overflow-y:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
  preview.innerHTML='<div style="text-align:center;color:#C9A84C;padding:60px 20px;'+F+'font-size:.85rem;letter-spacing:.5px;">⏳ Gerando PDF com 3 páginas, aguarde...</div>';

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
        +'@media print{.pag-break{page-break-after:always;display:block;}body{background:#fff;}}'
        +'</style></head><body>'
        +'<div class="pag-break">'+pag1.replace('<div id="pdfPag1"','<div')+'</div>'
        +'<div class="pag-break">'+pag2.replace('<div id="pdfPag2"','<div')+'</div>'
        +'<div>'+pag3.replace('<div id="pdfPag3"','<div')+'</div>'
        +'<script>window.onload=function(){window.print();};<\/script>'
        +'</body></html>');
      w.document.close();
    }
  };

  var offscreen=document.createElement('div');
  offscreen.style.cssText='position:fixed;left:-9999px;top:0;width:700px;background:#e0ddd8;z-index:-1;';
  offscreen.innerHTML=recHtml;
  document.body.appendChild(offscreen);

  setTimeout(function(){
    var jsPDF=window.jspdf.jsPDF;
    var pageW=595.28;
    var pageH=841.89;

    var pagIds=['pdfPag1','pdfPag2','pdfPag3'];
    var pagEls=pagIds.map(function(id){return offscreen.querySelector('#'+id);}).filter(Boolean);

    if(!pagEls.length){
      html2canvas(offscreen.querySelector('#pdfReceipt'),{scale:2,useCORS:true,backgroundColor:'#e0ddd8',logging:false,width:700,windowWidth:700}).then(function(canvas){
        document.body.removeChild(offscreen);
        var ratio=canvas.height/canvas.width;
        var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
        var imgH=pageW*ratio;
        var pagesCount=Math.ceil(imgH/pageH);
        for(var i=0;i<pagesCount;i++){
          if(i>0) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',0,-i*pageH,pageW,imgH);
        }
        finalizarPDF(pdf,canvas);
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
        finalizarPDF(pdf,capturas[0]);
        return;
      }
      html2canvas(pagEls[idx],{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:700,windowWidth:700}).then(function(canvas){
        capturas.push(canvas);
        capturarPagina(idx+1);
      });
    }

    function finalizarPDF(pdf,previewCanvas){
      document.body.removeChild(offscreen);
      var pdfBlob=pdf.output('blob');

      var previewDiv=document.createElement('div');
      previewDiv.style.cssText='display:flex;flex-direction:column;gap:12px;align-items:center;width:100%;max-width:700px;';
      capturas.forEach(function(canvas,i){
        var img=document.createElement('img');
        img.src=canvas.toDataURL('image/jpeg',0.88);
        img.style.cssText='width:100%;display:block;box-shadow:0 4px 32px rgba(0,0,0,.6);';
        var label=document.createElement('div');
        label.style.cssText='font-size:8px;color:rgba(201,168,76,0.4);letter-spacing:2px;text-transform:uppercase;font-family:Outfit,sans-serif;margin-top:-8px;';
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
