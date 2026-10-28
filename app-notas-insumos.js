// ══════════════════════════════════════════════════════════════════════
// NOTAS DE COMPRA & INSUMOS — HR Mármores e Granitos
//
// Fotografe (ou digite) a nota de uma compra. O módulo:
//   • lê os ITENS da nota (IA, só com chave Anthropic ou Gemini) e mostra
//     tudo pra você CONFERIR e corrigir antes de salvar;
//   • guarda o PREÇO DE CADA ITEM no catálogo de insumos, com histórico
//     (tubo, cantoneira, disco, cola…) e avisa quando o preço subiu/caiu;
//   • lança UM gasto em Finanças com o total (ou vincula a um gasto que já
//     exista, sem duplicar), em dinheiro vivo, banco ou "ainda não paguei";
//   • calcula o CUSTO POR PEÇA cortada de uma barra (ex.: barra de 6 m a
//     R$ 110 → tubo de 54 cm), com sobra, perda de corte e aproveitamento.
//
// Não altera preços de venda nem orçamentos: só mostra o custo real ao
// lado do que você cobra, pra você decidir.
//
// Dados: localStorage 'hr_insumos' e 'hr_notas' (entram no backup automático).
// Aba "🧾 Notas" dentro de Finanças. API: window.HR_NOTAS.
// ══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var K_INS = 'hr_insumos';
  var K_NOTAS = 'hr_notas';
  var UNIDS = [['un', 'un'], ['barra', 'barra'], ['m', 'metro'], ['kg', 'kg'], ['saco', 'saco'], ['l', 'litro'], ['cx', 'caixa'], ['pc', 'peça']];
  var TIPOS = [['tubo', 'Tubo'], ['cantoneira', 'Cantoneira'], ['outro', 'Outro insumo']];
  var FORMAS = [['banco', 'Banco (Pix / débito / cartão)'], ['dinheiro', 'Dinheiro vivo'], ['nao_pago', 'Ainda não paguei (só registrar preços)']];

  // ───────────────────────── utilidades ─────────────────────────
  function _ler(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function _gravar(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { console.error('[NOTAS]', e); if (typeof toast === 'function') toast('⚠️ Não consegui salvar (memória cheia?)'); return false; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var t = String(v == null ? '' : v).replace(/[^\d,.\-]/g, '');
    if (!t) return 0;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }
  function r2(n) { return Math.round((n + 1e-9) * 100) / 100; }
  function brl(n) { return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function dmy(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || ''); }
  function dmCurto(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] : ''; }
  function diasEntre(a, b) { return Math.abs((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmIn(v) { return v ? String(Math.round(v * 10000) / 10000) : ''; }
  function pct(v) { return (Math.abs(v) * 100).toFixed(1).replace('.', ',') + '%'; }
  function unLabel(u) { for (var i = 0; i < UNIDS.length; i++) if (UNIDS[i][0] === u) return UNIDS[i][1]; return u; }
  function tipoLabel(t) { for (var i = 0; i < TIPOS.length; i++) if (TIPOS[i][0] === t) return TIPOS[i][1]; return 'Insumo'; }

  function getIns() { return _ler(K_INS, {}); }
  function getNotas() { return _ler(K_NOTAS, []); }

  // ───────────────────────── reconhecimento do item ─────────────────────────
  function detectarTipo(desc) {
    var n = norm(desc);
    if (/\bCANTONEIRA|\bCANT\b/.test(n)) return 'cantoneira';
    if (/\bTUBO|METALON|\bPERFIL\b|BARRA RET|BARRA QUAD/.test(n)) return 'tubo';
    return 'outro';
  }
  // "6m", "6,00 M", "6 mts", "6000mm", "600 cm" → metros (0 se não achar)
  function extrairComp(desc) {
    var s = String(desc || ''), m, v;
    m = /(\d+(?:[.,]\d+)?)\s*(?:mts?|metros?|m)\b/i.exec(s);
    if (m) { v = num(m[1]); if (v >= 0.3 && v <= 100) return v; }
    m = /(\d{3,5})\s*mm\b/i.exec(s);
    if (m) { v = num(m[1]) / 1000; if (v >= 0.3 && v <= 100) return v; }
    m = /(\d{2,4})\s*cm\b/i.exec(s);
    if (m) { v = num(m[1]) / 100; if (v >= 0.3 && v <= 100) return v; }
    return 0;
  }
  function bitola(desc) {
    var N = '(\\d+(?:[.,/]\\d+)?)', Q = '["\u201d\u2033\']?';
    var re = new RegExp(N + Q + '\\s*[xX\u00d7]\\s*' + N + Q + '(?:\\s*[xX\u00d7]\\s*' + N + Q + ')?');
    var m = re.exec(String(desc || ''));
    if (!m) return '';
    return [m[1], m[2], m[3]].filter(Boolean).map(function (x) {
      return x.indexOf('/') >= 0 ? x : String(parseFloat(x.replace(',', '.')));
    }).join('X');
  }
  function chaveDe(desc, tipo) {
    var b = bitola(desc);
    if (tipo !== 'outro' && b) return tipo + '|' + b;
    var n = norm(desc).replace(/\b\d+ ?(M|MT|MTS|METROS?)\b/g, '').replace(/\s+/g, ' ').trim();
    return 'x|' + n;
  }
  function mapUnid(u) {
    var n = norm(u);
    if (/^(UN|UND|UNID|UNIDADE)$/.test(n)) return 'un';
    if (/^(M|MT|MTS|MTR|METRO|METROS|ML)$/.test(n)) return 'm';
    if (/^(BARRA|BARRAS|BR|BRA)$/.test(n)) return 'barra';
    if (/^(KG|QUILO|QUILOS)$/.test(n)) return 'kg';
    if (/^(SC|SACO|SACOS)$/.test(n)) return 'saco';
    if (/^(L|LT|LTS|LITRO|LITROS)$/.test(n)) return 'l';
    if (/^(CX|CAIXA)$/.test(n)) return 'cx';
    if (/^(PC|PCA|PCS|PECA|PECAS)$/.test(n)) return 'pc';
    return 'un';
  }
  function mapForma(f) {
    var n = norm(f);
    if (/DINHEIRO|ESPECIE/.test(n)) return 'dinheiro';
    if (/BOLETO|PRAZO|FIADO|CREDIARIO/.test(n)) return 'nao_pago';
    return 'banco';
  }

  // ───────────────────────── cálculo de corte ─────────────────────────
  // barra de `compM` metros por `preco` reais, cortada em peças de `pecaCm`,
  // com `perdaMm` de perda por corte (disco). Devolve null se faltar dado.
  function calcCorte(preco, compM, pecaCm, perdaMm) {
    var P = num(preco), L = num(compM) * 1000, p = num(pecaCm) * 10, k = Math.max(0, num(perdaMm));
    if (!(P > 0 && L > 0 && p > 0)) return null;
    var n = Math.floor((L + k) / (p + k) + 1e-9);
    if (n < 1) return { pecas: 0 };
    var usado = n * p + (n - 1) * k, sobra = L - usado;
    return {
      pecas: n,
      custoPeca: P / n,
      custoMetal: P / (L / 1000) * (p / 1000),
      sobraCm: sobra / 10,
      sobraValor: P * (sobra / L),
      aproveit: usado / L * 100
    };
  }
  function htmlCalc(c, necessarias) {
    if (!c) return '<div class="nt-sub">Preencha o preço da barra, o comprimento e a medida da peça.</div>';
    if (!c.pecas) return '<div class="nt-warn">A peça é maior que a barra.</div>';
    var h = '<div class="nt-row"><span>Peças por barra</span><b>' + c.pecas + '</b></div>' +
      '<div class="nt-row"><span>Custo por peça<br><small>barra ÷ peças (já conta a sobra)</small></span><b class="nt-big">R$ ' + brl(c.custoPeca) + '</b></div>' +
      '<div class="nt-row"><span>Só o metal da peça</span><b>R$ ' + brl(c.custoMetal) + '</b></div>' +
      '<div class="nt-row"><span>Sobra por barra</span><b>' + c.sobraCm.toFixed(1).replace('.', ',') + ' cm · R$ ' + brl(c.sobraValor) + '</b></div>' +
      '<div class="nt-row"><span>Aproveitamento</span><b>' + c.aproveit.toFixed(1).replace('.', ',') + '%</b></div>';
    var nec = Math.floor(num(necessarias));
    if (nec > 0) {
      var barras = Math.ceil(nec / c.pecas);
      h += '<div class="nt-row"><span>Para ' + nec + ' peças</span><b>' + barras + (barras === 1 ? ' barra' : ' barras') + ' · R$ ' + brl(barras * (c.custoPeca * c.pecas)) + '</b></div>';
    }
    return h;
  }

  // ───────────────────────── catálogo de insumos ─────────────────────────
  function ultimo(ins) { return ins.hist && ins.hist.length ? ins.hist[ins.hist.length - 1] : null; }
  function variacao(ins) {
    var h = ins.hist || [], n = h.length;
    if (n < 2) return null;
    var a = h[n - 1], b = h[n - 2];
    if (a.refUnid !== b.refUnid || !(b.ref > 0)) return null;
    return (a.ref - b.ref) / b.ref;
  }
  function badge(v) {
    if (v == null) return '';
    if (Math.abs(v) < 0.005) return '<span class="nt-pill eq">= igual</span>';
    return v > 0 ? '<span class="nt-pill up">▲ ' + pct(v) + '</span>' : '<span class="nt-pill dn">▼ ' + pct(v) + '</span>';
  }
  function refDe(it) {
    var vu = num(it.vu), comp = num(it.comp);
    if (comp > 0 && it.unid !== 'm') return { ref: vu / comp, refUnid: 'm' };
    return { ref: vu, refUnid: it.unid };
  }
  function refTxt(e) { return e ? 'R$ ' + brl(e.ref) + '/' + (e.refUnid === 'm' ? 'm' : e.refUnid) : '—'; }
  function acharInsumo(ins, it) {
    if (it.insumoId && ins[it.insumoId]) return ins[it.insumoId];
    var ch = chaveDe(it.desc, it.tipo);
    var ids = Object.keys(ins);
    for (var i = 0; i < ids.length; i++) if (ins[ids[i]].chave === ch) return ins[ids[i]];
    return null;
  }
  function vendaRef(tipo) {
    var sv = (typeof CFG !== 'undefined' && CFG && CFG.sv) || {};
    if (tipo === 'tubo') return { l: 'Tubo Metálico', v: num(sv.tubo) || 60 };
    if (tipo === 'cantoneira') return { l: 'Cantoneira', v: num(sv.cant) || 110 };
    return null;
  }

  // ───────────────────────── CSS / overlay ─────────────────────────
  function injetarCss() {
    if (document.getElementById('ntCss')) return;
    var st = document.createElement('style');
    st.id = 'ntCss';
    st.textContent =
      '#ntOv{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9600;background:var(--bg);display:flex;flex-direction:column;font-family:Outfit,sans-serif;color:var(--tx);}' +
      '.nt-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--bd2);}' +
      '.nt-hd b{font-size:15px;color:var(--gold);}' +
      '.nt-x{background:none;border:0;color:var(--t2);font-size:22px;padding:4px 8px;}' +
      '.nt-bd{flex:1;overflow-y:auto;padding:16px;-webkit-overflow-scrolling:touch;}' +
      '.nt-ft{display:flex;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--bd2);}' +
      '.nt-card{background:var(--s2);border:1px solid var(--bd2);border-radius:14px;padding:14px;margin-bottom:12px;}' +
      '.nt-b{padding:12px 10px;border-radius:12px;border:1px solid var(--bd2);background:var(--s3);color:var(--tx);font-size:13px;font-weight:600;text-align:center;font-family:inherit;}' +
      '.nt-b.p{background:linear-gradient(135deg,#2a2008,#1a1400);border-color:var(--gold);color:var(--gold2);}' +
      '.nt-b.g{background:var(--grn);border-color:var(--grn);color:#fff;}' +
      '.nt-b.r{border-color:var(--red);color:var(--red);background:transparent;}' +
      '.nt-b.f{flex:1;}' +
      '.nt-in,.nt-sel{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--bd2);background:var(--s1);color:var(--tx);font-size:14px;font-family:inherit;box-sizing:border-box;}' +
      '.nt-lb{display:block;font-size:11px;color:var(--t3);margin:10px 0 4px;letter-spacing:.02em;}' +
      '.nt-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
      '.nt-g3{display:grid;grid-template-columns:1fr 1.1fr 1.2fr;gap:8px;}' +
      '.nt-sub{font-size:13px;color:var(--t2);line-height:1.5;}' +
      '.nt-sec{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);font-weight:700;margin:18px 2px 8px;}' +
      '.nt-hero{display:flex;gap:12px;align-items:center;}' +
      '.nt-ic{font-size:30px;line-height:1;}' +
      '.nt-t{font-size:15px;font-weight:700;color:var(--gold2);}' +
      '.nt-big{font-size:17px;color:var(--gold2);}' +
      '.nt-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd);font-size:13px;}' +
      '.nt-row:last-child{border:0;}' +
      '.nt-row small{color:var(--t3);font-size:11px;}' +
      '.nt-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--bd);}' +
      '.nt-item:last-child{border:0;}' +
      '.nt-item .l{min-width:0;flex:1;}' +
      '.nt-item .n{font-size:14px;font-weight:600;word-break:break-word;}' +
      '.nt-item .s{font-size:11px;color:var(--t3);margin-top:2px;}' +
      '.nt-item .r{text-align:right;flex-shrink:0;}' +
      '.nt-item .v{font-size:14px;font-weight:700;color:var(--gold2);}' +
      '.nt-pill{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-top:3px;}' +
      '.nt-pill.up{background:rgba(201,68,68,.15);color:var(--red);}' +
      '.nt-pill.dn{background:rgba(58,158,106,.15);color:var(--grn);}' +
      '.nt-pill.eq{background:var(--s4);color:var(--t2);}' +
      '.nt-pill.tp{background:rgba(201,168,76,.12);color:var(--gold2);margin:0;}' +
      '.nt-ith{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}' +
      '.nt-del{background:none;border:0;color:var(--t3);font-size:18px;padding:2px 8px;}' +
      '.nt-match{font-size:11.5px;color:var(--t2);margin-top:10px;line-height:1.5;padding:8px 10px;background:var(--s1);border-radius:8px;}' +
      '.nt-warn{font-size:12.5px;color:#e0a030;line-height:1.5;margin-top:10px;}' +
      '.nt-ok{color:var(--grn);}' +
      '.nt-load{text-align:center;padding:60px 20px;color:var(--t2);font-size:14px;}' +
      '.nt-load i{display:block;width:34px;height:34px;margin:0 auto 16px;border:3px solid var(--bd2);border-top-color:var(--gold);border-radius:50%;animation:ntsp 1s linear infinite;}' +
      '@keyframes ntsp{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  }
  function ov() {
    injetarCss();
    var el = document.getElementById('ntOv');
    if (!el) { el = document.createElement('div'); el.id = 'ntOv'; document.body.appendChild(el); }
    return el;
  }
  function quadro(titulo, corpo, rodape) {
    ov().innerHTML = '<div class="nt-hd"><b>' + titulo + '</b><button class="nt-x" onclick="HR_NOTAS.fechar()">✕</button></div>' +
      '<div class="nt-bd" id="ntBd">' + corpo + '</div>' + (rodape ? '<div class="nt-ft">' + rodape + '</div>' : '');
  }
  function fechar() {
    var el = document.getElementById('ntOv');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    _D = null; _insId = null;
    try { if (typeof renderFin === 'function') renderFin(); } catch (e) {}
  }

  // ───────────────────────── leitura da nota (IA) ─────────────────────────
  var PROMPT_NOTA =
    'Esta imagem é uma nota fiscal, cupom ou comprovante de uma compra de materiais/insumos (ferragens, ferro, discos, colas etc.). ' +
    'Extraia os dados e responda APENAS com um JSON válido, sem texto fora dele, no formato:\n' +
    '{"fornecedor":"nome da loja","numeroNota":"","data":"AAAA-MM-DD","formaPagamento":"dinheiro|pix|cartao|boleto|",' +
    '"itens":[{"descricao":"texto do item como está na nota","quantidade":0,"unidade":"UN|M|BARRA|KG|SC|L|PC|CX","valorUnitario":0,"valorTotal":0}],' +
    '"desconto":0,"frete":0,"valorTotal":0}\n' +
    'Regras: uma entrada por linha de produto; mantenha na descrição medidas e comprimentos (ex.: "TUBO QUAD 20X20 6M"); ' +
    'valorUnitario é o preço de UMA unidade (se a nota só traz o total da linha, divida pela quantidade); ' +
    'números com ponto decimal; data no formato AAAA-MM-DD; se não conseguir ler um campo deixe vazio ou 0 — NÃO invente valores.';

  function tipoChave(key) {
    key = String(key || '');
    if (key.indexOf('sk-ant-') === 0) return 'anthropic';
    if (key.indexOf('AIza') === 0 || key.indexOf('AQ.') === 0) return 'gemini';
    return key ? 'outra' : '';
  }
  function chamarIA(b64, mime) {
    var key = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.apiKey) || '';
    var tp = tipoChave(key);
    if (!tp) return Promise.reject(new Error('Configure sua chave de IA em Config → Empresa pra eu ler a foto. Você pode digitar a nota à mão.'));
    if (tp === 'outra') return Promise.reject(new Error('A chave Groq não lê imagem. Use uma chave Anthropic (sk-ant-…) ou Gemini (AIza…), ou digite a nota à mão.'));
    var prompt = PROMPT_NOTA + ' (Hoje é ' + hoje() + '.)';
    var req;
    if (tp === 'anthropic') {
      req = fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 2500,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
            { type: 'text', text: prompt }] }]
        })
      });
    } else {
      req = fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: prompt }] }],
          generationConfig: { maxOutputTokens: 2500, responseMimeType: 'application/json' }
        })
      });
    }
    return req.then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) throw new Error(d.error.message || 'Erro na IA');
      var txt = tp === 'anthropic'
        ? ((d.content || []).map(function (c) { return c.text || ''; }).join(''))
        : (((d.candidates || [])[0] || {}).content || { parts: [] }).parts.map(function (x) { return x.text || ''; }).join('');
      return lerJsonNota(txt);
    });
  }
  function lerJsonNota(txt) {
    txt = String(txt || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    var a = txt.indexOf('{'), b = txt.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('Não consegui ler a nota. Tente uma foto mais nítida e bem enquadrada.');
    try { return JSON.parse(txt.slice(a, b + 1)); }
    catch (e) { throw new Error('Não consegui ler a nota. Tente uma foto mais nítida e bem enquadrada.'); }
  }
  function reduzirImagem(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Não consegui abrir a foto.')); };
      fr.onload = function (ev) {
        var img = new Image();
        img.onerror = function () { reject(new Error('Arquivo de imagem inválido.')); };
        img.onload = function () {
          var s = Math.min(1, 1800 / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve({ b64: c.toDataURL('image/jpeg', 0.88).split(',')[1], mime: 'image/jpeg' });
        };
        img.src = ev.target.result;
      };
      fr.readAsDataURL(file);
    });
  }

  // ───────────────────────── rascunho da nota ─────────────────────────
  var _D = null;      // rascunho em conferência
  var _insId = null;  // insumo aberto
  var _cq = { preco: '', comp: '6', peca: '', perda: '0', nec: '' };

  function itemDe(raw) {
    raw = raw || {};
    var desc = String(raw.descricao || raw.desc || '').replace(/\s+/g, ' ').trim();
    var qtd = num(raw.quantidade != null ? raw.quantidade : raw.qtd) || 1;
    var unid = mapUnid(raw.unidade || raw.unid || 'un');
    var vu = num(raw.valorUnitario != null ? raw.valorUnitario : raw.vu);
    var total = num(raw.valorTotal != null ? raw.valorTotal : raw.total);
    if (!total && vu) total = r2(qtd * vu);
    if (total && (!vu || Math.abs(qtd * vu - total) > Math.max(0.05, total * 0.01))) vu = total / qtd;
    var tipo = detectarTipo(desc), comp = extrairComp(desc);
    if (comp > 0 && unid === 'un' && tipo !== 'outro') unid = 'barra';
    return { desc: desc, qtd: qtd, unid: unid, vu: vu, total: total, tipo: tipo, comp: comp, insumoId: '' };
  }
  function rascunhoDe(d, origem) {
    d = d || {};
    var itens = (d.itens || []).map(itemDe).filter(function (i) { return i.desc || i.total; });
    var soma = r2(itens.reduce(function (s, i) { return s + i.total; }, 0));
    var frete = Math.max(0, num(d.frete)) - Math.max(0, num(d.desconto));
    return {
      fornecedor: String(d.fornecedor || '').trim(), numero: String(d.numeroNota || d.numero || '').trim(),
      data: /^\d{4}-\d{2}-\d{2}$/.test(d.data || '') ? d.data : hoje(),
      forma: mapForma(d.formaPagamento || d.forma), cat: 'insumos',
      frete: r2(frete), totalLido: num(d.valorTotal != null ? d.valorTotal : d.total), itens: itens, origem: origem || 'manual', somaLida: soma
    };
  }
  function somaItens() { return r2((_D ? _D.itens : []).reduce(function (s, i) { return s + num(i.total); }, 0)); }
  function totalNota() { return r2(somaItens() + num(_D.frete)); }

  // ───────────────────────── tela de conferência ─────────────────────────
  function optsCat(sel) {
    var cats = [['insumos', '🧰 Insumos'], ['material', '🪨 Material (pedra)'], ['ferramentas', '🔧 Ferramentas'], ['fixo', '🏠 Custo fixo'], ['combustivel', '⛽ Combustível'], ['veiculo', '🚗 Veículo / manutenção'], ['outros', '📦 Outros']];
    try {
      if (typeof PL_CAT_LABEL !== 'undefined') Object.keys(PL_CAT_LABEL).forEach(function (k) {
        if (k && k.indexOf('c_') === 0) cats.push([k, PL_CAT_LABEL[k]]);
      });
    } catch (e) {}
    return cats.map(function (c) { return '<option value="' + esc(c[0]) + '"' + (c[0] === sel ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('');
  }
  function optsLista(lista, sel) {
    return lista.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function matchHtml(i) {
    var it = _D.itens[i], ins = getIns(), f = acharInsumo(ins, it), r = refDe(it);
    if (!it.desc || !(num(it.vu) > 0)) return '<div class="nt-match">Preencha descrição e valor pra guardar o preço.</div>';
    var agora = refTxt({ ref: r.ref, refUnid: r.refUnid });
    if (!f) return '<div class="nt-match">🆕 Novo insumo no catálogo · <b>' + agora + '</b></div>';
    var u = ultimo(f), h = '<div class="nt-match">📚 Soma ao histórico de <b>' + esc(f.nome) + '</b>';
    if (u && u.refUnid === r.refUnid && u.ref > 0) {
      var v = (r.ref - u.ref) / u.ref;
      h += '<br>Última compra (' + dmCurto(u.data) + '): ' + refTxt(u) + ' → agora <b>' + agora + '</b> ' + badge(v);
    } else h += '<br>Agora: <b>' + agora + '</b>';
    return h + '</div>';
  }
  function htmlItem(i) {
    var it = _D.itens[i], ins = getIns(), ids = Object.keys(ins);
    var mostraComp = it.tipo !== 'outro' || it.unid === 'barra';
    var vinc = ids.length
      ? '<label class="nt-lb">Já cadastrado com outro nome? Vincular a:</label><select class="nt-sel" onchange="HR_NOTAS._it(' + i + ',\'insumoId\',this.value)"><option value="">Automático</option>' +
        ids.map(function (id) { return '<option value="' + esc(id) + '"' + (it.insumoId === id ? ' selected' : '') + '>' + esc(ins[id].nome) + '</option>'; }).join('') + '</select>'
      : '';
    return '<div class="nt-card" id="ntIt' + i + '">' +
      '<div class="nt-ith"><span class="nt-pill tp">' + esc(tipoLabel(it.tipo)) + '</span><button class="nt-del" onclick="HR_NOTAS._del(' + i + ')" title="Remover item">✕</button></div>' +
      '<input class="nt-in" value="' + esc(it.desc) + '" placeholder="Descrição (ex.: Tubo quadrado 20x20 6m)" onchange="HR_NOTAS._it(' + i + ',\'desc\',this.value)">' +
      '<div class="nt-g3">' +
      '<div><label class="nt-lb">Qtd</label><input class="nt-in" type="number" step="any" inputmode="decimal" value="' + fmIn(it.qtd) + '" oninput="HR_NOTAS._it(' + i + ',\'qtd\',this.value)"></div>' +
      '<div><label class="nt-lb">Unidade</label><select class="nt-sel" onchange="HR_NOTAS._it(' + i + ',\'unid\',this.value)">' + optsLista(UNIDS, it.unid) + '</select></div>' +
      '<div><label class="nt-lb">Valor unit. R$</label><input class="nt-in" type="number" step="any" inputmode="decimal" value="' + fmIn(it.vu) + '" oninput="HR_NOTAS._it(' + i + ',\'vu\',this.value)"></div>' +
      '</div>' +
      '<div class="nt-g2">' +
      '<div><label class="nt-lb">Total do item R$</label><input class="nt-in" id="ntTot' + i + '" type="number" step="any" inputmode="decimal" value="' + fmIn(it.total) + '" onchange="HR_NOTAS._it(' + i + ',\'total\',this.value)"></div>' +
      '<div><label class="nt-lb">Tipo</label><select class="nt-sel" onchange="HR_NOTAS._it(' + i + ',\'tipo\',this.value)">' + optsLista(TIPOS, it.tipo) + '</select></div>' +
      '</div>' +
      (mostraComp ? '<label class="nt-lb">Comprimento da barra/peça (metros) — vira preço por metro</label><input class="nt-in" type="number" step="any" inputmode="decimal" value="' + fmIn(it.comp) + '" oninput="HR_NOTAS._it(' + i + ',\'comp\',this.value)" onchange="HR_NOTAS._it(' + i + ',\'comp\',this.value,true)">' : '') +
      '<div id="ntMt' + i + '">' + matchHtml(i) + '</div>' + vinc + '</div>';
  }
  function htmlTotais() {
    var soma = somaItens(), tot = totalNota(), aviso = '';
    if (_D.totalLido > 0 && Math.abs(_D.totalLido - tot) > 0.5) {
      aviso = '<div class="nt-warn">⚠️ A nota informa R$ ' + brl(_D.totalLido) + ', mas a soma dá R$ ' + brl(tot) + '. Confira quantidades e valores (ou ajuste o frete/desconto).</div>';
    }
    return '<div class="nt-row"><span>Soma dos itens</span><b>R$ ' + brl(soma) + '</b></div>' +
      '<div class="nt-row"><span>Frete / outros (− desconto)</span><input class="nt-in" style="width:120px;text-align:right" type="number" step="any" inputmode="decimal" value="' + fmIn(_D.frete) + '" oninput="HR_NOTAS._cab(\'frete\',this.value)"></div>' +
      '<div class="nt-row"><span><b>Total da nota</b></span><b class="nt-big">R$ ' + brl(tot) + '</b></div>' + aviso;
  }
  function desenharRevisao() {
    if (!_D) return;
    var h = '<div class="nt-sub" style="margin-bottom:12px">' +
      (_D.origem === 'manual' ? 'Digite os itens da nota.' : 'Confira o que foi lido. A leitura pode errar — olhe principalmente quantidades e valores.') + '</div>' +
      '<div class="nt-card">' +
      '<label class="nt-lb" style="margin-top:0">Fornecedor / loja</label><input class="nt-in" value="' + esc(_D.fornecedor) + '" placeholder="Ex.: Casa do Serralheiro" onchange="HR_NOTAS._cab(\'fornecedor\',this.value)">' +
      '<div class="nt-g2"><div><label class="nt-lb">Data da compra</label><input class="nt-in" type="date" value="' + esc(_D.data) + '" onchange="HR_NOTAS._cab(\'data\',this.value)"></div>' +
      '<div><label class="nt-lb">Nº da nota (opcional)</label><input class="nt-in" value="' + esc(_D.numero) + '" onchange="HR_NOTAS._cab(\'numero\',this.value)"></div></div>' +
      '<label class="nt-lb">Como pagou</label><select class="nt-sel" onchange="HR_NOTAS._cab(\'forma\',this.value)">' + optsLista(FORMAS, _D.forma) + '</select>' +
      '<div id="ntCatWrap"' + (_D.forma === 'nao_pago' ? ' style="display:none"' : '') + '><label class="nt-lb">Categoria do gasto em Finanças</label><select class="nt-sel" onchange="HR_NOTAS._cab(\'cat\',this.value)">' + optsCat(_D.cat) + '</select></div>' +
      '</div><div class="nt-sec">Itens</div><div id="ntItens">';
    _D.itens.forEach(function (_, i) { h += htmlItem(i); });
    h += '</div><button class="nt-b" style="width:100%;margin-bottom:12px" onclick="HR_NOTAS._add()">➕ Adicionar item</button>' +
      '<div class="nt-card" id="ntTotais">' + htmlTotais() + '</div>';
    quadro('🧾 Conferir nota', h,
      '<button class="nt-b" style="flex:1" onclick="HR_NOTAS.fechar()">Cancelar</button>' +
      '<button class="nt-b g" style="flex:2" onclick="HR_NOTAS.salvar()">Salvar nota</button>');
  }
  function atualizarTotais() { var el = document.getElementById('ntTotais'); if (el) el.innerHTML = htmlTotais(); }
  function redesenharItem(i) {
    var el = document.getElementById('ntIt' + i);
    if (el) el.outerHTML = htmlItem(i);
  }
  function _cab(campo, v) {
    if (!_D) return;
    if (campo === 'frete') { _D.frete = num(v); return atualizarTotais(); }
    _D[campo] = v;
    if (campo === 'forma') { var w = document.getElementById('ntCatWrap'); if (w) w.style.display = v === 'nao_pago' ? 'none' : ''; }
  }
  function _it(i, campo, v, forcar) {
    if (!_D || !_D.itens[i]) return;
    var it = _D.itens[i];
    if (campo === 'desc') {
      it.desc = String(v).replace(/\s+/g, ' ').trim();
      if (!it._tipoMan) it.tipo = detectarTipo(it.desc);
      if (!it._compMan) it.comp = extrairComp(it.desc);
      if (it.comp > 0 && it.unid === 'un' && it.tipo !== 'outro') it.unid = 'barra';
      return redesenharItem(i);
    }
    if (campo === 'qtd') { it.qtd = num(v); it.total = r2(it.qtd * num(it.vu)); }
    else if (campo === 'vu') { it.vu = num(v); it.total = r2(num(it.qtd) * it.vu); }
    else if (campo === 'total') { it.total = num(v); it.vu = num(it.qtd) > 0 ? it.total / it.qtd : it.vu; return redesenharItem(i), atualizarTotais(); }
    else if (campo === 'unid') { it.unid = v; return redesenharItem(i); }
    else if (campo === 'tipo') { it.tipo = v; it._tipoMan = true; return redesenharItem(i); }
    else if (campo === 'comp') { it.comp = num(v); it._compMan = true; if (forcar) return redesenharItem(i); }
    else if (campo === 'insumoId') { it.insumoId = v; return redesenharItem(i); }
    var t = document.getElementById('ntTot' + i); if (t) t.value = fmIn(it.total);
    var m = document.getElementById('ntMt' + i); if (m) m.innerHTML = matchHtml(i);
    atualizarTotais();
  }
  function _del(i) {
    if (!_D) return;
    _D.itens.splice(i, 1);
    desenharRevisao();
  }
  function _add() {
    if (!_D) return;
    _D.itens.push({ desc: '', qtd: 1, unid: 'un', vu: 0, total: 0, tipo: 'outro', comp: 0, insumoId: '' });
    desenharRevisao();
    setTimeout(function () { var el = document.getElementById('ntIt' + (_D.itens.length - 1)); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 30);
  }

  // ───────────────────────── salvar ─────────────────────────
  function achaGastoExistente(total, data) {
    var T = (typeof DB !== 'undefined' && DB.t) ? DB.t : [];
    for (var i = 0; i < T.length; i++) {
      var t = T[i];
      if (t.type !== 'out' || t._notaId || t.origem === 'extrato_bb' || t.origem === 'rh_pagamento') continue;
      if (Math.abs((t.value || 0) - total) > 0.01) continue;
      if (t.date && diasEntre(t.date, data) > 3) continue;
      return t;
    }
    return null;
  }
  function resumoDesc(D) {
    var nomes = D.itens.filter(function (i) { return i.desc; }).slice(0, 2).map(function (i) { return i.desc.replace(/\s+\d+([.,]\d+)?\s*m\b/i, '').slice(0, 28); });
    return (D.fornecedor ? D.fornecedor + ' — ' : 'Compra — ') + (nomes.join(', ') || 'insumos') + (D.itens.length > 2 ? ' +' + (D.itens.length - 2) : '') + (D.numero ? ' (nota ' + D.numero + ')' : '');
  }
  function salvar() {
    var D = _D; if (!D) return;
    var validos = D.itens.filter(function (i) { return i.desc && num(i.total) > 0; });
    if (!validos.length) { alert('Coloque pelo menos um item com descrição e valor.'); return; }
    var tot = totalNota();
    if (!(tot > 0)) { alert('O total da nota está zerado.'); return; }
    var itensIgnorados = D.itens.length - validos.length;
    if (itensIgnorados && !confirm(itensIgnorados + ' item(ns) sem descrição ou valor serão ignorados. Continuar?')) return;
    if (D.totalLido > 0 && Math.abs(D.totalLido - tot) > 0.5 &&
        !confirm('A nota informa R$ ' + brl(D.totalLido) + ', mas a soma dos itens dá R$ ' + brl(tot) + '. Salvar assim mesmo?')) return;

    var notaId = uid('nt_'), ins = getIns(), agora = Date.now();
    var nota = { id: notaId, data: D.data, fornecedor: D.fornecedor, numero: D.numero, forma: D.forma, cat: D.cat, frete: r2(num(D.frete)), total: tot, criadoEm: agora, itens: [], trId: null };
    validos.forEach(function (it) {
      var f = acharInsumo(ins, it), r = refDe(it);
      if (!f) {
        var id = uid('in_');
        f = ins[id] = { id: id, nome: it.desc.slice(0, 70), tipo: it.tipo, chave: chaveDe(it.desc, it.tipo), pecaCm: 0, perdaMm: 0, hist: [] };
      }
      if (it.tipo !== 'outro' && f.tipo === 'outro') f.tipo = it.tipo;
      f.hist.push({ data: D.data, forn: D.fornecedor, notaId: notaId, qtd: num(it.qtd), unid: it.unid, comp: num(it.comp), vu: num(it.vu), total: num(it.total), ref: r.ref, refUnid: r.refUnid, ts: agora });
      f.hist.sort(function (a, b) { return a.data === b.data ? a.ts - b.ts : (a.data < b.data ? -1 : 1); });
      nota.itens.push({ insumoId: f.id, desc: it.desc, qtd: num(it.qtd), unid: it.unid, comp: num(it.comp), vu: num(it.vu), total: num(it.total) });
    });

    var msgGasto = '';
    if (D.forma !== 'nao_pago') {
      var ex = achaGastoExistente(tot, D.data);
      if (ex && confirm('Já existe um gasto de R$ ' + brl(tot) + ' em ' + dmy(ex.date) + ' ("' + (ex.desc || '') + '").\n\nVincular a esta nota em vez de lançar outro gasto?')) {
        ex._notaId = notaId; if (!ex.cat) ex.cat = D.cat; nota.trId = ex.id;
        try { DB.sv(); } catch (e) {}
        msgGasto = ' · vinculada ao gasto já lançado';
      } else if (typeof DB !== 'undefined' && DB.t) {
        var tr = (typeof addTr === 'function') ? addTr('out', resumoDesc(D), tot, D.data) : null;
        if (!tr) { tr = { id: Date.now(), type: 'out', desc: resumoDesc(D), value: tot, date: D.data }; DB.t.unshift(tr); }
        tr.cat = D.cat; tr._notaId = notaId; tr.origem = D.forma === 'dinheiro' ? 'dinheiro_mao' : 'nota_itens';
        if (D.forma === 'dinheiro') tr.forma = 'Dinheiro';
        nota.trId = tr.id;
        try { DB.sv(); } catch (e) {}
        msgGasto = ' · gasto de R$ ' + brl(tot) + ' lançado em Finanças';
      }
    }
    var notas = getNotas(); notas.unshift(nota);
    if (!_gravar(K_INS, ins) || !_gravar(K_NOTAS, notas)) return;
    var n = nota.itens.length;
    _D = null;
    fechar();
    if (typeof toast === 'function') toast('✅ Nota salva: ' + n + (n === 1 ? ' item' : ' itens') + msgGasto);
  }

  // ───────────────────────── entradas: foto, manual, secretária ─────────────────────────
  function escolherFoto() {
    var inp = document.getElementById('ntFile');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'ntFile'; inp.accept = 'image/*'; inp.style.display = 'none';
      inp.onchange = function () { var f = inp.files && inp.files[0]; inp.value = ''; if (f) lerFoto(f); };
      document.body.appendChild(inp);
    }
    inp.click();
  }
  function lerFoto(file) {
    quadro('🧾 Lendo a nota…', '<div class="nt-load"><i></i>Lendo os itens da nota.<br>Isso leva alguns segundos.</div>');
    reduzirImagem(file).then(function (im) { return chamarIA(im.b64, im.mime); }).then(function (json) {
      _D = rascunhoDe(json, 'foto');
      if (!_D.itens.length) { alert('Não achei itens nessa foto. Você pode digitar a nota à mão.'); _D = rascunhoDe({}, 'manual'); _add(); return; }
      desenharRevisao();
    }).catch(function (e) {
      fechar();
      alert((e && e.message) || 'Erro ao ler a nota.');
    });
  }
  function abrirManual() { _D = rascunhoDe({}, 'manual'); _D.itens.push({ desc: '', qtd: 1, unid: 'un', vu: 0, total: 0, tipo: 'outro', comp: 0, insumoId: '' }); desenharRevisao(); }
  // chamada pela secretária: abre a conferência já preenchida (nunca salva sozinha)
  function registrarDeAcao(data) {
    _D = rascunhoDe(data, 'secretaria');
    if (!_D.itens.length) { _D = null; return false; }
    desenharRevisao();
    return true;
  }

  // ───────────────────────── detalhe do insumo ─────────────────────────
  function sparkline(h) {
    var pts = h.filter(function (e) { return e.refUnid === h[h.length - 1].refUnid && e.ref > 0; }).slice(-12);
    if (pts.length < 2) return '';
    var min = Math.min.apply(null, pts.map(function (e) { return e.ref; })), max = Math.max.apply(null, pts.map(function (e) { return e.ref; }));
    var rng = (max - min) || 1, W = 300, H = 56, dx = W / (pts.length - 1);
    var p = pts.map(function (e, i) { return (i * dx).toFixed(1) + ',' + (H - 6 - ((e.ref - min) / rng) * (H - 12)).toFixed(1); });
    var last = p[p.length - 1].split(',');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:56px;margin:8px 0 2px"><polyline fill="none" stroke="var(--gold)" stroke-width="2" points="' + p.join(' ') + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="var(--gold2)"/></svg>';
  }
  function calcBox(pref, v) {
    return '<label class="nt-lb">Preço da barra (R$)</label><input class="nt-in" id="nt' + pref + 'Preco" type="number" step="any" inputmode="decimal" value="' + esc(v.preco) + '" oninput="HR_NOTAS._calc(\'' + pref + '\')">' +
      '<div class="nt-g2"><div><label class="nt-lb">Comprimento da barra (m)</label><input class="nt-in" id="nt' + pref + 'Comp" type="number" step="any" inputmode="decimal" value="' + esc(v.comp) + '" oninput="HR_NOTAS._calc(\'' + pref + '\')"></div>' +
      '<div><label class="nt-lb">Peça que você corta (cm)</label><input class="nt-in" id="nt' + pref + 'Peca" type="number" step="any" inputmode="decimal" value="' + esc(v.peca) + '" oninput="HR_NOTAS._calc(\'' + pref + '\')"></div></div>' +
      '<div class="nt-g2"><div><label class="nt-lb">Perda por corte (mm)</label><input class="nt-in" id="nt' + pref + 'Perda" type="number" step="any" inputmode="decimal" value="' + esc(v.perda) + '" oninput="HR_NOTAS._calc(\'' + pref + '\')"></div>' +
      '<div><label class="nt-lb">Peças que preciso (opcional)</label><input class="nt-in" id="nt' + pref + 'Nec" type="number" step="1" inputmode="numeric" value="' + esc(v.nec) + '" oninput="HR_NOTAS._calc(\'' + pref + '\')"></div></div>' +
      '<div id="nt' + pref + 'Out" style="margin-top:10px">' + htmlCalc(calcCorte(v.preco, v.comp, v.peca, v.perda), v.nec) + '</div>';
  }
  function _calc(pref) {
    function g(s) { var e = document.getElementById('nt' + pref + s); return e ? e.value : ''; }
    var v = { preco: g('Preco'), comp: g('Comp'), peca: g('Peca'), perda: g('Perda'), nec: g('Nec') };
    if (pref === 'Q') _cq = v;
    var out = document.getElementById('nt' + pref + 'Out');
    if (out) out.innerHTML = htmlCalc(calcCorte(v.preco, v.comp, v.peca, v.perda), v.nec);
  }
  function abrirInsumo(id) {
    var ins = getIns()[id]; if (!ins) return;
    _insId = id;
    var u = ultimo(ins), v = variacao(ins), vr = vendaRef(ins.tipo);
    var h = '<div class="nt-card"><label class="nt-lb" style="margin-top:0">Nome</label><input class="nt-in" value="' + esc(ins.nome) + '" onchange="HR_NOTAS._renomear(this.value)">' +
      '<label class="nt-lb">Tipo</label><select class="nt-sel" onchange="HR_NOTAS._tipoIns(this.value)">' + optsLista(TIPOS, ins.tipo) + '</select></div>';
    if (u) {
      h += '<div class="nt-card"><div class="nt-sub">Preço atual</div><div style="font-size:26px;font-weight:700;color:var(--gold2);margin:4px 0">' + refTxt(u) + ' ' + badge(v) + '</div>' +
        '<div class="nt-sub">' + (u.comp > 0 ? 'Barra de ' + String(u.comp).replace('.', ',') + ' m a R$ ' + brl(u.vu) : u.qtd + ' ' + unLabel(u.unid) + ' a R$ ' + brl(u.vu)) + ' · ' + dmy(u.data) + (u.forn ? ' · ' + esc(u.forn) : '') + '</div>' +
        sparkline(ins.hist) + '</div>';
    }
    var comp0 = (u && u.comp > 0) ? String(u.comp) : '6';
    var pronto = u && u.comp > 0;
    h += '<div class="nt-sec">Calculadora de corte</div><div class="nt-card">' +
      calcBox('D', { preco: pronto ? String(u.vu) : '', comp: comp0, peca: ins.pecaCm ? String(ins.pecaCm) : '', perda: String(ins.perdaMm || 0), nec: '' }) +
      '<button class="nt-b" style="width:100%;margin-top:12px" onclick="HR_NOTAS._salvarPeca()">💾 Guardar essa medida como padrão</button>';
    if (vr) h += '<div class="nt-match" id="ntVenda" style="margin-top:12px"></div>';
    h += '</div><div class="nt-sec">Histórico de compras</div><div class="nt-card">';
    ins.hist.slice().reverse().forEach(function (e, k, arr) {
      var prev = arr[k + 1], vv = (prev && prev.refUnid === e.refUnid && prev.ref > 0) ? (e.ref - prev.ref) / prev.ref : null;
      h += '<div class="nt-item"><div class="l"><div class="n">' + dmy(e.data) + (e.forn ? ' · ' + esc(e.forn) : '') + '</div>' +
        '<div class="s">' + e.qtd + ' ' + unLabel(e.unid) + (e.comp > 0 ? ' de ' + String(e.comp).replace('.', ',') + ' m' : '') + ' × R$ ' + brl(e.vu) + '</div></div>' +
        '<div class="r"><div class="v">' + refTxt(e) + '</div>' + badge(vv) + '</div></div>';
    });
    h += '</div><button class="nt-b r" style="width:100%" onclick="HR_NOTAS._excluirInsumo()">Excluir este insumo do catálogo</button>';
    quadro(esc(tipoLabel(ins.tipo)) === 'Outro insumo' ? '📦 Insumo' : (ins.tipo === 'tubo' ? '🔩 Tubo' : '📐 Cantoneira'), h, '<button class="nt-b f" onclick="HR_NOTAS.voltar()">← Voltar</button>');
    _calc('D');
    atualizarVenda();
  }
  function atualizarVenda() {
    var el = document.getElementById('ntVenda'), ins = _insId && getIns()[_insId];
    if (!el || !ins) return;
    var vr = vendaRef(ins.tipo);
    function g(s) { var e = document.getElementById('ntD' + s); return e ? e.value : ''; }
    var c = calcCorte(g('Preco'), g('Comp'), g('Peca'), g('Perda'));
    el.innerHTML = '📋 No orçamento (Config) você cobra <b>' + esc(vr.l) + ' R$ ' + brl(vr.v) + '/un</b>.' +
      (c && c.pecas ? '<br>O material de cada peça custa <b>R$ ' + brl(c.custoPeca) + '</b> — ' + (c.custoPeca / vr.v * 100).toFixed(0) + '% desse valor. <span style="color:var(--t3)">(Confira se a unidade cobrada é a mesma peça.)</span>' : '<br>Informe a medida da peça pra comparar.');
  }
  function _renomear(v) {
    var o = getIns(), i = o[_insId]; v = String(v).trim();
    if (!i || !v) return;
    i.nome = v.slice(0, 70); _gravar(K_INS, o);
  }
  function _tipoIns(t) {
    var o = getIns(), i = o[_insId]; if (!i) return;
    i.tipo = t; _gravar(K_INS, o); abrirInsumo(_insId);
  }
  function _salvarPeca() {
    var o = getIns(), i = o[_insId]; if (!i) return;
    function g(s) { var e = document.getElementById('ntD' + s); return e ? num(e.value) : 0; }
    var peca = g('Peca');
    if (!(peca > 0)) { alert('Informe a medida da peça (cm).'); return; }
    i.pecaCm = peca; i.perdaMm = g('Perda'); _gravar(K_INS, o);
    if (typeof toast === 'function') toast('✅ Medida padrão guardada: ' + String(peca).replace('.', ',') + ' cm');
  }
  function _excluirInsumo() {
    var o = getIns(), i = o[_insId]; if (!i) return;
    if (!confirm('Excluir "' + i.nome + '" do catálogo? O histórico de preços dele some (as notas e os gastos continuam).')) return;
    delete o[_insId]; _gravar(K_INS, o); voltar();
  }
  function voltar() { _insId = null; fechar(); }

  // ───────────────────────── ver / excluir nota ─────────────────────────
  function abrirNota(id) {
    var n = getNotas().filter(function (x) { return x.id === id; })[0]; if (!n) return;
    var ins = getIns();
    var h = '<div class="nt-card"><div class="nt-t">' + esc(n.fornecedor || 'Sem fornecedor') + '</div><div class="nt-sub">' + dmy(n.data) + (n.numero ? ' · nota ' + esc(n.numero) : '') +
      ' · ' + (n.forma === 'dinheiro' ? 'dinheiro vivo' : n.forma === 'nao_pago' ? 'ainda não paga' : 'banco') + '</div></div><div class="nt-card">';
    n.itens.forEach(function (it) {
      var f = ins[it.insumoId], r = refDe(it);
      h += '<div class="nt-item"' + (f ? ' onclick="HR_NOTAS.abrirInsumo(\'' + esc(f.id) + '\')"' : '') + '><div class="l"><div class="n">' + esc(it.desc) + '</div><div class="s">' + it.qtd + ' ' + unLabel(it.unid) + ' × R$ ' + brl(it.vu) + '</div></div>' +
        '<div class="r"><div class="v">R$ ' + brl(it.total) + '</div><div class="s">' + refTxt(r) + '</div></div></div>';
    });
    h += (n.frete ? '<div class="nt-row"><span>Frete / outros</span><b>R$ ' + brl(n.frete) + '</b></div>' : '') +
      '<div class="nt-row"><span><b>Total</b></span><b class="nt-big">R$ ' + brl(n.total) + '</b></div></div>' +
      '<button class="nt-b r" style="width:100%" onclick="HR_NOTAS._excluirNota(\'' + esc(n.id) + '\')">Excluir esta nota</button>';
    quadro('🧾 Nota', h, '<button class="nt-b f" onclick="HR_NOTAS.voltar()">← Voltar</button>');
  }
  function _excluirNota(id) {
    var notas = getNotas(), n = notas.filter(function (x) { return x.id === id; })[0]; if (!n) return;
    if (!confirm('Excluir esta nota e os preços que ela trouxe pro catálogo?')) return;
    var ins = getIns();
    Object.keys(ins).forEach(function (k) {
      ins[k].hist = ins[k].hist.filter(function (e) { return e.notaId !== id; });
      if (!ins[k].hist.length) delete ins[k];
    });
    var msg = '';
    if (n.trId && typeof DB !== 'undefined' && DB.t) {
      var tr = DB.t.filter(function (t) { return t.id === n.trId && t._notaId === id; })[0];
      if (tr && confirm('Também excluir o gasto de R$ ' + brl(tr.value) + ' lançado em Finanças?')) {
        DB.t = DB.t.filter(function (t) { return t !== tr; }); msg = ' e o gasto';
      } else if (tr) { delete tr._notaId; }
      try { DB.sv(); } catch (e) {}
    }
    _gravar(K_INS, ins); _gravar(K_NOTAS, notas.filter(function (x) { return x.id !== id; }));
    voltar();
    if (typeof toast === 'function') toast('Nota excluída' + msg);
  }

  // ───────────────────────── aba "Notas" (Finanças) ─────────────────────────
  function linhasInsumos(filtro) {
    var ins = getIns(), f = norm(filtro || ''), ids = Object.keys(ins).filter(function (id) { return !f || norm(ins[id].nome).indexOf(f) >= 0; });
    if (!ids.length) return '<div class="nt-sub" style="padding:8px 0">' + (f ? 'Nenhum insumo com esse nome.' : 'Nenhum insumo ainda. Salve a primeira nota e eles aparecem aqui.') + '</div>';
    var ordem = { tubo: 0, cantoneira: 1, outro: 2 };
    ids.sort(function (a, b) { return (ordem[ins[a].tipo] - ordem[ins[b].tipo]) || ins[a].nome.localeCompare(ins[b].nome); });
    return ids.map(function (id) {
      var i = ins[id], u = ultimo(i), peca = '';
      if (i.pecaCm && u && u.comp > 0) {
        var c = calcCorte(u.vu, u.comp, i.pecaCm, i.perdaMm);
        if (c && c.pecas) peca = ' · peça ' + String(i.pecaCm).replace('.', ',') + ' cm: R$ ' + brl(c.custoPeca);
      }
      return '<div class="nt-item" onclick="HR_NOTAS.abrirInsumo(\'' + esc(id) + '\')"><div class="l"><div class="n">' + esc(i.nome) + '</div>' +
        '<div class="s">' + (u ? dmCurto(u.data) + (u.forn ? ' · ' + esc(u.forn) : '') : '') + peca + '</div></div>' +
        '<div class="r"><div class="v">' + refTxt(u) + '</div>' + badge(variacao(i)) + '</div></div>';
    }).join('');
  }
  function _busca(v) { var el = document.getElementById('ntLista'); if (el) el.innerHTML = linhasInsumos(v); }
  function renderTab() {
    injetarCss();
    var notas = getNotas(), nIns = Object.keys(getIns()).length;
    var h = '<div class="nt-card" style="margin-top:10px"><div class="nt-hero"><div class="nt-ic">🧾</div><div><div class="nt-t">Notas de compra</div>' +
      '<div class="nt-sub" style="margin-top:2px">Fotografe a nota: separo os itens, guardo o preço de cada um e lanço o gasto.</div></div></div>' +
      '<div class="nt-g2" style="margin-top:14px"><button class="nt-b p" onclick="HR_NOTAS.escolherFoto()">📷 Fotografar nota</button><button class="nt-b" onclick="HR_NOTAS.abrirManual()">✍️ Digitar</button></div></div>' +
      '<div class="nt-sec">Calculadora de corte</div><div class="nt-card">' + calcBox('Q', _cq) + '</div>' +
      '<div class="nt-sec">Insumos (' + nIns + ')</div><div class="nt-card">' +
      (nIns > 6 ? '<input class="nt-in" style="margin:0 0 6px" placeholder="🔍 Buscar insumo" oninput="HR_NOTAS._busca(this.value)">' : '') +
      '<div id="ntLista">' + linhasInsumos('') + '</div></div>';
    if (notas.length) {
      h += '<div class="nt-sec">Últimas notas</div><div class="nt-card">' + notas.slice(0, 10).map(function (n) {
        return '<div class="nt-item" onclick="HR_NOTAS.abrirNota(\'' + esc(n.id) + '\')"><div class="l"><div class="n">' + esc(n.fornecedor || 'Sem fornecedor') + '</div>' +
          '<div class="s">' + dmy(n.data) + ' · ' + n.itens.length + (n.itens.length === 1 ? ' item' : ' itens') + (n.forma === 'dinheiro' ? ' · dinheiro' : '') + '</div></div>' +
          '<div class="r"><div class="v">R$ ' + brl(n.total) + '</div></div></div>';
      }).join('') + '</div>';
    }
    return h;
  }

  function instalarAba() {
    var tabs = document.querySelector('.fin-tabs');
    if (tabs && !tabs.querySelector('[data-ftab="notas"]')) {
      var d = document.createElement('div');
      d.className = 'fin-tab'; d.setAttribute('data-ftab', 'notas'); d.textContent = '🧾 Notas';
      tabs.appendChild(d);
    }
    if (typeof window.renderFinBody === 'function' && !window.renderFinBody._ntPatched) {
      var orig = window.renderFinBody;
      var novo = function () {
        if (window._finTab === 'notas') {
          var body = document.getElementById('finBody');
          if (body) body.innerHTML = renderTab();
          var on0 = document.querySelector('.fin-tab.on');
          if (on0 && on0.scrollIntoView) on0.scrollIntoView({ inline: 'center', block: 'nearest' });
          return;
        }
        return orig.apply(this, arguments);
      };
      novo._ntPatched = true;
      window.renderFinBody = novo;
    }
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', instalarAba);
    else instalarAba();
  }

  // ───────────────────────── API pública ─────────────────────────
  // precoMetro('tubo')  → último preço por metro do insumo mais recente desse tipo (ou null)
  function precoMetro(tipo) {
    var ins = getIns(), melhor = null;
    Object.keys(ins).forEach(function (id) {
      var i = ins[id], u = ultimo(i);
      if (i.tipo !== tipo || !u || u.refUnid !== 'm') return;
      if (!melhor || u.data + u.ts > melhor.k) melhor = { k: u.data + u.ts, ref: u.ref };
    });
    return melhor ? melhor.ref : null;
  }
  window.HR_NOTAS = {
    renderTab: renderTab, escolherFoto: escolherFoto, abrirManual: abrirManual, registrarDeAcao: registrarDeAcao,
    abrirInsumo: abrirInsumo, abrirNota: abrirNota, fechar: fechar, voltar: voltar, salvar: salvar,
    calcCorte: calcCorte, precoMetro: precoMetro,
    _cab: _cab, _it: _it, _del: _del, _add: _add, _calc: function (p) { _calc(p); if (p === 'D') atualizarVenda(); },
    _busca: _busca, _renomear: _renomear, _tipoIns: _tipoIns, _salvarPeca: _salvarPeca, _excluirInsumo: _excluirInsumo, _excluirNota: _excluirNota,
    _estado: function () { return _D; }, _rascunho: rascunhoDe, _detectar: detectarTipo, _comp: extrairComp, _chave: chaveDe, _itemDe: itemDe
  };
})();
