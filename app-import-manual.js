// ══════════════════════════════════════════════════════════════
// APP-IMPORT-MANUAL.JS  — Importação manual de produtos
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// Alternativa 100% estável ao app-ml-import.js: zero chamadas de
// rede, zero proxy, zero dependência do Mercado Livre. Você digita
// os dados (copiados do anúncio) e faz upload de prints/fotos.
//
// Fluxo:
//  1. Abre o anúncio no app/site do ML
//  2. Copia título + preço (cola tudo de uma vez no campo de texto)
//  3. Tira print ou salva as fotos do produto na galeria
//  4. Faz upload das imagens aqui (várias de uma vez)
//  5. Ajusta margem → preço de venda calculado automaticamente
//  6. Salva — vai pro mesmo catálogo (CFG.coz / CFG.lav) que o
//     importador do ML usa, com a mesma estrutura de dados.
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var _im = {
    cat:    'coz',
    margem: 10,
    fotos:  [],   // array de dataURLs (base64)
    selIdx: 0,    // índice da foto principal selecionada
  };

  // ─── Utilitários (mesmos do app-ml-import.js) ──────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function _fmt(n) {
    return 'R$\u00a0' + Number(n).toLocaleString('pt-BR',
      {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function _precoVenda(custo, margem) { return custo * (1 + margem / 100); }

  // Tenta extrair um preço de um texto colado tipo "R$ 199,90".
  // Prioriza números logo após "R$" (evita confundir com dimensões
  // como "35cm" que apareçam antes no mesmo texto).
  function _parsePreco(txt) {
    if (!txt) return 0;
    var s = String(txt);

    // 1) Procura explicitamente "R$ 1.234,56" ou "R$ 199,90"
    var mRS = s.match(/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    if (mRS) return parseFloat(mRS[1].replace(/\./g, '').replace(',', '.')) || 0;

    // 2) Procura "R$ 199" (sem centavos)
    mRS = s.match(/R\$\s*(\d{1,3}(?:\.\d{3})*)/i);
    if (mRS) return parseFloat(mRS[1].replace(/\./g, '')) || 0;

    // 3) Sem "R$" no texto: só aceita um número com vírgula e 2 casas
    //    decimais (formato de preço), pra não confundir com "35cm",
    //    "10x", quantidades, etc.
    var mGenerico = s.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (mGenerico) return parseFloat(mGenerico[1].replace(/\./g, '').replace(',', '.')) || 0;

    return 0;
  }

  // ─── Upload de fotos (várias de uma vez, redimensiona p/ economia) ─
  function _handleFotos(input) {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;

    var pendentes = files.length;
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        _redimensionar(e.target.result, function(dataUrlFinal) {
          _im.fotos.push(dataUrlFinal);
          pendentes--;
          if (pendentes === 0) {
            input.value = ''; // permite selecionar os mesmos arquivos de novo se precisar
            _renderModal();
          }
        });
      };
      reader.onerror = function() {
        console.warn('[Import-Manual] falha ao ler arquivo:', file.name);
        pendentes--;
        if (pendentes === 0) _renderModal();
      };
      reader.readAsDataURL(file);
    });
  }

  // Redimensiona pra no máximo 900px de largura, JPEG 80% — evita
  // que prints de celular (3-4MB) inchem o localStorage do app.
  function _redimensionar(dataUrl, cb) {
    var img = new Image();
    img.onload = function() {
      try {
        var maxW  = 900;
        var scale = Math.min(1, maxW / img.width);
        var canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.8));
      } catch (e) {
        console.warn('[Import-Manual] falha ao redimensionar, usando original:', e.message || e);
        cb(dataUrl);
      }
    };
    img.onerror = function() { cb(dataUrl); };
    img.src = dataUrl;
  }

  function _removerFoto(idx) {
    _im.fotos.splice(idx, 1);
    if (_im.selIdx >= _im.fotos.length) _im.selIdx = Math.max(0, _im.fotos.length - 1);
    _renderModal();
  }

  function _selecionarFoto(idx) {
    _im.selIdx = idx;
    _renderModal();
  }

  // ─── Atualiza preço calculado ao digitar custo/margem ──────
  function _recalcular() {
    var elCusto = document.getElementById('im-custo');
    var elMg    = document.getElementById('im-margem');
    var elPr    = document.getElementById('im-pr-venda');
    if (!elCusto || !elMg || !elPr) return;
    var custo  = parseFloat((elCusto.value || '').replace(',', '.')) || 0;
    var margem = parseFloat(elMg.value) || 0;
    _im.margem = margem;
    elPr.textContent = _fmt(_precoVenda(custo, margem));
  }

  // Quando o usuário cola "título + preço" de uma vez, tenta separar
  // automaticamente o preço do texto e preencher os dois campos.
  function _handleColaTitulo(textarea) {
    var txt = textarea.value;
    var elCusto = document.getElementById('im-custo');
    if (!elCusto || elCusto.value) return; // não sobrescreve se já tiver valor
    var preco = _parsePreco(txt);
    if (preco > 0) {
      elCusto.value = preco.toFixed(2).replace('.', ',');
      _recalcular();
    }
  }

  // ─── Modal ──────────────────────────────────────────────────
  function _abrirModal(cat) {
    _im.cat    = cat || 'coz';
    _im.fotos  = [];
    _im.selIdx = 0;

    if (!document.getElementById('imManualOv')) {
      var ov = document.createElement('div');
      ov.id  = 'imManualOv';
      ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;'
        + 'background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;'
        + 'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
      ov.onclick = function(e) { if (e.target === ov) _fecharModal(); };

      var box = document.createElement('div');
      box.id  = 'imManualBox';
      box.style.cssText = 'background:var(--s1,#131217);border-radius:20px 20px 0 0;'
        + 'width:100%;max-width:520px;max-height:90dvh;overflow-y:auto;'
        + 'padding:20px 16px 32px;box-sizing:border-box;';

      // Delegação de evento no box — persiste mesmo quando innerHTML é reescrito
      box.addEventListener('click', function(e) {
        var btn = e.target.closest('#imBtnSalvar');
        if (btn) { e.stopPropagation(); _salvar(); }
      });

      var inner = document.createElement('div');
      inner.id  = 'imManualModal';
      box.appendChild(inner);
      ov.appendChild(box);
      document.body.appendChild(ov);
    }

    document.getElementById('imManualOv').style.display = 'flex';
    _renderModal();
  }

  function _fecharModal() {
    var ov = document.getElementById('imManualOv');
    if (ov) ov.style.display = 'none';
  }

  function _renderModal() {
    var wrap = document.getElementById('imManualModal');
    if (!wrap) return;

    // Preserva valores digitados antes de re-renderizar (upload de foto re-renderiza)
    var prevTitulo = (document.getElementById('im-titulo') || {}).value || '';
    var prevNome   = (document.getElementById('im-nome')   || {}).value || '';
    var prevDim    = (document.getElementById('im-dim')    || {}).value || '';
    var prevCusto  = (document.getElementById('im-custo')  || {}).value || '';
    var prevDesc   = (document.getElementById('im-desc')   || {}).value || '';

    var h = '';

    // Cabeçalho
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">';
    h += '<div style="font-size:1.6rem;">✍️</div>';
    h += '<div style="flex:1;">';
    h += '<div style="font-size:.95rem;font-weight:700;color:var(--tx);">Importação Manual</div>';
    h += '<div style="font-size:.62rem;color:var(--t3);">Cole o título, descrição, fotos e preço</div>';
    h += '</div>';
    h += '<button onclick="_imFecharModal()" style="background:none;border:none;color:var(--t3);font-size:1.3rem;cursor:pointer;line-height:1;padding:4px 8px;">✕</button>';
    h += '</div>';

    // Seletor de categoria
    h += '<div style="display:flex;gap:8px;margin-bottom:14px;">';
    ['coz','lav'].forEach(function(c) {
      var ativ = _im.cat === c;
      var lab  = c === 'coz' ? '🍳 Cozinha' : '🚿 Banhe./Lavabo';
      h += '<button onclick="_imSetCat(\'' + c + '\')" style="flex:1;padding:9px;border-radius:10px;font-size:.75rem;font-weight:600;cursor:pointer;border:1px solid ' + (ativ ? 'var(--gold2)' : 'var(--bd2)') + ';background:' + (ativ ? 'var(--gdim)' : 'var(--s3)') + ';color:' + (ativ ? 'var(--gold2)' : 'var(--t2)') + ';">' + lab + '</button>';
    });
    h += '</div>';

    // ─── Título do anúncio ────────────────────────────────────
    h += '<div style="font-size:.6rem;color:var(--gold3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Título do anúncio</div>';
    h += '<textarea id="im-titulo" rows="3" placeholder="Ex: Cuba Gourmet Cozinha Inox 56x34x17cm Embutir Aço Inox Escovado 56L com Válvula e Sifão Antirruído" oninput="_imHandleTitulo(this)" style="width:100%;background:var(--s3);border:1px solid var(--gold3);border-radius:10px;padding:9px 11px;color:var(--tx);font-size:.78rem;box-sizing:border-box;outline:none;resize:vertical;margin-bottom:12px;font-family:inherit;">' + _esc(prevTitulo) + '</textarea>';

    // ─── Upload de fotos ──────────────────────────────────────
    h += '<div style="font-size:.6rem;color:var(--gold3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;">Fotos do produto</div>';
    h += '<label style="display:block;width:100%;padding:13px;border-radius:10px;border:1px dashed var(--gold3);background:var(--gdim);color:var(--gold2);font-size:.85rem;font-weight:700;text-align:center;cursor:pointer;margin-bottom:10px;box-sizing:border-box;">📷 Selecionar fotos da galeria (pode escolher várias)<input type="file" accept="image/*" multiple onchange="_imHandleFotos(this)" style="display:none;"></label>';

    if (_im.fotos.length) {
      if (_im.selIdx >= _im.fotos.length) _im.selIdx = 0;

      h += '<div style="background:var(--s2);border-radius:12px;overflow:hidden;aspect-ratio:4/3;margin-bottom:8px;"><img src="' + _im.fotos[_im.selIdx] + '" style="width:100%;height:100%;object-fit:contain;padding:16px;box-sizing:border-box;"></div>';

      h += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:6px;padding-bottom:4px;">';
      _im.fotos.forEach(function(foto, i) {
        var sel = _im.selIdx === i;
        h += '<div style="position:relative;flex-shrink:0;">';
        h += '<div onclick="_imSelecionarFoto(' + i + ')" style="cursor:pointer;position:relative;">';
        h += '<img src="' + foto + '" style="width:62px;height:62px;object-fit:cover;border-radius:8px;border:2px solid ' + (sel ? 'var(--gold2)' : 'rgba(255,255,255,.15)') + ';box-sizing:border-box;display:block;">';
        h += '<div style="position:absolute;top:2px;left:2px;background:' + (sel ? 'var(--gold2)' : 'rgba(0,0,0,.7)') + ';border-radius:4px;font-size:.52rem;font-weight:800;color:' + (sel ? '#1a0e00' : '#ccc') + ';padding:1px 5px;">' + (sel ? '★' : '☆') + '</div>';
        h += '</div>';
        h += '<button onclick="event.stopPropagation();_imRemoverFoto(' + i + ')" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#c0392b;color:#fff;border:none;font-size:.65rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
        h += '</div>';
      });
      h += '</div>';
      h += '<div style="font-size:.55rem;color:var(--t4);margin-bottom:12px;">★ = foto destaque no catálogo. Toque na foto para marcar como destaque.</div>';
    } else {
      h += '<div style="text-align:center;padding:16px 0;color:var(--t3);font-size:.72rem;margin-bottom:12px;opacity:.7;">Nenhuma foto selecionada ainda</div>';
    }

    // ─── Nome curto ───────────────────────────────────────────
    h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Nome curto <span style="color:var(--t4);">(exibido no card do catálogo)</span></div>';
    h += '<input id="im-nome" type="text" value="' + _esc(prevNome) + '" placeholder="ex: Cuba Gourmet Inox 56x34" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;padding:9px 11px;color:var(--tx);font-size:.8rem;font-weight:600;box-sizing:border-box;outline:none;margin-bottom:10px;">';

    h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Dimensões</div>';
    h += '<input id="im-dim" type="text" value="' + _esc(prevDim) + '" placeholder="ex: 56×34×17cm" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;padding:9px 11px;color:var(--tx);font-size:.78rem;box-sizing:border-box;outline:none;margin-bottom:10px;">';

    // ─── Descrição completa ───────────────────────────────────
    h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Descrição completa</div>';
    h += '<textarea id="im-desc" rows="6" placeholder="Cole aqui a descrição completa: características, dimensões, itens inclusos..." style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;padding:9px 11px;color:var(--tx);font-size:.73rem;box-sizing:border-box;outline:none;resize:vertical;margin-bottom:12px;font-family:inherit;line-height:1.55;">' + _esc(prevDesc) + '</textarea>';

    // ─── Preço e margem ───────────────────────────────────────
    h += '<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:11px;padding:12px 14px;margin-bottom:10px;">';
    h += '<div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:8px;">';
    h += '<div style="flex:1;"><div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Preço de custo (R$)</div><input id="im-custo" type="text" inputmode="decimal" value="' + _esc(prevCusto) + '" placeholder="0,00" oninput="_imRecalcular()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:7px 9px;color:var(--tx);font-size:1.05rem;font-weight:700;box-sizing:border-box;outline:none;"></div>';
    h += '<div style="width:80px;"><div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Margem %</div><input id="im-margem" type="number" min="0" max="300" step="1" value="' + _im.margem + '" oninput="_imRecalcular()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:6px 8px;color:var(--tx);font-size:.85rem;font-weight:700;box-sizing:border-box;outline:none;text-align:center;"></div>';
    h += '</div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;"><div style="font-size:.6rem;color:var(--gold3);text-transform:uppercase;letter-spacing:1px;">Preço de venda calculado</div><div id="im-pr-venda" style="font-family:\'Cormorant Garamond\',serif;font-size:1.6rem;font-weight:700;color:var(--gold2);">' + _fmt(_precoVenda(parseFloat((prevCusto||'0').replace(',', '.')) || 0, _im.margem)) + '</div></div>';
    h += '</div>';

    h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:14px;padding:7px 10px;background:rgba(0,0,0,.2);border-radius:8px;border-left:2px solid var(--t4);">🔒 Preço de custo é dado interno — não aparece para clientes.</div>';

    h += '<button id="imBtnSalvar" style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,#a07828,var(--gold2));color:#0f0c00;font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;">✓ Salvar produto</button>';

    wrap.innerHTML = h;

    // Bind do botão salvar via addEventListener — mais confiável que onclick inline
    var btnSalvar = document.getElementById('imBtnSalvar');
    if (btnSalvar) {
      btnSalvar.addEventListener('click', function(e) {
        e.stopPropagation();
        _salvar();
      });
    }
  }

  // ─── Salvar ─────────────────────────────────────────────────
  function _salvar() {
    // DEBUG TEMPORÁRIO — remover após confirmar que funciona
    console.log('[import-manual] _salvar chamado. CFG:', typeof CFG, 'cat:', _im.cat);

    var elTitulo = document.getElementById('im-titulo');
    var elNome   = document.getElementById('im-nome');
    var elDim    = document.getElementById('im-dim');
    var elCusto  = document.getElementById('im-custo');
    var elMg     = document.getElementById('im-margem');
    var elDesc   = document.getElementById('im-desc');

    // Nome: usa campo nome curto, ou primeiros 60 chars do título se vazio
    var nome = (elNome && elNome.value.trim()) || (elTitulo && elTitulo.value.trim().slice(0, 60)) || '';
    if (!nome) {
      _imAlerta('⚠️ Digite pelo menos o título ou nome do produto antes de salvar.');
      if (elTitulo) elTitulo.focus();
      return;
    }

    // Garante que CFG existe e tem as listas necessárias
    if (typeof CFG === 'undefined' || !CFG) {
      _imAlerta('❌ Erro: configuração do sistema não carregada. Recarregue o app.');
      return;
    }
    if (!CFG.coz) CFG.coz = [];
    if (!CFG.lav) CFG.lav = [];

    var titulo = (elTitulo && elTitulo.value.trim()) || nome;
    var dim    = (elDim    && elDim.value.trim())    || '';
    var desc   = (elDesc   && elDesc.value.trim())   || '';
    var custo  = parseFloat(((elCusto && elCusto.value) || '0').replace(',', '.')) || 0;
    var margem = parseFloat((elMg && elMg.value)) || 0;
    var venda  = _precoVenda(custo, margem);

    var cat = _im.cat;

    var novaCuba = {
      id:      'manual_' + Date.now(),
      nm:      nome,
      titulo:  titulo,
      brand:   '',
      dim:     dim,
      desc:    desc,
      pr:      Math.round(venda * 100) / 100,
      pr_orig: custo > 0 ? Math.round(custo * 100) / 100 : 0,
      inst:    cat === 'coz' ? 110 : 220,
      instCli: cat === 'coz' ? 160 : 280,
      photo:   _im.fotos.length ? _im.fotos[_im.selIdx] : '',
      fotos:   _im.fotos.slice(),
      _manual_custo:  custo,
      _manual_margem: margem,
    };

    // garante que a foto destaque seja a primeira do array
    if (_im.fotos.length > 1 && _im.selIdx > 0) {
      var dest = novaCuba.fotos.splice(_im.selIdx, 1)[0];
      novaCuba.fotos.unshift(dest);
      novaCuba.photo = dest;
    }

    try {
      var lista = cat === 'coz' ? CFG.coz : CFG.lav;
      lista.push(novaCuba);

      if (typeof svCFG         === 'function') svCFG();
      if (typeof buildCubaList === 'function') buildCubaList();
      if (typeof buildCfg      === 'function') buildCfg();
      if (typeof toast         === 'function') toast('✅ Produto salvo: ' + nome);

      _fecharModal();
    } catch(e) {
      _imAlerta('❌ Erro ao salvar: ' + e.message);
      console.error('[import-manual] _salvar erro:', e);
    }
  }

  function _imAlerta(msg) {
    if (typeof toast === 'function') { toast(msg); return; }
    alert(msg.replace(/^[⚠️✅❌]\s*/, ''));
  }

  // ══════════════════════════════════════════════════════════
  // FUNÇÕES GLOBAIS
  // ══════════════════════════════════════════════════════════

  window._imAbrirModal     = _abrirModal;
  window._imFecharModal    = _fecharModal;
  window._imSetCat         = function(cat) { _im.cat = cat; _renderModal(); };
  window._imHandleFotos    = _handleFotos;
  window._imRemoverFoto    = _removerFoto;
  window._imSelecionarFoto = _selecionarFoto;
  window._imRecalcular     = _recalcular;
  window._imHandleTitulo   = function(ta) {
    // Tenta extrair preço do título colado
    var elCusto = document.getElementById('im-custo');
    if (!elCusto || elCusto.value) return;
    var preco = _parsePreco(ta.value);
    if (preco > 0) {
      elCusto.value = preco.toFixed(2).replace('.', ',');
      _recalcular();
    }
  };
  window._imSalvar         = _salvar;

  // ══ Gerenciamento de galeria nas cubas existentes (card do buildCfg) ══

  function _redimParaCuba(dataUrl, cb) { _redimensionar(dataUrl, cb); }

  window._cubaAddFotos = function(tipo, idx, input) {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    var lista = tipo === 'coz' ? CFG.coz : CFG.lav;
    var cuba  = lista[idx];
    if (!cuba) return;
    if (!cuba.fotos) cuba.fotos = [];
    if (cuba.photo && cuba.fotos.indexOf(cuba.photo) === -1) cuba.fotos.unshift(cuba.photo);

    var pendentes = files.length;
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        _redimParaCuba(e.target.result, function(url) {
          cuba.fotos.push(url);
          if (!cuba.photo) { cuba.photo = url; }
          pendentes--;
          if (pendentes === 0) {
            input.value = '';
            svCFG();
            buildCubaList();
            buildCfg();
            if (typeof toast === 'function') toast('📷 Fotos adicionadas!');
          }
        });
      };
      reader.onerror = function() { pendentes--; if (pendentes === 0) { svCFG(); buildCfg(); } };
      reader.readAsDataURL(file);
    });
  };

  window._cubaSetDestaque = function(tipo, idx, fotoIdx) {
    var lista = tipo === 'coz' ? CFG.coz : CFG.lav;
    var cuba  = lista[idx];
    if (!cuba || !cuba.fotos || !cuba.fotos[fotoIdx]) return;
    var dest = cuba.fotos.splice(fotoIdx, 1)[0];
    cuba.fotos.unshift(dest);
    cuba.photo = dest;
    svCFG();
    buildCubaList();
    buildCfg();
  };

  window._cubaRemFoto = function(tipo, idx, fotoIdx) {
    var lista = tipo === 'coz' ? CFG.coz : CFG.lav;
    var cuba  = lista[idx];
    if (!cuba || !cuba.fotos) return;
    cuba.fotos.splice(fotoIdx, 1);
    cuba.photo = cuba.fotos.length ? cuba.fotos[0] : '';
    svCFG();
    buildCubaList();
    buildCfg();
  };

})();
