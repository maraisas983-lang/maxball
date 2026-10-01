# Configuração

## Supabase

1. Crie um projeto com Auth por e-mail/senha.
2. Execute **uma vez** `server/database/supabase/001_ranked.sql` no SQL Editor.
3. Configure `.env` no servidor:

```dotenv
AUTH_PROVIDER=supabase
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
SUPABASE_SECRET_KEY=SUA_CHAVE_SECRETA
```

4. Configure Site URL e URLs de confirmação em Authentication. Confirme o e-mail antes de entrar se o projeto exigir.
5. Reinicie Node e entre com duas contas distintas. O formulário passa a pedir e-mail.
6. Após uma partida, confira `profiles`, `ranked_matches` e `ranked_events`. Sincronização a cada 5 segundos; falhas geram `cloud_sync_failed`, mantendo os resultados para nova tentativa e bloqueando novas entradas ranqueadas.

Execute `npm.cmd run check:supabase` para verificar Auth, JWKS, tabelas/colunas e a presença da função de resultado. O diagnóstico é somente leitura e não imprime chaves nem dados de usuários. Se indicar tabela/função ausente, abra SQL Editor → New query, cole o conteúdo completo de `server/database/supabase/001_ranked.sql` e clique Run. Depois repita o diagnóstico.

As novas chaves `sb_publishable_` e `sb_secret_` são enviadas no cabeçalho `apikey`. Tokens JWT de usuário usam `Authorization`. Os nomes antigos `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` continuam aceitos para instalações existentes. O endpoint JWKS é derivado da URL do projeto; não é necessário cadastrá-lo no `.env`. O login atual confirma a identidade diretamente na API Auth.

A service role fica exclusivamente no servidor. O navegador recebe cookie opaco; tokens Supabase ficam em `external_sessions`, no SQLite privado. A sessão dura até uma hora; o botão de renovar deve ser usado antes de expirar. Contas locais não são convertidas automaticamente.

RLS permite ler o próprio perfil e partidas de que participou. O usuário pode editar o próprio nome, mas não Elo, estatísticas ou resultados. A RPC restrita ao serviço recalcula Elo, confere ratings anteriores, bloqueia as linhas e grava uma única vez por partida.

Execute uma instância Node com SQLite persistente. Não use réplicas com bancos independentes nem apague o banco após conectar Supabase: carreira, compras, inventário e sessões dependem dele. Trocar de provedor de contas exige planejar a migração das identidades.

## Publicação

- Node 24.14+, `npm ci --omit=dev`.
- `HOST=0.0.0.0`, `PORT`, `DATABASE_PATH` em volume persistente.
- `PUBLIC_ORIGIN=https://seu-dominio`, `NODE_ENV=production`.
- Proxy HTTPS com suporte ao WebSocket `/ws`; a origem deve coincidir exatamente com a página.
- Supervisor de processos com uma instância, backup consistente do SQLite e teste de restauração. Para cópia simples, encerre o servidor e copie o banco e arquivos associados.
- Configure contato do operador e retenção dos dados antes de abrir cadastros.

`npm.cmd run migrate` aplica migrations sem iniciar partidas. `npm.cmd run admin -- usuário_ou_uuid` promove a primeira conta administrativa existente. Não há senha padrão.

Estas instruções não publicam um serviço automaticamente. A configuração local do Supabase não configura a hospedagem ou o domínio público do jogo.

Referências: [Auth](https://supabase.com/docs/reference/javascript/auth-getuser), [renovação](https://supabase.com/docs/reference/javascript/auth-refreshsession), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [scrypt/OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [PGlite usado nos testes SQL](https://pglite.dev/docs/api).
