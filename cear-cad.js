// CAD simples — só o formato da porta, sem ferragens
const ns = 'http://www.w3.org/2000/svg';
function E(tag, a, txt) {
  const e = document.createElementNS(ns, tag);
  Object.entries(a||{}).forEach(([k,v]) => e.setAttribute(k,v));
  if (txt !== undefined) e.textContent = txt;
  return e;
}

function renderCAD(svgEl, state) {
  const { tipo, larg, alt, folhas, fixoLarg, bandH, temFixo, temBandeirola,
          pivFolhas, janelaFolhas } = state;
  if (!svgEl || !larg || !alt) return;
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

  const W=320, H=200;
  // Fundo branco com borda
  svgEl.appendChild(E('rect',{x:0,y:0,width:W,height:H,fill:'#f8f9fa'}));
  svgEl.appendChild(E('rect',{x:2,y:2,width:W-4,height:H-4,fill:'none',stroke:'#aac8d8','stroke-width':'5',rx:'3'}));
  svgEl.appendChild(E('rect',{x:6,y:6,width:W-12,height:H-12,fill:'none',stroke:'#333','stroke-width':'1.2',rx:'1'}));

  // Cores
  const COR_MOVEL = '#2AC4D8';  // azul ciano = painel móvel (porta)
  const COR_FIXO  = '#a8e4ef';  // azul claro = painel fixo
  const BORDA     = '#000';
  const NUM       = 'rgba(0,0,0,0.55)';
  const DIM       = '#0044cc';

  // Escala
  const hasFixo = temFixo && fixoLarg>0 && tipo==='pivotante';
  const hasBand = temBandeirola && bandH>0 && tipo==='pivotante';
  const tW = larg + (hasFixo ? Number(fixoLarg)||0 : 0);
  const tH = alt  + (hasBand ? Number(bandH)||0  : 0);

  const sc = Math.min((W-60)/tW, (H-44)/tH);
  const pw = Math.round(larg*sc), ph = Math.round(alt*sc);
  const fxW = hasFixo ? Math.round((Number(fixoLarg)||0)*sc) : 0;
  const bdH = hasBand ? Math.round((Number(bandH)||0)*sc) : 0;
  const ox = Math.round((W - (pw+fxW)) / 2);
  const oy = Math.round((H - (ph+bdH)) / 2 - 4);

  const pX=ox, pY=oy+bdH, fX=ox+pw, bY=oy;

  // Painel móvel (porta)
  function movel(x, y, w, h, n) {
    svgEl.appendChild(E('rect',{x,y,width:w,height:h,fill:COR_MOVEL}));
    svgEl.appendChild(E('rect',{x,y,width:w,height:h,fill:'none',stroke:BORDA,'stroke-width':'2.5'}));
    if (n) svgEl.appendChild(E('text',{x:x+w/2,y:y+h/2+6,'text-anchor':'middle','font-size':'16','font-family':'Arial,sans-serif','font-weight':'bold',fill:NUM},String(n)));
  }
  // Painel fixo
  function fixo(x, y, w, h, n) {
    svgEl.appendChild(E('rect',{x,y,width:w,height:h,fill:COR_FIXO}));
    // Hachura leve indicando fixo
    for (let i=0; i<w+h; i+=10) {
      svgEl.appendChild(E('line',{x1:x+i,y1:y,x2:x,y2:y+i,stroke:'rgba(0,100,140,0.12)','stroke-width':'1'}));
    }
    svgEl.appendChild(E('rect',{x,y,width:w,height:h,fill:'none',stroke:BORDA,'stroke-width':'2.5','stroke-dasharray':'5,3'}));
    if (n) svgEl.appendChild(E('text',{x:x+w/2,y:y+h/2+6,'text-anchor':'middle','font-size':'14','font-family':'Arial,sans-serif','font-weight':'bold',fill:'rgba(0,80,100,0.6)'},String(n)));
  }
  // Divisória
  function div(x, y, h) {
    svgEl.appendChild(E('line',{x1:x,y1:y,x2:x,y2:y+h,stroke:BORDA,'stroke-width':'3.5'}));
  }
  // Cota horizontal
  function cotaH(x1, x2, y, lbl) {
    svgEl.appendChild(E('line',{x1,y1:y-3,x2:x1,y2:y+3,stroke:DIM,'stroke-width':'1'}));
    svgEl.appendChild(E('line',{x1:x2,y1:y-3,x2,y2:y+3,stroke:DIM,'stroke-width':'1'}));
    svgEl.appendChild(E('line',{x1,y1:y,x2,y2:y,stroke:DIM,'stroke-width':'1.2'}));
    svgEl.appendChild(E('text',{x:(+x1+ +x2)/2,y:y+10,'text-anchor':'middle','font-size':'9','font-family':'Arial,sans-serif','font-weight':'bold',fill:DIM},lbl));
  }
  // Cota vertical
  function cotaV(x, y1, y2, lbl) {
    svgEl.appendChild(E('line',{x1:x-3,y1,x2:x+3,y2:y1,stroke:DIM,'stroke-width':'1'}));
    svgEl.appendChild(E('line',{x1:x-3,y1:y2,x2:x+3,y2,stroke:DIM,'stroke-width':'1'}));
    svgEl.appendChild(E('line',{x1:x,y1,x2:x,y2,stroke:DIM,'stroke-width':'1.2'}));
    const t = E('text',{x:x+10,y:(+y1+ +y2)/2,'text-anchor':'middle','font-size':'9','font-family':'Arial,sans-serif','font-weight':'bold',fill:DIM,transform:`rotate(-90,${x+10},${(+y1+ +y2)/2})`},lbl);
    svgEl.appendChild(t);
  }

  // ── PIVOTANTE ──────────────────────────────────────────────
  if (tipo==='pivotante') {
    const nF = Number(pivFolhas)||1;

    if (hasBand) {
      fixo(pX, bY, pw+fxW, bdH, null);
      svgEl.appendChild(E('text',{x:pX+(pw+fxW)/2,y:bY+bdH/2+5,'text-anchor':'middle','font-size':'10','font-family':'Arial,sans-serif',fill:'rgba(0,80,100,0.6)'},'bandeirola'));
      svgEl.appendChild(E('line',{x1:pX,y1:pY,x2:pX+pw+fxW,y2:pY,stroke:BORDA,'stroke-width':'3'}));
    }
    if (hasFixo) {
      fixo(fX, pY, fxW, ph, null);
      svgEl.appendChild(E('text',{x:fX+fxW/2,y:pY+ph/2+5,'text-anchor':'middle','font-size':'10','font-family':'Arial,sans-serif',fill:'rgba(0,80,100,0.6)'},'fixo'));
      div(fX, pY, ph);
    }

    if (nF===2) {
      const hw=Math.round(pw/2);
      movel(pX,    pY, hw, ph, 1);
      movel(pX+hw, pY, hw, ph, 2);
      div(pX+hw, pY, ph);
    } else {
      movel(pX, pY, pw, ph, 1);
    }

    cotaH(pX, pX+pw, pY+ph+18, larg+' cm');
    if (hasFixo) cotaH(fX, fX+fxW, pY+ph+18, (fixoLarg||0)+' cm');
    cotaV(pX+pw+(hasFixo?fxW:0)+18, pY, pY+ph, alt+' cm');
    if (hasBand) cotaV(pX+pw+(hasFixo?fxW:0)+18, bY, pY, (bandH||0)+' cm');

  // ── CORRER ──────────────────────────────────────────────────
  } else if (tipo==='correr') {
    const nF=Number(folhas)||2;
    const nM={1:1,2:2,3:2,4:2}[nF]||2;
    const fixaIdx = (nF-nM)===2?[0,nF-1]:(nF-nM)===1?[0]:[];
    const fw=Math.round(pw/nF);

    for (let i=0; i<nF; i++) {
      const fx=pX+fw*i, isF=fixaIdx.includes(i);
      if (isF) fixo(fx, pY, fw, ph, i+1);
      else     movel(fx, pY, fw, ph, i+1);
      if (i>0) div(fx, pY, ph);
    }

    cotaH(pX, pX+pw, pY+ph+18, larg+' cm');
    cotaV(pX+pw+18, pY, pY+ph, alt+' cm');

  // ── JANELA ──────────────────────────────────────────────────
  } else if (tipo==='janela') {
    const nFj = janelaFolhas||(larg<=120?2:4);
    const fixaJ = nFj===4?[0,nFj-1]:nFj===3?[0]:[0];
    const fw2=Math.round(pw/nFj);

    for (let i=0; i<nFj; i++) {
      const fx=pX+fw2*i, isF=fixaJ.includes(i);
      if (isF) fixo(fx, pY, fw2, ph, i+1);
      else     movel(fx, pY, fw2, ph, i+1);
      if (i>0) div(fx, pY, ph);
    }

    cotaH(pX, pX+pw, pY+ph+18, larg+' cm');
    cotaV(pX+pw+18, pY, pY+ph, alt+' cm');

  // ── DEMAIS ──────────────────────────────────────────────────
  } else {
    if (tipo==='box') {
      const hw3=Math.round(pw/2);
      movel(pX, pY, hw3, ph, 1);
      movel(pX+hw3, pY, hw3, ph, 2);
      div(pX+hw3, pY, ph);
    } else {
      movel(pX, pY, pw, ph, 1);
      if (tipo==='espelho') {
        svgEl.appendChild(E('line',{x1:pX+pw*.15,y1:pY+6,x2:pX+pw*.04,y2:pY+ph-6,stroke:'rgba(255,255,255,0.5)','stroke-width':'5','stroke-linecap':'round'}));
      } else if (tipo==='basculante') {
        svgEl.appendChild(E('path',{d:`M${pX+pw/2-8},${pY} Q${pX+pw/2},${pY-10} ${pX+pw/2+8},${pY}`,fill:'#333'}));
      } else if (tipo==='guarda') {
        const m=Math.max(1,Math.ceil(larg/120));
        for (let i=1;i<m;i++) div(pX+Math.round(pw/m*i), pY, ph);
        svgEl.appendChild(E('rect',{x:pX+2,y:pY+2,width:pw-4,height:7,rx:'2',fill:'rgba(0,0,0,0.5)'}));
      } else {
        const a=((larg/100)*(alt/100)).toFixed(2);
        svgEl.appendChild(E('text',{x:pX+pw/2,y:pY+ph/2+5,'text-anchor':'middle','font-size':'11','font-family':'Arial,sans-serif','font-weight':'bold',fill:'rgba(0,0,0,0.4)'},a+' m²'));
      }
    }
    cotaH(pX, pX+pw, pY+ph+18, larg+' cm');
    cotaV(pX+pw+18, pY, pY+ph, alt+' cm');
  }

  // Legenda de cores
  const ly = H - 14;
  svgEl.appendChild(E('rect',{x:10,y:ly-7,width:12,height:8,fill:COR_MOVEL,stroke:BORDA,'stroke-width':'1'}));
  svgEl.appendChild(E('text',{x:24,y:ly,'font-size':'7','font-family':'Arial,sans-serif',fill:'#333'},'móvel'));
  svgEl.appendChild(E('rect',{x:58,y:ly-7,width:12,height:8,fill:COR_FIXO,stroke:BORDA,'stroke-width':'1','stroke-dasharray':'3,2'}));
  svgEl.appendChild(E('text',{x:72,y:ly,'font-size':'7','font-family':'Arial,sans-serif',fill:'#333'},'fixo'));
}

// Mini-CADs dos botões de configuração
function renderMiniCAD(svgId, config) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const W=60, H=44, M=4;
  const { tipo, fixo, band, folhas } = config;
  const CM='#2AC4D8', CF='#a8e4ef', BL='#000';
  function R(x,y,w,h,a){const e=document.createElementNS(ns,'rect');Object.entries({x,y,width:w,height:h,...a}).forEach(([k,v])=>e.setAttribute(k,v));return e;}
  function L(x1,y1,x2,y2,a){const e=document.createElementNS(ns,'line');Object.entries({x1,y1,x2,y2,...a}).forEach(([k,v])=>e.setAttribute(k,v));return e;}
  svg.appendChild(R(0,0,W,H,{fill:'#1a1a2e'}));
  if (tipo==='pivotante') {
    const fxW=fixo?W*.28:0, bdH=band?H*.2:0;
    const nFl=folhas||1, px=M, py=M+bdH, pw=W-M*2-fxW, ph=H-M*2-bdH;
    if (band) { svg.appendChild(R(px,M,pw,bdH,{fill:CF,stroke:BL,'stroke-width':'1.2','stroke-dasharray':'3,2'})); svg.appendChild(L(px,py,px+pw,py,{stroke:BL,'stroke-width':'2'})); }
    if (fixo) { svg.appendChild(R(px+pw,py,fxW,ph,{fill:CF,stroke:BL,'stroke-width':'1.2','stroke-dasharray':'3,2'})); svg.appendChild(L(px+pw,py,px+pw,py+ph,{stroke:BL,'stroke-width':'2.5'})); }
    if (nFl===2) {
      const hw=pw/2;
      svg.appendChild(R(px,py,hw,ph,{fill:CM,stroke:BL,'stroke-width':'1.5'}));
      svg.appendChild(R(px+hw,py,hw,ph,{fill:CM,stroke:BL,'stroke-width':'1.5'}));
      svg.appendChild(L(px+hw,py,px+hw,py+ph,{stroke:BL,'stroke-width':'2.5'}));
    } else {
      svg.appendChild(R(px,py,pw,ph,{fill:CM,stroke:BL,'stroke-width':'1.5'}));
    }
  } else if (tipo==='correr') {
    const nF=folhas||2, fw=(W-M*2)/nF, fxI=nF===4?[0,nF-1]:nF===3?[0]:[];
    svg.appendChild(R(M-1,M-2,W-M*2+2,3,{rx:'1',fill:BL}));
    for(let f=0;f<nF;f++){
      const fx=M+fw*f, isF=fxI.includes(f);
      svg.appendChild(R(fx,M,fw,H-M*2,{fill:isF?CF:CM,stroke:BL,'stroke-width':'1.2','stroke-dasharray':isF?'4,2':''}));
      if(f>0) svg.appendChild(L(fx,M,fx,H-M,{stroke:BL,'stroke-width':'2.5'}));
    }
    svg.appendChild(R(M,M,W-M*2,H-M*2,{fill:'none',stroke:BL,'stroke-width':'1.5'}));
    svg.appendChild(R(M-1,H-M-1,W-M*2+2,3,{rx:'1',fill:BL}));
  } else if (tipo==='janela') {
    const nFj=folhas||2, fw2=(W-M*2)/nFj, fxI2=nFj===4?[0,nFj-1]:nFj===3?[0]:[0];
    for(let f=0;f<nFj;f++){
      const fx2=M+fw2*f, isF=fxI2.includes(f);
      svg.appendChild(R(fx2,M,fw2,H-M*2,{fill:isF?CF:CM,stroke:BL,'stroke-width':'1.2','stroke-dasharray':isF?'4,2':''}));
      if(f>0) svg.appendChild(L(fx2,M,fx2,H-M,{stroke:BL,'stroke-width':'2'}));
    }
    svg.appendChild(R(M,M,W-M*2,H-M*2,{fill:'none',stroke:BL,'stroke-width':'1.5'}));
  }
}

function _renderMiniKitCADs() {}
