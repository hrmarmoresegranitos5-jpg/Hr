// src/servidor.js
// ─────────────────────────────────────────────────────────────
//  Mini servidor HTTP que exibe o QR Code no navegador
//  Roda na porta 3000 (ou PORT do ambiente)
// ─────────────────────────────────────────────────────────────

import { createServer } from 'http';
import { CONFIG } from './config.js';
import { log } from './logger.js';

const PORTA = process.env.PORT || 3000;

// Estado compartilhado com o index.js
export const estado = {
  qrCode: null,        // string base64 da imagem PNG do QR
  conectado: false,
  aguardando: true,
};

// ── HTML da página do QR Code ─────────────────────────────────
function paginaQR() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CONFIG.assistente.nome} — Conectar WhatsApp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117;
      color: #e8eaed;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .emoji { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .sub { color: #888; font-size: 14px; margin-bottom: 32px; }
    .qr-box {
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      display: inline-block;
      margin-bottom: 28px;
    }
    .qr-box img { display: block; width: 240px; height: 240px; }
    .steps { text-align: left; background: #12151e; border-radius: 12px; padding: 20px; }
    .step { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .step:last-child { margin-bottom: 0; }
    .num {
      background: #25d366;
      color: #000;
      font-weight: 700;
      font-size: 12px;
      width: 22px; height: 22px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px;
    }
    .step p { font-size: 13px; color: #ccc; line-height: 1.5; }
    .step strong { color: #fff; }
    .status { margin-top: 20px; font-size: 12px; color: #555; }
    .aguardando { animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  </style>
  <script>
    // Recarrega a página a cada 3s para pegar novo QR ou status conectado
    setTimeout(() => location.reload(), 3000);
  </script>
</head>
<body>
  <div class="card">
    <div class="emoji">📱</div>
    <h1>${CONFIG.assistente.nome}</h1>
    <p class="sub">Escaneie o QR Code para conectar ao WhatsApp</p>

    <div class="qr-box">
      <img src="/qr.png" alt="QR Code">
    </div>

    <div class="steps">
      <div class="step">
        <div class="num">1</div>
        <p>Abra o <strong>WhatsApp</strong> no seu celular</p>
      </div>
      <div class="step">
        <div class="num">2</div>
        <p>Toque em <strong>⋮ Menu → Aparelhos conectados</strong></p>
      </div>
      <div class="step">
        <div class="num">3</div>
        <p>Toque em <strong>Conectar aparelho</strong> e escaneie o QR acima</p>
      </div>
    </div>

    <p class="status aguardando">⏳ Aguardando conexão... (atualiza automaticamente)</p>
  </div>
</body>
</html>`;
}

// ── HTML da página de sucesso ─────────────────────────────────
function paginaConectado() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${CONFIG.assistente.nome} — Conectada!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117; color: #e8eaed;
      min-height: 100vh; display: flex;
      align-items: center; justify-content: center;
    }
    .card {
      background: #1a1d27; border: 1px solid #25d366;
      border-radius: 20px; padding: 40px; text-align: center;
      max-width: 420px; width: 90%;
      box-shadow: 0 0 40px rgba(37,211,102,0.15);
    }
    .emoji { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 26px; font-weight: 700; color: #25d366; margin-bottom: 8px; }
    p { color: #888; font-size: 15px; line-height: 1.6; }
    .badge {
      display: inline-block; margin-top: 24px;
      background: #0d2818; border: 1px solid #25d366;
      color: #25d366; font-size: 13px; font-weight: 600;
      padding: 8px 20px; border-radius: 100px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">✅</div>
    <h1>Conectada com sucesso!</h1>
    <p>${CONFIG.assistente.nome} está online e pronta para responder mensagens no WhatsApp de ${CONFIG.dono.nome}.</p>
    <div class="badge">🟢 Online agora</div>
  </div>
</body>
</html>`;
}

// ── HTML de aguardando QR ─────────────────────────────────────
function paginaAguardando() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${CONFIG.assistente.nome} — Iniciando...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117; color: #e8eaed;
      min-height: 100vh; display: flex;
      align-items: center; justify-content: center;
    }
    .card {
      background: #1a1d27; border: 1px solid #2a2d3a;
      border-radius: 20px; padding: 48px; text-align: center;
      max-width: 380px; width: 90%;
    }
    .spin { font-size: 48px; display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 20px; margin: 20px 0 8px; color: #fff; }
    p { color: #666; font-size: 14px; }
  </style>
  <script>setTimeout(() => location.reload(), 2000);</script>
</head>
<body>
  <div class="card">
    <div class="spin">⚙️</div>
    <h1>Iniciando ${CONFIG.assistente.nome}...</h1>
    <p>Gerando QR Code, aguarde.</p>
  </div>
</body>
</html>`;
}

// ── HTML do painel de gastos (lido via Supabase no navegador) ──
function paginaGastos() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gastos — ${CONFIG.dono.nome}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<style>
  :root{
    --bg:#15130f; --bg2:#1c1a15; --ouro:#c9a227; --ouro-suave:#e4c85f;
    --texto:#efe9db; --texto-fraco:#a39a86; --linha:#33301f; --erro:#c97a5a;
  }
  *{box-sizing:border-box;}
  body{
    margin:0; background:var(--bg); color:var(--texto);
    font-family:'Inter',sans-serif; padding:32px 20px 80px;
    min-height:100vh;
  }
  .envelope{max-width:640px;margin:0 auto;}
  h1{
    font-family:'Fraunces',serif; font-weight:600; font-size:clamp(28px,6vw,40px);
    margin:0 0 4px; color:var(--texto);
  }
  .sub{color:var(--texto-fraco); font-size:14px; margin-bottom:32px;}
  .periodo{display:flex; gap:8px; margin-bottom:28px;}
  .periodo button{
    background:transparent; border:1px solid var(--linha); color:var(--texto-fraco);
    padding:8px 16px; border-radius:100px; font-size:13px; cursor:pointer;
    font-family:'Inter',sans-serif;
  }
  .periodo button.ativo{border-color:var(--ouro); color:var(--ouro-suave);}
  .total-linha{
    display:flex; align-items:baseline; gap:14px; padding:20px 0 24px;
    border-bottom:1px solid var(--linha); margin-bottom:24px;
  }
  .total-valor{
    font-family:'Fraunces',serif; font-size:clamp(36px,8vw,52px); font-weight:600; color:var(--ouro-suave);
  }
  .total-legenda{color:var(--texto-fraco); font-size:14px;}
  .categorias{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:32px;}
  .pill{
    border:1px solid var(--linha); border-radius:100px; padding:6px 14px;
    font-size:13px; color:var(--texto-fraco);
  }
  .pill b{color:var(--texto); font-weight:500;}
  table{width:100%; border-collapse:collapse;}
  th{
    text-align:left; font-size:12px; font-weight:500; color:var(--texto-fraco);
    padding:0 0 10px; border-bottom:1px solid var(--linha);
  }
  td{
    padding:12px 0; border-bottom:1px solid var(--linha); font-size:14px;
    vertical-align:top;
  }
  td.valor{text-align:right; color:var(--ouro-suave); white-space:nowrap; font-variant-numeric:tabular-nums;}
  td.data{color:var(--texto-fraco); white-space:nowrap; width:70px;}
  .vazio, .carregando, .erro{color:var(--texto-fraco); padding:40px 0; text-align:center; font-size:14px;}
  .erro{color:var(--erro);}
</style>
</head>
<body>
  <div class="envelope">
    <h1>Gastos</h1>
    <p class="sub">${CONFIG.dono.nome} · lançados pelo WhatsApp</p>

    <div class="periodo">
      <button data-p="hoje" class="ativo">Hoje</button>
      <button data-p="semana">Esta semana</button>
      <button data-p="mes">Este mês</button>
    </div>

    <div id="conteudo" class="carregando">Carregando...</div>
  </div>

<script>
const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
const sb = SUPABASE_URL && SUPABASE_ANON_KEY
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function hojeISO(){ return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }); }
function inicioSemanaISO(){
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString('sv-SE');
}
function inicioMesISO(){
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
  d.setDate(1);
  return d.toLocaleDateString('sv-SE');
}
function formatarMoeda(v){ return Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
function formatarData(iso){ const [a,m,d] = iso.split('-'); return d+'/'+m; }

async function carregar(periodo){
  const el = document.getElementById('conteudo');
  el.className = 'carregando';
  el.textContent = 'Carregando...';

  if (!sb) {
    el.className = 'erro';
    el.textContent = 'Configure SUPABASE_URL e SUPABASE_ANON_KEY no servidor pra ver o painel aqui.';
    return;
  }

  const hoje = hojeISO();
  const inicio = periodo === 'semana' ? inicioSemanaISO() : periodo === 'mes' ? inicioMesISO() : hoje;

  const { data: linhas, error } = await sb
    .from('gastos')
    .select('*')
    .gte('data', inicio)
    .lte('data', hoje)
    .order('data', { ascending: false });

  if (error) {
    el.className = 'erro';
    el.textContent = 'Erro ao carregar: ' + error.message;
    return;
  }

  if (!linhas.length) {
    el.className = 'vazio';
    el.textContent = 'Nenhum gasto lançado nesse período.';
    return;
  }

  const total = linhas.reduce((s, g) => s + Number(g.valor), 0);
  const porCategoria = {};
  linhas.forEach(g => { porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.valor); });
  const pills = Object.entries(porCategoria)
    .sort((a,b) => b[1]-a[1])
    .map(([cat,val]) => \`<span class="pill">\${cat} <b>\${formatarMoeda(val)}</b></span>\`)
    .join('');
  const linhasTabela = linhas
    .map(g => \`<tr><td class="data">\${formatarData(g.data)}</td><td>\${g.descricao}<br><span style="color:var(--texto-fraco);font-size:12px">\${g.categoria}</span></td><td class="valor">\${formatarMoeda(g.valor)}</td></tr>\`)
    .join('');

  el.className = '';
  el.innerHTML = \`
    <div class="total-linha">
      <span class="total-valor">\${formatarMoeda(total)}</span>
      <span class="total-legenda">\${linhas.length} lançamento\${linhas.length > 1 ? 's' : ''}</span>
    </div>
    <div class="categorias">\${pills}</div>
    <table>
      <tr><th>Data</th><th>Descrição</th><th style="text-align:right">Valor</th></tr>
      \${linhasTabela}
    </table>
  \`;
}

document.querySelectorAll('.periodo button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.periodo button').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    carregar(btn.dataset.p);
  });
});

carregar('hoje');
</script>
</body>
</html>`;
}

// ── Inicia o servidor HTTP ────────────────────────────────────
export function iniciarServidor() {
  const server = createServer((req, res) => {
    // Rota: painel de gastos
    if (req.url === '/gastos') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(paginaGastos());
      return;
    }

    // Rota: imagem PNG do QR
    if (req.url === '/qr.png') {
      if (!estado.qrCode) {
        res.writeHead(404);
        res.end();
        return;
      }
      const buf = Buffer.from(estado.qrCode.split(',')[1], 'base64');
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(buf);
      return;
    }

    // Rota: API de status (JSON)
    if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ conectado: estado.conectado }));
      return;
    }

    // Rota principal: página HTML
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (estado.conectado) {
      res.end(paginaConectado());
    } else if (estado.qrCode) {
      res.end(paginaQR());
    } else {
      res.end(paginaAguardando());
    }
  });

  server.listen(PORTA, () => {
    log.ok(`🌐 Servidor QR rodando em http://localhost:${PORTA}`);
    log.info('Abra o link acima no navegador para escanear o QR Code');
  });

  return server;
}
