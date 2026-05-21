// ══════════════════════════════════════════════════════════════
// AUTO-BACKUP — HR Mármores e Granitos
// • Salva snapshot no localStorage a cada 30 minutos
// • Mantém os últimos 7 snapshots locais (rotação automática)
// • Dispara download automático uma vez por dia
// • Sincroniza com Supabase (mesma tabela hr_sync, coluna backup)
// ══════════════════════════════════════════════════════════════

var AUTOBACKUP = {

  // ── Configuração ──
  INTERVALO_MIN:   30,
  MAX_SNAPSHOTS:   7,
  KEY_SNAPSHOTS:  'hr_ab_snaps',
  KEY_ULTIMO_DL:  'hr_ab_ultimo_dl',
  KEY_ULTIMO_SV:  'hr_ab_ultimo_sv',

  // ── Supabase (mesma config do app) ──
  SUPABASE_URL: 'https://rdqvjohsxiydcdigygvn.supabase.co',
  SUPABASE_KEY: 'sb_publishable_TxqiXyBNdlePn1d1dFzVug_DjcpKAKp',
  CHAVE:        'hr_marmores_granitos',

  _timer: null,
  _pushDebounce: null,

  // ── Inicializa ──
  init: function() {
    var self = this;
    setTimeout(function() { self.salvarSnapshot(); }, 10000);
    this._timer = setInterval(function() { self.salvarSnapshot(); }, this.INTERVALO_MIN * 60 * 1000);
    this._injetarEstilos();
    this._renderIndicador();
    setTimeout(function() { self._verificarDownloadDiario(); }, 5000);
    // Tenta puxar último backup da nuvem ao abrir
    setTimeout(function() { self._pullNuvem(); }, 3000);
  },

  // ── Coleta todos os dados do app ──
  _coletarDados: function() {
    var hrdb = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('hrdb_') === 0) {
          try { hrdb[k.replace('hrdb_','')] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
        }
      }
    } catch(e) {}

    var extra = {};
    var ignorar = {hr_q:1,hr_j:1,hr_t:1,hr_b:1,hr_cfg:1,hr_sync_code:1,hr_sync_ts:1,hr_adm:1};
    try {
      for (var j = 0; j < localStorage.length; j++) {
        var kk = localStorage.key(j);
        if (kk && kk.indexOf('hr_') === 0 && !ignorar[kk] && kk.indexOf('hrdb_') !== 0 && kk.indexOf('hr_ab_') !== 0) {
          extra[kk] = localStorage.getItem(kk);
        }
      }
    } catch(e) {}

    return {
      _v: 2,
      _ts: Date.now(),
      cfg: typeof CFG !== 'undefined' ? CFG : null,
      q: (typeof DB !== 'undefined' && DB.q) ? DB.q : [],
      j: (typeof DB !== 'undefined' && DB.j) ? DB.j : [],
      t: (typeof DB !== 'undefined' && DB.t) ? DB.t : [],
      b: (typeof DB !== 'undefined' && DB.b) ? DB.b : [],
      hrdb: hrdb,
      extra: extra
    };
  },

  // ── Salva snapshot no localStorage ──
  salvarSnapshot: function() {
    try {
      var dados = this._coletarDados();
      var json  = JSON.stringify(dados);

      var lista = [];
      try { lista = JSON.parse(localStorage.getItem(this.KEY_SNAPSHOTS) || '[]'); } catch(e) { lista = []; }

      lista.push({
        ts:   dados._ts,
        data: new Date(dados._ts).toLocaleString('pt-BR'),
        kb:   Math.round(json.length / 1024),
        json: json
      });

      if (lista.length > this.MAX_SNAPSHOTS) {
        lista = lista.slice(lista.length - this.MAX_SNAPSHOTS);
      }

      localStorage.setItem(this.KEY_SNAPSHOTS, JSON.stringify(lista));
      localStorage.setItem(this.KEY_ULTIMO_SV, String(dados._ts));

      this._atualizarIndicador(dados._ts, lista.length);

      // Envia para nuvem (debounce 5s)
      this._pushNuvem(dados);

    } catch(e) {
      console.warn('[AutoBackup] Erro ao salvar snapshot:', e);
    }
  },

  // ── Push para Supabase ──
  _pushNuvem: function(dados) {
    var self = this;
    clearTimeout(self._pushDebounce);
    self._pushDebounce = setTimeout(function() {
      try {
        var ts  = dados._ts;
        var url = self.SUPABASE_URL + '/rest/v1/hr_sync';
        var headers = {
          'Content-Type': 'application/json',
          'apikey': self.SUPABASE_KEY,
          'Authorization': 'Bearer ' + self.SUPABASE_KEY,
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        };
        // Guardamos o backup na coluna "backup" — não toca na coluna "dados"
        var body = JSON.stringify({
          codigo:  self.CHAVE,
          backup:  JSON.stringify(dados),
          backup_ts: ts
        });
        fetch(url, { method: 'POST', headers: headers, body: body })
          .then(function(r) {
            if (!r.ok) throw new Error(r.status);
            self._mostrarToastBackup('☁️ Backup salvo na nuvem!');
          })
          .catch(function() {
            // Tenta PATCH se POST falhou (registro já existe)
            fetch(url + '?codigo=eq.' + encodeURIComponent(self.CHAVE),
              { method: 'PATCH', headers: headers,
                body: JSON.stringify({ backup: JSON.stringify(dados), backup_ts: ts }) })
              .then(function(r2) {
                if (r2.ok) self._mostrarToastBackup('☁️ Backup atualizado na nuvem!');
              })
              .catch(function() {});
          });
      } catch(e) {
        console.warn('[AutoBackup] Erro ao enviar para nuvem:', e);
      }
    }, 5000);
  },

  // ── Pull da nuvem ao abrir ──
  _pullNuvem: function() {
    var self = this;
    try {
      var url = self.SUPABASE_URL + '/rest/v1/hr_sync?codigo=eq.' +
                encodeURIComponent(self.CHAVE) + '&select=backup,backup_ts';
      var headers = {
        'apikey': self.SUPABASE_KEY,
        'Authorization': 'Bearer ' + self.SUPABASE_KEY
      };
      fetch(url, { headers: headers })
        .then(function(r) { return r.json(); })
        .then(function(rows) {
          if (!rows || !rows.length || !rows[0].backup) return;
          var row = rows[0];
          var localTs = +localStorage.getItem(self.KEY_ULTIMO_SV) || 0;
          if (!row.backup_ts || row.backup_ts <= localTs) return;

          // Nuvem tem dado mais recente — adiciona como snapshot
          try {
            var dadosNuvem = JSON.parse(row.backup);
            var lista = [];
            try { lista = JSON.parse(localStorage.getItem(self.KEY_SNAPSHOTS) || '[]'); } catch(e) { lista = []; }

            // Só adiciona se ainda não existe este timestamp
            var existe = lista.some(function(s) { return s.ts === dadosNuvem._ts; });
            if (!existe) {
              var json = row.backup;
              lista.push({
                ts:       dadosNuvem._ts,
                data:     new Date(dadosNuvem._ts).toLocaleString('pt-BR') + ' ☁️',
                kb:       Math.round(json.length / 1024),
                json:     json,
                deNuvem:  true
              });
              if (lista.length > self.MAX_SNAPSHOTS) {
                lista = lista.slice(lista.length - self.MAX_SNAPSHOTS);
              }
              localStorage.setItem(self.KEY_SNAPSHOTS, JSON.stringify(lista));
              self._atualizarIndicador(dadosNuvem._ts, lista.length);
              self._mostrarToastBackup('☁️ Backup da nuvem disponível!');
            }
          } catch(e) {}
        })
        .catch(function() {});
    } catch(e) {}
  },

  // ── Verifica download diário ──
  _verificarDownloadDiario: function() {
    try {
      var hoje = new Date().toLocaleDateString('pt-BR');
      var ultimoDl = localStorage.getItem(this.KEY_ULTIMO_DL) || '';
      if (ultimoDl === hoje) return;

      var q = (typeof DB !== 'undefined' && DB.q) ? DB.q : [];
      var j = (typeof DB !== 'undefined' && DB.j) ? DB.j : [];
      if (q.length === 0 && j.length === 0) {
        var self = this;
        setTimeout(function() { self._verificarDownloadDiario(); }, 30000);
        return;
      }

      this._dispararDownload();
      localStorage.setItem(this.KEY_ULTIMO_DL, hoje);
    } catch(e) {
      console.warn('[AutoBackup] Erro no download diário:', e);
    }
  },

  // ── Dispara o download ──
  _dispararDownload: function() {
    try {
      var dados = this._coletarDados();
      var json  = JSON.stringify(dados);
      var dt    = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      var fname = 'HR_AutoBackup_' + dt + '.json';
      var blob  = new Blob([json], { type: 'application/json' });

      if (navigator.share && navigator.canShare) {
        var file = new File([blob], fname, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'Backup HR Mármores — ' + dt })
            .then(function() { AUTOBACKUP._mostrarToastBackup('✅ Backup do dia compartilhado!'); })
            .catch(function() { AUTOBACKUP._baixarViaLink(json, fname); });
          return;
        }
      }

      this._baixarViaLink(json, fname);
    } catch(e) {
      console.warn('[AutoBackup] Erro ao disparar download:', e);
    }
  },

  _baixarViaLink: function(json, fname) {
    try {
      var uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
      var a   = document.createElement('a');
      a.href = uri; a.download = fname; a.target = '_blank';
      document.body.appendChild(a); a.click();
      setTimeout(function() { document.body.removeChild(a); }, 1000);
      AUTOBACKUP._mostrarToastBackup('📥 Backup diário salvo! Verifique seus Downloads.');
    } catch(e) {}
  },

  // ── Toast ──
  _mostrarToastBackup: function(msg) {
    var el = document.getElementById('ab-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visivel');
    setTimeout(function() { el.classList.remove('visivel'); }, 4000);
  },

  // ── Indicador de status ──
  _renderIndicador: function() {
    var old = document.getElementById('ab-badge');
    if (old) old.remove();

    var ts    = +localStorage.getItem(this.KEY_ULTIMO_SV) || 0;
    var lista = [];
    try { lista = JSON.parse(localStorage.getItem(this.KEY_SNAPSHOTS) || '[]'); } catch(e) {}

    var badge = document.createElement('div');
    badge.id  = 'ab-badge';
    badge.setAttribute('onclick', 'AUTOBACKUP.abrirPainel()');
    badge.innerHTML = '<span id="ab-dot" class="ab-dot"></span><span id="ab-lbl">Backup</span>';
    document.body.appendChild(badge);

    var toast = document.createElement('div');
    toast.id  = 'ab-toast';
    document.body.appendChild(toast);

    this._atualizarIndicador(ts, lista.length);
  },

  _atualizarIndicador: function(ts, count) {
    var dot = document.getElementById('ab-dot');
    var lbl = document.getElementById('ab-lbl');
    if (!dot || !lbl) return;

    if (ts > 0) {
      var agoraMin = Math.floor((Date.now() - ts) / 60000);
      var textoHora = agoraMin < 1 ? 'agora' : agoraMin + 'min';
      dot.className = 'ab-dot verde';
      lbl.textContent = '✓ ' + textoHora;
    } else {
      dot.className = 'ab-dot cinza';
      lbl.textContent = 'Backup';
    }
  },

  // ── Painel de snapshots ──
  abrirPainel: function() {
    var lista = [];
    try { lista = JSON.parse(localStorage.getItem(this.KEY_SNAPSHOTS) || '[]'); } catch(e) {}
    lista = lista.slice().reverse();

    var ultimoDl    = localStorage.getItem(this.KEY_ULTIMO_DL) || '—';
    var totalKb     = lista.reduce(function(s, x) { return s + (x.kb || 0); }, 0);

    var h = '<div id="ab-painel-overlay" onclick="AUTOBACKUP._fecharPainel(event)">';
    h += '<div id="ab-painel">';

    h += '<div class="ab-painel-hd">';
    h += '<div><div class="ab-painel-title">🛡️ Auto-Backup</div>';
    h += '<div class="ab-painel-sub">Local + Nuvem (Supabase)</div></div>';
    h += '<button class="ab-painel-close" onclick="AUTOBACKUP.fecharPainel()">✕</button>';
    h += '</div>';

    h += '<div class="ab-status-grid">';
    h += '<div class="ab-status-card">';
    h += '<div class="ab-status-icon">🗂️</div>';
    h += '<div class="ab-status-val">' + lista.length + '/' + this.MAX_SNAPSHOTS + '</div>';
    h += '<div class="ab-status-lbl">Snapshots</div>';
    h += '</div>';
    h += '<div class="ab-status-card">';
    h += '<div class="ab-status-icon">💾</div>';
    h += '<div class="ab-status-val">' + totalKb + ' KB</div>';
    h += '<div class="ab-status-lbl">Armazenado</div>';
    h += '</div>';
    h += '<div class="ab-status-card">';
    h += '<div class="ab-status-icon">☁️</div>';
    h += '<div class="ab-status-val" style="font-size:11px;">Ativo</div>';
    h += '<div class="ab-status-lbl">Supabase</div>';
    h += '</div>';
    h += '</div>';

    h += '<button class="ab-btn-dl" onclick="AUTOBACKUP._dispararDownload();AUTOBACKUP._mostrarToastBackup(\'📥 Backup gerado!\');">';
    h += '📥 Baixar Backup Agora</button>';

    h += '<button class="ab-btn-nuvem" onclick="AUTOBACKUP._pullNuvem();AUTOBACKUP._mostrarToastBackup(\'☁️ Buscando da nuvem...\');">';
    h += '☁️ Sincronizar da Nuvem</button>';

    h += '<div class="ab-snaps-title">Histórico de snapshots</div>';
    if (lista.length === 0) {
      h += '<div class="ab-snaps-empty">Nenhum snapshot ainda. O primeiro será salvo em breve.</div>';
    } else {
      h += '<div class="ab-snaps-list">';
      lista.forEach(function(s, i) {
        var isMaisRecente = i === 0;
        h += '<div class="ab-snap-row' + (isMaisRecente ? ' recente' : '') + '">';
        h += '<div class="ab-snap-info">';
        h += '<div class="ab-snap-data">' + s.data + (isMaisRecente ? ' <span class="ab-snap-badge">Mais recente</span>' : '') + '</div>';
        h += '<div class="ab-snap-kb">' + (s.kb || '?') + ' KB' + (s.deNuvem ? ' · ☁️ nuvem' : '') + '</div>';
        h += '</div>';
        h += '<button class="ab-snap-btn" onclick="AUTOBACKUP.restaurarSnapshot(' + (lista.length - 1 - i) + ')">↩ Restaurar</button>';
        h += '</div>';
      });
      h += '</div>';
    }

    h += '<div class="ab-rodape">Snapshots salvos a cada ' + this.INTERVALO_MIN + ' min · Download automático 1×/dia · Backup na nuvem ativo</div>';

    h += '</div></div>';

    var overlay = document.createElement('div');
    overlay.innerHTML = h;
    document.body.appendChild(overlay.firstChild);
  },

  _fecharPainel: function(e) {
    if (e && e.target.id !== 'ab-painel-overlay') return;
    this.fecharPainel();
  },

  fecharPainel: function() {
    var el = document.getElementById('ab-painel-overlay');
    if (el) el.remove();
  },

  // ── Restaurar snapshot ──
  restaurarSnapshot: function(idx) {
    var lista = [];
    try { lista = JSON.parse(localStorage.getItem(this.KEY_SNAPSHOTS) || '[]'); } catch(e) {}
    var snap = lista[idx];
    if (!snap) { alert('Snapshot não encontrado.'); return; }

    var dataFormatada = snap.data || 'desconhecida';
    if (!confirm('Restaurar backup de ' + dataFormatada + '?\n\nO estado atual será substituído. Esta ação não pode ser desfeita.')) return;

    try {
      var d = JSON.parse(snap.json);
      if (typeof _restaurarBackup === 'function') {
        _restaurarBackup(d);
        this.fecharPainel();
        if (typeof toast === 'function') toast('✓ Backup restaurado! Recarregando...');
        setTimeout(function() { location.reload(); }, 900);
      } else {
        alert('Função de restauração não encontrada. Use o menu Configurações > Backup.');
      }
    } catch(e) {
      alert('Erro ao restaurar snapshot: ' + e.message);
    }
  },

  // ── CSS ──
  _injetarEstilos: function() {
    if (document.getElementById('ab-style')) return;
    var s = document.createElement('style');
    s.id  = 'ab-style';
    s.textContent = `
      #ab-badge {
        position: fixed; bottom: 72px; right: 12px; z-index: 9000;
        background: rgba(20,20,30,0.92);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 20px; padding: 5px 10px 5px 8px;
        display: flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 700;
        color: rgba(255,255,255,.6); cursor: pointer;
        backdrop-filter: blur(8px);
        box-shadow: 0 2px 12px rgba(0,0,0,.4);
        transition: opacity .3s; user-select: none;
      }
      #ab-badge:active { opacity: .7; }
      .ab-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: #6b7280; }
      .ab-dot.verde { background: #4ade80; box-shadow: 0 0 6px #4ade80; animation: abPulse 2.5s ease-in-out infinite; }
      .ab-dot.cinza { background: #6b7280; }
      @keyframes abPulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }

      #ab-toast {
        position: fixed; bottom: 110px; left: 50%;
        transform: translateX(-50%) translateY(10px);
        background: rgba(20,20,30,.97);
        border: 1px solid rgba(74,222,128,.3);
        border-radius: 12px; padding: 10px 18px;
        font-size: 13px; font-weight: 600; color: #4ade80;
        z-index: 9100; opacity: 0;
        transition: opacity .3s, transform .3s;
        pointer-events: none; white-space: nowrap;
        box-shadow: 0 4px 20px rgba(0,0,0,.5);
      }
      #ab-toast.visivel { opacity: 1; transform: translateX(-50%) translateY(0); }

      #ab-painel-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,.65);
        z-index: 9200; display: flex; align-items: flex-end;
        animation: abFadeIn .2s ease;
      }
      @keyframes abFadeIn { from { opacity: 0; } to { opacity: 1; } }

      #ab-painel {
        width: 100%; max-height: 88vh; overflow-y: auto;
        background: #13131a; border-radius: 22px 22px 0 0;
        padding: 20px 16px 36px; animation: abSlideUp .25s ease;
      }
      @keyframes abSlideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

      .ab-painel-hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
      .ab-painel-title { font-size: 18px; font-weight: 900; color: #fff; }
      .ab-painel-sub   { font-size: 12px; color: rgba(255,255,255,.4); margin-top: 2px; }
      .ab-painel-close {
        background: rgba(255,255,255,.08); border: none;
        border-radius: 50%; width: 30px; height: 30px;
        color: rgba(255,255,255,.6); font-size: 14px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
      }

      .ab-status-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
      .ab-status-card {
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.07);
        border-radius: 14px; padding: 12px 10px; text-align: center;
      }
      .ab-status-icon { font-size: 18px; margin-bottom: 4px; }
      .ab-status-val  { font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 2px; }
      .ab-status-lbl  { font-size: 9px; text-transform: uppercase; letter-spacing: .8px; color: rgba(255,255,255,.35); }

      .ab-btn-dl {
        width: 100%;
        background: linear-gradient(135deg, #1a5c2e, #166534);
        border: 1px solid rgba(74,222,128,.25);
        border-radius: 14px; padding: 13px; color: #4ade80;
        font-size: 14px; font-weight: 800; font-family: inherit;
        cursor: pointer; margin-bottom: 8px; transition: opacity .2s;
      }
      .ab-btn-dl:active { opacity: .8; }

      .ab-btn-nuvem {
        width: 100%;
        background: rgba(96,165,250,.08);
        border: 1px solid rgba(96,165,250,.2);
        border-radius: 14px; padding: 11px; color: #60a5fa;
        font-size: 13px; font-weight: 700; font-family: inherit;
        cursor: pointer; margin-bottom: 18px; transition: opacity .2s;
      }
      .ab-btn-nuvem:active { opacity: .7; }

      .ab-snaps-title {
        font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; color: rgba(255,255,255,.35); margin-bottom: 10px;
      }
      .ab-snaps-empty { text-align: center; color: rgba(255,255,255,.3); font-size: 13px; padding: 20px 0; }
      .ab-snaps-list  { display: flex; flex-direction: column; gap: 7px; }
      .ab-snap-row {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.07);
        border-radius: 12px; padding: 11px 13px;
      }
      .ab-snap-row.recente { background: rgba(74,222,128,.06); border-color: rgba(74,222,128,.2); }
      .ab-snap-info { flex: 1; min-width: 0; }
      .ab-snap-data {
        font-size: 13px; font-weight: 600; color: rgba(255,255,255,.85);
        display: flex; align-items: center; gap: 6px;
      }
      .ab-snap-badge {
        font-size: 9px; background: rgba(74,222,128,.15); color: #4ade80;
        border-radius: 6px; padding: 2px 6px; font-weight: 700; letter-spacing: .5px;
      }
      .ab-snap-kb { font-size: 11px; color: rgba(255,255,255,.35); margin-top: 2px; }
      .ab-snap-btn {
        background: rgba(96,165,250,.1);
        border: 1px solid rgba(96,165,250,.2);
        border-radius: 9px; padding: 6px 11px; color: #60a5fa;
        font-size: 11px; font-weight: 700; font-family: inherit;
        cursor: pointer; white-space: nowrap; flex-shrink: 0;
      }
      .ab-snap-btn:active { opacity: .7; }

      .ab-rodape {
        margin-top: 16px; font-size: 11px; color: rgba(255,255,255,.25);
        line-height: 1.6; text-align: center;
      }
    `;
    document.head.appendChild(s);
  }
};

// ── Auto-inicia quando o DOM estiver pronto ──
(function() {
  function iniciar() {
    if (typeof CFG === 'undefined' || typeof DB === 'undefined') {
      setTimeout(iniciar, 500);
      return;
    }
    AUTOBACKUP.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    setTimeout(iniciar, 500);
  }
})();
