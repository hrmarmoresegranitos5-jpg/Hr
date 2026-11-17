// app-obras.js — v1: fotos de obras prontas, direto do app.
// Tira/escolhe a foto, marca o ambiente e a pedra → vai para o portfólio do bot (POST /bot/obras):
// aparece no site do cliente (aba "Obras reais" da pedra) e o bot pode mandar para os clientes.
// Abre por: Início (cartão "📸 Fotos de obras"), Empresa, e ao concluir um serviço na agenda.
// Carregar DEPOIS de app-core.js, app-secretaria.js e app-dashboard.js.
(function () {
  if (window.__hrObras) return; window.__hrObras = true;
  var AMB = [['cozinha', '🍳 Cozinha'], ['banheiro', '🚿 Banheiro'], ['lavabo', '🪞 Lavabo'], ['varanda', '🔥 Churrasqueira'], ['escada', '🪜 Escada'], ['soleira', '🚪 Soleira'], ['peitoril', '🪟 Peitoril'], ['piso', '⬜ Piso'], ['tumulo', '⚱️ Túmulo']];
  var OBRAS = null, NOVA = null;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function api(path, opts) {
    var b = base(); if (!b) return Promise.reject(new Error('Configure o bot na Secretária primeiro.'));
    opts = opts || {}; opts.headers = _botHeaders();
    return fetch(b + path, opts).then(function (r) { return r.json(); });
  }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function nomeAmb(k) { var a = AMB.filter(function (x) { return x[0] === k; })[0]; return a ? a[1] : 'Obra'; }

  function folha(html) {
    var old = document.getElementById('obrasSheet'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'obrasSheet';
    m.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="background:var(--bg);border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:14px 16px 28px;border-top:2px solid var(--gold3);">'
      + '<div style="width:38px;height:4px;background:var(--bd2);border-radius:3px;margin:0 auto 12px;"></div>' + html + '</div>';
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    return m;
  }
  function fechar() { var m = document.getElementById('obrasSheet'); if (m) m.remove(); }

  // ── lista ──
  function abrirObras() {
    folha('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;"><div style="font-size:1.05rem;font-weight:800;color:var(--gold);">📸 Fotos de obras</div>'
      + '<button onclick="document.getElementById(\'obrasSheet\').remove()" style="background:none;border:0;color:var(--t3);font-size:1.2rem;cursor:pointer;">✕</button></div>'
      + '<div style="font-size:.7rem;color:var(--t3);margin-bottom:12px;line-height:1.45;">Elas aparecem no site, na aba "Obras reais" de cada pedra, e o bot pode mandar para os clientes.</div>'
      + '<button id="obNova" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--gold);background:rgba(201,168,76,.15);color:var(--gold);font-weight:800;font-size:.85rem;font-family:Outfit,sans-serif;cursor:pointer;">＋ Nova foto de obra</button>'
      + '<div id="obLista" style="margin-top:14px;font-size:.72rem;color:var(--t3);">Carregando…</div>');
    document.getElementById('obNova').onclick = function () { novaObra({}); };
    api('/bot/obras').then(function (j) { OBRAS = (j && j.obras) || []; desenharLista(); })
      .catch(function (e) { var l = document.getElementById('obLista'); if (l) l.textContent = '⚠️ ' + e.message; });
  }
  function desenharLista() {
    var l = document.getElementById('obLista'); if (!l) return;
    if (!OBRAS.length) { l.innerHTML = 'Nenhuma foto de obra ainda. Que tal a última que vocês entregaram?'; return; }
    var b = base();
    l.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' + OBRAS.map(function (o) {
      return '<div style="position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1/1;background:#111 url(\'' + b + '/portfolio/img/obra/' + encodeURIComponent(o.id) + '\') center/cover;border:1px solid var(--bd);">'
        + '<div style="position:absolute;left:0;right:0;bottom:0;padding:16px 6px 5px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.85));font-size:.55rem;color:#eee;line-height:1.25;">' + esc(o.legenda || nomeAmb(o.cat)) + '</div>'
        + '<button data-ob-apagar="' + esc(o.id) + '" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:.7rem;cursor:pointer;">✕</button></div>';
    }).join('') + '</div><div style="font-size:.6rem;color:var(--t4);margin-top:8px;">' + OBRAS.length + ' foto' + (OBRAS.length > 1 ? 's' : '') + '</div>';
  }

  // ── nova foto ──
  function reduzir(file) {
    return new Promise(function (ok, erro) {
      var fr = new FileReader();
      fr.onerror = function () { erro(new Error('Não consegui ler a foto.')); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { erro(new Error('Formato de foto não suportado.')); };
        img.onload = function () {
          var max = 1400, w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          var q = 0.82, d = c.toDataURL('image/jpeg', q);
          while (d.length > 1300000 && q > 0.45) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
          ok(d);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function novaObra(pre) {
    NOVA = { foto: '', cat: pre.cat || '', pedraId: '', pedra: '', legenda: pre.legenda || '' };
    if (pre.pedra) { var st = (CFG.stones || []).filter(function (s) { return norm(s.nm) === norm(pre.pedra) || norm(pre.pedra).indexOf(norm(s.nm)) >= 0; })[0]; if (st) { NOVA.pedraId = st.id; NOVA.pedra = st.nm; } }
    var pedras = (CFG.stones || []).slice().sort(function (a, b) { return String(a.nm).localeCompare(String(b.nm), 'pt-BR'); });
    folha('<div style="font-size:1.02rem;font-weight:800;color:var(--gold);margin-bottom:12px;">📸 Nova foto de obra</div>'
      + '<label id="obFotoBox" style="display:grid;place-items:center;align-content:center;aspect-ratio:4/3;border-radius:14px;border:1.5px dashed var(--gold3);background:var(--s2) center/cover no-repeat;cursor:pointer;color:var(--t3);font-size:.8rem;text-align:center;">'
      + '<span id="obFotoTx">📷<br>Tirar ou escolher a foto</span><input id="obFile" type="file" accept="image/*" style="display:none;"></label>'
      + '<div style="font-size:.66rem;color:var(--t3);margin:14px 0 6px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Ambiente</div>'
      + '<div id="obAmb" style="display:flex;flex-wrap:wrap;gap:6px;">' + AMB.map(function (a) { return '<button data-ob-amb="' + a[0] + '" style="padding:8px 11px;border-radius:20px;border:1px solid ' + (NOVA.cat === a[0] ? 'var(--gold)' : 'var(--bd)') + ';background:' + (NOVA.cat === a[0] ? 'rgba(201,168,76,.18)' : 'var(--s2)') + ';color:' + (NOVA.cat === a[0] ? 'var(--gold)' : 'var(--t2)') + ';font-size:.7rem;font-family:Outfit,sans-serif;cursor:pointer;">' + a[1] + '</button>'; }).join('') + '</div>'
      + '<div style="font-size:.66rem;color:var(--t3);margin:14px 0 6px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Pedra</div>'
      + '<select id="obPedra" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:var(--tx);font-size:.85rem;font-family:Outfit,sans-serif;">'
      + '<option value="">— escolha a pedra —</option>' + pedras.map(function (s) { return '<option value="' + esc(s.id) + '"' + (NOVA.pedraId === s.id ? ' selected' : '') + '>' + esc(s.nm) + '</option>'; }).join('') + '</select>'
      + '<div style="font-size:.66rem;color:var(--t3);margin:14px 0 6px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Legenda (opcional)</div>'
      + '<input id="obLeg" maxlength="140" value="' + esc(NOVA.legenda) + '" placeholder="Ex.: Bancada em L com cuba esculpida" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:var(--tx);font-size:.85rem;font-family:Outfit,sans-serif;box-sizing:border-box;">'
      + '<div style="font-size:.6rem;color:var(--t4);margin-top:5px;">Não coloque nome nem endereço do cliente: a foto fica pública no site.</div>'
      + '<div id="obErro" style="color:#f87171;font-size:.7rem;min-height:16px;margin-top:8px;"></div>'
      + '<button id="obEnviar" style="width:100%;margin-top:6px;padding:15px;border-radius:12px;border:0;background:linear-gradient(135deg,#e2c675,#C9A84C);color:#1a1200;font-weight:900;font-size:.9rem;font-family:Outfit,sans-serif;cursor:pointer;">Publicar no site</button>');
    document.getElementById('obFile').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      document.getElementById('obFotoTx').textContent = 'Preparando a foto…';
      reduzir(f).then(function (d) {
        NOVA.foto = d;
        var box = document.getElementById('obFotoBox'); box.style.backgroundImage = 'url(' + d + ')';
        document.getElementById('obFotoTx').innerHTML = '<span style="background:rgba(0,0,0,.55);padding:6px 10px;border-radius:20px;color:#fff;">Trocar foto</span>';
      }).catch(function (e) { document.getElementById('obFotoTx').textContent = '⚠️ ' + e.message; });
    };
    document.getElementById('obAmb').onclick = function (ev) {
      var b = ev.target.closest('[data-ob-amb]'); if (!b) return;
      NOVA.cat = b.getAttribute('data-ob-amb');
      this.querySelectorAll('[data-ob-amb]').forEach(function (x) { var on = x === b; x.style.borderColor = on ? 'var(--gold)' : 'var(--bd)'; x.style.background = on ? 'rgba(201,168,76,.18)' : 'var(--s2)'; x.style.color = on ? 'var(--gold)' : 'var(--t2)'; });
    };
    document.getElementById('obEnviar').onclick = function () {
      var er = document.getElementById('obErro'), bt = this;
      var sel = document.getElementById('obPedra'), st = (CFG.stones || []).filter(function (s) { return String(s.id) === sel.value; })[0];
      if (!NOVA.foto) { er.textContent = 'Escolha a foto da obra.'; return; }
      if (!NOVA.cat) { er.textContent = 'Toque no ambiente.'; return; }
      if (!st) { er.textContent = 'Escolha a pedra: é assim que a foto aparece na pedra certa do site.'; return; }
      bt.disabled = true; bt.textContent = 'Enviando…'; er.textContent = '';
      api('/bot/obras', { method: 'POST', body: JSON.stringify({ foto: NOVA.foto, cat: NOVA.cat, pedra: st.nm, pedraId: st.id, legenda: document.getElementById('obLeg').value }) })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || 'O bot não aceitou a foto.');
          toast('📸 Foto publicada: ' + j.legenda);
          abrirObras();
        }).catch(function (e) { bt.disabled = false; bt.textContent = 'Publicar no site'; er.textContent = '⚠️ ' + e.message; });
    };
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-ob-apagar]'); if (!b) return;
    ev.stopPropagation(); ev.preventDefault();
    if (!confirm('Apagar esta foto do site?')) return;
    var id = b.getAttribute('data-ob-apagar');
    api('/bot/obras', { method: 'POST', body: JSON.stringify({ apagar: id }) }).then(function (j) {
      if (j && j.ok) { OBRAS = OBRAS.filter(function (o) { return o.id !== id; }); desenharLista(); toast('Foto apagada.'); }
      else toast('⚠️ ' + ((j && j.error) || 'Não deu para apagar.'));
    }).catch(function (e) { toast('⚠️ ' + e.message); });
  }, true);

  window.abrirObras = abrirObras;
  window.novaObra = novaObra;

  // ── atalhos: Início (cartão), Empresa (cartão), agenda (ao concluir um serviço) ──
  function cartao() {
    return '<div data-obras-atalho onclick="abrirObras()" style="margin:14px 0 0;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--gold3);background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.03));cursor:pointer;">'
      + '<span style="font-size:1.4rem;">📸</span><div style="flex:1;"><div style="font-size:.8rem;font-weight:800;color:var(--gold2);">Fotos de obras</div>'
      + '<div style="font-size:.64rem;color:var(--t3);">Publique a obra pronta: aparece no site e o bot usa nas conversas</div></div><span style="color:var(--gold);">→</span></div>';
  }
  var origDash = window.renderDashboard;
  if (typeof origDash === 'function') {
    window.renderDashboard = function () {
      var r = origDash.apply(this, arguments);
      try {
        var pg = document.getElementById('pg12');
        if (pg && !pg.querySelector('[data-obras-atalho]')) { var det = pg.querySelector('.hm-det'); if (det) det.insertAdjacentHTML('beforebegin', cartao()); }
      } catch (e) {}
      return r;
    };
  }
  function noEmpresa() {
    var pg = document.getElementById('pg5'); if (!pg || pg.querySelector('[data-obras-atalho]')) return;
    var st = document.getElementById('empStats');
    if (st) st.insertAdjacentHTML('afterend', '<div style="padding:0 14px;">' + cartao() + '</div>');
  }
  setTimeout(noEmpresa, 1500);
  // ao concluir um serviço: oferece a foto da obra
  var origTog = window.togJob;
  if (typeof origTog === 'function') {
    window.togJob = function (id) {
      var j = DB.j.find(function (x) { return x.id === id; }), antes = j && j.done;
      var r = origTog.apply(this, arguments);
      try {
        if (j && !antes && j.done && base()) {
          var q = DB.q.find(function (x) { return norm(x.cli) === norm(j.cli) && x.mat; });
          var tipo = norm((q && q.tipo) || j.desc || '');
          var cat = /cozinha|gourmet/.test(tipo) ? 'cozinha' : /banheiro|lavat/.test(tipo) ? 'banheiro' : /lavabo/.test(tipo) ? 'lavabo' : /escada|degrau/.test(tipo) ? 'escada' : /soleira/.test(tipo) ? 'soleira' : /peitoril/.test(tipo) ? 'peitoril' : /churras|varanda/.test(tipo) ? 'varanda' : '';
          setTimeout(function () {
            showCB('📸 Serviço concluído! Quer publicar a foto da obra (' + (j.desc || j.cli) + ') no site?', function () { novaObra({ cat: cat, pedra: q && q.mat, legenda: j.desc || '' }); }, function () {});
          }, 600);
        }
      } catch (e) {}
      return r;
    };
  }
})();
