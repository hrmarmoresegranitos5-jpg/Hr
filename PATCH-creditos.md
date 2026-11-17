# Patch: Créditos (overpago) — onde descontar

Este arquivo tem 2 partes:
1. Funções pra colar em `app-funcionarios.js`, ao lado das funções de adiantamento
   (`_adiantamentosAlvoDecendio`, `_adiantamentosEmAberto`).
2. Onde plugar o seletor "Aplicar este crédito em: ___" na tela de pagamento
   (`abrirFormPagamento`).

O `app-relatorio-ponto.js` já está pronto — ele chama
`HR_FUNC._creditosAlvoDecendio(funcId, decNum, mesRef)` e
`HR_FUNC._creditosEmAberto(funcId)`, exatamente no mesmo padrão dos
adiantamentos. Só falta essas duas funções existirem no HR_FUNC.

---

## 1. Funções (app-funcionarios.js)

Armazena os créditos numa store própria `hr_creditos` (mesmo esquema de
localStorage que vocês já usam pra tudo).

```javascript
// ─── Créditos (overpago em decêndio anterior) ────────────────────────────────
// Espelha 1:1 o sistema de adiantamentos, só que a favor do funcionário.
// Registro: { id, funcionarioId, valor, data, obs, decNumOrigem, mesRefOrigem,
//             creditarDecendio, mesRefDestino, aplicado }
//   - creditarDecendio/mesRefDestino: onde vai ser abatido (escolhido na tela
//     de pagamento). Se null, ainda está "em aberto" sem destino.
//   - aplicado: true depois que já entrou no cálculo de um pagamento.

function getCreditos() {
  try { return JSON.parse(localStorage.getItem('hr_creditos') || '{}'); }
  catch (e) { return {}; }
}

function _saveCreditos(obj) {
  localStorage.setItem('hr_creditos', JSON.stringify(obj));
}

// Cria um crédito pendente. Chame isso no momento em que detectar o overpago
// (mesmo lugar que hoje mostra "Crédito (overpago) — desconta no próximo").
function criarCredito(funcionarioId, valor, data, obs, decNumOrigem, mesRefOrigem) {
  var creditos = getCreditos();
  var id = 'cred_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  creditos[id] = {
    id: id,
    funcionarioId: funcionarioId,
    valor: parseFloat(valor) || 0,
    data: data || new Date().toISOString().slice(0, 10),
    obs: obs || '',
    decNumOrigem: decNumOrigem || null,
    mesRefOrigem: mesRefOrigem || null,
    creditarDecendio: null,
    mesRefDestino: null,
    aplicado: false
  };
  _saveCreditos(creditos);
  return creditos[id];
}

// Define em qual decêndio o crédito deve ser aplicado (chamado pelo seletor
// "Aplicar este crédito em: ___" na tela de pagamento).
function alocarCredito(creditoId, decNum, mesRef) {
  var creditos = getCreditos();
  if (!creditos[creditoId]) return null;
  creditos[creditoId].creditarDecendio = decNum;
  creditos[creditoId].mesRefDestino = mesRef;
  _saveCreditos(creditos);
  return creditos[creditoId];
}

function marcarCreditoAplicado(creditoId) {
  var creditos = getCreditos();
  if (!creditos[creditoId]) return null;
  creditos[creditoId].aplicado = true;
  _saveCreditos(creditos);
  return creditos[creditoId];
}

// Créditos apontados para um decêndio específico (usado pelo relatório) —
// mesma assinatura de _adiantamentosAlvoDecendio.
function _creditosAlvoDecendio(funcId, decNum, mesRef) {
  var creditos = getCreditos();
  return Object.values(creditos).filter(function (c) {
    return c.funcionarioId == funcId && !c.aplicado &&
           c.creditarDecendio === decNum && c.mesRefDestino === mesRef;
  });
}

// Todos os créditos em aberto do funcionário (pra faixinha informativa) —
// mesma assinatura de _adiantamentosEmAberto.
function _creditosEmAberto(funcId) {
  var creditos = getCreditos();
  return Object.values(creditos).filter(function (c) {
    return c.funcionarioId == funcId && !c.aplicado;
  });
}

// Exponha no objeto HR_FUNC que já é retornado no final do arquivo:
// HR_FUNC.getCreditos = getCreditos;
// HR_FUNC.criarCredito = criarCredito;
// HR_FUNC.alocarCredito = alocarCredito;
// HR_FUNC.marcarCreditoAplicado = marcarCreditoAplicado;
// HR_FUNC._creditosAlvoDecendio = _creditosAlvoDecendio;
// HR_FUNC._creditosEmAberto = _creditosEmAberto;
```

---

## 2. Seletor na tela de pagamento (`abrirFormPagamento`)

Hoje (pela sua tela 2) o app já calcula e mostra:

```
💳 Crédito (overpago)
Desconta no próximo pagamento         R$ 13,06
```

Isso precisa virar 2 passos:

1. **No momento em que o overpago é detectado** (o cálculo que já existe),
   chamar `criarCredito(funcId, valor, dataDoPagamento, obs, decNum, mesRef)`
   ao invés de só mostrar o texto. Isso persiste o crédito como registro,
   em vez de ser um número recalculado toda vez.

2. **Trocar o texto fixo "Desconta no próximo pagamento" por um seletor**:

```html
<div>Aplicar este crédito em:</div>
<select id="credito_destino">
  <option value="">Não aplicar ainda</option>
  <option value="2026-07|1">1º dec. Julho</option>
  <option value="2026-07|2">2º dec. Julho</option>
  <option value="2026-07|3">3º dec. Julho</option>
</select>
```

No `onchange`, parseia o `value` (`mesRef|decNum`) e chama:
```javascript
alocarCredito(creditoId, decNum, mesRef);
```

3. **Quando o pagamento do decêndio de destino for de fato registrado** (o
   usuário clica em "Pagar agora" naquele decêndio), chamar
   `marcarCreditoAplicado(creditoId)` pros créditos que entraram naquele
   cálculo — pra ele sumir da lista de "em aberto" depois de usado.

Com isso o relatório de ponto (já ajustado) passa a mostrar automaticamente:

```
💰 Resumo do 1º Decêndio
Créditos de decêndio(s) anterior(es):
  • 30/06 — 3º dec/Jun overpago          + R$ 13,06
Salário fixo do decêndio                   R$ 500,00
+ Horas extras deste período               R$ 90,40
─────────────────────────────────────────
💰 TOTAL LÍQUIDO A PAGAR                   R$ 603,46
```

E, se o crédito ainda não tiver destino escolhido, aparece a linha
informativa "Créditos em aberto (sem destino escolhido): ..." no rodapé,
pra nunca sumir da vista.
