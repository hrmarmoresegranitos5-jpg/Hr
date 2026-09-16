# 🤖 Assistente + Registro de Gastos — WhatsApp Bot

Bot de WhatsApp pessoal com IA (Claude), conectado via QR Code no navegador.
Além de conversar, ele reconhece quando você manda uma mensagem descrevendo
um gasto (ex: **"hoje gastei 100 reais de combustível"**) e grava
automaticamente no Supabase — com data, valor, descrição e categoria.

Roda 24h no **Railway**, sem precisar de API oficial do WhatsApp.

---

## 1. Crie o projeto no Supabase (banco dos gastos)

1. Acesse [supabase.com](https://supabase.com) → crie um projeto novo (grátis)
2. No painel, vá em **SQL Editor** → **New query** e rode:

```sql
create table gastos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  valor numeric(12,2) not null,
  descricao text not null,
  categoria text not null default 'outros',
  origem text not null default 'whatsapp',
  autor_jid text,
  criado_em timestamptz not null default now()
);

alter table gastos enable row level security;

-- Permite que o painel visual (/gastos) leia os dados com a chave "anon"
create policy "leitura publica de gastos"
  on gastos for select
  using (true);

-- Não existe policy de insert/update/delete pra "anon" de propósito:
-- só o bot (com a chave "service_role", que ignora RLS) pode escrever.
```

3. Vá em **Project Settings → API** e anote duas chaves:
   - **`service_role`** → vai no `SUPABASE_SERVICE_KEY` (fica só no bot, nunca exponha)
   - **`anon` `public`** → vai no `SUPABASE_ANON_KEY` (opcional, só pro painel visual)
   - **Project URL** → vai no `SUPABASE_URL`

---

## 2. Suba o código no GitHub

1. Crie um repositório no [github.com](https://github.com) (pode ser privado)
2. Faça upload de todos os arquivos desta pasta
3. **Não suba** a pasta `auth_info_baileys/` nem o arquivo `.env`

## 3. Deploy no Railway

1. [railway.app](https://railway.app) → **Login with GitHub**
2. **New Project → Deploy from GitHub repo** → selecione o repositório
3. Em **Variables**, adicione:

| Variável | Valor |
|---|---|
| `DONO_NOME` | Hangel |
| `ASSISTENTE_NOME` | (o nome que quiser) |
| `ANTHROPIC_API_KEY` | sk-ant-SUA_CHAVE |
| `NUMEROS_AUTORIZADOS` | seu número, ex: `5574999990000` |
| `SUPABASE_URL` | URL do projeto (passo 1) |
| `SUPABASE_SERVICE_KEY` | chave `service_role` (passo 1) |
| `SUPABASE_ANON_KEY` | chave `anon` (passo 1, opcional) |

4. **Settings → Networking → Generate Domain**
5. Acesse a URL gerada → escaneie o QR Code pelo WhatsApp
   (**⋮ Menu → Aparelhos conectados → Conectar aparelho**)
6. A sessão fica salva — mesmo se o Railway reiniciar, não precisa escanear de novo

---

## 💬 Como usar no WhatsApp

Escreva naturalmente, tipo:

- `hoje gastei 100 reais de combustível`
- `paguei 45 de almoço com cliente ontem`
- `gasto de 320 em material de construção`

O bot responde confirmando o que entendeu (data, valor, descrição, categoria).

### Comandos

| Comando | O que faz |
|---|---|
| `!gastos hoje` | resumo dos gastos de hoje |
| `!gastos semana` | resumo da semana atual |
| `!gastos mes` | resumo do mês atual |
| `!desfazer` | apaga o último gasto que você lançou (corrige erro de digitação) |
| `!ajuda` | lista os comandos |
| `!esquecer` | apaga o histórico da conversa com a IA |
| `!status` | uptime, memória e estatísticas |
| `!ping` | verifica se está online |

Qualquer outra mensagem que não for gasto nem comando vai direto pra IA conversar.

## 📊 Painel visual

Acesse `https://SEU-APP.up.railway.app/gastos` para ver o total do período,
por categoria e a lista de lançamentos — dá pra abrir do celular a qualquer hora.
Só funciona se `SUPABASE_ANON_KEY` estiver configurada.

---

## 📁 Estrutura

```
whatsapp-bot-gastos/
├── src/
│   ├── index.js      ← Boot principal (comando → gasto → IA, nessa ordem)
│   ├── servidor.js   ← Servidor HTTP: QR Code (/) e painel de gastos (/gastos)
│   ├── gastos.js      ← Detecta e extrai gastos da mensagem via IA
│   ├── supabase.js   ← Grava/consulta os gastos no Supabase
│   ├── ia.js          ← Integração com Claude (conversa geral)
│   ├── comandos.js   ← Comandos !especiais
│   ├── memoria.js    ← Histórico de conversa por contato
│   ├── acesso.js     ← Controle de autorização
│   ├── logger.js     ← Terminal colorido
│   └── config.js     ← Configuração central
├── .env.example
├── package.json
└── README.md
```

---

## ❓ Problemas comuns

**Sessão expirou no Railway**
→ Acesse a URL do Railway, um novo QR Code aparece. Escaneie novamente.

**Erro "ANTHROPIC_API_KEY não configurada" ou "SUPABASE_URL não configurada"**
→ Verifique as variáveis no painel Railway em **Variables**

**Mandei um gasto e ele respondeu como conversa normal, não registrou**
→ A extração usa IA; tente ser mais direto ("gastei X reais de Y"). Se persistir,
mande a mensagem exata pra ajustar o reconhecimento.

**Painel `/gastos` mostra "Configure SUPABASE_URL e SUPABASE_ANON_KEY"**
→ Falta a variável `SUPABASE_ANON_KEY` no Railway (é diferente da `SERVICE_KEY`).
