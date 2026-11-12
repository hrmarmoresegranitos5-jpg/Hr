// ═══════════════════════════════════════════════════════════════════
// PONTO PELO CELULAR (HR Ponto) — tela do dono, dentro do RH
// O funcionário bate o ponto no próprio celular em <bot>/ponto (app instalável).
// Aqui o dono: cadastra a oficina (Wi-Fi + localização), gera o código de ativação de cada um,
// libera obra externa, vê as batidas de hoje (com foto), confirma/recusa as que ficaram aguardando,
// faz ajuste com motivo. Os dias completos entram SOZINHOS em hr_registros (mesmo cálculo da importação).
// Usa o mesmo bot (Configurações → WhatsApp Bot: URL + chave). Carregar DEPOIS de app-secretaria.js.
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (window.HRPonto) return;
  var GOLD = '#C9A84C', T2 = 'rgba(255,255,255,.72)', T3 = 'rgba(255,255,255,.45)', BD = 'rgba(255,255,255,.1)';
  var TIPOS = { entrada: 'Entrada', saida_almoco: 'Saída almoço', volta_almoco: 'Volta almoço', saida: 'Saída', extra: 'Extra' };
  var estado = { cfg: null, link: '', dias: {}, ativos: {}, funcs: [] };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function hoje() { return typeof td === 'function' ? td() : new Date().toISOString().slice(0, 10); }
  function toastP(m) { if (typeof toast === 'function') toast(m); else alert(m); }
  function bot() { try { var c = _getBotCfg(); return c && c.url && c.key ? c : null; } catch (e) { return null; } }
  function api(rota, corpo) {
    var c = bot(); if (!c) return Promise.reject(new Error('Configure o bot primeiro (Secretária → WhatsApp Bot: endereço e chave).'));
    return fetch(String(c.url).replace(/\/+$/, '') + rota, { method: corpo ? 'POST' : 'GET', headers: _botHeaders(), body: corpo ? JSON.stringify(corpo) : undefined })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || ('Erro ' + r.status)); return j; }); });
  }
  function funcsRH() {
    var raw = {}; try { raw = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch (e) {}
    var lista = Array.isArray(raw) ? raw : Object.keys(raw).map(function (k) { var f = raw[k]; if (f && f.id == null) f.id = k; return f; });
    return lista.filter(function (f) { return f && f.nome && f.ativo !== false && !f.socio; })
      .map(function (f) { return { id: String(f.id), nome: String(f.nome).trim(), tel: String(f.telefone || f.tel || '').replace(/\D/g, '') }; });
  }

  // ── abrir ──
  function abrir() {
    var old = document.getElementById('hrPontoMd'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'hrPontoMd';
    m.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div id="hrPontoBox" style="width:100%;max-width:560px;max-height:94vh;overflow:auto;background:#0d0d14;border-top:2px solid ' + GOLD + ';border-radius:18px 18px 0 0;padding:16px 16px 28px;color:#fff;font-family:Outfit,sans-serif;"><div style="text-align:center;color:' + T3 + ';padding:30px 0;">Carregando o ponto…</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    estado.funcs = funcsRH();
    api('/bot/ponto/config', { funcs: estado.funcs, feriados: feriadosRH() })
      .then(function () { return api('/bot/ponto/config'); })
      .then(function (j) { estado.cfg = j.cfg; estado.link = /^https?:/.test(j.link || '') ? j.link : String(bot().url).replace(/\/+$/, '') + '/ponto'; return api('/bot/ponto/registros?de=' + hoje() + '&ate=' + hoje()); })
      .then(function (j) { estado.dias = j.dias || {}; estado.ativos = j.ativos || {}; estado.push = j.push || {}; desenha(); })
      .catch(function (e) { document.getElementById('hrPontoBox').innerHTML = '<div style="padding:20px;color:#f87171;">' + esc(e.message) + '</div>' + btnFechar(); });
  }
  function btnFechar() { return '<button onclick="document.getElementById(\'hrPontoMd\').remove()" style="width:100%;margin-top:14px;padding:12px;border-radius:10px;border:1px solid ' + BD + ';background:none;color:' + T2 + ';">Fechar</button>'; }
  var sec = function (t) { return '<div style="font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:' + GOLD + ';margin:18px 0 8px;">' + t + '</div>'; };
  var btn = function (txt, on, cor) { return '<button onclick="' + on + '" style="padding:8px 11px;border-radius:9px;border:1px solid ' + (cor || BD) + ';background:rgba(255,255,255,.04);color:' + (cor || '#fff') + ';font-size:.74rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">' + txt + '</button>'; };

  function desenha() {
    var c = estado.cfg || {}, h = '';
    h += '<div style="display:flex;align-items:center;gap:10px;"><div style="font-size:1.4rem;">📱</div><div><div style="font-weight:800;color:' + GOLD + ';">Ponto pelo celular</div><div style="font-size:.72rem;color:' + T3 + ';">Link do app dos funcionários: ' + esc(estado.link) + '</div></div></div>';
    // oficina
    var okRede = (c.ips || []).length > 0, okLoc = c.lat != null;
    h += sec('1. A oficina');
    h += '<div style="padding:12px;border:1px solid ' + BD + ';border-radius:12px;font-size:.8rem;line-height:1.6;">'
      + (okRede ? '✅ Wi-Fi da oficina cadastrado (' + c.ips.length + ')' : '⚠️ Wi-Fi da oficina <b>não cadastrado</b>') + '<br>'
      + (okLoc ? '✅ Localização cadastrada · raio ' + (c.raio || 150) + ' m' : '⚠️ Localização <b>não cadastrada</b>') + '<br>'
      + '<span style="color:' + T3 + ';">Faça isto <b>dentro da oficina, conectado no Wi-Fi dela</b>:</span>'
      + '<button onclick="HRPonto.cadastrarOficina()" style="width:100%;margin-top:8px;padding:12px;border-radius:10px;border:none;background:' + GOLD + ';color:#000;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;">📍 Estou na oficina: cadastrar Wi-Fi e localização</button>'
      + '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;"><span style="flex:1;color:' + T2 + ';">Avisar saída esquecida às</span><input id="hpAviso" type="time" value="' + esc(c.aviso || '18:00') + '" style="padding:7px;border-radius:8px;border:1px solid ' + BD + ';background:#14141c;color:#fff;">'
      + btn('Salvar', 'HRPonto.salvarAviso()') + '</div></div>';
    // lembretes
    var L = c.lemb || {}, inp = function (id, v, tipo) { return '<input id="' + id + '" type="' + (tipo || 'time') + '" value="' + esc(v) + '" style="width:100%;box-sizing:border-box;padding:7px;border-radius:8px;border:1px solid ' + BD + ';background:#14141c;color:#fff;font-family:Outfit,sans-serif;">'; };
    h += sec('Lembrete de ponto esquecido');
    h += '<div style="padding:12px;border:1px solid ' + BD + ';border-radius:12px;font-size:.8rem;line-height:1.5;">'
      + '<label style="display:flex;gap:8px;align-items:center;font-weight:700;"><input id="hlOn" type="checkbox"' + (L.ligado !== false ? ' checked' : '') + '> Avisar no celular do funcionário</label>'
      + '<div style="color:' + T3 + ';margin:4px 0 10px;">Se não bater até o horário, chega uma notificação do HR Ponto (ou WhatsApp, se ele não ligou as notificações). Domingo e feriado do RH não avisa.</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      + '<div>Entrada até' + inp('hlEnt', L.entrada || '07:15') + '</div><div>Saída a partir de' + inp('hlSai', L.saida || '17:45') + '</div>'
      + '<div>Saída no sábado' + inp('hlSab', L.sabado || '12:15') + '</div><div>Almoço (minutos)' + inp('hlAlm', L.almoco || 80, 'number') + '</div></div>'
      + '<button onclick="HRPonto.salvarLemb()" style="width:100%;margin-top:10px;padding:11px;border-radius:10px;border:none;background:' + GOLD + ';color:#000;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;">Salvar lembretes</button></div>';
    // funcionários
    h += sec('2. Funcionários');
    estado.funcs.forEach(function (f) {
      var at = estado.ativos[f.id];
      h += '<div style="padding:10px 12px;border:1px solid ' + BD + ';border-radius:12px;margin-bottom:8px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><b style="font-size:.88rem;">' + esc(f.nome) + '</b><span style="font-size:.7rem;color:' + (at ? '#4ade80' : '#f59e0b') + ';text-align:right;">' + (at ? '📱 celular ativo' + ((estado.push || {})[f.id] ? '<br>🔔 lembretes ligados' : '<br><span style="color:#f59e0b;">🔕 lembretes desligados</span>') : 'celular não ativado') + '</span></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' + btn(at ? '🔄 Trocar celular' : '🔑 Gerar código', "HRPonto.codigo('" + f.id + "')", GOLD)
        + btn('🚚 Obra externa hoje', "HRPonto.externo('" + f.id + "')") + (at ? btn('🔔 Testar lembrete', "HRPonto.testar('" + f.id + "')") + btn('Desativar', "HRPonto.desativar('" + f.id + "')", '#f87171') : '') + '</div>'
        + '<div id="hpCod_' + f.id + '"></div></div>';
    });
    if (!estado.funcs.length) h += '<div style="color:' + T3 + ';font-size:.8rem;">Nenhum funcionário ativo no RH.</div>';
    // batidas de hoje
    h += sec('3. Batidas de hoje');
    var dia = estado.dias[hoje()] || {}, alguma = false;
    estado.funcs.forEach(function (f) {
      var l = dia[f.id] || []; if (!l.length) return; alguma = true;
      h += '<div style="padding:10px 12px;border:1px solid ' + BD + ';border-radius:12px;margin-bottom:8px;"><b style="font-size:.86rem;">' + esc(f.nome) + '</b>';
      l.forEach(function (b) {
        var cor = b.status === 'ok' ? '#4ade80' : b.status === 'pendente' ? '#f59e0b' : '#f87171';
        h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid ' + BD + ';font-size:.8rem;">'
          + '<span style="flex:1;">' + esc(TIPOS[b.tipo] || b.tipo) + ' <b>' + esc(b.hora) + '</b>' + (b.ajuste ? ' <i style="color:' + T3 + ';">(ajuste: ' + esc(b.motivo) + ')</i>' : '') + (b.externo ? ' 🚚' : '')
          + '<br><span style="font-size:.68rem;color:' + cor + ';">' + (b.status === 'ok' ? 'registrada' : b.status === 'pendente' ? 'aguardando · ' + esc(b.motivo) : 'recusada') + (b.dist != null ? ' · ' + b.dist + ' m' : '') + '</span></span>'
          + (b.ajuste ? '' : btn('📷', "HRPonto.foto('" + b.id + "')"))
          + (b.status === 'pendente' ? btn('✅', "HRPonto.decidir('" + f.id + "','" + b.id + "','ok')", '#4ade80') + btn('❌', "HRPonto.decidir('" + f.id + "','" + b.id + "','recusar')", '#f87171') : '')
          + '</div>';
      });
      h += '</div>';
    });
    if (!alguma) h += '<div style="color:' + T3 + ';font-size:.8rem;">Ninguém bateu ponto pelo celular hoje.</div>';
    h += '<button onclick="HRPonto.ajuste()" style="width:100%;margin-top:6px;padding:11px;border-radius:10px;border:1px dashed ' + GOLD + ';background:none;color:' + GOLD + ';font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">✍️ Ajuste: batida esquecida (com motivo)</button>';
    // levar ao RH
    var ini = hoje().slice(0, 8) + '01', st = estado.ultimoSync || lerJ('hr_ponto_sync');
    h += sec('4. RH (automático)');
    h += '<div style="padding:12px;border:1px solid ' + BD + ';border-radius:12px;font-size:.8rem;line-height:1.6;">✅ Os dias completos (entrada e saída confirmadas) <b>entram sozinhos no RH</b>, com o mesmo cálculo de horas e extras de sempre.'
      + (st && st.em ? '<br><span style="color:' + T3 + ';">Última conferência: ' + new Date(st.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</span>' : '')
      + ((st && st.incompletos || []).length ? '<div style="margin-top:6px;color:#fbbf24;">' + st.incompletos.map(function (t) { return '⚠️ ' + esc(t); }).join('<br>') + '</div><span style="color:' + T3 + ';">Corrija com ✍️ Ajuste (acima) que o dia entra.</span>' : '')
      + '<button onclick="HRPonto.sincronizarAuto(true).then(function(){HRPonto.abrir();})" style="width:100%;margin-top:8px;padding:12px;border-radius:10px;border:none;background:#2f7a4a;color:#fff;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;">🔄 Lançar no RH agora</button></div>';
    h += '<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:.74rem;color:' + T3 + ';">Conferir um período inteiro na tela de importação</summary>'
      + '<div style="display:flex;gap:8px;align-items:center;font-size:.8rem;margin-top:8px;"><span>De</span><input id="hpDe" type="date" value="' + ini + '" style="flex:1;padding:8px;border-radius:8px;border:1px solid ' + BD + ';background:#14141c;color:#fff;"><span>até</span><input id="hpAte" type="date" value="' + hoje() + '" style="flex:1;padding:8px;border-radius:8px;border:1px solid ' + BD + ';background:#14141c;color:#fff;"></div>'
      + '<button onclick="HRPonto.importar()" style="width:100%;margin-top:8px;padding:11px;border-radius:10px;border:1px solid ' + BD + ';background:none;color:' + T2 + ';font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">📥 Abrir na tela de importação</button></details>';
    h += btnFechar();
    document.getElementById('hrPontoBox').innerHTML = h;
  }
  function recarregar() { return api('/bot/ponto/registros?de=' + hoje() + '&ate=' + hoje()).then(function (j) { estado.dias = j.dias || {}; estado.ativos = j.ativos || {}; estado.push = j.push || {}; desenha(); }); }
  function feriadosRH() { try { var c = (typeof CFG !== 'undefined' && CFG) || {}; var h = hoje(); return [].concat(c.feriados || [], c.diasEspeciais || []).filter(function (d) { return typeof d === 'string' && d >= h; }).slice(0, 60); } catch (e) { return []; } }
  function salvarLemb() {
    var g = function (i) { return document.getElementById(i).value; };
    var b = { ligado: document.getElementById('hlOn').checked, entrada: g('hlEnt'), saida: g('hlSai'), sabado: g('hlSab'), almoco: +g('hlAlm') || 80 };
    api('/bot/ponto/config', { lemb: b }).then(function (j) { estado.cfg = j.cfg; toastP(b.ligado ? '✓ Lembretes salvos' : 'Lembretes desligados'); }).catch(function (e) { toastP(e.message); });
  }
  function testar(id) { api('/bot/ponto/testar', { funcId: id }).then(function (j) { toastP(j.via === 'notificação' ? '🔔 Teste enviado como notificação' : j.via === 'whatsapp' ? '💬 Teste enviado pelo WhatsApp (o celular dele está sem notificação)' : 'Não consegui avisar: ligue os lembretes no app dele ou cadastre o telefone no RH'); recarregar(); }).catch(function (e) { toastP(e.message); }); }

  // ── ações ──
  function cadastrarOficina() {
    if (!navigator.geolocation) { toastP('Este aparelho não dá a localização'); return; }
    toastP('📍 Pegando a localização…');
    navigator.geolocation.getCurrentPosition(function (p) {
      api('/bot/ponto/config', { lat: p.coords.latitude, lng: p.coords.longitude, usarEstaRede: true })
        .then(function (j) { estado.cfg = j.cfg; desenha(); toastP('✅ Oficina cadastrada (Wi-Fi e localização). Precisão: ' + Math.round(p.coords.accuracy) + ' m'); })
        .catch(function (e) { toastP(e.message); });
    }, function () { toastP('Libere a localização para o app e tente de novo'); }, { enableHighAccuracy: true, timeout: 15000 });
  }
  function salvarAviso() { var v = document.getElementById('hpAviso').value; api('/bot/ponto/config', { aviso: v }).then(function (j) { estado.cfg = j.cfg; toastP('✓ Aviso às ' + v); }).catch(function (e) { toastP(e.message); }); }
  function codigo(id) {
    var f = estado.funcs.find(function (x) { return x.id === id; });
    api('/bot/ponto/codigo', { funcId: id }).then(function (j) {
      var msg = 'Olá ' + f.nome.split(' ')[0] + '! Para bater o ponto pelo celular:\n1) Abra este link no seu celular: ' + (/^https?:/.test(j.link || '') ? j.link : estado.link) + '\n2) Instale o app (Android: menu ⋮ → Instalar app · iPhone: Compartilhar → Adicionar à Tela de Início)\n3) Abra o app instalado e digite o código: *' + j.codigo + '*\n4) Toque em *LIGAR LEMBRETES* e permita as notificações (o app avisa se você esquecer de bater)\n(O código vale 24 horas.) Sempre bata conectado no Wi-Fi da oficina.';
      var wa = 'https://wa.me/' + (f.tel ? (f.tel.length <= 11 ? '55' + f.tel : f.tel) : '') + '?text=' + encodeURIComponent(msg);
      document.getElementById('hpCod_' + id).innerHTML = '<div style="margin-top:8px;padding:10px;border-radius:10px;background:rgba(201,168,76,.1);text-align:center;"><div style="font-size:.7rem;color:' + T3 + ';">Código de ' + esc(f.nome) + ' (vale 24 h)</div><div style="font-size:2rem;font-weight:900;letter-spacing:.3em;color:' + GOLD + ';">' + j.codigo + '</div>'
        + '<a href="' + wa + '" target="_blank" rel="noopener" style="display:block;margin-top:6px;padding:10px;border-radius:9px;background:#25d366;color:#05250f;font-weight:800;text-decoration:none;">Enviar no WhatsApp</a>'
        + (estado.ativos[id] ? '<div style="font-size:.68rem;color:#f59e0b;margin-top:6px;">Ao ativar o celular novo, o antigo para de funcionar.</div>' : '') + '</div>';
    }).catch(function (e) { toastP(e.message); });
  }
  function externo(id) { api('/bot/ponto/externo', { funcId: id, data: hoje() }).then(function () { toastP('🚚 Liberado hoje para bater na obra (vale a localização da obra)'); }).catch(function (e) { toastP(e.message); }); }
  function desativar(id) { if (!confirm('Desativar o celular deste funcionário? Ele vai precisar de um código novo.')) return; api('/bot/ponto/desativar', { funcId: id }).then(recarregar).catch(function (e) { toastP(e.message); }); }
  function foto(id) {
    api('/bot/ponto/foto?id=' + encodeURIComponent(id)).then(function (j) {
      var v = document.createElement('div'); v.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;';
      v.innerHTML = '<img src="' + j.foto + '" style="max-width:90vw;max-height:80vh;border-radius:14px;transform:scaleX(-1);">'; v.onclick = function () { v.remove(); }; document.body.appendChild(v);
    }).catch(function (e) { toastP(e.message); });
  }
  function decidir(funcId, id, acao) {
    var motivo = acao === 'recusar' ? (prompt('Motivo da recusa (aparece no registro):') || '') : '';
    if (acao === 'recusar' && !motivo.trim()) return;
    api('/bot/ponto/ajuste', { funcId: funcId, data: hoje(), id: id, acao: acao, motivo: motivo }).then(recarregar).catch(function (e) { toastP(e.message); });
  }
  function ajuste() {
    var opts = estado.funcs.map(function (f) { return '<option value="' + f.id + '">' + esc(f.nome) + '</option>'; }).join('');
    var inp = 'width:100%;padding:10px;border-radius:9px;border:1px solid ' + BD + ';background:#14141c;color:#fff;box-sizing:border-box;margin-bottom:8px;';
    var d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;';
    d.innerHTML = '<div style="width:100%;max-width:480px;background:#0d0d14;border-radius:16px 16px 0 0;padding:16px;color:#fff;font-family:Outfit,sans-serif;"><b style="color:' + GOLD + ';">✍️ Ajuste de ponto</b><div style="font-size:.72rem;color:' + T3 + ';margin:4px 0 12px;">Fica registrado como ajuste seu, com motivo. A batida original nunca é apagada.</div>'
      + '<select id="ajF" style="' + inp + '">' + opts + '</select><input id="ajD" type="date" value="' + hoje() + '" style="' + inp + '">'
      + '<select id="ajT" style="' + inp + '"><option value="entrada">Entrada</option><option value="saida_almoco">Saída almoço</option><option value="volta_almoco">Volta almoço</option><option value="saida" selected>Saída</option></select>'
      + '<input id="ajH" type="time" style="' + inp + '"><input id="ajM" placeholder="Motivo (ex.: esqueceu de bater a saída)" style="' + inp + '">'
      + '<div style="display:flex;gap:8px;"><button id="ajC" style="flex:1;padding:12px;border-radius:10px;border:1px solid ' + BD + ';background:none;color:#fff;">Cancelar</button><button id="ajOk" style="flex:2;padding:12px;border-radius:10px;border:none;background:' + GOLD + ';color:#000;font-weight:800;">Salvar ajuste</button></div></div>';
    document.body.appendChild(d);
    d.querySelector('#ajC').onclick = function () { d.remove(); };
    d.querySelector('#ajOk').onclick = function () {
      var b = { funcId: d.querySelector('#ajF').value, data: d.querySelector('#ajD').value, tipo: d.querySelector('#ajT').value, hora: d.querySelector('#ajH').value, motivo: d.querySelector('#ajM').value.trim() };
      if (!b.hora || !b.motivo) { toastP('Informe a hora e o motivo'); return; }
      api('/bot/ponto/ajuste', b).then(function () { d.remove(); toastP('✓ Ajuste salvo'); recarregar(); }).catch(function (e) { toastP(e.message); });
    };
  }
  // batidas → relatório no formato da importação (nome;data;entrada;saída;almoço início;almoço fim) → tela de conferência do RH
  function importar() {
    var de = document.getElementById('hpDe').value, ate = document.getElementById('hpAte').value;
    if (!de || !ate || de > ate) { toastP('Confira as datas'); return; }
    api('/bot/ponto/registros?de=' + de + '&ate=' + ate).then(function (j) {
      var nomes = {}; (j.funcs || []).forEach(function (f) { nomes[f.id] = f.nome; });
      var linhas = [], pend = 0;
      Object.keys(j.dias || {}).sort().forEach(function (d) {
        var porF = j.dias[d];
        Object.keys(porF).forEach(function (fid) {
          var ok = porF[fid].filter(function (b) { if (b.status === 'pendente') pend++; return b.status === 'ok'; });
          if (!ok.length) return;
          var por = function (t) { var x = ok.filter(function (b) { return b.tipo === t; }); return x.length ? x : null; };
          var ent = (por('entrada') || [ok[0]])[0].hora;
          var sai = por('saida') ? por('saida').slice(-1)[0].hora : (ok.length >= 2 && ok[ok.length - 1].tipo !== 'saida_almoco' && ok[ok.length - 1].tipo !== 'entrada' ? ok[ok.length - 1].hora : '');
          var aI = por('saida_almoco') ? por('saida_almoco')[0].hora : '', aF = por('volta_almoco') ? por('volta_almoco')[0].hora : '';
          if (aI && !sai && !aF) { sai = aI; aI = ''; } // só entrada e "saída almoço": trata como saída (meio período)
          linhas.push([nomes[fid] || fid, d, ent, sai, aI, aF].join(';'));
        });
      });
      if (!linhas.length) { toastP('Nenhuma batida confirmada nesse período' + (pend ? ' (' + pend + ' aguardando sua confirmação)' : '')); return; }
      if (pend && !confirm(pend + ' batida(s) ainda estão aguardando sua confirmação e NÃO vão entrar. Continuar mesmo assim?')) return;
      if (typeof HR_IMPORT === 'undefined') { toastP('Módulo de importação do RH não carregou'); return; }
      var md = document.getElementById('hrPontoMd'); if (md) md.remove();
      HR_IMPORT.abrirImportacao();
      setTimeout(function () {
        var ta = document.getElementById('imp_texto');
        if (!ta) { toastP('Não achei a tela de importação'); return; }
        ta.value = 'nome;data;entrada;saida;almoco_inicio;almoco_fim\n' + linhas.join('\n');
        HR_IMPORT._processar();
      }, 350);
    }).catch(function (e) { toastP(e.message); });
  }

  // ── Lançamento automático no RH ─────────────────────────────────
  // Dia completo (entrada + saída confirmadas, nada aguardando) vira registro em hr_registros,
  // com o mesmo cálculo da importação (HR_IMPORT._calcDia / _classificarHE).
  // Nunca mexe em registro que veio de outro lugar (relógio, manual); só atualiza os dele.
  function min(h) { var m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? (+m[1]) * 60 + (+m[2]) : NaN; }
  function diaMenos(n) { var x = new Date(hoje() + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10); }
  function resumo(lista) {
    var ok = lista.filter(function (b) { return b.status === 'ok'; });
    var pend = lista.filter(function (b) { return b.status === 'pendente'; }).length;
    var por = function (t) { return ok.filter(function (b) { return b.tipo === t; }); };
    var e = por('entrada'), s = por('saida'), aI = por('saida_almoco'), aF = por('volta_almoco');
    return { ent: e.length ? e[0].hora : '', sai: s.length ? s[s.length - 1].hora : '', aI: aI.length ? aI[0].hora : '', aF: aF.length ? aF[aF.length - 1].hora : '', pend: pend, n: ok.length };
  }
  function lerJ(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  var sincronizando = false;
  function sincronizarAuto(avisar) {
    if (!bot() || sincronizando || typeof HR_IMPORT === 'undefined' || !HR_IMPORT._calcDia) return Promise.resolve(null);
    sincronizando = true;
    return api('/bot/ponto/registros?de=' + diaMenos(7) + '&ate=' + hoje()).then(function (j) {
      var regs = lerJ('hr_registros'), funcs = lerJ('hr_funcionarios'), r = { novos: 0, atualizados: 0, incompletos: [], pendentes: 0 };
      var nomes = {}; (j.funcs || []).forEach(function (f) { nomes[f.id] = f.nome; });
      var CF = (typeof CFG !== 'undefined' && CFG) ? CFG : {};
      Object.keys(j.dias || {}).sort().forEach(function (d) {
        Object.keys(j.dias[d]).forEach(function (fid) {
          var x = resumo(j.dias[d][fid]); r.pendentes += x.pend;
          if (!x.n) return;
          var nome = (nomes[fid] || fid).split(' ')[0];
          if (x.pend) { r.incompletos.push(nome + ' ' + d.slice(8) + '/' + d.slice(5, 7) + ': batida aguardando o senhor'); return; }
          if (!x.ent || !x.sai) { if (d < hoje()) r.incompletos.push(nome + ' ' + d.slice(8) + '/' + d.slice(5, 7) + ': falta ' + (x.ent ? 'a saída' : 'a entrada')); return; }
          if ((x.aI && !x.aF) || (!x.aI && x.aF)) { if (d < hoje()) r.incompletos.push(nome + ' ' + d.slice(8) + '/' + d.slice(5, 7) + ': almoço com uma batida só'); return; }
          if (!funcs[fid]) return; // funcionário não existe mais no RH
          var e = min(x.ent), s = min(x.sai), alm = (x.aI && x.aF) ? Math.max(0, min(x.aF) - min(x.aI)) : 0;
          var v = HR_IMPORT._validarJornada ? HR_IMPORT._validarJornada(e, s, alm) : { valido: s > e };
          if (!v.valido || !(s > e)) { r.incompletos.push(nome + ' ' + d.slice(8) + '/' + d.slice(5, 7) + ': horário estranho' + (v.motivo ? ' (' + v.motivo + ')' : '')); return; }
          var existe = null;
          Object.keys(regs).some(function (k) { var g = regs[k]; if (g && String(g.funcionarioId) === String(fid) && g.data === d) { existe = g; return true; } });
          if (existe && existe.origem !== 'ponto-celular') return; // veio de outro lugar: não mexe
          if (existe && existe.entrada === x.ent && existe.saida === x.sai && (existe.saidaAlmoco || '') === x.aI && (existe.voltaAlmoco || '') === x.aF) return;
          var c = HR_IMPORT._calcDia(e, s, d, alm, fid);
          var cls = HR_IMPORT._classificarHE ? HR_IMPORT._classificarHE({ data: d, extra: c.extra, funcId: fid, entrada: x.ent, saida: x.sai }) : { extra50: 1, extra200: 0 };
          var tipo = (cls.extra200 > 0 && cls.extra50 === 0) ? ((CF.feriados && CF.feriados.indexOf(d) >= 0 && !(CF.diasEspeciais && CF.diasEspeciais.indexOf(d) >= 0)) ? 'feriado' : 'especial') : 'normal';
          var agora = new Date().toISOString();
          var reg = existe || { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), funcionarioId: fid, data: d, destinoExtra: 'pagar', producao: '', instalacao: '', ieo: '', origem: 'ponto-celular', loteId: 'pontocel_' + d, criadoEm: agora };
          reg.entrada = x.ent; reg.saida = x.sai; reg.saidaAlmoco = x.aI; reg.voltaAlmoco = x.aF;
          reg.semAlmocoConfirmado = !!reg.semAlmocoConfirmado;
          reg.horas = parseFloat((c.trab / 60).toFixed(4)); reg.extra = parseFloat((c.extra / 60).toFixed(4)); reg.tipoExtra = tipo;
          reg.observacao = 'Ponto pelo celular' + (x.aI ? '' : ' · sem batida de almoço') + (existe ? ' · atualizado' : '');
          reg.atualizadoEm = agora;
          regs[reg.id] = reg; if (existe) r.atualizados++; else r.novos++;
        });
      });
      if (r.novos || r.atualizados) {
        localStorage.setItem('hr_registros', JSON.stringify(regs));
      }
      var st = { em: new Date().toISOString(), novos: r.novos, atualizados: r.atualizados, incompletos: r.incompletos, pendentes: r.pendentes };
      try { localStorage.setItem('hr_ponto_sync', JSON.stringify(st)); } catch (e) {}
      estado.ultimoSync = st;
      if (avisar && (r.novos || r.atualizados)) toastP('📱 Ponto: ' + (r.novos ? r.novos + ' dia(s) lançado(s) no RH' : '') + (r.novos && r.atualizados ? ' · ' : '') + (r.atualizados ? r.atualizados + ' atualizado(s)' : ''));
      var pg = document.getElementById('hrPontoCard');
      if ((r.novos || r.atualizados) && pg && window.HR_FUNC && HR_FUNC.renderPaginaFuncionarios) HR_FUNC.renderPaginaFuncionarios();
      else cartao();
      return r;
    }).catch(function (e) { console.warn('[HRPonto] sync', e); return null; })
      .then(function (r) { sincronizando = false; return r; });
  }

  // ── Cartão no topo do RH: quem está trabalhando agora + avisos ───
  function cardRH() {
    if (!bot()) return '<div id="hrPontoCard" onclick="HRPonto.abrir()" style="margin:12px 16px 0;padding:13px 14px;border:1.5px dashed rgba(201,168,76,.4);border-radius:13px;cursor:pointer;font-size:.8rem;color:' + T2 + ';">📱 <b style="color:' + GOLD + ';">Ponto pelo celular</b><br><span style="color:' + T3 + ';">Configure o WhatsApp Bot (Configurações) para ligar o ponto pelo celular.</span></div>';
    return '<div id="hrPontoCard" style="margin:12px 16px 0;padding:13px 14px;background:rgba(201,168,76,.06);border:1.5px solid rgba(201,168,76,.3);border-radius:13px;">'
      + '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.1rem;">📱</span><b style="flex:1;color:' + GOLD + ';font-size:.86rem;">Ponto de hoje</b>'
      + '<button onclick="HRPonto.abrir()" style="padding:7px 11px;border-radius:9px;border:1px solid rgba(201,168,76,.45);background:none;color:' + GOLD + ';font-size:.72rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">⚙️ Ponto e ajustes</button></div>'
      + '<div id="hrPontoCardCorpo" style="font-size:.78rem;color:' + T3 + ';margin-top:8px;">Carregando…</div></div>';
  }
  var cacheHoje = null;
  function cartao() {
    var el = document.getElementById('hrPontoCardCorpo'); if (!el || !bot()) return;
    var desenhar = function (j) {
      var dia = (j.dias || {})[hoje()] || {}, h = '', st = estado.ultimoSync || lerJ('hr_ponto_sync');
      (j.funcs || []).forEach(function (f) {
        var l = dia[f.id] || [], ult = l.filter(function (b) { return b.status !== 'recusada'; }).slice(-1)[0], pend = l.some(function (b) { return b.status === 'pendente'; });
        var txt = !ult ? '<span style="color:' + T3 + ';">não bateu</span>' : ult.tipo === 'saida' ? '<span style="color:' + T3 + ';">saiu ' + esc(ult.hora) + '</span>' : ult.tipo === 'saida_almoco' ? '<span style="color:#f59e0b;">almoço desde ' + esc(ult.hora) + '</span>' : '<span style="color:#4ade80;">trabalhando desde ' + esc((l.filter(function (b) { return b.tipo === 'entrada' && b.status === 'ok'; })[0] || ult).hora) + '</span>';
        h += '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid ' + BD + ';"><span style="color:#fff;">' + esc(String(f.nome).split(' ')[0]) + '</span><span>' + txt + (pend ? ' <b style="color:#f59e0b;">· aguardando</b>' : '') + '</span></div>';
      });
      if (!(j.funcs || []).length) h += '<div>Nenhum funcionário no ponto ainda. Toque em ⚙️ para começar.</div>';
      var avisos = [];
      if (st && st.pendentes) avisos.push('⏳ ' + st.pendentes + ' batida(s) aguardando o senhor confirmar');
      (st && st.incompletos || []).slice(0, 4).forEach(function (t) { avisos.push('⚠️ ' + esc(t)); });
      if (avisos.length) h += '<div style="margin-top:8px;padding:8px 10px;border-radius:9px;background:rgba(245,158,11,.08);color:#fbbf24;font-size:.72rem;line-height:1.5;">' + avisos.join('<br>') + '<br><span style="color:' + T3 + ';">Resolva em ⚙️ Ponto e ajustes → os dias entram no RH sozinhos.</span></div>';
      if (st && st.em) h += '<div style="margin-top:6px;font-size:.66rem;color:' + T3 + ';">✓ Lançamento automático no RH · última conferência ' + new Date(st.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</div>';
      el.innerHTML = h;
    };
    if (cacheHoje && Date.now() - cacheHoje.t < 60000) { desenhar(cacheHoje.j); return; }
    api('/bot/ponto/registros?de=' + hoje() + '&ate=' + hoje()).then(function (j) { cacheHoje = { t: Date.now(), j: j }; desenhar(j); })
      .catch(function (e) { el.innerHTML = '<span style="color:#f87171;">Não consegui falar com o bot: ' + esc(e.message) + '</span>'; });
  }
  var ultimaAuto = 0;
  function aoAbrirRH() {
    cartao();
    if (Date.now() - ultimaAuto > 60000) { ultimaAuto = Date.now(); sincronizarAuto(true); }
  }
  setTimeout(function () { sincronizarAuto(false); }, 15000);
  setInterval(function () { if (!document.hidden) sincronizarAuto(false); }, 10 * 60000);

  window.HRPonto = { sincronizarAuto: sincronizarAuto, cardRH: cardRH, aoAbrirRH: aoAbrirRH, abrir: abrir, salvarLemb: salvarLemb, testar: testar, cadastrarOficina: cadastrarOficina, salvarAviso: salvarAviso, codigo: codigo, externo: externo, desativar: desativar, foto: foto, decidir: decidir, ajuste: ajuste, importar: importar };
})();
