// scripts/checar-boletos.js
// Roda 2x/dia via GitHub Actions (não precisa de Blaze nem Cloud Functions).
// Lê os boletos de todos os códigos de sincronização no Realtime Database,
// verifica vencidos/vencendo-hoje/vencendo-em-breve, e manda push real (FCM)
// pros dispositivos que tiverem token salvo — funciona com o app fechado.

const admin = require('firebase-admin');

// A chave de serviço vem de uma variável de ambiente (GitHub Secret),
// nunca fica commitada no repositório.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://orcamento-hr-marmoraria-default-rtdb.firebaseio.com'
});

async function main() {
  const db = admin.database();
  const raiz = await db.ref('hr').get();
  if (!raiz.exists()) { console.log('Nenhum dado em /hr — nada a fazer.'); return; }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dados = raiz.val();
  const codigos = Object.keys(dados);

  for (const codigo of codigos) {
    const registro = dados[codigo];
    const boletos = registro.b || [];
    const tokens = registro.fcmTokens ? Object.keys(registro.fcmTokens) : [];
    if (!tokens.length || !boletos.length) continue;

    const notifStateSnap = await db.ref('hr/' + codigo + '/notifState').get();
    const notifState = notifStateSnap.exists() ? notifStateSnap.val() : {};
    const notifStateNovo = { ...notifState };

    const mensagens = [];

    for (const b of boletos) {
      if (!b || !b.venc || b.status === 'pago') continue;
      const venc = new Date(b.venc + 'T00:00:00');
      const diffDias = Math.round((venc - hoje) / 86400000);
      const nome = b.forn || b.cliente || b.desc || 'Boleto';
      const valorFmt = 'R$ ' + Number(b.valor || 0).toFixed(2).replace('.', ',');

      const estadoAtual = notifState[b.id] || {};
      let titulo = null, corpo = null, chave = null;

      if (diffDias < 0 && !estadoAtual.vencido) {
        titulo = '🔴 Boleto vencido';
        corpo = nome + ' — ' + valorFmt + ' venceu há ' + Math.abs(diffDias) + ' dia(s)';
        chave = 'vencido';
      } else if (diffDias === 0 && !estadoAtual.hoje) {
        titulo = '🟡 Boleto vence hoje';
        corpo = nome + ' — ' + valorFmt;
        chave = 'hoje';
      } else if (diffDias > 0 && diffDias <= 3 && !estadoAtual.proximo) {
        titulo = '⏳ Boleto vence em breve';
        corpo = nome + ' vence em ' + diffDias + ' dia(s) — ' + valorFmt;
        chave = 'proximo';
      }

      if (titulo) {
        mensagens.push({ tokens, titulo, corpo, tag: 'boleto-' + b.id });
        notifStateNovo[b.id] = { ...estadoAtual, [chave]: true };
      }
    }

    if (!mensagens.length) { console.log('Código ' + codigo + ': nada novo pra avisar.'); continue; }

    for (const m of mensagens) {
      try {
        const resultado = await admin.messaging().sendEachForMulticast({
          tokens: m.tokens,
          notification: { title: m.titulo, body: m.corpo },
          data: { tag: m.tag }
        });
        console.log('Enviado (' + codigo + '): ' + m.titulo + ' — sucesso: ' + resultado.successCount + '/' + m.tokens.length);
      } catch (e) {
        console.error('Erro ao enviar push (' + codigo + '):', e.message);
      }
    }

    await db.ref('hr/' + codigo + '/notifState').set(notifStateNovo);
  }
}

main()
  .then(() => { console.log('Checagem concluída.'); process.exit(0); })
  .catch((e) => { console.error('Erro geral:', e); process.exit(1); });
