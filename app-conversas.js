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

  function botao() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-conv-btn]')) return;
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-conv-btn', '1');
    b.style.cssText = 'display:flex;align-items:center;gap:10px;width:calc(100% - 24px);margin:12px 12px 4px;padding:12px 14px;border-radius:14px;border:1px solid var(--bd2);background:var(--s2);color:var(--tx);font-family:inherit;text-align:left;cursor:pointer;';
    b.innerHTML = '<span style="font-size:1.3rem;">💬</span><div style="flex:1;"><b>Conversas dos clientes</b><div style="font-size:.7rem;color:var(--t3);">Cada cliente com a conversa inteira: fotos, áudios e PDFs</div></div><span style="color:var(--t3);">›</span>';
    b.onclick = function () { (window.abrirCRM || abrir)(); };
    sb.insertBefore(b, sb.firstChild);
  }
  function iniciar() {
    var sb = document.getElementById('secBody'); if (!sb) return;
    botao();
    new MutationObserver(function () { botao(); }).observe(sb, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
