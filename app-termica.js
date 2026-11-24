/* ═══════════════════════════════════════════════════════════════════
   app-termica.js — Impressão térmica DIRETA (ESC/POS) v1
   HR Mármores e Granitos

   O que faz:
   • Imprime o recibo direto na impressora térmica (58/80 mm), sem abrir
     a janela de impressão do navegador.
   • Conexões: Bluetooth BLE (Chrome), USB (OTG/WebUSB), Serial, e o app
     RawBT (Android — serve para as impressoras Bluetooth "comuns", que
     o Chrome não consegue falar direto).
   • Logo da empresa impressa no topo (rasterizada com pontilhado).
   • Acentuação em português (CP850 / CP860) ou sem acentos.
   • Corte automático, cópias, rodapé editável, histórico de pagamentos.
   • Qualquer falha cai no cupom em HTML de sempre (nada quebra).

   Padrão = modo "html" (comportamento antigo). Só muda quando o usuário
   escolher outro modo em "⚙️ Impressora térmica".
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'hr_termica_cfg';
  var DEF = {
    modo: 'html',      // html | bt | rawbt | usb | serial
    codepage: '850',   // 850 | 860 | none
    logo: true,
    corte: true,
    copias: 1,
    rodape: 'Obrigado pela preferência!',
    larg: '58',        // largura usada no teste
    nome: '',          // nome da última impressora pareada
    btChunk: 100,
    baud: 9600
  };

  function _load() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    var o = {}, k;
    for (k in DEF) o[k] = (c[k] !== undefined ? c[k] : DEF[k]);
    return o;
  }
  var cfg = _load();
  function _save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function _toast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} }
  function _sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function _fm(v) { return parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ───────────────────────── Codificação de texto ───────────────────────── */
  var T850 = { 'á':0xA0,'é':0x82,'í':0xA1,'ó':0xA2,'ú':0xA3,'à':0x85,'â':0x83,'ê':0x88,'ô':0x93,'ã':0xC6,'õ':0xE4,'ç':0x87,
               'Á':0xB5,'É':0x90,'Í':0xD6,'Ó':0xE0,'Ú':0xE9,'À':0xB7,'Â':0xB6,'Ê':0xD2,'Ô':0xE2,'Ã':0xC7,'Õ':0xE5,'Ç':0x80,
               'ü':0x81,'Ü':0x9A,'º':0xA7,'ª':0xA6,'°':0xF8 };
  var T860 = { 'á':0xA0,'é':0x82,'í':0xA1,'ó':0xA2,'ú':0xA3,'à':0x85,'â':0x83,'ê':0x88,'ô':0x93,'ã':0x84,'õ':0x94,'ç':0x87,
               'Á':0x86,'É':0x90,'Í':0x8B,'Ó':0x9F,'Ú':0x96,'À':0x91,'Â':0x8F,'Ê':0x89,'Ô':0x8C,'Ã':0x8E,'Õ':0x99,'Ç':0x80,
               'ü':0x81,'Ü':0x9A,'º':0xA7,'ª':0xA6 };
  var SUB = { '—':'-','–':'-','−':'-','·':'-','•':'*','◆':'*','“':'"','”':'"','‘':"'",'’':"'",'…':'...','×':'x',
              '\u00A0':' ','\u202F':' ','✔':'','✓':'','✘':'','✗':'' };

  // limpa emoji/caracteres que não existem na impressora, ANTES de medir o layout
  function _san(s) {
    s = String(s == null ? '' : s);
    try { s = s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu, ''); } catch (e) {}
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      out += (SUB[ch] !== undefined ? SUB[ch] : ch);
    }
    return out;
  }
  function _semAcento(ch) {
    var d = ch;
    try { d = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return d;
  }
  function _enc(s, codepage) {
    var tab = codepage === '860' ? T860 : (codepage === 'none' ? null : T850);
    var out = [];
    s = _san(s);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), c = s.charCodeAt(i);
      if (c < 128) { if (c >= 32 || c === 10) out.push(c); continue; }
      if (tab && tab[ch] !== undefined) { out.push(tab[ch]); continue; }
      var d = _semAcento(ch);
      if (d.length === 1 && d.charCodeAt(0) < 128) out.push(d.charCodeAt(0)); else out.push(63);
    }
    return out;
  }

  /* ───────────────────────── Logo (raster ESC/POS) ───────────────────────── */
  var _logoCache = {};
  function _logoRaster(src, dots) {
    if (!src) return Promise.resolve(null);
    var key = dots + ':' + src.length + ':' + src.slice(-40);
    if (_logoCache[key] !== undefined) return Promise.resolve(_logoCache[key]);
    return new Promise(function (res) {
      var fin = false;
      var done = function (v) { if (fin) return; fin = true; _logoCache[key] = v; res(v); };
      var img = new Image();
      img.onload = function () {
        try {
          var maxH = 150, maxW = Math.round(dots * 0.45);
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          var s = Math.min(maxW / w, maxH / h);
          w = Math.max(8, Math.round(w * s)); h = Math.max(8, Math.round(h * s));
          var cv = document.createElement('canvas'); cv.width = dots; cv.height = h;
          var cx = cv.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, dots, h);
          cx.drawImage(img, Math.floor((dots - w) / 2), 0, w, h);
          var d = cx.getImageData(0, 0, dots, h).data;
          var g = new Float32Array(dots * h), i, x, y;
          for (i = 0; i < dots * h; i++) {
            var a = d[i * 4 + 3] / 255;
            var lum = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
            lum = lum * a + 255 * (1 - a);
            lum = (lum - 128) * 1.25 + 128;
            g[i] = lum < 0 ? 0 : (lum > 255 ? 255 : lum);
          }
          // Floyd–Steinberg
          for (y = 0; y < h; y++) {
            for (x = 0; x < dots; x++) {
              i = y * dots + x;
              var old = g[i], nw = old < 128 ? 0 : 255, err = old - nw;
              g[i] = nw;
              if (x + 1 < dots) g[i + 1] += err * 7 / 16;
              if (y + 1 < h) {
                if (x > 0) g[i + dots - 1] += err * 3 / 16;
                g[i + dots] += err * 5 / 16;
                if (x + 1 < dots) g[i + dots + 1] += err / 16;
              }
            }
          }
          var wb = dots / 8, out = [], BAND = 96;
          for (var y0 = 0; y0 < h; y0 += BAND) {
            var bh = Math.min(BAND, h - y0);
            out.push(0x1D, 0x76, 0x30, 0x00, wb & 255, wb >> 8, bh & 255, bh >> 8);
            for (y = 0; y < bh; y++) {
              for (var xb = 0; xb < wb; xb++) {
                var by = 0;
                for (var bit = 0; bit < 8; bit++) {
                  if (g[(y0 + y) * dots + xb * 8 + bit] < 128) by |= (0x80 >> bit);
                }
                out.push(by);
              }
            }
          }
          done(out);
        } catch (e) { done(null); }
      };
      img.onerror = function () { done(null); };
      img.src = src;
      setTimeout(function () { done(null); }, 4000);
    });
  }

  /* ───────────────────────── Montagem do recibo ───────────────────────── */
  function _spaces(n) { return n > 0 ? new Array(n + 1).join(' ') : ''; }
  function _wrap(s, n) {
    s = _san(s).replace(/\s+/g, ' ').trim();
    if (!s) return [''];
    var words = s.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      while (w.length > n) {            // palavra maior que a linha: quebra dura
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, n)); w = w.slice(n);
      }
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= n) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // d = dados do recibo; larg = '58' | '80'; c = config; logo = bytes raster ou null
  function montarRecibo(d, larg, c, logo) {
    c = c || cfg;
    var cols = larg === '80' ? 48 : 32;
    var b = [];
    var raw = function () {
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        if (typeof a === 'number') b.push(a & 255);
        else for (var j = 0; j < a.length; j++) b.push(a[j] & 255);
      }
    };
    var ln = function (s) { raw(_enc(s, c.codepage)); b.push(10); };
    var al = function (n) { raw(0x1B, 0x61, n); };
    var bold = function (on) { raw(0x1B, 0x45, on ? 1 : 0); };
    var size = function (w, h) { raw(0x1D, 0x21, ((w - 1) << 4) | (h - 1)); };
    var sep = function () { ln(new Array(cols + 1).join('-')); };
    var center = function (s, n) {
      n = n || cols;
      _wrap(s, n).forEach(function (l) { ln(l); });
    };
    var kv = function (k, v, bd) {
      k = _san(k); v = _san(v);
      if (bd) bold(1);
      if (k.length + v.length + 1 <= cols) ln(k + _spaces(cols - k.length - v.length) + v);
      else { ln(k); _wrap(v, cols - 2).forEach(function (l) { ln('  ' + l); }); }
      if (bd) bold(0);
    };
    var emp = d.emp || {};

    // ── inicialização: reset, cancela modo kanji, tabela de caracteres ──
    raw(0x1B, 0x40, 0x1C, 0x2E);
    if (c.codepage === '860') raw(0x1B, 0x74, 3);
    else if (c.codepage === 'none') raw(0x1B, 0x74, 0);
    else raw(0x1B, 0x74, 2);
    raw(0x1B, 0x52, 0);

    // ── cabeçalho ──
    al(1);
    if (logo && logo.length) { raw(logo); b.push(10); }
    bold(1); size(1, 2); center(emp.nome || '', cols); size(1, 1); bold(0);
    var sub = [];
    if (emp.cnpj) sub.push('CNPJ ' + emp.cnpj);
    if (emp.tel) sub.push(emp.tel);
    if (emp.end) sub.push(emp.end);
    if (emp.cidade) sub.push(emp.cidade);
    sub.forEach(function (s) { center(s); });
    al(0); sep(); al(1);
    bold(1); size(2, 2); ln('RECIBO'); size(1, 1); bold(0);
    ln((d.num || '') + '  ' + (d.data || ''));
    al(0); sep();

    // ── dados ──
    if (d.cli) { kv('Cliente', d.cli, true); } else { kv('Cliente', '-', true); }
    if (d.refer) kv('Serviço', d.refer);
    if (d.nOrc) kv('Orçamento', '#' + d.nOrc);
    if (d.forma) kv('Forma', d.forma);

    // ── valor ──
    sep(); al(1);
    ln('VALOR RECEBIDO');
    var vtxt = 'R$ ' + _fm(d.valor);
    bold(1);
    if (vtxt.length * 2 <= cols) { size(2, 2); ln(vtxt); size(1, 1); }
    else { size(1, 2); ln(vtxt); size(1, 1); }
    bold(0);
    if (d.extenso) _wrap('(' + d.extenso + ')', cols).forEach(function (l) { ln(l); });
    al(0);

    // ── totais ──
    if (d.totalOrc > 0) {
      sep();
      kv('Total do serviço', 'R$ ' + _fm(d.totalOrc));
      kv('Total pago', 'R$ ' + _fm(d.totalPago));
      if (d.quitado) kv('Situação', 'QUITADO', true);
      else kv('Falta pagar', 'R$ ' + _fm(d.saldo), true);
    }

    // ── histórico de pagamentos (só quando há mais de um) ──
    var hs = (d.historico || []).filter(function (h) { return h.tipo === 'in' || h.tipo === undefined; });
    if (hs.length > 1) {
      sep(); bold(1); ln('PAGAMENTOS'); bold(0);
      hs.slice(-8).forEach(function (h) {
        var dt = String(h.data || '').slice(0, 6) + String(h.data || '').slice(8);
        var rot = (dt + (h.forma ? ' ' + h.forma : '')).slice(0, cols - 14);
        kv(rot, 'R$ ' + _fm(h.valor));
      });
      if (hs.length > 8) ln('(+' + (hs.length - 8) + ' anteriores)');
    }

    // ── assinatura / rodapé ──
    sep();
    b.push(10, 10);
    al(1);
    ln(new Array(Math.min(cols - 4, 28) + 1).join('_'));
    center(emp.nome || '');
    if (c.rodape) { b.push(10); center(c.rodape); }
    al(0);
    raw(0x1B, 0x64, 4);                       // avança 4 linhas
    if (c.corte) raw(0x1D, 0x56, 0x42, 0x00); // corte parcial (ignorado se não houver guilhotina)
    return new Uint8Array(b);
  }

  /* ───────────────────────── Transportes ───────────────────────── */
  var BT_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '0000fee7-0000-1000-8000-00805f9b34fb',
    '0000ae30-0000-1000-8000-00805f9b34fb',
    '0000a002-0000-1000-8000-00805f9b34fb',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '38eb4a80-c570-11e3-9507-0002a5d5c51b'
  ];
  var _btDev = null, _usbDev = null, _serialPort = null;

  // ── Bluetooth BLE ──
  async function _btDispositivo(forcar) {
    if (!navigator.bluetooth) throw new Error('Este navegador não tem Bluetooth Web. Use o Chrome (Android/PC) ou o modo RawBT.');
    var dev = forcar ? null : _btDev;
    if (!dev && !forcar && navigator.bluetooth.getDevices) {
      try {
        var lista = await navigator.bluetooth.getDevices();
        dev = lista.filter(function (x) { return x.id === cfg.btId; })[0] || null;
      } catch (e) {}
    }
    if (!dev) {
      dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BT_SERVICES });
      cfg.btId = dev.id; cfg.nome = dev.name || 'Impressora BT'; _save();
    }
    _btDev = dev;
    return dev;
  }
  async function _btCaracteristica(dev) {
    var srv = dev.gatt.connected ? dev.gatt : await dev.gatt.connect();
    var servicos = await srv.getPrimaryServices();
    var melhor = null;
    for (var i = 0; i < servicos.length; i++) {
      var chars = [];
      try { chars = await servicos[i].getCharacteristics(); } catch (e) {}
      for (var j = 0; j < chars.length; j++) {
        var p = chars[j].properties;
        if (p.writeWithoutResponse) return chars[j];
        if (p.write && !melhor) melhor = chars[j];
      }
    }
    if (melhor) return melhor;
    throw new Error('Não achei o canal de impressão nessa impressora (ela pode ser Bluetooth clássico — use o modo RawBT).');
  }
  async function _btEnviar(bytes, forcar) {
    var dev = await _btDispositivo(forcar);
    var ch = await _btCaracteristica(dev);
    var tam = cfg.btChunk || 100, i = 0, tent = 0;
    while (i < bytes.length) {
      var parte = bytes.slice(i, i + tam);
      try {
        if (ch.properties.writeWithoutResponse && ch.writeValueWithoutResponse) await ch.writeValueWithoutResponse(parte);
        else await ch.writeValue(parte);
        i += tam; tent = 0;
        await _sleep(20);
      } catch (e) {
        if (tam > 20) { tam = 20; cfg.btChunk = 20; _save(); continue; }   // MTU pequeno: usa pacotes de 20 bytes
        if (tent++ < 3) { await _sleep(120); continue; }
        throw e;
      }
    }
    await _sleep(400);
    try { dev.gatt.disconnect(); } catch (e) {}
  }

  // ── USB ──
  async function _usbEnviar(bytes, forcar) {
    if (!navigator.usb) throw new Error('Este navegador não tem USB Web. Use o Chrome.');
    var dev = forcar ? null : _usbDev;
    if (!dev && !forcar) {
      try {
        var l = await navigator.usb.getDevices();
        dev = l.filter(function (x) { return x.vendorId === cfg.usbVid && x.productId === cfg.usbPid; })[0] || null;
      } catch (e) {}
    }
    if (!dev) {
      dev = await navigator.usb.requestDevice({ filters: [] });
      cfg.usbVid = dev.vendorId; cfg.usbPid = dev.productId; cfg.nome = dev.productName || 'Impressora USB'; _save();
    }
    _usbDev = dev;
    if (!dev.opened) await dev.open();
    if (dev.configuration === null) await dev.selectConfiguration(1);
    var ifc = null, ep = null;
    dev.configuration.interfaces.forEach(function (it) {
      if (ep) return;
      it.alternates.forEach(function (alt) {
        alt.endpoints.forEach(function (e) {
          if (!ep && e.direction === 'out' && e.type === 'bulk') { ifc = it; ep = e; }
        });
      });
    });
    if (!ep) throw new Error('Não achei a saída de impressão USB.');
    if (!ifc.claimed) await dev.claimInterface(ifc.interfaceNumber);
    for (var i = 0; i < bytes.length; i += 4096) await dev.transferOut(ep.endpointNumber, bytes.slice(i, i + 4096));
    await _sleep(200);
    try { await dev.releaseInterface(ifc.interfaceNumber); } catch (e) {}
  }

  // ── Serial ──
  async function _serialEnviar(bytes, forcar) {
    if (!navigator.serial) throw new Error('Este navegador não tem Serial Web. Use o Chrome no computador.');
    var port = forcar ? null : _serialPort;
    if (!port && !forcar) { try { port = (await navigator.serial.getPorts())[0] || null; } catch (e) {} }
    if (!port) { port = await navigator.serial.requestPort(); cfg.nome = 'Porta serial'; _save(); }
    _serialPort = port;
    if (!port.writable) await port.open({ baudRate: cfg.baud || 9600 });
    var w = port.writable.getWriter();
    try {
      for (var i = 0; i < bytes.length; i += 512) { await w.write(bytes.slice(i, i + 512)); }
    } finally { w.releaseLock(); }
    await _sleep(300);
    try { await port.close(); } catch (e) {}
  }

  // ── RawBT (app Android) ──
  function _rawbtEnviar(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x4000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x4000));
    window.location.href = 'rawbt:base64,' + btoa(s);
    return Promise.resolve();
  }

  async function enviar(bytes, forcar) {
    switch (cfg.modo) {
      case 'bt':     return _btEnviar(bytes, forcar);
      case 'usb':    return _usbEnviar(bytes, forcar);
      case 'serial': return _serialEnviar(bytes, forcar);
      case 'rawbt':  return _rawbtEnviar(bytes);
    }
    throw new Error('Modo de impressão direta desligado.');
  }

  /* ───────────────────────── API principal ───────────────────────── */
  function modoDireto() { return cfg.modo !== 'html'; }

  function _falha(e, fallback) {
    var nome = e && e.name, msg = (e && e.message) || String(e);
    if (nome === 'NotFoundError' || nome === 'AbortError' && /cancel/i.test(msg)) { _toast('Seleção da impressora cancelada'); return; }
    if (nome === 'SecurityError') msg = 'toque de novo no botão para o Chrome liberar o acesso';
    _toast('⚠️ Impressora: ' + msg.slice(0, 90) + (fallback ? ' — abrindo impressão comum' : ''));
    if (fallback) setTimeout(fallback, 1400);
  }

  async function imprimirRecibo(d, larg, fallback) {
    larg = larg === '80' ? '80' : '58';
    try {
      var logo = null;
      if (cfg.logo && d.logo) logo = await _logoRaster(d.logo, larg === '80' ? 576 : 384);
      var uma = montarRecibo(d, larg, cfg, logo);
      var n = Math.max(1, Math.min(3, parseInt(cfg.copias, 10) || 1));
      var tudo = new Uint8Array(uma.length * n);
      for (var i = 0; i < n; i++) tudo.set(uma, i * uma.length);
      _toast('🖨️ Enviando para a impressora…');
      await enviar(tudo, false);
      if (cfg.modo !== 'rawbt') _toast('✓ Recibo enviado para a impressora');
    } catch (e) {
      // Se o pareamento salvo não funcionou mais, tenta escolher de novo uma vez antes de desistir
      if ((cfg.modo === 'bt' || cfg.modo === 'usb') && e && e.name !== 'NotFoundError' && !(e && e.name === 'SecurityError')) {
        try {
          var logo2 = (cfg.logo && d.logo) ? await _logoRaster(d.logo, larg === '80' ? 576 : 384) : null;
          await enviar(montarRecibo(d, larg, cfg, logo2), true);
          _toast('✓ Recibo enviado para a impressora');
          return;
        } catch (e2) { return _falha(e2, fallback); }
      }
      _falha(e, fallback);
    }
  }

  async function imprimirTeste() {
    var emp = (typeof CFG !== 'undefined' && CFG && CFG.emp) ? CFG.emp : {};
    var d = {
      emp: { nome: emp.nome || 'HR Mármores e Granitos', cnpj: emp.cnpj || '', tel: emp.tel || '', end: emp.end || '', cidade: emp.cidade || '' },
      logo: emp.logoUrl || '',
      num: 'REC-TESTE', data: new Date().toLocaleDateString('pt-BR'),
      cli: 'João da Conceição Araújo', refer: 'Soleira · Granito São Gabriel', nOrc: '12345', forma: 'Pix',
      valor: 1234.5, extenso: 'mil duzentos e trinta e quatro reais e cinquenta centavos',
      totalOrc: 3000, totalPago: 1234.5, saldo: 1765.5, quitado: false,
      historico: [{ data: '10/11/2026', valor: 500, forma: 'Dinheiro', tipo: 'in' }, { data: '17/11/2026', valor: 734.5, forma: 'Pix', tipo: 'in' }]
    };
    var fb = null;
    await imprimirRecibo(d, cfg.larg, fb);
    _toast('Teste: confira acentos (ã õ ç é) e o logo no papel');
  }

  async function conectar() {
    try {
      var bytes = new Uint8Array([0x1B, 0x40]);
      if (cfg.modo === 'bt') { await _btEnviar(bytes, true); _toast('✓ Impressora pareada: ' + (cfg.nome || '')); }
      else if (cfg.modo === 'usb') { await _usbEnviar(bytes, true); _toast('✓ Impressora USB: ' + (cfg.nome || '')); }
      else if (cfg.modo === 'serial') { await _serialEnviar(bytes, true); _toast('✓ Porta selecionada'); }
      else if (cfg.modo === 'rawbt') _toast('RawBT: instale o app e escolha a impressora nele (Configurações → Impressora)');
      else _toast('No modo padrão não precisa parear');
    } catch (e) { _falha(e, null); }
    _refreshCfgStatus();
  }

  /* ───────────────────────── Tela de configuração ───────────────────────── */
  var MODOS = [
    ['html',   '🖨️', 'Impressão comum (padrão)', 'Abre a janela de impressão do celular/PC'],
    ['bt',     '📶', 'Bluetooth direto', 'Chrome + impressora Bluetooth BLE — 1 toque, sem janela'],
    ['rawbt',  '🅡', 'App RawBT (Android)', 'Para impressoras Bluetooth comuns (a maioria das de 58 mm)'],
    ['usb',    '🔌', 'USB direto', 'Cabo OTG no celular ou USB no computador'],
    ['serial', '🔗', 'Porta serial', 'Computador com Chrome (USB/Bluetooth serial)']
  ];
  function _nomeModo() { var m = MODOS.filter(function (x) { return x[0] === cfg.modo; })[0]; return m ? m[2] : ''; }
  function _refreshCfgStatus() {
    var el = document.getElementById('_termSt');
    if (el) el.textContent = cfg.modo === 'html' ? 'Modo padrão: abre a janela de impressão.' : ('Modo: ' + _nomeModo() + (cfg.nome ? ' · ' + cfg.nome : ''));
  }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function configurar() {
    var old = document.getElementById('_termCfg'); if (old) old.remove();
    var m = document.createElement('div'); m.id = '_termCfg';
    m.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    var sel = 'width:100%;padding:10px;border-radius:10px;border:1px solid var(--bd2);background:var(--s2);color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;';
    var h = '<div style="background:var(--bg);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:92vh;overflow-y:auto;padding:14px 18px 22px;border-top:2px solid var(--gold3,#C9A84C);font-family:Outfit,sans-serif;color:var(--tx);">'
      + '<div style="width:38px;height:4px;background:var(--bd2);border-radius:3px;margin:0 auto 12px;"></div>'
      + '<div style="font-size:1rem;font-weight:800;color:var(--gold);margin-bottom:4px;">⚙️ Impressora térmica</div>'
      + '<div id="_termSt" style="font-size:.72rem;color:var(--t3);margin-bottom:12px;"></div>';
    MODOS.forEach(function (o) {
      var on = o[0] === cfg.modo;
      h += '<button type="button" data-modo="' + o[0] + '" style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;margin-bottom:7px;padding:10px 12px;border-radius:12px;cursor:pointer;font-family:Outfit,sans-serif;border:1px solid ' + (on ? 'var(--gold3)' : 'var(--bd2)') + ';background:' + (on ? 'rgba(201,168,76,.12)' : 'var(--s2)') + ';color:var(--tx);">'
        + '<span style="font-size:1.2rem;">' + o[1] + '</span><span style="flex:1;"><span style="display:block;font-size:.84rem;font-weight:800;">' + o[2] + '</span><span style="display:block;font-size:.68rem;color:var(--t3);">' + o[3] + '</span></span></button>';
    });
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 8px;">'
      + '<label style="font-size:.7rem;color:var(--t3);">Acentuação<select id="_tCp" style="' + sel + '"><option value="850">Padrão (CP850)</option><option value="860">Português (CP860)</option><option value="none">Sem acentos</option></select></label>'
      + '<label style="font-size:.7rem;color:var(--t3);">Papel (teste)<select id="_tLg" style="' + sel + '"><option value="58">58 mm</option><option value="80">80 mm</option></select></label>'
      + '<label style="font-size:.7rem;color:var(--t3);">Cópias<select id="_tCo" style="' + sel + '"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>'
      + '<label style="font-size:.7rem;color:var(--t3);">Logo / Corte<select id="_tLC" style="' + sel + '"><option value="11">Logo + corte</option><option value="10">Logo, sem corte</option><option value="01">Sem logo, com corte</option><option value="00">Sem logo, sem corte</option></select></label>'
      + '</div>'
      + '<label style="display:block;font-size:.7rem;color:var(--t3);margin-bottom:10px;">Mensagem do rodapé<input id="_tRd" type="text" maxlength="60" value="' + _esc(cfg.rodape) + '" style="' + sel + 'margin-top:2px;"></label>'
      + '<div style="display:flex;gap:8px;margin-bottom:8px;">'
      + '<button type="button" id="_tCon" style="flex:1;padding:11px;border-radius:12px;border:1px solid var(--gold3);background:transparent;color:var(--gold);font-weight:800;font-size:.82rem;cursor:pointer;font-family:Outfit,sans-serif;">🔗 Parear impressora</button>'
      + '<button type="button" id="_tTst" style="flex:1;padding:11px;border-radius:12px;border:none;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.82rem;cursor:pointer;font-family:Outfit,sans-serif;">🧪 Imprimir teste</button></div>'
      + '<div style="font-size:.66rem;color:var(--t3);line-height:1.45;margin-bottom:8px;">Se o teste sair com símbolos estranhos no lugar dos acentos, troque a acentuação. Se o Bluetooth direto não achar a impressora, ela é Bluetooth comum: use o RawBT.</div>'
      + '<button type="button" id="_tFim" style="width:100%;padding:10px;border:none;background:transparent;color:var(--t3);font-size:.8rem;cursor:pointer;font-family:Outfit,sans-serif;">Fechar</button></div>';
    m.innerHTML = h;
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });

    var q = function (id) { return document.getElementById(id); };
    q('_tCp').value = cfg.codepage; q('_tLg').value = cfg.larg; q('_tCo').value = String(cfg.copias);
    q('_tLC').value = (cfg.logo ? '1' : '0') + (cfg.corte ? '1' : '0');
    q('_tCp').addEventListener('change', function () { cfg.codepage = this.value; _save(); });
    q('_tLg').addEventListener('change', function () { cfg.larg = this.value; _save(); });
    q('_tCo').addEventListener('change', function () { cfg.copias = parseInt(this.value, 10) || 1; _save(); });
    q('_tLC').addEventListener('change', function () { cfg.logo = this.value.charAt(0) === '1'; cfg.corte = this.value.charAt(1) === '1'; _save(); });
    q('_tRd').addEventListener('input', function () { cfg.rodape = this.value; _save(); });
    q('_tCon').addEventListener('click', function () { conectar(); });
    q('_tTst').addEventListener('click', function () { imprimirTeste(); });
    q('_tFim').addEventListener('click', function () { m.remove(); });
    m.querySelectorAll('[data-modo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cfg.modo = btn.getAttribute('data-modo'); _save();
        configurar();   // redesenha com o modo marcado
      });
    });
    _refreshCfgStatus();
  }

  function botaoConfigHtml() {
    return '<button type="button" onclick="document.getElementById(\'_recFmt\').remove();HR_TERMICA.configurar()" style="width:100%;margin-bottom:4px;padding:11px;border-radius:12px;border:1px dashed var(--bd2);background:transparent;color:var(--gold);font-size:.78rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">⚙️ Impressora térmica: '
      + (cfg.modo === 'html' ? 'configurar impressão direta' : _nomeModo()) + '</button>';
  }


  /* ─────────── Texto livre (fila de impressão automática do PC) ───────────
     linhas: "## Título" grande · "**negrito" · "---" separador · "Chave|Valor" · texto comum (quebra sozinho) */
  function montarTexto(job, larg, c, logo) {
    c = c || cfg; var cols = larg === '80' ? 48 : 32, b = [];
    var raw = function () { for (var i = 0; i < arguments.length; i++) { var a = arguments[i]; if (typeof a === 'number') b.push(a & 255); else for (var j = 0; j < a.length; j++) b.push(a[j] & 255); } };
    var ln = function (s) { raw(_enc(s, c.codepage)); b.push(10); };
    var al = function (n) { raw(0x1B, 0x61, n); }, bold = function (on) { raw(0x1B, 0x45, on ? 1 : 0); }, size = function (w, h) { raw(0x1D, 0x21, ((w - 1) << 4) | (h - 1)); };
    raw(0x1B, 0x40, 0x1C, 0x2E); raw(0x1B, 0x74, c.codepage === '860' ? 3 : c.codepage === 'none' ? 0 : 2); raw(0x1B, 0x52, 0);
    al(1); if (logo && logo.length) { raw(logo); b.push(10); }
    if (job.titulo) { bold(1); size(1, 2); _wrap(_san(job.titulo), cols).forEach(ln); size(1, 1); bold(0); }
    if (job.sub) _wrap(_san(job.sub), cols).forEach(ln);
    al(0); ln(new Array(cols + 1).join('='));
    (job.linhas || []).forEach(function (l) {
      l = String(l == null ? '' : l);
      if (l === '---') { ln(new Array(cols + 1).join('-')); return; }
      if (l.indexOf('## ') === 0) { bold(1); size(1, 2); _wrap(_san(l.slice(3)), cols).forEach(ln); size(1, 1); bold(0); return; }
      if (l.indexOf('**') === 0) { bold(1); _wrap(_san(l.slice(2)), cols).forEach(ln); bold(0); return; }
      var k = l.indexOf('|');
      if (k > 0) { var a = _san(l.slice(0, k)), v = _san(l.slice(k + 1)); if (a.length + v.length + 1 <= cols) ln(a + _spaces(cols - a.length - v.length) + v); else { ln(a); _wrap(v, cols - 2).forEach(function (x) { ln('  ' + x); }); } return; }
      if (!l.trim()) { b.push(10); return; }
      _wrap(_san(l), cols).forEach(ln);
    });
    ln(new Array(cols + 1).join('='));
    al(1); ln(new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })); al(0);
    raw(0x1B, 0x64, 4); if (c.corte) raw(0x1D, 0x56, 0x42, 0x00);
    return new Uint8Array(b);
  }
  async function imprimirTexto(job, larg) {
    larg = (larg || cfg.larg) === '80' ? '80' : '58';
    var emp = (typeof CFG !== 'undefined' && CFG && CFG.emp) ? CFG.emp : {};
    var logo = (cfg.logo && job.logo !== false && emp.logoUrl) ? await _logoRaster(emp.logoUrl, larg === '80' ? 576 : 384) : null;
    await enviar(montarTexto(job, larg, cfg, logo), false);
  }

  window.HR_TERMICA = {
    cfg: function () { return cfg; },
    modoDireto: modoDireto,
    imprimirRecibo: imprimirRecibo,
    imprimirTexto: imprimirTexto,
    _montarTexto: montarTexto,
    imprimirTeste: imprimirTeste,
    configurar: configurar,
    botaoConfigHtml: botaoConfigHtml,
    _montarRecibo: montarRecibo,
    _enc: _enc
  };
})();
