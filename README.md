# HR Mármores e Granitos — Sistema de Gestão

Sistema de orçamentos, agenda e finanças para marmoraria.

## 🚀 Como usar

Abra o arquivo `index.html` no navegador. Funciona 100% offline.

## 📱 Instalar como app (PWA)

No celular: toque em **Compartilhar → Adicionar à tela inicial**.

## 🔐 Acesso

- **Proprietário** — senha: configurável em Empresa → Config  
- **Funcionário** — acesso apenas à Agenda

## 🌐 Hospedar no GitHub Pages (conexão BB futura)

1. Faça upload destes arquivos para um repositório GitHub
2. Vá em **Settings → Pages → Source → main branch**
3. Acesse via `https://seu-usuario.github.io/hr-marmores`
4. Use a URL gerada nas configurações do app para conectar ao Banco do Brasil

## 📂 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | App completo (HTML + CSS + JS) |
| `manifest.json` | Configuração PWA |
| `sw.js` | Service Worker (offline) |


## ✅ Etapas implementadas

### Etapa 2 — Precificação Automática de Túmulos
- Tabela de preços específica para túmulos (Config → ⚰️ Túmulos)
- Pedras: Granito Simples / Padrão / Premium / Mármore (R$/m²)
- Estrutura: Fundação, Concreto, Ferragem, Gaveta Extra, Alvenaria
- Acabamentos: Lateral/ml, Moldura/ml, Lápide, Cruz, Foto, Polimento, Resinagem
- Mão de obra: diárias e valores de serviço
- Cálculo automático por tamanho, gavetas, acabamento e revestimento
- Painel ⚡ na aba Cliente do orçamento

### Etapa 3 — Estratégia Inteligente de Venda
- Botão "⚖️ Comparar Modelos" no orçamento de túmulo
- 3 pacotes visuais: Essencial / Padrão / Nobre
- Ilustrações SVG proporcionais de cada modelo
- Tabela comparativa completa de recursos
- Cálculo de upsell automático ("por R$ X a mais você tem...")
- Aplicação com 1 toque: preenche orçamento completo
