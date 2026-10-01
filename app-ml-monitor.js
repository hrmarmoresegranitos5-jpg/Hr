// ══════════════════════════════════════════════════════════════
// APP-ML-MONITOR.JS — Monitor de cubas ligado ao Mercado Livre
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// - Campo "Link do ML" + custo + margem em cada card de cuba
// - Lê hr/<codigo>/mlStatus (gravado pelo GitHub Actions todo dia)
// - Selo 🔴 Esgotada / ⏸ Pausada e aviso 🟡 "Preço mudou" com botão Aprovar
// - Botão "🔄 Atualizar do ML": título, descrição, fotos, preço e estoque
// - Preço de venda acompanha o ML automaticamente (padrão: ligado; dá pra desligar por cuba)
// - Confirmação ao adicionar no orçamento uma cuba esgotada
// Depende de: app-core.js (CFG, SYNC, svCFG, buildCfg, buildCubaList, toast)
//             app-ml-import.js (_mlCarregarItem, _mlExtractId, _mlDownloadFotoB64)
// Carregar DEPOIS de app-ml-import.js no index.html.
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var ST = window.ML_STATUS = {};
  var _ref = null, _code = '', _busy = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function brl(n) { return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function brl0(n) { return 'R$ ' + Math.round(Number(n || 0)).toLocaleString('pt-BR'); }
  // TEM que ser igual ao chaveFb() do checar-cubas-ml.js
  function mlKey(id) { return String(id).replace(/[.#$\[\]\/]/g, '_'); }
  function lista(tipo) { return tipo === 'coz' ? CFG.coz : CFG.lav; }
  function _toast(m) { if (typeof toast === 'function') toast(m); }
  function quando(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
  }

  // ─── Estado de uma cuba ─────────────────────────────────────
  function mlInfo(c) {
    var st = c && c.id ? ST[mlKey(c.id)] : null;
    var info = { st: st, temLink: !!(c && (c._ml_url || c._ml_id)), indisponivel: false, motivo: '', precoMudou: false, atrasada: false };
    if (!st || st.checkedAt == null) return info;
    info.atrasada = (Date.now() - st.checkedAt) > 36 * 3600 * 1000; // robô roda 1x/dia; >36h sem checar = suspeito
    if (st.status && st.status !== 'active') {
      info.indisponivel = true;
      info.motivo = st.status === 'paused' ? 'Anúncio pausado'
                  : st.status === 'removido' || st.status === 'closed' ? 'Anúncio removido/encerrado'
                  : 'Anúncio ' + st.status;
    } else if (st.qtd === 0) {
      info.indisponivel = true; info.motivo = 'Esgotada';
    }
    var base = Number(c._ml_preco_custo) || 0;
    if (st.preco > 0 && base > 0 && Math.abs(st.preco - base) >= 0.5 &&
        Number(c._ml_ignorar_preco) !== st.preco) {
      info.precoMudou = true;
    }
    return info;
  }

  // Margem: usa a gravada; se não tiver mas há custo e venda, deduz da venda atual
  function margemDe(c, custo) {
    if (c._ml_margem != null && c._ml_margem !== '' && isFinite(+c._ml_margem)) return +c._ml_margem;
    if (custo > 0 && c.pr > 0) {
      var m = Math.round((c.pr / custo - 1) * 1000) / 10;
      return m > 0 ? m : null; // venda menor que o custo = link/produto provavelmente errado; não deduz margem negativa
    }
    return null;
  }
  function vendaCalc(custo, margem) { return Math.round(custo * (1 + margem / 100)); }

  // ─── Selo no cabeçalho do card ──────────────────────────────
  window.mlBadgeHtml = function (c) {
    var i = mlInfo(c), h = '';
    var css = 'font-size:.56rem;font-weight:800;border-radius:20px;padding:1px 7px;';
    if (i.indisponivel) h += '<span style="' + css + 'color:#ff8a8a;background:rgba(224,81,81,.18);">🔴 ' + esc(i.motivo) + '</span>';
    if (i.precoMudou)   h += '<span style="' + css + 'color:#f3c94a;background:rgba(243,201,74,.16);">🟡 Preço mudou</span>';
    return h;
  };

  // ─── Bloco dentro do card aberto ────────────────────────────
  window.mlBlocoHtml = function (tipo, i, c) {
    var info = mlInfo(c), st = info.st;
    if (!info.temLink) return ''; // bloco só aparece em cubas criadas pelo Mercado Livre
    var lbl = 'font-size:.5rem;color:var(--t4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;';
    var box = 'flex:1;background:var(--s3);border-radius:8px;padding:5px 8px;border:1px solid var(--bd2);';
    var inp = 'width:100%;background:transparent;border:none;padding:0;font-size:.8rem;';
    var custo = Number(c._ml_preco_custo) || 0;
    var margem = margemDe(c, custo);

    var h = '<div style="margin:12px 14px 0;padding:10px 12px;border:1px solid var(--bd2);border-radius:11px;background:rgba(255,230,0,.035);">';
    h += '<div style="font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold2);font-weight:700;margin-bottom:8px;">🛒 Mercado Livre</div>';

    h += '<div style="font-size:.6rem;color:var(--t4);margin-bottom:8px;">Cuba criada pelo Mercado Livre: preço, descrição, estoque e disponibilidade são conferidos todo dia.</div>';

    h += '<div style="display:flex;gap:6px;margin-bottom:8px;">';
    h += '<div style="' + box + '"><div style="' + lbl + '">Custo ML R$</div><input class="cfginp" type="number" step="0.01" value="' + (custo || '') + '" placeholder="0" style="' + inp + '" onchange="mlSetCampo(\'' + tipo + '\',' + i + ',\'_ml_preco_custo\',this.value)"></div>';
    h += '<div style="' + box + '"><div style="' + lbl + '">Margem %</div><input class="cfginp" type="number" step="0.1" value="' + (margem != null ? margem : '') + '" placeholder="30" style="' + inp + '" onchange="mlSetCampo(\'' + tipo + '\',' + i + ',\'_ml_margem\',this.value)"></div>';
    var calc = (custo > 0 && margem != null) ? vendaCalc(custo, margem) : 0;
    h += '<div style="' + box + 'border-color:var(--gold3);"><div style="' + lbl + 'color:var(--gold3);">Venda calc.</div><div style="font-weight:800;color:var(--gold2);font-size:.85rem;">' + (calc ? brl0(calc) : '—') + '</div></div>';
    h += '</div>';
    if (calc && calc !== Math.round(c.pr || 0)) {
      h += '<button class="cfgbtn" style="font-size:.66rem;margin-bottom:8px;" onclick="event.stopPropagation();mlAplicarVendaCalc(\'' + tipo + '\',' + i + ')">Aplicar venda calculada (' + brl0(calc) + ')</button>';
    }

    // Status vindo do robô
    if (!info.temLink) {
      h += '<div style="font-size:.66rem;color:var(--t4);">Cole o link pra ativar a checagem automática de estoque e preço.</div>';
    } else if (!st) {
      h += '<div style="font-size:.66rem;color:var(--t4);">⏳ Ainda não checada. A checagem automática roda todo dia de manhã — ou toque em “Atualizar do ML”.</div>';
    } else {
      var linha = info.indisponivel
        ? '<span style="color:#ff8a8a;font-weight:700;">🔴 ' + esc(info.motivo) + '</span>'
        : '<span style="color:#6fdc8c;font-weight:700;">✅ Ativa · ' + (st.qtd != null ? st.qtd + ' em estoque' : '') + '</span>';
      if (st.preco > 0) linha += ' · <span style="color:var(--t2);">ML: ' + brl(st.preco) + '</span>';
      linha += ' · <span style="color:' + (info.atrasada ? '#f3c94a' : 'var(--t4)') + ';">checado ' + quando(st.checkedAt) + '</span>';
      h += '<div style="font-size:.68rem;">' + linha + '</div>';
      if (info.atrasada) h += '<div style="font-size:.6rem;color:#f3c94a;margin-top:3px;">⚠ Checagem automática atrasada (mais de 36h). Confira em Actions, no GitHub, se o robô "checar-cubas-ml" ainda está rodando.</div>';
      if (st.erro) h += '<div style="font-size:.6rem;color:var(--t4);margin-top:3px;">⚠ Última tentativa falhou (' + esc(st.erro) + '), mostrando o último resultado bom.</div>';
    }

    // Aviso de preço
    if (info.precoMudou) {
      var novaVenda = margem != null ? vendaCalc(st.preco, margem) : 0;
      h += '<div style="margin-top:8px;padding:9px 10px;border-radius:9px;background:rgba(243,201,74,.12);border:1px solid rgba(243,201,74,.4);">';
      h += '<div style="font-size:.72rem;font-weight:700;color:#f3c94a;">🟡 Preço mudou no ML: ' + brl(custo) + ' → ' + brl(st.preco) + '</div>';
      if (novaVenda) h += '<div style="font-size:.68rem;color:var(--t2);margin-top:2px;">Venda: ' + brl0(c.pr) + ' → <b>' + brl0(novaVenda) + '</b> (margem ' + margem + '%)</div>';
      else h += '<div style="font-size:.66rem;color:var(--t3);margin-top:2px;">Sem margem definida: o custo será atualizado e a venda fica como está.</div>';
      h += '<div style="display:flex;gap:6px;margin-top:7px;">';
      h += '<button class="cfgbtn" style="font-size:.68rem;" onclick="event.stopPropagation();mlAplicarPreco(\'' + tipo + '\',' + i + ')">✓ Aprovar</button>';
      h += '<button class="cfgbtn" style="font-size:.68rem;" onclick="event.stopPropagation();mlIgnorarPreco(\'' + tipo + '\',' + i + ')">Ignorar</button>';
      h += '</div></div>';
    } else if (info.temLink && st && st.preco > 0 && !(custo > 0)) {
      h += '<div style="margin-top:8px;"><button class="cfgbtn" style="font-size:.68rem;" onclick="event.stopPropagation();mlAplicarPreco(\'' + tipo + '\',' + i + ')">Usar ' + brl(st.preco) + ' como custo (e acompanhar mudanças)</button></div>';
    }

    // Auto + ações
    h += '<label style="display:flex;align-items:center;gap:9px;margin-top:10px;font-size:.7rem;font-weight:400;text-transform:none;letter-spacing:0;color:var(--t2);cursor:pointer;"><input type="checkbox" style="width:20px;height:20px;min-width:20px;flex:none;padding:0;margin:0;accent-color:#c9a84c;-webkit-appearance:checkbox;appearance:auto;" ' + (c._ml_auto !== false ? 'checked' : '') + ' onchange="mlSetCampo(\'' + tipo + '\',' + i + ',\'_ml_auto\',this.checked)"> Atualizar preço de venda e descrição automaticamente</label>';
    h += '<div style="display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;">';
    h += '<button class="cfgbtn" style="font-size:.7rem;" onclick="event.stopPropagation();mlAtualizarCuba(\'' + tipo + '\',' + i + ')">🔄 Atualizar do ML</button>';
    if (c._ml_url) h += '<a class="cfgbtn" style="font-size:.7rem;text-decoration:none;display:inline-block;" href="' + esc(c._ml_url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ Abrir anúncio</a>';
    h += '</div></div>';
    return h;
  };

  // ─── Edição de campos ───────────────────────────────────────
  function persistir(tipo) {
    svCFG();
    if (typeof buildCubaList === 'function') buildCubaList();
    if (typeof buildCfg === 'function') buildCfg();
  }

  window.mlSetCampo = function (tipo, i, campo, val) {
    var c = lista(tipo)[i]; if (!c) return;
    if (campo === '_ml_auto') c._ml_auto = !!val;
    else if (val === '' || val == null) delete c[campo];
    else c[campo] = parseFloat(String(val).replace(',', '.')) || 0;
    persistir(tipo);
  };

  window.mlSetLink = function (tipo, i, val) {
    var c = lista(tipo)[i]; if (!c) return;
    var url = String(val || '').trim();
    var mudou = url !== (c._ml_url || '');
    if (url) c._ml_url = url; else delete c._ml_url;
    var info = (url && typeof window._mlExtractId === 'function') ? window._mlExtractId(url) : null;
    if (info && !info.isCatalog) c._ml_id = info.id; else delete c._ml_id;
    if (mudou) {
      // link novo = produto novo: descarta status e ignorados do anterior
      delete c._ml_ignorar_preco;
      var k = mlKey(c.id);
      delete ST[k];
      try { if (_ref) _ref.child(k).remove(); } catch (e) {}
    }
    persistir(tipo);
    if (url) _toast('🔗 Link salvo. Toque em “Atualizar do ML” pra puxar os dados agora.');
  };

  window.mlAplicarVendaCalc = function (tipo, i) {
    var c = lista(tipo)[i]; if (!c) return;
    var custo = Number(c._ml_preco_custo) || 0, m = margemDe(c, custo);
    if (!(custo > 0) || m == null) return;
    c.pr = vendaCalc(custo, m);
    persistir(tipo);
    _toast('✓ Venda atualizada: ' + brl0(c.pr));
  };

  // Aprova o preço novo do ML: novo custo, mantém a margem, recalcula a venda
  function aplicarPreco(c, silencioso) {
    var info = mlInfo(c), st = info.st;
    if (!st || !(st.preco > 0)) return false;
    var custoAntigo = Number(c._ml_preco_custo) || 0;
    var m = margemDe(c, custoAntigo);
    c._ml_preco_custo = st.preco;
    if (m != null) { c._ml_margem = m; c.pr = vendaCalc(st.preco, m); }
    delete c._ml_ignorar_preco;
    c._ml_aplicado_em = Date.now();
    return true;
  }

  // Descrição: só troca quando o texto do ML mudou desde a última vez aplicada
  function aplicarDescricao(c) {
    var st = mlInfo(c).st;
    if (!st || !st.desc || !st.descHash) return false;
    if (c._ml_desc_hash === st.descHash) return false;
    c.desc = st.desc;
    c._ml_desc_hash = st.descHash;
    return true;
  }

  window.mlAplicarPreco = function (tipo, i) {
    var c = lista(tipo)[i]; if (!c) return;
    if (!aplicarPreco(c)) return;
    persistir(tipo);
    _toast('✓ Preço atualizado: venda ' + brl0(c.pr));
  };

  window.mlIgnorarPreco = function (tipo, i) {
    var c = lista(tipo)[i]; if (!c) return;
    var st = mlInfo(c).st;
    if (st && st.preco > 0) c._ml_ignorar_preco = st.preco;
    persistir(tipo);
    _toast('Aviso de preço ignorado até o ML mudar de novo.');
  };

  // ─── 🔄 Atualizar do ML (título, descrição, fotos, preço, estoque) ─
  window.mlAtualizarCuba = function (tipo, i) {
    var c = lista(tipo)[i]; if (!c) return;
    if (!c._ml_url) { _toast('Cole o link do Mercado Livre primeiro.'); return; }
    if (typeof window._mlCarregarItem !== 'function') { _toast('Importador do ML não carregado.'); return; }
    if (_busy) { _toast('Já tem uma atualização em andamento…'); return; }
    _busy = true;
    _toast('🔄 Buscando no Mercado Livre…');

    window._mlCarregarItem(c._ml_url).then(function (item) {
      var fotosUrl = (item.pictures || []).map(function (p) { return p.secure_url || p.url || ''; })
        .filter(Boolean).slice(0, 6);

      // 1) Status + estoque (não precisa de confirmação — só informação)
      var st = {
        itemId: item.id, status: item.status || 'active', qtd: Number(item.available_quantity || 0),
        preco: Number(item.price || 0), titulo: item.title || '', checkedAt: Date.now(), origem: 'app'
      };
      ST[mlKey(c.id)] = st;
      try { if (_ref) _ref.child(mlKey(c.id)).set(st); } catch (e) {}
      c._ml_id = item.id;

      // Primeira vez: usa o preço de hoje como base de comparação
      if (!(Number(c._ml_preco_custo) > 0) && st.preco > 0) {
        c._ml_preco_custo = st.preco;
        var m0 = margemDe(c, st.preco);
        c._ml_margem = m0 != null ? m0 : 30;
        if (!(c.pr > 0)) c.pr = vendaCalc(st.preco, c._ml_margem);
      }

      // 2) Conteúdo (título, descrição, fotos) — pede confirmação porque sobrescreve
      var resumo = 'Encontrado no ML:\n' + item.title + '\n\nPreço: ' + brl(st.preco) +
        ' · ' + (st.status !== 'active' ? 'anúncio ' + st.status : st.qtd + ' em estoque') +
        '\n' + fotosUrl.length + ' foto(s)\n\nSubstituir título, descrição e fotos deste card pelos do ML?' +
        '\n(Preço e descrição acompanham o ML automaticamente todo dia.)';
      if (!confirm(resumo)) {
        _busy = false; persistir(tipo); _toast('Status e estoque atualizados. Conteúdo mantido.');
        return;
      }
      c.titulo = item.title || c.titulo;
      if (item._desc) c.desc = String(item._desc).trim().slice(0, 1000);

      if (!fotosUrl.length || typeof window._mlDownloadFotoB64 !== 'function') {
        _busy = false; persistir(tipo); _toast('✅ Atualizado (sem fotos novas).');
        return;
      }
      var novas = [], idx = 0;
      (function proxima() {
        if (idx >= fotosUrl.length) {
          if (novas.length) { c.fotos = novas; c.photo = novas[0]; }
          _busy = false; persistir(tipo);
          _toast(novas.length
            ? '✅ Atualizado: ' + novas.length + ' foto(s) do ML'
            : '⚠️ Dados atualizados, mas nenhuma foto pôde ser baixada (fotos antigas mantidas).');
          return;
        }
        _toast('📷 Baixando foto ' + (idx + 1) + '/' + fotosUrl.length + '…');
        window._mlDownloadFotoB64(fotosUrl[idx++], function (b64) {
          if (b64) novas.push(b64);
          proxima();
        });
      })();
    }).catch(function (e) {
      _busy = false;
      _toast('❌ Não consegui ler o anúncio: ' + ((e && e.message) || e));
    });
  };

  // ─── Confirmação ao usar cuba esgotada num orçamento ─────────
  window.mlConfirmarUsoCuba = function (c) {
    var info = mlInfo(c);
    if (!info.indisponivel) return true;
    return confirm('🔴 ' + (c.nm || 'Esta cuba') + ' está indisponível no Mercado Livre (' + info.motivo + ').\n\nAdicionar ao orçamento mesmo assim?');
  };

  // ─── Auto-aplicar (só cubas com a opção ligada) ──────────────
  function autoAplicar() {
    var n = 0, nd = 0;
    ['coz', 'lav'].forEach(function (t) {
      (lista(t) || []).forEach(function (c) {
        if (!c || c._ml_auto === false) return; // padrão: automático
        var info = mlInfo(c);
        if (info.precoMudou && !info.indisponivel && aplicarPreco(c, true)) n++;
        if (aplicarDescricao(c)) nd++;
      });
    });
    if (n || nd) {
      svCFG();
      if (typeof buildCubaList === 'function') buildCubaList();
      _toast('🔄 ML: ' + n + ' preço(s) e ' + nd + ' descrição(ões) atualizados');
    }
  }

  function atualizarTela() {
    try {
      var a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return; // não atrapalha digitação
      if (typeof buildCfg === 'function' && document.getElementById('cfgBody') !== undefined) buildCfg();
    } catch (e) {}
  }

  // ─── Ligação com o Firebase (espera o SYNC conectar) ─────────
  function ligar() {
    if (typeof SYNC === 'undefined' || !SYNC.db || !SYNC.code || _code === SYNC.code) return;
    try { if (_ref) _ref.off(); } catch (e) {}
    _code = SYNC.code;
    _ref = SYNC.db.ref('hr/' + _code + '/mlStatus');
    _ref.on('value', function (snap) {
      ST = window.ML_STATUS = snap.val() || {};
      autoAplicar();
      atualizarTela();
    }, function (err) { console.warn('[ML-monitor] leitura do mlStatus falhou:', err && err.message); });
  }
  setInterval(ligar, 3000);
  setTimeout(ligar, 1500);
})();
