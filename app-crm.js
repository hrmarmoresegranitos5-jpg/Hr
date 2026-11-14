// app-crm.js — v1: CRM das conversas do bot (Secretária → "Conversas dos clientes").
// Lista de clientes → toque → conversa inteira num visual de WhatsApp: fotos, áudios (com a transcrição),
// vídeos, documentos, modelos, botões, localização e os tiques de entregue/lido.
// Dados: Worker /bot/crm/* (x-bot-key). Os arquivos chegam com a chave do bot e viram blob local.
(function () {
  'use strict';
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function so8(n) { return String(n || '').replace(/\D/g, '').slice(-8); }
  function fmtNum(n) {
    var d = String(n || '').replace(/\D/g, ''); if (d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return d;
  }
  function hora(ms) { return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function diaTxt(ms) {
    var d = new Date(ms), h = new Date(), o = new Date(); o.setDate(h.getDate() - 1);
    if (d.toDateString() === h.toDateString()) return 'Hoje';
    if (d.toDateString() === o.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function quando(ms) {
    var d = new Date(ms), h = new Date();
    if (d.toDateString() === h.toDateString()) return hora(ms);
    var o = new Date(); o.setDate(h.getDate() - 1);
    if (d.toDateString() === o.toDateString()) return 'Ontem';
    if (h - d < 6 * 86400000) return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  function fmtTexto(t) { // *negrito* _itálico_ ~riscado~ e links, como no WhatsApp
    return esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  }

  // nomes do app (CLDB) pelo telefone
  function nomesApp() {
    var m = {};
    try { (CLDB.get() || []).forEach(function (c) { var k = so8(c.tel); if (k.length === 8 && c.nome) m[k] = c; }); } catch (e) {}
    return m;
  }
  function vistos() { try { return JSON.parse(localStorage.getItem('hr_crm_vistos') || '{}') || {}; } catch (e) { return {}; } }
  function marcarVisto(num, total) { try { var v = vistos(); v[num] = total; localStorage.setItem('hr_crm_vistos', JSON.stringify(v)); } catch (e) {} }

  var CSS = [
    '#hrCrm{position:fixed;inset:0;z-index:9990;background:#0b141a;color:#e9edef;display:flex;flex-direction:column;font-family:inherit;}',
    '#hrCrm *{box-sizing:border-box;}',
    '.crm-top{display:flex;align-items:center;gap:10px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:#202c33;min-height:58px;}',
    '.crm-top b{font-size:1.02rem;}',
    '.crm-ic{background:none;border:none;color:#aebac1;font-size:1.25rem;padding:6px 8px;cursor:pointer;border-radius:50%;line-height:1;}',
    '.crm-busca{margin:8px 10px;display:flex;align-items:center;background:#202c33;border-radius:10px;padding:0 10px;}',
    '.crm-busca input{flex:1;background:none;border:none;color:#e9edef;padding:10px 6px;font-size:.92rem;outline:none;font-family:inherit;}',
    '.crm-lista{flex:1;overflow-y:auto;}',
    '.crm-ct{display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;}',
    '.crm-ct:active{background:#202c33;}',
    '.crm-av{width:46px;height:46px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;color:#fff;}',
    '.crm-ct-c{flex:1;min-width:0;border-bottom:1px solid #222d34;padding-bottom:10px;}',
    '.crm-l1{display:flex;justify-content:space-between;gap:8px;align-items:baseline;}',
    '.crm-nm{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.crm-hr{font-size:.72rem;color:#8696a0;flex:none;}',
    '.crm-hr.nv{color:#25d366;}',
    '.crm-l2{display:flex;justify-content:space-between;gap:8px;margin-top:3px;}',
    '.crm-pv{font-size:.82rem;color:#8696a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.crm-bd{background:#25d366;color:#0b141a;border-radius:10px;font-size:.7rem;font-weight:700;padding:1px 7px;flex:none;}',
    '.crm-tag{font-size:.62rem;color:#d4a94e;border:1px solid #d4a94e55;border-radius:6px;padding:0 5px;margin-left:6px;vertical-align:middle;}',
    '.crm-chat{flex:1;overflow-y:auto;padding:8px 10px 16px;background:#0b141a;background-image:radial-gradient(#ffffff08 1px,transparent 1px);background-size:22px 22px;}',
    '.crm-dia{text-align:center;margin:10px 0;}',
    '.crm-dia span{background:#182229;color:#8696a0;font-size:.72rem;padding:5px 10px;border-radius:8px;}',
    '.crm-row{display:flex;margin:2px 0;}',
    '.crm-row.b{justify-content:flex-end;}',
    '.crm-bb{max-width:82%;padding:6px 8px 4px;border-radius:9px;font-size:.9rem;line-height:1.35;position:relative;word-wrap:break-word;overflow-wrap:anywhere;box-shadow:0 1px .5px #0000004d;}',
    '.crm-row.c .crm-bb{background:#202c33;border-top-left-radius:2px;}',
    '.crm-row.b .crm-bb{background:#005c4b;border-top-right-radius:2px;}',
    '.crm-bb a{color:#53bdeb;}',
    '.crm-meta{float:right;font-size:.66rem;color:#ffffff99;margin:6px 0 -2px 10px;white-space:nowrap;}',
    '.crm-tk{margin-left:3px;letter-spacing:-3px;}',
    '.crm-tk.lido{color:#53bdeb;}',
    '.crm-tk.erro{color:#f15c6d;letter-spacing:0;}',
    '.crm-img{display:block;max-width:260px;width:100%;min-height:120px;border-radius:6px;margin-bottom:3px;background:#ffffff10;cursor:zoom-in;object-fit:cover;}',
    '.crm-stk{width:120px;height:120px;object-fit:contain;background:none;}',
    '.crm-vid{display:block;max-width:260px;width:100%;border-radius:6px;margin-bottom:3px;background:#000;}',
    '.crm-aud{width:240px;max-width:100%;height:40px;display:block;}',
    '.crm-trans{font-size:.78rem;color:#ffffffb3;font-style:italic;margin-top:4px;border-left:2px solid #ffffff40;padding-left:6px;}',
    '.crm-doc{display:flex;align-items:center;gap:10px;background:#00000026;border-radius:7px;padding:9px 10px;margin-bottom:3px;cursor:pointer;min-width:200px;}',
    '.crm-doc .ic{font-size:1.6rem;}',
    '.crm-doc .nm{font-size:.84rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;}',
    '.crm-doc .sb{font-size:.7rem;color:#ffffff99;}',
    '.crm-bts{display:flex;flex-direction:column;gap:2px;margin-top:2px;}',
    '.crm-bt{background:#005c4b;color:#53bdeb;text-align:center;padding:8px;border-radius:8px;font-size:.84rem;}',
    '.crm-row.c .crm-bt{background:#202c33;}',
    '.crm-mdl{font-size:.64rem;color:#d4a94e;margin-bottom:3px;}',
    '.crm-resp{font-size:.64rem;color:#8696a0;margin-bottom:2px;}',
    '.crm-rea{display:inline-block;background:#202c33;border-radius:12px;padding:2px 8px;font-size:.95rem;}',
    '.crm-sem{color:#8696a0;font-size:.82rem;font-style:italic;}',
    '.crm-info{font-size:.72rem;color:#8696a0;}',
    '.crm-mais{display:block;margin:6px auto 10px;background:#202c33;color:#aebac1;border:none;border-radius:14px;padding:6px 14px;font-size:.78rem;cursor:pointer;font-family:inherit;}',
    '.crm-vazio{text-align:center;color:#8696a0;padding:40px 20px;font-size:.88rem;line-height:1.5;}',
    '.crm-rod{background:#202c33;padding:8px 12px;padding-bottom:max(8px,env(safe-area-inset-bottom));display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:.76rem;color:#8696a0;}',
    '.crm-rod a{background:#25d366;color:#0b141a;text-decoration:none;font-weight:700;border-radius:18px;padding:8px 14px;font-size:.8rem;white-space:nowrap;}',
    '#hrCrmZoom{position:fixed;inset:0;z-index:9995;background:#000e;display:flex;align-items:center;justify-content:center;}',
    '#hrCrmZoom img{max-width:100%;max-height:100%;object-fit:contain;}'
  ].join('\n');

  var st = { contatos: [], aberto: null, msgs: [], mais: false, timer: null, blobs: {}, obs: null, sig: '' };

  function css() { if (document.getElementById('hrCrmCss')) return; var s = document.createElement('style'); s.id = 'hrCrmCss'; s.textContent = CSS; document.head.appendChild(s); }
  function api(cam) {
    var b = base(); if (!b) return Promise.reject(new Error('O bot não está configurado neste aparelho (Config → Bot).'));
    return fetch(b + cam, { headers: hdr() }).then(function (r) { return r.json().catch(function () { return { error: 'Resposta inválida do bot (' + r.status + ').' }; }); })
      .then(function (j) { if (j && j.error) throw new Error(j.error); return j; });
  }
  function cor(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'hsl(' + (h % 360) + ',45%,38%)'; }
  function iniciais(n) { var p = String(n || '?').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function tokens(n) { return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z]+/).filter(function (t) { return t.length > 2; }); }
  // o nome do app só vale quando bate com o nome que a pessoa deu ao bot (ou do perfil); senão o cadastro do app está com outro dono
  function appConflita(c, a) {
    if (!a || !a.nome) return false;
    var bot = tokens(c.nome).concat(tokens(c.perfil)); if (!bot.length) return false;
    var ap = tokens(a.nome); return !ap.some(function (t) { return bot.indexOf(t) >= 0; });
  }
  function nomeDe(c, app) { var a = app[so8(c.num)]; if (appConflita(c, a)) return c.nome || c.perfil; return (a && a.nome) || c.nome || c.perfil || fmtNum(c.num); }

  function fechar() {
    pararAuto(); var e = document.getElementById('hrCrm'); if (e) e.remove();
    Object.keys(st.blobs).forEach(function (k) { try { URL.revokeObjectURL(st.blobs[k]); } catch (e) {} }); st.blobs = {};
    window.removeEventListener('popstate', voltarHist);
  }
  function voltarHist() { if (st.aberto) { st.aberto = null; pararAuto(); telaLista(); history.pushState({ crm: 1 }, ''); } else fechar(); }
  function pararAuto() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

  function abrir() {
    css(); fechar();
    var d = document.createElement('div'); d.id = 'hrCrm'; document.body.appendChild(d);
    try { history.pushState({ crm: 1 }, ''); window.addEventListener('popstate', voltarHist); } catch (e) {}
    telaLista(); carregarLista();
  }

  // ── lista de clientes ──
  function telaLista() {
    var d = document.getElementById('hrCrm'); if (!d) return;
    d.innerHTML = '<div class="crm-top"><button class="crm-ic" data-a="sair">←</button><div style="flex:1;"><b>Conversas</b><div class="crm-info" id="crmSub">Clientes atendidos pelo bot</div></div>' +
      '<button class="crm-ic" data-a="exportar" title="Exportar">⤓</button><button class="crm-ic" data-a="recarregar" title="Atualizar">⟳</button></div>' +
      '<div class="crm-busca"><span style="color:#8696a0;">🔍</span><input id="crmQ" placeholder="Pesquisar nome ou número" autocomplete="off"></div>' +
      '<div class="crm-lista" id="crmLista"><div class="crm-vazio">Carregando…</div></div>';
    d.onclick = function (ev) {
      var a = ev.target.closest('[data-a]'); if (a) {
        var x = a.getAttribute('data-a');
        if (x === 'sair') { try { history.back(); } catch (e) { fechar(); } }
        else if (x === 'recarregar') carregarLista();
        else if (x === 'exportar') { if (window.exportarConversasClientes) window.exportarConversasClientes(); }
        return;
      }
      var c = ev.target.closest('[data-num]'); if (c) abrirConversa(c.getAttribute('data-num'));
    };
    var q = document.getElementById('crmQ'); q.oninput = function () { desenharLista(); };
    desenharLista();
  }
  function carregarLista() {
    return api('/bot/crm/contatos').then(function (j) { st.contatos = j.contatos || []; desenharLista(); })
      .catch(function (e) { var l = document.getElementById('crmLista'); if (l) l.innerHTML = '<div class="crm-vazio">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function desenharLista() {
    var l = document.getElementById('crmLista'); if (!l || st.aberto) return;
    if (!st.contatos.length) { if (!/Carregando/.test(l.textContent)) l.innerHTML = '<div class="crm-vazio">Nenhuma conversa ainda.<br>As próximas mensagens dos clientes aparecem aqui.</div>'; return; }
    var app = nomesApp(), v = vistos(), q = String((document.getElementById('crmQ') || {}).value || '').toLowerCase().trim(), qd = q.replace(/\D/g, '');
    var lista = st.contatos.filter(function (c) {
      if (!q) return true;
      var n = nomeDe(c, app).toLowerCase();
      return n.indexOf(q) >= 0 || String(c.perfil || '').toLowerCase().indexOf(q) >= 0 || (qd.length >= 3 && String(c.num).indexOf(qd) >= 0);
    });
    var sub = document.getElementById('crmSub'); if (sub) sub.textContent = st.contatos.length + ' cliente(s)';
    l.innerHTML = lista.map(function (c) {
      var nm = nomeDe(c, app), novas = c.ultq === 'c' ? Math.max(0, (c.total || 0) - (v[c.num] || 0)) : 0;
      if (!(c.num in v) && c.ultq === 'c') novas = Math.min(novas, 9);
      var noApp = !!app[so8(c.num)];
      return '<div class="crm-ct" data-num="' + esc(c.num) + '"><div class="crm-av" style="background:' + cor(c.num) + ';">' + esc(iniciais(nm)) + '</div>' +
        '<div class="crm-ct-c"><div class="crm-l1"><span class="crm-nm">' + esc(nm) + (noApp ? '' : '<span class="crm-tag">novo</span>') + '</span><span class="crm-hr' + (novas ? ' nv' : '') + '">' + esc(quando(c.ult)) + '</span></div>' +
        '<div class="crm-l2"><span class="crm-pv">' + (c.ultq === 'b' ? '🤖 ' : '') + esc(c.ultx || '') + '</span>' + (novas ? '<span class="crm-bd">' + novas + '</span>' : '') + '</div></div></div>';
    }).join('') || '<div class="crm-vazio">Nada encontrado.</div>';
  }

  // ── conversa ──
  function abrirConversa(num) {
    st.aberto = num; st.msgs = []; st.sig = '';
    var c = st.contatos.find(function (x) { return x.num === num; }) || { num: num }, app = nomesApp(), nm = nomeDe(c, app), cli = app[so8(num)];
    var d = document.getElementById('hrCrm'); if (!d) return;
    d.innerHTML = '<div class="crm-top"><button class="crm-ic" data-a="voltar">←</button><div class="crm-av" style="width:38px;height:38px;font-size:.85rem;background:' + cor(num) + ';">' + esc(iniciais(nm)) + '</div>' +
      '<div style="flex:1;min-width:0;"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(nm) + '</b><div class="crm-info">' + esc(fmtNum(num)) + (c.perfil && c.perfil !== nm ? ' · ~' + esc(c.perfil) : '') + (cli ? (appConflita(c, cli) ? ' · ⚠️ no app este número está como "' + esc(cli.nome) + '"' : ' · no app') : '') + '</div></div>' +
      '<button class="crm-ic" data-a="recarregar" title="Atualizar">⟳</button></div>' +
      '<div class="crm-chat" id="crmChat"><div class="crm-vazio">Carregando conversa…</div></div>' +
      '<div class="crm-rod"><span id="crmJanela"></span><a href="https://wa.me/' + esc(String(num).replace(/\D/g, '')) + '" target="_blank" rel="noopener">Abrir no WhatsApp</a></div>';
    d.onclick = function (ev) {
      var a = ev.target.closest('[data-a]');
      if (a) {
        var x = a.getAttribute('data-a');
        if (x === 'voltar') { try { history.back(); } catch (e) { st.aberto = null; telaLista(); } }
        else if (x === 'recarregar') carregarConversa(false);
        else if (x === 'mais') carregarMais();
        return;
      }
      var im = ev.target.closest('img[data-zoom]'); if (im && im.src) { zoom(im.src); return; }
      var dc = ev.target.closest('[data-doc]'); if (dc) abrirDoc(dc.getAttribute('data-doc'), dc.getAttribute('data-nome'), dc.getAttribute('data-mime'));
    };
    carregarConversa(true);
    pararAuto(); st.timer = setInterval(function () { if (!document.hidden && st.aberto === num) carregarConversa(false, true); }, 10000);
  }
  function carregarConversa(primeira, silencioso) {
    var num = st.aberto; if (!num) return;
    api('/bot/crm/conversa?num=' + encodeURIComponent(num) + '&lim=200').then(function (j) {
      if (st.aberto !== num) return;
      var ms = j.mensagens || [], sig = ms.length + ':' + (ms.length ? ms[ms.length - 1].id + ms[ms.length - 1].st : '') + ':' + ms.map(function (m) { return m.st; }).join('');
      var jan = document.getElementById('crmJanela');
      if (jan) jan.textContent = j.janelaAte > Date.now() ? '🟢 Pode responder livre até ' + hora(j.janelaAte) + (new Date(j.janelaAte).toDateString() !== new Date().toDateString() ? ' de amanhã' : '') : '⚪ Fora das 24 h (só por modelo)';
      if (silencioso && sig === st.sig) return;
      var antigas = st.msgs.filter(function (m) { return !ms.some(function (x) { return x.id === m.id; }) && (!ms.length || m.ts < ms[0].ts); });
      st.msgs = antigas.concat(ms); if (primeira) st.mais = !!j.mais; st.sig = sig;
      var ch = document.getElementById('crmChat'), noFim = !ch || ch.scrollHeight - ch.scrollTop - ch.clientHeight < 80;
      desenharConversa(); if (primeira || noFim) rolarFim();
      var c = st.contatos.find(function (x) { return x.num === num; }); if (c) marcarVisto(num, c.total || 0);
    }).catch(function (e) { var ch = document.getElementById('crmChat'); if (ch && !st.msgs.length) ch.innerHTML = '<div class="crm-vazio">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function carregarMais() {
    var num = st.aberto; if (!num || !st.msgs.length) return;
    var ch = document.getElementById('crmChat'), alt = ch ? ch.scrollHeight : 0;
    api('/bot/crm/conversa?num=' + encodeURIComponent(num) + '&lim=200&antes=' + st.msgs[0].ts).then(function (j) {
      if (st.aberto !== num) return;
      st.msgs = (j.mensagens || []).concat(st.msgs); st.mais = !!j.mais; desenharConversa();
      if (ch) ch.scrollTop = ch.scrollHeight - alt;
    }).catch(function (e) { toast('⚠️ ' + e.message); });
  }
  function rolarFim() { var ch = document.getElementById('crmChat'); if (ch) { ch.scrollTop = ch.scrollHeight; setTimeout(function () { ch.scrollTop = ch.scrollHeight; }, 300); } }

  function tique(m) {
    if (m.q !== 'b') return '';
    if (m.st === 'failed') return '<span class="crm-tk erro" title="Não entregue">⚠</span>';
    if (m.st === 'read') return '<span class="crm-tk lido">✓✓</span>';
    if (m.st === 'delivered') return '<span class="crm-tk">✓✓</span>';
    return '<span class="crm-tk">✓</span>';
  }
  function midiaHtml(m) {
    var r = m.midia, ex = m.extra || {};
    if (!r) {
      if (m.tipo === 'location' && ex.lat != null) return '<a href="https://maps.google.com/?q=' + esc(ex.lat + ',' + ex.lng) + '" target="_blank" rel="noopener" style="display:block;margin-bottom:3px;">📍 Ver no mapa</a>';
      if (['image', 'video', 'audio', 'document', 'sticker'].indexOf(m.tipo) < 0) return '';
      var rot = { image: '📷 Foto', video: '🎥 Vídeo', audio: '🎤 Áudio', document: '📄 ' + (m.arq || 'Documento'), sticker: 'Figurinha' }[m.tipo];
      var pq = m.expirado ? 'o arquivo não está mais disponível' : m.grande ? 'arquivo grande' : ex.antigo ? 'de antes do CRM' : 'sem arquivo';
      return '<div class="crm-sem">' + rot + ' — ' + pq + '</div>';
    }
    var a = 'data-ref="' + esc(r) + '"';
    if (m.tipo === 'image') return '<img class="crm-img" ' + a + ' data-zoom="1" alt="">';
    if (m.tipo === 'sticker') return '<img class="crm-img crm-stk" ' + a + ' data-zoom="1" alt="">';
    if (m.tipo === 'video') return '<video class="crm-vid" ' + a + ' controls playsinline preload="metadata"></video>';
    if (m.tipo === 'audio') return '<audio class="crm-aud" ' + a + ' controls preload="none"></audio>';
    if (m.tipo === 'document') {
      var nm = m.arq || 'Documento', pdf = /pdf/i.test(m.mime || '') || /\.pdf$/i.test(nm);
      return '<div class="crm-doc" data-doc="' + esc(r) + '" data-nome="' + esc(nm) + '" data-mime="' + esc(m.mime || '') + '"><span class="ic">' + (pdf ? '📕' : '📄') + '</span><div style="min-width:0;"><div class="nm">' + esc(nm) + '</div><div class="sb">' + (pdf ? 'PDF' : 'Arquivo') + ' · toque para abrir</div></div></div>';
    }
    return '';
  }
  function desenharConversa() {
    var ch = document.getElementById('crmChat'); if (!ch) return;
    if (!st.msgs.length) { ch.innerHTML = '<div class="crm-vazio">Sem mensagens guardadas.</div>'; return; }
    var porWamid = {}; st.msgs.forEach(function (m) { if (m.wamid) porWamid[m.wamid] = m; });
    var h = st.mais ? '<button class="crm-mais" data-a="mais">Carregar mensagens anteriores</button>' : '', dia = '';
    st.msgs.forEach(function (m) {
      var d = diaTxt(m.ts); if (d !== dia) { dia = d; h += '<div class="crm-dia"><span>' + esc(d) + '</span></div>'; }
      var ex = m.extra || {}, q = m.q === 'b' ? 'b' : 'c';
      if (m.tipo === 'reaction') { h += '<div class="crm-row ' + q + '"><span class="crm-rea" title="Reação">' + esc(m.texto || '') + '</span></div>'; return; }
      var topo = '';
      if (ex.modelo) topo += '<div class="crm-mdl">📋 Modelo da Meta: ' + esc(ex.modelo) + '</div>';
      if (ex.citou && porWamid[ex.citou] && !ex.resposta) { var cit = porWamid[ex.citou]; topo += '<div class="crm-resp">↩ respondendo: ' + esc(String(cit.texto || cit.arq || '[' + cit.tipo + ']').slice(0, 60)) + '</div>'; }
      if (ex.resposta) topo += '<div class="crm-resp">↩ tocou no botão</div>';
      var txt = m.texto ? (m.tipo === 'audio' ? '<div class="crm-trans">' + (q === 'b' ? '🔊 ' : '📝 ') + fmtTexto(m.texto) + '</div>' : '<div>' + fmtTexto(m.texto) + '</div>') : '';
      var bts = '';
      if (ex.botoes && ex.botoes.length) bts = '<div class="crm-bts">' + ex.botoes.map(function (b) { return '<div class="crm-bt">' + esc(b) + '</div>'; }).join('') + '</div>';
      else if (ex.lista && ex.lista.itens) bts = '<div class="crm-bts"><div class="crm-bt">☰ ' + esc(ex.lista.botao || 'Opções') + '</div></div><div class="crm-info" style="margin-top:3px;">' + ex.lista.itens.map(esc).join(' · ') + '</div>';
      h += '<div class="crm-row ' + q + '"><div style="max-width:82%;display:flex;flex-direction:column;align-items:' + (q === 'b' ? 'flex-end' : 'flex-start') + ';"><div class="crm-bb" style="max-width:100%;">' + topo + midiaHtml(m) + txt +
        '<span class="crm-meta">' + esc(hora(m.ts)) + tique(m) + '</span><div style="clear:both;"></div></div>' + bts + '</div></div>';
    });
    ch.innerHTML = h;
    ligarMidias();
  }

  // arquivos: só carrega o que aparece na tela (com a chave do bot) e guarda como blob
  function blobDe(ref) {
    if (st.blobs[ref]) return Promise.resolve(st.blobs[ref]);
    if (ref.indexOf('u:') === 0) return Promise.resolve(ref.slice(2));
    return fetch(base() + '/bot/crm/midia?r=' + encodeURIComponent(ref), { headers: hdr() }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || 'Arquivo indisponível.'); });
      return r.blob();
    }).then(function (b) { var u = URL.createObjectURL(b); st.blobs[ref] = u; return u; });
  }
  function carregarEl(el) {
    if (el.getAttribute('data-ok')) return; el.setAttribute('data-ok', '1');
    blobDe(el.getAttribute('data-ref')).then(function (u) { el.src = u; }).catch(function (e) {
      var s = document.createElement('div'); s.className = 'crm-sem'; s.textContent = '⚠️ ' + e.message; el.replaceWith(s);
    });
  }
  function ligarMidias() {
    var els = document.querySelectorAll('#crmChat [data-ref]:not([data-ok])');
    if (!('IntersectionObserver' in window)) { els.forEach(carregarEl); return; }
    if (st.obs) st.obs.disconnect();
    st.obs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { st.obs.unobserve(e.target); carregarEl(e.target); } }); }, { root: document.getElementById('crmChat'), rootMargin: '300px' });
    els.forEach(function (e) { st.obs.observe(e); });
  }
  function abrirDoc(ref, nome, mime) {
    toast('Abrindo ' + (nome || 'arquivo') + '…');
    blobDe(ref).then(function (u) {
      var w = window.open(u, '_blank');
      if (!w) { var a = document.createElement('a'); a.href = u; a.download = nome || 'arquivo'; document.body.appendChild(a); a.click(); a.remove(); }
    }).catch(function (e) { toast('⚠️ ' + e.message); });
  }
  function zoom(src) {
    var z = document.createElement('div'); z.id = 'hrCrmZoom'; z.innerHTML = '<img src="' + src + '" alt="">';
    z.onclick = function () { z.remove(); }; document.body.appendChild(z);
  }

  window.abrirCRM = abrir;
  window.abrirConversasClientes = abrir;
})();
