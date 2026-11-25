// app-menu.js — v1: MENU POR ASSUNTO
// O app cresceu com cada função pendurada num canto (11 itens no menu de baixo + cartões amontoados na Secretária).
// Aqui o menu vira 7 áreas fixas; cada área abre uma folha com tudo daquele assunto, num lugar só:
//   🏠 Início · 💰 Vendas · 🏭 Produção · 💵 Dinheiro · 👷 Equipe · 🤖 Helena · ☰ Mais
// Os itens antigos continuam no código (escondidos), então nada que chama go(n) quebra.
// Desligar: localStorage.hr_menu_antigo = '1' (ou o botão "Voltar ao menu antigo" em ☰ Mais).
(function () {
  'use strict';
  if (window.__hrMenu) return; window.__hrMenu = true;
  try { if (/[?&]menu=antigo/.test(location.search)) localStorage.setItem('hr_menu_antigo', '1'); if (/[?&]menu=novo/.test(location.search)) localStorage.removeItem('hr_menu_antigo'); } catch (e) {}
  try { if (localStorage.getItem('hr_menu_antigo') === '1' || localStorage.getItem('hr_balcao') === '1' || /[?&]balcao=1/.test(location.search)) return; } catch (e) {} // o modo balcão tem o menu dele

  function chama(nome) { return function () { var f = window[nome]; if (typeof f === 'function') f(); else aviso('Essa função ainda está carregando. Tente de novo em instantes.'); }; }
  function pagina(n) { return function () { if (typeof window.go === 'function') window.go(n); }; }
  function existe(nome) { return function () { return typeof window[nome] === 'function'; }; }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  function temPg(n) { return function () { return !!document.querySelector('#nav .ni[data-pg="' + n + '"]') || !!document.getElementById('pg' + n); }; }

  // cada área: itens [ícone, título, descrição, ação, (condição)]
  var AREAS = [
    { k: 'inicio', ic: '🏠', nm: 'Início', pg: 12 },
    { k: 'vendas', ic: '💰', nm: 'Vendas', pgs: [0, 1, 2, 7, 10], itens: [
      ['📝', 'Novo orçamento', 'Montar orçamento com ambientes, pedra e serviços', pagina(0)],
      ['📋', 'Histórico de orçamentos', 'Aguardando, aceitos, entregues, PDFs e ficha técnica', pagina(7)],
      ['👥', 'Clientes', 'Cadastro, telefone e ficha de cada cliente', chama('abrirGestaoClientes'), existe('abrirGestaoClientes')],
      ['💬', 'Conversas com clientes', 'O que a Helena conversou no WhatsApp', chama('abrirConversasClientes'), existe('abrirConversasClientes')],
      ['📜', 'Contratos', 'Contratos gerados e assinados', pagina(10)],
      ['🛡️', 'Garantias', 'Certificados de garantia dos clientes', chama('abrirGarantias'), existe('abrirGarantias')]
    ] },
    { k: 'producao', ic: '🏭', nm: 'Produção', pgs: [3, 79], itens: [
      ['🏭', 'Produção', 'Etapas de cada pedido, partes, quem faz e pontos', chama('abrirProducao'), existe('abrirProducao')],
      ['✅', 'Aprovar produção', 'O que a equipe mandou — só conta ponto e sai entrega depois do seu ✅', chama('abrirAprovarProducao'), existe('abrirAprovarProducao')],
      ['📸', 'Fotos da equipe', 'O que a Helena entendeu de cada foto — conferir e corrigir', chama('abrirFotosEquipe'), existe('abrirFotosEquipe')],
      ['📐', 'Projeto 2D / ficha técnica', 'Desenho com medidas para o corte', chama('abrirDesenho'), existe('abrirDesenho')],
      ['📅', 'Agenda', 'Medições, entregas e instalações', pagina(3)],
      ['📹', 'Câmeras', 'Ver a fábrica ao vivo', pagina(79), temPg(79)]
    ] },
    { k: 'dinheiro', ic: '💵', nm: 'Dinheiro', pgs: [4], itens: [
      ['💵', 'Finanças', 'Entradas, gastos, boletos, caixa e resumo do mês', pagina(4)],
      ['📥', 'A receber', 'Quem ainda deve e quanto falta', chama('abrirAReceber'), existe('abrirAReceber')],
      ['📝', 'Notas', 'Anotações rápidas', pagina(13)]
    ] },
    { k: 'equipe', ic: '👷', nm: 'Equipe', pgs: [30], itens: [
      ['👷', 'RH', 'Funcionários, ponto, horas, folha e vales', pagina(30)],
      ['📊', 'Desempenho da equipe', 'Pontos, metas e quem está se pagando', chama('abrirDesempenho'), existe('abrirDesempenho')],
      ['🏆', 'Bonificação', 'Prêmios por pontos', chama('abrirBonificacao'), existe('abrirBonificacao')],
      ['📸', 'Fotos da equipe', 'Fotos de serviço que eles mandaram', chama('abrirFotosEquipe'), existe('abrirFotosEquipe')]
    ] },
    { k: 'helena', ic: '🤖', nm: 'Helena', pg: 11 },
    { k: 'mais', ic: '☰', nm: 'Mais', pgs: [5, 6, 13, 77], itens: [
      ['🖥️', 'Central (painel do computador)', 'Resumo da empresa na tela grande', chama('abrirPainelPC'), existe('abrirPainelPC')],
      ['🏢', 'Empresa', 'Dados da empresa, logo e contato', pagina(5)],
      ['⚙️', 'Configurações', 'Preços, pedras, cubas, serviços e sincronização', pagina(6)],
      ['↩️', 'Voltar ao menu antigo', 'Mostra de novo todos os itens embaixo', function () { if (confirm('Voltar ao menu antigo? (dá para voltar a este em ☰ Mais)')) { try { localStorage.setItem('hr_menu_antigo', '1'); } catch (e) {} location.reload(); } }]
    ] }
  ];

  var CSS = 'body.mn-on #nav .ni[data-pg]{display:none!important}body.mn-on #nav .ni-sep{display:none!important}'
    + 'body.mn-on #nav .ni.mn-ni{display:flex}'
    + 'body.mn-on #secBody [data-prd-btn],body.mn-on #secBody [data-feq-btn],body.mn-on #secBody [data-dsm-btn],body.mn-on #secBody [data-bon-btn],body.mn-on #secBody [data-gar-btn],body.mn-on #secBody [data-des-btn]{display:none!important}'
    + '#mnSheet{position:fixed;inset:0;z-index:9980;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(0,0,0,.55);animation:mnFade .18s ease}'
    + '@keyframes mnFade{from{opacity:0}to{opacity:1}}@keyframes mnUp{from{transform:translateY(30px);opacity:.4}to{transform:none;opacity:1}}'
    + '#mnSheet .mn-box{background:linear-gradient(180deg,#1a160f,#0e0c09);border-top:1px solid rgba(201,168,76,.3);border-radius:22px 22px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom,0));max-height:82vh;overflow-y:auto;animation:mnUp .22s cubic-bezier(.2,.9,.25,1);color:#efe9dc;font-family:Outfit,inherit}'
    + '#mnSheet .mn-h{display:flex;align-items:center;gap:10px;margin:2px 4px 12px}#mnSheet .mn-h b{font-family:"Cormorant Garamond",serif;font-size:1.5rem;color:#f0d78c}#mnSheet .mn-x{margin-left:auto;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;width:36px;height:36px;border-radius:12px;font-size:1rem;cursor:pointer}'
    + '#mnSheet .mn-it{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:14px;padding:12px;margin-bottom:8px;background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.07);color:#efe9dc;cursor:pointer;font-family:inherit}'
    + '#mnSheet .mn-it:active{transform:scale(.985)}#mnSheet .mn-it .i{font-size:1.45rem;width:34px;text-align:center}#mnSheet .mn-it .t{font-weight:800;font-size:.92rem}#mnSheet .mn-it .s{font-size:.72rem;color:#9a917e;margin-top:1px}#mnSheet .mn-it .seta{margin-left:auto;color:#c9a84c;font-size:1.2rem}';
  function css() { if (document.getElementById('mnCss')) return; var s = document.createElement('style'); s.id = 'mnCss'; s.textContent = CSS; document.head.appendChild(s); }

  function folha(a) {
    var v = document.getElementById('mnSheet'); if (v) v.remove();
    var itens = a.itens.filter(function (x) { return !x[4] || x[4](); });
    var d = document.createElement('div'); d.id = 'mnSheet';
    d.innerHTML = '<div class="mn-box"><div class="mn-h"><span style="font-size:1.5rem">' + a.ic + '</span><b>' + a.nm + '</b><button class="mn-x" data-x="1">✕</button></div>'
      + itens.map(function (x, i) { return '<button class="mn-it" data-i="' + i + '"><span class="i">' + x[0] + '</span><span style="flex:1"><div class="t">' + x[1] + '</div><div class="s">' + x[2] + '</div></span><span class="seta">›</span></button>'; }).join('') + '</div>';
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-x]')) { d.remove(); return; }
      var b = e.target.closest('[data-i]'); if (!b) return;
      d.remove(); try { itens[+b.getAttribute('data-i')][3](); } catch (er) { aviso('Não consegui abrir: ' + er.message); }
    });
    document.body.appendChild(d);
  }

  function montar() {
    var nav = document.getElementById('nav'); if (!nav || nav.querySelector('.mn-ni')) return !!nav;
    css(); document.body.classList.add('mn-on');
    AREAS.forEach(function (a) {
      var ni = document.createElement('div'); ni.className = 'ni mn-ni'; ni.setAttribute('data-mn', a.k);
      ni.innerHTML = '<span class="ni-i">' + a.ic + '</span><span class="ni-l">' + a.nm + '</span>' + (a.k === 'helena' ? '<span class="ndot" id="mnSecDot"></span>' : a.k === 'dinheiro' ? '<span class="ndot" id="mnFinDot"></span>' : a.k === 'producao' ? '<span class="ndot" id="mnAgDot"></span>' : '');
      ni.addEventListener('click', function (e) { e.stopPropagation(); if (a.pg != null) { if (typeof window.go === 'function') window.go(a.pg); } else folha(a); }, true);
      nav.appendChild(ni);
    });
    marcar(); new MutationObserver(marcar).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
    return true;
  }
  // a área acesa acompanha a página aberta (o app acende o item antigo, que está escondido)
  var marcando = false;
  function marcar() {
    if (marcando) return; marcando = true;
    try {
      var on = document.querySelector('#nav .ni[data-pg].on'), pg = on ? +on.getAttribute('data-pg') : null;
      AREAS.forEach(function (a) {
        var el = document.querySelector('#nav .mn-ni[data-mn="' + a.k + '"]'); if (!el) return;
        var ativo = pg != null && (a.pg === pg || (a.pgs || []).indexOf(pg) >= 0);
        if (el.classList.contains('on') !== ativo) el.classList.toggle('on', ativo);
      });
      if (typeof window.aplicarEstiloNi === 'function') window.aplicarEstiloNi();
      [['secDot', 'mnSecDot'], ['boletosDot', 'mnFinDot'], ['urgDot', 'mnAgDot']].forEach(function (p) { var o = document.getElementById(p[0]), n = document.getElementById(p[1]); if (o && n && n.classList.contains('on') !== o.classList.contains('on')) n.classList.toggle('on', o.classList.contains('on')); });
    } catch (e) {}
    marcando = false;
  }
  function iniciar() { if (!montar()) return setTimeout(iniciar, 800); setInterval(marcar, 3000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirArea = function (k) { var a = AREAS.filter(function (x) { return x.k === k; })[0]; if (a && a.itens) folha(a); };
})();
