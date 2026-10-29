/* ============================================================
 * app-agenda-extra.js — HR Mármores e Granitos
 * Camada extra da Agenda inteligente (carrega DEPOIS de app-agenda-auto.js):
 *   1) Prazo que dá para prometer (olhando a fila real)
 *   4) Saldo a receber nas entregas
 *   5) Resumo de sexta-feira da secretária
 *   6) Risco de atraso (data prometida x previsão)
 *   7) Fotos do andamento (guardadas neste aparelho)
 * O app só prepara mensagens e avisos: nada é enviado sozinho ao cliente.
 * ============================================================ */
(function () {
  'use strict';
  var A = null;

  function brl(n) { return 'R$ ' + (+n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function idJs(id) { return JSON.stringify(String(id)); }
  function linha(inner) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--bd2,#2a2418);">' + inner + '</div>';
  }
  function diaTxt(h, iso) {
    var d = A.diff(h, iso);
    return d === 0 ? 'hoje' : d === 1 ? 'amanhã' : d === -1 ? 'ontem' : A.fdb(iso);
  }

  // ═════════════════════════════════════════════════════════════
  //  4) SALDO A RECEBER (lê os lançamentos "A Receber" de Finanças)
  // ═════════════════════════════════════════════════════════════
  function saldoJob(j) {
    var pend = (DB.t || []).filter(function (x) { return x && x.type === 'pend'; });
    var a = pend.filter(function (x) { return x.jId != null && String(x.jId) === String(j.id); });
    if (!a.length) {                                           // lançamentos antigos não têm jId: casa pelo nome completo do cliente
      var nome = A.norm(j.cli);
      if (nome.length >= 4) a = pend.filter(function (x) { return A.norm(x.desc).indexOf(nome) >= 0; });
    }
    return a.reduce(function (s, x) { return s + (+x.value || 0); }, 0);
  }
  window.hrSaldoJob = saldoJob;

  function entregasComSaldo(h, ate) {
    return A.jobsAtivos().filter(function (j) {
      var e = A.etapaDe(j);
      return e !== 'instalado' && e !== 'entregue' && j.end >= A.add(h, -1) && j.end <= A.add(h, ate);
    }).map(function (j) { return { j: j, saldo: saldoJob(j) }; })
      .filter(function (x) { return x.saldo > 0; })
      .sort(function (a, b) { return a.j.end < b.j.end ? -1 : 1; });
  }
  function blocoSaldo(h) {
    var l = entregasComSaldo(h, 7); if (!l.length) return '';
    var total = l.reduce(function (s, x) { return s + x.saldo; }, 0);
    return '<div class="hra-card"><div class="hra-t">💰 A receber nas entregas desta semana: ' + brl(total) + '</div>' +
      l.slice(0, 5).map(function (x) {
        return linha('<span><b>' + A.esc(x.j.cli) + '</b> · entrega ' + diaTxt(h, x.j.end) + '</span><b>' + brl(x.saldo) + '</b>');
      }).join('') + '</div>';
  }
  function checkinSaldo(h) {
    var l = entregasComSaldo(h, 1).filter(function (x) { return x.j.end <= A.add(h, 1); }); if (!l.length) return null;
    return {
      texto: '💰 **Entregas com saldo a receber:**\n' + l.map(function (x) {
        return '• **' + x.j.cli + '** — entrega ' + diaTxt(h, x.j.end) + ' · falta receber **' + brl(x.saldo) + '** (cobrar na entrega)';
      }).join('\n')
    };
  }

  // ═════════════════════════════════════════════════════════════
  //  1) PRAZO QUE DÁ PARA PROMETER
  // ═════════════════════════════════════════════════════════════
  function prazoPossivel(dias, instala) {
    var h = A.hoje();
    A.planoFila();                                              // atualiza o dia em que a oficina fica livre
    var cur = A.planoFila._cursor || h;
    var ini = A.proxUtil(cur > h ? cur : h);
    var wd = Math.max(1, A.uteisEntre(ini, A.add(ini, Math.max(1, +dias || 7))));
    return { ini: ini, fim: A.somaUteis(ini, wd), uteis: wd, instala: !!instala };
  }
  window.hrPrazoPossivel = prazoPossivel;

  function orcPendentes() {
    var h = A.hoje(), lim = A.add(h, -45);
    return (DB.q || []).filter(function (q) {
      if (!q || q.rascunho || q.agendaDispensada) return false;
      var st = q.status === 'aprovado' ? 'aceito' : (q.status || 'pendente');
      if (st !== 'pendente') return false;
      var ref = q._statusDate || q.date || ''; if (ref && ref < lim) return false;
      return !(DB.j || []).some(function (j) { return String(j.qId) === String(q.id); });
    }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
  }
  function blocoPrazo(h) {
    var l = orcPendentes().slice(0, 3); if (!l.length) return '';
    return '<div class="hra-card"><div class="hra-t">📆 Prazo que dá para prometer (se fechar hoje)</div>' +
      l.map(function (q) {
        var p = prazoPossivel(q.prazoDias || 7, false);
        return linha('<span><b>' + A.esc(q.cli || 'Cliente') + '</b></span><span>entrega <b>' + A.fdb(p.fim) + '</b></span>');
      }).join('') +
      '<div style="font-size:.78rem;color:var(--t3,#999);margin-top:4px;">Considera a fila de hoje, fins de semana, feriados, pedra e obra liberada.</div></div>';
  }

  // ═════════════════════════════════════════════════════════════
  //  6) RISCO DE ATRASO
  // ═════════════════════════════════════════════════════════════
  function riscos() {
    var h = A.hoje(), plano = A.planoFila(), mapa = {};
    plano.forEach(function (m) { mapa[String(m.job.id)] = m; });
    var ativos = A.jobsAtivos();
    return ativos.filter(function (j) {
      var e = A.etapaDe(j); return j.promessa && e !== 'instalado' && e !== 'entregue';
    }).map(function (j) {
      var m = mapa[String(j.id)], proj = m ? m.para.e : j.end, ini = m ? m.para.s : j.start;
      var atraso = A.diff(j.promessa, proj);
      // quem está na frente na fila, ainda não começou e tem folga, pode ceder a vez
      var cede = null;
      if (atraso > 0 && !A.jaComecou(j, h)) {
        ativos.forEach(function (c) {
          if (c === j || A.jaComecou(c, h) || c.urgente || c.fixo || c.start >= j.start) return;
          var folga = c.promessa ? A.diff(c.end, c.promessa) : 0;
          if (folga >= 2 && (!cede || folga > cede.folga)) cede = { j: c, folga: folga };
        });
      }
      return { j: j, proj: proj, ini: ini, atraso: atraso, cede: cede };
    }).filter(function (r) { return r.atraso > 0; })
      .sort(function (a, b) { return b.atraso - a.atraso; });
  }
  window.hrRiscos = riscos;
  window.hrRenegociou = function (jobId, nova) {
    var j = A.achaJobPorId(jobId); if (!j) return;
    var r = riscos().filter(function (x) { return String(x.j.id) === String(jobId); })[0];
    var d = nova || (r ? r.proj : j.end);
    A.logJob(j, 'promessa', j.promessa || '—', d);
    j.promessa = d; A.salvar(); toast('✅ Nova data combinada com ' + A.primeiroNome(j.cli) + ': ' + A.fdb(d));
  };
  function blocoRisco(h) {
    var l = riscos(); if (!l.length) return '';
    return '<div class="hra-card warn"><div class="hra-t">⚠️ Risco de atraso (' + l.length + ')</div>' +
      l.slice(0, 4).map(function (r) {
        var id = idJs(r.j.id);
        return '<div style="padding:6px 0;border-top:1px solid var(--bd2,#2a2418);"><b>' + A.esc(r.j.cli) + '</b> · prometido ' + A.fdb(r.j.promessa) +
          ' → previsto <b>' + A.fdb(r.proj) + '</b> (+' + r.atraso + 'd)' +
          (r.cede ? '<br><span style="font-size:.8rem;color:var(--t3,#999);">💡 ' + A.esc(r.cede.j.cli) + ' tem ' + r.cede.folga + ' dias de folga e pode ceder a vez.</span>' : '') +
          '<div class="hra-btns"><button class="hra-btn pri" onclick="hrAvisarCliente(' + A.esc(id) + ',\'atraso\',\'' + r.ini + '\',\'' + r.proj + '\')">💬 Avisar cliente</button>' +
          '<button class="hra-btn" onclick="hrRenegociou(' + A.esc(id) + ')">✔️ Já combinei a nova data</button></div></div>';
      }).join('') +
      '<div class="hra-btns"><button class="hra-btn" onclick="hrAbrirPlano()">🧠 Ver sugestões da fila</button></div></div>';
  }
  function checkinRisco() {
    var l = riscos(); if (!l.length) return null;
    return {
      texto: '⚠️ **Risco de atraso:**\n' + l.slice(0, 3).map(function (r) {
        return '• **' + r.j.cli + '** — prometido ' + A.fdb(r.j.promessa) + ', previsto ' + A.fdb(r.proj) + ' (+' + r.atraso + 'd)' +
          (r.cede ? ' · 💡 ' + r.cede.j.cli + ' pode ceder a vez' : '');
      }).join('\n'),
      acoes: [{ label: '🧠 Ver sugestões da fila', fn: 'hrAbrirPlano()' }]
    };
  }

  // ═════════════════════════════════════════════════════════════
  //  5) RESUMO DA SEMANA (sexta-feira)
  // ═════════════════════════════════════════════════════════════
  window.hrResumoSemana = function (forcar) {
    try {
      var h = A.hoje(), agora = new Date(), dw = A.dow(h);
      if (!forcar) {
        if (dw !== 5 || agora.getHours() < 15) return false;
        if (localStorage.getItem('hr_resumo_sem') === h) return false;
      }
      var seg = A.add(h, -((dw + 6) % 7)), pSeg = A.add(seg, 7), pDom = A.add(seg, 13);
      var ativos = A.jobsAtivos();
      var entregues = (DB.j || []).filter(function (j) { var d = j.doneAt || j.end; return j && j.done && d >= seg && d <= h; });
      var atrasados = ativos.filter(function (j) { return j.end < h && A.etapaDe(j) !== 'instalado'; });
      var comecam = ativos.filter(function (j) { return j.start >= pSeg && j.start <= pDom; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      var entregam = ativos.filter(function (j) { return j.end >= pSeg && j.end <= pDom; }).sort(function (a, b) { return a.end < b.end ? -1 : 1; });
      var receber = entregam.reduce(function (s, j) { return s + saldoJob(j); }, 0);
      var rs = riscos();
      var t = '📋 **Resumo da semana** (' + A.fdb(seg) + ' a ' + A.fdb(h) + ')\n';
      t += '\n✅ **Entregues:** ' + (entregues.length ? entregues.length + ' — ' + entregues.slice(0, 5).map(function (j) { return j.cli; }).join(', ') : 'nenhum');
      t += '\n🔴 **Atrasados:** ' + (atrasados.length ? atrasados.map(function (j) { return j.cli + ' (' + A.diff(j.end, h) + 'd)'; }).join(', ') : 'nenhum');
      if (rs.length) t += '\n⚠️ **Em risco:** ' + rs.slice(0, 4).map(function (r) { return r.j.cli + ' (+' + r.atraso + 'd)'; }).join(', ');
      t += '\n\n📅 **Semana que vem (' + A.fdb(pSeg) + ' a ' + A.fdb(pDom) + '):**';
      t += '\n🛠️ Começam: ' + (comecam.length ? comecam.slice(0, 6).map(function (j) { return j.cli + ' (' + A.fdb(j.start) + ')'; }).join(', ') : 'nenhum');
      t += '\n📦 Entregam: ' + (entregam.length ? entregam.slice(0, 6).map(function (j) { return j.cli + ' (' + A.fdb(j.end) + ')'; }).join(', ') : 'nenhum');
      if (receber > 0) t += '\n💰 A receber nas entregas: **' + brl(receber) + '**';
      var acoes = [];
      if (A.planoFila().length) acoes.push({ label: '🧠 Ver sugestões da fila', fn: 'hrAbrirPlano()' });
      A.responderChat(t, acoes);
      if (!forcar) localStorage.setItem('hr_resumo_sem', h);
      return true;
    } catch (e) { console.warn('hrResumoSemana:', e); return false; }
  };

  // ═════════════════════════════════════════════════════════════
  //  7) FOTOS DO ANDAMENTO (ficam neste aparelho — não vão para a nuvem)
  // ═════════════════════════════════════════════════════════════
  function abrirDB(cb) {
    try {
      var r = indexedDB.open('hr_fotos_v1', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('f', { keyPath: 'id' }); };
      r.onsuccess = function () { cb(null, r.result); };
      r.onerror = function () { cb(r.error || new Error('idb')); };
    } catch (e) { cb(e); }
  }
  function contFotos() { try { return JSON.parse(localStorage.getItem('hr_fotos_cnt') || '{}') || {}; } catch (e) { return {}; } }
  function setCont(jobId, delta) {
    var c = contFotos(), k = String(jobId); c[k] = Math.max(0, (c[k] || 0) + delta);
    try { localStorage.setItem('hr_fotos_cnt', JSON.stringify(c)); } catch (e) {}
  }
  function reduzir(file, cb) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var max = 1100, w = img.naturalWidth, hh = img.naturalHeight, k = Math.min(1, max / Math.max(w, hh));
      var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(hh * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(function (b) { cb(b || file); }, 'image/jpeg', 0.72);
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(file); };
    img.src = url;
  }
  window.hrFotoAndamento = function (jobId) {
    var j = A.achaJobPorId(jobId); if (!j) return;
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      reduzir(f, function (blob) {
        abrirDB(function (err, db) {
          if (err) { toast('Não consegui guardar a foto neste aparelho'); return; }
          var rec = { id: Date.now() + '-' + Math.floor(Math.random() * 1e4), jobId: String(jobId), ts: Date.now(), blob: blob };
          var tx = db.transaction('f', 'readwrite'); tx.objectStore('f').put(rec);
          tx.oncomplete = function () {
            setCont(jobId, 1); A.logJob(j, 'foto', '', '📷 foto do andamento'); A.salvar();
            toast('📷 Foto guardada — ' + j.cli);
          };
          tx.onerror = function () { toast('Não consegui guardar a foto'); };
        });
      });
    };
    inp.click();
  };
  window.hrVerFotos = function (jobId) {
    var j = A.achaJobPorId(jobId); if (!j) return;
    abrirDB(function (err, db) {
      if (err) { toast('Não consegui abrir as fotos'); return; }
      var rq = db.transaction('f', 'readonly').objectStore('f').getAll();
      rq.onsuccess = function () {
        var fotos = (rq.result || []).filter(function (x) { return x.jobId === String(jobId); }).sort(function (a, b) { return b.ts - a.ts; });
        var ant = document.getElementById('hrFotosMd'); if (ant) ant.remove();
        var urls = [];
        var m = document.createElement('div'); m.id = 'hrFotosMd';
        m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.88);display:flex;align-items:flex-end;justify-content:center;';
        var corpo = fotos.length ? fotos.map(function (f, i) {
          var u = URL.createObjectURL(f.blob); urls.push(u);
          return '<div style="margin-bottom:14px;"><img src="' + u + '" style="width:100%;border-radius:12px;display:block;">' +
            '<div style="display:flex;gap:8px;margin-top:6px;align-items:center;"><span style="flex:1;font-size:.8rem;color:var(--t3,#999);">' +
            new Date(f.ts).toLocaleDateString('pt-BR') + '</span>' +
            '<button data-s="' + i + '" style="padding:8px 12px;border:none;border-radius:10px;background:var(--gold3,#C9A84C);color:#000;font-weight:700;cursor:pointer;">📤 Enviar</button>' +
            '<button data-x="' + i + '" style="padding:8px 12px;border:1px solid var(--bd2,#444);border-radius:10px;background:transparent;color:var(--tx,#eee);cursor:pointer;">🗑️</button></div></div>';
        }).join('') : '<div style="padding:18px 0;color:var(--t3,#999);">Ainda não há fotos deste serviço neste aparelho.</div>';
        m.innerHTML = '<div style="width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:22px 20px 26px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;">' +
          '<div style="font-size:1.05rem;font-weight:800;margin-bottom:12px;">📷 ' + A.esc(j.cli) + ' — fotos do andamento</div>' + corpo +
          '<button id="hrFotosNova" style="width:100%;padding:13px;border:none;border-radius:12px;background:var(--gold3,#C9A84C);color:#000;font-weight:800;cursor:pointer;">📷 Nova foto</button>' +
          '<button id="hrFotosFim" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);cursor:pointer;">Fechar</button></div>';
        document.body.appendChild(m);
        function fechar() { urls.forEach(function (u) { URL.revokeObjectURL(u); }); m.remove(); }
        document.getElementById('hrFotosFim').onclick = fechar;
        document.getElementById('hrFotosNova').onclick = function () { fechar(); window.hrFotoAndamento(jobId); };
        Array.prototype.forEach.call(m.querySelectorAll('[data-s]'), function (b) {
          b.onclick = function () {
            var f = fotos[+b.getAttribute('data-s')];
            var arq = new File([f.blob], 'andamento-' + A.norm(j.cli).replace(/[^a-z0-9]+/g, '-') + '.jpg', { type: 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [arq] })) {
              navigator.share({ files: [arq], text: 'Andamento do seu serviço — HR Mármores e Granitos' }).catch(function () {});
            } else {
              var a = document.createElement('a'); a.href = URL.createObjectURL(f.blob); a.download = arq.name; a.click();
              toast('Foto baixada — envie pelo WhatsApp');
            }
          };
        });
        Array.prototype.forEach.call(m.querySelectorAll('[data-x]'), function (b) {
          b.onclick = function () {
            var f = fotos[+b.getAttribute('data-x')];
            abrirDB(function (e2, d2) {
              if (e2) return;
              var tx = d2.transaction('f', 'readwrite'); tx.objectStore('f').delete(f.id);
              tx.oncomplete = function () { setCont(jobId, -1); fechar(); window.hrVerFotos(jobId); };
            });
          };
        });
      };
    });
  };
  function blocoFotos(h) {
    var l = A.jobsAtivos().filter(function (j) {
      var e = A.etapaDe(j); return (e === 'producao' && A.jaComecou(j, h)) || e === 'pronto';
    }).sort(function (a, b) { return a.end < b.end ? -1 : 1; });
    if (!l.length) return '';
    var cont = contFotos();
    return '<details class="hra-card" style="cursor:pointer;"><summary class="hra-t" style="list-style:none;">📷 Fotos do andamento (' + l.length + ' serviço' + (l.length > 1 ? 's' : '') + ')</summary>' +
      l.slice(0, 5).map(function (j) {
        var id = idJs(j.id), n = cont[String(j.id)] || 0;
        return linha('<span><b>' + A.esc(j.cli) + '</b></span><span><button class="hra-btn pri" onclick="hrFotoAndamento(' + A.esc(id) + ')">📷 Foto</button> ' +
          '<button class="hra-btn" onclick="hrVerFotos(' + A.esc(id) + ')">🖼️ Ver' + (n ? ' (' + n + ')' : '') + '</button></span>');
      }).join('') + '<div style="font-size:.76rem;color:var(--t3,#999);margin-top:4px;">As fotos ficam guardadas só neste aparelho.</div></details>';
  }

  // ═════════════════════════════════════════════════════════════
  //  CONVERSA: "que prazo posso dar?" e "resumo da semana"
  // ═════════════════════════════════════════════════════════════
  function chatExtra(texto, s) {
    if (/(resumo (da )?semana|como foi a semana|balanco da semana)/.test(s)) { return window.hrResumoSemana(true); }
    if (/(que|qual|quanto).*(prazo|data).*(posso|da pra|posso dar|prometer|passar|dar)|quando (da|consigo) (pra |para )?entregar|prazo que (da|posso)|prazo possivel/.test(s)) {
      var q = null;
      (DB.q || []).forEach(function (x) { if (!q && x && x.cli && A.norm(x.cli).length >= 3 && s.indexOf(A.norm(x.cli).split(' ')[0]) >= 0 && A.norm(x.cli).split(' ')[0].length >= 3) q = x; });
      var m = s.match(/(\d{1,2})\s*dias?/), dias = m ? +m[1] : (q && q.prazoDias) || 7;
      var p = prazoPossivel(dias, false);
      A.responderChat('📆 Fechando **hoje**' + (q ? ' o serviço de **' + q.cli + '**' : ' um serviço de ~' + dias + ' dias') +
        ', a oficina começa em **' + A.fdb(p.ini) + '** e dá para prometer entrega em **' + A.fdb(p.fim) + '**.\nJá considero a fila de hoje, fins de semana, feriados, pedra e obra liberada.', []);
      return true;
    }
    return false;
  }

  // ═════════════════════════════════════════════════════════════
  //  arranque
  // ═════════════════════════════════════════════════════════════
  function registrar() {
    window.hrAgBlocos = window.hrAgBlocos || [];
    window.hrAgBlocos.push(blocoRisco, blocoSaldo, blocoPrazo, blocoFotos);
    window.hrCheckinExtras = window.hrCheckinExtras || [];
    window.hrCheckinExtras.push(function (h) { return checkinRisco(); }, function (h) { return checkinSaldo(h); });
    window.hrChatExtras = window.hrChatExtras || [];
    window.hrChatExtras.push(chatExtra);
    setTimeout(function () { window.hrResumoSemana(false); }, 6000);
    setInterval(function () { window.hrResumoSemana(false); }, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') setTimeout(function () { window.hrResumoSemana(false); }, 1200);
    });
    setTimeout(function () { try { renderAg(); } catch (e) {} }, 2200);
  }
  function tentar(n) {
    if (window.__hrAg) { A = window.__hrAg; registrar(); }
    else if (n < 40) setTimeout(function () { tentar(n + 1); }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { tentar(0); });
  else tentar(0);
})();
