// ══════════════════════════════════════════════════════════════
// APP-ML-IMPORT.JS  — Importador de Cubas do Mercado Livre
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// Drop-in: adicione no index.html APÓS app-config.js
//   <script src="app-ml-import.js"></script>
//
// Estratégia de busca (em cascata):
//  1. API pública do ML  (api.mercadolibre.com — sem autenticação)
//  2. Scraping HTML via proxies CORS (allorigins → corsproxy → thingproxy)
//
// O que faz:
//  • Injeta botão "🛒 Importar do ML" nas abas de cubas (cfg tab 1 e 2)
//  • Modal com campo de URL + busca em cascata
//  • Preview: foto, nome editável, dimensões, preço custo + venda c/ margem
//  • Galeria de miniaturas clicáveis (fotos do anúncio)
//  • Salva em CFG.coz ou CFG.lav com _ml_id para deduplicação
//  • Popula CUBA_META automaticamente (se o objeto existir)
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Proxy CORS próprio (Cloudflare Worker) ───────────────
  var WORKER_URL = 'https://hr-ml-proxy.hrproplay.workers.dev';

  function _viaWorker(targetUrl) {
    if (!WORKER_URL || WORKER_URL.indexOf('SEUUSUARIO') !== -1) return null;
    return WORKER_URL + '?url=' + encodeURIComponent(targetUrl);
  }

  // ─── Estado interno ────────────────────────────────────────
  var _ml = {
    loading:  false,
    data:     null,
    selPhoto: null,
    margem:   30,
    cat:      'coz',
    urlAtual: '',
  };

  // ─── Utilitários ───────────────────────────────────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function _fmt(n) {
    return 'R$\u00a0' + Number(n).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  // Extrai MLB... de qualquer link do ML
  // Retorna {id, isCatalog, fallbackCatalogId?}
  function _extractId(url) {
    url = url.trim();
    // Remove fragmento (#...) — links compartilhados do ML têm #origin=share&...
    var hashIdx = url.indexOf('#');
    if (hashIdx !== -1) url = url.substring(0, hashIdx);
    var m, wid, catalogId;
    // wid= (item real)
    m = url.match(/[?&#]wid=(MLB\d+)/i);
    if (m) wid = m[1].toUpperCase();
    // item_id: dentro de pdp_filters
    if (!wid) {
      m = url.match(/item_id:(MLB\d+)/i);
      if (m) wid = m[1].toUpperCase();
    }
    // /p/MLBxxxxxxx = catálogo (guarda como fallback se já temos wid)
    m = url.match(/\/p\/(MLB\d+)/i);
    if (m) catalogId = m[1].toUpperCase();
    if (wid) return { id: wid, isCatalog: false, fallbackCatalogId: catalogId || null };
    if (catalogId) return { id: catalogId, isCatalog: true };
    // /MLB... direto no path
    m = url.match(/\/(MLB\d+)/i);
    if (m) return { id: m[1].toUpperCase(), isCatalog: false };
    // formato hifenizado /MLB-123456789
    m = url.match(/\/(MLB)-(\d+)/i);
    if (m) return { id: 'MLB' + m[2], isCatalog: false };
    // apenas o id digitado
    m = url.match(/^(MLB\d+)$/i);
    if (m) return { id: m[1].toUpperCase(), isCatalog: false };
    return null;
  }

  function _tentarUrls(urls, opts, cb) {
    if (!urls.length) { cb('Todas as tentativas falharam', null); return; }
    var url  = urls[0];
    var rest = urls.slice(1);
    var done = false;
    var timer = setTimeout(function() {
      if (!done) { done = true; _tentarUrls(rest, opts, cb); }
    }, 6000);
    fetch(url, opts)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(d) {
        if (!done) { done = true; clearTimeout(timer); cb(null, d); }
      })
      .catch(function() {
        if (!done) { done = true; clearTimeout(timer); _tentarUrls(rest, opts, cb); }
      });
  }

  function _tentarParalelo(urls, validar, cb) {
    var done   = false;
    var erros  = 0;
    var total  = urls.length;
    if (!total) { cb('Sem URLs', null); return; }
    urls.forEach(function(url) {
      fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit',
                   headers: { 'Accept': 'application/json' } })
        .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
        .then(function(d) {
          if (d && d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
          if (!done && validar(d)) {
            done = true;
            cb(null, d);
          } else {
            erros++;
            if (!done && erros === total) cb('Todas falharam', null);
          }
        })
        .catch(function() {
          erros++;
          if (!done && erros === total) cb('Todas falharam', null);
        });
    });
    setTimeout(function() {
      if (!done) { done = true; cb('Timeout', null); }
    }, 6000);
  }

  // ══════════════════════════════════════════════════════════
  // CAMADA 1 — API pública do Mercado Livre
  // ══════════════════════════════════════════════════════════
  function _fetchApiML(id, cb) {
    var base = 'https://api.mercadolibre.com/items/' + id;
    fetch(base, { method: 'GET', mode: 'cors', credentials: 'omit',
                  headers: { 'Accept': 'application/json' } })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(d) {
        if (d && d.title) { cb(null, d); return; }
        console.warn('[ML-import] direta sem título, tentando proxies', d);
        _fetchApiMLViaProxy(base, cb);
      })
      .catch(function(e) {
        console.warn('[ML-import] chamada direta falhou:', e.message || e, '— tentando proxies');
        _fetchApiMLViaProxy(base, cb);
      });
  }

  function _fetchApiMLViaProxy(base, cb) {
    var urls = [];
    var viaWorker = _viaWorker(base);
    if (viaWorker) urls.push(viaWorker);
    urls.push(
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(base),
      'https://corsproxy.io/?url='        + encodeURIComponent(base),
      'https://api.allorigins.win/raw?url='+ encodeURIComponent(base),
      'https://thingproxy.freeboard.io/fetch/' + base
    );
    _tentarParalelo(urls, function(d) { return d && d.title; }, function(err, d) {
      if (err || !d || !d.title) {
        console.warn('[ML-import] todos os proxies falharam:', err);
        cb(err || 'sem dados', null);
        return;
      }
      cb(null, d);
    });
  }

  function _fetchDesc(id, cb) {
    var base = 'https://api.mercadolibre.com/items/' + id + '/description';
    var opts = { method: 'GET', mode: 'cors', credentials: 'omit',
                 headers: { 'Accept': 'application/json' } };
    var urls = [base];
    var viaWorker = _viaWorker(base);
    if (viaWorker) urls.push(viaWorker);
    urls.push(
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(base),
      'https://corsproxy.io/?url=' + encodeURIComponent(base),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(base),
      'https://thingproxy.freeboard.io/fetch/' + base
    );
    _tentarUrls(urls, opts, function(err, d) {
      if (err || !d) { cb(null, ''); return; }
      if (d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
      cb(null, d.plain_text || '');
    });
  }

  function _fetchCatalog(id, cb) {
    // Estratégia 1: /products/{id} (às vezes funciona sem auth em catálogos públicos)
    var base1 = 'https://api.mercadolibre.com/products/' + id;
    // Estratégia 2: search por catalog_product_id (API pública, sem auth)
    var base2 = 'https://api.mercadolibre.com/sites/MLB/search?catalog_product_id=' + id + '&limit=1';

    function _extrairItemId(d) {
      if (!d) return null;
      if (d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
      // Resposta de /products/
      var itemId = (d.buy_box_winner && d.buy_box_winner.item_id) ||
                   (d.items && d.items[0] && d.items[0].id);
      if (itemId) return itemId;
      // Resposta de /search
      if (d.results && d.results[0] && d.results[0].id) return d.results[0].id;
      return null;
    }

    function _tentarCom(base, next) {
      var opts = { method: 'GET', mode: 'cors', credentials: 'omit',
                   headers: { 'Accept': 'application/json' } };
      var urls = [base];
      var viaWorker = _viaWorker(base);
      if (viaWorker) urls.unshift(viaWorker); // worker primeiro
      urls.push(
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(base),
        'https://corsproxy.io/?url=' + encodeURIComponent(base),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(base),
        'https://thingproxy.freeboard.io/fetch/' + base
      );
      _tentarUrls(urls, opts, function(err, d) {
        var itemId = _extrairItemId(d);
        if (!err && itemId) { cb(null, itemId); return; }
        next();
      });
    }

    // Tenta estratégia 1 (/products/), depois 2 (search?catalog_product_id=), depois desiste
    _tentarCom(base1, function() {
      _fetchCatalogSearch(id, function(err2, itemId) {
        if (!err2 && itemId) { cb(null, itemId); return; }
        cb('Não foi possível resolver o catálogo ' + id, null);
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // CAMADA 2 — Scraping HTML via proxies CORS
  // ══════════════════════════════════════════════════════════
  function _fetchPaginaML(itemId, cb) {
    var urlProd = 'https://www.mercadolivre.com.br/' + itemId.replace(/^MLB/i,'MLB-') + '-x.html';
    var proxies = [];
    var viaWorker = _viaWorker(urlProd);
    if (viaWorker) proxies.push(viaWorker);
    proxies.push(
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(urlProd),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(urlProd),
      'https://corsproxy.io/?url=' + encodeURIComponent(urlProd),
      'https://api.allorigins.win/get?url='  + encodeURIComponent(urlProd),
      'https://thingproxy.freeboard.io/fetch/' + urlProd
    );
    function tentar(lista) {
      if (!lista.length) {
        console.warn('[ML-import] Camada 2: todos os proxies de scraping falharam');
        cb('Falha ao acessar página do produto', null);
        return;
      }
      var proxyUrl = lista[0];
      var isGet    = proxyUrl.indexOf('/get?') !== -1;
      var done     = false;
      var timer    = setTimeout(function() {
        if (!done) { done = true; console.warn('[ML-import] Camada 2: timeout em', proxyUrl); tentar(lista.slice(1)); }
      }, 5000);
      fetch(proxyUrl)
        .then(function(r) { return r.ok ? (isGet ? r.json() : r.text()) : Promise.reject('HTTP ' + r.status); })
        .then(function(resp) {
          if (!done) {
            done = true; clearTimeout(timer);
            var html = isGet ? (resp.contents || '') : resp;
            cb(null, html);
          }
        })
        .catch(function(e) {
          if (!done) { done = true; clearTimeout(timer); console.warn('[ML-import] Camada 2 falhou em', proxyUrl, e.message || e); tentar(lista.slice(1)); }
        });
    }
    tentar(proxies);
  }

  function _parsearHTML(html, id) {
    var jldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    var produto   = null;
    for (var i = 0; i < jldMatch.length; i++) {
      try {
        var txt = jldMatch[i].replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        var obj = JSON.parse(txt);
        if (obj['@type'] === 'Product' || (obj.name && obj.offers)) { produto = obj; break; }
      } catch(e) {}
    }

    function meta(prop) {
      var re1 = new RegExp('<meta[^>]*(?:property|name)=[\\x22\\x27]' + prop + '[\\x22\\x27][^>]*content=[\\x22\\x27]([^\\x22\\x27]+)[\\x22\\x27]', 'i');
      var re2 = new RegExp('<meta[^>]*content=[\\x22\\x27]([^\\x22\\x27]+)[\\x22\\x27][^>]*(?:property|name)=[\\x22\\x27]' + prop + '[\\x22\\x27]', 'i');
      var m = html.match(re1) || html.match(re2);
      return m ? m[1] : '';
    }

    var titulo = '';
    var preco  = 0;
    var fotos  = [];
    var attrs  = [];

    if (produto) {
      titulo = produto.name || '';
      if (produto.offers) {
        var oferta = Array.isArray(produto.offers) ? produto.offers[0] : produto.offers;
        preco = parseFloat(oferta.price || oferta.lowPrice || 0);
      }
      if (produto.image) {
        var imgs = Array.isArray(produto.image) ? produto.image : [produto.image];
        fotos = imgs.map(function(img) {
          return typeof img === 'string' ? img : (img.url || img.contentUrl || '');
        }).filter(Boolean);
      }
      if (produto.description) attrs.push({id:'DESC',name:'Descrição',value_name:produto.description.slice(0,200)});
    }

    if (!titulo) titulo = meta('og:title') || meta('twitter:title') || '';
    if (!fotos.length) {
      var ogImg = meta('og:image');
      if (ogImg) fotos = [ogImg];
    }

    if (!preco) {
      var precoMatch = html.match(/class="[^"]*price[^"]*"[^>]*>\s*R\$\s*([\d.,]+)/i)
                    || html.match(/"price"\s*:\s*([\d.]+)/);
      if (precoMatch) preco = parseFloat(precoMatch[1].replace(',','.'));
    }

    if (fotos.length < 2) {
      var imgMatches = html.match(/https?:\/\/http2\.mlstatic\.com\/[^"'\s]+\.jpg/g) || [];
      fotos = fotos.concat(imgMatches).filter(function(u,i,a){ return a.indexOf(u) === i; }).slice(0,8);
    }

    if (!titulo || titulo === ('Produto ' + id)) return null;

    return {
      id:         id,
      title:      titulo,
      price:      preco,
      pictures:   fotos.slice(0,8).map(function(u) { return {url: u}; }),
      attributes: attrs,
      permalink:  'https://www.mercadolivre.com.br/' + id.replace(/^MLB/i,'MLB-') + '-x.html',
      _scraped:   true
    };
  }

  // ══════════════════════════════════════════════════════════
  // CAMADA 3 — Busca por texto na API pública do ML
  // Usada quando item_id está inativo e scraping falhou
  // ══════════════════════════════════════════════════════════
  function _fetchPorTexto(query, cb) {
    if (!query || query.length < 4) { cb('Query muito curta', null); return; }
    var base = 'https://api.mercadolibre.com/sites/MLB/search?q=' + encodeURIComponent(query) + '&limit=1';
    var urls = [];
    var viaWorker = _viaWorker(base);
    if (viaWorker) urls.push(viaWorker);
    urls.push(
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(base),
      'https://corsproxy.io/?url=' + encodeURIComponent(base),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(base)
    );
    _tentarParalelo(urls, function(d) {
      return d && d.results && d.results.length > 0;
    }, function(err, d) {
      if (err || !d || !d.results || !d.results[0]) { cb(err || 'sem resultados', null); return; }
      // Pega o primeiro resultado e busca detalhes completos do item
      var itemId = d.results[0].id;
      _fetchApiML(itemId, function(err2, item) {
        if (!err2 && item && item.title) { cb(null, item); return; }
        // Retorna o resultado da search mesmo sem detalhes completos
        cb(null, d.results[0]);
      });
    });
  }

  // Busca itens de um catálogo via search API (sem auth)
  function _fetchCatalogSearch(catalogId, cb) {
    var base = 'https://api.mercadolibre.com/sites/MLB/search?catalog_product_id=' + catalogId + '&limit=1';
    var urls = [];
    var viaWorker = _viaWorker(base);
    if (viaWorker) urls.push(viaWorker);
    urls.push(
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(base),
      'https://corsproxy.io/?url=' + encodeURIComponent(base),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(base)
    );
    _tentarParalelo(urls, function(d) {
      return d && d.results && d.results.length > 0;
    }, function(err, d) {
      if (err || !d || !d.results || !d.results[0]) { cb(err || 'sem resultados', null); return; }
      cb(null, d.results[0].id);
    });
  }

  // Extrai query de texto de uma URL do ML (para usar na camada 3)
  function _queryDaUrl(rawUrl) {
    // tenta extrair do path: /cuba-inox-dupla-55x34-torneira-prata/p/...
    var m = rawUrl.match(/mercadolivre\.com\.br\/([^/?#]+)/i);
    if (!m) return '';
    var slug = m[1];
    if (/^(p\/)?MLB\d+/i.test(slug)) return ''; // só id de catálogo, sem texto
    var palavras = slug.replace(/-/g, ' ').split(' ')
      .filter(function(p) { return p.length > 2 && !/^MLB\d*$/i.test(p); })
      .slice(0, 6);
    return palavras.join(' ');
  }
  // ══════════════════════════════════════════════════════════
  // ORQUESTRADOR — 3 camadas em cascata
  // ══════════════════════════════════════════════════════════
  function _fetchItem(id, rawUrl, catalogId, cb) {
    // Suporte a chamadas sem todos os parâmetros
    if (typeof rawUrl === 'function')   { cb = rawUrl; rawUrl = ''; catalogId = ''; }
    if (typeof catalogId === 'function'){ cb = catalogId; catalogId = ''; }

    // Camada 1: API pública do ML
    _showStatus('⏳ Buscando na API do Mercado Livre...', 'info');
    _fetchApiML(id, function(err1, item1) {
      if (!err1 && item1 && item1.title) { cb(null, item1); return; }

      // Camada 2: Scraping HTML
      _showStatus('⏳ Tentando via página do produto...', 'info');
      _fetchPaginaML(id, function(err2, html) {
        var item2 = html ? _parsearHTML(html, id) : null;
        if (item2 && item2.title) { cb(null, item2); return; }

        // Camada 3a: search por catalog_product_id (se disponível)
        if (catalogId) {
          _showStatus('⏳ Buscando via catálogo...', 'info');
          _fetchCatalogSearch(catalogId, function(err3, altItemId) {
            if (!err3 && altItemId && altItemId !== id) {
              _fetchApiML(altItemId, function(err4, item4) {
                if (!err4 && item4 && item4.title) { cb(null, item4); return; }
                _camada3texto(rawUrl, cb);
              });
              return;
            }
            _camada3texto(rawUrl, cb);
          });
          return;
        }

        _camada3texto(rawUrl, cb);
      });
    });
  }

  function _camada3texto(rawUrl, cb) {
    var query = rawUrl ? _queryDaUrl(rawUrl) : '';
    if (!query) {
      // Sem slug de texto (ex: produto.mercadolivre.com.br/MLB-4787845933)
      // Tenta busca pelo MLB ID como query (camada 3b)
      var mId = rawUrl ? rawUrl.match(/\/(MLB)-(\d+)/i) : null;
      var mlbQuery = mId ? ('MLB' + mId[2]) : '';
      if (mlbQuery) {
        _showStatus('\u23f3 Buscando por c\u00f3digo MLB...', 'info');
        _fetchPorTexto(mlbQuery, function(err, item) {
          if (!err && item && item.title) { cb(null, item); return; }
          cb('Produto n\u00e3o encontrado. Verifique o link ou tente novamente.', null);
        });
        return;
      }
      cb('Produto n\u00e3o encontrado. Verifique o link ou tente novamente.', null);
      return;
    }
    _showStatus('\u23f3 Buscando por texto...', 'info');
    _fetchPorTexto(query, function(err, item) {
      if (!err && item && item.title) { cb(null, item); return; }
      cb('Produto n\u00e3o encontrado. Verifique o link ou tente novamente.', null);
    });
  }

  function _buscar(rawUrl) {
    var info = _extractId(rawUrl);
    if (!info) {
      _showStatus('⚠️ Link inválido. Cole a URL do produto ou o código MLB...', 'warn');
      return;
    }
    _ml.loading = true;
    _ml.data    = null;
    _ml.selPhoto = null;
    _renderModal();
    _showStatus('⏳ Buscando produto...', 'info');

    function carregar(itemId) {
      _fetchItem(itemId, rawUrl, function(err, item) {
        if (err || !item) {
          _ml.loading = false;
          _renderModal();
          _showStatus('❌ ' + (err || 'Produto não encontrado'), 'error');
          return;
        }
        _fetchDesc(itemId, function(_, desc) {
          _ml.data         = item;
          _ml.data._desc   = desc || '';
          _ml.selPhoto     = _bestPhoto(item);
          _ml.loading      = false;
          _renderModal();
          _showStatus('✅ Produto encontrado!', 'ok');
        });
      });
    }

    if (info.isCatalog) {
      _fetchCatalog(info.id, function(err, itemId) {
        carregar(!err && itemId ? itemId : info.id);
      });
    } else {
      // Tenta item direto; se falhar e houver catálogo fallback, usa ele
      _fetchItem(info.id, rawUrl, info.fallbackCatalogId || '', function(err, item) {
        if (!err && item && item.title) {
          _fetchDesc(info.id, function(_, desc) {
            _ml.data       = item;
            _ml.data._desc = desc || '';
            _ml.selPhoto   = _bestPhoto(item);
            _ml.loading    = false;
            _renderModal();
            _showStatus('✅ Produto encontrado!', 'ok');
          });
          return;
        }
        if (info.fallbackCatalogId) {
          _showStatus('⏳ Item pausado, buscando via catálogo...', 'info');
          _fetchCatalog(info.fallbackCatalogId, function(err2, itemId) {
            carregar(!err2 && itemId ? itemId : info.fallbackCatalogId);
          });
        } else {
          _ml.loading = false;
          _renderModal();
          _showStatus('❌ Produto não encontrado. Verifique o link ou tente novamente.', 'error');
        }
      });
    }
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
    var atrs = item.attributes || [];
    var dims = [];
    atrs.forEach(function(a) {
      var id = (a.id || '').toLowerCase();
      if (id.indexOf('length') !== -1 || id.indexOf('width') !== -1 || id.indexOf('height') !== -1 ||
          id.indexOf('comprimento') !== -1 || id.indexOf('largura') !== -1 || id.indexOf('altura') !== -1 ||
          id.indexOf('profundidade') !== -1) {
        var v = a.value_name || '';
        if (v) dims.push(v);
      }
    });
    if (dims.length >= 2) return dims.slice(0, 3).join(' × ');
    var m = (item.title || '').match(/(\d{2,3})\s*[xXx×]\s*(\d{2,3})/);
    if (m) return m[1] + '×' + m[2] + 'cm';
    return '';
  }

  function _inferFeatures(item) {
    var atrs  = item.attributes || [];
    var feats = [];
    var skip  = ['ITEM_CONDITION','GTIN','BRAND','EAN','MODEL','COLOR'];
    atrs.forEach(function(a) {
      if (skip.indexOf(a.id) >= 0) return;
      if (a.value_name && a.name) feats.push(a.name + ': ' + a.value_name);
    });
    return feats.slice(0, 6);
  }

  function _inferBadge(item) {
    if (item.health && item.health > 0.85) return '⭐ Destaque ML';
    if ((item.sold_quantity || 0) > 500)   return '🔥 Mais Vendido';
    return '';
  }

  function _inferTipoMat(item) {
    var txt = ((item.title || '') + ' ' + (item._desc || '')).toLowerCase();
    if (txt.indexOf('louça') !== -1 || txt.indexOf('cerâmica') !== -1 || txt.indexOf('porcelana') !== -1) return 'Louça';
    if (txt.indexOf('granito') !== -1 || txt.indexOf('mármore') !== -1) return 'Pedra';
    if (txt.indexOf('inox') !== -1 || txt.indexOf('aço') !== -1)        return 'Inox';
    return 'Inox';
  }

  function _precoVenda(custo, margem) {
    return custo * (1 + margem / 100);
  }

  function _downloadFotoB64(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW   = 500;
      var scale  = Math.min(1, maxW / img.width);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = function() { cb(null); };
    img.src = url;
  }

  function _salvar() {
    var d = _ml.data;
    if (!d) return;

    var el    = document.getElementById('ml-nome');
    var elDim = document.getElementById('ml-dim');
    var elMg  = document.getElementById('ml-margem');
    var elPr  = document.getElementById('ml-pr-venda');

    var nome   = (el    ? el.value.trim()   : d.title) || d.title;
    var dim    = (elDim ? elDim.value.trim() : '') || _inferDim(d);
    var margem = elMg   ? (parseFloat(elMg.value) || 0) : _ml.margem;
    var custo  = d.price || 0;
    var venda  = elPr   ? (parseFloat((elPr.textContent || '').replace(/[^\d,]/g,'').replace(',','.')) || 0)
                        : _precoVenda(custo, margem);
    if (!venda) venda = _precoVenda(custo, margem);

    var brand = (d.attributes || []).reduce(function(acc, a) {
      return a.id === 'BRAND' ? (a.value_name || acc) : acc;
    }, '');

    var tipoMat  = _inferTipoMat(d);
    var features = _inferFeatures(d);
    var badge    = _inferBadge(d);
    var cat      = _ml.cat;

    _showStatus('⏳ Baixando foto...', 'info');

    function _salvarComFoto(b64) {
      var novaCuba = {
        id:       'ml_' + d.id + '_' + Date.now(),
        nm:       nome,
        brand:    brand || 'ML Import',
        dim:      dim,
        pr:       Math.round(venda),
        inst:     cat === 'coz' ? 110 : 220,
        instCli:  cat === 'coz' ? 160 : 280,
        photo:    b64 || '',
        _ml_id:         d.id,
        _ml_preco_custo: custo,
        _ml_margem:     margem,
        _ml_url:        d.permalink || '',
      };

      var lista = cat === 'coz' ? CFG.coz : CFG.lav;
      var idx   = lista.findIndex(function(c) { return c._ml_id === d.id; });
      if (idx >= 0) { lista[idx] = novaCuba; }
      else          { lista.push(novaCuba); }

      if (typeof CUBA_META !== 'undefined') {
        CUBA_META['ml_' + d.id] = {
          badge:      badge,
          desc:       d._desc || '',
          features:   features,
          garantia:   '',
          tipo_mat:   tipoMat,
          marca_logo: (brand || 'ML').toUpperCase(),
        };
      }

      if (typeof svCFG        === 'function') svCFG();
      if (typeof buildCubaList === 'function') buildCubaList();
      if (typeof buildCfg     === 'function') buildCfg();
      if (typeof toast        === 'function') toast('✅ Cuba importada do ML e salva!');

      _fecharModal();
    }

    if (_ml.selPhoto) {
      _downloadFotoB64(_ml.selPhoto, _salvarComFoto);
    } else {
      _salvarComFoto(null);
    }
  }

  // ══════════════════════════════════════════════════════════
  // STATUS
  // ══════════════════════════════════════════════════════════
  function _showStatus(msg, tipo) {
    var el = document.getElementById('ml-status');
    if (!el) return;
    var cor = tipo === 'error' ? '#e05555'
            : tipo === 'warn'  ? '#c9a840'
            : tipo === 'ok'    ? '#4ade80'
            : 'var(--t3)';
    el.style.color  = cor;
    el.textContent  = msg;
  }

  // ══════════════════════════════════════════════════════════
  // OVERLAY / MODAL
  // ══════════════════════════════════════════════════════════
  function _abrirModal(cat) {
    _ml.cat      = cat || 'coz';
    _ml.data     = null;
    _ml.loading  = false;
    _ml.selPhoto = null;
    _ml.urlAtual = '';

    if (!document.getElementById('mlImportOv')) {
      var ov = document.createElement('div');
      ov.id  = 'mlImportOv';
      ov.style.cssText = [
        'position:fixed','top:0','left:0','right:0','bottom:0',
        'z-index:9999',
        'background:rgba(0,0,0,.72)',
        'display:flex','align-items:flex-end','justify-content:center',
        'backdrop-filter:blur(4px)','-webkit-backdrop-filter:blur(4px)',
      ].join(';');
      ov.onclick = function(e) { if (e.target === ov) _fecharModal(); };

      var box = document.createElement('div');
      box.id  = 'mlImportBox';
      box.style.cssText = [
        'background:var(--s1,#131217)',
        'border-radius:20px 20px 0 0',
        'width:100%','max-width:520px',
        'max-height:90dvh','overflow-y:auto',
        'padding:20px 16px 32px',
        'box-sizing:border-box',
      ].join(';');

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

  // ══════════════════════════════════════════════════════════
  // RENDER DO MODAL
  // ══════════════════════════════════════════════════════════
  function _renderModal() {
    var wrap = document.getElementById('mlImportModal');
    if (!wrap) return;

    var inpAntes = document.getElementById('ml-url-inp');
    if (inpAntes && inpAntes.value) _ml.urlAtual = inpAntes.value;

    var d = _ml.data;
    var h = '';

    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">';
    h += '<div style="font-size:1.6rem;">🛒</div>';
    h += '<div style="flex:1;">';
    h += '<div style="font-size:.95rem;font-weight:700;color:var(--tx);">Importar do Mercado Livre</div>';
    h += '<div style="font-size:.62rem;color:var(--t3);">Cole o link do produto ou código MLB…</div>';
    h += '</div>';
    h += '<button onclick="_mlFecharModal()" style="background:none;border:none;color:var(--t3);'
       + 'font-size:1.3rem;cursor:pointer;line-height:1;padding:4px 8px;">✕</button>';
    h += '</div>';

    h += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
    ['coz','lav'].forEach(function(c) {
      var ativ = _ml.cat === c;
      var lab  = c === 'coz' ? '🍳 Cozinha' : '🚿 Banhe./Lavabo';
      h += '<button onclick="_mlSetCat(\'' + c + '\')" '
         + 'style="flex:1;padding:9px;border-radius:10px;font-size:.75rem;font-weight:600;cursor:pointer;'
         + 'border:1px solid ' + (ativ ? 'var(--gold2)' : 'var(--bd2)') + ';'
         + 'background:' + (ativ ? 'var(--gdim)' : 'var(--s3)') + ';'
         + 'color:' + (ativ ? 'var(--gold2)' : 'var(--t2)') + ';">'
         + lab + '</button>';
    });
    h += '</div>';

    h += '<div style="display:flex;gap:8px;margin-bottom:14px;">';
    h += '<input id="ml-url-inp" type="text" placeholder="https://www.mercadolivre.com.br/... ou MLB123456789" '
       + 'style="flex:1;background:var(--s3);border:1px solid var(--bd2);border-radius:10px;'
       + 'padding:10px 12px;color:var(--tx);font-size:.78rem;outline:none;" '
       + 'oninput="_mlSetUrl(this.value)" '
       + 'onpaste="var s=this;setTimeout(function(){_mlSetUrl(s.value);},10)" '
       + 'onkeydown="if(event.key===\'Enter\')_mlBuscar()">';
    h += '<button onclick="_mlBuscar()" '
       + 'style="padding:10px 16px;border-radius:10px;border:none;cursor:pointer;'
       + 'background:linear-gradient(135deg,#a07828,var(--gold2));color:#0f0c00;'
       + 'font-size:.8rem;font-weight:700;white-space:nowrap;">'
       + (_ml.loading ? '⏳' : '🔍 Buscar') + '</button>';
    h += '</div>';

    h += '<div id="ml-status" style="min-height:18px;font-size:.72rem;'
       + 'color:var(--t3);margin-bottom:8px;"></div>';

    if (_ml.loading) {
      h += '<div style="text-align:center;padding:32px 0;color:var(--t3);font-size:.85rem;">'
         + '<div style="font-size:2rem;margin-bottom:10px;">⏳</div>'
         + 'Buscando produto…<br>'
         + '<span style="font-size:.68rem;opacity:.6;">Tentando API → página do produto</span>'
         + '</div>';
    }

    if (d && !_ml.loading) {
      var fotos  = _allPhotos(d);
      var custo  = d.price || 0;
      var venda  = _precoVenda(custo, _ml.margem);
      var dim    = _inferDim(d);
      var brand  = (d.attributes || []).reduce(function(acc, a) {
        return a.id === 'BRAND' ? (a.value_name || acc) : acc;
      }, '');

      h += '<div style="background:var(--s3);border-radius:14px;padding:14px;border:1px solid var(--bd2);">';

      if (fotos.length > 1) {
        h += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">';
        fotos.forEach(function(url, i) {
          var sel = _ml.selPhoto === url;
          h += '<img src="' + _esc(url) + '" '
             + 'onclick="_mlSelecionarFoto(' + i + ')" '
             + 'style="width:58px;height:58px;object-fit:cover;border-radius:8px;cursor:pointer;'
             + 'flex-shrink:0;border:2px solid ' + (sel ? 'var(--gold2)' : 'transparent') + ';'
             + 'box-sizing:border-box;" loading="lazy">';
        });
        h += '</div>';
      }

      if (_ml.selPhoto) {
        h += '<div style="background:var(--s2);border-radius:12px;overflow:hidden;'
           + 'aspect-ratio:4/3;margin-bottom:12px;">';
        h += '<img src="' + _esc(_ml.selPhoto) + '" '
           + 'style="width:100%;height:100%;object-fit:contain;padding:16px;box-sizing:border-box;" '
           + 'loading="lazy">';
        h += '</div>';
      }

      h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Nome (editável)</div>';
      h += '<input id="ml-nome" type="text" value="' + _esc(d.title) + '" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;'
         + 'padding:9px 11px;color:var(--tx);font-size:.8rem;font-weight:600;'
         + 'box-sizing:border-box;outline:none;margin-bottom:10px;">';

      h += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
      if (brand) {
        h += '<div style="flex:1;">';
        h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Marca</div>';
        h += '<div style="font-size:.78rem;color:var(--t2);">' + _esc(brand) + '</div>';
        h += '</div>';
      }
      h += '<div style="flex:1;">';
      h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Dimensões</div>';
      h += '<input id="ml-dim" type="text" value="' + _esc(dim) + '" placeholder="ex: 60×40cm" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;'
         + 'padding:7px 9px;color:var(--tx);font-size:.78rem;box-sizing:border-box;outline:none;">';
      h += '</div>';
      h += '</div>';

      h += '<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:11px;'
         + 'padding:12px 14px;margin-bottom:10px;">';

      h += '<div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:8px;">';
      h += '<div style="flex:1;">';
      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Preço de custo (ML)</div>';
      h += '<div style="font-size:1.1rem;font-weight:700;color:var(--t2);">' + _fmt(custo) + '</div>';
      h += '</div>';
      h += '<div style="width:80px;">';
      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Margem %</div>';
      h += '<input id="ml-margem" type="number" min="0" max="300" step="1" value="' + _ml.margem + '" '
         + 'oninput="_mlAtualizarPreco(this.value)" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;'
         + 'padding:6px 8px;color:var(--tx);font-size:.85rem;font-weight:700;'
         + 'box-sizing:border-box;outline:none;text-align:center;">';
      h += '</div>';
      h += '</div>';

      h += '<div style="display:flex;justify-content:space-between;align-items:baseline;">';
      h += '<div style="font-size:.6rem;color:var(--gold3);text-transform:uppercase;letter-spacing:1px;">Preço de venda calculado</div>';
      h += '<div id="ml-pr-venda" style="font-family:\'Cormorant Garamond\',serif;'
         + 'font-size:1.6rem;font-weight:700;color:var(--gold2);">' + _fmt(venda) + '</div>';
      h += '</div>';
      h += '</div>';

      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:12px;'
         + 'padding:7px 10px;background:rgba(0,0,0,.2);border-radius:8px;'
         + 'border-left:2px solid var(--t4);">'
         + '🔒 Preço de custo é dado interno — não aparece para clientes.</div>';

      if (d._scraped) {
        h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:10px;opacity:.7;">📄 Dados obtidos via página do produto</div>';
      } else {
        h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:10px;opacity:.7;">✅ Dados obtidos via API oficial ML</div>';
      }

      h += '<button onclick="_mlSalvar()" '
         + 'style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;'
         + 'background:linear-gradient(135deg,#a07828,var(--gold2));'
         + 'color:#0f0c00;font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;">'
         + '✓ Salvar cuba importada</button>';

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

  window._mlBuscar = function() {
    var inp = document.getElementById('ml-url-inp');
    var url = (inp ? inp.value.trim() : '') || _ml.urlAtual || '';
    if (!url) { _showStatus('⚠️ Cole o link antes de buscar.', 'warn'); return; }
    _ml.urlAtual = url;
    _ml.data     = null;
    _ml.selPhoto = null;
    _buscar(url);
  };

  window._mlSelecionarFoto = function(idx) {
    var d = _ml.data;
    if (!d) return;
    var fotos    = _allPhotos(d);
    _ml.selPhoto = fotos[idx] || null;
    _renderModal();
    var inp = document.getElementById('ml-url-inp');
    if (inp) inp.value = _ml.urlAtual || '';
  };

  window._mlAtualizarPreco = function(val) {
    _ml.margem = parseFloat(val) || 0;
    var d = _ml.data;
    if (!d) return;
    var el = document.getElementById('ml-pr-venda');
    if (el) el.textContent = _fmt(_precoVenda(d.price || 0, _ml.margem));
  };

  window._mlSalvar = _salvar;

  window._mlSetUrl = function(val) { _ml.urlAtual = val || ""; };

})();
