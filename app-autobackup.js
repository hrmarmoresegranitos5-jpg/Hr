// ══════════════════════════════════════════════════════════════
// AUTO-BACKUP — HR Mármores e Granitos  v2
// • Salva snapshot no localStorage a cada 30 minutos
// • Mantém os últimos 7 snapshots locais (rotação automática)
// • Dispara download automático uma vez por dia
// • Sincroniza com Supabase usando a coluna "dados" existente,
//   guardando o backup dentro da chave "_ab" do JSON da linha
//   (não precisa criar coluna nova no banco)
// • Painel integrado em Configurações → aba "🛡️ Backup"
//   (sem badge flutuante na tela inicial)
// ══════════════════════════════════════════════════════════════

var AUTOBACKUP = {

  // ── Configuração ──
  INTERVALO_MIN:   30,
  MAX_SNAPSHOTS:   7,
  KEY_SNAPSHOTS:  'hr_ab_snaps',
  KEY_ULTIMO_DL:  'hr_ab_ultimo_dl',
  KEY_ULTIMO_SV:  'hr_ab_ultimo_sv',
  KEY_NUVEM_TS:   'hr_ab_nuvem_ts',

  // ── Supabase (mesma config do app) ──
  SUPABASE_URL: 'https://rdqvjohsxiydcdigygvn.supabase.co',
  SUPABASE_KEY: 'sb_publishable_TxqiXyBNdlePn1d1dFzVug_DjcpKAKp',
  CHAVE:        'hr_marmores_granitos',

  _timer: null,
  _pushDebounce: null,

  // ── Inicializa ──
  init: function() {
    var self = this;
    // Injeta estilos e toast (sem badge flutuante)
    this._injetarEstilos();
    this._criarToast();
    // Primeiro snapshot após 10s
    setTimeout(function() { self.salvarSnapshot(); }, 10000);
    // Snapshots periódicos
    this._timer = setInterval(function() { self.salvarSnapshot(); }, this.INTERVALO_MIN * 60 * 1000);
    // Download diário
    setTimeout(function() { self._verificarDownloadDiario(); }, 5000);
    // Puxa backup da nuvem ao abrir
    setTimeout(function() { self._pullNuvem(); }, 3000);
    // Registra o renderizador da aba de Backup em Configurações
    this._registrarAbaCfg();
  },

  // ── Registra a aba "Backup" no sistema de Configurações ──
  _registrarAbaCfg: function() {
    // Aguarda o cfgTabs existir no DOM
    var self = this;
    var tentativas = 0;
    function tentar() {
      var tabs = document.getElementById('cfgTabs');
      if (!tabs) {
        if (tentativas++ < 20) setTimeout(tentar, 500);
        return;
      }
      // Adiciona aba se ainda não existe
      if (!document.querySelector('[data-cftab="8"]')) {
        var novaAba = document.createElement('div');
        novaAba.className = 'cfgtab';
        novaAba.setAttribute('data-cftab', '8');
        novaAba.textContent = '🛡️ Backup';
        tabs.appendChild(novaAba);
      }
      // Intercepta clique nas abas para capturar quando cftab=8 é selecionada
      self._observarAbas();
    }
    tentar();
  },

  _observarAbas: function() {
    var self = this;
    var tabs = document.getElementById('cfgTabs');
    if (!tabs) return;

    // Usa event delegation no container das abas
    tabs.addEventListener('click', function(e) {
      var tab = e.target.closest('[data-cftab]');
      if (!tab) return;
      var cftab = tab.getAttribute('data-cftab');
      if (cftab === '8') {
        // Pequeno delay para o app-core marcar a aba como ativa e limpar cfgBody
        setTimeout(function() { self.renderizarPainelCfg(); }, 30);
      }
    });
  },

  // ── Renderiza o painel de backup dentro do cfgBody ──
  renderizarPainelCfg: function() {
    var body = document.getElementById('cfgBody');
    if (!body) return;

    var lista = [];
    try { lista = JSON.parse(localStorage.getItem(this.KEY_SNAPSHOTS) || '[]'); } catch(e) {}
    var listaRev = lista.slice().reverse();

    var totalKb = listaRev.reduce(function(s, x) { return s + (x.kb || 0); }, 0);
    var nuvemTs = +localStorage.getItem(this.KEY_NUVEM_TS) || 0;
    var nuvemStr = nuvemTs ? new Date(nuvemTs).toLocaleString('pt-BR') + ' ☁️' : '—';

    var h = '<div class="ab-cfg-painel">';

    // Cards de status
    h += '<div class="ab-status-grid">';
    h += '<div class="ab-status-card">';
    h += '<div class="ab-status-icon">🗂️</div>';
    h += '<div class="ab-status-val">' + listaRev.length + '/' + this.MAX_SNAPSHOTS + '</div>';
    h += '<div class="ab-status-lbl">Snapshots</div>';
    h += '</div>';
    h += '<div class="ab-status-card">';
    h += '<div class="ab-status-icon">💾</div>';
    h += '<div class="ab-status-val">' + totalKb + ' KB</div>';
    h += '<div class="ab-status-lbl">Armazenado</div>';
    h += '</div>';
    h += '<div class="ab-status-card">';
    h += '<div class="ab-status-icon">☁️</div>';
    h += '<div class="ab-status-val" style="font-size:10px;line-height:1.3;">' + (nuvemTs ? 'Ativo' : '—') + '</div>';
    h += '<div class="ab-status-lbl">Supabase</div>';
    h += '</div>';
    h += '</div>';

    // Botões de ação
    h += '<button class="ab-btn-dl" onclick="AUTOBACKUP._dispararDownload();AUTOBACKUP._mostrarToastBackup(\'📥 Backup gerado!\')">';
    h += '📥 Baixar Backup Agora</button>';

    h += '<button class="ab-btn-nuvem" onclick="AUTOBACKUP._pullNuvem();AUTOBACKUP._mostrarToastBackup(\'☁️ Buscando da nuvem...\')">';
    h += '☁️ Sincronizar da Nuvem</button>';

    h += '<button class="ab-btn-snap" onclick="AUTOBACKUP.salvarSnapshot();AUTOBACKUP._mostrarToastBackup(\'✅ Snapshot salvo!\');setTimeout(function(){AUTOBACKUP.renderizarPainelCfg()},400)">';
    h += '📸 Salvar Snapshot Agora</button>';

    // Histórico
    h += '<div class="ab-snaps-title">Histórico de Snapshots</div>';
    if (listaRev.length === 0) {
      h += '<div class="ab-snaps-empty">Nenhum snapshot ainda. O primeiro será salvo em breve.</div>';
    } else {
      h += '<div class="ab-snaps-list">';
      listaRev.forEach(function(s, i) {
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

    h += '<div class="ab-rodape">Snapshots salvos a cada ' + AUTOBACKUP.INTERVALO_MIN + ' min · Download automático 1×/dia · Backup na nuvem ativo</div>';
    h += '</div>';

    body.innerHTML = h;
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
      // Guard: CFG e DB precisam existir
      if (typeof CFG === 'undefined' || typeof DB === 'undefined') return;
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

      // Envia para nuvem (debounce 5s)
      this._pushNuvem(dados);

    } catch(e) {
      console.warn('[AutoBackup] Erro ao salvar snapshot:', e);
    }
  },

  // ── Push para Supabase usando coluna "dados" existente ──
  // Guarda o backup na chave "_ab" dentro do JSON que vai para a coluna dados.
  // Assim não precisa de coluna extra no banco.
  _pushNuvem: function(dados) {
    var self = this;
    clearTimeout(self._pushDebounce);
    self._pushDebounce = setTimeout(function() {
      try {
        var url = self.SUPABASE_URL + '/rest/v1/hr_sync';
        var headers = {
          'Content-Type': 'application/json',
          'apikey': self.SUPABASE_KEY,
          'Authorization': 'Bearer ' + self.SUPABASE_KEY,
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        };

        // Primeiro, lê a linha atual para preservar o campo "dados" original
        var readUrl = url + '?codigo=eq.' + encodeURIComponent(self.CHAVE) + '&select=dados';
        fetch(readUrl, { headers: { 'apikey': self.SUPABASE_KEY, 'Authorization': 'Bearer ' + self.SUPABASE_KEY } })
          .then(function(r) { return r.json(); })
          .then(function(rows) {
            // Tenta parsear a linha existente
            var dadosAtual = {};
            if (rows && rows.length && rows[0].dados) {
              try { dadosAtual = JSON.parse(rows[0].dados); } catch(e) { dadosAtual = {}; }
            }
            // Injeta o backup na chave _ab
            dadosAtual._ab = { ts: dados._ts, json: JSON.stringify(dados) };
            var novosDados = JSON.stringify(dadosAtual);

            var body = JSON.stringify({ codigo: self.CHAVE, dados: novosDados });
            return fetch(url, { method: 'POST', headers: headers, body: body });
          })
          .then(function(r) {
            if (r && r.ok) {
              localStorage.setItem(self.KEY_NUVEM_TS, String(dados._ts));
              self._mostrarToastBackup('☁️ Backup salvo na nuvem!');
            }
          })
          .catch(function(err) {
            console.warn('[AutoBackup] Erro ao enviar para nuvem:', err);
          });
      } catch(e) {
        console.warn('[AutoBackup] Erro ao enviar para nuvem:', e);
      }
    }, 5000);
  },

  // ── Pull da nuvem ao abrir ──
  // Lê a coluna "dados" e extrai a chave "_ab"
  _pullNuvem: function() {
    var self = this;
    try {
      var url = self.SUPABASE_URL + '/rest/v1/hr_sync?codigo=eq.' +
                encodeURIComponent(self.CHAVE) + '&select=dados';
      var headers = {
        'apikey': self.SUPABASE_KEY,
        'Authorization': 'Bearer ' + self.SUPABASE_KEY
      };
      fetch(url, { headers: headers })
        .then(function(r) { return r.json(); })
        .then(function(rows) {
          if (!rows || !rows.length || !rows[0].dados) return;
          var dadosAtual = {};
          try { dadosAtual = JSON.parse(rows[0].dados); } catch(e) { return; }
          var ab = dadosAtual._ab;
          if (!ab || !ab.json || !ab.ts) return;

          var localTs = +localStorage.getItem(self.KEY_ULTIMO_SV) || 0;
          if (ab.ts <= localTs) return;

          // Nuvem tem dado mais recente — adiciona como snapshot
          try {
            var dadosNuvem = JSON.parse(ab.json);
            var lista = [];
            try { lista = JSON.parse(localStorage.getItem(self.KEY_SNAPSHOTS) || '[]'); } catch(e) { lista = []; }

            var existe = lista.some(function(s) { return s.ts === dadosNuvem._ts; });
            if (!existe) {
              lista.push({
                ts:      dadosNuvem._ts,
                data:    new Date(dadosNuvem._ts).toLocaleString('pt-BR') + ' ☁️',
                kb:      Math.round(ab.json.length / 1024),
                json:    ab.json,
                deNuvem: true
              });
              if (lista.length > self.MAX_SNAPSHOTS) {
                lista = lista.slice(lista.length - self.MAX_SNAPSHOTS);
              }
              localStorage.setItem(self.KEY_SNAPSHOTS, JSON.stringify(lista));
              localStorage.setItem(self.KEY_NUVEM_TS, String(ab.ts));
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
  _criarToast: function() {
    if (document.getElementById('ab-toast')) return;
    var toast = document.createElement('div');
    toast.id  = 'ab-toast';
    document.body.appendChild(toast);
  },

  _mostrarToastBackup: function(msg) {
    var el = document.getElementById('ab-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visivel');
    setTimeout(function() { el.classList.remove('visivel'); }, 4000);
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
      /* ─── Toast ─────────────────────────────────────────── */
      #ab-toast {
        position: fixed; bottom: 80px; left: 50%;
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

      /* ─── Painel integrado em Configurações ────────────── */
      .ab-cfg-painel { padding: 12px 0 40px; }

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
        cursor: pointer; margin-bottom: 8px; transition: opacity .2s; display: block;
      }
      .ab-btn-dl:active { opacity: .8; }

      .ab-btn-nuvem {
        width: 100%;
        background: rgba(96,165,250,.08);
        border: 1px solid rgba(96,165,250,.2);
        border-radius: 14px; padding: 11px; color: #60a5fa;
        font-size: 13px; font-weight: 700; font-family: inherit;
        cursor: pointer; margin-bottom: 8px; transition: opacity .2s; display: block;
      }
      .ab-btn-nuvem:active { opacity: .7; }

      .ab-btn-snap {
        width: 100%;
        background: rgba(201,168,76,.08);
        border: 1px solid rgba(201,168,76,.2);
        border-radius: 14px; padding: 11px; color: #c9a84c;
        font-size: 13px; font-weight: 700; font-family: inherit;
        cursor: pointer; margin-bottom: 18px; transition: opacity .2s; display: block;
      }
      .ab-btn-snap:active { opacity: .7; }

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
        display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
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
