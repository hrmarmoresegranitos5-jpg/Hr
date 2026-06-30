// ══════════════════════════════════════════════════════════════
// APP-ML-IMPORT.JS  — Importador do Mercado Livre
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// Estratégia de busca (cascata, com log detalhado no console):
//  1. Proxy próprio (Cloudflare Worker hr-ml-proxy) — primeira opção,
//     mais estável por não depender de serviços públicos de terceiros.
//  2. allorigins.win  (proxy 1)
//  3. corsproxy.io    (proxy 2 — hoje só funciona de localhost/GitHub.io/etc)
//  4. thingproxy      (proxy 3)
//
// ⚠️ HISTÓRICO DE TENTATIVAS:
//  - CodeTabs:  desativado pelo próprio serviço por abuso de terceiros.
//  - cors.x2u.in: hoje exige email + API key cadastrados (não dá pra
//    usar sem cadastro prévio — por isso foi removido daqui).
//  - killcors.com: serviço não existe mais (confirmado fora do ar).
//  Removidos da lista para não desperdiçar tempo de timeout com eles.
//  - 30/06/2026: adicionado proxy próprio via Cloudflare Worker
//    (hr-ml-proxy.hrproplay.workers.dev) como primeira tentativa,
//    pois os proxies públicos vinham falhando com frequência.
//    Os proxies públicos seguem como fallback de segurança.
//
// Suporte a links de item direto (MLB...), catálogo (/p/MLB...) e
// links curtos de compartilhamento (mercadolivre.com/sec/...).
//
// DIAGNÓSTICO: abra o DevTools (console) ao testar — cada falha de
// rede agora imprime [ML-import] com a causa real, em vez de só
// mostrar "scraping falhou" para o usuário.
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var ML = 'https://api.mercadolibre.com';

  // Proxy próprio (Cloudflare Worker) — tentado ANTES dos públicos,
  // por ser mais estável e não depender de serviços de terceiros.
  var WORKER_PROXY = 'https://hr-ml-proxy.hrproplay.workers.dev/';

  // Lista de proxies CORS, em ordem de tentativa. Cada um recebe a
  // URL alvo já com encodeURIComponent aplicado pelo chamador.
  var PROXIES = [
    function(u) { return WORKER_PROXY + '?url=' + encodeURIComponent(u); },
    function(u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
    function(u) { return 'https://corsproxy.io/?url=' + encodeURIComponent(u); },
    function(u) { return 'https://thingproxy.freeboard.io/fetch/' + u; },
  ];

  // ─── Estado ────────────────────────────────────────────────
  var _ml = {
    loading:    false,
    loadingMsg: '',
    data:       null,
    selPhoto:   null,
    margem:     30,
    cat:        'coz',
    urlAtual:   '',
  };

  // ─── Utilitários ───────────────────────────────────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function _fmt(n) {
    return 'R$\u00a0' + Number(n).toLocaleString('pt-BR',
      {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  // ─── Extrai ID do ML de qualquer link ──────────────────────
  function _extractId(raw) {
    var full = (raw || '').trim(); // URL completa, com fragmento (#...)
    var url  = full;
    var h    = full.indexOf('#');
    if (h !== -1) url = full.substring(0, h);
    url = url.trim();

    var m;

    // wid= aparece APÓS o # em links de compartilhamento do ML —
    // deve ser buscado na URL completa (antes de cortar o fragmento)
    m = full.match(/[?&#]wid=(MLB\d+)/i);
    if (m) return { id: m[1].toUpperCase(), isCatalog: false };

    // item_id dentro de pdp_filters (também pode vir antes do #)
    m = full.match(/item_id:(MLB\d+)/i);
    if (m) return { id: m[1].toUpperCase(), isCatalog: false };

    // /p/MLBxxxxxxx = catálogo
    m = url.match(/\/p\/(MLB\d+)/i);
    if (m) return { id: m[1].toUpperCase(), isCatalog: true };

    // MLB-XXXXXXXX hifenizado na URL
    m = url.match(/MLB-(\d{7,})/i);
    if (m) return { id: 'MLB' + m[1], isCatalog: false };

    // MLBXXXXXXXX sem hífen
    m = url.match(/MLB(\d{7,})/i);
    if (m) return { id: 'MLB' + m[1], isCatalog: false };

    // Digitado diretamente como MLB...
    m = url.match(/^(MLB[\d-]+)$/i);
    if (m) return { id: m[1].replace(/-/g,'').toUpperCase(), isCatalog: false };

    return null;
  }

  // ─── Detecta link curto/de compartilhamento sem MLB visível ─
  // Ex: mercadolivre.com/sec/XXXXX, mercadolivre.com/social/...,
  // ou qualquer link do domínio ML que não bateu em nenhum padrão acima.
  function _isLinkCurtoML(raw) {
    var url = (raw || '').trim();
    if (!url) return false;
    if (/MLB\d{7,}/i.test(url)) return false; // já tem MLB explícito, não precisa resolver
    return /mercadolivre\.com|mercadolibre\.com|mercadoli\.\w+|\/sec\//i.test(url);
  }

  // Segue o link curto via proxy (que segue redirects por padrão) e
  // extrai a URL final pelo header/HTML, de onde então extraímos o MLB.
  function _resolverLinkCurto(raw) {
    var url = (raw || '').trim();
    console.info('[ML-import] link sem MLB visível, tentando resolver redirecionamento:', url);
    return _fetchComProxies(url, false).then(function(html) {
      // Procura primeiro um MLB em qualquer formato dentro do HTML resultante
      var m = html.match(/MLB-?\d{8,}/);
      if (m) {
        var id = m[0].replace('-', '').toUpperCase();
        var isCatalog = /\/p\/MLB/i.test(html) && html.indexOf('/p/' + id) !== -1;
        console.info('[ML-import] link curto resolvido →', id);
        return { id: id, isCatalog: isCatalog };
      }
      // Procura uma URL canônica completa (<link rel="canonical"> ou og:url)
      var canon = html.match(/(?:rel=["']canonical["'][^>]*href|property=["']og:url["'][^>]*content)=["']([^"']+)["']/i);
      if (canon) {
        var info = _extractId(canon[1]);
        if (info) {
          console.info('[ML-import] link curto resolvido via canonical →', info.id);
          return info;
        }
      }
      throw new Error('link curto não revelou um MLB (' + html.length + ' chars recebidos)');
    });
  }

  // ─── Fetch único com timeout ────────────────────────────────
  // Sempre lê como texto e faz o parse manualmente quando asJson=true.
  // Isso evita falhas quando um proxy devolve Content-Type errado
  // (ex.: text/html para um corpo que na verdade é JSON válido).
  function _fetchOnce(url, ms, asJson) {
    ms = ms == null ? 7000 : ms;
    return new Promise(function(resolve, reject) {
      var done  = false;
      var timer = setTimeout(function() {
        if (!done) { done = true; reject(new Error('timeout (' + ms + 'ms)')); }
      }, ms);
      fetch(url, { method:'GET', mode:'cors', credentials:'omit',
                   headers:{ 'Accept':'application/json' } })
        .then(function(r) {
          if (done) return null;
          if (!r.ok) { clearTimeout(timer); done = true; reject(new Error('HTTP ' + r.status)); return null; }
          return r.text();
        })
        .then(function(text) {
          if (done || text == null) return;
          clearTimeout(timer);
          done = true;
          if (!asJson) { resolve(text); return; }
          try {
            resolve(JSON.parse(text));
          } catch (e) {
            reject(new Error('resposta não é JSON válido (' + text.slice(0, 60).replace(/\s+/g,' ') + '…)'));
          }
        })
        .catch(function(e) {
          clearTimeout(timer);
          if (!done) { done = true; reject(e); }
        });
    });
  }

  // Tenta uma URL direta e, se falhar, cada proxy da lista em sequência.
  // Loga cada tentativa e o motivo da falha no console para diagnóstico.
  function _fetchComProxies(targetUrl, asJson) {
    var tentativas = [{ label: 'direto', url: targetUrl }]
      .concat(PROXIES.map(function(fn, i) {
        return { label: 'proxy' + (i + 1), url: fn(targetUrl) };
      }))
      .concat([{ label: 'jina', url: 'https://r.jina.ai/' + targetUrl }]);

    function tentar(i) {
      if (i >= tentativas.length) {
        console.error('[ML-import] todas as tentativas falharam para', targetUrl);
        return Promise.reject(new Error('Não foi possível acessar "' + targetUrl + '" (direto + ' + (tentativas.length - 1) + ' proxies falharam — veja o console para detalhes)'));
      }
      var t = tentativas[i];
      return _fetchOnce(t.url, 9000, asJson)
        .then(function(data) {
          // allorigins /raw já devolve o corpo puro; mas se vier um
          // wrapper { contents: "..." } (variante /get), desembrulha.
          if (asJson && data && typeof data.contents === 'string') {
            try { data = JSON.parse(data.contents); } catch (e) { /* não era JSON, mantém string fora do caminho normal */ }
          }
          console.info('[ML-import] OK via', t.label, '→', targetUrl);
          return data;
        })
        .catch(function(e) {
          console.warn('[ML-import] falhou via', t.label, '(' + targetUrl + '):', e.message || e);
          return tentar(i + 1);
        });
    }

    return tentar(0);
  }

  // ─── Busca um endpoint da API do ML, com cascata de proxies ─
  function _get(path) {
    return _fetchComProxies(ML + path, true);
  }

  // ─── Busca item por ID ─────────────────────────────────────
  function _getItem(id) {
    return _get('/items/' + id).then(function(d) {
      if (!d || !d.title) throw new Error('resposta sem título (item inexistente, pausado ou removido)');
      return d;
    });
  }

  // ─── Resolve catálogo → item real ──────────────────────────
  function _resolveCatalog(catalogId) {
    // Rota 1: search por catalog_product_id
    return _get('/sites/MLB/search?catalog_product_id=' + catalogId + '&limit=3')
      .then(function(d) {
        var id = d && d.results && d.results[0] && d.results[0].id;
        if (id) return id;
        throw new Error('busca por catalog_product_id veio vazia');
      })
      .catch(function(e1) {
        console.warn('[ML-import] catálogo rota 1 (search) falhou:', e1.message || e1);
        // Rota 2: /products/{catalogId} → buy_box_winner.item_id
        return _get('/products/' + catalogId).then(function(d) {
          var id = (d && d.buy_box_winner && d.buy_box_winner.item_id) ||
                   (d && d.items && d.items[0] && d.items[0].id);
          if (id) return id;
          throw new Error('/products/{id} sem buy_box_winner (provável bloqueio sem token)');
        });
      })
      .catch(function(e2) {
        console.warn('[ML-import] catálogo rota 2 (/products) falhou:', e2.message || e2);
        // Rota 3: /products/{catalogId}/items → lista de itens concorrentes
        return _get('/products/' + catalogId + '/items').then(function(d) {
          var lista = Array.isArray(d) ? d : (d && d.results) || [];
          var id = lista[0] && (lista[0].item_id || lista[0].id);
          if (id) return id;
          throw new Error('/products/{id}/items veio vazio');
        });
      })
      .catch(function(e3) {
        console.warn('[ML-import] catálogo rota 3 (/products/items) falhou:', e3.message || e3);
        // Rota 4: scraping HTML da página do catálogo (último recurso)
        return _scrapeCatalogPage(catalogId);
      });
  }

  // ─── Scraping HTML como último recurso ─────────────────────
  function _scrapeCatalogPage(catalogId) {
    var pageUrl = 'https://www.mercadolivre.com.br/p/' + catalogId;
    return _fetchComProxies(pageUrl, false).then(function(html) {
      var uniq = [];
      function coletar(regex) {
        var matches = html.match(regex) || [];
        matches.forEach(function(x) {
          var up = x.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          var m  = up.match(/MLB\d{8,}/);
          if (m) { up = m[0]; }
          if (up !== catalogId && up.indexOf('MLB') === 0 && uniq.indexOf(up) === -1) uniq.push(up);
        });
      }
      // 1. Padrão direto MLB seguido de dígitos (HTML puro)
      coletar(/MLB-?\d{8,}/g);
      // 2. Dentro de blocos JSON embutidos (__PRELOADED_STATE__, JSON-LD etc),
      //    onde o item costuma vir como "item_id":"MLBxxxxxxxx" ou "id":"MLBxxxxxxxx"
      coletar(/"(?:item_id|id)"\s*:\s*"(MLB\d{8,})"/g);
      if (uniq.length) return uniq[0];
      console.error('[ML-import] HTML do catálogo veio (' + html.length + ' chars), mas nenhum MLB diferente do catálogo foi encontrado — a página provavelmente monta o item via JS depois do carregamento');
      throw new Error('página do catálogo não revelou o item vinculado (conteúdo dinâmico via JS)');
    });
  }

  // ─── Busca descrição (não crítico, falha silenciosa) ───────
  function _getDesc(id) {
    return _get('/items/' + id + '/description')
      .then(function(d) { return (d && d.plain_text) || ''; })
      .catch(function(e) {
        console.warn('[ML-import] descrição indisponível (não bloqueia):', e.message || e);
        return '';
      });
  }

  // ─── Orquestrador principal ─────────────────────────────────
  function _buscar(rawUrl) {
    var info = _extractId(rawUrl);

    if (!info) {
      if (_isLinkCurtoML(rawUrl)) {
        _ml.loading  = true;
        _ml.data     = null;
        _ml.selPhoto = null;
        _renderModal();
        _showStatus('⏳ Resolvendo link de compartilhamento…', 'info');
        _resolverLinkCurto(rawUrl)
          .then(function(infoResolvido) {
            _buscarComInfo(rawUrl, infoResolvido);
          })
          .catch(function(e) {
            _ml.loading = false;
            _renderModal();
            console.error('[ML-import] não foi possível resolver o link curto:', e.message || e);
            _showStatus('❌ Não consegui identificar o produto a partir desse link. Abra o anúncio no navegador, copie a URL completa da barra de endereço (ou o código MLB) e cole aqui.', 'error');
          });
        return;
      }
      _showStatus('⚠️ Link inválido. Cole a URL do produto ou o código MLB…', 'warn');
      return;
    }

    _buscarComInfo(rawUrl, info);
  }

  function _buscarComInfo(rawUrl, info) {
    console.info('[ML-import] iniciando busca:', rawUrl, '→', info);

    _ml.loading  = true;
    _ml.data     = null;
    _ml.selPhoto = null;
    _renderModal();
    _showStatus('⏳ Buscando produto na API do ML…', 'info');

    var promise;

    if (info.isCatalog) {
      // Atalho: se a URL ja contem o item real (pdp_filters=item_id:MLB... ou wid=MLB...)
      // usamos direto sem precisar resolver catalogo via proxy
      var mItem = rawUrl.match(/item_id:(MLB\d+)/i) || rawUrl.match(/[?&#]wid=(MLB\d+)/i);
      var itemDireto = mItem ? mItem[1].toUpperCase() : null;

      if (itemDireto) {
        console.info('[ML-import] item_id extraido da URL, pulando catalogo:', itemDireto);
        _showStatus('⏳ Item encontrado na URL, buscando produto…', 'info');
        promise = _getItem(itemDireto);
      } else {
        _showStatus('⏳ Resolvendo catálogo ' + info.id + '…', 'info');
        promise = _resolveCatalog(info.id).then(function(itemId) {
          _showStatus('⏳ Catálogo resolvido → ' + itemId + ', buscando item…', 'info');
          return _getItem(itemId);
        });
      }
    } else {
      promise = _getItem(info.id)
        .catch(function(eDireto) {
          console.warn('[ML-import] item direto falhou na 1ª passada:', eDireto.message || eDireto);
          _showStatus('⏳ Tentativa 1 falhou, tentando de novo (rede lenta)…', 'info');
          return _getItem(info.id);
        })
        .catch(function(eDireto2) {
          console.warn('[ML-import] item direto falhou na 2ª passada:', eDireto2.message || eDireto2);
          // O id que temos (wid=/item_id=/MLB da URL) pode não ser um
          // anúncio vendável de verdade — alguns links do ML trazem o
          // id da VARIAÇÃO do catálogo, que não existe em /items/.
          // Se a URL também tiver um /p/MLBxxxx (id do catálogo em si),
          // tenta resolver esse catálogo pra achar um anúncio real.
          var catalogM = rawUrl.match(/\/p\/(MLB\d+)/i);
          if (catalogM && catalogM[1].toUpperCase() !== info.id) {
            _showStatus('⏳ "' + info.id + '" não é um anúncio direto, resolvendo catálogo…', 'info');
            return _resolveCatalog(catalogM[1].toUpperCase()).then(function(itemId) {
              _showStatus('⏳ Catálogo resolvido → ' + itemId + ', buscando item…', 'info');
              return _getItem(itemId);
            });
          }
          throw eDireto2;
        });
    }

    promise
      .then(function(item) {
        _showStatus('⏳ Buscando descrição…', 'info');
        return _getDesc(item.id).then(function(desc) {
          item._desc = desc;
          return item;
        });
      })
      .then(function(item) {
        _ml.data     = item;
        _ml.selPhoto = _bestPhoto(item);
        _ml.loading  = false;
        _renderModal();
        _showStatus('✅ Produto encontrado!', 'ok');
      })
      .catch(function(e) {
        _ml.loading = false;
        _renderModal();
        var msg = (e && e.message) || 'Erro desconhecido';
        console.error('[ML-import] busca falhou definitivamente:', msg);
        if (msg.indexOf('catalog_product_id') !== -1 || msg.indexOf('buy_box_winner') !== -1 ||
            msg.indexOf('/items veio vazio') !== -1 || msg.indexOf('não revelou o item') !== -1) {
          msg = 'Não encontrei nenhum anúncio ativo vinculado a esse produto do catálogo (pode estar sem vendedor no momento, ou o produto saiu de linha). Tente abrir o anúncio específico (não a página de catálogo "Comprar") e copiar esse link.';
        } else if (msg.indexOf('sem título') !== -1 || msg.indexOf('título') !== -1) {
          msg = 'Anúncio não encontrado (pausado, removido, ou o ID do link não é um anúncio vendável).';
        } else if (msg.indexOf('falharam') !== -1) {
          msg = 'Não consegui acessar o Mercado Livre agora (rede/proxy bloqueado). Tente de novo em alguns segundos.';
        }
        _showStatus('❌ ' + msg, 'error');
      });
  }

  // ─── Caminho alternativo: extração via IA (Groq) ─────────────
  // Não depende da API/catálogo do ML. Pega o conteúdo já renderizado
  // da página (r.jina.ai executa o JS) + as URLs de imagem do HTML
  // bruto, e pede pra IA estruturar título/preço/marca/dimensões.
  // Usa a mesma API Key Groq já configurada em Config → Inteligência
  // Artificial (CFG.emp.apiKey), formato OpenAI-compatible (gsk_...).
  function _getApiKey() {
    return (typeof CFG !== 'undefined' && CFG.emp && CFG.emp.apiKey) ? CFG.emp.apiKey.trim() : '';
  }

  function _extrairImagensDoHtml(html) {
    var urls = [];
    var re = /https?:\/\/[^\s"'\\]+?\.mlstatic\.com\/[^\s"'\\)]+?\.(?:jpg|jpeg|png|webp)/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      // normaliza pra versão grande quando possível (-O.jpg / -F.jpg = full/orig)
      var u = m[0].replace(/-[A-Z]\.(jpg|jpeg|png|webp)$/i, '-O.$1');
      if (urls.indexOf(u) === -1) urls.push(u);
    }
    return urls.slice(0, 8);
  }

  function _buscarComIA(rawUrl) {
    var key = _getApiKey();
    if (!key) {
      _showStatus('⚠️ Configure a API Key Groq (Config → Inteligência Artificial) pra usar a busca por IA.', 'warn');
      return;
    }

    _ml.loading  = true;
    _ml.data     = null;
    _ml.selPhoto = null;
    _renderModal();
    _showStatus('🤖 Lendo a página do anúncio…', 'info');

    var pageUrl = rawUrl.split('#')[0].trim();

    // Busca em paralelo: texto renderizado (jina, prioritário) e HTML
    // bruto (pra extrair URLs de imagem por regex).
    var pTexto = _fetchOnce('https://r.jina.ai/' + pageUrl, 12000, false)
      .catch(function() { return _fetchComProxies(pageUrl, false); });
    var pHtml = _fetchComProxies(pageUrl, false).catch(function() { return ''; });

    Promise.all([pTexto, pHtml])
      .then(function(res) {
        var texto = (res[0] || '').slice(0, 14000);
        var html  = res[1] || '';
        if (!texto) throw new Error('não consegui ler o conteúdo da página');

        var imagens = _extrairImagensDoHtml(html);
        if (!imagens.length) imagens = _extrairImagensDoHtml(texto);

        _showStatus('🤖 IA analisando título, preço e descrição…', 'info');

        var sys = 'Você extrai dados de uma página de produto do Mercado Livre (cuba/pia de cozinha '
          + 'ou banheiro). Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, '
          + 'no formato exato: {"title":"...","price":0,"brand":"...","dim":"...","description":"...",'
          + '"material":"Inox|Louça|Pedra"}. '
          + 'title = nome do produto (limpo, sem emojis/promoção). price = preço atual em reais, '
          + 'número puro (ex: 271.00, sem "R$" e sem separador de milhar, use ponto decimal). '
          + 'brand = marca/fabricante se houver, senão "". dim = dimensões no formato '
          + '"LARGURAxPROFUNDIDADExALTURAcm" ou o que estiver disponível, senão "". '
          + 'description = 1 a 2 frases descrevendo o produto. material = Inox, Louça ou Pedra '
          + '(chute o mais provável pelo texto). Se não achar o preço, use 0.';

        return fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 600,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: 'Conteúdo da página:\n\n' + texto }
            ]
          })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
          var txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
          var jm  = txt.match(/\{[\s\S]*\}/);
          if (!jm) throw new Error('IA não devolveu JSON válido');
          var info;
          try { info = JSON.parse(jm[0]); } catch (e) { throw new Error('JSON da IA inválido: ' + e.message); }
          if (!info.title) throw new Error('IA não conseguiu identificar o título do produto');
          return { info: info, imagens: imagens };
        });
      })
      .then(function(r) {
        var info = r.info;
        var item = {
          id:         'ia_' + Date.now(),
          title:      info.title || '',
          price:      Number(info.price) || 0,
          pictures:   r.imagens.map(function(u) { return { url: u, size: 'O' }; }),
          attributes: info.brand ? [{ id: 'BRAND', name: 'Marca', value_name: info.brand }] : [],
          permalink:  pageUrl,
          _desc:      info.description || '',
          _dimIA:     info.dim || '',
          _matIA:     info.material || '',
          _ia:        true,
        };
        _ml.data     = item;
        _ml.selPhoto = _bestPhoto(item);
        _ml.loading  = false;
        _renderModal();
        _showStatus('✅ Produto extraído por IA! Confira os dados antes de salvar.', 'ok');
      })
      .catch(function(e) {
        _ml.loading = false;
        _renderModal();
        console.error('[ML-import-IA] falhou:', e.message || e);
        _showStatus('❌ IA não conseguiu extrair os dados: ' + ((e && e.message) || e), 'error');
      });
  }


  function _bestPhoto(item) {
    var pics = item.pictures || [];
    if (!pics.length) return null;
    var best = pics[0];
    pics.forEach(function(p) {
      if ((p.size || '').indexOf('O') !== -1) best = p;
    });
    return best.url || best.secure_url || null;
  }

  function _allPhotos(item) {
    return (item.pictures || []).map(function(p) {
      return p.url || p.secure_url || '';
    }).filter(Boolean).slice(0, 8);
  }

  function _inferDim(item) {
    if (item._dimIA) return item._dimIA;
    var atrs = item.attributes || [];
    var dims = [];
    atrs.forEach(function(a) {
      var id = (a.id || '').toLowerCase();
      if (id.indexOf('length')       !== -1 || id.indexOf('width')      !== -1 ||
          id.indexOf('height')       !== -1 || id.indexOf('comprimento') !== -1 ||
          id.indexOf('largura')      !== -1 || id.indexOf('altura')      !== -1 ||
          id.indexOf('profundidade') !== -1) {
        var v = a.value_name || '';
        if (v) dims.push(v);
      }
    });
    if (dims.length >= 2) return dims.slice(0, 3).join(' × ');
    var m = (item.title || '').match(/(\d{2,3})\s*[xX×]\s*(\d{2,3})/);
    if (m) return m[1] + '×' + m[2] + 'cm';
    return '';
  }

  function _inferFeatures(item) {
    var skip = ['ITEM_CONDITION','GTIN','BRAND','EAN','MODEL','COLOR'];
    return (item.attributes || [])
      .filter(function(a) { return skip.indexOf(a.id) < 0 && a.value_name && a.name; })
      .map(function(a) { return a.name + ': ' + a.value_name; })
      .slice(0, 6);
  }

  function _inferBadge(item) {
    if (item.health && item.health > 0.85) return '⭐ Destaque ML';
    if ((item.sold_quantity || 0) > 500)   return '🔥 Mais Vendido';
    return '';
  }

  function _inferTipoMat(item) {
    if (item._matIA) return item._matIA;
    var txt = ((item.title || '') + ' ' + (item._desc || '')).toLowerCase();
    if (txt.indexOf('louça') !== -1 || txt.indexOf('cerâmica') !== -1 ||
        txt.indexOf('porcelana') !== -1) return 'Louça';
    if (txt.indexOf('granito') !== -1 || txt.indexOf('mármore') !== -1) return 'Pedra';
    if (txt.indexOf('inox') !== -1 || txt.indexOf('aço') !== -1) return 'Inox';
    return 'Inox';
  }

  function _precoVenda(custo, margem) { return custo * (1 + margem / 100); }

  // ─── Download foto base64 (com fallback de proxy de imagem) ─
  function _downloadFotoB64(url, cb) {
    if (!url) { cb(null); return; }
    var tentativas = 0;
    var maxTentativas = 3;

    function tentarCarregar(src, viaProxy) {
      tentativas++;
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var maxW   = 600;
          var scale  = Math.min(1, maxW / img.width);
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          console.info('[ML-import] foto baixada com sucesso (tentativa ' + tentativas + ')');
          cb(dataUrl);
        } catch (e) {
          console.warn('[ML-import] canvas tainted (tentativa ' + tentativas + '):', e.message || e);
          _proximaTentativa(src);
        }
      };
      img.onerror = function() {
        console.warn('[ML-import] falha ao carregar foto (tentativa ' + tentativas + '):', src);
        _proximaTentativa(src);
      };
      img.src = src;
    }

    function _proximaTentativa(srcOriginal) {
      if (tentativas === 1) {
        tentarCarregar(WORKER_PROXY + '?url=' + encodeURIComponent(srcOriginal), true);
      } else if (tentativas === 2) {
        tentarCarregar('https://api.allorigins.win/raw?url=' + encodeURIComponent(srcOriginal), true);
      } else {
        console.error('[ML-import] todas as ' + maxTentativas + ' tentativas de baixar a foto falharam. URL:', srcOriginal);
        cb(null);
      }
    }

    tentarCarregar(url, false);
  }

  // ─── Salvar ────────────────────────────────────────────────
  function _salvar() {
    var d = _ml.data;
    if (!d) return;

    var el    = document.getElementById('ml-nome');
    var elDim = document.getElementById('ml-dim');
    var elMg  = document.getElementById('ml-margem');
    var elPr  = document.getElementById('ml-pr-venda');

    var nome   = (el    ? el.value.trim()    : d.title) || d.title;
    var dim    = (elDim ? elDim.value.trim() : '') || _inferDim(d);
    var margem = elMg   ? (parseFloat(elMg.value) || 0) : _ml.margem;
    var custo  = d.price || 0;
    var venda  = elPr
      ? (parseFloat((elPr.textContent || '').replace(/[^\d,]/g,'').replace(',','.')) || 0)
      : _precoVenda(custo, margem);
    if (!venda) venda = _precoVenda(custo, margem);

    var brand = (d.attributes || []).reduce(function(acc, a) {
      return a.id === 'BRAND' ? (a.value_name || acc) : acc;
    }, '');

    _showStatus('⏳ Baixando foto…', 'info');

    function _salvarComFoto(b64) {
      var cat = _ml.cat;
      var novaCuba = {
        id:              'ml_' + d.id + '_' + Date.now(),
        nm:              nome,
        brand:           brand || 'ML Import',
        dim:             dim,
        pr:              Math.round(venda),
        inst:            cat === 'coz' ? 110 : 220,
        instCli:         cat === 'coz' ? 160 : 280,
        photo:           b64 || '',
        _ml_id:          d.id,
        _ml_preco_custo: custo,
        _ml_margem:      margem,
        _ml_url:         d.permalink || '',
      };

      var lista = cat === 'coz' ? CFG.coz : CFG.lav;
      var idx   = lista.findIndex(function(c) { return c._ml_id === d.id; });
      if (idx >= 0) { lista[idx] = novaCuba; } else { lista.push(novaCuba); }

      if (typeof CUBA_META !== 'undefined') {
        CUBA_META['ml_' + d.id] = {
          badge:      _inferBadge(d),
          desc:       d._desc || '',
          features:   _inferFeatures(d),
          garantia:   '',
          tipo_mat:   _inferTipoMat(d),
          marca_logo: (brand || 'ML').toUpperCase(),
        };
      }

      if (typeof svCFG         === 'function') svCFG();
      if (typeof buildCubaList === 'function') buildCubaList();
      if (typeof buildCfg      === 'function') buildCfg();

      if (_ml.selPhoto && !b64) {
        if (typeof toast === 'function') toast('⚠️ Produto salvo, mas a foto não pôde ser baixada. Adicione manualmente.');
      } else {
        if (typeof toast === 'function') toast('✅ Produto importado do ML e salvo!');
      }

      _fecharModal();
    }

    if (_ml.selPhoto) {
      _downloadFotoB64(_ml.selPhoto, _salvarComFoto);
    } else {
      _salvarComFoto(null);
    }
  }

  // ─── Status ────────────────────────────────────────────────
  function _showStatus(msg, tipo) {
    var el = document.getElementById('ml-status');
    if (!el) return;
    el.style.color = tipo === 'error' ? '#e05555'
                   : tipo === 'warn'  ? '#c9a840'
                   : tipo === 'ok'    ? '#4ade80'
                   : 'var(--t3)';
    el.textContent = msg;
  }

  // ─── Modal ─────────────────────────────────────────────────
  function _abrirModal(cat) {
    _ml.cat      = cat || 'coz';
    _ml.data     = null;
    _ml.loading  = false;
    _ml.selPhoto = null;
    _ml.urlAtual = '';

    if (!document.getElementById('mlImportOv')) {
      var ov = document.createElement('div');
      ov.id  = 'mlImportOv';
      ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;'
        + 'background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;'
        + 'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
      ov.onclick = function(e) { if (e.target === ov) _fecharModal(); };

      var box = document.createElement('div');
      box.id  = 'mlImportBox';
      box.style.cssText = 'background:var(--s1,#131217);border-radius:20px 20px 0 0;'
        + 'width:100%;max-width:520px;max-height:90dvh;overflow-y:auto;'
        + 'padding:20px 16px 32px;box-sizing:border-box;';

      var inner = document.createElement('div');
      inner.id  = 'mlImportModal';
      box.appendChild(inner);
      ov.appendChild(box);
      document.body.appendChild(ov);
    }

    document.getElementById('mlImportOv').style.display = 'flex';
    _renderModal();
  }

  function _fecharModal() {
    var ov = document.getElementById('mlImportOv');
    if (ov) ov.style.display = 'none';
  }

  // ─── Render modal ──────────────────────────────────────────
  function _renderModal() {
    var wrap = document.getElementById('mlImportModal');
    if (!wrap) return;

    var inpAntes = document.getElementById('ml-url-inp');
    if (inpAntes && inpAntes.value) _ml.urlAtual = inpAntes.value;

    var d = _ml.data;
    var h = '';

    // Cabeçalho
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">';
    h += '<div style="font-size:1.6rem;">🛒</div>';
    h += '<div style="flex:1;">';
    h += '<div style="font-size:.95rem;font-weight:700;color:var(--tx);">Importar do Mercado Livre</div>';
    h += '<div style="font-size:.62rem;color:var(--t3);">Cole o link do produto ou código MLB…</div>';
    h += '</div>';
    h += '<button onclick="_mlFecharModal()" style="background:none;border:none;color:var(--t3);'
       + 'font-size:1.3rem;cursor:pointer;line-height:1;padding:4px 8px;">✕</button>';
    h += '</div>';

    // Seletor de categoria
    h += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
    ['coz','lav'].forEach(function(c) {
      var ativ = _ml.cat === c;
      var lab  = c === 'coz' ? '🍳 Cozinha' : '🚿 Banhe./Lavabo';
      h += '<button onclick="_mlSetCat(\'' + c + '\')" '
         + 'style="flex:1;padding:9px;border-radius:10px;font-size:.75rem;font-weight:600;cursor:pointer;'
         + 'border:1px solid ' + (ativ ? 'var(--gold2)' : 'var(--bd2)') + ';'
         + 'background:' + (ativ ? 'var(--gdim)' : 'var(--s3)') + ';'
         + 'color:' + (ativ ? 'var(--gold2)' : 'var(--t2)') + ';">' + lab + '</button>';
    });
    h += '</div>';

    // Dica
    h += '<div style="font-size:.68rem;color:var(--t3);margin-bottom:8px;padding:7px 10px;'
       + 'background:rgba(255,255,255,.04);border-radius:8px;border-left:2px solid var(--gold3);">'
       + '💡 Cole o link do ML abaixo, ou clique no botão para colar automático</div>';

    // Botão colar
    h += '<button onclick="_mlColarEBuscar(this)" '
       + 'style="width:100%;padding:13px;border-radius:10px;border:1px dashed var(--gold3);'
       + 'background:var(--gdim);color:var(--gold2);font-size:.9rem;font-weight:700;'
       + 'cursor:pointer;margin-bottom:10px;">📋 Colar link e buscar</button>';

    // Campo manual + buscar
    h += '<div style="display:flex;gap:8px;margin-bottom:14px;">';
    h += '<input id="ml-url-inp" type="text" placeholder="Ou cole/digite: MLB4787845933" '
       + 'style="flex:1;background:var(--s3);border:1px solid var(--bd2);border-radius:10px;'
       + 'padding:10px 12px;color:var(--tx);font-size:.78rem;outline:none;" '
       + 'oninput="_mlSetUrl(this.value)" '
       + 'onpaste="_mlHandlePaste(event,this)" '
       + 'onkeydown="if(event.key===\'Enter\')_mlBuscar()">';
    h += '<button onclick="_mlBuscar()" '
       + 'style="padding:10px 16px;border-radius:10px;border:none;cursor:pointer;'
       + 'background:linear-gradient(135deg,#a07828,var(--gold2));color:#0f0c00;'
       + 'font-size:.8rem;font-weight:700;white-space:nowrap;">'
       + (_ml.loading ? '⏳' : '🔍 Buscar') + '</button>';
    h += '</div>';

    // Botão alternativo: extração via IA (não depende da API/catálogo do ML)
    h += '<button onclick="_mlBuscarIA()" '
       + 'style="width:100%;padding:11px;border-radius:10px;border:1px solid var(--bd2);'
       + 'background:var(--s3);color:var(--t2);font-size:.78rem;font-weight:600;'
       + 'cursor:pointer;margin-bottom:10px;">'
       + (_ml.loading ? '⏳ Buscando…' : '🤖 Tentar com IA (alternativa, se a busca normal falhar)') + '</button>';

    // Status
    h += '<div id="ml-status" style="min-height:18px;font-size:.72rem;'
       + 'color:var(--t3);margin-bottom:8px;"></div>';

    // Loading
    if (_ml.loading) {
      h += '<div style="text-align:center;padding:32px 0;color:var(--t3);font-size:.85rem;">'
         + '<div style="font-size:2rem;margin-bottom:10px;">⏳</div>'
         + 'Buscando produto…<br>'
         + '<span style="font-size:.68rem;opacity:.6;">API do ML → proxy próprio → allorigins → corsproxy → thingproxy</span>'
         + '</div>';
    }

    // Resultado
    if (d && !_ml.loading) {
      var fotos = _allPhotos(d);
      var custo = d.price || 0;
      var venda = _precoVenda(custo, _ml.margem);
      var dim   = _inferDim(d);
      var brand = (d.attributes || []).reduce(function(acc, a) {
        return a.id === 'BRAND' ? (a.value_name || acc) : acc;
      }, '');

      h += '<div style="background:var(--s3);border-radius:14px;padding:14px;border:1px solid var(--bd2);">';

      if (fotos.length > 1) {
        h += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">';
        fotos.forEach(function(url, i) {
          var sel = _ml.selPhoto === url;
          h += '<img src="' + _esc(url) + '" onclick="_mlSelecionarFoto(' + i + ')" '
             + 'style="width:58px;height:58px;object-fit:cover;border-radius:8px;cursor:pointer;'
             + 'flex-shrink:0;border:2px solid ' + (sel ? 'var(--gold2)' : 'transparent') + ';'
             + 'box-sizing:border-box;" loading="lazy">';
        });
        h += '</div>';
      }

      if (_ml.selPhoto) {
        h += '<div style="background:var(--s2);border-radius:12px;overflow:hidden;'
           + 'aspect-ratio:4/3;margin-bottom:12px;">'
           + '<img src="' + _esc(_ml.selPhoto) + '" '
           + 'style="width:100%;height:100%;object-fit:contain;padding:16px;box-sizing:border-box;" '
           + 'loading="lazy"></div>';
      }

      h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Nome (editável)</div>';
      h += '<input id="ml-nome" type="text" value="' + _esc(d.title) + '" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;'
         + 'padding:9px 11px;color:var(--tx);font-size:.8rem;font-weight:600;'
         + 'box-sizing:border-box;outline:none;margin-bottom:10px;">';

      h += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
      if (brand) {
        h += '<div style="flex:1;">'
           + '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Marca</div>'
           + '<div style="font-size:.78rem;color:var(--t2);">' + _esc(brand) + '</div>'
           + '</div>';
      }
      h += '<div style="flex:1;">'
         + '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Dimensões</div>'
         + '<input id="ml-dim" type="text" value="' + _esc(dim) + '" placeholder="ex: 60×40cm" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;'
         + 'padding:7px 9px;color:var(--tx);font-size:.78rem;box-sizing:border-box;outline:none;">'
         + '</div>';
      h += '</div>';

      h += '<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:11px;'
         + 'padding:12px 14px;margin-bottom:10px;">';
      h += '<div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:8px;">';
      h += '<div style="flex:1;">'
         + '<div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Preço de custo (ML)</div>'
         + '<div style="font-size:1.1rem;font-weight:700;color:var(--t2);">' + _fmt(custo) + '</div>'
         + '</div>';
      h += '<div style="width:80px;">'
         + '<div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Margem %</div>'
         + '<input id="ml-margem" type="number" min="0" max="300" step="1" value="' + _ml.margem + '" '
         + 'oninput="_mlAtualizarPreco(this.value)" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;'
         + 'padding:6px 8px;color:var(--tx);font-size:.85rem;font-weight:700;'
         + 'box-sizing:border-box;outline:none;text-align:center;">'
         + '</div>';
      h += '</div>';
      h += '<div style="display:flex;justify-content:space-between;align-items:baseline;">'
         + '<div style="font-size:.6rem;color:var(--gold3);text-transform:uppercase;letter-spacing:1px;">Preço de venda calculado</div>'
         + '<div id="ml-pr-venda" style="font-family:\'Cormorant Garamond\',serif;'
         + 'font-size:1.6rem;font-weight:700;color:var(--gold2);">' + _fmt(venda) + '</div>'
         + '</div>';
      h += '</div>';

      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:12px;'
         + 'padding:7px 10px;background:rgba(0,0,0,.2);border-radius:8px;'
         + 'border-left:2px solid var(--t4);">'
         + '🔒 Preço de custo é dado interno — não aparece para clientes.</div>';

      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:10px;opacity:.7;">'
         + (d._ia ? '🤖 Dados extraídos por IA — confira preço e título antes de salvar' : d._scraped ? '📄 Dados obtidos via página do produto' : '✅ Dados obtidos via API oficial ML')
         + '</div>';

      h += '<button onclick="_mlSalvar()" '
         + 'style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;'
         + 'background:linear-gradient(135deg,#a07828,var(--gold2));'
         + 'color:#0f0c00;font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;">'
         + '✓ Salvar produto importado</button>';

      h += '</div>';
    }

    wrap.innerHTML = h;

    var inp = document.getElementById('ml-url-inp');
    if (inp && _ml.urlAtual) inp.value = _ml.urlAtual;
    if (inp && !d && !_ml.loading) setTimeout(function() { inp.focus(); }, 80);
  }

  // ══════════════════════════════════════════════════════════
  // FUNÇÕES GLOBAIS
  // ══════════════════════════════════════════════════════════

  window._mlAbrirModal  = _abrirModal;
  window._mlFecharModal = _fecharModal;
  window.abrirMLImport  = _abrirModal;

  window._mlSetCat = function(cat) {
    _ml.cat = cat;
    _renderModal();
  };

  window._mlSetUrl = function(val) {
    _ml.urlAtual = (val || '').trim(); // preserva fragmento (#wid=...) para extração de ID
  };

  window._mlColarEBuscar = function(btn) {
    function _executar(text) {
      var url = (text || '').trim(); // preserva fragmento (#wid=...) para extração de ID
      var inp = document.getElementById('ml-url-inp');
      if (inp) inp.value = url || text;
      _ml.urlAtual = url;
      if (btn) { btn.textContent = '📋 Colar link e buscar'; btn.disabled = false; }
      if (!_extractId(url)) {
        _showStatus('❌ Não encontrei um link do ML. Cole no campo e clique Buscar.', 'error');
        return;
      }
      _ml.data = null; _ml.selPhoto = null;
      _buscar(url);
    }

    if (!navigator.clipboard || !navigator.clipboard.readText) {
      var inp = document.getElementById('ml-url-inp');
      if (inp) { inp.focus(); inp.select(); }
      _showStatus('⚠️ Cole o link no campo abaixo e clique Buscar.', 'warn');
      return;
    }

    if (btn) { btn.textContent = '⏳ Lendo…'; btn.disabled = true; }

    navigator.clipboard.readText().then(function(text) {
      _executar(text);
    }).catch(function() {
      if (btn) { btn.textContent = '📋 Colar link e buscar'; btn.disabled = false; }
      var inp = document.getElementById('ml-url-inp');
      var val = inp ? inp.value.trim() : '';
      if (val) { _executar(val); }
      else {
        if (inp) inp.focus();
        _showStatus('⚠️ Permissão negada ao clipboard. Cole o link no campo e clique Buscar.', 'warn');
      }
    });
  };

  window._mlHandlePaste = function(evt, inp) {
    evt.preventDefault();
    function _aplicar(text) {
      var url = (text || '').trim(); // preserva fragmento (#wid=...) para extração de ID
      inp.value    = url;
      _ml.urlAtual = url;
      if (url) { _ml.data = null; _ml.selPhoto = null; _buscar(url); }
    }
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(_aplicar).catch(function() {
        _aplicar(evt.clipboardData ? evt.clipboardData.getData('text') : '');
      });
    } else {
      _aplicar(evt.clipboardData ? evt.clipboardData.getData('text') : '');
    }
  };

  window._mlBuscar = function() {
    var inp = document.getElementById('ml-url-inp');
    var url = (inp ? inp.value.trim() : '') || _ml.urlAtual || ''; // preserva fragmento
    if (!url) { _showStatus('⚠️ Cole o link antes de buscar.', 'warn'); return; }
    _ml.urlAtual = url;
    _ml.data     = null;
    _ml.selPhoto = null;
    _buscar(url);
  };

  window._mlBuscarIA = function() {
    var inp = document.getElementById('ml-url-inp');
    var url = (inp ? inp.value.trim() : '') || _ml.urlAtual || '';
    if (!url) { _showStatus('⚠️ Cole o link antes de buscar.', 'warn'); return; }
    _ml.urlAtual = url;
    _buscarComIA(url);
  };

  window._mlSelecionarFoto = function(idx) {
    var fotos    = _allPhotos(_ml.data || {});
    _ml.selPhoto = fotos[idx] || null;
    _renderModal();
    var inp = document.getElementById('ml-url-inp');
    if (inp) inp.value = _ml.urlAtual || '';
  };

  window._mlAtualizarPreco = function(val) {
    _ml.margem = parseFloat(val) || 0;
    var el = document.getElementById('ml-pr-venda');
    if (el && _ml.data) el.textContent = _fmt(_precoVenda(_ml.data.price || 0, _ml.margem));
  };

  window._mlSalvar = _salvar;

})();
