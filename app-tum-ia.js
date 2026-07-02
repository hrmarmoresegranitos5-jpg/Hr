// ══════════════════════════════════════════════════════════════════════════════
// TÚMULO IA v2 — Assistente especialista em orçamentos de túmulos
// Integração total com DB, gerarPDFTumulo e sistema de orçamentos HR
// ══════════════════════════════════════════════════════════════════════════════

// ── Estado global por sessão ──────────────────────────────────────────────────
var _tumIA = {
  sessions: {},    // { [ambId]: { history, thinking, lastOrc } }
  activeId: null
};

function _tumIASession(ambId) {
  if (!_tumIA.sessions[ambId]) {
    _tumIA.sessions[ambId] = {
      history:  [{ role: 'assistant', content: _tumIA_WELCOME }],
      thinking: false,
      lastOrc:  null
    };
  }
  return _tumIA.sessions[ambId];
}

// ── Estilos — injetados uma única vez ────────────────────────────────────────
var _tumIAStylesOk = false;
function _tumIAInjectStyles() {
  if (_tumIAStylesOk) return;
  _tumIAStylesOk = true;
  var s = document.createElement('style');
  s.id = 'tumia-styles';
  document.head.appendChild(s);
  s.textContent = `
  /* ── wrapper ── */
  .tumia-wrap{
    background:linear-gradient(150deg,#0c0c16 0%,#0e0d08 100%);
    border:1px solid rgba(201,168,76,.2);
    border-radius:14px;
    margin:10px 0;
    display:flex;
    flex-direction:column;
    height:540px;
    overflow:hidden;
    font-family:Outfit,sans-serif;
    position:relative;
  }
  /* ── header ── */
  .tumia-hdr{
    display:flex;
    align-items:center;
    gap:10px;
    padding:11px 15px;
    background:rgba(201,168,76,.06);
    border-bottom:1px solid rgba(201,168,76,.13);
    flex-shrink:0;
  }
  .tumia-hdr-ico{font-size:1.3rem;line-height:1}
  .tumia-hdr-title{font-size:.75rem;font-weight:700;color:#c9a84c;letter-spacing:.8px;text-transform:uppercase}
  .tumia-hdr-sub{font-size:.6rem;color:rgba(255,255,255,.3);margin-top:1px}
  .tumia-hdr-btns{margin-left:auto;display:flex;gap:6px;align-items:center}
  .tumia-btn-sm{
    background:none;border:1px solid rgba(201,168,76,.2);border-radius:6px;
    color:rgba(201,168,76,.5);font-size:.6rem;padding:3px 8px;cursor:pointer;
    font-family:Outfit,sans-serif;transition:all .15s;
  }
  .tumia-btn-sm:hover{color:#c9a84c;border-color:#c9a84c;background:rgba(201,168,76,.06)}
  .tumia-btn-sm.danger:hover{color:#e55;border-color:#e55;background:rgba(220,50,50,.06)}

  /* ── progress ── */
  .tumia-progress{
    display:flex;gap:3px;padding:8px 15px 0;flex-shrink:0;
  }
  .tumia-step{
    flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.08);transition:background .3s;
  }
  .tumia-step.done{background:rgba(201,168,76,.5)}
  .tumia-step.active{background:#c9a84c}

  /* ── msgs ── */
  .tumia-msgs{
    flex:1;overflow-y:auto;padding:12px 13px 6px;
    display:flex;flex-direction:column;gap:9px;
  }
  .tumia-msgs::-webkit-scrollbar{width:3px}
  .tumia-msgs::-webkit-scrollbar-thumb{background:rgba(201,168,76,.18);border-radius:3px}

  .tumia-msg{
    max-width:86%;font-size:.76rem;line-height:1.55;
    padding:9px 12px;border-radius:12px;
    white-space:pre-wrap;word-break:break-word;
    animation:tumiaIn .18s ease;
  }
  @keyframes tumiaIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  .tumia-msg.user{
    align-self:flex-end;
    background:rgba(201,168,76,.13);
    border:1px solid rgba(201,168,76,.22);
    color:#f0e8d0;
  }
  .tumia-msg.bot{
    align-self:flex-start;
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.07);
    color:rgba(255,255,255,.83);
  }
  .tumia-msg.bot b,.tumia-msg.bot strong{color:#c9a84c}
  .tumia-msg.bot .tumia-tag{
    display:inline-block;font-size:.6rem;padding:1px 6px;
    border-radius:10px;background:rgba(201,168,76,.15);
    color:#c9a84c;border:1px solid rgba(201,168,76,.2);
    margin-right:3px;vertical-align:middle;
  }
  .tumia-msg.thinking{
    color:rgba(255,255,255,.25);font-style:italic;
    font-size:.7rem;background:none;border:none;padding:2px 4px;
  }
  .tumia-msg.thinking::after{
    content:'';animation:tumiaDots 1.2s infinite;
  }
  @keyframes tumiaDots{
    0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}100%{content:''}
  }

  /* ── chips ── */
  .tumia-chips{
    display:flex;flex-wrap:wrap;gap:5px;padding:5px 13px;flex-shrink:0;
  }
  .tumia-chip{
    font-size:.64rem;padding:5px 10px;border-radius:20px;
    border:1px solid rgba(201,168,76,.22);
    color:rgba(201,168,76,.65);background:rgba(201,168,76,.04);
    cursor:pointer;transition:all .15s;font-family:Outfit,sans-serif;
  }
  .tumia-chip:hover{
    background:rgba(201,168,76,.11);color:#c9a84c;
    border-color:rgba(201,168,76,.45);transform:translateY(-1px);
  }

  /* ── input ── */
  .tumia-inp-row{
    display:flex;gap:7px;padding:8px 12px 11px;
    border-top:1px solid rgba(255,255,255,.05);flex-shrink:0;
  }
  .tumia-inp{
    flex:1;background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.09);
    border-radius:10px;color:#fff;font-size:.76rem;
    font-family:Outfit,sans-serif;padding:8px 11px;
    resize:none;height:38px;outline:none;transition:border .2s;
  }
  .tumia-inp:focus{border-color:rgba(201,168,76,.38)}
  .tumia-inp::placeholder{color:rgba(255,255,255,.22)}
  .tumia-send{
    background:#c9a84c;border:none;border-radius:10px;
    color:#0c0c16;font-size:1rem;width:38px;height:38px;
    cursor:pointer;font-weight:900;transition:opacity .15s;
    display:flex;align-items:center;justify-content:center;
  }
  .tumia-send:hover{opacity:.85}
  .tumia-send:disabled{opacity:.3;cursor:not-allowed}
  .tumia-inp-row{align-items:flex-end}
  .tumia-photo-btn{
    background:none;border:1px solid rgba(201,168,76,.28);border-radius:10px;
    color:rgba(201,168,76,.6);font-size:1.05rem;width:38px;height:38px;
    cursor:pointer;transition:all .15s;display:flex;align-items:center;
    justify-content:center;flex-shrink:0;
  }
  .tumia-photo-btn:hover{background:rgba(201,168,76,.1);color:#c9a84c;border-color:#c9a84c}
  .tumia-photo-preview{
    display:flex;align-items:center;gap:8px;
    padding:6px 12px;background:rgba(201,168,76,.05);
    border-top:1px solid rgba(201,168,76,.12);flex-shrink:0;
  }
  .tumia-photo-preview img{
    width:46px;height:46px;object-fit:cover;border-radius:7px;
    border:1px solid rgba(201,168,76,.3);
  }
  .tumia-photo-preview-info{flex:1;font-size:.62rem;color:rgba(255,255,255,.45)}
  .tumia-photo-preview-info b{color:#c9a84c;font-size:.68rem;display:block;margin-bottom:1px}
  .tumia-photo-remove{
    background:none;border:none;color:rgba(255,80,80,.55);font-size:.8rem;
    cursor:pointer;padding:2px 5px;border-radius:5px;transition:color .15s;
  }
  .tumia-photo-remove:hover{color:#f55}
  .tumia-msg-photo{
    max-width:100%;border-radius:8px;margin-bottom:5px;display:block;
    border:1px solid rgba(201,168,76,.2);
  }

  /* ── card de orçamento ── */
  .tumia-orc-card{
    align-self:flex-start;width:calc(100% - 2px);
    background:linear-gradient(135deg,rgba(201,168,76,.09),rgba(201,168,76,.04));
    border:1px solid rgba(201,168,76,.3);border-radius:12px;
    padding:13px 14px;font-size:.72rem;color:rgba(255,255,255,.75);
    animation:tumiaIn .3s ease;
  }
  .tumia-orc-sec{font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;
    color:rgba(201,168,76,.55);margin-bottom:6px}
  .tumia-orc-cli{font-size:.85rem;font-weight:700;color:#fff;margin-bottom:2px}
  .tumia-orc-tipo{font-size:.65rem;color:rgba(255,255,255,.4);margin-bottom:8px}
  .tumia-orc-total{
    font-size:1.25rem;font-weight:700;color:#c9a84c;
    margin:6px 0 2px;
  }
  .tumia-orc-detail{color:rgba(255,255,255,.4);font-size:.65rem;margin-bottom:10px}
  .tumia-orc-actions{display:flex;gap:7px;flex-wrap:wrap}
  .tumia-orc-btn{
    font-size:.66rem;font-weight:700;padding:6px 13px;
    border-radius:8px;border:none;cursor:pointer;
    font-family:Outfit,sans-serif;transition:opacity .15s;letter-spacing:.3px;
  }
  .tumia-orc-btn:hover{opacity:.85}
  .tumia-orc-btn.primary{background:#c9a84c;color:#0c0c16}
  .tumia-orc-btn.secondary{
    background:none;border:1px solid rgba(201,168,76,.3);
    color:#c9a84c;
  }
  .tumia-orc-btn.secondary:hover{background:rgba(201,168,76,.1)}

  /* ── divider ── */
  .tumia-divider{
    font-size:.58rem;letter-spacing:2px;text-transform:uppercase;
    color:rgba(255,255,255,.18);text-align:center;
    padding:2px 0;margin:2px 0;
  }
  `;
}

// ── Bem-vinda ─────────────────────────────────────────────────────────────────
var _tumIA_WELCOME = [
  '⚰️ Olá! Sou a assistente especialista em orçamentos de túmulos da **HR Mármores e Granitos**.',
  '',
  'Vou te guiar pelo processo completo — do tipo de estrutura até o PDF final.',
  '',
  'Para começar, me diga: **qual é o nome do cliente** e que tipo de túmulo ele precisa?'
].join('\n');

// ── Chips iniciais ────────────────────────────────────────────────────────────
var _tumIA_CHIPS_INIT = [
  '🪦 Túmulo simples',
  '🗄️ Com gaveta',
  '⛪ Capelinha c/ pilares',
  '👨‍👩‍👧 Jazigo familiar',
  '🔨 Reforma',
];

var _tumIA_CHIPS_ADJUST = [
  '✅ Gerar PDF',
  '💲 Ajustar valor',
  '📐 Alterar dimensões',
  '➕ Adicionar item',
];

// ── Etapas de progresso ───────────────────────────────────────────────────────
var _tumIA_STEPS = ['Cliente', 'Tipo', 'Dimensões', 'Material', 'Itens', 'Valores', 'PDF'];

function _tumIAGuessStep(hist) {
  var joined = hist.map(function(m){ return m.content; }).join(' ').toLowerCase();
  if (/pdf|gerar|confirmar/.test(joined)) return 6;
  if (/parcelado|à vista|total|r\$\s*\d/.test(joined)) return 5;
  if (/inclu|lápide|cruz|vaso|brinde/.test(joined)) return 4;
  if (/mármore|granito|branco|preto|polida|material/.test(joined)) return 3;
  if (/\d+\s*[x×]\s*\d+|\d+\s*cm/.test(joined)) return 2;
  if (/simples|gaveta|capelinha|jazigo|reforma|túmulo|tumulo/.test(joined)) return 1;
  if (hist.length > 1) return 0;
  return -1;
}

// ── Prompt do sistema ─────────────────────────────────────────────────────────
function _tumIASystemPrompt() {
  var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);

  // Preço da pedra: busca do catálogo real ou fallback
  var preco_pedra = 350;
  var stones = (typeof CFG !== 'undefined' && CFG.stones) ? CFG.stones : [];
  if (!stones.length && typeof DEF_STONES !== 'undefined') stones = DEF_STONES;
  var branco = stones.find(function(s){ return /branco.*pinta|pinta.*verde/i.test(s.nm||''); });
  if (branco && branco.pr) preco_pedra = branco.pr;

  // Clientes recentes do DB
  var cliRecentes = [];
  try {
    var orcs = (typeof DB !== 'undefined' && DB.q) ? DB.q : [];
    var seen = {};
    orcs.slice(-30).forEach(function(q){ if(q.cli && !seen[q.cli]){ seen[q.cli]=1; cliRecentes.push(q.cli); }});
  } catch(e) {}

  // Juros e parcelamento da configuração
  var juros    = (typeof CFG !== 'undefined' && CFG.juros)   ? CFG.juros   : 12;
  var parcMax  = (typeof CFG !== 'undefined' && CFG.parcMax) ? CFG.parcMax : 8;

  return [
    'Você é a assistente especialista em orçamentos de TÚMULOS da HR Mármores e Granitos — Pilão Arcado-BA.',
    'Data: ' + hoje + ' | Preço pedra padrão: R$ ' + preco_pedra + '/m² | Juros parcelamento: ' + juros + '% | Parcelas máx: ' + parcMax + 'x',
    cliRecentes.length ? 'Clientes recentes: ' + cliRecentes.join(', ') : '',
    '',
    '═══ CONDUTA ═══',
    'Faça UMA pergunta por vez. Confirme cada dado antes de avançar.',
    'Quando o usuário der dimensões, calcule imediatamente todas as peças e mostre o m² total.',
    'Se o usuário responder de forma incompleta, peça gentilmente o dado faltante.',
    'Não peça informações que não são necessárias (ex: cemitério não é obrigatório para o orçamento).',
    '',
    '═══ ANÁLISE DE FOTO (VISÃO) ═══',
    'Quando o histórico contiver [FOTO ENVIADA], o usuário enviou uma imagem do túmulo para análise visual.',
    'Ao receber uma foto:',
    '1. Identifique o modelo/tipo do túmulo (simples, gaveta, capelinha c/ pilares, jazigo, etc.)',
    '2. Descreva brevemente a estrutura que você vê (ex: "Vejo uma capelinha com 4 pilares, base com degrau...")',
    '3. Inicie o levantamento das medidas NA SEQUÊNCIA ABAIXO, uma pergunta por vez:',
    '   a) Largura total (L) e Comprimento total (C) da base em cm',
    '   b) Altura total (H) da estrutura em cm',
    '   c) SE tiver capelinha/pilares: largura e comprimento dos pilares (padrão 25×25cm)',
    '   d) SE tiver capelinha: largura da laje/teto da capelinha e altura dos pilares',
    '   e) SE tiver degraus: quantos degraus e altura de cada (padrão 10cm)',
    '   f) SE tiver gaveta: confirmar dimensões da gaveta',
    '4. Após coletar TODAS as medidas, calcule as peças e mostre o m² de cada peça',
    '5. Pergunte se os cálculos estão corretos antes de prosseguir para material/valores',
    'IMPORTANTE: Seja específico ao descrever o que vê. Se a foto for de baixa qualidade, informe e peça confirmação das medidas.',
    '',
    '═══ FLUXO IDEAL (SEM FOTO) ═══',
    '1. Nome do cliente',
    '2. Tipo (simples / gaveta / capelinha / jazigo / reforma)',
    '3. Dimensões C×L×H em cm (ex: 230×130×190)',
    '4. Material — confirma Branco Pinta Verde ou pergunta outro',
    '5. Itens inclusos: Cruz? Lápide com foto? Vasos? Argolas? Degraus (quantos)?',
    '6. Acréscimos: valor extra (ex: +R$1.570 de mão de obra/material)',
    '7. Apresenta orçamento completo com todas as peças e valores',
    '8. Pergunta se gera PDF',
    '',
    '═══ FLUXO IDEAL (COM FOTO) ═══',
    '1. Analisa a foto → descreve o modelo identificado',
    '2. Nome do cliente',
    '3. Coleta medidas uma a uma (largura, comprimento, altura, pilares, capelinha...)',
    '4. Mostra cálculo de cada peça → pergunta se está correto',
    '5. Confirma e ajusta medidas se necessário',
    '6. Material → Itens → Acréscimos → PDF',
    '',
    '═══ CÁLCULO DE PEÇAS ═══',
    '',
    'REGRA GERAL:',
    '• Tampa horizontal = C × L (m²)',
    '• Face vertical     = C × H ou L × H (m²)',
    '• Multiplique pela quantidade',
    '• Converta sempre de cm para metros (÷100)',
    '',
    'RODAPÉ (3 peças, H padrão=10cm):',
    '  • Frontal ×1: C × 0.10',
    '  • Laterais ×2: L × 0.10',
    '',
    'DEGRAU (H padrão=10cm):',
    '  • Tampa ×1: C × L',
    '  • Laterais ×2: C × 0.10',
    '  • Testeiras ×2: L × 0.10',
    '',
    'CORPO TÚMULO:',
    '  • Frente ×1: C × H_corpo',
    '  • Laterais ×2: L × H_corpo',
    '  • Tampa superior ×1: C × L',
    '  • Fundo interno ×1: (C-0.04) × (L-0.04)',
    '',
    'GAVETA COM ARGOLAS:',
    '  • Tampa c/argolas ×1: (C-0.04) × (L-0.04)',
    '  • Laterais ×2: (C-0.04) × 0.10',
    '  • Testeiras ×2: (L-0.04) × 0.10',
    '',
    'CAPELINHA / PILARES (H_pilar padrão=100cm):',
    '  • 4 pilares 25×25cm: 4 × 0.25 × H_pilar × 4 faces (simplificado: 4 × H_pilar)',
    '  • Laje face inf ×1: C × L',
    '  • Laje face sup ×1: C × L',
    '  • Bordas laje ×4: 2×(C×0.10) + 2×(L×0.10)',
    '  • Testa/Friso: 2×(C×0.10) + 2×(L×0.10)',
    '',
    'LÁPIDE: não soma m² (valor fixo incluso)',
    'CRUZ: não soma m² (valor fixo incluso)',
    'VASOS: não soma m² (valor fixo incluso)',
    '',
    '═══ CÁLCULO FINANCEIRO ═══',
    '• Valor pedra = total_m2 × R$' + preco_pedra,
    '• Acréscimos (mão de obra, material civil, frete etc.) = soma em R$',
    '• Total à vista = valor_pedra + acréscimos',
    '• Parcelado = total_vista × 1.' + juros + ' ÷ ' + parcMax + ' = X/mês',
    '• Entrada = total_vista × 0.50',
    '• Prazo padrão: 20 dias úteis após assinatura',
    '',
    '═══ BRINDE ═══',
    'Se o usuário mencionar brinde ou presente, registre como "3 Cruzes Granito Simples — Brinde" sem custo.',
    '',
    '═══ FORMATO DO ORÇAMENTO FINAL ═══',
    'Quando tiver todos os dados, responda EXATAMENTE neste formato:',
    '',
    '**ORÇAMENTO — [NOME]**',
    '[Tipo de estrutura]',
    '',
    '📐 **Peças:**',
    '• [Nome da peça] (×qtd): [dim] = [X,XXX] m²',
    '(...todas as peças)',
    '**Total pedra: XX,XXX m²**',
    '',
    '💰 **Valores:**',
    '• Pedra: XX,XXX m² × R$ ' + preco_pedra + ' = R$ X.XXX,XX',
    '• [item extra]: R$ X.XXX,XX  ← (se houver)',
    '• **À vista: R$ X.XXX,XX**',
    '• Parcelado ' + parcMax + '× (+' + juros + '%): R$ X.XXX,XX/mês',
    '• Entrada (50%): R$ X.XXX,XX | Entrega: R$ X.XXX,XX',
    '',
    '📦 Prazo: 20 dias úteis',
    '',
    'Após apresentar o orçamento, pergunte: "Posso gerar o PDF agora?"',
    '',
    '═══ CONFIRMAÇÃO PARA PDF ═══',
    'Quando o usuário confirmar o PDF, inclua ao final da resposta:',
    '```json',
    '{"action":"tumulo_orc_pronto","cli":"NOME","m2":XX.XXX,"preco_m2":' + preco_pedra + ',"extras":0,"total_vista":XXXX.XX,"tipo":"TIPO","parcelas":' + parcMax + ',"juros":' + juros + ',"pecas":[{"nm":"Tampa","qtd":1,"dim":"230×130","m2":2.99},{"nm":"...","qtd":1,"dim":"...","m2":0}]}',
    '```',
    '',
    '═══ PERSONALIDADE ═══',
    'Tom: profissional, acolhedor, objetivo. Lembre que é um momento sensível.',
    'Português brasileiro. Máximo 12 linhas salvo orçamento completo.',
    'Use **negrito** para valores e nomes. Use • para listas.',
    'Emojis com moderação.',
  ].filter(Boolean).join('\n');
}

// ── Renderiza o chat ──────────────────────────────────────────────────────────
function tumIARender(ambId) {
  _tumIAInjectStyles();
  _tumIA.activeId = ambId;
  var sess = _tumIASession(ambId);

  // Mensagens
  var msgsHtml = sess.history.map(function(m) {
    var cls  = m.role === 'user' ? 'user' : 'bot';
    var html = _tumIAFmt(m.content);
    return '<div class="tumia-msg ' + cls + '">' + html + '</div>';
  }).join('');

  // Progress bar
  var step = _tumIAGuessStep(sess.history);
  var progress = _tumIA_STEPS.map(function(s, i) {
    var cl = i < step ? 'done' : i === step ? 'active' : '';
    return '<div class="tumia-step ' + cl + '" title="' + s + '"></div>';
  }).join('');

  // Chips contextuais
  var showChips = sess.history.length <= 1 ? _tumIA_CHIPS_INIT :
                  sess.lastOrc              ? _tumIA_CHIPS_ADJUST : [];
  var chipsHtml = showChips.length
    ? '<div class="tumia-chips">' + showChips.map(function(c) {
        return '<button class="tumia-chip" onclick="tumIAChip(' + JSON.stringify(c) + ',' + ambId + ')">' + c + '</button>';
      }).join('') + '</div>'
    : '';

  // Seletor de pedras — exibe se sessão estiver na etapa certa
  var stonesHtml = (!sess.stoneId && _tumIAShouldShowStones(sess))
    ? tumIARenderStones(ambId) : '';

  return (
    '<div class="tumia-wrap" id="tumiaWrap_' + ambId + '">' +
      '<div class="tumia-hdr">' +
        '<div class="tumia-hdr-ico">⚰️</div>' +
        '<div>' +
          '<div class="tumia-hdr-title">Assistente Túmulo — IA</div>' +
          '<div class="tumia-hdr-sub">HR Mármores e Granitos · especialista</div>' +
        '</div>' +
        '<div class="tumia-hdr-btns">' +
          (sess.lastOrc
            ? '<button class="tumia-btn-sm" onclick="tumIAGerarPDF(' + ambId + ')">📄 PDF</button>'
            : '') +
          '<button class="tumia-btn-sm" onclick="tumIASalvarRascunho(' + ambId + ')">💾</button>' +
          '<button class="tumia-btn-sm danger" onclick="tumIAClear(' + ambId + ')">↺</button>' +
        '</div>' +
      '</div>' +
      '<div class="tumia-progress" id="tumiaProgress_' + ambId + '">' + progress + '</div>' +
      '<div class="tumia-msgs" id="tumiaMsgs_' + ambId + '">' + msgsHtml + '</div>' +
      chipsHtml +
      stonesHtml +
      '<div id="tumiaPhotoPreview_' + ambId + '" class="tumia-photo-preview" style="display:none"></div>' +
      '<div class="tumia-inp-row">' +
        '<input type="file" id="tumiaPhotoInput_' + ambId + '" accept="image/*" capture="environment" ' +
          'style="display:none" onchange="tumIAPhotoSelected(event,' + ambId + ')">' +
        '<button class="tumia-photo-btn" title="Enviar foto" ' +
          'onclick="document.getElementById(\'tumiaPhotoInput_' + ambId + '\').click()">📷</button>' +
        '<textarea class="tumia-inp" id="tumiaInp_' + ambId + '" ' +
          'placeholder="Escreva aqui ou envie uma foto... (Enter para enviar)" ' +
          'onkeydown="tumIAKey(event,' + ambId + ')"></textarea>' +
        '<button class="tumia-send" id="tumiaSend_' + ambId + '" ' +
          'onclick="tumIASend(' + ambId + ')">➤</button>' +
      '</div>' +
    '</div>'
  );
}

// ── Formata texto: **bold**, • listas, quebras ────────────────────────────────
function _tumIAFmt(txt) {
  if (!txt) return '';
  return txt
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.*?)__/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

// ── Scroll para o fim ─────────────────────────────────────────────────────────
function _tumIAScroll(ambId) {
  var el = document.getElementById('tumiaMsgs_' + ambId);
  if (el) setTimeout(function(){ el.scrollTop = el.scrollHeight; }, 40);
}

// ── Adiciona mensagem ao DOM sem re-renderizar tudo ───────────────────────────
function _tumIAAppend(ambId, role, content) {
  var el = document.getElementById('tumiaMsgs_' + ambId);
  if (!el) return;
  // Remove "pensando..."
  var th = el.querySelector('.thinking');
  if (th) th.remove();
  var d = document.createElement('div');
  d.className = 'tumia-msg ' + (role === 'user' ? 'user' : 'bot');
  d.innerHTML = _tumIAFmt(content);
  el.appendChild(d);
  _tumIAScroll(ambId);
  _tumIAUpdateProgress(ambId);
  _tumIAUpdateChips(ambId);
  // Verifica se deve exibir seletor de pedras
  if (role === 'bot') _tumIACheckShowStones(ambId);
}

// ── Atualiza barra de progresso ───────────────────────────────────────────────
function _tumIAUpdateProgress(ambId) {
  var sess = _tumIASession(ambId);
  var step = _tumIAGuessStep(sess.history);
  var el = document.getElementById('tumiaProgress_' + ambId);
  if (!el) return;
  el.innerHTML = _tumIA_STEPS.map(function(s, i) {
    var cl = i < step ? 'done' : i === step ? 'active' : '';
    return '<div class="tumia-step ' + cl + '" title="' + s + '"></div>';
  }).join('');
}

// ── Atualiza chips conforme contexto ─────────────────────────────────────────
function _tumIAUpdateChips(ambId) {
  var sess  = _tumIASession(ambId);
  var wrap  = document.getElementById('tumiaWrap_' + ambId);
  if (!wrap) return;
  var old = wrap.querySelector('.tumia-chips');
  if (old) old.remove();

  var chips = sess.lastOrc ? _tumIA_CHIPS_ADJUST : [];
  if (!chips.length) return;

  var div = document.createElement('div');
  div.className = 'tumia-chips';
  div.innerHTML = chips.map(function(c) {
    return '<button class="tumia-chip" onclick="tumIAChip(' + JSON.stringify(c) + ',' + ambId + ')">' + c + '</button>';
  }).join('');

  var inp = wrap.querySelector('.tumia-inp-row');
  wrap.insertBefore(div, inp);
}

// ── "Pensando..." ─────────────────────────────────────────────────────────────
function _tumIAThinking(ambId) {
  var el = document.getElementById('tumiaMsgs_' + ambId);
  if (!el) return;
  var d = document.createElement('div');
  d.className = 'tumia-msg thinking';
  d.textContent = '✦ Calculando';
  el.appendChild(d);
  _tumIAScroll(ambId);
}

// ── Chip clicado ──────────────────────────────────────────────────────────────
function tumIAChip(txt, ambId) {
  if (!ambId) ambId = _tumIA.activeId;
  // Atalhos especiais
  if (txt === '✅ Gerar PDF') { tumIAGerarPDF(ambId); return; }
  if (txt === '💲 Ajustar valor') { txt = 'Quero ajustar o valor total.'; }
  if (txt === '📐 Alterar dimensões') { txt = 'Quero alterar as dimensões.'; }
  if (txt === '➕ Adicionar item') { txt = 'Quero adicionar um item ao orçamento.'; }

  var inp = document.getElementById('tumiaInp_' + ambId);
  if (inp) { inp.value = txt; tumIASend(ambId); }
}

// ── Enter envia ───────────────────────────────────────────────────────────────
function tumIAKey(e, ambId) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tumIASend(ambId); }
}

// ── Limpar ────────────────────────────────────────────────────────────────────
function tumIAClear(ambId) {
  _tumIA.sessions[ambId] = null;
  _tumIAStonesCSSok = false; // força reinjeção clean
  if (typeof renderAmbientes === 'function') renderAmbientes();
  else if (typeof renderOrc === 'function') renderOrc();
}

// ── Salvar rascunho ───────────────────────────────────────────────────────────
function tumIASalvarRascunho(ambId) {
  var sess = _tumIASession(ambId);
  try {
    localStorage.setItem('hr_tumia_rascunho_' + ambId, JSON.stringify({
      history: sess.history,
      lastOrc: sess.lastOrc,
      ts: Date.now()
    }));
    if (typeof toast === 'function') toast('💾 Rascunho salvo!', 'ok');
  } catch(e) {
    if (typeof toast === 'function') toast('❌ Erro ao salvar: ' + e.message, 'error');
  }
}

// ── Foto: handler quando arquivo é selecionado ───────────────────────────────
function tumIAPhotoSelected(e, ambId) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    if (typeof toast === 'function') toast('Somente imagens são suportadas.', 'warn');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(ev) {
    var dataUrl = ev.target.result;
    // base64 puro sem prefixo
    var b64 = dataUrl.split(',')[1];
    var mediaType = file.type || 'image/jpeg';
    var sess = _tumIASession(ambId);
    sess.pendingPhoto = { b64: b64, mediaType: mediaType, dataUrl: dataUrl, name: file.name };
    // Mostra preview
    var prev = document.getElementById('tumiaPhotoPreview_' + ambId);
    if (prev) {
      prev.style.display = 'flex';
      prev.innerHTML =
        '<img src="' + dataUrl + '" alt="foto">' +
        '<div class="tumia-photo-preview-info">' +
          '<b>📷 Foto anexada</b>' +
          'A IA irá analisar o túmulo e perguntar as medidas' +
        '</div>' +
        '<button class="tumia-photo-remove" title="Remover foto" ' +
          'onclick="tumIARemovePhoto(' + ambId + ')">✕</button>';
    }
    // Limpa o input file para permitir novo envio da mesma foto
    e.target.value = '';
    // Foca no textarea
    var inp = document.getElementById('tumiaInp_' + ambId);
    if (inp) inp.focus();
  };
  reader.readAsDataURL(file);
}

// ── Remove foto pendente ──────────────────────────────────────────────────────
function tumIARemovePhoto(ambId) {
  var sess = _tumIASession(ambId);
  sess.pendingPhoto = null;
  var prev = document.getElementById('tumiaPhotoPreview_' + ambId);
  if (prev) prev.style.display = 'none';
}

// ── Adiciona mensagem com foto no DOM ─────────────────────────────────────────
function _tumIAAppendPhoto(ambId, dataUrl, caption) {
  var el = document.getElementById('tumiaMsgs_' + ambId);
  if (!el) return;
  var d = document.createElement('div');
  d.className = 'tumia-msg user';
  d.innerHTML =
    '<img class="tumia-msg-photo" src="' + dataUrl + '" alt="foto túmulo">' +
    (caption ? '<div>' + escH(caption) + '</div>' : '');
  el.appendChild(d);
  _tumIAScroll(ambId);
}

// ── Enviar mensagem ───────────────────────────────────────────────────────────
function tumIASend(ambId) {
  var sess = _tumIASession(ambId);
  if (sess.thinking) return;

  var inp = document.getElementById('tumiaInp_' + ambId);
  if (!inp) return;
  var txt = inp.value.trim();
  var photo = sess.pendingPhoto || null;

  // Precisa de texto OU foto
  if (!txt && !photo) return;
  inp.value = '';

  // Verifica API key
  var key = (typeof CFG !== 'undefined' && CFG.emp && CFG.emp.apiKey) ? CFG.emp.apiKey : null;
  if (!key) {
    _tumIAAppend(ambId, 'bot',
      '🔑 **Chave de API não configurada.**\nVá em ⚙️ Config → Empresa e adicione sua chave Groq (gratuita) ou Anthropic.');
    return;
  }
  var _isAnthropic = key.indexOf('sk-ant-') === 0;
  if (photo && !_isAnthropic) {
    _tumIAAppend(ambId, 'bot', '⚠️ Análise de **foto** requer chave Anthropic (sk-ant-...). A Groq não suporta visão.\nEnvie uma descrição por texto.');
    return;
  }

  // Monta conteúdo da mensagem do usuário (pode ser multimodal)
  var userContent;
  if (photo) {
    // Limpa preview
    sess.pendingPhoto = null;
    var prev = document.getElementById('tumiaPhotoPreview_' + ambId);
    if (prev) prev.style.display = 'none';

    // Mostra foto no chat
    _tumIAAppendPhoto(ambId, photo.dataUrl, txt || null);

    // Monta array de conteúdo multimodal para a API
    userContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: photo.mediaType, data: photo.b64 }
      }
    ];
    if (txt) {
      userContent.push({ type: 'text', text: txt });
    } else {
      userContent.push({
        type: 'text',
        text: 'Aqui está a foto do túmulo para análise. Por favor, analise a estrutura, identifique o modelo e inicie o processo de levantamento das medidas necessárias para o orçamento.'
      });
    }

    // Salva no histórico como texto descritivo (API não aceita imagens no histórico de turnos anteriores)
    var histText = txt
      ? '[FOTO ENVIADA] ' + txt
      : '[FOTO ENVIADA] Análise visual do túmulo para orçamento.';
    sess.history.push({ role: 'user', content: histText });

  } else {
    // Mensagem só texto
    _tumIAAppend(ambId, 'user', txt);
    sess.history.push({ role: 'user', content: txt });
    userContent = txt;
  }

  sess.thinking = true;
  var btn = document.getElementById('tumiaSend_' + ambId);
  if (btn) btn.disabled = true;
  _tumIAThinking(ambId);

  // Monta histórico para a API — mensagens anteriores (apenas texto, sem imagens antigas)
  var messages = [];
  // Histórico passado: apenas as msgs antes da última
  var histSemUltima = sess.history.slice(0, -1);
  histSemUltima.forEach(function(m) {
    if (messages.length === 0 && m.role === 'assistant') return; // pula assistants iniciais
    messages.push({ role: m.role, content: m.content });
  });
  // Adiciona mensagem atual (pode ter imagem)
  messages.push({ role: 'user', content: userContent });

  // Garante que começa com user
  while (messages.length && messages[0].role === 'assistant') messages.shift();

  var _fetchIA;
  if (_isAnthropic) {
    // Claude via Anthropic — suporta visão e texto
    _fetchIA = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: _tumIASystemPrompt(),
        messages: messages
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return (data.content && data.content[0] && data.content[0].text) || '❌ Sem resposta.';
    });
  } else {
    // Groq — gratuita, somente texto
    var groqMessages = [{ role: 'system', content: _tumIASystemPrompt() }];
    messages.forEach(function(m) {
      groqMessages.push({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      });
    });
    _fetchIA = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        messages: groqMessages
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '❌ Sem resposta.';
    });
  }

  _fetchIA
  .then(function(reply) {
    sess.thinking = false;
    if (btn) btn.disabled = false;

    // Extrai JSON de ação se presente
    var jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
    var cleanReply = reply.replace(/```json[\s\S]*?```/g, '').trim();

    // Adiciona resposta ao histórico e DOM
    sess.history.push({ role: 'assistant', content: cleanReply });
    _tumIAAppend(ambId, 'bot', cleanReply);

    // Processa ação
    if (jsonMatch) {
      try {
        var orcData = JSON.parse(jsonMatch[1].trim());
        if (orcData.action === 'tumulo_orc_pronto') {
          sess.lastOrc = orcData;
          _tumIAMostrarCard(ambId, orcData);
          // Salva no DB automaticamente
          _tumIASalvarNoDB(orcData);
        }
      } catch(e) { console.warn('[tumia] JSON parse:', e); }
    }
  })
  .catch(function(err) {
    sess.thinking = false;
    if (btn) btn.disabled = false;
    _tumIAAppend(ambId, 'bot', '❌ Erro da API: ' + (err.message || err));
  });
}

// ── Card visual do orçamento ──────────────────────────────────────────────────
function _tumIAMostrarCard(ambId, d) {
  var el = document.getElementById('tumiaMsgs_' + ambId);
  if (!el) return;

  var vista   = d.total_vista || 0;
  var juros   = d.juros || (typeof CFG !== 'undefined' && CFG.juros) || 12;
  var parcMax = d.parcelas || (typeof CFG !== 'undefined' && CFG.parcMax) || 8;
  var parc    = vista * (1 + juros / 100);
  var p8      = parc / parcMax;
  var entrada = vista / 2;

  function fm(v) {
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var card = document.createElement('div');
  card.className = 'tumia-orc-card';
  card.innerHTML =
    '<div class="tumia-orc-sec">💰 Orçamento Gerado</div>' +
    '<div class="tumia-orc-cli">' + escH(d.cli || 'Cliente') + '</div>' +
    '<div class="tumia-orc-tipo">' + escH(d.tipo || 'Túmulo') + ' · ' + (d.m2||0).toFixed(3) + ' m² × R$ ' + (d.preco_m2||350) + '/m²' + (d.extras?' + R$ '+fm(d.extras)+' extras':'') + '</div>' +
    '<div class="tumia-orc-total">R$ ' + fm(vista) + ' <span style="font-size:.65rem;color:rgba(201,168,76,.5);font-weight:400">à vista</span></div>' +
    '<div class="tumia-orc-detail">' +
      'Parcelado ' + parcMax + '×: <b style="color:rgba(255,255,255,.6)">R$ ' + fm(p8) + '/mês</b> &nbsp;|&nbsp; ' +
      'Entrada: <b style="color:rgba(255,255,255,.6)">R$ ' + fm(entrada) + '</b>' +
    '</div>' +
    '<div class="tumia-orc-actions">' +
      '<button class="tumia-orc-btn primary" onclick="tumIAGerarPDF(' + ambId + ')">📄 Gerar PDF</button>' +
      '<button class="tumia-orc-btn secondary" onclick="tumIAChip(\'💲 Ajustar valor\',' + ambId + ')">✏️ Ajustar</button>' +
      '<button class="tumia-orc-btn secondary" onclick="tumIASalvarNoDB_manual(' + ambId + ')">💾 Salvar</button>' +
    '</div>';

  el.appendChild(card);
  _tumIAScroll(ambId);

  // Atualiza botão PDF no header
  var hdrBtns = document.querySelector('#tumiaWrap_' + ambId + ' .tumia-hdr-btns');
  if (hdrBtns && !hdrBtns.querySelector('.pdf-btn')) {
    var pdfBtn = document.createElement('button');
    pdfBtn.className = 'tumia-btn-sm pdf-btn';
    pdfBtn.textContent = '📄 PDF';
    pdfBtn.onclick = function(){ tumIAGerarPDF(ambId); };
    hdrBtns.insertBefore(pdfBtn, hdrBtns.firstChild);
  }
}

// ── Salva orçamento no DB automaticamente ─────────────────────────────────────
function _tumIASalvarNoDB(d) {
  try {
    if (typeof DB === 'undefined') return;
    if (!DB.q) DB.q = [];

    var juros   = d.juros   || (CFG && CFG.juros)   || 12;
    var parcMax = d.parcelas || (CFG && CFG.parcMax) || 8;
    var vista   = d.total_vista || 0;

    var novoOrc = {
      id:    (typeof _genId === 'function') ? _genId() : Date.now().toString(36),
      cli:   d.cli || '',
      mat:   'Branco Pinta Verde',
      date:  (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10),
      vista: vista,
      total: vista,
      status: 'pendente',
      tumCalc: {
        m2total:    d.m2 || 0,
        preco_m2:   d.preco_m2 || 350,
        extras:     d.extras || 0,
        margemReal: 0
      },
      tum: { tipo: d.tipo || 'Túmulo', origem: 'ia' },
      pecas: d.pecas || [],
      _origem: 'tumia'
    };

    // Evita duplicata no mesmo minuto para o mesmo cliente
    var dup = DB.q.find(function(q){
      return q.cli === novoOrc.cli && q._origem === 'tumia' &&
        Math.abs(new Date(q.date) - new Date(novoOrc.date)) < 120000;
    });
    if (dup) { Object.assign(dup, novoOrc); }
    else { DB.q.push(novoOrc); }

    if (typeof _dbSv === 'function') _dbSv();
  } catch(e) { console.warn('[tumia] salvar DB:', e); }
}

// ── Salvar manual via botão do card ──────────────────────────────────────────
function tumIASalvarNoDB_manual(ambId) {
  var sess = _tumIASession(ambId);
  if (!sess.lastOrc) { if (typeof toast === 'function') toast('Nenhum orçamento gerado ainda.', 'warn'); return; }
  _tumIASalvarNoDB(sess.lastOrc);
  if (typeof toast === 'function') toast('✅ Orçamento salvo no sistema!', 'ok');
}

// ── Gerar PDF ─────────────────────────────────────────────────────────────────
function tumIAGerarPDF(ambId) {
  var sess = _tumIASession(ambId);
  var d = sess.lastOrc;

  if (!d) {
    if (typeof toast === 'function') toast('⚠️ Conclua o orçamento antes de gerar o PDF.', 'warn');
    return;
  }

  // Salva antes de gerar
  _tumIASalvarNoDB(d);

  var juros   = d.juros   || (typeof CFG !== 'undefined' && CFG.juros)   || 12;
  var parcMax = d.parcelas || (typeof CFG !== 'undefined' && CFG.parcMax) || 8;
  var vista   = d.total_vista || 0;

  // Monta objeto compatível com gerarPDFTumulo do app-core.js
  var q = {
    cli:   d.cli || '',
    mat:   'Branco Pinta Verde',
    date:  (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10),
    vista: vista,
    total: vista,
    tum:   { tipo: d.tipo || 'Túmulo', origem: 'ia' },
    tumCalc: {
      m2total:  d.m2 || 0,
      preco_m2: d.preco_m2 || 350,
      extras:   d.extras || 0
    },
    tumPendOrc: {
      r: {
        valor_vista: vista,
        mat: { nm: 'Branco Pinta Verde', pr: d.preco_m2 || 350, cat: 'Mármore', fin: 'Polida' },
        ts:  { nm: d.tipo || 'Túmulo' }
      },
      cli:  d.cli || '',
      fal:  d.falecido || '',
      cemi: d.cemiterio || '',
      obs:  d.obs || '',
      _sel: { preset: 'simples' }
    },
    pecas: d.pecas || [],
    _origem: 'tumia'
  };

  if (typeof gerarPDFTumulo === 'function') {
    gerarPDFTumulo(q);
    if (typeof toast === 'function') toast('📄 Gerando PDF...', 'ok');
  } else if (typeof _chamarPDFTumulo === 'function') {
    _chamarPDFTumulo(q);
  } else {
    // Fallback: navega para tela de orçamento
    if (typeof toast === 'function') toast('📄 Abrindo orçamento...', 'info');
    if (typeof go === 'function') go(7);
    setTimeout(function() {
      var inp = document.getElementById('orcCli') || document.querySelector('input[placeholder*="cliente"]');
      if (inp && d.cli) { inp.value = d.cli; inp.dispatchEvent(new Event('input')); }
    }, 700);
  }
}

// ── Helper: escH (caso não exista no escopo global) ──────────────────────────
if (typeof escH === 'undefined') {
  function escH(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SELETOR VISUAL DE PEDRAS — aparece na etapa de material
// ══════════════════════════════════════════════════════════════════════════════

// CSS extra do seletor de pedras — injetado junto com os outros estilos
var _tumIAStonesCSS = `
  .tumia-stones-wrap{
    background:rgba(0,0,0,.28);
    border:1px solid rgba(201,168,76,.18);
    border-radius:12px;
    padding:10px 12px;
    margin:0 0 4px;
    flex-shrink:0;
  }
  .tumia-stones-title{
    font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;
    color:rgba(201,168,76,.6);margin-bottom:7px;font-weight:700;
  }
  .tumia-sf-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px}
  .tumia-sf{
    font-size:.56rem;padding:3px 8px;border-radius:12px;
    border:1px solid rgba(255,255,255,.1);background:none;
    color:rgba(255,255,255,.38);cursor:pointer;font-family:Outfit,sans-serif;transition:all .15s;
  }
  .tumia-sf.on,.tumia-sf:hover{background:rgba(201,168,76,.12);color:#c9a84c;border-color:rgba(201,168,76,.3)}
  .tumia-stones-grid{
    display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));
    gap:6px;max-height:170px;overflow-y:auto;
  }
  .tumia-stones-grid::-webkit-scrollbar{width:3px}
  .tumia-stones-grid::-webkit-scrollbar-thumb{background:rgba(201,168,76,.2);border-radius:3px}
  .tumia-stone-card{
    border-radius:8px;overflow:hidden;cursor:pointer;
    border:2px solid transparent;transition:all .18s;
  }
  .tumia-stone-card:hover{border-color:rgba(201,168,76,.45);transform:translateY(-1px)}
  .tumia-stone-card.sel{border-color:#c9a84c;box-shadow:0 0 0 1px rgba(201,168,76,.4)}
  .tumia-stone-thumb{height:46px;width:100%;background-size:cover;background-position:center}
  .tumia-stone-meta{padding:3px 5px 4px;background:rgba(0,0,0,.65)}
  .tumia-stone-nm{font-size:.57rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tumia-stone-pr{font-size:.56rem;color:#c9a84c;font-weight:600}
  .tumia-stone-cat{font-size:.5rem;color:rgba(255,255,255,.32)}
  .tumia-sel-bar{
    display:flex;align-items:center;justify-content:space-between;
    margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.07);
  }
  .tumia-sel-info{font-size:.65rem;color:rgba(255,255,255,.55)}
  .tumia-sel-info b{color:#c9a84c}
  .tumia-sel-btn{
    font-size:.62rem;font-weight:700;padding:5px 12px;border-radius:7px;
    border:none;background:#c9a84c;color:#0c0c16;cursor:pointer;
    font-family:Outfit,sans-serif;transition:opacity .15s;
  }
  .tumia-sel-btn:hover{opacity:.85}
  .tumia-sel-btn:disabled{opacity:.3;cursor:not-allowed}
`;

// ── Injeta CSS do seletor ─────────────────────────────────────────────────────
var _tumIAStonesCSSok = false;
function _tumIAInjectStonesCSS() {
  if (_tumIAStonesCSSok) return;
  _tumIAStonesCSSok = true;
  var s = document.createElement('style');
  s.id = 'tumia-stones-styles';
  s.textContent = _tumIAStonesCSS;
  document.head.appendChild(s);
}

// ── Estado do seletor por sessão ──────────────────────────────────────────────
// _tumIA.sessions[ambId].stoneId  = id da pedra selecionada
// _tumIA.sessions[ambId].stoneFilter = categoria ativa

// ── Verifica se é hora de mostrar o seletor (etapa de material) ───────────────
function _tumIAShouldShowStones(sess) {
  if (sess.stoneId) return false; // já escolheu
  var hist = sess.history.map(function(m){ return m.content; }).join(' ').toLowerCase();
  // Mostra quando já coletou tipo + dimensões mas ainda não tem material
  var temTipo = /simples|gaveta|capelinha|jazigo|reforma|túmulo|tumulo/.test(hist);
  var temDim  = /\d+\s*[x×]\s*\d+|\d+\s*cm/.test(hist);
  var temMat  = /branco|preto|verde|granito|mármore|marmore|material|pedra/.test(hist);
  return temTipo && temDim && !temMat && sess.history.length >= 4;
}

// ── Renderiza o seletor de pedras ─────────────────────────────────────────────
function tumIARenderStones(ambId) {
  _tumIAInjectStonesCSS();
  var sess = _tumIASession(ambId);

  var stones = [];
  if (typeof CFG !== 'undefined' && CFG.stones && CFG.stones.length) {
    stones = CFG.stones.filter(function(s){ return s.nm && s.pr > 0; });
  } else if (typeof DEF_STONES !== 'undefined') {
    stones = DEF_STONES.filter(function(s){ return s.nm && s.pr > 0; });
  }
  if (!stones.length) return '';

  // Categorias únicas
  var cats = ['Todas'];
  stones.forEach(function(s){ if (s.cat && cats.indexOf(s.cat) < 0) cats.push(s.cat); });

  var filter = sess.stoneFilter || 'Todas';
  var filtered = filter === 'Todas' ? stones : stones.filter(function(s){ return s.cat === filter; });

  var filterHtml = cats.map(function(c) {
    return '<button class="tumia-sf' + (c === filter ? ' on' : '') + '" ' +
      'onclick="tumIAStoneFilter(' + JSON.stringify(c) + ',' + ambId + ')">' + c + '</button>';
  }).join('');

  var cardsHtml = filtered.map(function(s) {
    var isSel = sess.stoneId === s.id;
    // Thumb: foto base64 ou classe CSS de textura
    var thumbStyle = s.photo
      ? 'background-image:url(' + JSON.stringify(s.photo) + ');background-size:cover;background-position:center'
      : '';
    var thumbClass = s.tx ? s.tx : '';
    return (
      '<div class="tumia-stone-card' + (isSel ? ' sel' : '') + '" ' +
        'onclick="tumIAStoneSelect(' + JSON.stringify(s.id) + ',' + ambId + ')">' +
        '<div class="tumia-stone-thumb ' + thumbClass + '" style="' + thumbStyle + '"></div>' +
        '<div class="tumia-stone-meta">' +
          '<div class="tumia-stone-nm">' + escH(s.nm) + '</div>' +
          '<div class="tumia-stone-pr">R$ ' + (s.pr||0) + '/m²</div>' +
          '<div class="tumia-stone-cat">' + escH(s.fin||s.cat||'') + '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  // Barra inferior
  var selInfo = sess.stoneId
    ? (function(){
        var sel = stones.find(function(s){ return s.id === sess.stoneId; });
        return sel
          ? '<span class="tumia-sel-info">✔ <b>' + escH(sel.nm) + '</b> — R$ ' + sel.pr + '/m²</span>'
          : '';
      })()
    : '<span class="tumia-sel-info" style="color:rgba(255,255,255,.28)">Escolha uma pedra acima</span>';

  return (
    '<div class="tumia-stones-wrap" id="tumiaStones_' + ambId + '">' +
      '<div class="tumia-stones-title">🪨 Escolha o Material</div>' +
      '<div class="tumia-sf-row">' + filterHtml + '</div>' +
      '<div class="tumia-stones-grid">' + cardsHtml + '</div>' +
      '<div class="tumia-sel-bar">' +
        selInfo +
        '<button class="tumia-sel-btn" id="tumiaSelBtn_' + ambId + '" ' +
          (sess.stoneId ? '' : 'disabled') + ' ' +
          'onclick="tumIAStoneConfirm(' + ambId + ')">Usar esta pedra ➤</button>' +
      '</div>' +
    '</div>'
  );
}

// ── Filtra por categoria ──────────────────────────────────────────────────────
function tumIAStoneFilter(cat, ambId) {
  var sess = _tumIASession(ambId);
  sess.stoneFilter = cat;
  // Re-renderiza apenas o bloco de pedras
  var el = document.getElementById('tumiaStones_' + ambId);
  if (el) {
    var novo = document.createElement('div');
    novo.innerHTML = tumIARenderStones(ambId);
    var newEl = novo.firstElementChild;
    if (newEl) el.parentNode.replaceChild(newEl, el);
  }
}

// ── Seleciona pedra ───────────────────────────────────────────────────────────
function tumIAStoneSelect(id, ambId) {
  var sess = _tumIASession(ambId);
  sess.stoneId = id;
  // Atualiza visual
  var grid = document.querySelector('#tumiaStones_' + ambId + ' .tumia-stones-grid');
  if (grid) {
    grid.querySelectorAll('.tumia-stone-card').forEach(function(c){ c.classList.remove('sel'); });
    // Encontra o card pelo onclick
    var cards = grid.querySelectorAll('.tumia-stone-card');
    var stones = _tumIAGetStones();
    var idx = stones.findIndex ? stones.findIndex(function(s){ return s.id === id; }) : -1;
    // Atualiza todos os cards visíveis
    var filter = sess.stoneFilter || 'Todas';
    var filtered = filter === 'Todas' ? stones : stones.filter(function(s){ return s.cat === filter; });
    filtered.forEach(function(s, i) {
      if (cards[i]) cards[i].classList.toggle('sel', s.id === id);
    });
  }
  // Atualiza barra inferior
  var stones = _tumIAGetStones();
  var sel = stones.find(function(s){ return s.id === id; });
  var bar = document.querySelector('#tumiaStones_' + ambId + ' .tumia-sel-bar');
  if (bar && sel) {
    bar.innerHTML =
      '<span class="tumia-sel-info">✔ <b>' + escH(sel.nm) + '</b> — R$ ' + sel.pr + '/m²</span>' +
      '<button class="tumia-sel-btn" onclick="tumIAStoneConfirm(' + ambId + ')">Usar esta pedra ➤</button>';
  }
}

// ── Helper: pega pedras do CFG ou DEF_STONES ──────────────────────────────────
function _tumIAGetStones() {
  if (typeof CFG !== 'undefined' && CFG.stones && CFG.stones.length) return CFG.stones;
  if (typeof DEF_STONES !== 'undefined') return DEF_STONES;
  return [];
}

// ── Confirma pedra e envia mensagem automática ────────────────────────────────
function tumIAStoneConfirm(ambId) {
  var sess = _tumIASession(ambId);
  if (!sess.stoneId) return;

  var stones = _tumIAGetStones();
  var sel = stones.find(function(s){ return s.id === sess.stoneId; });
  if (!sel) return;

  // Remove o seletor visual
  var el = document.getElementById('tumiaStones_' + ambId);
  if (el) el.remove();

  // Envia como mensagem do usuário
  var msg = 'Material: ' + sel.nm + ' — ' + (sel.fin || sel.cat || '') + ' — R$ ' + sel.pr + '/m²';
  var inp = document.getElementById('tumiaInp_' + ambId);
  if (inp) inp.value = msg;
  tumIASend(ambId);
}

// ── Injeção automática do seletor após resposta da IA ────────────────────────
// Chamado dentro de _tumIAAppend para checar se deve mostrar seletor
function _tumIACheckShowStones(ambId) {
  var sess = _tumIASession(ambId);
  if (sess.stoneId) return; // já escolheu
  if (document.getElementById('tumiaStones_' + ambId)) return; // já está visível

  if (!_tumIAShouldShowStones(sess)) return;

  var html = tumIARenderStones(ambId);
  if (!html) return;

  // Injeta antes da área de input
  var wrap = document.getElementById('tumiaWrap_' + ambId);
  if (!wrap) return;
  var inpRow = wrap.querySelector('.tumia-inp-row');
  if (!inpRow) return;

  var div = document.createElement('div');
  div.innerHTML = html;
  var el = div.firstElementChild;
  if (el) wrap.insertBefore(el, inpRow);
}
