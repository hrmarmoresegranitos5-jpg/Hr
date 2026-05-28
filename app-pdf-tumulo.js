// ═══════════════════════════════════════════════
// ── GERADOR DE PDF PARA TÚMULOS — VERSÃO PROFISSIONAL ──
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
  function sh(t){
    return '<div style="display:flex;align-items:center;gap:10px;margin:0 0 14px;">'
      +'<span style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:900;">'+t+'</span>'
      +'<div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.4),transparent);"></div>'
      +'</div>';
  }

  // ── Cabeçalho padrão (reutilizável em todas as páginas) ──
  var headerHtml=''
    +'<div style="height:6px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);"></div>'
    +'<div style="background:#0f0c00;padding:18px 38px 16px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">'
      +'<div style="display:flex;flex-direction:column;gap:4px;">'
        +'<div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:-0.5px;line-height:1;">'+emp.nome+'</div>'
        +'<div style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.45);">M&Aacute;RMORE &middot; GRANITO &middot; QUARTZITO</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,0.22);font-style:italic;margin-top:1px;">Qualidade, Precisao e Acabamento Profissional</div>'
      +'</div>'
      +'<div style="text-align:right;display:flex;flex-direction:column;gap:2px;">'
        +'<div style="font-size:9.5px;color:rgba(201,168,76,0.9);font-weight:700;">'+emp.end+'</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,0.4);">'+emp.cidade+'</div>'
        +'<div style="font-size:10px;color:rgba(201,168,76,0.9);font-weight:700;margin-top:2px;">'+emp.tel+'</div>'
        +(emp.ig?'<div style="font-size:9px;color:rgba(255,255,255,0.4);">'+emp.ig+'</div>':'')
        +'<div style="font-size:7.5px;color:rgba(255,255,255,0.18);margin-top:2px;">CNPJ: '+emp.cnpj+'</div>'
      +'</div>'
    +'</div>'
    +'<div style="background:#f7f2e8;border-bottom:3px solid #C9A84C;padding:9px 38px;display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="display:flex;align-items:center;gap:10px;">'
        +'<div style="background:#0f0c00;color:#C9A84C;font-size:7.5px;font-weight:900;padding:5px 14px;border-radius:30px;letter-spacing:2.5px;text-transform:uppercase;border:1px solid rgba(201,168,76,0.5);">⚱️ TÚMULO</div>'
        +'<div style="background:#C9A84C;color:#000;font-size:8.5px;font-weight:900;padding:4px 10px;border-radius:5px;letter-spacing:1px;">'+orcNum+'</div>'
      +'</div>'
      +'<div style="text-align:right;">'
        +'<div style="font-size:9.5px;color:#888;"><strong style="color:#5a3800;">EMISSÃO:</strong> '+fd(q.dt||q.date)+'</div>'
        +'<div style="font-size:8.5px;color:#aaa;">Validade: 7 dias</div>'
      +'</div>'
    +'</div>';

  // ── Rodapé padrão ──
  var footerHtml=''
    +'<div style="background:#0f0c00;padding:14px 38px;display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:auto;">'
      +'<div>'
        +'<div style="font-size:12px;font-weight:900;color:#C9A84C;line-height:1;margin-bottom:3px;">'+emp.nome+'</div>'
        +'<div style="font-size:8.5px;color:rgba(201,168,76,0.4);">'+emp.end+' — '+emp.cidade+'</div>'
      +'</div>'
      +'<div style="text-align:right;line-height:1.9;">'
        +'<div style="font-size:9.5px;color:rgba(201,168,76,0.85);font-weight:700;">'+emp.tel+'</div>'
        +(emp.ig?'<div style="font-size:8.5px;color:rgba(201,168,76,0.4);">'+emp.ig+'</div>':'')
        +'<div style="font-size:8px;color:rgba(255,255,255,0.15);">CNPJ: '+emp.cnpj+'</div>'
      +'</div>'
    +'</div>'
    +'<div style="height:5px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);"></div>';

  // ══════════════════════════════════════════════════════
  // PÁGINA 1 — CAPA: Foto + Descrição Detalhada + Valores
  // ══════════════════════════════════════════════════════

  // Foto do túmulo (se houver)
  var fotoTumulo='';
  if(tum.foto||q.fotoTumulo){
    var fotoSrc=tum.foto||q.fotoTumulo;
    fotoTumulo=''
      +'<div style="width:100%;margin-bottom:20px;border-radius:12px;overflow:hidden;border:2px solid #C9A84C;box-shadow:0 6px 30px rgba(201,168,76,0.25);">'
        +'<img src="'+fotoSrc+'" style="width:100%;max-height:340px;object-fit:cover;display:block;" crossorigin="anonymous"/>'
        +'<div style="background:#0f0c00;padding:8px 18px;display:flex;justify-content:space-between;align-items:center;">'
          +'<span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.6);font-weight:900;">REFERÊNCIA DO PROJETO</span>'
          +'<span style="font-size:8px;color:rgba(255,255,255,0.3);">'+tipoLabel+'</span>'
        +'</div>'
      +'</div>';
  } else {
    // Placeholder com ícone quando não há foto
    fotoTumulo=''
      +'<div style="width:100%;height:200px;margin-bottom:20px;border-radius:12px;border:2px dashed rgba(201,168,76,0.4);background:linear-gradient(135deg,#0f0c00 0%,#1a1500 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">'
        +'<div style="font-size:48px;opacity:0.4;">⚱️</div>'
        +'<div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.4);font-weight:900;">'+tipoLabel.toUpperCase()+'</div>'
        +'<div style="font-size:8px;color:rgba(255,255,255,0.2);">Foto será inserida após medição técnica</div>'
      +'</div>';
  }

  // Dimensões gerais
  var d=tum.dims||{};
  var dimGeral='';
  if(d.comp||d.larg||d.alt||d.altEst){
    dimGeral=(d.comp?d.comp+'m':'—')+' × '+(d.larg?d.larg+'m':'—');
    if(d.alt||d.altEst) dimGeral+=' × '+(d.alt||d.altEst)+'m';
  }

  // Bloco de descrição detalhada do projeto
  var descricaoProj=''
    +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:12px;padding:20px 22px;margin-bottom:18px;">'
      // Título do projeto
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;">'
        +'<div>'
          +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">CLIENTE</div>'
          +'<div style="font-size:22px;font-weight:900;color:#1a1a1a;line-height:1;margin-bottom:6px;">'+escH(q.cli)+'</div>'
          +(tum.falecido?'<div style="font-size:11px;color:#666;margin-top:3px;">⚱️ Em memória de: <strong>'+escH(tum.falecido)+'</strong></div>':'')
          +(tum.cemiterio?'<div style="font-size:10.5px;color:#888;margin-top:2px;">📍 Cemitério: <strong>'+escH(tum.cemiterio)+'</strong></div>':'')
          +(tum.quadra?'<div style="font-size:10px;color:#888;margin-top:2px;">Quadra: <strong>'+escH(tum.quadra)+'</strong>'+(tum.lote?' | Lote: <strong>'+escH(tum.lote)+'</strong>':'')+'</div>':'')
        +'</div>'
        +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.5);border-radius:10px;padding:14px 18px;text-align:center;min-width:130px;flex-shrink:0;">'
          +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.5);margin-bottom:5px;font-weight:900;">TIPO DO PROJETO</div>'
          +'<div style="font-size:15px;font-weight:900;color:#C9A84C;line-height:1.2;">'+tipoLabel+'</div>'
          +(dimGeral?'<div style="font-size:8.5px;color:rgba(255,255,255,0.3);margin-top:6px;">'+dimGeral+'</div>':'')
        +'</div>'
      +'</div>'
      // Divisor
      +'<div style="height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.25),transparent);margin-bottom:14px;"></div>'
      // Descrição técnica do projeto
      +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#c0a860;margin-bottom:10px;font-weight:900;">DESCRIÇÃO DO PROJETO</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'

        // Col 1
        +'<div style="display:flex;flex-direction:column;gap:6px;">'
          +'<div style="background:#fff;border:1px solid #ede8dc;border-radius:8px;padding:10px 13px;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">MATERIAL</div>'
            +'<div style="font-size:13px;font-weight:900;color:#7a4400;">'+(mat.nm||q.mat||'—')+'</div>'
            +(mat.cat?'<div style="font-size:9.5px;color:#888;margin-top:2px;">'+mat.cat+(mat.fin?' · '+mat.fin:'')+'</div>':'')
          +'</div>'
          +'<div style="background:#fff;border:1px solid #ede8dc;border-radius:8px;padding:10px 13px;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">ÁREA TOTAL DE PEDRA</div>'
            +'<div style="font-size:16px;font-weight:900;color:#1a1a1a;">'+(res.m2Total?(+res.m2Total).toFixed(3)+' m²':'—')+'</div>'
          +'</div>'
        +'</div>'

        // Col 2
        +'<div style="display:flex;flex-direction:column;gap:6px;">'
          +'<div style="background:#fff;border:1px solid #ede8dc;border-radius:8px;padding:10px 13px;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">ACABAMENTO</div>'
            +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+(mat.fin||'Polido')+'</div>'
            +'<div style="font-size:9px;color:#888;margin-top:1px;">Superfície '+((mat.fin||'polido').toLowerCase()+' e tratada')+'</div>'
          +'</div>'
          +'<div style="background:#fff;border:1px solid #ede8dc;border-radius:8px;padding:10px 13px;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">ESPESSURA DAS PLACAS</div>'
            +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+(d.esp||d.espTampa?((d.esp||d.espTampa)+' cm'):'3 cm (padrão)')+'</div>'
          +'</div>'
        +'</div>'
      +'</div>'

      // Observações do projeto
      +(tum.obs?''
        +'<div style="margin-top:12px;background:#fffbf0;border-left:4px solid #C9A84C;padding:10px 14px;border-radius:0 8px 8px 0;">'
          +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">OBSERVAÇÕES</div>'
          +'<div style="font-size:11px;color:#555;line-height:1.65;">'+escH(tum.obs)+'</div>'
        +'</div>'
      :'')
    +'</div>';

  // ── Bloco de VALORES (resumo na capa) ──
  var valorCapa=''
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">'
      // Parcelado
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:12px;padding:16px 20px;">'
        +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">PARCELADO EM ATÉ 8×</div>'
        +'<div style="font-size:26px;font-weight:900;color:#1a1a1a;line-height:1;margin-bottom:3px;">R$ '+fm(p8)+'</div>'
        +'<div style="font-size:10px;color:#999;">por mês — 8 parcelas</div>'
        +'<div style="font-size:9.5px;color:#aaa;margin-top:4px;">Total: R$ '+fm(parc)+'</div>'
      +'</div>'
      // À Vista (destaque)
      +'<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:12px;overflow:hidden;">'
        +'<div style="background:#0f0c00;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(201,168,76,0.2);">'
          +'<span style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">À VISTA</span>'
          +'<span style="background:#C9A84C;color:#000;font-size:7.5px;font-weight:900;padding:2px 8px;border-radius:20px;">DESCONTO</span>'
        +'</div>'
        +'<div style="padding:12px 14px;background:#fff;">'
          +'<div style="font-size:26px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:3px;">R$ '+fm(vista)+'</div>'
          +'<div style="font-size:10px;color:#a06020;font-weight:700;margin-bottom:5px;">Desconto especial pagamento à vista</div>'
          +'<div style="display:inline-flex;align-items:center;gap:4px;background:#edf7ed;border:1px solid #7ac47a;color:#1e6b1e;font-size:8.5px;font-weight:900;padding:2px 9px;border-radius:20px;">&#9660; Economize R$ '+fm(economia)+'</div>'
        +'</div>'
      +'</div>'
    +'</div>'
    // Condição de pagamento resumo
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;">'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:12px 15px;text-align:center;">'
        +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">ENTRADA — 50%</div>'
        +'<div style="font-size:18px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:3px;">R$ '+fm(ent)+'</div>'
        +'<div style="font-size:9.5px;color:#999;">Na assinatura / medição</div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:12px 15px;text-align:center;">'
        +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:4px;font-weight:900;">NA ENTREGA — 50%</div>'
        +'<div style="font-size:18px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:3px;">R$ '+fm(ent)+'</div>'
        +'<div style="font-size:9.5px;color:#999;">Na entrega e instalação</div>'
      +'</div>'
    +'</div>';

  var pag1=''
    +'<div id="pdfPag1" style="width:700px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;page-break-after:always;">'
      +headerHtml
      +'<div style="padding:22px 38px 18px;">'
        +fotoTumulo
        +descricaoProj
        +sh('Valores do Projeto')
        +valorCapa
      +'</div>'
      +footerHtml
    +'</div>';

  // ══════════════════════════════════════════════════════
  // PÁGINA 2 — PEÇAS, DIMENSÕES E MATERIAL
  // ══════════════════════════════════════════════════════

  // ── Peças e Dimensões ──
  var PECAS_LABEL={
    tampo:'Tampo (Tampa Superior)',
    frente:'Frente (Frontal)',
    lateral_d:'Lateral Direita',
    lateral_e:'Lateral Esquerda',
    fundo:'Fundo (Traseira)',
    base:'Base / Soleira',
    cruz:'Cruz / Símbolo',
    gaveta:'Gaveta',
    gaveta2:'2ª Gaveta',
    gaveta3:'3ª Gaveta',
    painel:'Painel de Fundo',
    degrau:'Degrau / Piso',
    chapim:'Chapim / Arremate',
    lateral_int:'Lateral Interna',
    peitoril:'Peitoril',
    coluna:'Coluna',
    arco:'Arco / Verga',
  };

  var pecasRows='';
  var pecasList=res.pecas||(tum.pecas)||[];

  if((!pecasList||!pecasList.length) && res.pecasCalc && res.pecasCalc.length){
    pecasList = res.pecasCalc.map(function(pc){
      var dim = pc.dim||'';
      var match = dim.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
      var w = match ? parseFloat(match[1])/100 : 0;
      var h = match ? parseFloat(match[2])/100 : 0;
      return {
        nome: pc.nm||pc.nome||pc.desc||'Peça',
        qtd:  pc.qt||pc.q||pc.qtd||1,
        comp: w, larg: h,
        m2:   pc.m2||0,
        dims: dim
      };
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
        // Converter para cm se necessário (valores > 10 provavelmente já estão em cm)
        var cDisp=c>10?c.toFixed(0):Math.round(c*100);
        var lDisp=l>10?l.toFixed(0):Math.round(l*100);
        dimStr=cDisp+' × '+lDisp+' cm';
        if(e){ var eDisp=e>5?e.toFixed(0):Math.round(e*100); dimStr+=' × '+eDisp+' cm'; }
      } else if(p.dims){
        dimStr=p.dims;
      }
      var bg=i%2===0?'#fff':'#faf6ef';
      pecasRows+='<tr>'
        +'<td style="padding:9px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:11.5px;font-weight:600;color:#1a1a1a;">'+escH(nm)+'</td>'
        +'<td style="padding:9px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10.5px;color:#555;text-align:center;">'+escH(dimStr)+'</td>'
        +'<td style="padding:9px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10.5px;color:#777;text-align:center;">'+(qtd>1?qtd+'x':'—')+'</td>'
        +'<td style="padding:9px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:11px;text-align:right;font-weight:700;color:#5a3800;">'+(m2?m2.toFixed(3)+' m²':'—')+'</td>'
        +'</tr>';
    });
    pecasRows+='<tr style="background:#f7f2e8;">'
      +'<td colspan="3" style="padding:10px 14px;font-size:9.5px;font-weight:900;color:#7a4400;letter-spacing:1px;">ÁREA TOTAL DE PEDRA</td>'
      +'<td style="padding:10px 14px;text-align:right;font-size:12px;font-weight:900;color:#7a4400;">'+totalM2.toFixed(3)+' m²</td>'
      +'</tr>';
  }

  var secaoPecasHtml='';
  if(pecasRows){
    secaoPecasHtml=sh('Peças e Dimensões')
      +'<div style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
        +'<table style="width:100%;border-collapse:collapse;">'
          +'<thead><tr style="background:#0f0c00;">'
            +'<th style="padding:9px 14px;text-align:left;font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">PEÇA / DESCRIÇÃO</th>'
            +'<th style="padding:9px 14px;text-align:center;font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">DIMENSÕES</th>'
            +'<th style="padding:9px 14px;text-align:center;font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">QTD</th>'
            +'<th style="padding:9px 14px;text-align:right;font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">M²</th>'
          +'</tr></thead>'
          +'<tbody>'+pecasRows+'</tbody>'
        +'</table>'
      +'</div>';
  }

  // ── Bloco de Material ──
  var matHtml=sh('Material Selecionado')
    +'<div style="border:2px solid #C9A84C;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 4px 20px rgba(201,168,76,0.15);">'
      +'<div class="'+(mat.photo?'':mat.tx)+'" style="height:80px;width:100%;position:relative;overflow:hidden;'+(mat.photo?'background-image:url(\''+mat.photo+'\');background-size:cover;background-position:center;':'')+'">'
        +'<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.45) 50%,rgba(0,0,0,0.12) 100%);">'
          +'<div style="position:absolute;left:20px;top:50%;transform:translateY(-50%);">'
            +'<div style="font-size:6.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.8);font-weight:900;margin-bottom:4px;">MATERIAL SELECIONADO</div>'
            +'<div style="font-size:20px;font-weight:900;color:#C9A84C;line-height:1;">'+(mat.nm||q.mat||'—')+'</div>'
            +(mat.cat?'<div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:3px;">'+mat.cat+(mat.fin?' · '+mat.fin:'')+'</div>':'')
          +'</div>'
          +'<div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);text-align:right;">'
            +'<div style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45);font-weight:900;margin-bottom:3px;">TOTAL DE PEDRA</div>'
            +'<div style="font-size:18px;font-weight:900;color:#fff;">'+(res.m2Total?(+res.m2Total).toFixed(3)+' m²':'—')+'</div>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 2fr;background:#fff;border-top:1px solid #e8dfc4;">'
        +'<div style="padding:12px 16px;border-right:1px solid #e8dfc4;">'
          +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:3px;font-weight:900;">CATEGORIA</div>'
          +'<div style="font-size:12px;font-weight:700;color:#1a1a1a;">'+(mat.cat||'—')+'</div>'
        +'</div>'
        +'<div style="padding:12px 16px;border-right:1px solid #e8dfc4;">'
          +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:3px;font-weight:900;">ACABAMENTO</div>'
          +'<div style="font-size:12px;font-weight:700;color:#1a1a1a;">'+(mat.fin||'Polida')+'</div>'
        +'</div>'
        +'<div style="padding:12px 16px;">'
          +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:3px;font-weight:900;">CARACTERÍSTICAS</div>'
          +'<div style="font-size:10.5px;color:#666;">'+(mat.desc||'Material de alta qualidade para sua obra.')+'</div>'
        +'</div>'
      +'</div>'
    +'</div>';

  // ── Como Funciona ──
  var comoFuncionaHtml=sh('Como Funciona')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 15px;display:flex;align-items:flex-start;gap:11px;">'
        +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.4);border-radius:8px;padding:8px;flex-shrink:0;">📐</div>'
        +'<div><div style="font-size:11px;font-weight:700;color:#1a1a1a;margin-bottom:3px;">1. Medição em Campo</div>'
          +'<div style="font-size:9.5px;color:#666;line-height:1.5;">Visita técnica após o pagamento da entrada para conferência e aprovação definitiva das medidas.</div></div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 15px;display:flex;align-items:flex-start;gap:11px;">'
        +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.4);border-radius:8px;padding:8px;flex-shrink:0;">⚙️</div>'
        +'<div><div style="font-size:11px;font-weight:700;color:#1a1a1a;margin-bottom:3px;">2. Corte e Fabricação</div>'
          +'<div style="font-size:9.5px;color:#666;line-height:1.5;">Pedra cortada com precisão milimétrica em nosso maquinário. Rigoroso controle dimensional em cada peça.</div></div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 15px;display:flex;align-items:flex-start;gap:11px;">'
        +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.4);border-radius:8px;padding:8px;flex-shrink:0;">✨</div>'
        +'<div><div style="font-size:11px;font-weight:700;color:#1a1a1a;margin-bottom:3px;">3. Acabamento Profissional</div>'
          +'<div style="font-size:9.5px;color:#666;line-height:1.5;">Polimento e tratamentos especializados. Superfície perfeita, durável e impecável.</div></div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 15px;display:flex;align-items:flex-start;gap:11px;">'
        +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.4);border-radius:8px;padding:8px;flex-shrink:0;">🚛</div>'
        +'<div><div style="font-size:11px;font-weight:700;color:#1a1a1a;margin-bottom:3px;">4. Entrega e Instalação</div>'
          +'<div style="font-size:9.5px;color:#666;line-height:1.5;">Nossa equipe realiza a entrega, instalação e nivelamento. Vedação profissional inclusa.</div></div>'
      +'</div>'
    +'</div>';

  var pag2=''
    +'<div id="pdfPag2" style="width:700px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;page-break-after:always;">'
      +headerHtml
      +'<div style="padding:22px 38px 18px;">'
        +secaoPecasHtml
        +matHtml
        +comoFuncionaHtml
      +'</div>'
      +footerHtml
    +'</div>';

  // ══════════════════════════════════════════════════════
  // PÁGINA 3 — ESTRUTURA CIVIL + COMPOSIÇÃO DO PROJETO
  // ══════════════════════════════════════════════════════

  // ── Estrutura Civil (seção detalhada) ──
  var estCivil=res.estruturaCivil||tum.estruturaCivil||{};
  var custoEstrutura=res.custoEstrutura||estCivil.custo||0;

  // Itens de estrutura civil
  var itensCivil=[
    {icon:'🏗️', titulo:'Fundação e Base de Concreto',
     desc:'Execução da laje de fundo em concreto armado (fck ≥ 20 MPa) com tela metálica. Regularização do terreno e compactação do solo. Espessura mínima de 10 cm para garantir nivelamento e resistência estrutural permanente.'},
    {icon:'🧱', titulo:'Alvenaria de Vedação (Caixão)',
     desc:'Construção das paredes em bloco de concreto ou tijolo maciço, com argamassa traço 1:3 (cimento:areia). Execução de reboco interno com acabamento liso para receber as placas de pedra. Abertura e fechamento de vãos conforme projeto.'},
    {icon:'🔩', titulo:'Estrutura Metálica e Fixações',
     desc:'Instalação de perfis metálicos galvanizados para suporte das tampas e gavetas. Ancoragem dos painéis e lápides com chumbadores de aço inox. Vedação com silicone neutro flexível em todas as junções para evitar infiltração.'},
    {icon:'🪣', titulo:'Argamassa Colante e Rejuntamento',
     desc:'Aplicação de argamassa colante especial para pedra natural (tipo AC-III) em todas as faces. Rejunte com material flexível na cor do projeto. Impermeabilização das juntas com produto específico para ambientes expostos.'},
    {icon:'💧', titulo:'Impermeabilização e Proteção',
     desc:'Tratamento de toda a estrutura interna com manta impermeabilizante ou resina acrílica. Caimento calculado para escoamento de água da chuva. Proteção das pedras com hidrofugante de penetração para durabilidade estendida.'},
    {icon:'📐', titulo:'Nivelamento e Esquadro',
     desc:'Conferência de todas as faces com nível laser e prumo. Controle dimensional rigoroso antes da montagem das pedras. Correções de base realizadas com argamassa de regularização antes da fixação final.'},
  ];

  // Verificar se tem itens específicos informados
  if(estCivil.itens&&estCivil.itens.length){
    itensCivil=estCivil.itens.map(function(it){
      return {icon:'🏗️', titulo:it.titulo||it.nome||it.l||'Item', desc:it.desc||it.descricao||''};
    });
  }

  var itensCivilHtml='';
  itensCivil.forEach(function(it,i){
    var bg=i%2===0?'#fff':'#faf6ef';
    itensCivilHtml+=''
      +'<div style="background:'+bg+';border-bottom:1px solid #ede8dc;padding:12px 16px;display:flex;align-items:flex-start;gap:12px;">'
        +'<div style="font-size:18px;flex-shrink:0;margin-top:1px;">'+it.icon+'</div>'
        +'<div style="flex:1;">'
          +'<div style="font-size:11.5px;font-weight:800;color:#1a1a1a;margin-bottom:3px;">'+it.titulo+'</div>'
          +'<div style="font-size:10px;color:#555;line-height:1.6;">'+it.desc+'</div>'
        +'</div>'
      +'</div>';
  });

  var secaoEstruturaCivilHtml=''
    +sh('Estrutura Civil — Execução e Materiais')
    // Banner de destaque
    +'<div style="background:linear-gradient(135deg,#0f0c00 0%,#1a1500 60%,#2a2000 100%);border:2px solid #C9A84C;border-radius:12px;overflow:hidden;margin-bottom:16px;">'
      +'<div style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;">'
        +'<div>'
          +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.7);font-weight:900;margin-bottom:5px;">INCLUSO NO ORÇAMENTO</div>'
          +'<div style="font-size:18px;font-weight:900;color:#C9A84C;line-height:1.2;">Execução Completa da<br>Estrutura Civil</div>'
          +'<div style="font-size:9.5px;color:rgba(255,255,255,0.5);margin-top:6px;max-width:320px;line-height:1.5;">Todo o serviço de alvenaria, fundação, impermeabilização e montagem está incluso no valor apresentado. Você não terá surpresas extras.</div>'
        +'</div>'
        +(custoEstrutura?''
          +'<div style="text-align:right;flex-shrink:0;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.5);margin-bottom:4px;font-weight:900;">VALOR DA ESTRUTURA</div>'
            +'<div style="font-size:22px;font-weight:900;color:#C9A84C;line-height:1;">R$ '+fm(custoEstrutura)+'</div>'
            +'<div style="font-size:8.5px;color:rgba(255,255,255,0.3);margin-top:3px;">incluso no total</div>'
          +'</div>'
        :'')
      +'</div>'
    +'</div>'
    // Lista de itens de estrutura civil
    +'<div style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
      +itensCivilHtml
    +'</div>';

  // ── Linhas de custo / Composição ──
  var custoRows='';
  var custoItems=[
    {icon:'🪨',l:'Pedras — '+tipoLabel,v:res.custoPedra||0,sub:(mat.nm||q.mat||'')+(res.m2Total?' — '+(+res.m2Total).toFixed(3)+' m²':'')},
    {icon:'🔨',l:'Mão de Obra Marmoraria',v:res.custoMdo||0,sub:'Corte, polimento, lapidação e montagem'},
    {icon:'🏗️',l:'Estrutura Civil Completa',v:res.custoEstrutura||0,sub:'Fundação, alvenaria, argamassa e impermeabilização'},
    {icon:'🪣',l:'Materiais de Fixação',v:res.custoMat||0,sub:'Argamassa colante, rejunte, silicone, chumbadores'}
  ];
  custoItems.forEach(function(it,i){
    if(!it.v&&it.v!==0)return;
    var bg=i%2===0?'#fff':'#faf6ef';
    custoRows+=''
      +'<tr>'
        +'<td style="padding:11px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:12px;font-weight:700;color:#1a1a1a;">'+it.icon+' '+it.l+'</td>'
        +'<td style="padding:11px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10px;color:#888;text-align:center;">'+it.sub+'</td>'
        +'<td style="padding:11px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:12px;text-align:right;font-weight:700;color:#1a1a1a;">R$ '+fm(it.v)+'</td>'
      +'</tr>';
  });
  custoRows+=''
    +'<tr style="background:#0f0c00;">'
      +'<td colspan="2" style="padding:12px 14px;font-size:9.5px;font-weight:900;color:#C9A84C;letter-spacing:1px;">CUSTO TOTAL DO PROJETO</td>'
      +'<td style="padding:12px 14px;text-align:right;font-size:13px;font-weight:900;color:#C9A84C;">R$ '+fm(res.custoTotal||vista||0)+'</td>'
    +'</tr>';

  var secaoComposicaoHtml=''
    +sh('Composição do Projeto')
    +'<div style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
      +'<table style="width:100%;border-collapse:collapse;">'
        +'<thead><tr style="background:#0f0c00;">'
          +'<th style="padding:10px 14px;text-align:left;font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">ITEM</th>'
          +'<th style="padding:10px 14px;text-align:center;font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">DETALHE</th>'
          +'<th style="padding:10px 14px;text-align:right;font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">VALOR</th>'
        +'</tr></thead>'
        +'<tbody>'+custoRows+'</tbody>'
      +'</table>'
    +'</div>'
    // Valor final destaque
    +'<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:10px;overflow:hidden;margin-bottom:16px;box-shadow:0 3px 16px rgba(201,168,76,0.2);">'
      +'<div style="background:#0f0c00;padding:9px 16px;display:flex;align-items:center;justify-content:space-between;">'
        +'<span style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">VALOR À VISTA</span>'
        +'<span style="background:#C9A84C;color:#000;font-size:7.5px;font-weight:900;padding:2px 8px;border-radius:20px;">MELHOR OPÇÃO</span>'
      +'</div>'
      +'<div style="padding:14px 16px;background:#fff;display:flex;align-items:center;justify-content:space-between;">'
        +'<div>'
          +'<div style="font-size:28px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:4px;">R$ '+fm(vista)+'</div>'
          +'<div style="font-size:10.5px;color:#a06020;font-weight:700;">Valor final sem juros — pagamento à vista</div>'
        +'</div>'
        +'<div style="text-align:right;">'
          +'<div style="font-size:8.5px;color:#888;margin-bottom:3px;">Parcelado em 8x: R$ '+fm(p8)+'/mês</div>'
          +'<div style="display:inline-flex;align-items:center;gap:4px;background:#edf7ed;border:1px solid #7ac47a;color:#1e6b1e;font-size:8.5px;font-weight:900;padding:3px 10px;border-radius:20px;">&#9660; Economize R$ '+fm(economia)+'</div>'
        +'</div>'
      +'</div>'
    +'</div>';

  // Garantia e responsabilidades
  var garantiaHtml=''
    +sh('Garantias e Responsabilidades')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px;">'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 15px;">'
        +'<div style="font-size:9px;font-weight:900;color:#7a4400;margin-bottom:6px;">✅ INCLUSO NO SERVIÇO</div>'
        +'<div style="font-size:9.5px;color:#555;line-height:1.7;">'
          +'• Projeto e consultoria técnica<br>'
          +'• Corte e usinagem das pedras<br>'
          +'• Estrutura civil completa<br>'
          +'• Transporte até o cemitério<br>'
          +'• Montagem e instalação<br>'
          +'• Vedação e rejunte final'
        +'</div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 15px;">'
        +'<div style="font-size:9px;font-weight:900;color:#7a4400;margin-bottom:6px;">ℹ️ INFORMAÇÕES IMPORTANTES</div>'
        +'<div style="font-size:9.5px;color:#555;line-height:1.7;">'
          +'• Orçamento válido por 7 dias<br>'
          +'• Medição técnica após entrada<br>'
          +'• Prazo de entrega informado na medição<br>'
          +'• Garantia de 12 meses na instalação<br>'
          +'• Visita de acompanhamento inclusa<br>'
          +'• Suporte pós-instalação garantido'
        +'</div>'
      +'</div>'
    +'</div>';

  var pag3=''
    +'<div id="pdfPag3" style="width:700px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;">'
      +headerHtml
      +'<div style="padding:22px 38px 18px;">'
        +secaoEstruturaCivilHtml
        +secaoComposicaoHtml
        +garantiaHtml
      +'</div>'
      +footerHtml
    +'</div>';

  // ══════════════════════════════════════════════════════
  // CONTAINER COMPLETO (3 páginas)
  // ══════════════════════════════════════════════════════
  var recHtml=''
    +'<div id="pdfReceipt" style="width:700px;font-family:Arial,Helvetica,sans-serif;background:#e0ddd8;">'
      // Página 1
      +'<div style="background:#fff;margin-bottom:12px;">'+pag1.replace(/<div id="pdfPag1"[^>]*>/,'<div>').replace(/<\/div>\s*$/,'</div>')+'</div>'
      // Separador visual
      +'<div style="height:12px;background:#e0ddd8;"></div>'
      // Página 2
      +'<div style="background:#fff;margin-bottom:12px;">'+pag2.replace(/<div id="pdfPag2"[^>]*>/,'<div>').replace(/<\/div>\s*$/,'</div>')+'</div>'
      +'<div style="height:12px;background:#e0ddd8;"></div>'
      // Página 3
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
    +'<span style="flex:1;font-size:.75rem;color:#C9A84C;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">⚱️ '+orcNum+' — '+escH(q.cli)+'</span>'
    +'<button id="pdfBtnClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">✕</button>'
    +'<button id="pdfBtnDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">⏳ Gerando...</button>'
    +(navigator.share?'<button id="pdfBtnShare" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">↗ Compartilhar</button>':'')
    +'<button id="pdfBtnPrint" style="background:#C9A84C;border:none;color:#000;padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">🖨 Imprimir</button>';

  var preview=document.createElement('div');
  preview.style.cssText='flex:1;overflow-y:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
  preview.innerHTML='<div style="text-align:center;color:#C9A84C;padding:60px 20px;font-family:Outfit,sans-serif;font-size:.85rem;letter-spacing:.5px;">⏳ Gerando PDF com 3 páginas, aguarde...</div>';

  ov.appendChild(barEl);
  ov.appendChild(preview);
  document.body.appendChild(ov);

  document.getElementById('pdfBtnClose').onclick=function(){ov.remove();};
  document.getElementById('pdfBtnPrint').onclick=function(){
    var w=window.open('','_blank');
    if(w){
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'
        +'*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
        +'body{background:#e0ddd8;}'
        +'@media print{'
          +'.pag-break{page-break-after:always;display:block;}'
          +'body{background:#fff;}'
        +'}'
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

  // Gerar PDF com múltiplas páginas A4 (uma canvas por página)
  setTimeout(function(){
    var jsPDF=window.jspdf.jsPDF;
    var pageW=595.28;
    var pageH=841.89; // A4

    // Páginas para capturar
    var pagIds=['pdfPag1','pdfPag2','pdfPag3'];
    var pagEls=pagIds.map(function(id){return offscreen.querySelector('#'+id);}).filter(Boolean);

    if(!pagEls.length){
      // Fallback: capturar tudo de uma vez
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
        finalizarPDF(pdf, canvas);
      });
      return;
    }

    // Capturar cada página individualmente
    var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
    var capturas=[];

    function capturarPagina(idx){
      if(idx>=pagEls.length){
        // Todas as páginas capturadas → montar PDF
        capturas.forEach(function(canvas,i){
          if(i>0) pdf.addPage();
          var imgH=pageW*(canvas.height/canvas.width);
          // Calcular escala para caber em A4
          var scale=pageH/imgH;
          var finalH=Math.min(imgH,pageH);
          var finalW=pageW;
          if(imgH>pageH){
            finalH=pageH;
            finalW=pageW;
          }
          pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',0,0,finalW,imgH>pageH?pageH:imgH);
        });
        finalizarPDF(pdf, capturas[0]);
        return;
      }
      html2canvas(pagEls[idx],{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:700,windowWidth:700}).then(function(canvas){
        capturas.push(canvas);
        capturarPagina(idx+1);
      });
    }

    function finalizarPDF(pdf, previewCanvas){
      document.body.removeChild(offscreen);
      var pdfBlob=pdf.output('blob');

      // Montar preview com as 3 páginas
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
