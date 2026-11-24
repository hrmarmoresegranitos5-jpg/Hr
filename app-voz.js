// app-voz.js — v1 (23/11/2026)
// IDENTIDADE VOCAL DA HELENA: modelo, voz, velocidade, instruções, sotaque, teste com áudio, comparação de vozes,
// configuração padrão, histórico e custo. Tudo fica salvo no bot (KV), então vale no WhatsApp e em qualquer aparelho.
// Entrada: cartão no topo das Configurações.
(function () {
  'use strict';
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(t) { try { toast(t); } catch (e) { alert(t); } }
  function api(cam, corpo) {
    var b = base(); if (!b) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(b + cam, corpo ? { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify(corpo) } : { headers: hdr() })
      .then(function (r) { return r.json(); }).then(function (j) { if (j && j.error && !('ok' in j)) throw new Error(j.error); return j; });
  }
  var D = null, ROT = { marin: 'Marin', coral: 'Coral', nova: 'Nova', shimmer: 'Shimmer', sage: 'Sage', cedar: 'Cedar (masculina)' };
  var TXT = 'Oi! Aqui é a Helena, da HR Mármores e Granitos. O seu orçamento da cozinha em Preto São Gabriel ficou em R$ 2.500,00, com rebaixo americano e sainha em 45°. Dá pra parcelar em 8x. Quer que eu já agende a medição?';

  var css = document.createElement('style');
  css.textContent = [
    '#vozOv{position:fixed;inset:0;z-index:9999;background:rgba(6,6,9,.96);overflow-y:auto;color:#efe9dc;font-family:Outfit,sans-serif;}',
    '#vozOv .vz{max-width:760px;margin:0 auto;padding:18px 16px 60px;}',
    '#vozOv h2{font-family:"Cormorant Garamond",serif;color:#ecd27c;font-size:1.7rem;margin:4px 0 2px;}',
    '#vozOv .sub{color:#a99c80;font-size:.8rem;margin-bottom:14px;}',
    '#vozOv .cx{background:rgba(255,255,255,.035);border:1px solid rgba(201,168,76,.22);border-radius:14px;padding:14px;margin-bottom:12px;}',
    '#vozOv .cx h3{font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:#ecd27c;margin:0 0 10px;font-weight:600;}',
    '#vozOv label{display:block;font-size:.72rem;color:#a99c80;margin:8px 0 4px;}',
    '#vozOv select,#vozOv input[type=text],#vozOv textarea{width:100%;box-sizing:border-box;background:#14141a;color:#f3ecdb;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;font:500 .9rem Outfit,sans-serif;}',
    '#vozOv textarea{min-height:90px;resize:vertical;line-height:1.45;}',
    '#vozOv .lin{display:flex;gap:10px;flex-wrap:wrap;}#vozOv .lin>*{flex:1;min-width:140px;}',
    '#vozOv .chk{display:flex;align-items:center;gap:8px;font-size:.85rem;margin:6px 0;color:#efe9dc;}',
    '#vozOv button{border:none;border-radius:10px;padding:11px 14px;font:700 .85rem Outfit,sans-serif;cursor:pointer;}',
    '#vozOv .bo{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;}',
    '#vozOv .bs{background:rgba(255,255,255,.07);color:#efe9dc;border:1px solid rgba(255,255,255,.12);}',
    '#vozOv .fx{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;background:rgba(6,6,9,.96);padding:8px 0;z-index:2;}',
    '#vozOv .res{margin-top:10px;font-size:.78rem;color:#a99c80;}#vozOv audio{width:100%;margin-top:8px;}',
    '#vozOv .amo{border-top:1px solid rgba(255,255,255,.07);padding:10px 0;}#vozOv .amo b{color:#f3ecdb;}',
    '#vozOv .hi{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:.8rem;padding:8px 0;border-top:1px solid rgba(255,255,255,.06);}',
    '.vz-card{margin:12px 14px 4px;padding:12px 14px;border-radius:12px;border:1px solid rgba(201,168,76,.35);background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(255,255,255,.02));display:flex;align-items:center;gap:12px;cursor:pointer;}',
    '.vz-card b{display:block;color:#ecd27c;font-size:.92rem;}.vz-card small{color:#a99c80;font-size:.74rem;}'
  ].join('');
  document.head.appendChild(css);

  function opt(lista, sel, rot) { return lista.map(function (v) { return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(rot ? rot(v) : v) + '</option>'; }).join(''); }
  function form() {
    var a = D.atual;
    return {
      modelo: document.getElementById('vzMod').value, voz: document.getElementById('vzVoz').value, velocidade: +document.getElementById('vzVel').value,
      instr: document.getElementById('vzIns').value, sotaque: document.getElementById('vzSot').value,
      emocao: document.getElementById('vzEmo').checked, reescrever: document.getElementById('vzRee').checked, semPausas: document.getElementById('vzPau').checked,
      _a: a
    };
  }
  function desenhar() {
    var a = D.atual, u = D.uso || {}, ov = document.getElementById('vozOv');
    var h = '<div class="vz"><div class="fx"><div><h2>🎙️ Identidade vocal da Helena</h2><div class="sub">O que você salvar aqui vale para todos os áudios do WhatsApp.</div></div><button class="bs" id="vzX">Fechar</button></div>';
    h += '<div class="cx"><h3>Voz</h3><div class="lin"><div><label>Modelo</label><select id="vzMod">' + opt(Object.keys(D.modelos), a.modelo, function (k) { return D.modelos[k]; }) + '</select></div>';
    h += '<div><label>Voz</label><select id="vzVoz">' + opt(D.vozes, a.voz, function (v) { return ROT[v] || v; }) + '</select></div>';
    h += '<div><label>Velocidade</label><select id="vzVel">' + opt(['0.95', '1', '1.05'], String(a.velocidade || 1), function (v) { return v === '1' ? '1,0 (normal)' : v.replace('.', ','); }) + '</select></div></div>';
    h += '<div class="res">No modelo Speech a velocidade entra como orientação na interpretação. No Realtime ela é o ajuste de velocidade do próprio modelo. O Realtime gera só no teste aqui: no WhatsApp continua o Speech até o bot conseguir converter o áudio do Realtime para o formato do WhatsApp.</div></div>';
    h += '<div class="cx"><h3>Interpretação</h3><label>Instruções vocais</label><textarea id="vzIns" style="min-height:170px">' + esc(a.instr) + '</textarea>';
    h += '<label>Sotaque</label><input type="text" id="vzSot" value="' + esc(a.sotaque || '') + '">';
    h += '<label class="chk"><input type="checkbox" id="vzEmo"' + (a.emocao ? ' checked' : '') + '> Emoção pelo contexto (orçamento, reclamação, cobrança…)</label>';
    h += '<label class="chk"><input type="checkbox" id="vzRee"' + (a.reescrever ? ' checked' : '') + '> Reescrever o texto como fala (números nunca mudam)</label>';
    h += '<label class="chk"><input type="checkbox" id="vzPau"' + (a.semPausas ? ' checked' : '') + '> Tirar pausas de vírgula</label></div>';
    h += '<div class="cx"><h3>Teste</h3><textarea id="vzTxt">' + esc(TXT) + '</textarea>';
    h += '<div class="lin" style="margin-top:10px"><button class="bo" id="vzOuvir">▶ Gerar e ouvir</button><button class="bs" id="vzComp">Comparar Marin, Coral, Nova e Shimmer</button></div>';
    h += '<label class="chk"><input type="checkbox" id="vzVels"> Na comparação, testar também 0,95 e 1,05</label><div id="vzRes"></div></div>';
    h += '<div class="lin"><button class="bo" id="vzSalvar">✓ Salvar para a Helena</button><button class="bs" id="vzPad">Restaurar configuração padrão</button></div>';
    h += '<div class="cx" style="margin-top:12px"><h3>Consumo de ' + esc(u.mes || '') + '</h3><div style="font-size:.9rem">' + (u.n || 0) + ' áudios · ' + Math.round((u.seg || 0) / 60) + ' min · <b>US$ ' + (u.usd || 0).toFixed(2) + '</b> <span class="res">(estimado)</span></div></div>';
    h += '<div class="cx"><h3>Histórico</h3>' + ((D.hist || []).length ? D.hist.map(function (x, i) { var c = x.cfg || {}; return '<div class="hi"><span>' + new Date(x.em).toLocaleString('pt-BR').slice(0, 16) + ' · ' + esc(ROT[c.voz] || c.voz) + ' · ' + esc(String(c.modelo || '').replace('gpt-', '')) + ' · ' + String(c.velocidade || 1).replace('.', ',') + '</span><button class="bs" data-vzh="' + i + '">Usar esta</button></div>'; }).join('') : '<div class="res">Ainda não há configurações anteriores.</div>') + '</div></div>';
    ov.innerHTML = h;
    document.getElementById('vzX').onclick = fechar;
    document.getElementById('vzOuvir').onclick = function () { testar([{ voz: document.getElementById('vzVoz').value, velocidade: +document.getElementById('vzVel').value }]); };
    document.getElementById('vzComp').onclick = function () {
      var vs = document.getElementById('vzVels').checked ? [0.95, 1, 1.05] : [+document.getElementById('vzVel').value], l = [];
      ['marin', 'coral', 'nova', 'shimmer'].forEach(function (v) { vs.forEach(function (s) { l.push({ voz: v, velocidade: s }); }); });
      testar(l);
    };
    document.getElementById('vzSalvar').onclick = function () { var f = form(); delete f._a; salvar(f, '✓ Voz da Helena salva.'); };
    document.getElementById('vzPad').onclick = function () { if (confirm('Voltar para a configuração padrão da Helena?')) salvar({ padrao: true }, '✓ Configuração padrão restaurada.'); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-vzh]'), function (b) { b.onclick = function () { var c = D.hist[+b.getAttribute('data-vzh')].cfg; salvar(c, '✓ Configuração anterior aplicada.'); }; });
  }
  function salvar(c, msg) { api('/bot/voz/cfg', c).then(function (j) { D.atual = j.atual; D.hist = j.hist; desenhar(); aviso(msg); }).catch(function (e) { aviso('❌ ' + e.message); }); }
  function testar(lista) {
    var f = form(), res = document.getElementById('vzRes'), txt = document.getElementById('vzTxt').value;
    res.innerHTML = ''; var i = 0;
    function prox() {
      if (i >= lista.length) return; var it = lista[i++], id = 'vza' + i;
      res.insertAdjacentHTML('beforeend', '<div class="amo" id="' + id + '"><b>' + esc(ROT[it.voz] || it.voz) + '</b> · ' + String(it.velocidade).replace('.', ',') + ' <span class="res">gerando…</span></div>');
      api('/bot/voz/teste', { texto: txt, modelo: f.modelo, voz: it.voz, velocidade: it.velocidade, instr: f.instr, sotaque: f.sotaque, reescrever: f.reescrever, semPausas: f.semPausas }).then(function (j) {
        var el = document.getElementById(id);
        if (!j.ok) { el.innerHTML = '<b>' + esc(ROT[it.voz] || it.voz) + '</b> · <span style="color:#ff8f7e">' + esc(j.error || 'falhou') + '</span>'; return; }
        el.innerHTML = '<b>' + esc(ROT[it.voz] || it.voz) + '</b> · ' + String(it.velocidade).replace('.', ',') + ' <span class="res">' + (j.ms / 1000).toFixed(1) + ' s · US$ ' + (j.custoUsd || 0).toFixed(4) + (j.contexto ? ' · tom: ' + esc(j.contexto) : '') + '</span>' +
          '<audio controls src="data:' + j.mime + ';base64,' + j.audio + '"></audio><div class="res">Falado: ' + esc(j.fala) + (j.transcricao ? '<br>Realtime leu: ' + esc(j.transcricao) : '') + '</div>';
        if (lista.length === 1) { var au = el.querySelector('audio'); if (au) au.play().catch(function () {}); }
      }).catch(function (e) { var el = document.getElementById(id); if (el) el.innerHTML = '<span style="color:#ff8f7e">' + esc(e.message) + '</span>'; }).then(prox);
    }
    prox();
  }
  function fechar() { var ov = document.getElementById('vozOv'); if (ov) ov.remove(); }
  window.abrirVozHelena = function () {
    fechar(); var ov = document.createElement('div'); ov.id = 'vozOv'; ov.innerHTML = '<div class="vz"><h2>🎙️ Identidade vocal da Helena</h2><div class="sub">Carregando…</div></div>'; document.body.appendChild(ov);
    api('/bot/voz/cfg').then(function (j) { D = j; desenhar(); }).catch(function (e) { ov.innerHTML = '<div class="vz"><h2>🎙️ Identidade vocal</h2><div class="sub">❌ ' + esc(e.message) + '</div><button class="bs" onclick="document.getElementById(\'vozOv\').remove()">Fechar</button></div>'; });
  };
  // cartão no topo das Configurações
  function cartao() {
    var cb = document.getElementById('cfgBody'); if (!cb || cb.querySelector('.vz-card')) return;
    var d = document.createElement('div'); d.className = 'vz-card'; d.innerHTML = '<span style="font-size:1.5rem">🎙️</span><span><b>Identidade vocal da Helena</b><small>Voz, sotaque, teste e comparação dos áudios do WhatsApp</small></span>';
    d.onclick = window.abrirVozHelena; cb.insertBefore(d, cb.firstChild);
  }
  setInterval(cartao, 1000);
})();
