# Simulador do bot (equipe, pontos e cobrança)

Roda o `worker/hr-bot.js` de verdade com WhatsApp, IA e banco falsos, e mostra o que o bot responderia.

    node testes/bot/t1.mjs   # Fabrício: corte, pergunta de pontos, "já cortado"
    node testes/bot/t2.mjs   # entregadores: entrega e recebimento
    node testes/bot/t3.mjs   # entrega com foto, dinheiro recebido, valor diferente do combinado
    node testes/bot/t4.mjs   # mensagem repetida não dá ponto 2 vezes; entrega sem entregador cadastrado

Cada linha `→1234:` é uma mensagem enviada (últimos 4 dígitos do número). `4460` = dono.
    node testes/bot/t5.mjs   # vários itens: corte por item, "terminei tudo", instalação em dupla, pagou só uma parte
