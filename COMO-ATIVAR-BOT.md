# 🤖 Ativar o Bot de WhatsApp — HR Mármores e Granitos

## O que mudou no seu repositório

Foram adicionados **2 arquivos**:
- `server.js` — serve o app + recebe mensagens do WhatsApp
- `package.json` — atualizado para usar o `server.js`

O Railway vai detectar o `package.json` e rodar `node server.js` automaticamente.
Seu app continua funcionando igual, só que agora também tem o bot embutido.

---

## Passo 1 — Subir os 2 arquivos no GitHub

No seu repositório do GitHub, adicione (ou substitua):
- `server.js` ← arquivo novo
- `package.json` ← substituir pelo novo

O Railway vai fazer o redeploy automaticamente em ~2 minutos.

---

## Passo 2 — Adicionar a Evolution API no Railway

A Evolution API é o serviço que conecta ao WhatsApp.

1. Acesse **https://railway.app** e entre no seu projeto
2. Clique em **"+ New"** (canto superior direito)
3. Escolha **"Docker Image"**
4. Cole a imagem: `atendai/evolution-api:latest`
5. Clique em **"Deploy"**

Em **Variables** desse novo serviço, adicione:

| Variável | Valor |
|----------|-------|
| `AUTHENTICATION_TYPE` | `apikey` |
| `AUTHENTICATION_API_KEY` | `hr2025secretaria` |
| `DATABASE_ENABLED` | `false` |
| `STORE_MESSAGES` | `false` |

6. Após o deploy, clique em **"Settings"** → **"Generate Domain"**
7. Anote a URL gerada (ex: `https://evolution-xxxx.railway.app`)

---

## Passo 3 — Configurar variáveis no seu app (Railway)

No serviço do **seu app** (não da Evolution API), vá em **Variables** e adicione:

| Variável | Valor |
|----------|-------|
| `DONO_NUMERO` | Seu número sem +55, ex: `74991484460` |
| `EMPRESA` | `HR Mármores e Granitos` |
| `EVOLUTION_URL` | URL da Evolution API do passo 2 |
| `EVOLUTION_KEY` | `hr2025secretaria` |
| `EVOLUTION_INSTANCE` | `hr-secretaria` |

---

## Passo 4 — Conectar o WhatsApp (escanear QR Code)

1. Acesse: `https://SUA-EVOLUTION-API.railway.app/manager`
2. Use a API key: `hr2025secretaria`
3. Clique em **"Nova Instância"** → nome: `hr-secretaria`
4. QR Code vai aparecer → escaneie com o WhatsApp da empresa
   - WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho

---

## Passo 5 — Configurar o Webhook

Ainda no painel da Evolution API, na instância `hr-secretaria`:

1. Vá em **"Webhook"**
2. URL: `https://SEU-APP.railway.app/webhook`
   _(a URL do seu app atual no Railway, com `/webhook` no final)_
3. Ative o evento: **"messages.upsert"**
4. Salve

---

## ✅ Pronto! Testando

Mande uma mensagem para o número que você conectou.
O bot vai responder automaticamente e você vai receber a notificação no seu WhatsApp.

---

## 🔍 Verificar se está funcionando

Acesse: `https://SEU-APP.railway.app/health`

Deve mostrar:
```json
{ "ok": true, "sessoes": 0, "ts": "2025-..." }
```

---

## 🎙 Ativar transcrição de áudio

Para o bot entender mensagens de voz:

No painel da Evolution API → instância → Configurações:
1. Ative **"Transcrição de Áudio"**
2. Provider: **OpenAI Whisper**
3. Adicione sua chave da OpenAI (crie em platform.openai.com)

Com isso o bot entende qualquer áudio, mesmo com erro de português! ✅
