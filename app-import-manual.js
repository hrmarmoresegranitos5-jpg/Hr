// ══════════════════════════════════════════════════════════════
// APP-IMPORT-MANUAL.JS  — Importação manual de produtos
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// Alternativa 100% estável ao app-ml-import.js: zero chamadas de
// rede pro Mercado Livre, zero proxy, zero dependência de scraping.
// Você faz upload de prints/fotos do anúncio e a IA (Claude com
// visão, mesma chave configurada em ⚙️ Config → Empresa) lê as
// imagens e preenche título, nome curto, dimensões e descrição
// sozinha — só confirme e ajuste preço/margem antes de salvar.
//
// Fluxo:
//  1. Abre o anúncio no app/site do ML
//  2. Tira prints da tela (título + fotos do produto) ou salva as
//     fotos do produto na galeria
//  3. Faz upload das imagens aqui (várias de uma vez)
//  4. Toca em "🤖 Preencher com IA" — título, nome curto, dimensões
//     e descrição são preenchidos automaticamente (confira antes
//     de salvar; preço só é preenchido se vier visível no print)
//  5. Ajusta margem → preço de venda calculado automaticamente
//  6. Salva — vai pro mesmo catálogo (CFG.coz / CFG.lav) que o
//     importador do ML usa, com a mesma estrutura de dados.
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var MARGEM_PADRAO = 40;

  var _im = {
    cat:        'coz',
    margem:     MARGEM_PADRAO,
    fotos:      [],   // array de dataURLs (base64) — vão pro catálogo
    refs:       [],   // array de dataURLs (base64) — prints só pra IA ler, NÃO vão pro catálogo
    selIdx:     0,     // índice da foto principal selecionada
    iaCarregando: false,
    _fresh:     false, // true logo após abrir o modal — força os campos de texto a começarem vazios (evita herdar dados da cuba anterior)
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

  // ─── Upload de prints de referência (só pra IA ler, não vira foto do catálogo) ─
  function _handleRefs(input) {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;

    var pendentes = files.length;
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        _redimensionar(e.target.result, function(dataUrlFinal) {
          _im.refs.push(dataUrlFinal);
          pendentes--;
          if (pendentes === 0) {
            input.value = '';
            _renderModal();
          }
        });
      };
      reader.onerror = function() {
        console.warn('[Import-Manual] falha ao ler print:', file.name);
        pendentes--;
        if (pendentes === 0) _renderModal();
      };
      reader.readAsDataURL(file);
    });
  }

  function _removerRef(idx) {
    _im.refs.splice(idx, 1);
    _renderModal();
  }

  function _removerFoto(idx) {
    _im.fotos.splice(idx, 1);
    if (_im.selIdx >= _im.fotos.length) _im.selIdx = Math.max(0, _im.fotos.length - 1);
    _renderModal();
  }

  // ─── Preenchimento automático via IA (visão) ────────────────
  // Manda os prints/fotos do produto pra Claude (mesma chave salva
  // em CFG.emp.apiKey usada pelo app-tum-ia.js) e pede de volta um
  // JSON com título, nome curto, dimensões, descrição e preço (se
  // visível na imagem). Zero rede pro Mercado Livre — só processa
  // imagens que o usuário mesmo já capturou, então não depende de
  // proxy/CORS/bloqueio de scraping.
  function _imPromptSistema() {
    return 'Você analisa fotos/prints de anúncios de cubas de cozinha ou banheiro (pias em aço inox, granito, louça etc.) '
      + 'de um catálogo de uma marmoraria. A partir das imagens fornecidas (que podem ser fotos do produto e/ou prints da '
      + 'página de um anúncio de e-commerce), extraia as informações do produto.\n\n'
      + 'Responda APENAS com um objeto JSON válido, sem markdown, sem ```json, sem texto antes ou depois. Formato exato:\n'
      + '{"titulo":"...","nome_curto":"...","marca":"...","dimensoes":"...","descricao":"...","preco":0}\n\n'
      + 'Regras:\n'
      + '- "titulo": título completo e comercial do produto (estilo anúncio), inclua material, modelo, dimensões e ítens inclusos se visíveis.\n'
      + '- "nome_curto": nome curto pra exibir num card de catálogo (máx. 40 caracteres), ex: "Cuba Gourmet Inox 56x34".\n'
      + '- "marca": marca/fabricante do produto (ex: "Tramontina", "Franke", "Deca"), só se estiver explicitamente visível no título, na descrição ou na especificação do print. NUNCA invente ou deduza uma marca — se não estiver escrita em algum lugar visível, deixe "".\n'
      + '- "dimensoes": dimensões no formato "LxAxP" ou similar (ex: "56x34x17cm"), só o que conseguir identificar com confiança. Se não der pra ver, deixe "".\n'
      + '- "descricao": texto estruturado em seções, NUNCA um parágrafo curto e solto. Formato exato (use \\n entre as linhas):\n'
      + '  1) Parágrafo de abertura com 3-4 frases, tom comercial e persuasivo, descrevendo material, acabamento, formato, tipo de instalação e principais diferenciais.\n'
      + '  2) Linha em branco, depois "Características:" e uma linha por item, cada uma começando com "- " (ex: "- Material: Aço inoxidável escovado.", "- Formato: Retangular de embutir.", "- Capacidade: 56 litros."). Inclua o que der pra identificar: material, acabamento/cor, formato, tipo de instalação (embutir/sobrepor/apoio), capacidade/volume.\n'
      + '  3) Se houver dimensões visíveis, linha em branco, depois "Dimensões:" com uma linha "- " por medida (Comprimento, Largura, Profundidade).\n'
      + '  4) Se houver itens/acessórios inclusos visíveis (torneira, válvula, sifão, grelha, tampa etc.), linha em branco, depois "Itens Inclusos:" com uma linha "- " por item.\n'
      + '  Inclua só as seções para as quais há informação visível nas imagens — não invente especificações nem repita a marca (ela já vai no campo separado "marca").\n'
      + '- "preco": valor numérico em reais visível no print (sem R$, sem separador de milhar, use ponto decimal). Se não houver preço visível, use 0.\n'
      + 'Se alguma imagem não ajudar a identificar nada, ignore-a. Se não conseguir extrair nada útil de nenhuma imagem, ainda assim responda com o JSON, com campos vazios/0 onde não souber.';
  }

  // Mostra uma mensagem de status DENTRO do próprio modal (banner fixo
  // acima do botão de IA). Não depende de #toast existir no DOM nem de
  // alert()/confirm() estarem liberados pelo navegador — por isso é o
  // canal principal de erro/sucesso da IA. tipo: 'info' | 'ok' | 'err'.
  function _imStatusIA(msg, tipo) {
    _im.iaMsg     = msg || '';
    _im.iaMsgTipo = tipo || 'info';
    var el = document.getElementById('im-ia-status');
    if (el) {
      el.textContent = _im.iaMsg;
      el.style.display = _im.iaMsg ? 'block' : 'none';
      el.style.color = tipo === 'err' ? '#e07860' : (tipo === 'ok' ? '#7cc088' : 'var(--t3)');
      el.style.borderColor = tipo === 'err' ? '#7a3020' : (tipo === 'ok' ? '#2a5030' : 'var(--bd2)');
    } else {
      // Banner ainda não está no DOM (ex.: erro ocorreu antes do 1º
      // render) — força um re-render pra garantir que ele apareça.
      _renderModal();
    }
  }

  function _imPreencherIA() {
    console.log('[Import-Manual] _imPreencherIA() chamada — versão v2 do arquivo carregada.');
    try {
      if (_im.iaCarregando) return;

      if (!_im.fotos.length && !_im.refs.length) {
        _imStatusIA('⚠️ Selecione pelo menos uma foto do produto ou um print de referência antes de usar a IA.', 'err');
        return;
      }

      var key = (typeof CFG !== 'undefined' && CFG.emp && CFG.emp.apiKey) ? CFG.emp.apiKey : null;
      if (!key) {
        _imStatusIA('🔑 Chave de API não configurada. Vá em ⚙️ Config → Empresa e adicione sua chave Groq (gsk_...) ou Anthropic (sk-ant-...).', 'err');
        return;
      }

      // Suporta tanto Groq (gratuita, usada no resto do app) quanto
      // Anthropic — detecta pelo prefixo da chave já salva em
      // CFG.emp.apiKey e monta a requisição no formato certo pra cada uma.
      var ehAnthropic = key.indexOf('sk-ant-') === 0;
      var LIMITE_IMGS = ehAnthropic ? 6 : 5; // Groq: máx. 5 imagens por requisição

      // Limita o total de imagens enviadas pra não estourar payload/custo.
      // Prioriza os prints de referência (geralmente têm título/descrição/
      // especificações em texto, mais úteis pra extrair dados) e completa
      // com as fotos do produto (foto destaque primeiro).
      var fotosEscolhidas = [];
      if (_im.fotos.length) {
        var ordemFotos = [_im.selIdx].concat(_im.fotos.map(function(_, i) { return i; }).filter(function(i) { return i !== _im.selIdx; }));
        fotosEscolhidas = ordemFotos.map(function(i) { return _im.fotos[i]; }).filter(Boolean);
      }
      var refsEscolhidas = _im.refs.slice();
      var escolhidas = refsEscolhidas.concat(fotosEscolhidas).slice(0, LIMITE_IMGS);

      if (!escolhidas.length) {
        _imStatusIA('⚠️ Nenhuma imagem válida pra analisar.', 'err');
        return;
      }

      var url, headers, body;

      if (ehAnthropic) {
        var contentAnthropic = escolhidas.map(function(dataUrl) {
          var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
          return {
            type: 'image',
            source: { type: 'base64', media_type: m ? m[1] : 'image/jpeg', data: m ? m[2] : (dataUrl || '') }
          };
        });
        contentAnthropic.push({ type: 'text', text: 'Analise as imagens acima e responda com o JSON do produto, conforme as instruções.' });

        url = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        };
        body = JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: _imPromptSistema(),
          messages: [{ role: 'user', content: contentAnthropic }]
        });
      } else {
        // Groq — gratuita, modelo com visão (formato compatível OpenAI).
        var contentGroq = escolhidas.map(function(dataUrl) {
          return { type: 'image_url', image_url: { url: dataUrl } };
        });
        contentGroq.unshift({ type: 'text', text: 'Analise as imagens acima e responda com o JSON do produto, conforme as instruções.' });

        url = 'https://api.groq.com/openai/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        };
        body = JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            { role: 'system', content: _imPromptSistema() },
            { role: 'user', content: contentGroq }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });
      }

      _im.iaCarregando = true;
      _imStatusIA('⏳ Consultando a IA…', 'info');
      _renderModal();

      fetch(url, { method: 'POST', headers: headers, body: body })
        .then(function(r) {
          return r.json().catch(function() {
            throw new Error('resposta inválida da API (HTTP ' + r.status + ')');
          });
        })
        .then(function(data) {
          if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
          var texto = ehAnthropic
            ? ((data.content && data.content[0] && data.content[0].text) || '')
            : ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '');
          var limpo = texto.replace(/```json|```/g, '').trim();
          var json;
          try { json = JSON.parse(limpo); }
          catch (e) { throw new Error('a IA não devolveu um JSON válido: ' + limpo.slice(0, 120)); }

          _im.iaCarregando = false;

          var elTitulo = document.getElementById('im-titulo');
          var elNome   = document.getElementById('im-nome');
          var elMarca  = document.getElementById('im-marca');
          var elDim    = document.getElementById('im-dim');
          var elDesc   = document.getElementById('im-desc');
          var elCusto  = document.getElementById('im-custo');

          if (elTitulo && json.titulo)     elTitulo.value = json.titulo;
          if (elNome   && json.nome_curto) elNome.value   = json.nome_curto;
          if (elMarca  && json.marca)      elMarca.value  = json.marca;
          if (elDim    && json.dimensoes)  elDim.value    = json.dimensoes;
          if (elDesc   && json.descricao)  elDesc.value   = json.descricao;
          if (elCusto  && !elCusto.value && json.preco)   elCusto.value = String(json.preco).replace('.', ',');

          _renderModal();
          _recalcular();
          _imStatusIA('🤖 Campos preenchidos pela IA! Confira antes de salvar.', 'ok');
          if (typeof toast === 'function') { try { toast('🤖 Campos preenchidos pela IA!'); } catch (e) {} }
        })
        .catch(function(e) {
          _im.iaCarregando = false;
          console.error('[Import-Manual] IA falhou:', e);
          _imStatusIA('❌ Não consegui preencher automaticamente: ' + (e && e.message ? e.message : e), 'err');
          _renderModal();
        });
    } catch (eSync) {
      // Rede de segurança final: qualquer erro síncrono inesperado
      // (ex.: elemento não encontrado) cai aqui em vez de morrer
      // silenciosamente sem feedback nenhum pro usuário.
      _im.iaCarregando = false;
      console.error('[Import-Manual] erro síncrono em _imPreencherIA:', eSync);
      _imStatusIA('❌ Erro inesperado: ' + (eSync && eSync.message ? eSync.message : eSync), 'err');
      _renderModal();
    }
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
    _im.margem = MARGEM_PADRAO;
    _im.fotos  = [];
    _im.refs   = [];
    _im.selIdx = 0;
    _im._fresh = true; // próximo _renderModal() não deve herdar valores da cuba anterior
    _im.iaMsg     = '';
    _im.iaMsgTipo = 'info';

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

    // Preserva valores digitados antes de re-renderizar (upload de foto re-renderiza).
    // Exceção: logo após abrir o modal (_fresh), os inputs em tela ainda são os da
    // cuba anterior (o box do modal é reaproveitado, só escondido) — nesse caso os
    // campos DEVEM começar vazios, senão a cuba nova herda título/nome/marca/etc.
    // da última cuba salva.
    var prevTitulo, prevNome, prevMarca, prevDim, prevCusto, prevDesc;
    if (_im._fresh) {
      prevTitulo = prevNome = prevMarca = prevDim = prevCusto = prevDesc = '';
      _im._fresh = false;
    } else {
      prevTitulo = (document.getElementById('im-titulo') || {}).value || '';
      prevNome   = (document.getElementById('im-nome')   || {}).value || '';
      prevMarca  = (document.getElementById('im-marca')  || {}).value || '';
      prevDim    = (document.getElementById('im-dim')    || {}).value || '';
      prevCusto  = (document.getElementById('im-custo')  || {}).value || '';
      prevDesc   = (document.getElementById('im-desc')   || {}).value || '';
    }

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

    // ─── Upload de fotos do produto (essas vão pro catálogo) ──
    h += '<div style="font-size:.6rem;color:var(--gold3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;">Fotos do produto <span style="color:var(--t4);text-transform:none;letter-spacing:0;">(aparecem pro cliente no catálogo)</span></div>';
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
      h += '<div style="font-size:.55rem;color:var(--t4);margin-bottom:14px;">★ = foto destaque no catálogo. Toque na foto para marcar como destaque.</div>';
    } else {
      h += '<div style="text-align:center;padding:16px 0;color:var(--t3);font-size:.72rem;margin-bottom:14px;opacity:.7;">Nenhuma foto selecionada ainda</div>';
    }

    // ─── Upload de prints de referência (só pra IA ler — NÃO vão pro catálogo) ─
    h += '<div style="font-size:.6rem;color:var(--gold3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;">Prints de referência <span style="color:var(--t4);text-transform:none;letter-spacing:0;">(opcional — só pra IA ler, não aparecem no catálogo)</span></div>';
    h += '<label style="display:block;width:100%;padding:13px;border-radius:10px;border:1px dashed var(--bd2);background:var(--s3);color:var(--t2);font-size:.85rem;font-weight:700;text-align:center;cursor:pointer;margin-bottom:10px;box-sizing:border-box;">📝 Selecionar prints do anúncio (título, descrição, especificações)<input type="file" accept="image/*" multiple onchange="_imHandleRefs(this)" style="display:none;"></label>';

    if (_im.refs.length) {
      h += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:6px;padding-bottom:4px;">';
      _im.refs.forEach(function(ref, i) {
        h += '<div style="position:relative;flex-shrink:0;">';
        h += '<img src="' + ref + '" style="width:62px;height:62px;object-fit:cover;border-radius:8px;border:1px solid var(--bd2);box-sizing:border-box;display:block;">';
        h += '<button onclick="_imRemoverRef(' + i + ')" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#c0392b;color:#fff;border:none;font-size:.65rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
        h += '</div>';
      });
      h += '</div>';
      h += '<div style="font-size:.55rem;color:var(--t4);margin-bottom:6px;">Esses prints só ajudam a IA a preencher os campos — não viram foto do produto.</div>';
    }

    // ─── Botão de preenchimento por IA (aparece com qualquer imagem carregada) ─
    if (_im.fotos.length || _im.refs.length) {
      if (_im.iaCarregando) {
        h += '<button disabled style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--gold3);background:var(--s3);color:var(--t3);font-size:.8rem;font-weight:700;margin-top:8px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:7px;">⏳ Analisando com IA…</button>';
      } else {
        h += '<button onclick="_imPreencherIA()" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--gold3);background:linear-gradient(135deg,rgba(160,120,40,.18),rgba(201,168,76,.1));color:var(--gold2);font-size:.8rem;font-weight:700;cursor:pointer;margin-top:8px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:7px;">🤖 Preencher título, dimensões e descrição com IA (v2)</button>';
      }
      // Banner de status — canal principal de feedback (erro/sucesso), não
      // depende de #toast nem de alert() pra ser visível.
      h += '<div id="im-ia-status" style="display:' + (_im.iaMsg ? 'block' : 'none') + ';font-size:.68rem;font-weight:600;line-height:1.4;padding:8px 10px;border-radius:8px;border:1px solid ' + (_im.iaMsgTipo === 'err' ? '#7a3020' : (_im.iaMsgTipo === 'ok' ? '#2a5030' : 'var(--bd2)')) + ';color:' + (_im.iaMsgTipo === 'err' ? '#e07860' : (_im.iaMsgTipo === 'ok' ? '#7cc088' : 'var(--t3)')) + ';margin-bottom:8px;">' + _esc(_im.iaMsg || '') + '</div>';
      h += '<div style="font-size:.55rem;color:var(--t4);margin-bottom:14px;">Sempre confira o que a IA preencheu antes de salvar.</div>';
    }

    // ─── Nome curto ───────────────────────────────────────────
    h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Nome curto <span style="color:var(--t4);">(exibido no card do catálogo)</span></div>';
    h += '<input id="im-nome" type="text" value="' + _esc(prevNome) + '" placeholder="ex: Cuba Gourmet Inox 56x34" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;padding:9px 11px;color:var(--tx);font-size:.8rem;font-weight:600;box-sizing:border-box;outline:none;margin-bottom:10px;">';

    h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Marca</div>';
    h += '<input id="im-marca" type="text" value="' + _esc(prevMarca) + '" placeholder="ex: Tramontina, Franke, Deca..." style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;padding:9px 11px;color:var(--tx);font-size:.8rem;box-sizing:border-box;outline:none;margin-bottom:10px;">';

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

    h += '<button onclick="_imSalvar()" style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,#a07828,var(--gold2));color:#0f0c00;font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;">✓ Salvar produto</button>';

    wrap.innerHTML = h;
  }

  // ─── Salvar ─────────────────────────────────────────────────
  function _salvar() {
    var elTitulo = document.getElementById('im-titulo');
    var elNome   = document.getElementById('im-nome');
    var elMarca  = document.getElementById('im-marca');
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

    var titulo = (elTitulo && elTitulo.value.trim()) || nome;
    var marca  = (elMarca  && elMarca.value.trim())  || '';
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
      brand:   marca,
      dim:     dim,
      desc:    desc,
      pr:      Math.round(venda),
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

    var lista = cat === 'coz' ? CFG.coz : CFG.lav;
    lista.push(novaCuba);

    if (typeof svCFG         === 'function') svCFG();
    if (typeof buildCubaList === 'function') buildCubaList();
    if (typeof buildCfg      === 'function') buildCfg();
    if (typeof toast         === 'function') toast('✅ Produto salvo manualmente!');

    _fecharModal();
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
  window._imHandleRefs     = _handleRefs;
  window._imRemoverRef     = _removerRef;
  window._imSelecionarFoto = _selecionarFoto;
  window._imRecalcular     = _recalcular;
  window._imPreencherIA    = _imPreencherIA;
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
