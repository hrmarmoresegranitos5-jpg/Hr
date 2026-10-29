// ═══════════════════════════════════════════════════════════════════
// app-agenda-v2.js — Agenda reorganizada + avisos dentro do app
// Carregar DEPOIS de app-core.js (substitui renderAg, jCard e updUrgDot).
//
// O que muda:
//  • Tela em ordem de tempo: Atrasados → Hoje → Próximos 7 dias →
//    Em andamento → Agendados pra depois → Concluídos (recolhido)
//  • Cada serviço tem UM selo de situação (Atrasado 3d / Entrega hoje /
//    Começa hoje / Entrega em 2d...) em vez de várias faixas empilhadas
//  • Filtros rápidos no topo (Tudo / Atrasados / Hoje / 7 dias)
//  • Carga semanal fica recolhida (toque para abrir)
//  • Aviso na tela ao abrir o app: o que começa hoje, entrega hoje,
//    atrasados, e o que começa/entrega amanhã
//  • Bolinha vermelha da agenda também acende quando algo COMEÇA hoje
//  • td() corrigido: usava data UTC e "virava o dia" às 21h na Bahia
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── Datas (sempre no horário LOCAL do aparelho) ───────────────────
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function hojeLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  // Corrige td() do app inteiro (antes: toISOString → UTC → às 21h já era "amanhã")
  window.td = hojeLocal;

  function diasAte(iso) { // iso - hoje (0 = hoje, negativo = passou)
    if (!iso) return null;
    var a = String(iso).split('-');
    if (a.length < 3) return null;
    var alvo = new Date(+a[0], +a[1] - 1, +a[2]);
    var n = new Date();
    n = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((alvo - n) / 86400000);
  }
  function curta(iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    return p[2] + '/' + p[1];
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  // ── Situação de cada serviço ──────────────────────────────────────
  // Devolve { grupo, cor, selo, ord }
  function situacao(j) {
    if (typeof _migrateJobStage === 'function') _migrateJobStage(j);
    var stage = j.stage || 'producao';
    var ini = diasAte(j.start);
    var fim = diasAte(j.end);

    if (j.done) return { grupo: 'done', cor: 'grn', selo: 'Concluído', ord: 0 };

    // Já saiu da oficina (entregue) e só aguarda instalação: prazo de entrega não vale mais
    var aguardaInstalacao = (stage === 'entregue');

    if (!aguardaInstalacao && fim !== null && fim < 0)
      return { grupo: 'atrasado', cor: 'red', selo: 'Atrasado ' + (-fim) + 'd', ord: fim };

    if (!aguardaInstalacao && fim === 0)
      return { grupo: 'hoje', cor: 'red', selo: 'Entrega hoje', ord: 0 };

    if (stage === 'producao' && ini === 0)
      return { grupo: 'hoje', cor: 'gold', selo: 'Começa hoje', ord: 1 };

    if (!aguardaInstalacao && fim !== null && fim <= 7)
      return { grupo: 'semana', cor: fim <= 3 ? 'warn' : 'blu',
               selo: fim === 1 ? 'Entrega amanhã' : 'Entrega em ' + fim + 'd', ord: fim };

    if (stage === 'producao' && ini !== null && ini > 0 && ini <= 7)
      return { grupo: 'semana', cor: 'blu',
               selo: ini === 1 ? 'Começa amanhã' : 'Começa em ' + ini + 'd', ord: ini };

    if (stage === 'producao' && ini !== null && ini > 7)
      return { grupo: 'depois', cor: 'mut', selo: 'Começa ' + curta(j.start), ord: ini };

    var rot = { producao: 'Em produção', pronto: 'Pronto p/ entrega', entregue: 'Entregue', instalado: 'Instalado' }[stage] || stage;
    return { grupo: 'andamento', cor: 'mut', selo: rot, ord: fim === null ? 9999 : fim };
  }

  var GRUPOS = [
    { id: 'atrasado',  titulo: 'ATRASADOS',            cor: 'red'  },
    { id: 'hoje',      titulo: 'HOJE',                 cor: 'gold' },
    { id: 'semana',    titulo: 'PRÓXIMOS 7 DIAS',      cor: 'blu'  },
    { id: 'andamento', titulo: 'EM ANDAMENTO',         cor: 'mut'  },
    { id: 'depois',    titulo: 'AGENDADOS PARA DEPOIS', cor: 'mut'  }
  ];

  var _filtro = 'todos'; // todos | atrasado | hoje | semana

  // ── CSS ───────────────────────────────────────────────────────────
  function injetaCss() {
    if (document.getElementById('ag2-css')) return;
    var s = document.createElement('style');
    s.id = 'ag2-css';
    s.textContent =
      '.ag2-chips{display:flex;gap:7px;overflow-x:auto;padding:2px 0 10px;-webkit-overflow-scrolling:touch;}' +
      '.ag2-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;padding:8px 12px;border-radius:20px;border:1px solid var(--bd2);background:var(--s2);color:var(--t2);font-size:.7rem;font-weight:700;font-family:inherit;cursor:pointer;}' +
      '.ag2-chip b{font-size:.74rem;}' +
      '.ag2-chip.on{background:var(--gdim);border-color:var(--gold3);color:var(--gold2);}' +
      '.ag2-chip.red b{color:#ff7070;}' +
      '.ag2-sec{display:flex;align-items:center;gap:8px;margin:18px 0 8px;font-size:.6rem;font-weight:800;letter-spacing:2px;}' +
      '.ag2-sec i{font-style:normal;font-size:.62rem;font-weight:700;padding:2px 8px;border-radius:10px;background:var(--s3);color:var(--t3);}' +
      '.ag2-sec.red{color:#ff7070;}.ag2-sec.gold{color:var(--gold2);}.ag2-sec.blu{color:#6fa8e0;}.ag2-sec.mut{color:var(--t2);}.ag2-sec.grn{color:var(--grn);}' +
      '.ag2-card{position:relative;background:var(--s2);border:1px solid var(--bd2);border-radius:14px;padding:12px 13px 11px 16px;margin-bottom:8px;overflow:hidden;}' +
      '.ag2-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--t4);}' +
      '.ag2-card.red::before{background:#e05151;}.ag2-card.gold::before{background:var(--gold);}.ag2-card.warn::before{background:#e8a33c;}.ag2-card.blu::before{background:#4a80b5;}.ag2-card.grn::before{background:var(--grn);}' +
      '.ag2-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}' +
      '.ag2-cli{font-family:"Cormorant Garamond",serif;font-size:1.08rem;font-weight:700;color:var(--tx);line-height:1.2;min-width:0;}' +
      '.ag2-selo{flex:0 0 auto;font-size:.64rem;font-weight:800;padding:4px 9px;border-radius:20px;white-space:nowrap;border:1px solid transparent;}' +
      '.ag2-selo.red{background:rgba(224,81,81,.14);border-color:rgba(224,81,81,.45);color:#ff7a7a;}' +
      '.ag2-selo.gold{background:rgba(201,168,76,.14);border-color:rgba(201,168,76,.5);color:var(--gold2);}' +
      '.ag2-selo.warn{background:rgba(232,163,60,.14);border-color:rgba(232,163,60,.45);color:#f0b24e;}' +
      '.ag2-selo.blu{background:rgba(74,128,181,.14);border-color:rgba(74,128,181,.45);color:#7db3e8;}' +
      '.ag2-selo.mut{background:var(--s3);border-color:var(--bd2);color:var(--t3);}' +
      '.ag2-selo.grn{background:rgba(58,158,106,.14);border-color:rgba(58,158,106,.4);color:#5ccf92;}' +
      '.ag2-desc{margin-top:3px;font-size:.74rem;color:var(--t3);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.ag2-dates{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:.72rem;color:var(--t3);}' +
      '.ag2-dates b{color:var(--t2);font-weight:700;}' +
      '.ag2-dates .hl b{color:var(--gold2);}' +
      '.ag2-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}' +
      '.ag2-tag{font-size:.62rem;font-weight:700;padding:3px 8px;border-radius:12px;background:var(--s3);color:var(--t3);}' +
      '.ag2-tag.pay{background:rgba(248,113,113,.1);color:#f08a8a;}' +
      '.ag2-btns{display:flex;gap:6px;margin-top:10px;}' +
      '.ag2-btns .btn{margin:0;}' +
      '.ag2-btns .ag2-main{flex:1;}' +
      '.ag2-btns .ag2-ic{flex:0 0 auto;min-width:40px;padding-left:0;padding-right:0;}' +
      '.ag2-notif{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:12px;margin-bottom:10px;font-size:.72rem;line-height:1.35;cursor:pointer;}' +
      '.ag2-notif.off{background:rgba(224,81,81,.1);border:1px solid rgba(224,81,81,.4);color:#f09a9a;}' +
      '.ag2-notif.ok{background:transparent;border:1px dashed var(--bd2);color:var(--t3);font-size:.66rem;padding:7px 11px;}' +
      '.ag2-notif b{color:var(--tx);}' +
      '.ag2-det{margin:16px 0 4px;}' +
      '.ag2-det>summary{cursor:pointer;list-style:none;font-size:.72rem;font-weight:800;color:var(--t2);padding:6px 0;}' +
      '.ag2-det>summary::-webkit-details-marker{display:none;}' +
      '.ag2-det>summary::after{content:" ▾";color:var(--t3);}' +
      '.ag2-det[open]>summary::after{content:" ▴";}' +
      '.ag2-empty{text-align:center;padding:34px 18px;color:var(--t3);font-size:.82rem;}' +
      '.ag2-empty div{font-size:2rem;margin-bottom:8px;}' +

      /* ── v2.1: visual profissional ── */
      '.ag2-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:2px 0 6px;}' +
      '.ag2-kpi{background:var(--s2);border:1px solid var(--bd2);border-top:3px solid var(--t4);border-radius:12px;padding:9px 4px 8px;text-align:center;font-family:inherit;cursor:pointer;color:var(--t3);}' +
      '.ag2-kpi b{display:block;font-size:1.25rem;font-weight:800;line-height:1.1;color:var(--tx);}' +
      '.ag2-kpi span{display:block;margin-top:3px;font-size:.54rem;letter-spacing:.9px;text-transform:uppercase;font-weight:700;}' +
      '.ag2-kpi.red{border-top-color:#e05151;}.ag2-kpi.red b{color:#ff7a7a;}' +
      '.ag2-kpi.gold{border-top-color:var(--gold);}.ag2-kpi.gold b{color:var(--gold2);}' +
      '.ag2-kpi.blu{border-top-color:#4a80b5;}.ag2-kpi.blu b{color:#7db3e8;}' +
      '.ag2-kpi.mut{border-top-color:var(--t3);}' +
      '.ag2-kpi.on{background:var(--gdim);border-color:var(--gold3);}' +
      '.ag2-kpi.zero b{color:var(--t4);}' +
      '.ag2-fil{font-size:.64rem;color:var(--t3);margin:2px 0 0;}.ag2-fil u{color:var(--gold2);cursor:pointer;text-decoration:none;font-weight:700;}' +
      '.ag2-prog{margin-top:10px;}' +
      '.ag2-bar{height:6px;border-radius:4px;background:var(--s4);overflow:hidden;}' +
      '.ag2-bar i{display:block;height:100%;border-radius:4px;background:var(--t3);}' +
      '.ag2-card.red .ag2-bar i{background:#e05151;}.ag2-card.gold .ag2-bar i,.ag2-card.warn .ag2-bar i{background:var(--gold);}.ag2-card.blu .ag2-bar i{background:#4a80b5;}.ag2-card.grn .ag2-bar i{background:var(--grn);}' +
      '.ag2-pl{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font-size:.66rem;color:var(--t3);}' +
      '.ag2-pl b{color:var(--t2);font-weight:700;}' +
      '.ag2-pt{margin-top:6px;font-size:.72rem;color:var(--t2);font-weight:600;}' +
      '.ag2-steps{display:flex;gap:4px;margin-top:11px;}' +
      '.ag2-st{flex:1;text-align:center;font-size:.54rem;letter-spacing:.5px;text-transform:uppercase;font-weight:700;color:var(--t4);}' +
      '.ag2-st::before{content:"";display:block;height:3px;border-radius:2px;background:var(--s4);margin-bottom:4px;}' +
      '.ag2-st.ok{color:var(--t3);}.ag2-st.ok::before{background:var(--grn);}' +
      '.ag2-st.now{color:var(--gold2);}.ag2-st.now::before{background:var(--gold);}' +
      '.ag2-warn{margin-top:9px;padding:7px 10px;border-radius:9px;background:rgba(224,81,81,.1);border:1px solid rgba(224,81,81,.4);color:#f09a9a;font-size:.68rem;line-height:1.35;}' +
      '.ag2-warn b{color:#ff9a9a;}' +
      '.ag2-more{display:none;gap:6px;margin-top:6px;}.ag2-more.on{display:flex;}' +
      '.ag2-more .btn{flex:1;margin:0;}' +
      '.ag2-recv{border:0;font-family:inherit;cursor:pointer;text-align:left;}' +
      '.ag2-recebe{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:12px;margin:8px 0 2px;background:rgba(93,191,122,.08);border:1px solid rgba(93,191,122,.35);font-size:.74rem;line-height:1.35;color:var(--t2);}' +
      '.ag2-recebe b{color:#5dbf7a;font-size:.86rem;}' +
      /* pop-up de avisos */
      '.ag2-pop{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;justify-content:center;padding:0 10px calc(10px + env(safe-area-inset-bottom,0px));pointer-events:none;}' +
      '.ag2-pop-in{pointer-events:auto;width:100%;max-width:480px;background:var(--s2);border:1px solid var(--gold3);border-radius:18px;padding:15px 15px 12px;box-shadow:0 -6px 30px rgba(0,0,0,.6);animation:ag2up .25s ease-out;}' +
      '@keyframes ag2up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}' +
      '.ag2-pop h4{margin:0 0 8px;font-size:.8rem;color:var(--gold2);letter-spacing:.3px;}' +
      '.ag2-pop-l{display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--bd);font-size:.76rem;color:var(--t2);line-height:1.35;}' +
      '.ag2-pop-l:first-of-type{border-top:0;}' +
      '.ag2-pop-l b{color:var(--tx);}' +
      '.ag2-pop-b{display:flex;gap:8px;margin-top:10px;}' +
      '.ag2-pop-b .btn{flex:1;margin:0;}';
    document.head.appendChild(s);
  }

  // ── Card profissional ─────────────────────────────────────────────
  function dia(iso) {
    if (!iso) return '';
    var a = String(iso).split('-');
    var d = new Date(+a[0], +a[1] - 1, +a[2]);
    var sem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()];
    return sem + ', ' + a[2] + '/' + a[1];
  }
  function nDias(n) { return n + (n === 1 ? ' dia' : ' dias'); }
  function brl(n) { return (typeof fm === 'function') ? fm(n) : (+n || 0).toFixed(2).replace('.', ','); }

  function jCardV2(j) {
    var sit = situacao(j);
    var stage = j.stage || 'producao';
    var rest = (j.value || 0) - (j.pago || 0);
    var ini = diasAte(j.start), fim = diasAte(j.end);
    var conflito = (j.start && j.end && j.start > j.end);

    // ── linha do tempo: barra + texto claro ──
    var prog = '';
    if (j.start && j.end && !conflito) {
      var total = Math.max(1, fim - ini);
      var feito = Math.min(total, Math.max(0, -ini));
      var pct = j.done ? 100 : Math.round(feito / total * 100);
      var txt;
      if (j.done) txt = 'Serviço concluído';
      else if (stage === 'entregue') txt = 'Entregue — aguardando instalação';
      else if (ini > 0) txt = 'Começa em ' + nDias(ini) + ' · duração de ' + nDias(total);
      else if (fim < 0) txt = 'Prazo venceu há ' + nDias(-fim);
      else if (fim === 0) txt = 'Último dia — entrega hoje';
      else txt = 'Dia ' + (feito + 1) + ' de ' + total + ' · faltam ' + nDias(fim);
      prog = '<div class="ag2-prog"><div class="ag2-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="ag2-pl"><span>Início <b>' + dia(j.start) + '</b></span><span>Entrega <b>' + dia(j.end) + '</b></span></div>' +
        '<div class="ag2-pt">' + txt + '</div></div>';
    } else if (j.start || j.end) {
      prog = '<div class="ag2-prog"><div class="ag2-pl">' +
        (j.start ? '<span>Início <b>' + dia(j.start) + '</b></span>' : '<span>Início <b>—</b></span>') +
        (j.end ? '<span>Entrega <b>' + dia(j.end) + '</b></span>' : '<span>Entrega <b>não definida</b></span>') +
        '</div></div>';
    }
    var aviso = conflito
      ? '<div class="ag2-warn">⚠️ <b>Datas conflitantes:</b> o início (' + curta(j.start) + ') é depois da entrega (' + curta(j.end) + '). Toque em ✏️ e ajuste.</div>' : '';

    // ── etapas do serviço ──
    var etapas = j.instala ? ['producao', 'pronto', 'entregue', 'instalado'] : ['producao', 'pronto', 'entregue'];
    var nomes = { producao: 'Produção', pronto: 'Pronto', entregue: 'Entregue', instalado: 'Instalado' };
    var pos = etapas.indexOf(stage); if (pos < 0) pos = 0;
    var steps = '<div class="ag2-steps">';
    etapas.forEach(function (e, i) {
      var c = (j.done || i < pos) ? 'ok' : (i === pos ? 'now' : '');
      steps += '<div class="ag2-st ' + c + '">' + nomes[e] + '</div>';
    });
    steps += '</div>';

    var pay = '';
    if (!j.done && rest > 0) {
      var antesEntrega = (stage === 'producao' || stage === 'pronto');
      pay = '<div class="ag2-meta"><button type="button" class="ag2-tag pay ag2-recv" data-ag2recv="' + j.id + '">💰 ' +
        (antesEntrega ? 'Receber R$ ' + brl(rest) + ' na entrega' : 'Falta receber R$ ' + brl(rest)) + ' · toque p/ lançar</button></div>';
    }

    // ── ações: 1 principal + editar + “mais” ──
    var advLbl = null;
    if (!j.done) {
      advLbl = stage === 'producao' ? '✓ Pronto p/ entrega'
             : stage === 'pronto'   ? 'Marcar como entregue'
             : (stage === 'entregue' && j.instala) ? 'Marcar como instalado'
             : null;
    }
    var btns = '<div class="ag2-btns">';
    if (advLbl) btns += '<button class="btn btn-sm btn-grn ag2-main" data-jobstage="' + j.id + '">' + advLbl + '</button>';
    else if (j.done) btns += '<button class="btn btn-sm btn-o ag2-main" data-jobback="' + j.id + '">↩ Reabrir</button>';
    else btns += '<span class="ag2-main"></span>';
    btns += '<button class="btn btn-sm btn-o ag2-ic" data-editjob="' + j.id + '" title="Editar">✏️</button>';
    btns += '<button class="btn btn-sm btn-o ag2-ic" data-ag2more="' + j.id + '" title="Mais opções">⋯</button>';
    btns += '</div>';
    var mais = '<div class="ag2-more" id="ag2more' + j.id + '">' +
      (stage !== 'producao' && !j.done ? '<button class="btn btn-sm btn-o" data-jobback="' + j.id + '">↩ Voltar etapa</button>' : '') +
      '<button class="btn btn-sm btn-red" data-deljob="' + j.id + '">🗑 Remover serviço</button></div>';

    return '<div class="ag2-card ' + (conflito ? 'red' : sit.cor) + '">' +
      '<div class="ag2-top"><div class="ag2-cli">' + esc(j.cli) + '</div>' +
        '<span class="ag2-selo ' + (conflito ? 'red' : sit.cor) + '">' + esc(conflito ? 'Revisar datas' : sit.selo) + '</span></div>' +
      '<div class="ag2-desc">' + esc(j.desc) + '</div>' +
      prog + aviso + steps + pay + btns + mais + '</div>';
  }

  // ── Barra de situação dos avisos ──────────────────────────────────
  function barraAvisos() {
    if (typeof Notification === 'undefined') return '';
    var perm = Notification.permission;
    var temSync = (typeof SYNC !== 'undefined' && SYNC && SYNC.code);
    if (perm === 'denied')
      return '<div class="ag2-notif off" data-ag2-aviso="negado">🔕<div><b>Avisos bloqueados</b> neste aparelho. Libere em Configurações do Android → Apps → navegador/HR → Notificações.</div></div>';
    if (perm !== 'granted')
      return '<div class="ag2-notif off" data-ag2-aviso="ativar">🔔<div><b>Você não vai receber aviso de serviço.</b> Toque aqui para ativar as notificações.</div></div>';
    if (!temSync)
      return '<div class="ag2-notif off" data-ag2-aviso="sync">⚠️<div><b>Avisos sem sincronização.</b> Ative a Sincronização (código) em Configurações — é ela que liga o aparelho aos avisos automáticos.</div></div>';
    return '<div class="ag2-notif ok" data-ag2-aviso="testar">🔔 Avisos ativos neste aparelho · toque para testar</div>';
  }

  // ── 💰 Faixa "a receber": entregas atrasadas, de hoje e dos próximos 7 dias ──
  function faixaReceber(jobs) {
    var tot = 0, n = 0;
    (jobs || []).forEach(function (j) {
      if (!j || j.done) return;
      var rest = (j.value || 0) - (j.pago || 0);
      if (rest <= 0.005) return;
      var stage = j.stage || 'producao';
      var fim = diasAte(j.end);
      var entregaProxima = (fim !== null && fim <= 7) && stage !== 'entregue';
      if (entregaProxima || stage === 'entregue') { tot += rest; n++; }
    });
    if (!n) return '';
    return '<div class="ag2-recebe">💰<div>A receber nas entregas até 7 dias: <b>R$ ' + brl(tot) + '</b> · ' + plural(n, 'serviço', 'serviços') + '</div></div>';
  }

  // ── Receber pagamento de um serviço (entrega) ─────────────────────
  function fechaReceber() {
    var m = document.getElementById('ag2RecvModal');
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }
  function abrirReceberJob(id) {
    var j = (DB.j || []).find(function (x) { return x.id === id; });
    if (!j) return;
    var rest = Math.max(0, (j.value || 0) - (j.pago || 0));
    if (rest <= 0.005) { if (typeof toast === 'function') toast('Este serviço já está quitado'); return; }
    fechaReceber();
    var formas = ['Dinheiro', 'Pix', 'Cartão', 'Transferência'];
    var icones = { 'Dinheiro': '💵', 'Pix': '📱', 'Cartão': '💳', 'Transferência': '🏦' };
    var m = document.createElement('div');
    m.id = 'ag2RecvModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    var chips = formas.map(function (f, i) {
      return '<button type="button" data-ag2forma="' + f + '" style="flex:1;min-width:44%;padding:11px 8px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.78rem;font-weight:' + (i === 0 ? 800 : 600) +
        ';border:1px solid ' + (i === 0 ? 'var(--gold3)' : 'var(--bd2)') + ';background:' + (i === 0 ? 'var(--gold3)' : 'var(--s2)') + ';color:' + (i === 0 ? '#000' : 'var(--tx)') + ';">' + icones[f] + ' ' + f + '</button>';
    }).join('');
    m.innerHTML =
      '<div style="background:var(--bg,#0d0d12);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:14px 18px 26px;border-top:2px solid var(--gold3);">' +
        '<div style="width:38px;height:4px;background:var(--bd2);border-radius:3px;margin:0 auto 14px;"></div>' +
        '<div style="font-size:1.02rem;font-weight:800;color:var(--gold);">💰 Receber — ' + esc(j.cli) + '</div>' +
        '<div style="font-size:.72rem;color:var(--t3);margin:2px 0 14px;">' + esc(j.desc || '') + '</div>' +
        '<div style="display:flex;gap:16px;background:var(--s2);border:1px solid var(--bd2);border-radius:14px;padding:12px 14px;margin-bottom:14px;">' +
          '<div style="flex:1;"><div style="font-size:.6rem;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);">Total</div><div style="font-weight:800;">R$ ' + brl(j.value || 0) + '</div></div>' +
          ((j.pago || 0) > 0 ? '<div style="flex:1;"><div style="font-size:.6rem;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);">Já recebido</div><div style="font-weight:800;color:#5dbf7a;">R$ ' + brl(j.pago) + '</div></div>' : '') +
          '<div style="flex:1;"><div style="font-size:.6rem;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);">Falta</div><div style="font-weight:800;color:#e0a530;">R$ ' + brl(rest) + '</div></div>' +
        '</div>' +
        '<label style="display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:6px;">Valor recebido agora</label>' +
        '<div style="display:flex;align-items:center;gap:8px;padding:0 14px;margin-bottom:6px;border-radius:10px;border:1px solid var(--bd2);background:var(--s2);">' +
          '<span style="color:var(--t3);font-weight:700;">R$</span>' +
          '<input id="ag2RecvVal" type="text" inputmode="decimal" value="' + (Math.round(rest * 100) / 100).toFixed(2).replace('.', ',') + '" style="flex:1;min-width:0;width:auto!important;padding:13px 0!important;border:none!important;background:transparent!important;font-size:1.1rem;font-weight:800;color:var(--tx);outline:none;">' +
        '</div>' +
        '<div id="ag2RecvSaldo" style="font-size:.72rem;color:#5dbf7a;margin-bottom:14px;min-height:16px;">✓ Fica quitado com esse pagamento</div>' +
        '<input type="hidden" id="ag2RecvForma" value="Dinheiro">' +
        '<label style="display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:8px;">Forma de pagamento</label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">' + chips + '</div>' +
        '<label style="display:flex;align-items:center;gap:10px;font-size:.8rem;color:var(--t2);margin:0 0 16px;text-transform:none;letter-spacing:0;cursor:pointer;"><input type="checkbox" id="ag2RecvComp" checked style="width:20px!important;height:20px!important;min-width:20px;padding:0!important;margin:0;flex:0 0 auto;accent-color:#C9A84C;"> <span>🧾 Gerar comprovante</span></label>' +
        '<button type="button" id="ag2RecvOk" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.92rem;cursor:pointer;font-family:inherit;">Confirmar recebimento</button>' +
        '<button type="button" id="ag2RecvNo" style="width:100%;margin-top:8px;padding:11px;border:none;background:transparent;color:var(--t3);font-size:.8rem;cursor:pointer;font-family:inherit;">Agora não</button>' +
      '</div>';
    document.body.appendChild(m);

    function lerValor() {
      var v = String(document.getElementById('ag2RecvVal').value || '').replace(/\./g, '').replace(',', '.');
      v = parseFloat(v); return isNaN(v) ? 0 : v;
    }
    function atualizaSaldo() {
      var el = document.getElementById('ag2RecvSaldo'); if (!el) return;
      var falta = Math.max(0, rest - lerValor());
      el.style.color = falta <= 0.005 ? '#5dbf7a' : '#e0a530';
      el.textContent = falta <= 0.005 ? '✓ Fica quitado com esse pagamento' : 'Fica faltando R$ ' + brl(falta) + ' depois desse pagamento';
    }
    document.getElementById('ag2RecvVal').addEventListener('input', atualizaSaldo);
    Array.prototype.forEach.call(m.querySelectorAll('[data-ag2forma]'), function (b) {
      b.addEventListener('click', function () {
        document.getElementById('ag2RecvForma').value = b.getAttribute('data-ag2forma');
        Array.prototype.forEach.call(m.querySelectorAll('[data-ag2forma]'), function (o) {
          var on = o === b;
          o.style.background = on ? 'var(--gold3)' : 'var(--s2)';
          o.style.color = on ? '#000' : 'var(--tx)';
          o.style.borderColor = on ? 'var(--gold3)' : 'var(--bd2)';
          o.style.fontWeight = on ? '800' : '600';
        });
      });
    });
    document.getElementById('ag2RecvNo').addEventListener('click', fechaReceber);
    document.getElementById('ag2RecvOk').addEventListener('click', function () {
      var v = lerValor();
      if (v <= 0) { if (typeof toast === 'function') toast('Informe um valor válido'); return; }
      var forma = document.getElementById('ag2RecvForma').value;
      var comp = document.getElementById('ag2RecvComp').checked;
      fechaReceber();
      var tr = (typeof addTr === 'function') ? addTr('in', 'Entrega — ' + j.cli + ' · ' + forma, v, null, j.id) : null;
      j.pago = (j.pago || 0) + v;
      DB.sv();
      renderAgV2();
      if (typeof toast === 'function') toast('✓ R$ ' + brl(v) + ' (' + forma + ') lançado em Finanças');
      if (comp && tr && typeof gerarComprovante === 'function') setTimeout(function () { gerarComprovante(tr.id); }, 400);
    });
  }
  window.abrirReceberJob = abrirReceberJob;

  // Ao marcar "Entregue": abre a tela de receber (a faixa antiga ficava escondida em outra página)
  window._jobPagamentoFlow = function (j) {
    var rest = (j.value || 0) - (j.pago || 0);
    if (rest > 0.005) setTimeout(function () { abrirReceberJob(j.id); }, 350);
  };

  // ── ⚙️ Regra de prazo das peças rápidas (peças → dias) ────────────
  function abrirRegraPrazo() {
    if (typeof _prazoRapidoRegra !== 'function') return;
    var r = _prazoRapidoRegra();
    var f = r.faixas.slice().sort(function (a, b) { return a.ate - b.ate; });
    while (f.length < 3) f.push({ ate: (f.length ? f[f.length - 1].ate : 0) + 5, dias: (f.length ? f[f.length - 1].dias : 0) + 1 });
    var m = document.createElement('div');
    m.id = 'ag2RegraModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    var inp = 'width:64px!important;padding:9px 6px!important;text-align:center;border-radius:9px;border:1px solid var(--bd2);background:var(--s2);color:var(--tx);font-size:1rem;font-weight:800;font-family:inherit;';
    var linhas = f.slice(0, 3).map(function (x, i) {
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:.85rem;">Até <input id="rgAte' + i + '" type="number" min="1" value="' + x.ate + '" style="' + inp + '"> peças → <input id="rgDias' + i + '" type="number" min="1" value="' + x.dias + '" style="' + inp + '"> dia(s)</div>';
    }).join('');
    m.innerHTML =
      '<div style="background:var(--bg,#0d0d12);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:14px 18px 26px;border-top:2px solid var(--gold3);">' +
        '<div style="width:38px;height:4px;background:var(--bd2);border-radius:3px;margin:0 auto 14px;"></div>' +
        '<div style="font-size:1.02rem;font-weight:800;color:var(--gold);">⚙️ Prazo das soleiras/peitoris</div>' +
        '<div style="font-size:.72rem;color:var(--t3);margin:2px 0 14px;line-height:1.4;">Conta a partir de hoje, fora da fila. O app sugere os dias pela quantidade de peças do orçamento.</div>' +
        linhas +
        '<div style="display:flex;align-items:center;gap:8px;margin:4px 0 16px;font-size:.85rem;">Acima disso → <input id="rgAcima" type="number" min="1" value="' + (r.acima || 4) + '" style="' + inp + '"> dia(s)</div>' +
        '<button type="button" id="rgOk" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.92rem;cursor:pointer;font-family:inherit;">Salvar regra</button>' +
        '<button type="button" id="rgPadrao" style="width:100%;margin-top:8px;padding:11px;border-radius:12px;border:1px solid var(--bd2);background:transparent;color:var(--t2);font-size:.8rem;cursor:pointer;font-family:inherit;">Voltar ao padrão (4→1, 10→2, 20→3, mais→4)</button>' +
        '<button type="button" id="rgNo" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3);font-size:.8rem;cursor:pointer;font-family:inherit;">Cancelar</button>' +
      '</div>';
    document.body.appendChild(m);
    function fecha() { if (m.parentNode) m.parentNode.removeChild(m); }
    function grava(obj) {
      CFG.prazoRapido = obj;
      if (typeof svCFG === 'function') { try { svCFG(); } catch (e) {} }
      fecha();
      if (typeof toast === 'function') toast('✓ Regra de prazo salva');
    }
    document.getElementById('rgNo').onclick = fecha;
    document.getElementById('rgPadrao').onclick = function () {
      grava({ faixas: [{ ate: 4, dias: 1 }, { ate: 10, dias: 2 }, { ate: 20, dias: 3 }], acima: 4 });
    };
    document.getElementById('rgOk').onclick = function () {
      var fx = [], ant = 0;
      for (var i = 0; i < 3; i++) {
        var a = parseInt(document.getElementById('rgAte' + i).value, 10), d = parseInt(document.getElementById('rgDias' + i).value, 10);
        if (!a || a < 1 || !d || d < 1) { if (typeof toast === 'function') toast('Preencha todos os campos com números'); return; }
        if (a <= ant) { if (typeof toast === 'function') toast('As quantidades devem ir aumentando'); return; }
        ant = a; fx.push({ ate: a, dias: d });
      }
      var ac = parseInt(document.getElementById('rgAcima').value, 10);
      if (!ac || ac < 1) { if (typeof toast === 'function') toast('Informe os dias de "acima disso"'); return; }
      grava({ faixas: fx, acima: ac });
    };
  }

  window.abrirRegraPrazo = abrirRegraPrazo;

  // ── Tela da agenda ────────────────────────────────────────────────
  function renderAgV2() {
    var el = document.getElementById('agList');
    if (!el) return;
    injetaCss();

    // blocos antigos (briefing e carga) ficavam soltos acima da lista — limpa
    var b0 = document.getElementById('agBriefing'); if (b0) b0.innerHTML = '';
    var c0 = document.getElementById('agCarga');    if (c0) c0.innerHTML = '';

    var jobs = DB.j || [];
    if (!jobs.length) {
      el.innerHTML = barraAvisos() +
        '<div class="ag2-empty"><div>📅</div>Nenhum serviço ainda.<br>Toque em “+ Novo Serviço”.</div>';
      return;
    }

    // agrupa
    var por = { atrasado: [], hoje: [], semana: [], andamento: [], depois: [], done: [] };
    jobs.forEach(function (j) {
      var s = situacao(j);
      por[s.grupo].push({ j: j, ord: s.ord, urg: j.urgente ? 0 : 1 });
    });
    Object.keys(por).forEach(function (k) {
      por[k].sort(function (a, b) { return (a.urg - b.urg) || (a.ord - b.ord); });
    });

    var h = barraAvisos();

    // painel de números (também funciona como filtro)
    function kpi(id, rotulo, n, cor) {
      return '<button class="ag2-kpi ' + cor + (n ? '' : ' zero') + (_filtro === id ? ' on' : '') + '" data-ag2f="' + id + '"><b>' + n + '</b><span>' + rotulo + '</span></button>';
    }
    h += '<div class="ag2-kpis">' +
      kpi('atrasado', 'Atrasados', por.atrasado.length, 'red') +
      kpi('hoje', 'Hoje', por.hoje.length, 'gold') +
      kpi('semana', '7 dias', por.semana.length, 'blu') +
      kpi('todos', 'Em aberto', por.atrasado.length + por.hoje.length + por.semana.length + por.andamento.length + por.depois.length, 'mut') +
      '</div>';
    if (_filtro !== 'todos') h += '<div class="ag2-fil">Mostrando só um grupo · <u data-ag2f="todos">ver tudo</u></div>';
    h += faixaReceber(jobs);

    var mostrou = 0;

    // ⚡ Peças rápidas (soleira/peitoril): saem dos grupos normais e ficam juntas, com ficha de corte única
    if (_filtro === 'todos' && typeof _jobForaFila === 'function') {
      var rapidos = [];
      ['hoje', 'semana', 'andamento', 'depois'].forEach(function (g) {
        por[g] = por[g].filter(function (x) {
          var rap = _jobForaFila(x.j) && (x.j.stage || 'producao') === 'producao';
          if (rap) rapidos.push(x);
          return !rap;
        });
      });
      if (rapidos.length) {
        rapidos.sort(function (a, b) { return String(a.j.end || '').localeCompare(String(b.j.end || '')); });
        var qIds = [];
        rapidos.forEach(function (x) {
          var q = x.j.qId && (DB.q || []).find(function (o) { return String(o.id) === String(x.j.qId); });
          if (q && q.ambSnap && typeof _fcGruposDe === 'function' && _fcGruposDe(q.ambSnap).length) qIds.push(q.id);
        });
        mostrou += rapidos.length;
        h += '<div class="ag2-sec gold">⚡ PEÇAS RÁPIDAS · FORA DA FILA <i>' + rapidos.length + '</i>' +
             '<u data-ag2regra="1" style="margin-left:auto;font-weight:700;letter-spacing:0;cursor:pointer;color:var(--t3);text-decoration:none;">⚙️ Regra de prazo</u></div>';
        if (qIds.length) {
          h += '<button type="button" class="btn btn-o btn-sm" data-ag2ficha="' + qIds.join(',') + '" style="width:100%;margin:0 0 8px;">✂️ Ficha de corte única (' + plural(qIds.length, 'cliente', 'clientes') + ')</button>';
        }
        rapidos.forEach(function (x) { h += jCardV2(x.j); });
      }
    }
    GRUPOS.forEach(function (g) {
      if (_filtro !== 'todos' && _filtro !== g.id) return;
      var lista = por[g.id];
      if (!lista.length) return;
      mostrou += lista.length;
      h += '<div class="ag2-sec ' + g.cor + '">' + g.titulo + ' <i>' + lista.length + '</i></div>';
      lista.forEach(function (x) { h += jCardV2(x.j); });
    });

    if (!mostrou) {
      h += '<div class="ag2-empty"><div>🎉</div>' +
        (_filtro === 'atrasado' ? 'Nenhum serviço atrasado.' :
         _filtro === 'hoje' ? 'Nada começando nem entregando hoje.' :
         _filtro === 'semana' ? 'Nada para os próximos 7 dias.' : 'Nada em aberto.') + '</div>';
    }

    // concluídos (recolhido) e carga semanal (recolhida)
    if (_filtro === 'todos') {
      if (por.done.length) {
        h += '<details class="ag2-det"><summary>CONCLUÍDOS (' + por.done.length + ')</summary>';
        por.done.slice(0, 8).forEach(function (x) { h += jCardV2(x.j); });
        h += '</details>';
      }
      if (typeof _renderCargaSemana === 'function') {
        var carga = '';
        try { carga = _renderCargaSemana(); } catch (e) { carga = ''; }
        if (carga) h += '<details class="ag2-det"><summary>CARGA DA SEMANA</summary>' + carga + '</details>';
      }
    }

    el.innerHTML = h;
  }


  // ── Edição: não apagar a data de entrega ──────────────────────────
  // O modal de edição zerava o campo "dias" e, ao salvar sem digitar, a entrega sumia.
  // Agora o campo já vem preenchido com a duração atual (entrega - início).
  var _openJobModalOrig = window.openJobModal;
  if (typeof _openJobModalOrig === 'function') {
    window.openJobModal = function (id) {
      _openJobModalOrig.apply(this, arguments);
      if (!id) return;
      var j = (DB.j || []).find(function (x) { return x.id === id; });
      var inp = document.getElementById('jDias');
      if (j && j.start && j.end && j.end >= j.start && inp) {
        var a = j.start.split('-'), b = j.end.split('-');
        var n = Math.round((new Date(+b[0], +b[1] - 1, +b[2]) - new Date(+a[0], +a[1] - 1, +a[2])) / 86400000);
        inp.value = n;
        if (typeof prevJobDias === 'function') prevJobDias();
      }
    };
  }

  // ── Prévia do prazo mais clara (antes: "82d corridos" contado desde hoje) ──
  var _prevDiasOrig = window.prevDias;
  if (typeof _prevDiasOrig === 'function') {
    window.prevDias = function () {
      _prevDiasOrig.apply(this, arguments);
      var p = document.getElementById('diasPrev');
      var d = +(document.getElementById('diasIn') || {}).value;
      if (!p || !d || !p.textContent) return;
      var m = p.textContent.match(/Início: (\S+)\s+·\s+Entrega: (\S+)/);
      if (!m) return;
      var urg = p.textContent.indexOf('urgente') >= 0 ? '🚨 urgente · ' : '';
      p.textContent = urg + 'Início ' + m[1] + ' · Entrega ' + m[2] + ' · ' + nDias(d) + ' de serviço';
    };
  }

  window.jCard = jCardV2;
  window.renderAg = renderAgV2;

  // ── Bolinha vermelha da agenda ────────────────────────────────────
  function precisaAtencao() {
    return (DB.j || []).filter(function (j) {
      if (j.done) return false;
      var s = situacao(j);
      return s.grupo === 'atrasado' || s.grupo === 'hoje' ||
             (s.grupo === 'semana' && s.cor === 'warn');
    }).length;
  }
  window.updUrgDot = function () {
    var d = document.getElementById('urgDot');
    if (d) d.classList.toggle('on', precisaAtencao() > 0);
  };

  // ── Avisos dentro do app ──────────────────────────────────────────
  // Lista tudo que merece aviso AGORA. A chave inclui o dia, então cada
  // aviso aparece uma vez por dia (atrasados reaparecem todo dia).
  function listaAvisos() {
    var hoje = hojeLocal(), out = [];
    (DB.j || []).forEach(function (j) {
      if (!j || j.done) return;
      if (typeof _migrateJobStage === 'function') _migrateJobStage(j);
      var stage = j.stage || 'producao';
      var ini = diasAte(j.start), fim = diasAte(j.end);
      var nome = j.cli || 'Serviço';
      var base = j.id + '|' + hoje + '|';
      if (stage === 'producao' && ini === 0)
        out.push({ k: base + 'ini0', icon: '🚀', txt: '<b>Hoje é dia de iniciar:</b> ' + esc(nome) + (j.desc ? ' — ' + esc(j.desc) : ''), pri: 1, plain: 'Hoje é dia de iniciar: ' + nome });
      if (stage !== 'entregue' && fim === 0)
        out.push({ k: base + 'fim0', icon: '📦', txt: '<b>Entrega hoje:</b> ' + esc(nome), pri: 0, plain: 'Entrega hoje: ' + nome });
      if (stage !== 'entregue' && fim !== null && fim < 0)
        out.push({ k: base + 'atr', icon: '🔴', txt: '<b>Atrasado ' + (-fim) + 'd:</b> ' + esc(nome), pri: 0, plain: 'Atrasado ' + (-fim) + ' dia(s): ' + nome });
      if (stage === 'producao' && ini === 1)
        out.push({ k: base + 'ini1', icon: '⏭️', txt: '<b>Começa amanhã:</b> ' + esc(nome), pri: 3, plain: 'Começa amanhã: ' + nome });
      if (stage !== 'entregue' && fim === 1)
        out.push({ k: base + 'fim1', icon: '⏳', txt: '<b>Entrega amanhã:</b> ' + esc(nome), pri: 2, plain: 'Entrega amanhã: ' + nome });
    });
    out.sort(function (a, b) { return a.pri - b.pri; });
    return out;
  }

  var CHAVE_VISTOS = 'hr_ag2_avisos';
  function lerVistos() {
    try { return JSON.parse(localStorage.getItem(CHAVE_VISTOS) || '{}') || {}; } catch (e) { return {}; }
  }
  function gravaVistos(v) {
    var hoje = hojeLocal(), limpo = {};
    Object.keys(v).forEach(function (k) { if (k.split('|')[1] === hoje) limpo[k] = 1; }); // descarta dias antigos
    try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify(limpo)); } catch (e) {}
  }

  function fechaPop() {
    var p = document.getElementById('ag2Pop');
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }
  function mostraPop(itens) {
    fechaPop();
    var p = document.createElement('div');
    p.id = 'ag2Pop';
    p.className = 'ag2-pop';
    var h = '<div class="ag2-pop-in"><h4>📋 Avisos da agenda</h4>';
    itens.slice(0, 6).forEach(function (a) {
      h += '<div class="ag2-pop-l"><span>' + a.icon + '</span><div>' + a.txt + '</div></div>';
    });
    if (itens.length > 6) h += '<div class="ag2-pop-l"><span>…</span><div>e mais ' + (itens.length - 6) + ' na agenda</div></div>';
    h += '<div class="ag2-pop-b"><button class="btn btn-o btn-sm" data-ag2pop="ok">Fechar</button>' +
         '<button class="btn btn-grn btn-sm" data-ag2pop="ver">Ver agenda</button></div></div>';
    p.innerHTML = h;
    document.body.appendChild(p);
  }

  function notificaSistema(itens) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg || !reg.showNotification) return;
      itens.slice(0, 4).forEach(function (a) {
        reg.showNotification('HR Mármores — Agenda', {
          body: a.plain, tag: 'ag2-' + a.k, icon: '/icon-192.png', badge: '/icon-192.png'
        });
      });
    }).catch(function () {});
  }

  // Confere e avisa. visivel → pop-up na tela; escondido → notificação do sistema
  function conferirAvisos() {
    if (typeof DB === 'undefined' || !DB.j) return;
    var vistos = lerVistos();
    var novos = listaAvisos().filter(function (a) { return !vistos[a.k]; });
    if (!novos.length) { window.updUrgDot(); return; }
    var visivel = document.visibilityState === 'visible';
    if (visivel) {
      mostraPop(novos);
    } else {
      notificaSistema(novos);
    }
    novos.forEach(function (a) { vistos[a.k] = 1; });
    gravaVistos(vistos);
    window.updUrgDot();
  }
  window.agConferirAvisos = conferirAvisos;

  // ── Cliques (filtros, barra de avisos, pop-up) ────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest && t.closest('[data-ag2regra]')) { abrirRegraPrazo(); return; }
    var fc = t.closest && t.closest('[data-ag2ficha]');
    if (fc) { if (typeof gerarFichaCorteUnica === 'function') gerarFichaCorteUnica(fc.getAttribute('data-ag2ficha').split(',')); return; }
    var rc = t.closest && t.closest('[data-ag2recv]');
    if (rc) { abrirReceberJob(+rc.getAttribute('data-ag2recv')); return; }
    var mo = t.closest && t.closest('[data-ag2more]');
    if (mo) { var bx = document.getElementById('ag2more' + mo.getAttribute('data-ag2more')); if (bx) bx.classList.toggle('on'); return; }
    var el = t.closest && t.closest('[data-ag2f]');
    if (el) { _filtro = el.getAttribute('data-ag2f'); renderAgV2(); return; }

    el = t.closest && t.closest('[data-ag2pop]');
    if (el) {
      var acao = el.getAttribute('data-ag2pop');
      fechaPop();
      if (acao === 'ver') {
        try { if (typeof openApp === 'function') openApp(3); else if (typeof go === 'function') go(3); } catch (err) {}
      }
      return;
    }

    el = t.closest && t.closest('[data-ag2-aviso]');
    if (el) {
      var tipo = el.getAttribute('data-ag2-aviso');
      if (tipo === 'ativar' || tipo === 'sync') {
        if (typeof ativarNotificacoes === 'function') ativarNotificacoes();
        setTimeout(renderAgV2, 1500);
      } else if (tipo === 'testar') {
        notificaSistema([{ k: 'teste' + Date.now(), plain: '✓ Teste: os avisos estão funcionando neste aparelho.' }]);
        if (typeof toast === 'function') toast('Teste enviado — veja a notificação');
      } else if (tipo === 'negado') {
        if (typeof toast === 'function') toast('Libere nas configurações do Android');
      }
    }
  });

  // ── Gatilhos ──────────────────────────────────────────────────────
  window.addEventListener('load', function () {
    setTimeout(function () { renderAgV2(); window.updUrgDot(); conferirAvisos(); }, 1500);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') setTimeout(conferirAvisos, 600);
  });
  // a cada 10 min (app aberto ou em segundo plano ativo) e quando a sincronização trouxer dados
  setInterval(conferirAvisos, 10 * 60 * 1000);
  setInterval(function () { if (document.visibilityState === 'visible') window.updUrgDot(); }, 60 * 1000);
})();
