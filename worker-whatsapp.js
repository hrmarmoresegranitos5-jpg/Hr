// ══════════════════════════════════════════════════════════════════════
// HR Mármores e Granitos — Bot de atendimento no WhatsApp (API OFICIAL da Meta)
// Roda como Cloudflare Worker (grátis, não dorme). Estado e leads ficam no KV.
//
// Variáveis (Worker → Settings → Variables and Secrets), todas como "Secret":
//   VERIFY_TOKEN     texto inventado por você (o mesmo vai na Meta)
//   WHATSAPP_TOKEN   token de acesso da Meta
//   APP_SECRET       "Chave secreta do app" da Meta (valida que o aviso veio da Meta)
//   PHONE_NUMBER_ID  ID do número na Meta
//   DONO_NUMERO      seu número, ex: 74991484460 (o 55 é acrescentado sozinho)
//   ATENDER_CLIENTES opcional: coloque 1 para o bot voltar a atender clientes (padrão: só o dono)
//   BOT_KEY          chave do painel do app (rotas /bot/*: status, leads, falas)
// Opcionais: EMPRESA, GRAPH_VERSION
// Binding KV (Settings → Bindings → KV namespace): nome da variável = HR_KV
// ══════════════════════════════════════════════════════════════════════

const SESSAO_TTL = 2 * 60 * 60; // segundos
const LEAD_TTL   = 180 * 24 * 60 * 60;
const PEND_TTL   = 7 * 24 * 60 * 60;

const PROJETOS = [
  'Cozinha', 'Banheiro', 'Lavabo', 'Varanda/Churrasqueira',
  'Escada', 'Piso', 'Túmulo/Jazigo', 'Outro',
];

const E = {
  INICIO: 0, NOME: 1, PROJETO: 2, DETALHE: 3,
  MEDIDAS: 4, MEDIDAS2: 5, VISITA_SN: 6,
  VISITA_END: 7, HORARIO: 8, FIM: 9,
};

// ── Textos / utilidades ──────────────────────────────────────────────
function normaliza(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s\d,./:;-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extrairNome(bruto) {
  const limpo = (bruto || '')
    .replace(/^\s*(oi|ola|olá|bom dia|boa tarde|boa noite|me chamo|meu nome e|meu nome é|sou o|sou a|aqui e|aqui é)[,\s]*/i, '')
    .trim();
  if (limpo.length < 2) return null;
  const minusculas = ['de', 'da', 'do', 'dos', 'das', 'e'];
  return limpo
    .split(/\s+/)
    .slice(0, 4)
    .map((p, i) => {
      const l = p.toLowerCase();
      return (i > 0 && minusculas.includes(l)) ? l : l.charAt(0).toUpperCase() + l.slice(1);
    })
    .join(' ');
}

function idProjeto(msg) {
  const num = msg.match(/^([1-8])\b/);
  if (num) return PROJETOS[Number(num[1]) - 1];
  const mapa = {
    cozinha: 'Cozinha', pia: 'Cozinha', bancada: 'Cozinha',
    banheiro: 'Banheiro', lavabo: 'Lavabo',
    varanda: 'Varanda/Churrasqueira', churrasqueira: 'Varanda/Churrasqueira',
    escada: 'Escada', degrau: 'Escada', piso: 'Piso',
    tumulo: 'Túmulo/Jazigo', jazigo: 'Túmulo/Jazigo', cemiterio: 'Túmulo/Jazigo',
    outro: 'Outro',
  };
  for (const [k, v] of Object.entries(mapa)) if (msg.includes(k)) return v;
  return null;
}

// true = sim, false = não, null = não entendi
function simNao(msg) {
  if (/^(2|n|nao)\b|\bnao\b|ainda nao|sem medida/.test(msg)) return false;
  if (/\b(1|s|sim|tenho|sei|quero|pode|agendar|claro)\b/.test(msg)) return true;
  return null;
}

function ultimos8(n) { return String(n || '').replace(/\D/g, '').slice(-8); }

function numeroDono(env) {
  const d = String(env.DONO_NUMERO || '').replace(/\D/g, '');
  return d.length <= 11 ? '55' + d : d;
}
function ehDono(env, from) {
  const d = ultimos8(env.DONO_NUMERO);
  return d.length === 8 && ultimos8(from) === d;
}

// Celulares BR: a Meta entrega sem o 9 (55 + DDD + 8 dígitos); a lista exige com o 9
function normalizarBR(n) {
  const d = String(n || '').replace(/\D/g, '');
  return /^55\d{2}[6-9]\d{7}$/.test(d) ? d.slice(0, 4) + '9' + d.slice(4) : d;
}

// ── Envio pela API oficial ───────────────────────────────────────────
async function enviar(env, para, texto) {
  const v = env.GRAPH_VERSION || 'v23.0';
  const r = await fetch(`https://graph.facebook.com/${v}/${env.PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizarBR(para),
      type: 'text',
      text: { body: String(texto).slice(0, 4000), preview_url: false },
    }),
  });
  if (!r.ok) {
    const corpo = await r.text().catch(() => '');
    throw new Error(`WhatsApp API ${r.status}: ${corpo.slice(0, 300)}`);
  }
}

// ── Falas configuráveis (editáveis pelo painel do app) ───────────────
// Variáveis nos textos: {empresa} {nome} {projeto} {lista}
const FALAS_PADRAO = {
  saudacao: 'Olá! 👋 Seja bem-vindo(a) à *{empresa}* 🪨✨\n\nSou a *secretária virtual* e vou te ajudar com seu orçamento!\n\nPor favor, qual é o seu *nome completo*? 😊',
  nomeInvalido: 'Não consegui identificar seu nome 😅\nPode digitar seu *nome completo*, por favor?',
  pedeProjeto: 'Prazer, *{nome}*! 😊\n\nQual *tipo de projeto* você quer orçar?\n\n{lista}\n\n_Digite o número ou o nome_',
  projetoInvalido: 'Não entendi 😅 Digite o *número* ou *nome*:\n\n{lista}',
  pedeDetalhe: 'Ótimo! *{projeto}* 🏠\n\nÉ *reforma* ou *obra nova*?\n_Descreva brevemente o que precisa (ex: bancada nova, pia do banheiro...)_',
  pedeMedidas: 'Anotei! 📝\n\nVocê já tem as *medidas* aproximadas?\n\n*1.* ✅ Sim, tenho\n*2.* ❌ Não tenho ainda',
  medidasInvalido: 'Responda *1* (tenho as medidas) ou *2* (não tenho ainda) 😊',
  informaMedidas: 'Me informe as medidas 📏\n_Ex: "bancada 2,50 x 0,60" ou "piso 20m²"_',
  semMedidas: 'Sem problema! Fazemos *visita técnica gratuita* 📐\n\nQual o *endereço completo* para a visita?',
  pedeVisita: 'Medidas anotadas ✅\n\nDeseja agendar uma *visita técnica gratuita*?\n\n*1.* ✅ Sim, quero\n*2.* ❌ Não precisa',
  visitaInvalido: 'Responda *1* (quero a visita) ou *2* (não precisa) 😊',
  pedeEndereco: 'Ótimo! 📅\n\nQual o *endereço completo*?',
  pedeHorario: 'Endereço anotado! 📍\n\nQual o melhor *dia e horário* para a visita?\n_Ex: "segunda de manhã", "sexta às 14h"_',
  finalTopo: '✅ *{nome}, recebi tudo!* 🙌',
  finalRodape: '📞 Nossa equipe entrará em contato em breve para confirmar!\n\n_{empresa}_ 🪨✨\n_Para novo orçamento, basta digitar "oi"_',
  soTexto: 'Por enquanto consigo ler só mensagens de *texto* 😊\nPode escrever o que precisa?',
  donoOla: 'Oi! 👷 Sou seu assistente de anotações.\n\nMe diga o que você gastou ou recebeu e eu lanço em *Finanças*. Exemplos:\n• gastei 150 com cimento\n• paguei 800 de energia ontem\n• recebi 2.500 do João\n\n_Comandos: *hoje*, *desfazer*, *ajuda*_',
  donoNaoEntendi: 'Não consegui entender 😅\nEscreva assim: *gastei 150 com cimento* ou *recebi 2.500 do João*.\n\n_Comandos: *hoje*, *desfazer*, *ajuda*_',
  donoAnotado: '✅ Anotei!\n\n{tipo}: *R$ {valor}*\n📝 {desc}\n🏷 {cat}\n📅 {data}\n\n_Vai para Finanças quando o app sincronizar. Errou? Responda *desfazer*._',
  donoDesfeito: '↩️ Desfeito: {desc} (R$ {valor}).',
  donoNadaDesfazer: 'Não há lançamento recente para desfazer. Se já entrou no app, apague por lá em Finanças.',
};

// Rótulos mostrados no painel do app (ordem da conversa)
const FALAS_ROTULOS = [
  { k: 'saudacao', t: '1. Saudação (primeira mensagem)', d: 'Usa {empresa}' },
  { k: 'nomeInvalido', t: '2. Nome não entendido', d: '' },
  { k: 'pedeProjeto', t: '3. Pergunta o tipo de projeto', d: 'Usa {nome} e {lista} (a lista numerada de projetos)' },
  { k: 'projetoInvalido', t: '4. Projeto não entendido', d: 'Usa {lista}' },
  { k: 'pedeDetalhe', t: '5. Pergunta os detalhes', d: 'Usa {projeto}' },
  { k: 'pedeMedidas', t: '6. Pergunta se tem as medidas', d: '' },
  { k: 'medidasInvalido', t: '7. Resposta inválida sobre medidas', d: '' },
  { k: 'informaMedidas', t: '8. Pede as medidas', d: '' },
  { k: 'semMedidas', t: '9. Cliente sem medidas (visita técnica)', d: '' },
  { k: 'pedeVisita', t: '10. Oferece visita técnica', d: '' },
  { k: 'visitaInvalido', t: '11. Resposta inválida sobre a visita', d: '' },
  { k: 'pedeEndereco', t: '12. Pede o endereço', d: '' },
  { k: 'pedeHorario', t: '13. Pede dia e horário', d: '' },
  { k: 'finalTopo', t: '14. Final — início (antes do resumo)', d: 'Usa {nome}' },
  { k: 'finalRodape', t: '15. Final — encerramento (depois do resumo)', d: 'Usa {empresa}' },
  { k: 'soTexto', t: '16. Cliente mandou áudio/figurinha', d: '' },
  { k: 'donoOla', t: 'Dono 1. Boas-vindas / ajuda', d: 'Quando você diz "oi" ou "ajuda"' },
  { k: 'donoNaoEntendi', t: 'Dono 2. Não entendeu o lançamento', d: '' },
  { k: 'donoAnotado', t: 'Dono 3. Confirmação de lançamento', d: 'Usa {tipo} {valor} {desc} {cat} {data}' },
  { k: 'donoDesfeito', t: 'Dono 4. Lançamento desfeito', d: 'Usa {desc} e {valor}' },
  { k: 'donoNadaDesfazer', t: 'Dono 5. Nada para desfazer', d: '' },
];

async function getFalas(env) {
  let salvo = {};
  try { salvo = JSON.parse((await env.HR_KV.get('cfg:falas')) || '{}') || {}; } catch (_) {}
  const F = { ...FALAS_PADRAO };
  for (const k of Object.keys(FALAS_PADRAO)) {
    if (typeof salvo[k] === 'string' && salvo[k].trim()) F[k] = salvo[k];
  }
  return F;
}

function fala(F, k, vars) {
  const txt = String(F[k] ?? FALAS_PADRAO[k] ?? '');
  return txt.replace(/\{(\w+)\}/g, (m, n) => (vars && vars[n] !== undefined) ? vars[n] : m);
}

function listaProjetos() { return PROJETOS.map((p, i) => `*${i + 1}.* ${p}`).join('\n'); }

// ── Máquina de estados do atendimento ────────────────────────────────
async function fsm(env, s, msg, bruto, from, F) {
  const empresa = env.EMPRESA || 'HR Mármores e Granitos';
  const v = { empresa, nome: s.d.nome || '', projeto: s.d.projeto || '', lista: listaProjetos() };

  switch (s.e) {
    case E.INICIO:
      s.e = E.NOME;
      return fala(F, 'saudacao', v);

    case E.NOME: {
      const nome = extrairNome(bruto);
      if (!nome) return fala(F, 'nomeInvalido', v);
      s.d.nome = nome; v.nome = nome;
      s.e = E.PROJETO;
      return fala(F, 'pedeProjeto', v);
    }

    case E.PROJETO: {
      const proj = idProjeto(msg);
      if (!proj) return fala(F, 'projetoInvalido', v);
      s.d.projeto = proj; v.projeto = proj;
      s.e = E.DETALHE;
      return fala(F, 'pedeDetalhe', v);
    }

    case E.DETALHE:
      s.d.detalhe = bruto.trim();
      s.e = E.MEDIDAS;
      return fala(F, 'pedeMedidas', v);

    case E.MEDIDAS: {
      const r = simNao(msg);
      if (r === null) return fala(F, 'medidasInvalido', v);
      if (r) { s.e = E.MEDIDAS2; return fala(F, 'informaMedidas', v); }
      s.d.medidas = 'Sem medidas — precisa de visita técnica';
      s.d.querVisita = true;
      s.e = E.VISITA_END;
      return fala(F, 'semMedidas', v);
    }

    case E.MEDIDAS2:
      s.d.medidas = bruto.trim();
      s.e = E.VISITA_SN;
      return fala(F, 'pedeVisita', v);

    case E.VISITA_SN: {
      const r = simNao(msg);
      if (r === null) return fala(F, 'visitaInvalido', v);
      if (r) { s.d.querVisita = true; s.e = E.VISITA_END; return fala(F, 'pedeEndereco', v); }
      s.d.querVisita = false;
      return await finalizar(env, s, from, F);
    }

    case E.VISITA_END:
      s.d.endereco = bruto.trim();
      s.e = E.HORARIO;
      return fala(F, 'pedeHorario', v);

    case E.HORARIO:
      s.d.horario = bruto.trim();
      return await finalizar(env, s, from, F);

    default:
      s.e = E.INICIO;
      return null;
  }
}

async function finalizar(env, s, from, F) {
  s.e = E.FIM;
  const d = s.d;
  const empresa = env.EMPRESA || 'HR Mármores e Granitos';
  const v = { empresa, nome: d.nome || '', projeto: d.projeto || '', lista: '' };
  const ts = Date.now();
  const hora = new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Bahia' });

  const lead = {
    id: ts, hora, numero: from, nome: d.nome || '', projeto: d.projeto || '',
    detalhe: d.detalhe || '', medidas: d.medidas || '', endereco: d.endereco || '',
    horario: d.horario || '', querVisita: !!d.querVisita,
  };
  await env.HR_KV.put('lead:' + String(ts).padStart(13, '0'), JSON.stringify(lead), { expirationTtl: LEAD_TTL });
  await notificarDono(env, ts, textoLead(lead));

  const semMedidas = d.medidas === 'Sem medidas — precisa de visita técnica';
  return [
    fala(F, 'finalTopo', v), ``,
    `*Resumo do seu pedido:*`,
    `• Projeto: ${d.projeto}`,
    `• Detalhes: ${d.detalhe}`,
    semMedidas ? `• Visita técnica necessária` : `• Medidas: ${d.medidas}`,
    d.endereco ? `• Endereço: ${d.endereco}` : null,
    d.horario ? `• Horário preferido: ${d.horario}` : null,
    ``,
    fala(F, 'finalRodape', v),
  ].filter(x => x !== null).join('\n');
}

function textoLead(l) {
  return [
    `🔔 *NOVO LEAD — WHATSAPP*`, ``,
    `👤 *Cliente:* ${l.nome || '---'}`,
    `📱 *Número:* wa.me/${l.numero}`,
    `🏗 *Projeto:* ${l.projeto || '---'}`,
    `📝 *Detalhes:* ${l.detalhe || '---'}`,
    `📏 *Medidas:* ${l.medidas || 'Não informado'}`,
    l.endereco ? `📍 *Endereço:* ${l.endereco}` : null,
    l.horario ? `🕐 *Horário:* ${l.horario}` : null,
    ``, `⏰ _${l.hora}_`,
  ].filter(Boolean).join('\n');
}

// ── Aviso ao dono ────────────────────────────────────────────────────
// A Meta só deixa o bot escrever livremente para quem falou com ele nas
// últimas 24h. Se o aviso falhar, ele fica guardado ("pend:") e é entregue
// assim que o dono mandar qualquer mensagem para o bot.
async function notificarDono(env, ts, texto) {
  const chave = 'pend:' + String(ts).padStart(13, '0');
  await env.HR_KV.put(chave, texto, { expirationTtl: PEND_TTL });
  try {
    await enviar(env, numeroDono(env), texto);
    await env.HR_KV.delete(chave);
  } catch (e) {
    console.log('[BOT] Aviso ao dono adiado:', e.message);
  }
}

async function entregarPendentes(env, para) {
  const lista = await env.HR_KV.list({ prefix: 'pend:' });
  for (const k of lista.keys) {
    const texto = await env.HR_KV.get(k.name);
    if (!texto) { await env.HR_KV.delete(k.name); continue; }
    await enviar(env, para, texto);
    await env.HR_KV.delete(k.name);
  }
}

async function comandoLeads(env) {
  const lista = await env.HR_KV.list({ prefix: 'lead:' });
  const ultimos = lista.keys.slice(-8).reverse();
  if (!ultimos.length) return '📭 Nenhum lead recebido ainda.';
  const linhas = [];
  for (const k of ultimos) {
    const l = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
    if (!l) continue;
    linhas.push(`• *${l.nome}* — ${l.projeto}\n  ${l.hora} · wa.me/${l.numero}`);
  }
  return `📋 *Últimos leads*\n\n${linhas.join('\n\n')}`;
}

// ── Lançamentos financeiros por WhatsApp (só o dono) ─────────────────
// O dono escreve "gastei 150 com cimento"; o Worker guarda o lançamento no KV
// e o app (Finanças) busca em /bot/financas, grava no DB.t e confirma.
const CATS = {
  material: 'Material', mao_obra: 'Mão de obra', insumos: 'Insumos', fixo: 'Custo fixo',
  combustivel: 'Combustível', ferramentas: 'Ferramentas', outros: 'Outros',
};
const CAT_REGEX = [
  ['insumos', /disco\s*(de\s*)?corte|disco\s*diamantado|lixa|rebolo|resina|talco|abrasivo|broca|pastilha|cola\b|silicone|espatula|espátula|massa\s*plastica|catalisador/i],
  ['mao_obra', /diarista|ajudante|instalador|pedreiro|m[aã]o\s*de\s*obra|servi[çc]o\s*prestado|freelancer|di[aá]ria|sal[aá]rio/i],
  ['combustivel', /combust[ií]vel|gasolina|diesel|posto\b|etanol/i],
  ['ferramentas', /ferramenta|makita|dewalt|bosch|politriz|maquita|esmerilhadeira/i],
  ['fixo', /aluguel|energia|luz\b|\bagua\b|água|internet|telefone/i],
  ['material', /granito|m[aá]rmore|quartzito|chapa|cimento|areia|brita|ferro|tijolo|argamassa|rejunte|pedra/i],
];
const FIN_TTL = 90 * 24 * 60 * 60;

function atenderClientes(env) { return String(env.ATENDER_CLIENTES || '') === '1'; }

function dataBahia(offsetDias = 0) {
  const d = new Date(Date.now() + offsetDias * 86400000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia' }).format(d); // AAAA-MM-DD
}
function dataBR(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function reais(n) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// Tira do texto a data falada ("ontem", "dia 15", "12/09") e devolve {data, resto}
function extrairData(t) {
  const hoje = dataBahia();
  let m;
  if ((m = t.match(/\banteontem\b/i))) return { data: dataBahia(-2), resto: t.replace(m[0], ' ') };
  if ((m = t.match(/\bontem\b/i))) return { data: dataBahia(-1), resto: t.replace(m[0], ' ') };
  if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const dia = +m[1], mes = +m[2];
    let ano = m[3] ? +m[3] : +hoje.slice(0, 4);
    if (ano < 100) ano += 2000;
    const dt = new Date(ano, mes - 1, dia);
    if (dt.getFullYear() === ano && dt.getMonth() === mes - 1 && dt.getDate() === dia) {
      const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { data: iso, resto: t.replace(m[0], ' ') };
    }
  }
  if ((m = t.match(/\bdia\s+(\d{1,2})\b/i))) {
    const dia = +m[1];
    let [y, mo, dd] = hoje.split('-').map(Number);
    if (dia > dd) { mo -= 1; if (mo === 0) { mo = 12; y -= 1; } }
    const dt = new Date(y, mo - 1, dia);
    if (dia >= 1 && dt.getDate() === dia) {
      const iso = `${y}-${String(mo).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { data: iso, resto: t.replace(m[0], ' ') };
    }
  }
  return { data: hoje, resto: t };
}

// Acha o valor em reais: aceita "150", "1.250,50", "R$ 80", "2,5 mil", "300 reais"
function extrairValor(t) {
  const re = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(mil|k)\b)?(\s*(?:reais|real|contos?|pilas?))?/gi;
  let melhor = null, m;
  while ((m = re.exec(t))) {
    const bruto = m[0];
    const temMoeda = /r\$/i.test(bruto) || !!m[3];
    const num = m[1];
    let n = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(num)
      ? parseFloat(num.replace(/\./g, '').replace(',', '.'))
      : parseFloat(num.replace(',', '.'));
    if (m[2]) n *= 1000;
    if (!isFinite(n) || n <= 0) continue;
    const cand = { n: Math.round(n * 100) / 100, inicio: m.index, fim: m.index + bruto.length, temMoeda };
    if (!melhor || (cand.temMoeda && !melhor.temMoeda)) melhor = cand;
  }
  return melhor;
}

const RE_ENTRADA = /\bme\s+pag(?:ou|aram)\b|\b(recebi|recebemos|recebimento|entrou|entrada|vendi|vendemos|ganhei|caiu)\b/i;
const RE_SAIDA = /\b(gastei|gastamos|gasto|paguei|pagamos|pago|comprei|compramos|despesa|saiu|sa[ií]da|pagamento)\b/i;

function categoriaDe(desc) {
  for (const [c, re] of CAT_REGEX) if (re.test(desc)) return c;
  return 'outros';
}

function interpretarLancamento(bruto) {
  const original = String(bruto || '').trim();
  if (!original) return null;
  const ent = original.match(RE_ENTRADA);
  const sai = original.match(RE_SAIDA);
  if (!ent && !sai) return null;
  let tipo;
  if (ent && sai) tipo = ent.index <= sai.index ? 'in' : 'out';
  else tipo = ent ? 'in' : 'out';

  const { data, resto } = extrairData(original);
  const v = extrairValor(resto);
  if (!v) return null;

  let desc = (resto.slice(0, v.inicio) + ' ' + resto.slice(v.fim))
    .replace(RE_ENTRADA, ' ').replace(RE_SAIDA, ' ')
    .replace(/\br\$/gi, ' ').replace(/\b(reais|real|contos?|pilas?)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) desc = desc.replace(/^(?:com|de|do|da|dos|das|em|no|na|nos|nas|para|pra|pro|por|a|o|um|uma|me)\s+/i, '');
  desc = desc.replace(/[\s,.;:-]+$/g, '').trim();
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  if (tipo === 'in') desc = desc ? `Recebido de ${desc}` : 'Recebimento';
  else desc = desc ? cap(desc) : 'Despesa sem descrição';

  return { type: tipo, value: v.n, desc, date: data, cat: tipo === 'out' ? categoriaDe(desc) : undefined };
}

async function registrarLancamento(env, l) {
  const base = Date.now();
  const rand = Math.floor(Math.random() * 900 + 100);
  const k = 'fin:' + String(base).padStart(13, '0') + '-' + rand;
  const rec = { k, waId: 'wa' + base + rand, id: base, type: l.type, desc: l.desc, value: l.value, date: l.date, importado: false };
  if (l.cat) rec.cat = l.cat;
  await env.HR_KV.put(k, JSON.stringify(rec), { expirationTtl: FIN_TTL });
  await env.HR_KV.put('ultimo:fin', k, { expirationTtl: FIN_TTL });
  return rec;
}

async function desfazerUltimo(env) {
  const k = await env.HR_KV.get('ultimo:fin');
  if (!k) return null;
  const rec = JSON.parse((await env.HR_KV.get(k)) || 'null');
  await env.HR_KV.delete('ultimo:fin');
  if (!rec || rec.importado) return null;
  await env.HR_KV.delete(k);
  return rec;
}

async function resumoHoje(env) {
  const hoje = dataBahia();
  const lista = await env.HR_KV.list({ prefix: 'fin:' });
  const linhas = []; let ent = 0, sai = 0;
  for (const k of lista.keys) {
    const r = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
    if (!r || r.date !== hoje) continue;
    if (r.type === 'in') ent += r.value; else sai += r.value;
    linhas.push(`${r.type === 'in' ? '🟢' : '🔴'} R$ ${reais(r.value)} — ${r.desc}`);
  }
  if (!linhas.length) return `📭 Nenhum lançamento seu hoje (${dataBR(hoje)}).`;
  return [`📒 *Hoje (${dataBR(hoje)})*`, '', ...linhas.slice(-15), '',
    `🟢 Entradas: R$ ${reais(ent)}`, `🔴 Gastos: R$ ${reais(sai)}`].join('\n');
}

// true = a mensagem era um comando/lançamento e já foi respondida
async function tratarFinancas(env, from, bruto, msg, F) {
  if (['desfazer', 'desfaz', 'cancelar ultimo', 'apagar ultimo'].includes(msg)) {
    const r = await desfazerUltimo(env);
    await enviar(env, from, r
      ? fala(F, 'donoDesfeito', { desc: r.desc, valor: reais(r.value) })
      : fala(F, 'donoNadaDesfazer', {}));
    return true;
  }
  if (['hoje', 'resumo', 'resumo de hoje', 'extrato'].includes(msg)) {
    await enviar(env, from, await resumoHoje(env));
    return true;
  }
  const l = interpretarLancamento(bruto);
  if (!l) return false;
  await registrarLancamento(env, l);
  await enviar(env, from, fala(F, 'donoAnotado', {
    tipo: l.type === 'in' ? '🟢 Entrada' : '🔴 Gasto',
    valor: reais(l.value),
    desc: l.desc,
    cat: l.cat ? (CATS[l.cat] || l.cat) : '—',
    data: dataBR(l.date),
  }));
  return true;
}

// ── Processa uma mensagem recebida ───────────────────────────────────
function extrairTexto(m) {
  if (m.type === 'text') return m.text?.body ?? '';
  if (m.type === 'interactive') {
    return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
  }
  if (m.type === 'button') return m.button?.text || '';
  if (m.type === 'image' || m.type === 'video' || m.type === 'document') return m[m.type]?.caption ?? null;
  return null; // áudio, figurinha, localização etc.
}

async function tratarMensagem(env, m) {
  const from = m.from;
  if (!from) return;

  // evita processar duas vezes a mesma mensagem (a Meta pode reenviar)
  if (m.id) {
    if (await env.HR_KV.get('m:' + m.id)) return;
    await env.HR_KV.put('m:' + m.id, '1', { expirationTtl: 3600 });
  }

  const dono = ehDono(env, from);
  if (!dono && !atenderClientes(env)) return; // modo só-dono: ignora os demais, sem responder

  const bruto = extrairTexto(m);
  if (bruto === null || (bruto === '' && m.type !== 'text')) {
    await enviar(env, from, fala(await getFalas(env), 'soTexto', {}));
    return;
  }

  const msg = normaliza(bruto);
  if (!msg) return;
  const F = await getFalas(env);

  if (dono) {
    await entregarPendentes(env, from).catch(e => console.log('[BOT] pendentes:', e.message));
    if (['leads', 'lead', 'pendentes'].includes(msg) && atenderClientes(env)) {
      await enviar(env, from, await comandoLeads(env));
      return;
    }
    if (['ajuda', 'menu', 'comandos'].includes(msg)) {
      await enviar(env, from, fala(F, 'donoOla', {}));
      return;
    }
    if (await tratarFinancas(env, from, bruto, msg, F)) return;
    if (!atenderClientes(env)) {
      const ola = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'ei'].some(p => msg === p || msg.startsWith(p + ' '));
      await enviar(env, from, fala(F, ola ? 'donoOla' : 'donoNaoEntendi', {}));
      return;
    }
  }

  const agora = Date.now();
  let s = null;
  try { s = JSON.parse((await env.HR_KV.get('s:' + from)) || 'null'); } catch (_) {}
  const novo = () => ({ e: E.INICIO, d: {}, ts: agora });
  if (!s || (agora - (s.ts || 0)) > SESSAO_TTL * 1000) s = novo();
  s.ts = agora;

  const SAUDACOES = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'ei', 'menu', 'inicio', 'orcamento'];
  const recomecar = ['reiniciar', 'recomecar', 'cancelar', 'voltar ao inicio'].includes(msg);
  if (recomecar || (s.e === E.FIM && SAUDACOES.some(p => msg === p || msg.startsWith(p + ' ')))) s = novo();

  const resp = await fsm(env, s, msg, bruto, from, F);
  await env.HR_KV.put('s:' + from, JSON.stringify(s), { expirationTtl: SESSAO_TTL });
  if (resp) await enviar(env, from, resp);
}

async function tratarPayload(env, payload) {
  for (const entry of payload?.entry || []) {
    for (const ch of entry.changes || []) {
      for (const m of ch.value?.messages || []) {
        try { await tratarMensagem(env, m); }
        catch (e) { console.log('[BOT] erro ao tratar mensagem:', e.message); }
      }
    }
  }
}

// ── Segurança: confere que o aviso veio mesmo da Meta ────────────────
async function assinaturaValida(raw, header, secret) {
  if (!header || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(raw));
  const esperado = 'sha256=' + [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (esperado.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

// ── API do painel (app HR) — protegida por BOT_KEY ───────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-bot-key',
  'Access-Control-Max-Age': '86400',
};
function jsonR(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
}
function chaveOk(req, env) {
  const a = String(req.headers.get('x-bot-key') || '');
  const b = String(env.BOT_KEY || '');
  if (!b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function rotaBot(req, env, url) {
  if (!env.BOT_KEY) return jsonR({ error: 'Worker sem BOT_KEY configurada.' }, 503);
  if (!chaveOk(req, env)) return jsonR({ error: 'Chave do bot incorreta.' }, 401);
  const p = url.pathname;

  if (p === '/bot/status' && req.method === 'GET') {
    const ok = !!(env.WHATSAPP_TOKEN && env.PHONE_NUMBER_ID && env.APP_SECRET && env.VERIFY_TOKEN && env.HR_KV);
    return jsonR({ status: ok ? 'connected' : 'disconnected', phone: numeroDono(env), code: null, modo: atenderClientes(env) ? 'clientes' : 'dono' });
  }

  if (p === '/bot/leads' && req.method === 'GET') {
    const lista = await env.HR_KV.list({ prefix: 'lead:' });
    const leads = [];
    for (const k of lista.keys.slice(-20).reverse()) {
      const l = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
      if (l) leads.push(l);
    }
    return jsonR({ leads });
  }

  if (p === '/bot/falas' && req.method === 'GET') {
    return jsonR({ falas: await getFalas(env), padrao: FALAS_PADRAO, rotulos: FALAS_ROTULOS });
  }

  if (p === '/bot/falas' && req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch (_) { return jsonR({ error: 'JSON inválido.' }, 400); }
    if (body.restaurar) {
      await env.HR_KV.delete('cfg:falas');
      return jsonR({ ok: true, falas: { ...FALAS_PADRAO } });
    }
    const novas = {};
    for (const k of Object.keys(FALAS_PADRAO)) {
      const t = body.falas && body.falas[k];
      if (typeof t === 'string' && t.trim() && t !== FALAS_PADRAO[k]) novas[k] = t.slice(0, 1500);
    }
    await env.HR_KV.put('cfg:falas', JSON.stringify(novas));
    return jsonR({ ok: true, falas: await getFalas(env) });
  }

  if (p === '/bot/financas' && req.method === 'GET') {
    const lista = await env.HR_KV.list({ prefix: 'fin:' });
    const lancamentos = [];
    for (const k of lista.keys) {
      const rec = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
      if (rec && !rec.importado) lancamentos.push(rec);
    }
    return jsonR({ lancamentos });
  }

  if (p === '/bot/financas/confirmar' && req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch (_) { return jsonR({ error: 'JSON inválido.' }, 400); }
    const ids = new Set(Array.isArray(body.waIds) ? body.waIds.map(String) : []);
    let n = 0;
    if (ids.size) {
      const lista = await env.HR_KV.list({ prefix: 'fin:' });
      for (const k of lista.keys) {
        const rec = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
        if (rec && ids.has(rec.waId) && !rec.importado) {
          rec.importado = true;
          await env.HR_KV.put(k.name, JSON.stringify(rec), { expirationTtl: 30 * 24 * 60 * 60 });
          n++;
        }
      }
    }
    return jsonR({ ok: true, confirmados: n });
  }

  return jsonR({ error: 'Rota não encontrada.' }, 404);
}

// ── Entrada do Worker ────────────────────────────────────────────────
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname.startsWith('/bot/')) return rotaBot(req, env, url);

    if (url.pathname !== '/webhook') {
      return new Response('HR Mármores — bot online ✅', { status: 200 });
    }

    // Verificação inicial feita pela Meta ao salvar o webhook
    if (req.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe'
        && env.VERIFY_TOKEN
        && url.searchParams.get('hub.verify_token') === env.VERIFY_TOKEN;
      return ok
        ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 })
        : new Response('Forbidden', { status: 403 });
    }

    if (req.method === 'POST') {
      const raw = await req.text();
      if (!(await assinaturaValida(raw, req.headers.get('x-hub-signature-256'), env.APP_SECRET))) {
        return new Response('Assinatura inválida', { status: 401 });
      }
      let payload = null;
      try { payload = JSON.parse(raw); } catch (_) { return new Response('ok', { status: 200 }); }
      ctx.waitUntil(tratarPayload(env, payload)); // responde 200 rápido; processa em segundo plano
      return new Response('ok', { status: 200 });
    }

    return new Response('Método não permitido', { status: 405 });
  },
};
