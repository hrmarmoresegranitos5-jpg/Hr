# 📋 GUIA DE INTEGRAÇÃO — Estrutura Real de Túmulos

## 🎯 Objetivo
Transformar o sistema de orçamento de túmulos de um modelo simplista para um **sistema baseado em engenharia civil real**, com cálculos automáticos de concreto, ferragem, altura estrutural e custos escaláveis por gavetas.

---

## 📦 Arquivos Novos

### 1. **app-tumulos-estrutura.js** ✅
**Módulo Core de Cálculos Estruturais**

Responsabilidades:
- Definir **4 presets estruturais** (simples 1G, dupla 2G, tripla 3G, premium 4G)
- Calcular **altura total** baseada em gavetas
- Computar **volume de concreto** (base + pilares + divisórias + parede)
- Estimar **peso de ferragem** automático
- Calcular **laje superior** e **tampa removível**
- Computar **espaço interno** do caixão (profundidade e altura por gaveta)
- Automatizar **custos estruturais** com escalas por gaveta

**Funções Principais:**
```javascript
calcularEstrutura(tipo, customGavetas)       // Retorna dimensões completas
calcularCustosEstrutura(estru, precosBase)   // Retorna custos estruturais
tumAtualizarEstrutura(tipo, customGavetas)   // Atualiza TUM.q
tumRenderPainelEstrutura()                   // Renderiza painel visual
```

---

### 2. **app-tumulos-integracao.js** ✅
**Adaptações e Patches para app-tumulos.js**

Responsabilidades:
- Definir novo `TUM_Q_EXTENDED` com campos estruturais
- Fornecer nova aba Cliente com **seletor de tipo estrutural**
- Nova função `tumCalcComEstrutura()` que inclui custos estruturais
- CSS para cards e slider de gavetas

---

## 🔧 Instruções de Integração

### PASSO 1: Adicionar Scripts ao index.html

```html
<!-- ANTES de app-tumulos.js -->
<script src="app-tumulos-estrutura.js"></script>
<script src="app-tumulos-integracao.js"></script>

<!-- Ordem completa: -->
<script src="app-config.js"></script>
<script src="app-tumulos-estrutura.js"></script>      <!-- ← NOVO
<script src="app-tumulos-integracao.js"></script>    <!-- ← NOVO
<script src="app-tumulos.js"></script>
<script src="app-precif-tumulos.js"></script>
<script src="app-vendas-tumulos.js"></script>
```

---

### PASSO 2: Atualizar TUM.q Inicial em app-tumulos.js

**Encontrar em app-tumulos.js (linha ~10):**

```javascript
var TUM = {
  q: {
    cli:'', falecido:'', cemiterio:'', quadra:'', lote:'',
    tipo:'simples',
    stoneId: null, stonePrice: 0,
    dims:{ comp:2.20, larg:0.90, alt:0.60, esp:3, gavetas:1 },
    // ... resto do TUM.q existente ...
  }
}
```

**Substituir por (MERGE):**

```javascript
var TUM = {
  q: {
    cli:'', falecido:'', cemiterio:'', quadra:'', lote:'',
    
    // ──── ESTRUTURA REAL (NOVO) ────
    tipoEstrutura: 'simples_1g',
    gavetas: 1,
    
    estrutura: {
      comp: 2.0,
      larg: 1.0,
      profundidade: 1.2,
      alturaTotal: 0.75,
      
      laje: { area: 2.0, espessura: 0.06, volume: 0.12, peso: 300 },
      tampa: { area: 2.0, espessura: 0.04, volume: 0.08, peso: 200 },
      concreto: { volume: 1.5, peso: 3750 },
      ferragem: { peso: 150 },
      
      profInternaReal: 1.0,
      alturaGavetaInterna: 0.75,
      volumeInterno: 1.5,
      
      pesoTotalEstrutura: 3900,
      pesoTotalComLajeETampa: 4400
    },
    
    custosEstrutura: {
      custoConcretoMaterial: 630,
      custoFerragemMaterial: 1275,
      custoLajeMaterial: 360,
      custoTampaMaterial: 300,
      custoMaterialTotal: 2565,
      diasMoldir: 1,
      custoMoMoldir: 400,
      custoMoLaje: 240,
      custoMoAcabamento: 240,
      custoMoTotal: 880,
      sobreprecoPorGavetas: 0,
      custoTotalEstrutura: 3445,
      vendaTotalEstrutura: 4823
    },
    
    // ──── RESTO DO ORIGINAL (manter) ────
    tipo:'simples',
    stoneId: null,
    stonePrice: 0,
    
    pedras: { /* ... */ },
    mdo: { /* ... */ },
    obra: { /* ... */ },
    mat: { /* ... */ },
    acab: { /* ... */ },
    lapide: { /* ... */ },
    cruz: { /* ... */ },
    foto: { /* ... */ }
  }
}
```

---

### PASSO 3: Substituir Função _tumCliente()

**Encontrar em app-tumulos.js (linha ~312):**

```javascript
function _tumCliente() {
  var q = TUM.q;
  var h = '<div class="tum-sec">';
  h += '<div class="tum-sec-lbl">👤 Identificação</div>';
  // ... resto do código ...
}
```

**Substituir por:**

```javascript
function _tumCliente() {
  return _tumClienteNova();  // Chama função do app-tumulos-integracao.js
}
```

OU **copiar todo o código de `_tumClienteNova()` do arquivo de integração.**

---

### PASSO 4: Substituir Função tumCalc()

**Encontrar em app-tumulos.js (linha ~878):**

```javascript
function tumCalc() {
  var q=TUM.q, p=q.pedras, mdo=q.mdo, obra=q.obra, mat=q.mat;
  // ... cálculos originais ...
  return { ... };
}
```

**Substituir por:**

```javascript
function tumCalc() {
  return tumCalcComEstrutura();  // Chama função do app-tumulos-integracao.js
}
```

---

### PASSO 5: Atualizar tumRecalc()

**Encontrar em app-tumulos.js (linha ~1108):**

```javascript
function tumRecalc() {
  tumAutoCalcDims();
  tumAutoMatQty();
  TUM.calc = tumCalc();
  _tumRenderTab();
  // ...
}
```

**Adicionar após tumAutoMatQty():**

```javascript
function tumRecalc() {
  tumAutoCalcDims();
  tumAutoMatQty();
  
  // ──── NOVO ────
  // Garantir que estrutura está atualizada
  if (window.tumAtualizarEstrutura && TUM.q.tipoEstrutura) {
    tumAtualizarEstrutura(TUM.q.tipoEstrutura, TUM.q.gavetas);
  }
  
  TUM.calc = tumCalc();
  _tumRenderTab();
  // ... resto ...
}
```

---

### PASSO 6: Adicionar CSS do Painel Estrutural

**Verificar se já foi injetado (app-tumulos-estrutura.js faz isso automaticamente)**

Se não funcionar, adicionar ao CSS geral de túmulos:

```css
.tum-estrutura-panel {
  background: linear-gradient(180deg, var(--s2), var(--s3));
  border: 1px solid var(--bd);
  border-radius: 14px;
  margin: 12px 0;
}

.tum-est-hd {
  background: linear-gradient(90deg, #1a1a2e, #0f0f1e);
  padding: 12px 14px;
  font-size: .88rem;
  font-weight: 700;
  color: var(--gold2);
}

/* ... resto do CSS em app-tumulos-estrutura.js ... */
```

---

## 🔄 Fluxo Completo (Novo)

```
1. Usuário abre "Nova Cotação Túmulo"
   ↓
2. ABA CLIENTE (NOVA):
   - Preenche identificação (cliente, falecido, cemitério, lote)
   - SELECIONA TIPO ESTRUTURAL em 4 cards visuais
     → Simples (1G)
     → Dupla (2G)
     → Tripla (3G)
     → Premium (4G)
   - AJUSTA gavetas via slider (1-6)
     → Altura recalculada automaticamente
     → Volume de concreto escalável
     → Ferragem aumenta por volume
     → MO de moldagem incrementa por gaveta
     → Sobrepreço por gaveta extra aplicado
   - Vê PAINEL ESTRUTURAL completo:
     * Dimensões externas (C × L × Alt × Prof)
     * Gavetas (qtd e altura por gaveta)
     * Laje e Tampa (área, peso)
     * Concreto (volume, peso)
     * Ferragem (peso em kg)
     * Espaço interno do caixão
     * CUSTOS detalhados (material + MO)
   ↓
3. Prossegue com seleção de PEDRA
   ↓
4. Próximas abas (PEDRAS, EXTRAS, MDO, OBRA, MAT, RESUMO) funcionam normalmente
   ↓
5. ABA RESUMO agora mostra:
   - Custos estruturais destacados
   - Margem considerando estrutura
   - Total final com estrutura integrada
   ↓
6. SALVAR com tumSalvar() → localStorage com estrutura completa
```

---

## 📊 Cálculos Automáticos por Gavetas

### Altura Total
```
Base: preset.alturaBase (ex: 0.75m para 1G)
Fórmula: altura = base + (gavetas - 1) × 0.40m
Exemplo:
  - 1 gaveta: 0.75m
  - 2 gavetas: 1.15m
  - 3 gavetas: 1.55m
  - 4 gavetas: 1.95m
  - 5 gavetas: 2.35m
  - 6 gavetas: 2.75m
```

### Volume de Concreto
```
Base (15cm): comp × profund × 0.15
Pilares (4x): 0.20 × 0.20 × alturaTotal × 4
Divisórias: (gavetas - 1) × comp × profund × 0.12
Parede traseira: comp × alturaTotal × 0.10

Volume total = soma de todos

Peso = volume × 2500 kg/m³
```

### Ferragem (Aço)
```
Taxa: 100 kg/m³ de concreto
Peso ferragem = volumeConcreto × 100

Exemplo:
  - 1.5 m³ → 150 kg de aço
  - 3.0 m³ → 300 kg de aço
```

### Custo de Mão-de-Obra
```
Dias moldagem = 1 + (gavetas - 1) × 0.5
  - 1G: 1 dia
  - 2G: 1.5 dias
  - 3G: 2 dias
  - 4G: 2.5 dias

MO moldagem = dias × R$ 400/dia

MO laje = lajeArea × R$ 120/m²
MO acabamento = lajeArea × R$ 100/m²

Sobrepreço gaveta extra = (gavetas - 1) × R$ 300
```

---

## 📈 Exemplos de Cálculo

### Exemplo 1: Túmulo Simples 1 Gaveta
```
Tipo: simples_1g
Gavetas: 1

Estrutura:
  Altura: 0.75m
  Concreto: 1.2 m³
  Ferragem: 120 kg

Custos Estruturais:
  Concreto: 1.2 × R$420 = R$ 504
  Ferragem: 120 × R$8.50 = R$ 1.020
  Laje (2.0m²): 2.0 × R$180 = R$ 360
  Tampa: 2.0 × R$150 = R$ 300
  MO moldagem (1 dia): R$ 400
  MO laje: 2.0 × R$120 = R$ 240
  MO acabamento: 2.0 × R$100 = R$ 200
  ─────────────────────────
  TOTAL: R$ 3.024
  Venda (40% markup): R$ 4.234
```

### Exemplo 2: Túmulo Dupla 2 Gavetas
```
Tipo: dupla_2g
Gavetas: 2

Estrutura:
  Altura: 1.15m
  Concreto: 1.8 m³
  Ferragem: 180 kg

Custos Estruturais:
  Concreto: 1.8 × R$420 = R$ 756
  Ferragem: 180 × R$8.50 = R$ 1.530
  Laje: R$ 360
  Tampa: R$ 300
  MO moldagem (1.5 dias): R$ 600
  MO laje: R$ 240
  MO acabamento: R$ 200
  Sobrepreço 1 gaveta extra: R$ 300
  ─────────────────────────
  TOTAL: R$ 4.286
  Venda (40% markup): R$ 6.000
```

---

## ✅ Checklist de Integração

- [ ] Copiar `app-tumulos-estrutura.js` para `/`
- [ ] Copiar `app-tumulos-integracao.js` para `/`
- [ ] Adicionar scripts ao `index.html` na ordem correta
- [ ] Atualizar `TUM.q` inicial com campos estruturais
- [ ] Substituir `_tumCliente()` por versão nova
- [ ] Substituir `tumCalc()` por versão com custos estruturais
- [ ] Atualizar `tumRecalc()` para chamar `tumAtualizarEstrutura()`
- [ ] Testar seletor de tipo estrutural
- [ ] Testar slider de gavetas (verificar recálculos)
- [ ] Verificar painel estrutural renderiza corretamente
- [ ] Testar salvar cotação com estrutura
- [ ] Verificar aba RESUMO mostra custos estruturais

---

## 🚀 Próximos Passos (Etapa 2 & 3)

### Etapa 2: Precificação Automática
- Integrar `tumAplicarTabela()` para **aplicar preços estruturais automáticos**
- Painel de precificação que reflete estrutura

### Etapa 3: Venda Inteligente
- Pacotes pré-configurados com **estruturas diferentes**
- Comparador visual mostrando **altura** dos 3 modelos

---

## 📞 Suporte

Se encontrar erros:

1. **Verifique se `tumRenderPainelEstrutura()` retorna HTML vazio**
   → Certifique-se de que `TUM.q.estrutura` existe

2. **Altura estrutural não muda com gavetas**
   → Verifique se `tumAtualizarEstrutura()` é chamada no slider

3. **Custos estruturais não aparecem na aba RESUMO**
   → Verifique se `tumCalcComEstrutura()` está retornando valores

4. **CSS não funciona**
   → Verifique se CSS foi injetado (deve estar no `<head>`)

---

**Versão**: 1.0  
**Data**: 2026-05-08  
**Status**: ✅ Pronto para Integração
