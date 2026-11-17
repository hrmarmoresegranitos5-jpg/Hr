// scripts/checar-servicos.js
// Roda no GitHub Actions (igual ao checar-boletos.js) e manda push real (FCM),
// funcionando com o app FECHADO. Avisa sobre SERVIÇOS:
//   🛠️ dia de iniciar (data de início = hoje)
//   ⏳ entrega em 3 dias  |  📦 entrega hoje  |  🔴 entrega atrasada
// Cada aviso é mandado uma única vez por serviço (controle em notifState).

const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://orcamento-hr-marmoraria-default-rtdb.firebaseio.com'
});

// "Hoje" no horário da Bahia (o servidor do GitHub roda em UTC)
function hojeBahia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }); // AAAA-MM-DD
}
function diasEntre(deISO, ateISO) { // ateISO - deISO, em dias
  const a = Date.parse(deISO + 'T00:00:00Z'), b = Date.parse(ateISO + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}
function fmtBR(iso) { const p = String(iso).split('-'); return p[2] + '/' + p[1]; }

async function main() {
  const db = admin.database();
  const raiz = await db.ref('hr').get();
  if (!raiz.exists()) { console.log('Nenhum dado em /hr — nada a fazer.'); return; }

  const hoje = hojeBahia();
  const dados = raiz.val();

  for (const codigo of Object.keys(dados)) {
    const reg = dados[codigo] || {};
    const jobs = Array.isArray(reg.j) ? reg.j : Object.values(reg.j || {});
    const tokens = reg.fcmTokens ? Object.keys(reg.fcmTokens) : [];
    if (!tokens.length || !jobs.length) continue;

    const estado = reg.notifState || {};
    const novo = {};
    const mensagens = [];

    for (const j of jobs) {
      if (!j || j.done) continue;
      const nome = j.cli || 'Serviço';
      const desc = j.desc ? ' — ' + j.desc : '';
      const chave = 's-' + j.id;
      const st = estado[chave] || {};
      const marcou = {};

      // 🛠️ Dia de iniciar (aceita até 2 dias de atraso, caso o aviso de hoje tenha passado)
      if (j.start) {
        const dIni = diasEntre(hoje, j.start); // 0 = hoje
        if (dIni <= 0 && dIni >= -2 && !st.inicio) {
          const faltam = j.end ? diasEntre(hoje, j.end) : null;
          mensagens.push({
            titulo: dIni === 0 ? '🛠️ Hoje é dia de iniciar' : '🛠️ Serviço devia ter iniciado',
            corpo: nome + desc + (j.end ? ' — entrega ' + fmtBR(j.end) + (faltam !== null ? ' (faltam ' + faltam + ' dias)' : '') : ''),
            tag: 'inicio-' + j.id
          });
          marcou.inicio = true;
        }
      }
      // 📦 Entrega
      if (j.end) {
        const d = diasEntre(hoje, j.end);
        if (d === 3 && !st.entrega3) {
          mensagens.push({ titulo: '⏳ Entrega em 3 dias', corpo: nome + desc, tag: 'e3-' + j.id }); marcou.entrega3 = true;
        } else if (d === 0 && !st.entregaHoje) {
          mensagens.push({ titulo: '📦 Entrega hoje', corpo: nome + desc, tag: 'e0-' + j.id }); marcou.entregaHoje = true;
        } else if (d < 0 && !st.atrasado) {
          mensagens.push({ titulo: '🔴 Entrega atrasada', corpo: nome + desc + ' — atrasado ' + Math.abs(d) + ' dia(s)', tag: 'at-' + j.id }); marcou.atrasado = true;
        }
      }
      if (Object.keys(marcou).length) novo[chave] = { ...st, ...marcou };
    }

    // ☀️ Resumo da manhã (1x por dia, entre 06h e 11h da Bahia)
    const hora = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia', hour: 'numeric', hour12: false }), 10) % 24;
    if (hora >= 6 && hora < 11 && estado.resumoData !== hoje) {
      const ativos = jobs.filter(j => j && !j.done);
      const linhas = [];
      const ini = ativos.filter(j => j.start === hoje);
      if (ini.length) linhas.push('🛠️ Iniciar hoje: ' + ini.map(j => j.cli).join(', '));
      const ent = ativos.filter(j => j.end && diasEntre(hoje, j.end) >= 0 && diasEntre(hoje, j.end) <= 7).sort((a, b) => String(a.end).localeCompare(String(b.end)));
      if (ent.length) linhas.push('📦 Entregas em 7 dias: ' + ent.length + ' (próxima: ' + ent[0].cli + ' ' + fmtBR(ent[0].end) + ')');
      const atr = ativos.filter(j => j.end && diasEntre(hoje, j.end) < 0);
      if (atr.length) linhas.push('🔴 Atrasados: ' + atr.length);
      const bols = (reg.b || []).filter(b => b && b.tipo === 'pagar' && b.status !== 'pago' && b.venc && diasEntre(hoje, b.venc) <= 3);
      if (bols.length) linhas.push('🧾 Boletos a pagar (até 3 dias): ' + bols.length + ' · R$ ' + bols.reduce((a, b) => a + (b.valor || 0), 0).toFixed(2).replace('.', ','));
      if (linhas.length) mensagens.push({ titulo: '☀️ Resumo do dia', corpo: linhas.join(' • '), tag: 'resumo-' + hoje });
      novo.resumoData = hoje;
    }

    if (!mensagens.length) { console.log('Código ' + codigo + ': nada novo pra avisar.'); continue; }

    for (const m of mensagens) {
      try {
        const r = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title: m.titulo, body: m.corpo },
          data: { tag: m.tag, url: '/' },
          android: { priority: 'high' },
          webpush: { headers: { Urgency: 'high', TTL: '86400' } }
        });
        console.log('Enviado (' + codigo + '): ' + m.titulo + ' — ' + r.successCount + '/' + tokens.length);
      } catch (e) { console.error('Erro ao enviar push (' + codigo + '):', e.message); }
    }
    // update (não set) para não apagar o estado dos boletos/orçamentos
    await db.ref('hr/' + codigo + '/notifState').update(novo);
  }
}

main()
  .then(() => { console.log('Checagem de serviços concluída.'); process.exit(0); })
  .catch((e) => { console.error('Erro geral:', e); process.exit(1); });
