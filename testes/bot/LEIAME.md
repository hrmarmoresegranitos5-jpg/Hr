# Simulador do bot (equipe, pontos e cobrança)

Roda o `worker/hr-bot.js` de verdade com WhatsApp, IA e banco falsos, e mostra o que o bot responderia.

    node testes/bot/t1.mjs   # Fabrício: corte, pergunta de pontos, "já cortado"
    node testes/bot/t2.mjs   # entregadores: entrega e recebimento
    node testes/bot/t3.mjs   # entrega com foto, dinheiro recebido, valor diferente do combinado
    node testes/bot/t4.mjs   # mensagem repetida não dá ponto 2 vezes; entrega sem entregador cadastrado

Cada linha `→1234:` é uma mensagem enviada (últimos 4 dígitos do número). `4460` = dono.
    node testes/bot/t5.mjs   # vários itens: corte por item, "terminei tudo", instalação em dupla, pagou só uma parte
    node testes/bot/t7.mjs   # totem do balcão: página, conversa, pedido de orçamento, atendente, link do dono
    node testes/bot/t8.mjs   # parear o tablet do balcão (código no tablet, "parear X" no WhatsApp)
    node testes/bot/t9.mjs   # pontos em dobro: dono repete o que o funcionário já registrou
    node testes/bot/t10.mjs  # PDF do saldo/extrato do cliente feito pelo bot (salva em /tmp/extrato.pdf)
- t11: peça/pedra × pedido, nome de cliente inválido, pontos por pergunta. t12: correção do Cássio (v323).
- t13: corrigir pagamento já no app (v324).
- falas/: bateria de ~120 falas reais do dono e da equipe (node falas/rodar.mjs → falas/resultado.txt mostra quem respondeu: comando fixo ou IA). v325.
- falas/fotos.mjs: fotos da equipe (com e sem legenda, etapa já feita, foto no pedido errado, entregador) → falas/fotos.txt. v326.
- falas/func2.txt: 2ª bateria da equipe (RH, máquina/material, recado de cliente, medidas/ficha/prazo). Rodar: SOF=1 FUNC=./func2.txt OUT=./resultado2.txt node falas/rodar.mjs. v327.
- t15: diário de erros (helena_falhas) e 'erros da helena'. v329.
