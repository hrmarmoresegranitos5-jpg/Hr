# Login com Google no sync

## Arquivos
- `app-core.js` (v55) e `index.html` → substituem os do repositório
- `database.rules.json` → NÃO vai pro GitHub, é pra colar no Firebase (passo 3)

## Como funciona
- Os dados continuam em `hr/HR2025` (mesmo caminho de hoje). **Nada precisa ser migrado.**
- Só entra quem fez login com Google **e** está na lista `acesso/` do banco.
- Você (giliardhangel18@gmail.com) é o dono: na primeira vez que entrar, o app se libera sozinho com o código antigo. Depois, em **Config → Sincronização → Quem pode entrar**, você libera os e-mails dos funcionários.
- As notificações push e os scripts do GitHub Actions continuam funcionando (usam a conta de serviço, que ignora as regras).

## Passo a passo (nesta ordem)
1. **Firebase → Authentication → Sign-in method → Google → Ativar.**
2. **Authentication → Configurações → Domínios autorizados → Adicionar** o endereço do GitHub Pages (ex.: `seunome.github.io`).
3. Suba `app-core.js` e `index.html` pro GitHub. Abra o app (feche e abra de novo se não atualizar).
4. No seu celular: Config → Sincronização → **Entrar com Google**.
5. Libere o e-mail de cada funcionário e peça pra eles entrarem com Google.
6. **Só quando todos já estiverem entrando:** Firebase → Realtime Database → Regras → cole o conteúdo de `database.rules.json` → Publicar.

⚠️ Se publicar as regras antes do passo 5, os aparelhos que ainda usam só o código perdem o acesso.

## Atenção
- Use o e-mail exatamente como aparece na tela depois do login (a tela "e-mail ainda não liberado" mostra qual é).
- Remover um e-mail corta o acesso aos dados na nuvem, mas a cópia que já está no celular da pessoa continua lá.
- Se o pop-up do Google for bloqueado, o app tenta o login por redirecionamento automaticamente.
- Se o e-mail do dono for outro, troque `SYNC_DONO_EMAIL` no `app-core.js` e o e-mail nas regras.
