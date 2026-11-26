// app-crm.js — v3 (conversa com cara de WhatsApp + caixa de mensagem: a Helena revisa e envia). v2 (visual preto e dourado, filtros, animações). v1: CRM das conversas do bot (Secretária → "Conversas dos clientes").
// Lista de clientes → toque → conversa inteira num visual de WhatsApp: fotos, áudios (com a transcrição),
// vídeos, documentos, modelos, botões, localização e os tiques de entregue/lido.
// Dados: Worker /bot/crm/* (x-bot-key). Os arquivos chegam com a chave do bot e viram blob local.
(function () {
  'use strict';
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function so8(n) { return String(n || '').replace(/\D/g, '').slice(-8); }
  function fmtNum(n) {
    var d = String(n || '').replace(/\D/g, ''); if (d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return d;
  }
  function hora(ms) { return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function diaTxt(ms) {
    var d = new Date(ms), h = new Date(), o = new Date(); o.setDate(h.getDate() - 1);
    if (d.toDateString() === h.toDateString()) return 'Hoje';
    if (d.toDateString() === o.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function quando(ms) {
    var d = new Date(ms), h = new Date();
    if (d.toDateString() === h.toDateString()) return hora(ms);
    var o = new Date(); o.setDate(h.getDate() - 1);
    if (d.toDateString() === o.toDateString()) return 'Ontem';
    if (h - d < 6 * 86400000) return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  function fmtTexto(t) { // *negrito* _itálico_ ~riscado~ e links, como no WhatsApp
    return esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  }

  // nomes do app (CLDB) pelo telefone
  function nomesApp() {
    var m = {};
    try { (CLDB.get() || []).forEach(function (c) { var k = so8(c.tel); if (k.length === 8 && c.nome) m[k] = c; }); } catch (e) {}
    return m;
  }
  function vistos() { try { return JSON.parse(localStorage.getItem('hr_crm_vistos') || '{}') || {}; } catch (e) { return {}; } }
  function marcarVisto(num, total) { try { var v = vistos(); v[num] = total; localStorage.setItem('hr_crm_vistos', JSON.stringify(v)); } catch (e) {} }

  var CSS = [
    /* v2: visual da HR — preto e dourado, vidro, animações */
    '#hrCrm{position:fixed;inset:0;z-index:9990;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit;overflow:hidden;background:#0a0908;animation:crmEntra .32s cubic-bezier(.2,.9,.25,1);}',
    '#hrCrm::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 50% at 85% -10%,rgba(201,168,76,.16),transparent 60%),radial-gradient(70% 40% at -10% 110%,rgba(201,168,76,.10),transparent 60%);}',
    '#hrCrm *{box-sizing:border-box;}',
    '#hrCrm>*{position:relative;}',
    '.crm-top{display:flex;align-items:center;gap:10px;padding:10px 12px;padding-top:max(12px,env(safe-area-inset-top));min-height:62px;background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.28);box-shadow:0 8px 24px rgba(0,0,0,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:2;}',
    '.crm-top b{font-family:"Cormorant Garamond",serif;font-size:1.32rem;font-weight:700;color:#f0d78c;letter-spacing:.02em;}',
    '.crm-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;font-size:1.05rem;width:38px;height:38px;cursor:pointer;border-radius:12px;line-height:1;display:flex;align-items:center;justify-content:center;flex:none;transition:transform .15s,background .15s;}',
    '.crm-ic:active{transform:scale(.9);background:rgba(201,168,76,.22);}',
    '.crm-busca{margin:12px 12px 6px;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.2);border-radius:14px;padding:0 12px;transition:border-color .2s,box-shadow .2s;}',
    '.crm-busca:focus-within{border-color:#c9a84c;box-shadow:0 0 0 3px rgba(201,168,76,.15);}',
    '.crm-busca input{flex:1;background:none!important;border:none!important;box-shadow:none!important;color:#efe9dc;padding:12px 4px;font-size:.92rem;outline:none;font-family:inherit;margin:0;}',
    '.crm-busca input::placeholder{color:#7d7462;}',
    '.crm-chips{display:flex;gap:8px;padding:4px 12px 10px;overflow-x:auto;scrollbar-width:none;}',
    '.crm-chips::-webkit-scrollbar{display:none;}',
    '.crm-chip{flex:none;border:1px solid rgba(201,168,76,.25);background:rgba(255,255,255,.03);color:#b9ad92;border-radius:20px;padding:6px 13px;font-size:.78rem;font-weight:600;font-family:inherit;cursor:pointer;transition:all .18s;}',
    '.crm-chip b{margin-left:5px;font-size:.7rem;color:#e8c96a;}',
    '.crm-chip.on{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;border-color:transparent;box-shadow:0 4px 14px rgba(201,168,76,.35);}',
    '.crm-chip.on b{color:#1a1408;}',
    '.crm-lista{flex:1;overflow-y:auto;padding:0 0 24px;}',
    '.crm-sec{font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9a84c;padding:14px 18px 6px;}',
    '.crm-fim{font-size:.62rem;color:#7d7462;font-weight:500;margin-left:6px;}',
    '.crm-eq{font-size:.56rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#e8c96a;border:1px solid rgba(232,201,106,.5);border-radius:6px;padding:1px 5px;margin-left:7px;vertical-align:middle;}',
    '.crm-ct{display:flex;align-items:center;gap:13px;padding:10px 16px;cursor:pointer;position:relative;opacity:0;animation:crmSobe .35s cubic-bezier(.2,.9,.25,1) forwards;transition:background .15s;}',
    '.crm-ct::after{content:"";position:absolute;left:75px;right:0;bottom:0;height:1px;background:rgba(255,255,255,.05);}',
    '.crm-ct:active{background:rgba(201,168,76,.08);}',
    '.crm-ct.nv{background:linear-gradient(90deg,rgba(201,168,76,.10),transparent 70%);}',
    '.crm-ct.nv .crm-nm{color:#fff;}',
    '.crm-av{width:46px;height:46px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.08),0 4px 12px rgba(0,0,0,.4);position:relative;}',
    '.crm-ct.nv .crm-av{box-shadow:0 0 0 2px #0a0908,0 0 0 4px #c9a84c,0 0 18px rgba(201,168,76,.45);}',
    '.crm-ct-c{flex:1;min-width:0;}',
    '.crm-l1{display:flex;justify-content:space-between;gap:8px;align-items:baseline;}',
    '.crm-nm{font-weight:600;font-size:.97rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#f4eee2;}',
    '.crm-hr{font-size:.7rem;color:#857b66;flex:none;}',
    '.crm-hr.nv{color:#e8c96a;font-weight:700;}',
    '.crm-l2{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px;}',
    '.crm-pv{font-size:.83rem;color:#9a917e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.crm-ct.nv .crm-pv{color:#d8ccb0;}',
    '.crm-bd{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;border-radius:11px;font-size:.7rem;font-weight:800;padding:2px 8px;flex:none;box-shadow:0 2px 8px rgba(201,168,76,.4);animation:crmPulsa 2s ease-in-out infinite;}',
    '.crm-tag{font-size:.58rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1a1408;background:#c9a84c;border-radius:6px;padding:1px 6px;margin-left:7px;vertical-align:middle;}',
    '.crm-bot{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:rgba(201,168,76,.18);font-size:.6rem;margin-right:4px;vertical-align:-2px;}',
    '.crm-chat{flex:1;overflow-y:auto;padding:10px 12px 18px;background-color:#0a0908;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27240%27 height=%27240%27%3E%3Cpath d=%27M-10 60 C40 20 90 110 140 70 S230 40 260 90%27 stroke=%27%23c9a84c%27 stroke-opacity=%27.07%27 fill=%27none%27/%3E%3Cpath d=%27M-10 170 C50 140 80 210 150 180 S220 150 260 200%27 stroke=%27%23c9a84c%27 stroke-opacity=%27.05%27 fill=%27none%27/%3E%3C/svg%3E"),radial-gradient(120% 60% at 50% 0%,rgba(201,168,76,.08),transparent 70%);}',
    '.crm-dia{text-align:center;margin:14px 0 10px;position:sticky;top:4px;z-index:1;}',
    '.crm-dia span{background:rgba(20,17,12,.88);border:1px solid rgba(201,168,76,.28);color:#e8c96a;font-size:.68rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:20px;backdrop-filter:blur(6px);}',
    '.crm-row{display:flex;margin:3px 0;}',
    '.crm-row.b{justify-content:flex-end;}',
    '.crm-row.novo{animation:crmBolha .38s cubic-bezier(.2,1.2,.3,1) both;}',
    '.crm-bb{max-width:82%;padding:8px 10px 5px;border-radius:14px;font-size:.9rem;line-height:1.4;position:relative;word-wrap:break-word;overflow-wrap:anywhere;box-shadow:0 2px 10px rgba(0,0,0,.35);}',
    '.crm-row.c .crm-bb{background:#1b1a19;border:1px solid rgba(255,255,255,.06);border-top-left-radius:4px;}',
    '.crm-row.b .crm-bb{background:linear-gradient(160deg,#3a3018,#241e10);border:1px solid rgba(201,168,76,.32);border-top-right-radius:4px;color:#f6edd5;}',
    '.crm-bb a{color:#f0d78c;}',
    '.crm-meta{float:right;font-size:.64rem;color:#ffffff80;margin:7px 0 -2px 10px;white-space:nowrap;}',
    '.crm-tk{margin-left:3px;letter-spacing:-3px;}',
    '.crm-tk.lido{color:#5ec8ff;}',
    '.crm-tk.erro{color:#f15c6d;letter-spacing:0;}',
    '.crm-img{display:block;max-width:260px;width:100%;min-height:120px;border-radius:10px;margin-bottom:4px;background:#ffffff10;cursor:zoom-in;object-fit:cover;}',
    '.crm-stk{width:120px;height:120px;object-fit:contain;background:none;}',
    '.crm-vid{display:block;max-width:260px;width:100%;border-radius:10px;margin-bottom:4px;background:#000;}',
    '.crm-aud{width:240px;max-width:100%;height:40px;display:block;filter:sepia(.5) saturate(1.4) hue-rotate(-10deg);}',
    '.crm-trans{font-size:.78rem;color:#ffffffb8;font-style:italic;margin-top:5px;border-left:2px solid rgba(201,168,76,.6);padding-left:7px;}',
    '.crm-doc{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.28);border:1px solid rgba(201,168,76,.22);border-radius:10px;padding:10px 11px;margin-bottom:4px;cursor:pointer;min-width:210px;transition:background .15s;}',
    '.crm-doc:active{background:rgba(201,168,76,.15);}',
    '.crm-doc .ic{font-size:1.5rem;width:38px;height:38px;border-radius:10px;background:rgba(201,168,76,.14);display:flex;align-items:center;justify-content:center;flex:none;}',
    '.crm-doc .nm{font-size:.84rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;}',
    '.crm-doc .sb{font-size:.68rem;color:#e8c96aaa;}',
    '.crm-bts{display:flex;flex-direction:column;gap:3px;margin-top:3px;}',
    '.crm-bt{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:#f0d78c;text-align:center;padding:8px;border-radius:10px;font-size:.82rem;font-weight:600;}',
    '.crm-row.c .crm-bt{background:#1b1a19;}',
    '.crm-mdl{display:inline-block;font-size:.6rem;font-weight:700;letter-spacing:.04em;color:#1a1408;background:rgba(232,201,106,.85);border-radius:6px;padding:1px 6px;margin-bottom:5px;}',
    '.crm-resp{font-size:.64rem;color:#b9ad92;margin-bottom:3px;}',
    '.crm-rea{display:inline-block;background:#1b1a19;border:1px solid rgba(201,168,76,.25);border-radius:14px;padding:2px 9px;font-size:.95rem;}',
    '.crm-sem{color:#9a917e;font-size:.8rem;font-style:italic;}',
    '.crm-info{font-size:.72rem;color:#9a917e;}',
    '.crm-mais{display:block;margin:6px auto 12px;background:rgba(201,168,76,.1);color:#e8c96a;border:1px solid rgba(201,168,76,.3);border-radius:16px;padding:7px 16px;font-size:.78rem;cursor:pointer;font-family:inherit;}',
    '.crm-vazio{text-align:center;color:#9a917e;padding:50px 20px;font-size:.9rem;line-height:1.6;}',
    '.crm-vazio .ic{font-size:2.6rem;display:block;margin-bottom:10px;animation:crmFlut 3s ease-in-out infinite;}',
    '.crm-skel{height:62px;border-radius:14px;margin:8px 14px;background:linear-gradient(90deg,rgba(255,255,255,.03) 0%,rgba(201,168,76,.09) 50%,rgba(255,255,255,.03) 100%);background-size:200% 100%;animation:crmBrilho 1.2s linear infinite;}',
    '.crm-rod{background:linear-gradient(0deg,rgba(14,12,9,.98),rgba(26,22,14,.94));border-top:1px solid rgba(201,168,76,.25);padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom));display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:.76rem;color:#b9ad92;}',
    '.crm-jan{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:6px 11px;}',
    '.crm-jan i{width:8px;height:8px;border-radius:50%;background:#7d7462;display:inline-block;}',
    '.crm-jan.ok i{background:#34d399;box-shadow:0 0 8px #34d399;animation:crmPulsa 1.6s ease-in-out infinite;}',
    '.crm-rod a{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#2be07a,#1fae5b);color:#05140b;text-decoration:none;font-weight:800;border-radius:22px;padding:10px 16px;font-size:.82rem;white-space:nowrap;box-shadow:0 6px 18px rgba(37,211,102,.3);}',
    '.crm-rod a:active{transform:scale(.96);}',
    /* v3: conversa idêntica ao WhatsApp (modo escuro) */
    '#hrCrm.wa{background:#0b141a;font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e9edef;}',
    '#hrCrm.wa::before{display:none;}',
    '#hrCrm.wa .crm-top{background:#202c33;border-bottom:none;box-shadow:none;min-height:58px;padding:8px 6px;gap:8px;backdrop-filter:none;-webkit-backdrop-filter:none;}',
    '#hrCrm.wa .crm-top b{font-family:inherit;font-size:1.02rem;font-weight:500;color:#e9edef;letter-spacing:0;}',
    '#hrCrm.wa .crm-info{color:#8696a0;font-size:.76rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#hrCrm.wa .crm-ic{background:none;border:none;color:#aebac1;width:40px;height:40px;border-radius:50%;font-size:1.25rem;}',
    '#hrCrm.wa .crm-ic:active{background:rgba(255,255,255,.08);}',
    '#hrCrm.wa .crm-ic svg{width:22px;height:22px;}',
    '#hrCrm.wa .crm-av{box-shadow:none;}',
    '#hrCrm.wa .crm-chat{background-color:#0b141a;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27%3E%3Cg fill=%27none%27 stroke=%27%23ffffff%27 stroke-opacity=%27.035%27 stroke-width=%271.2%27%3E%3Ccircle cx=%2712%27 cy=%2714%27 r=%275%27/%3E%3Cpath d=%27M50 8l6 6-6 6-6-6z%27/%3E%3Cpath d=%27M20 52c4-6 10-6 14 0%27/%3E%3Crect x=%2756%27 y=%2748%27 width=%2711%27 height=%279%27 rx=%272%27/%3E%3C/g%3E%3C/svg%3E");padding:8px 4.5% 10px;}',
    '#hrCrm.wa .crm-dia{margin:10px 0 8px;}',
    '#hrCrm.wa .crm-dia span{background:#182229;border:none;color:#8696a0;font-size:.74rem;font-weight:400;letter-spacing:0;text-transform:none;padding:5px 12px;border-radius:8px;box-shadow:0 1px .5px rgba(11,20,26,.13);backdrop-filter:none;}',
    '#hrCrm.wa .crm-row{margin:2px 0;}',
    '#hrCrm.wa .crm-row.novo{animation:none;}',
    '#hrCrm.wa .crm-bb{border-radius:7.5px;padding:6px 7px 8px 9px;font-size:.93rem;line-height:1.35;box-shadow:0 1px .5px rgba(11,20,26,.13);border:none;color:#e9edef;}',
    '#hrCrm.wa .crm-row.c .crm-bb{background:#202c33;border:none;border-top-left-radius:0;}',
    '#hrCrm.wa .crm-row.b .crm-bb{background:#005c4b;border:none;border-top-right-radius:0;color:#e9edef;}',
    '#hrCrm.wa .crm-row.c .crm-bb::before{content:"";position:absolute;left:-8px;top:0;border-top:0 solid transparent;border-right:8px solid #202c33;border-bottom:10px solid transparent;}',
    '#hrCrm.wa .crm-row.b .crm-bb::before{content:"";position:absolute;right:-8px;top:0;border-left:8px solid #005c4b;border-bottom:10px solid transparent;}',
    '#hrCrm.wa .crm-bb a{color:#53bdeb;}',
    '#hrCrm.wa .crm-meta{color:#ffffff99;font-size:.68rem;margin:8px 0 -5px 12px;}',
    '#hrCrm.wa .crm-tk{color:#ffffff99;}',
    '#hrCrm.wa .crm-tk.lido{color:#53bdeb;}',
    '#hrCrm.wa .crm-bt,#hrCrm.wa .crm-row.c .crm-bt{background:#202c33;border:none;color:#00a884;border-radius:7.5px;font-weight:500;box-shadow:0 1px .5px rgba(11,20,26,.13);}',
    '#hrCrm.wa .crm-row.b .crm-bt{background:#005c4b;color:#e9edef;}',
    '#hrCrm.wa .crm-mdl{background:rgba(0,0,0,.25);color:#8696a0;font-weight:500;}',
    '#hrCrm.wa .crm-resp{color:#ffffffb3;background:rgba(0,0,0,.18);border-left:4px solid #06cf9c;border-radius:5px;padding:5px 7px;margin-bottom:5px;font-size:.78rem;}',
    '#hrCrm.wa .crm-trans{border-left-color:#06cf9c;}',
    '#hrCrm.wa .crm-doc{background:rgba(0,0,0,.2);border:none;}',
    '#hrCrm.wa .crm-doc .sb{color:#8696a0;}',
    '#hrCrm.wa .crm-aud{filter:none;}',
    '#hrCrm.wa .crm-rea{background:#202c33;border:1px solid #0b141a;}',
    '#hrCrm.wa .crm-mais{background:#182229;color:#8696a0;border:none;}',
    '#hrCrm.wa .crm-vazio{color:#8696a0;}',
    '#hrCrm.wa .crm-hel{font-size:.62rem;color:#ffffff80;display:block;margin-bottom:2px;}',
    /* caixa de mensagem */
    '.crm-comp{background:#0b141a;padding:6px 6px;padding-bottom:max(6px,env(safe-area-inset-bottom));display:flex;align-items:flex-end;gap:6px;}',
    '.crm-campo{flex:1;background:#2a3942;border-radius:24px;display:flex;align-items:flex-end;padding:0 14px;min-height:48px;}',
    '.crm-campo textarea{flex:1;background:none!important;border:none!important;box-shadow:none!important;outline:none;color:#e9edef;font-size:1rem;font-family:inherit;resize:none;padding:13px 0;margin:0;max-height:140px;line-height:1.35;scrollbar-width:none;}',
    '.crm-campo textarea::-webkit-scrollbar{display:none;}',
    '.crm-campo textarea::placeholder{color:#8696a0;}',
    '.crm-env{width:48px;height:48px;border-radius:50%;background:#00a884;border:none;color:#111b21;display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer;transition:transform .12s;}',
    '.crm-env:active{transform:scale(.92);}',
    '.crm-env[disabled]{opacity:.6;}',
    '.crm-env svg{width:24px;height:24px;}',
    '.crm-gira{width:20px;height:20px;border:2.5px solid #111b21;border-top-color:transparent;border-radius:50%;animation:crmRoda .8s linear infinite;}',
    '.crm-prev{background:#1f2c34;border-top:1px solid #2a3942;padding:10px 12px 8px;animation:crmSobe .2s ease;}',
    '.crm-prev .tt{font-size:.74rem;color:#00a884;font-weight:600;margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;}',
    '.crm-prev .tt span{color:#8696a0;font-weight:400;}',
    '.crm-prev textarea{width:100%;background:#005c4b!important;color:#e9edef;border:none!important;border-radius:7.5px;padding:8px 10px;font-size:.93rem;font-family:inherit;line-height:1.35;resize:none;outline:none;min-height:60px;max-height:220px;box-shadow:none!important;margin:0;}',
    '.crm-prev .bx{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;}',
    '.crm-prev button{border:none;border-radius:20px;padding:9px 16px;font-size:.86rem;font-weight:600;font-family:inherit;cursor:pointer;}',
    '.crm-prev .ok{background:#00a884;color:#111b21;}',
    '.crm-prev .no{background:none;color:#8696a0;}',
    '.crm-prev .orig{background:none;color:#53bdeb;margin-right:auto;padding-left:0;}',
    /* v4: CRM — abas, funil, ficha, painel */
    '.crm-abas{display:flex;gap:4px;margin:10px 12px 0;padding:4px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.18);border-radius:14px;}',
    '.crm-aba{flex:1;border:none;background:none;color:#b9ad92;font-family:inherit;font-weight:700;font-size:.84rem;padding:9px 4px;border-radius:10px;cursor:pointer;}',
    '.crm-aba.on{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;box-shadow:0 3px 12px rgba(201,168,76,.3);}',
    '.crm-funil{flex:1;display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:12px 12px 24px;}',
    '.crm-col{flex:none;width:min(84vw,330px);scroll-snap-align:start;display:flex;flex-direction:column;background:rgba(255,255,255,.025);border:1px solid rgba(201,168,76,.14);border-radius:18px;max-height:100%;}',
    '.crm-colh{padding:12px 14px 10px;border-bottom:1px solid rgba(201,168,76,.14);}',
    '.crm-colh b{display:flex;justify-content:space-between;font-size:.9rem;color:#f0d78c;}',
    '.crm-colh b span{font-size:.72rem;background:rgba(201,168,76,.18);color:#e8c96a;border-radius:10px;padding:1px 8px;}',
    '.crm-colh small{font-size:.74rem;color:#9a917e;}',
    '.crm-cols{flex:1;overflow-y:auto;padding:8px;}',
    '.crm-card{background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:11px 12px;margin-bottom:8px;cursor:pointer;}',
    '.crm-card:active{transform:scale(.98);}',
    '.crm-card .n{font-weight:700;font-size:.92rem;display:flex;justify-content:space-between;gap:6px;}',
    '.crm-card .v{color:#e8c96a;font-weight:800;font-size:.86rem;white-space:nowrap;}',
    '.crm-card .s{font-size:.76rem;color:#9a917e;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.crm-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;}',
    '.crm-pill{font-size:.66rem;font-weight:700;border-radius:8px;padding:2px 7px;background:rgba(255,255,255,.06);color:#c9bfa6;}',
    '.crm-pill.al{background:rgba(241,92,109,.16);color:#ff8a96;}',
    '.crm-pill.ok{background:rgba(52,211,153,.14);color:#5ee0aa;}',
    '.crm-pill.ou{background:rgba(201,168,76,.18);color:#f0d78c;}',
    '.crm-sheet *{box-sizing:border-box;}',
    '.crm-sheet{position:fixed;inset:0;z-index:9993;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;animation:crmEntra .2s ease;}',
    '.crm-sh{width:100%;max-height:92vh;overflow-y:auto;background:#12100c;border-top:1px solid rgba(201,168,76,.35);border-radius:22px 22px 0 0;padding:8px 16px max(20px,env(safe-area-inset-bottom));color:#efe9dc;font-family:Outfit,inherit;}',
    '.crm-sh .gr{width:44px;height:5px;border-radius:3px;background:#4a3f28;margin:4px auto 12px;}',
    '.crm-sh h3{margin:0;font-size:1.2rem;color:#f4eee2;}',
    '.crm-sh .sub{font-size:.8rem;color:#9a917e;margin-top:2px;}',
    '.crm-acts{display:flex;gap:8px;margin:14px 0 6px;}',
    '.crm-act{flex:1;text-align:center;text-decoration:none;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.28);color:#f0d78c;border-radius:12px;padding:10px 4px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:inherit;}',
    '.crm-lb{font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#c9a84c;margin:16px 0 7px;}',
    '.crm-ets{display:flex;flex-wrap:wrap;gap:6px;}',
    '.crm-et{border:1px solid rgba(201,168,76,.25);background:rgba(255,255,255,.03);color:#c9bfa6;border-radius:18px;padding:7px 11px;font-size:.76rem;font-weight:700;cursor:pointer;font-family:inherit;}',
    '.crm-et.on{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;border-color:transparent;}',
    '.crm-in{width:100%;background:rgba(255,255,255,.05)!important;border:1px solid rgba(201,168,76,.22)!important;color:#efe9dc!important;border-radius:12px;padding:11px 12px;font-size:.92rem;font-family:inherit;outline:none;box-shadow:none!important;margin:0;}',
    '.crm-row2{display:flex;gap:8px;align-items:center;}',
    '.crm-qk{flex:none;border:1px solid rgba(201,168,76,.25);background:none;color:#e8c96a;border-radius:10px;padding:8px 10px;font-size:.74rem;font-weight:700;cursor:pointer;font-family:inherit;}',
    '.crm-sv{width:100%;margin-top:18px;border:none;border-radius:14px;padding:14px;font-weight:800;font-size:.95rem;font-family:inherit;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;cursor:pointer;}',
    '.crm-li{display:flex;justify-content:space-between;gap:10px;font-size:.82rem;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);}',
    '.crm-li span:last-child{color:#e8c96a;font-weight:700;white-space:nowrap;}',
    '.crm-nota{font-size:.82rem;color:#d8ccb0;white-space:pre-wrap;background:rgba(255,255,255,.03);border-radius:10px;padding:9px 11px;line-height:1.45;}',
    '.crm-pn{flex:1;overflow-y:auto;padding:12px 12px 30px;}',
    '.crm-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '.crm-kpi{background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.015));border:1px solid rgba(201,168,76,.16);border-radius:16px;padding:12px 13px;}',
    '.crm-kpi small{display:block;font-size:.68rem;color:#9a917e;font-weight:600;text-transform:uppercase;letter-spacing:.06em;}',
    '.crm-kpi b{display:block;font-size:1.3rem;color:#f0d78c;margin-top:4px;}',
    '.crm-kpi i{font-style:normal;font-size:.72rem;color:#b9ad92;}',
    '.crm-bar{display:flex;align-items:center;gap:8px;margin:7px 0;font-size:.8rem;}',
    '.crm-bar .t{width:118px;flex:none;color:#c9bfa6;}',
    '.crm-bar .b{flex:1;height:22px;background:rgba(255,255,255,.04);border-radius:7px;overflow:hidden;}',
    '.crm-bar .b i{display:block;height:100%;background:linear-gradient(90deg,#c9a84c,#e8c96a);border-radius:7px;min-width:3px;}',
    '.crm-bar .q{width:34px;text-align:right;font-weight:700;color:#f0d78c;}',
    '@keyframes crmRoda{to{transform:rotate(360deg)}}',
    '#hrCrmZoom{position:fixed;inset:0;z-index:9995;background:#000e;display:flex;align-items:center;justify-content:center;animation:crmEntra .2s ease;}',
    '#hrCrmZoom img{max-width:100%;max-height:100%;object-fit:contain;}',
    '@keyframes crmEntra{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '@keyframes crmSobe{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '@keyframes crmBolha{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}',
    '@keyframes crmPulsa{0%,100%{opacity:1}50%{opacity:.65}}',
    '@keyframes crmFlut{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
    '@keyframes crmBrilho{to{background-position:-200% 0}}'
  ].join('\n');

  var st = { aba: 'conversas', funil: null, contatos: [], aberto: null, msgs: [], mais: false, timer: null, blobs: {}, obs: null, sig: '', filtro: 'clientes', vistosIds: {} };

  function css() { if (document.getElementById('hrCrmCss')) return; var s = document.createElement('style'); s.id = 'hrCrmCss'; s.textContent = CSS; document.head.appendChild(s); }
  function api(cam) {
    var b = base(); if (!b) return Promise.reject(new Error('O bot não está configurado neste aparelho (Config → Bot).'));
    return fetch(b + cam, { headers: hdr() }).then(function (r) { return r.json().catch(function () { return { error: 'Resposta inválida do bot (' + r.status + ').' }; }); })
      .then(function (j) { if (j && j.error) throw new Error(j.error); return j; });
  }
  function cor(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; var a = h % 360; return 'linear-gradient(135deg,hsl(' + a + ',42%,42%),hsl(' + ((a + 40) % 360) + ',48%,26%))'; }
  function iniciais(n) { var p = String(n || '?').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function tokens(n) { return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z]+/).filter(function (t) { return t.length > 2; }); }
  // o nome do app só vale quando bate com o nome que a pessoa deu ao bot (ou do perfil); senão o cadastro do app está com outro dono
  function appConflita(c, a) {
    if (!a || !a.nome) return false;
    var bot = tokens(c.nome).concat(tokens(c.perfil)); if (!bot.length) return false;
    var ap = tokens(a.nome); return !ap.some(function (t) { return bot.indexOf(t) >= 0; });
  }
  function nomeDe(c, app) { if (c.eq && c.nome) return c.nome; var a = app[so8(c.num)]; if (appConflita(c, a)) return c.nome || c.perfil; return (a && a.nome) || c.nome || c.perfil || fmtNum(c.num); }

  function fechar() {
    pararAuto(); var e = document.getElementById('hrCrm'); if (e) e.remove();
    Object.keys(st.blobs).forEach(function (k) { try { URL.revokeObjectURL(st.blobs[k]); } catch (e) {} }); st.blobs = {};
    window.removeEventListener('popstate', voltarHist);
  }
  function voltarHist() { if (st.aberto) { st.aberto = null; pararAuto(); telaLista(); history.pushState({ crm: 1 }, ''); } else fechar(); }
  function pararAuto() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

  function abrir() {
    css(); fechar();
    var d = document.createElement('div'); d.id = 'hrCrm'; document.body.appendChild(d);
    try { history.pushState({ crm: 1 }, ''); window.addEventListener('popstate', voltarHist); } catch (e) {}
    telaLista(); carregarLista();
  }

  // ── lista de clientes ──
  function telaLista() {
    var d = document.getElementById('hrCrm'); if (!d) return; d.classList.remove('wa');
    d.innerHTML = '<div class="crm-top"><button class="crm-ic" data-a="sair">←</button><div style="flex:1;"><b>Clientes</b><div class="crm-info" id="crmSub">Conversas, funil de vendas e painel</div></div>' +
      '<button class="crm-ic" data-a="exportar" title="Exportar">⤓</button><button class="crm-ic" data-a="recarregar" title="Atualizar">⟳</button></div>' +
      '<div class="crm-abas">' + [['conversas', '💬 Conversas'], ['funil', '📊 Funil'], ['painel', '📈 Painel']].map(function (a) { return '<button class="crm-aba' + (st.aba === a[0] ? ' on' : '') + '" data-aba="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      (st.aba === 'conversas' ? '<div class="crm-busca"><span style="color:#c9a84c;">🔍</span><input id="crmQ" placeholder="Pesquisar nome ou número" autocomplete="off"></div>' +
      '<div class="crm-chips" id="crmChips"></div>' +
      '<div class="crm-lista" id="crmLista">' + (st.contatos.length ? '' : '<div class="crm-skel"></div><div class="crm-skel"></div><div class="crm-skel"></div><div class="crm-skel"></div>') + '</div>'
      : st.aba === 'funil' ? '<div class="crm-funil" id="crmFunil"><div class="crm-vazio" style="width:100%"><span class="ic">📊</span>Montando o funil…</div></div>' : '<div class="crm-pn" id="crmPainel"><div class="crm-vazio"><span class="ic">📈</span>Calculando…</div></div>');
    d.onclick = function (ev) {
      var a = ev.target.closest('[data-a]'); if (a) {
        var x = a.getAttribute('data-a');
        if (x === 'sair') { try { history.back(); } catch (e) { fechar(); } }
        else if (x === 'recarregar') { if (st.aba === 'conversas') carregarLista(); else carregarFunil(); }
        else if (x === 'exportar') { if (window.exportarConversasClientes) window.exportarConversasClientes(); }
        return;
      }
      var ab = ev.target.closest('[data-aba]'); if (ab) { st.aba = ab.getAttribute('data-aba'); telaLista(); if (st.aba !== 'conversas') carregarFunil(); return; }
      var ld = ev.target.closest('[data-lead]'); if (ld) { abrirFicha(ld.getAttribute('data-lead')); return; }
      var fc = ev.target.closest('[data-f]'); if (fc) { st.filtro = fc.getAttribute('data-f'); desenharLista(); return; }
      var c = ev.target.closest('[data-num]'); if (c) abrirConversa(c.getAttribute('data-num'));
    };
    var q = document.getElementById('crmQ'); if (q) q.oninput = function () { desenharLista(); };
    if (st.aba === 'conversas') desenharLista(); else desenharFunil();
  }
  function carregarLista() {
    return api('/bot/crm/contatos').then(function (j) { st.contatos = j.contatos || []; desenharLista(); })
      .catch(function (e) { var l = document.getElementById('crmLista'); if (l) l.innerHTML = '<div class="crm-vazio">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function desenharLista() {
    var l = document.getElementById('crmLista'); if (!l || st.aberto) return;
    if (!st.contatos.length) { if (!l.querySelector('.crm-skel')) l.innerHTML = '<div class="crm-vazio"><span class="ic">💬</span>Nenhuma conversa ainda.<br>As próximas mensagens dos clientes aparecem aqui.</div>'; return; }
    var app = nomesApp(), v = vistos(), q = String((document.getElementById('crmQ') || {}).value || '').toLowerCase().trim(), qd = q.replace(/\D/g, '');
    var novasDe = function (c) { var n = c.ultq === 'c' ? Math.max(0, (c.total || 0) - (v[c.num] || 0)) : 0; if (!(c.num in v) && c.ultq === 'c') n = Math.min(n, 9); return n; };
    var cli = st.contatos.filter(function (c) { return !c.eq; }), eqp = st.contatos.filter(function (c) { return c.eq; });
    var hojeS = new Date().toDateString(), ehHoje = function (c) { return new Date(c.ult).toDateString() === hojeS; };
    var nNao = st.contatos.filter(function (c) { return novasDe(c) > 0; }).length, nNovo = cli.filter(function (c) { return !app[so8(c.num)]; }).length;
    var ch = document.getElementById('crmChips');
    if (ch) ch.innerHTML = [['clientes', 'Clientes', cli.length], ['nao', 'Não lidas', nNao], ['novos', 'Novos', nNovo], ['hoje', 'Hoje', cli.filter(ehHoje).length], ['equipe', 'Equipe', eqp.length], ['todos', 'Todas', st.contatos.length]]
      .map(function (x) { return '<button class="crm-chip' + (st.filtro === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + (x[2] ? '<b>' + x[2] + '</b>' : '') + '</button>'; }).join('');
    var lista = st.contatos.filter(function (c) {
      if (st.filtro === 'clientes' && c.eq) return false;
      if (st.filtro === 'equipe' && !c.eq) return false;
      if (st.filtro === 'nao' && !novasDe(c)) return false;
      if (st.filtro === 'novos' && (c.eq || app[so8(c.num)])) return false;
      if (st.filtro === 'hoje' && (c.eq || !ehHoje(c))) return false;
      if (!q) return true;
      var n = nomeDe(c, app).toLowerCase();
      return n.indexOf(q) >= 0 || String(c.perfil || '').toLowerCase().indexOf(q) >= 0 || (qd.length >= 3 && String(c.num).indexOf(qd) >= 0);
    });
    var sub = document.getElementById('crmSub'); if (sub) sub.textContent = cli.length + ' cliente(s) · ' + eqp.length + ' da equipe';
    var nomes = {}; st.contatos.forEach(function (c) { var k = nomeDe(c, app).toLowerCase(); nomes[k] = (nomes[k] || 0) + 1; });
    var secao = function (c) { var d = new Date(c.ult), o = new Date(); o.setDate(o.getDate() - 1); return d.toDateString() === hojeS ? 'Hoje' : d.toDateString() === o.toDateString() ? 'Ontem' : (Date.now() - c.ult < 7 * 86400000 ? 'Esta semana' : 'Antes'); };
    var ult = '';
    l.innerHTML = lista.map(function (c, i) {
      var nm = nomeDe(c, app), novas = novasDe(c), noApp = !!app[so8(c.num)], sc = secao(c), cab = sc !== ult ? '<div class="crm-sec">' + sc + '</div>' : ''; ult = sc;
      var dup = nomes[nm.toLowerCase()] > 1 ? '<span class="crm-fim">· final ' + esc(String(c.num).slice(-4)) + '</span>' : '';
      var tag = c.eq ? '<span class="crm-eq">equipe</span>' : (noApp ? '' : '<span class="crm-tag">novo</span>');
      return cab + '<div class="crm-ct' + (novas ? ' nv' : '') + '" style="animation-delay:' + Math.min(i, 12) * 0.03 + 's" data-num="' + esc(c.num) + '"><div class="crm-av" style="background:' + cor(c.num) + ';">' + esc(iniciais(nm)) + '</div>' +
        '<div class="crm-ct-c"><div class="crm-l1"><span class="crm-nm">' + esc(nm) + dup + tag + '</span><span class="crm-hr' + (novas ? ' nv' : '') + '">' + esc(quando(c.ult)) + '</span></div>' +
        '<div class="crm-l2"><span class="crm-pv">' + (c.ultq === 'b' ? '<span class="crm-bot">🤖</span>' : '') + esc(c.ultx || '') + '</span>' + (novas ? '<span class="crm-bd">' + novas + '</span>' : '') + '</div></div></div>';
    }).join('') || '<div class="crm-vazio"><span class="ic">🔎</span>Nada encontrado' + (st.filtro !== 'todos' ? ' neste filtro.' : '.') + '</div>';
  }


  // ── v4: CRM — funil, painel e ficha ──
  function brl(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function dataCurta(ms) { return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  function carregarFunil() {
    return api('/bot/crm/funil').then(function (j) { st.funil = j; desenharFunil(); })
      .catch(function (e) { var l = document.getElementById('crmFunil') || document.getElementById('crmPainel'); if (l) l.innerHTML = '<div class="crm-vazio" style="width:100%">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function pillsDe(l) {
    var p = [], hj = new Date(); hj.setHours(0, 0, 0, 0);
    if (l.prox) p.push('<span class="crm-pill ' + (l.prox < hj.getTime() ? 'al' : l.prox < hj.getTime() + 86400000 ? 'ou' : '') + '">📅 ' + (l.prox < hj.getTime() + 86400000 && l.prox >= hj.getTime() ? 'hoje' : dataCurta(l.prox)) + (l.proxTxt ? ' · ' + esc(l.proxTxt.slice(0, 22)) : '') + '</span>');
    if (l.parado >= 3 && ['orcamento', 'negociacao', 'atendimento'].indexOf(l.etapa) >= 0) p.push('<span class="crm-pill al">⏳ ' + l.parado + ' dias parado</span>');
    if (l.ultq === 'c' && l.parado < 2 && l.etapa !== 'fechado') p.push('<span class="crm-pill ok">💬 respondeu</span>');
    (l.tags || []).forEach(function (t) { p.push('<span class="crm-pill">#' + esc(t) + '</span>'); });
    return p.length ? '<div class="crm-pills">' + p.join('') + '</div>' : '';
  }
  function desenharFunil() {
    var j = st.funil;
    if (st.aba === 'funil') {
      var f = document.getElementById('crmFunil'); if (!f) return; if (!j) { carregarFunil(); return; }
      f.innerHTML = j.etapas.map(function (e) {
        var ls = j.leads.filter(function (l) { return l.etapa === e.k; }), tot = ls.reduce(function (t, l) { return t + (l.valor || 0); }, 0);
        if (e.k === 'perdido' || e.k === 'fechado') ls = ls.slice(0, 40);
        return '<div class="crm-col"><div class="crm-colh"><b>' + esc(e.n) + '<span>' + ls.length + '</span></b><small>' + (tot ? brl(tot) : '—') + '</small></div><div class="crm-cols">' +
          (ls.map(function (l) { return '<div class="crm-card" data-lead="' + esc(l.k) + '"><div class="n"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(l.nome) + '</span>' + (l.valor ? '<span class="v">' + brl(l.valor) + '</span>' : '') + '</div>' +
            '<div class="s">' + esc(l.interesse || l.ultx || '') + '</div>' + pillsDe(l) + '</div>'; }).join('') || '<div class="crm-vazio" style="padding:24px 8px;font-size:.8rem;">Ninguém aqui</div>') + '</div></div>';
      }).join('');
    } else if (st.aba === 'painel') {
      var pn = document.getElementById('crmPainel'); if (!pn) return; if (!j) { carregarFunil(); return; }
      var r = j.resumo, max = Math.max.apply(null, j.etapas.map(function (e) { return (r.porEtapa[e.k] || {}).n || 0; }).concat([1]));
      var hj = new Date(); hj.setHours(23, 59, 59, 999);
      var acoes = j.leads.filter(function (l) { return l.prox && l.prox <= hj.getTime() && ['fechado', 'perdido'].indexOf(l.etapa) < 0; }).sort(function (a, b) { return a.prox - b.prox; });
      var parados = j.leads.filter(function (l) { return ['orcamento', 'negociacao'].indexOf(l.etapa) >= 0 && l.parado >= 3; }).sort(function (a, b) { return (b.valor || 0) - (a.valor || 0); }).slice(0, 12);
      var item = function (l, extra) { return '<div class="crm-card" data-lead="' + esc(l.k) + '"><div class="n"><span>' + esc(l.nome) + '</span>' + (l.valor ? '<span class="v">' + brl(l.valor) + '</span>' : '') + '</div><div class="s">' + extra + '</div></div>'; };
      pn.innerHTML = '<div class="crm-kpis">' +
        '<div class="crm-kpi"><small>Em negociação</small><b>' + brl(r.valorAberto) + '</b><i>' + r.aberto + ' cliente(s) no funil</i></div>' +
        '<div class="crm-kpi"><small>Fechado em 30 dias</small><b>' + brl(r.valorGanho30) + '</b><i>' + r.ganhos30 + ' venda(s)</i></div>' +
        '<div class="crm-kpi"><small>Conversão (30 dias)</small><b>' + r.conversao + '%</b><i>' + r.ganhos30 + ' ganhos · ' + r.perdidos30 + ' perdidos</i></div>' +
        '<div class="crm-kpi"><small>Novos (7 dias)</small><b>' + r.novos7 + '</b><i>contatos novos</i></div>' +
        '<div class="crm-kpi"><small>Retornos hoje</small><b>' + (r.acoesHoje + r.atrasadas) + '</b><i>' + (r.atrasadas ? r.atrasadas + ' atrasado(s)' : 'em dia') + '</i></div>' +
        '<div class="crm-kpi"><small>Orçamentos parados</small><b>' + r.parados + '</b><i>sem resposta há 3+ dias</i></div></div>' +
        '<div class="crm-lb">Funil</div>' + j.etapas.map(function (e) { var x = r.porEtapa[e.k] || { n: 0, valor: 0 }; return '<div class="crm-bar"><span class="t">' + esc(e.n) + '</span><span class="b"><i style="width:' + Math.round(x.n / max * 100) + '%"></i></span><span class="q">' + x.n + '</span></div>'; }).join('') +
        '<div class="crm-lb">Retornos de hoje</div>' + (acoes.map(function (l) { return item(l, '📅 ' + (l.proxTxt ? esc(l.proxTxt) : 'retornar') + (l.prox < new Date().setHours(0, 0, 0, 0) ? ' · <b style="color:#ff8a96">atrasado</b>' : '')); }).join('') || '<div class="crm-sem">Nenhum retorno marcado para hoje.</div>') +
        '<div class="crm-lb">Orçamentos esperando resposta</div>' + (parados.map(function (l) { return item(l, '⏳ ' + l.parado + ' dias sem resposta · ' + esc(l.interesse || '')); }).join('') || '<div class="crm-sem">Nenhum orçamento parado. 👏</div>');
    }
  }
  function fecharFicha() { var e = document.getElementById('crmSheet'); if (e) e.remove(); }
  function abrirFicha(k) {
    fecharFicha(); var d = document.createElement('div'); d.className = 'crm-sheet'; d.id = 'crmSheet';
    d.innerHTML = '<div class="crm-sh"><div class="gr"></div><div class="crm-vazio">Abrindo a ficha…</div></div>'; document.body.appendChild(d);
    d.onclick = function (ev) { if (ev.target === d) fecharFicha(); };
    var key = k; if (/^\d+$/.test(k) && st.funil) { var f = st.funil.leads.find(function (l) { return l.num && so8(l.num) === so8(k); }); if (f) key = f.k; }
    api('/bot/crm/ficha?k=' + encodeURIComponent(key)).then(function (j) { desenharFicha(j); }).catch(function (e) { d.querySelector('.crm-sh').innerHTML = '<div class="gr"></div><div class="crm-vazio">⚠️ ' + esc(e.message) + '<br><small>Ficha só existe para clientes (equipe não entra no funil).</small></div>'; });
  }
  function desenharFicha(j) {
    var d = document.getElementById('crmSheet'); if (!d) return; var l = j.lead, at = j.atendimento || {}, ed = { etapa: l.etapa, tags: (l.tags || []).slice() };
    var dIso = l.prox ? new Date(l.prox - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
    var orcs = (l.orcs || []).map(function (o) { return '<div class="crm-li"><span>' + esc((o.num ? o.num + ' · ' : '') + (o.proj || 'Orçamento')) + '<br><small style="color:#9a917e">' + esc(o.data.split('-').reverse().join('/')) + ' · ' + esc(o.status || '') + '</small></span><span>' + brl(o.valor) + '</span></div>'; }).join('');
    var liv = (j.livro || []).map(function (r) { return '<div class="crm-li"><span>' + esc(r.desc || 'Serviço') + (r.entrega ? '<br><small style="color:#9a917e">entrega ' + esc(r.entrega.split('-').reverse().join('/')) + '</small>' : '') + '</span><span>pago ' + brl(r.pago) + (r.saldo > 0.009 ? '<br><small style="color:#ff8a96">falta ' + brl(r.saldo) + '</small>' : ' ✅') + '</span></div>'; }).join('');
    var atd = [['Interesse', at.interesse || l.interesse], ['Pedra', at.pedra], ['Medidas', at.medidas], ['Endereço', at.endereco || l.local], ['Visita', at.visita]].filter(function (x) { return x[1]; }).map(function (x) { return '<div class="crm-li"><span style="color:#9a917e">' + x[0] + '</span><span style="color:#efe9dc;font-weight:500;text-align:right">' + esc(x[1]) + '</span></div>'; }).join('');
    var tel = String(l.num || '').replace(/\D/g, '');
    d.querySelector('.crm-sh').innerHTML = '<div class="gr"></div><h3>' + esc(l.nome) + '</h3><div class="sub">' + (tel ? esc(fmtNum(tel)) + ' · ' : '') + (l.manual ? 'etapa marcada pelo senhor' : 'etapa automática') + '</div>' +
      '<div class="crm-acts">' + (tel ? '<button class="crm-act" data-fa="conversa">💬 Conversa</button><a class="crm-act" href="https://wa.me/' + tel + '" target="_blank" rel="noopener">🟢 WhatsApp</a><a class="crm-act" href="tel:+' + tel + '">📞 Ligar</a>' : '<span class="crm-sem">Sem telefone (veio de um orçamento do app).</span>') + '</div>' +
      '<div class="crm-lb">Etapa</div><div class="crm-ets">' + j.etapas.map(function (e) { return '<button class="crm-et' + (e.k === l.etapa ? ' on' : '') + '" data-et="' + e.k + '">' + esc(e.n) + '</button>'; }).join('') + '</div>' +
      '<div id="crmMot" style="' + (l.etapa === 'perdido' ? '' : 'display:none') + '"><div class="crm-lb">Por que perdeu?</div><input class="crm-in" id="fMot" placeholder="preço, prazo, desistiu, fechou com outro…" value="' + esc(l.motivo || '') + '"></div>' +
      '<div class="crm-lb">Valor do negócio</div><input class="crm-in" id="fVal" inputmode="decimal" placeholder="0,00" value="' + (l.valor ? String(l.valor).replace('.', ',') : '') + '">' +
      '<div class="crm-lb">Próximo retorno</div><div class="crm-row2"><input class="crm-in" type="date" id="fData" value="' + dIso + '" style="flex:1"><button class="crm-qk" data-qd="1">Amanhã</button><button class="crm-qk" data-qd="3">3 dias</button><button class="crm-qk" data-qd="7">1 sem.</button></div>' +
      '<input class="crm-in" id="fProx" style="margin-top:8px" placeholder="O que fazer (ex.: ligar para fechar o orçamento)" value="' + esc(l.proxTxt || '') + '">' +
      '<div class="crm-lb">Etiquetas</div><div class="crm-ets" id="fTags"></div><div class="crm-row2" style="margin-top:8px"><input class="crm-in" id="fTag" placeholder="nova etiqueta (ex.: indicação, urgente, construtora)"><button class="crm-qk" data-a2="tag">＋</button></div>' +
      '<div class="crm-lb">Anotação</div><textarea class="crm-in" id="fNota" rows="2" placeholder="Escreva o que conversou ou combinou…"></textarea>' + (l.notas ? '<div class="crm-nota" style="margin-top:8px">' + esc(l.notas) + '</div>' : '') +
      '<button class="crm-sv" data-a2="salvar">Salvar ficha</button>' +
      (atd ? '<div class="crm-lb">Atendimento da Helena</div>' + atd : '') +
      (orcs ? '<div class="crm-lb">Orçamentos</div>' + orcs : '') +
      (liv ? '<div class="crm-lb">Pagamentos</div>' + liv : '');
    var tagsEl = function () { document.getElementById('fTags').innerHTML = ed.tags.map(function (t, i) { return '<button class="crm-et on" data-rt="' + i + '">#' + esc(t) + ' ✕</button>'; }).join('') || '<span class="crm-sem">Sem etiquetas.</span>'; }; tagsEl();
    d.querySelector('.crm-sh').onclick = function (ev) {
      var e = ev.target.closest('[data-et]'); if (e) { ed.etapa = e.getAttribute('data-et'); [].forEach.call(d.querySelectorAll('[data-et]'), function (b) { b.classList.toggle('on', b === e); }); document.getElementById('crmMot').style.display = ed.etapa === 'perdido' ? '' : 'none'; return; }
      var q = ev.target.closest('[data-qd]'); if (q) { var t = new Date(); t.setDate(t.getDate() + Number(q.getAttribute('data-qd'))); document.getElementById('fData').value = new Date(t - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10); return; }
      var rt = ev.target.closest('[data-rt]'); if (rt) { ed.tags.splice(Number(rt.getAttribute('data-rt')), 1); tagsEl(); return; }
      var fa = ev.target.closest('[data-fa]'); if (fa) { fecharFicha(); abrirConversa(l.num); return; }
      var a2 = ev.target.closest('[data-a2]'); if (!a2) return; var x = a2.getAttribute('data-a2');
      if (x === 'tag') { var v = document.getElementById('fTag').value.trim().replace(/^#/, ''); if (v && ed.tags.indexOf(v) < 0) ed.tags.push(v); document.getElementById('fTag').value = ''; tagsEl(); return; }
      if (x === 'salvar') {
        var dv = document.getElementById('fData').value, corpo = { k: l.k, tags: ed.tags, valor: parseFloat(String(document.getElementById('fVal').value || '0').replace(/\./g, '').replace(',', '.')) || 0,
          prox: dv ? new Date(dv + 'T09:00:00').getTime() : 0, proxTxt: document.getElementById('fProx').value.trim(), nota: document.getElementById('fNota').value.trim(), motivo: (document.getElementById('fMot') || {}).value || '' };
        if (ed.etapa !== l.etapa) corpo.etapa = ed.etapa;
        a2.disabled = true; a2.textContent = 'Salvando…';
        apiPost('/bot/crm/lead', corpo).then(function () { try { toast('Ficha salva ✅'); } catch (e) {} fecharFicha(); if (st.aba !== 'conversas') carregarFunil(); else st.funil = null; })
          .catch(function (e) { a2.disabled = false; a2.textContent = 'Salvar ficha'; try { toast('Não salvou: ' + e.message); } catch (x) {} });
      }
    };
  }

  // ── conversa ──
  function abrirConversa(num) {
    st.aberto = num; st.msgs = []; st.sig = ''; st.vistosIds = {}; delete st.sig0;
    var c = st.contatos.find(function (x) { return x.num === num; }) || { num: num }, app = nomesApp(), nm = nomeDe(c, app), cli = app[so8(num)];
    var d = document.getElementById('hrCrm'); if (!d) return; d.classList.add('wa');
    d.innerHTML = '<div class="crm-top"><button class="crm-ic" data-a="voltar" aria-label="Voltar">←</button><div class="crm-av" style="width:40px;height:40px;font-size:.85rem;background:' + cor(num) + ';">' + esc(iniciais(nm)) + '</div>' +
      '<div style="flex:1;min-width:0;"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(nm) + '</b><div class="crm-info" id="crmJanela">' + esc(fmtNum(num)) + (cli && appConflita(c, cli) ? ' · ⚠️ no app está como "' + esc(cli.nome) + '"' : '') + '</div></div>' +
      '<a class="crm-ic" href="https://wa.me/' + esc(String(num).replace(/\D/g, '')) + '" target="_blank" rel="noopener" title="Abrir no WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.3.1.2.1.7-.1 1.3z"/></svg></a><button class="crm-ic" data-a="ficha" title="Ficha do cliente">📋</button><button class="crm-ic" data-a="recarregar" title="Atualizar">⟳</button></div>' +
      '<div class="crm-chat" id="crmChat"><div class="crm-vazio"><span class="ic">💬</span>Carregando conversa…</div></div>' +
      '<div id="crmPrev"></div>' +
      '<div class="crm-comp"><div class="crm-campo"><textarea id="crmTxt" rows="1" placeholder="Mensagem"></textarea></div><button class="crm-env" id="crmEnv" data-a="revisar" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.1 21.8 23 12 1.1 2.2 1.1 9.8 16.8 12 1.1 14.2z"/></svg></button></div>';
    var tx = document.getElementById('crmTxt'); tx.oninput = function () { tx.style.height = 'auto'; tx.style.height = Math.min(140, tx.scrollHeight) + 'px'; };
    d.onclick = function (ev) {
      var a = ev.target.closest('[data-a]');
      if (a) {
        var x = a.getAttribute('data-a');
        if (x === 'voltar') { try { history.back(); } catch (e) { st.aberto = null; telaLista(); } }
        else if (x === 'recarregar') carregarConversa(false);
        else if (x === 'ficha') abrirFicha(num);
        else if (x === 'mais') carregarMais();
        else if (x === 'revisar') revisar();
        else if (x === 'enviar') enviarRevisado();
        else if (x === 'cancelar') fecharPrev();
        else if (x === 'original') { var p = document.getElementById('crmPrevTx'); if (p && st.rascunho) p.value = st.rascunho; }
        return;
      }
      var im = ev.target.closest('img[data-zoom]'); if (im && im.src) { zoom(im.src); return; }
      var dc = ev.target.closest('[data-doc]'); if (dc) abrirDoc(dc.getAttribute('data-doc'), dc.getAttribute('data-nome'), dc.getAttribute('data-mime'));
    };
    carregarConversa(true);
    pararAuto(); st.timer = setInterval(function () { if (!document.hidden && st.aberto === num) carregarConversa(false, true); }, 10000);
  }
  function carregarConversa(primeira, silencioso) {
    var num = st.aberto; if (!num) return;
    api('/bot/crm/conversa?num=' + encodeURIComponent(num) + '&lim=200').then(function (j) {
      if (st.aberto !== num) return;
      var ms = j.mensagens || [], sig = ms.length + ':' + (ms.length ? ms[ms.length - 1].id + ms[ms.length - 1].st : '') + ':' + ms.map(function (m) { return m.st; }).join('');
      var jan = document.getElementById('crmJanela');
      if (jan) { var ok = j.janelaAte > Date.now(); st.livre = ok; jan.textContent = fmtNum(num) + ' · ' + (ok ? 'livre até ' + hora(j.janelaAte) + (new Date(j.janelaAte).toDateString() !== new Date().toDateString() ? ' de amanhã' : '') : 'fora das 24 h (vai como modelo, até 200 letras)'); var tx = document.getElementById('crmTxt'); if (tx) tx.placeholder = ok ? 'Mensagem' : 'Mensagem curta (fora das 24 h)'; }
      if (silencioso && sig === st.sig) return;
      var antigas = st.msgs.filter(function (m) { return !ms.some(function (x) { return x.id === m.id; }) && (!ms.length || m.ts < ms[0].ts); });
      st.msgs = antigas.concat(ms); if (primeira) st.mais = !!j.mais; st.sig = sig;
      var ch = document.getElementById('crmChat'), noFim = !ch || ch.scrollHeight - ch.scrollTop - ch.clientHeight < 80;
      desenharConversa(); if (primeira || noFim) rolarFim();
      var c = st.contatos.find(function (x) { return x.num === num; }); if (c) marcarVisto(num, c.total || 0);
    }).catch(function (e) { var ch = document.getElementById('crmChat'); if (ch && !st.msgs.length) ch.innerHTML = '<div class="crm-vazio">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function carregarMais() {
    var num = st.aberto; if (!num || !st.msgs.length) return;
    var ch = document.getElementById('crmChat'), alt = ch ? ch.scrollHeight : 0;
    api('/bot/crm/conversa?num=' + encodeURIComponent(num) + '&lim=200&antes=' + st.msgs[0].ts).then(function (j) {
      if (st.aberto !== num) return;
      st.msgs = (j.mensagens || []).concat(st.msgs); st.mais = !!j.mais; desenharConversa();
      if (ch) ch.scrollTop = ch.scrollHeight - alt;
    }).catch(function (e) { toast('⚠️ ' + e.message); });
  }
  function apiPost(cam, corpo) {
    var b = base(); if (!b) return Promise.reject(new Error('O bot não está configurado neste aparelho (Config → Bot).'));
    var h = Object.assign({ 'Content-Type': 'application/json' }, hdr());
    return fetch(b + cam, { method: 'POST', headers: h, body: JSON.stringify(corpo) }).then(function (r) { return r.json().catch(function () { return { error: 'Resposta inválida do bot (' + r.status + ').' }; }); })
      .then(function (j) { if (j && j.error) throw new Error(j.error); return j; });
  }
  var ICON_ENV = document.createElement('div');
  function botaoGira(on) { var b = document.getElementById('crmEnv'); if (!b) return; if (on) { if (!ICON_ENV.innerHTML) ICON_ENV.innerHTML = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="crm-gira"></span>'; } else { b.disabled = false; if (ICON_ENV.innerHTML) b.innerHTML = ICON_ENV.innerHTML; } }
  // o senhor escreve do seu jeito → a Helena reescreve → o senhor confere e toca Enviar
  function revisar() {
    var tx = document.getElementById('crmTxt'), t = tx ? tx.value.trim() : ''; if (!t || !st.aberto) { if (tx) tx.focus(); return; }
    st.rascunho = t; botaoGira(true);
    apiPost('/bot/crm/revisar', { num: st.aberto, texto: t }).then(function (j) {
      botaoGira(false);
      var p = document.getElementById('crmPrev'); if (!p) return;
      p.innerHTML = '<div class="crm-prev"><div class="tt">A Helena vai enviar assim<span>' + (j.livre ? 'pode editar' : 'fora das 24 h · até 200 letras') + '</span></div><textarea id="crmPrevTx" rows="3"' + (j.livre ? '' : ' maxlength="200"') + '>' + esc(j.texto) + '</textarea>' +
        '<div class="bx"><button class="orig" data-a="original">Usar o meu texto</button><button class="no" data-a="cancelar">Cancelar</button><button class="ok" data-a="enviar">Enviar</button></div></div>';
      var pt = document.getElementById('crmPrevTx'); pt.style.height = Math.min(220, pt.scrollHeight + 4) + 'px';
    }).catch(function (e) { botaoGira(false); toast('⚠️ ' + e.message); });
  }
  function fecharPrev() { var p = document.getElementById('crmPrev'); if (p) p.innerHTML = ''; }
  function enviarRevisado() {
    var pt = document.getElementById('crmPrevTx'), t = pt ? pt.value.trim() : ''; if (!t || !st.aberto) return;
    var num = st.aberto, ok = document.querySelector('.crm-prev .ok'); if (ok) { ok.disabled = true; ok.textContent = 'Enviando…'; }
    apiPost('/bot/crm/enviar', { num: num, texto: t }).then(function () {
      fecharPrev(); var tx = document.getElementById('crmTxt'); if (tx) { tx.value = ''; tx.style.height = 'auto'; } st.rascunho = '';
      st.msgs.push({ id: 'tmp' + Date.now(), ts: Date.now(), q: 'b', tipo: 'text', texto: t, st: 'sent' }); desenharConversa(); rolarFim();
      setTimeout(function () { if (st.aberto === num) carregarConversa(false); }, 2500);
    }).catch(function (e) { if (ok) { ok.disabled = false; ok.textContent = 'Enviar'; } toast('⚠️ ' + e.message); });
  }
  function rolarFim() { var ch = document.getElementById('crmChat'); if (ch) { ch.scrollTop = ch.scrollHeight; setTimeout(function () { ch.scrollTop = ch.scrollHeight; }, 300); } }

  function tique(m) {
    if (m.q !== 'b') return '';
    if (m.st === 'failed') return '<span class="crm-tk erro" title="Não entregue">⚠</span>';
    if (m.st === 'read') return '<span class="crm-tk lido">✓✓</span>';
    if (m.st === 'delivered') return '<span class="crm-tk">✓✓</span>';
    return '<span class="crm-tk">✓</span>';
  }
  function midiaHtml(m) {
    var r = m.midia, ex = m.extra || {};
    if (!r) {
      if (m.tipo === 'location' && ex.lat != null) return '<a href="https://maps.google.com/?q=' + esc(ex.lat + ',' + ex.lng) + '" target="_blank" rel="noopener" style="display:block;margin-bottom:3px;">📍 Ver no mapa</a>';
      if (['image', 'video', 'audio', 'document', 'sticker'].indexOf(m.tipo) < 0) return '';
      var rot = { image: '📷 Foto', video: '🎥 Vídeo', audio: '🎤 Áudio', document: '📄 ' + (m.arq || 'Documento'), sticker: 'Figurinha' }[m.tipo];
      var pq = m.expirado ? 'o arquivo não está mais disponível' : m.grande ? 'arquivo grande' : ex.antigo ? 'de antes do CRM' : 'sem arquivo';
      return '<div class="crm-sem">' + rot + ' — ' + pq + '</div>';
    }
    var a = 'data-ref="' + esc(r) + '"';
    if (m.tipo === 'image') return '<img class="crm-img" ' + a + ' data-zoom="1" alt="">';
    if (m.tipo === 'sticker') return '<img class="crm-img crm-stk" ' + a + ' data-zoom="1" alt="">';
    if (m.tipo === 'video') return '<video class="crm-vid" ' + a + ' controls playsinline preload="metadata"></video>';
    if (m.tipo === 'audio') return '<audio class="crm-aud" ' + a + ' controls preload="none"></audio>';
    if (m.tipo === 'document') {
      var nm = m.arq || 'Documento', pdf = /pdf/i.test(m.mime || '') || /\.pdf$/i.test(nm);
      return '<div class="crm-doc" data-doc="' + esc(r) + '" data-nome="' + esc(nm) + '" data-mime="' + esc(m.mime || '') + '"><span class="ic">' + (pdf ? '📕' : '📄') + '</span><div style="min-width:0;"><div class="nm">' + esc(nm) + '</div><div class="sb">' + (pdf ? 'PDF' : 'Arquivo') + ' · toque para abrir</div></div></div>';
    }
    return '';
  }
  function desenharConversa() {
    var ch = document.getElementById('crmChat'); if (!ch) return;
    if (!st.msgs.length) { ch.innerHTML = '<div class="crm-vazio">Sem mensagens guardadas.</div>'; return; }
    var porWamid = {}; st.msgs.forEach(function (m) { if (m.wamid) porWamid[m.wamid] = m; });
    var h = st.mais ? '<button class="crm-mais" data-a="mais">Carregar mensagens anteriores</button>' : '', dia = '';
    st.msgs.forEach(function (m) {
      var d = diaTxt(m.ts); if (d !== dia) { dia = d; h += '<div class="crm-dia"><span>' + esc(d) + '</span></div>'; }
      var ex = m.extra || {}, q = m.q === 'b' ? 'b' : 'c';
      if (m.tipo === 'reaction') { h += '<div class="crm-row ' + q + '"><span class="crm-rea" title="Reação">' + esc(m.texto || '') + '</span></div>'; return; }
      var topo = '';
      if (ex.modelo) topo += '<div class="crm-mdl">📋 Modelo da Meta: ' + esc(ex.modelo) + '</div>';
      if (ex.citou && porWamid[ex.citou] && !ex.resposta) { var cit = porWamid[ex.citou]; topo += '<div class="crm-resp">↩ respondendo: ' + esc(String(cit.texto || cit.arq || '[' + cit.tipo + ']').slice(0, 60)) + '</div>'; }
      if (ex.resposta) topo += '<div class="crm-resp">↩ tocou no botão</div>';
      var txt = m.texto ? (m.tipo === 'audio' ? '<div class="crm-trans">' + (q === 'b' ? '🔊 ' : '📝 ') + fmtTexto(m.texto) + '</div>' : '<div>' + fmtTexto(m.texto) + '</div>') : '';
      var bts = '';
      if (ex.botoes && ex.botoes.length) bts = '<div class="crm-bts">' + ex.botoes.map(function (b) { return '<div class="crm-bt">' + esc(b) + '</div>'; }).join('') + '</div>';
      else if (ex.lista && ex.lista.itens) bts = '<div class="crm-bts"><div class="crm-bt">☰ ' + esc(ex.lista.botao || 'Opções') + '</div></div><div class="crm-info" style="margin-top:3px;">' + ex.lista.itens.map(esc).join(' · ') + '</div>';
      var nova = st.sig0 !== undefined && !st.vistosIds[m.id]; st.vistosIds[m.id] = 1;
      h += '<div class="crm-row ' + q + (nova ? ' novo' : '') + '"><div style="max-width:82%;display:flex;flex-direction:column;align-items:' + (q === 'b' ? 'flex-end' : 'flex-start') + ';"><div class="crm-bb" style="max-width:100%;">' + topo + midiaHtml(m) + txt +
        '<span class="crm-meta">' + esc(hora(m.ts)) + tique(m) + '</span><div style="clear:both;"></div></div>' + bts + '</div></div>';
    });
    ch.innerHTML = h; st.sig0 = 1;
    ligarMidias();
  }

  // arquivos: só carrega o que aparece na tela (com a chave do bot) e guarda como blob
  function blobDe(ref) {
    if (st.blobs[ref]) return Promise.resolve(st.blobs[ref]);
    if (ref.indexOf('u:') === 0) return Promise.resolve(ref.slice(2));
    return fetch(base() + '/bot/crm/midia?r=' + encodeURIComponent(ref), { headers: hdr() }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || 'Arquivo indisponível.'); });
      return r.blob();
    }).then(function (b) { var u = URL.createObjectURL(b); st.blobs[ref] = u; return u; });
  }
  function carregarEl(el) {
    if (el.getAttribute('data-ok')) return; el.setAttribute('data-ok', '1');
    blobDe(el.getAttribute('data-ref')).then(function (u) { el.src = u; }).catch(function (e) {
      var s = document.createElement('div'); s.className = 'crm-sem'; s.textContent = '⚠️ ' + e.message; el.replaceWith(s);
    });
  }
  function ligarMidias() {
    var els = document.querySelectorAll('#crmChat [data-ref]:not([data-ok])');
    if (!('IntersectionObserver' in window)) { els.forEach(carregarEl); return; }
    if (st.obs) st.obs.disconnect();
    st.obs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { st.obs.unobserve(e.target); carregarEl(e.target); } }); }, { root: document.getElementById('crmChat'), rootMargin: '300px' });
    els.forEach(function (e) { st.obs.observe(e); });
  }
  function abrirDoc(ref, nome, mime) {
    toast('Abrindo ' + (nome || 'arquivo') + '…');
    blobDe(ref).then(function (u) {
      var w = window.open(u, '_blank');
      if (!w) { var a = document.createElement('a'); a.href = u; a.download = nome || 'arquivo'; document.body.appendChild(a); a.click(); a.remove(); }
    }).catch(function (e) { toast('⚠️ ' + e.message); });
  }
  function zoom(src) {
    var z = document.createElement('div'); z.id = 'hrCrmZoom'; z.innerHTML = '<img src="' + src + '" alt="">';
    z.onclick = function () { z.remove(); }; document.body.appendChild(z);
  }

  window.abrirCRM = abrir;
  window.abrirConversasClientes = abrir;
})();
