// scripts/checar-orcamentos.js
// Roda a cada poucos minutos via GitHub Actions (não precisa de Blaze nem
// Cloud Functions — mesma abordagem do checar-boletos.js). Lê os orçamentos
// de todos os códigos de sincronização no Realtime Database, detecta quais
// são NOVOS desde a última checagem, e manda push real (FCM) pros outros
// dispositivos daquele mesmo código — funciona com o app fechado.

const admin = require('firebase-admin');

// A chave de serviço vem de uma variável de ambiente (GitHub Secret),
// nunca fica commitada no repositório. É o MESMO secret usado pelo
// checar-boletos.js (FIREBASE_SERVICE_ACCOUNT).
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://orcamento-hr-marmoraria-default-rtdb.firebaseio.com'
});

function fmtValor(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

async function main() {
  const db = admin.database();
  const raiz = await db.ref('hr').get();
  if (!raiz.exists()) { console.log('Nenhum dado em /hr — nada a fazer.'); return; }

  const dados = raiz.val();
  const codigos = Object.keys(dados);

  for (const codigo of codigos) {
    const registro = dados[codigo];
    const orcamentos = registro.q || [];
    const fcmTokens = registro.fcmTokens || {};
    const tokens = Object.keys(fcmTokens);
    if (!tokens.length || !orcamentos.length) continue;

    // Mapa token → nome do aparelho, pra poder pular o aparelho que criou
    // o orçamento na hora de notificar (evita notificar a própria pessoa
    // sobre o orçamento que ela mesma acabou de criar). Tokens salvos no
    // formato antigo (valor === true) não têm nome — entram em todos os
    // envios normalmente, sem exclusão.
    const deviceNameByToken = {};
    tokens.forEach((t) => {
      const v = fcmTokens[t];
      deviceNameByToken[t] = (v && typeof v === 'object' && v.deviceName) ? v.deviceName : '';
    });

    const notifOrcSnap = await db.ref('hr/' + codigo + '/notifOrcState').get();
    // notifOrcState guarda os IDs de orçamento já notificados, pra nunca
    // avisar duas vezes o mesmo orçamento nem "perder" um se o script
    // rodar em ordens diferentes.
    const jaNotificados = notifOrcSnap.exists() ? notifOrcSnap.val() : {};
    const novosIds = {};

    // Ordena por data de criação (id é timestamp) e pega só os mais
    // recentes — evita re-notificar tudo caso notifOrcState tenha sido
    // zerado ou o código seja novo (nesse caso, marca tudo como "visto"
    // sem notificar, pra não disparar uma enxurrada de push do histórico).
    const ehPrimeiraChecagem = Object.keys(jaNotificados).length === 0;

    const mensagens = [];

    for (const o of orcamentos) {
      if (!o || o.id == null) continue;
      const chave = String(o.id);
      if (jaNotificados[chave]) continue;
      novosIds[chave] = true;
      if (ehPrimeiraChecagem) continue; // não notifica o histórico inteiro na primeira vez

      const autor = o.criadoPor && o.criadoPor.trim() ? o.criadoPor.trim() : 'Um aparelho';
      const cliente = o.cli || 'Cliente não informado';
      const valorFmt = fmtValor(o.vista);

      // Não manda a notificação de volta pro(s) token(s) do próprio
      // aparelho que criou o orçamento (mesmo nome de dispositivo).
      const tokensDestino = autor === 'Um aparelho'
        ? tokens
        : tokens.filter((t) => deviceNameByToken[t] !== autor);
      if (!tokensDestino.length) continue;

      mensagens.push({
        tokens: tokensDestino,
        titulo: '🔔 Novo orçamento — ' + autor,
        corpo: cliente + ' — ' + valorFmt,
        tag: 'orcamento-' + o.id
      });
    }

    if (mensagens.length) {
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
    } else {
      console.log('Código ' + codigo + ': nenhum orçamento novo pra avisar.');
    }

    if (Object.keys(novosIds).length) {
      const notifOrcStateNovo = Object.assign({}, jaNotificados, novosIds);
      await db.ref('hr/' + codigo + '/notifOrcState').set(notifOrcStateNovo);
    }
  }
}

main()
  .then(() => { console.log('Checagem de orçamentos concluída.'); process.exit(0); })
  .catch((e) => { console.error('Erro geral:', e); process.exit(1); });
