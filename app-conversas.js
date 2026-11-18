// app-conversas.js — v1: Secretária → "💬 Conversas dos clientes" (últimos 14 dias, arquivadas pelo bot)
// Mostra a lista e exporta tudo num arquivo .txt para revisar o atendimento (ou mandar para análise).
(function () {
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function dh(ms) { var d = new Date(ms); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  var cache = null;
  function fecha() { var m = document.getElementById('hrConvModal'); if (m) m.remove(); }
  function sheet(html) {
    fecha();
    var m = document.createElement('div'); m.id = 'hrConvModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;';
    m.innerHTML = '<div style="width:100%;max-height:90vh;overflow-y:auto;background:var(--s1,#141415);border-radius:18px 18px 0 0;border-top:1px solid var(--gold3);padding:16px 14px 22px;">' + html +
      '<button type="button" data-conv-fecha="1" style="width:100%;margin-top:8px;padding:11px;border:none;background:transparent;color:var(--t3);font-size:.8rem;font-family:inherit;cursor:pointer;">Fechar</button></div>';
    m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.closest('[data-conv-fecha]')) fecha(); });
    document.body.appendChild(m);
  }

  function buscar() {
    var b = base(); if (!b) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(b + '/bot/conversas/arquivo?dias=14', { headers: _botHeaders() }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.error) throw new Error(j.error);
      cache = (j && j.conversas) || []; return cache;
    });
  }

  function texto(lista) {
    var linhas = ['CONVERSAS DOS CLIENTES COM O BOT — HR Mármores e Granitos', 'Exportado em ' + dh(Date.now()) + ' · ' + lista.length + ' conversa(s), últimos 14 dias', ''];
    lista.forEach(function (c) {
      linhas.push('══════════════════════════════════════');
      linhas.push((c.nome || 'Sem nome') + ' · final ' + String(c.numero || '').slice(-4) + ' · última em ' + dh(c.atualizado));
      var d = c.dados || {}, info = [d.interesse, d.cor, d.endereco].filter(Boolean).join(' · ');
      if (info) linhas.push('Dados: ' + info);
      linhas.push('');
      (c.falas || []).forEach(function (f) { linhas.push((f.q === 'c' ? 'CLIENTE: ' : 'BOT: ') + String(f.x || '').replace(/\n+/g, ' ⏎ ')); });
      linhas.push('');
    });
    return linhas.join('\n');
  }

  function exportar() {
    var p = cache ? Promise.resolve(cache) : buscar();
    p.then(function (lista) {
      if (!lista.length) { toast('Nenhuma conversa arquivada ainda.'); return; }
      var nome = 'conversas-bot-' + new Date().toISOString().slice(0, 10) + '.txt';
      var blob = new Blob([texto(lista)], { type: 'text/plain' });
      var arq = null; try { arq = new File([blob], nome, { type: 'text/plain' }); } catch (e) {}
      if (arq && navigator.canShare && navigator.canShare({ files: [arq] })) {
        navigator.share({ files: [arq], title: 'Conversas do bot' }).catch(function () {});
      } else {
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      }
    }).catch(function (e) { toast('⚠️ ' + e.message); });
  }

  function abrir() {
    var h = '<div style="font-size:1rem;font-weight:800;color:var(--gold);margin-bottom:4px;">💬 Conversas dos clientes</div>' +
      '<div style="font-size:.72rem;color:var(--t3);margin-bottom:10px;">O que o bot conversou com cada cliente nos últimos 14 dias.</div>' +
      '<div id="hrConvLista" style="font-size:.8rem;color:var(--t3);">Carregando…</div>' +
      '<button type="button" id="hrConvExp" style="width:100%;margin-top:12px;padding:12px;border:none;border-radius:12px;background:var(--gold3);color:#000;font-weight:800;font-family:inherit;cursor:pointer;">📤 Exportar todas (.txt)</button>';
    sheet(h);
    document.getElementById('hrConvExp').onclick = exportar;
    buscar().then(function (lista) {
      var el = document.getElementById('hrConvLista'); if (!el) return;
      if (!lista.length) { el.innerHTML = 'Nenhuma conversa arquivada ainda. Elas começam a ser guardadas a partir desta versão do bot.'; return; }
      el.innerHTML = lista.map(function (c, i) {
        var ult = (c.falas || []).slice(-2);
        return '<div data-conv="' + i + '" style="background:var(--s2);border:1px solid var(--bd2);border-radius:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer;">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;"><b style="color:var(--tx);">' + esc(c.nome || 'Sem nome') + '</b><span style="font-size:.68rem;color:var(--t3);">' + esc(dh(c.atualizado)) + '</span></div>' +
          '<div style="font-size:.72rem;color:var(--t2);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(ult.length ? ult[ult.length - 1].x : '') + '</div></div>';
      }).join('');
      el.onclick = function (ev) {
        var b = ev.target.closest('[data-conv]'); if (!b) return;
        var c = lista[+b.getAttribute('data-conv')];
        b.outerHTML = '<div style="background:var(--s2);border:1px solid var(--gold3);border-radius:12px;padding:10px 12px;margin-bottom:8px;"><b>' + esc(c.nome || 'Sem nome') + '</b>' +
          (c.falas || []).map(function (f) {
            return '<div style="margin-top:7px;padding:7px 9px;border-radius:10px;font-size:.76rem;line-height:1.4;white-space:pre-wrap;' + (f.q === 'c' ? 'background:rgba(255,255,255,.05);margin-right:24px;' : 'background:rgba(212,175,55,.12);margin-left:24px;') + '">' + esc(f.x) + '</div>';
          }).join('') + '</div>';
      };
    }).catch(function (e) { var el = document.getElementById('hrConvLista'); if (el) el.innerHTML = '⚠️ ' + esc(e.message); });
  }
  window.abrirConversasClientes = abrir;
  window.exportarConversasClientes = exportar;

  // v3: cartão de entrada em preto e dourado, com as não lidas e os últimos clientes
  var resumo = null, resumoEm = 0;
  function estiloCartao() {
    if (document.getElementById('hrConvCss')) return;
    var st = document.createElement('style'); st.id = 'hrConvCss';
    st.textContent = '.cv-card{position:relative;display:flex;align-items:center;gap:13px;width:calc(100% - 24px);margin:12px 12px 6px;padding:14px 14px;border-radius:18px;border:1px solid rgba(201,168,76,.4);'
      + 'background:radial-gradient(120% 140% at 0% 0%,rgba(232,201,106,.18),transparent 55%),linear-gradient(135deg,#1d1810,#0f0d0a);color:#f4eee2;font-family:inherit;text-align:left;cursor:pointer;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,.45);transition:transform .15s}'
      + '.cv-card:active{transform:scale(.98)}'
      + '.cv-card::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,240,200,.12) 50%,transparent 65%);background-size:250% 100%;animation:cvBrilho 4s ease-in-out infinite;pointer-events:none}'
      + '.cv-ic{width:48px;height:48px;border-radius:15px;flex:none;display:flex;align-items:center;justify-content:center;font-size:1.45rem;background:linear-gradient(135deg,#e8c96a,#a8862f);box-shadow:0 6px 16px rgba(201,168,76,.35)}'
      + '.cv-tit{font-family:"Cormorant Garamond",serif;font-size:1.22rem;font-weight:700;color:#f0d78c;line-height:1.1}'
      + '.cv-sub{font-size:.72rem;color:#a99d84;margin-top:3px}'
      + '.cv-avs{display:flex;margin-top:7px}.cv-avs span{width:24px;height:24px;border-radius:50%;margin-right:-7px;border:2px solid #15120d;display:flex;align-items:center;justify-content:center;font-size:.58rem;font-weight:800;color:#fff}'
      + '.cv-bd{position:absolute;top:10px;right:12px;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-size:.66rem;font-weight:800;border-radius:12px;padding:2px 9px;box-shadow:0 2px 10px rgba(201,168,76,.45);animation:cvPulsa 1.8s ease-in-out infinite}'
      + '.cv-seta{color:#c9a84c;font-size:1.3rem;flex:none}'
      + '@keyframes cvBrilho{0%{background-position:150% 0}60%,100%{background-position:-60% 0}}@keyframes cvPulsa{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}';
    document.head.appendChild(st);
  }
  function corAv(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; var a = h % 360; return 'linear-gradient(135deg,hsl(' + a + ',42%,42%),hsl(' + ((a + 40) % 360) + ',48%,26%))'; }
  function ini(n) { var p = String(n || '?').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function pintarCartao(b) {
    var r = resumo, novas = 0, avs = '';
    if (r) {
      var v = {}; try { v = JSON.parse(localStorage.getItem('hr_crm_vistos') || '{}') || {}; } catch (e) {}
      r.forEach(function (c) { if (c.ultq === 'c' && Math.max(0, (c.total || 0) - (v[c.num] || 0)) > 0) novas++; });
      avs = '<div class="cv-avs">' + r.slice(0, 5).map(function (c) { var nm = c.nome || c.perfil || '?'; return '<span style="background:' + corAv(c.num) + '">' + esc(ini(nm)) + '</span>'; }).join('') + '</div>';
    }
    b.innerHTML = '<span class="cv-ic">💬</span><div style="flex:1;min-width:0;"><div class="cv-tit">Conversas dos clientes</div>'
      + '<div class="cv-sub">' + (r ? r.length + ' cliente(s) · fotos, áudios e PDFs' : 'Cada cliente com a conversa inteira') + '</div>' + avs + '</div>'
      + (novas ? '<span class="cv-bd">' + novas + ' nova' + (novas > 1 ? 's' : '') + '</span>' : '') + '<span class="cv-seta">›</span>';
  }
  function atualizarResumo(b) {
    if (Date.now() - resumoEm < 60000) { pintarCartao(b); return; }
    resumoEm = Date.now();
    var bs = ''; try { bs = String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) {}
    if (!bs) { pintarCartao(b); return; }
    fetch(bs + '/bot/crm/contatos', { headers: _botHeaders() }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.contatos) resumo = j.contatos; pintarCartao(b); }).catch(function () { pintarCartao(b); });
  }
  function botao() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-conv-btn]')) return;
    estiloCartao();
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-conv-btn', '1'); b.className = 'cv-card';
    pintarCartao(b); atualizarResumo(b);
    b.onclick = function () { resumoEm = 0; (window.abrirCRM || abrir)(); };
    sb.insertBefore(b, sb.firstChild);
  }
  function iniciar() {
    var sb = document.getElementById('secBody'); if (!sb) return;
    botao();
    new MutationObserver(function () { botao(); }).observe(sb, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
