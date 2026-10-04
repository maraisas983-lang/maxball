# Configuração

## Testar esta versão

Abra **http://127.0.0.1:5173** neste computador e pressione **Ctrl+F5** após atualizar.
Se necessário, execute `npm.cmd start` na pasta do projeto. **Jogar → Treino/Local**
funciona sem conta; os demais modos pedem login e aceite dos documentos.

As migrações SQLite até `008_social_payments.sql` rodam automaticamente no início.
Preserve o banco local: ele contém carreira, economia, suporte e auditoria.
No Supabase, depois do `001_ranked.sql` já executado, abra SQL Editor → New query,
cole o arquivo completo `server/database/supabase/002_ranked_parties.sql` e clique
Run. Esse novo arquivo pode ser executado novamente. Ele habilita os resultados
e as permissões de todos os participantes de grupos ranqueados.

O Command Center aceita OWNER, ADMIN, MODERATOR e SUPPORT conforme suas capacidades.
SUPER_ADMIN permanece compatível. `npm.cmd run admin -- usuário_ou_uuid` cria o
primeiro OWNER a partir de uma conta existente; depois, entre novamente.

Veja o [relatório e roteiro de testes](REESTRUTURACAO_2026.md).

## Configuração da Cakto pelo painel

Abra **Jogar → Command Center → Pagamentos** com uma conta ADMIN ou OWNER.
Preços, IDs de ofertas, links de checkout e chave do webhook são definidos nessa
tela. As compras permanecem desligadas até a configuração completa.
Veja [o passo a passo da Cakto](PAGAMENTOS_CAKTO.md).

## Testar a evolução de gameplay

- **Ranqueada:** criar grupo, convidar pelo código ou usuário e marcar todos como
  prontos; o líder escolhe 1v1, 2v2, 3v3 ou 4v4 e busca um grupo do mesmo tamanho.
- **Carreira:** escolher Brasileirão 2026 ou Mamoball; usar “Trocar carreira / saves”
  para criar e carregar carreiras independentes.
- **Salas:** equipes à esquerda, configuração à direita; a bola tem tamanho padrão.
- **Chat:** durante uma partida, pressionar T ou tocar “Chat / emotes”; Esc fecha.
  Emotes comprados na loja são equipados em quatro slots no inventário.
- **4v4:** a área fica amarela quando dois defensores ocupam a própria área;
  o terceiro fica do lado de fora até uma vaga liberar.

Detalhes da entrega e limitações: [EVOLUCAO_2026.md](EVOLUCAO_2026.md).

## Supabase

1. Crie um projeto com Auth por e-mail/senha.
2. Execute **uma vez** `server/database/supabase/001_ranked.sql` no SQL Editor.
3. Configure `.env` no servidor:

```dotenv
AUTH_PROVIDER=supabase
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
SUPABASE_SECRET_KEY=SUA_CHAVE_SECRETA
ADMIN_EMAILS=admin1@exemplo.com,admin2@exemplo.com
```

4. Configure Site URL e URLs de confirmação em Authentication. Confirme o e-mail antes de entrar se o projeto exigir.
5. Reinicie Node e entre com duas contas distintas. O formulário passa a pedir e-mail.
   Os e-mails em `ADMIN_EMAILS` recebem o papel ADMIN ao entrar ou renovar a sessão,
   desde que o Supabase confirme a verificação do e-mail. A lista fica no servidor;
   nomes de jogador e metadados de cadastro não concedem acesso administrativo.
   O Command Center fica disponível em Jogar para essas contas. Remover um e-mail
   dessa lista impede novas promoções, mas não revoga o papel já concedido; use o
   painel administrativo para revogar o acesso.
6. Após uma partida, confira `profiles`, `ranked_matches` e `ranked_events`. Sincronização a cada 5 segundos; falhas geram `cloud_sync_failed`, mantendo os resultados para nova tentativa e bloqueando novas entradas ranqueadas.

Execute `npm.cmd run check:supabase` para verificar Auth, JWKS, tabelas/colunas e a presença da função de resultado. O diagnóstico é somente leitura e não imprime chaves nem dados de usuários. Se somente os participantes ou a versão de grupos estiverem ausentes, execute **apenas `002_ranked_parties.sql`**. Não repita `001_ranked.sql` quando ele já foi aplicado: suas políticas e trigger iniciais não permitem repetição indiscriminada. Depois repita o diagnóstico.

As novas chaves `sb_publishable_` e `sb_secret_` são enviadas no cabeçalho `apikey`. Tokens JWT de usuário usam `Authorization`. Os nomes antigos `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` continuam aceitos para instalações existentes. O endpoint JWKS é derivado da URL do projeto; não é necessário cadastrá-lo no `.env`. O login atual confirma a identidade diretamente na API Auth.

A service role fica exclusivamente no servidor. O navegador recebe cookie opaco; tokens Supabase ficam em `external_sessions`, no SQLite privado. A sessão dura até uma hora; o botão de renovar deve ser usado antes de expirar. Contas locais não são convertidas automaticamente.

RLS permite ler o próprio perfil e partidas de que participou. O usuário pode editar o próprio nome, mas não Elo, estatísticas ou resultados. A RPC restrita ao serviço recalcula Elo, confere ratings anteriores, bloqueia as linhas e grava uma única vez por partida.

Execute uma instância Node com SQLite persistente. Não use réplicas com bancos independentes nem apague o banco após conectar Supabase: carreira, compras, inventário e sessões dependem dele. Trocar de provedor de contas exige planejar a migração das identidades.

## Publicação

- Node 24.19.x, `npm ci --omit=dev`.
- `HOST=0.0.0.0`, `PORT`, `DATABASE_PATH` em volume persistente.
- `PUBLIC_ORIGIN=https://seu-dominio`, `NODE_ENV=production`.
- Proxy HTTPS com suporte ao WebSocket `/ws`; a origem deve coincidir exatamente com a página.
- Supervisor de processos com uma instância, backup consistente do SQLite e teste de restauração. Para cópia simples, encerre o servidor e copie o banco e arquivos associados.
- Configure contato do operador e retenção dos dados antes de abrir cadastros.

`npm.cmd run migrate` aplica migrations sem iniciar partidas. `npm.cmd run admin -- usuário_ou_uuid` promove a primeira conta administrativa existente. Não há senha padrão.

Estas instruções não publicam um serviço automaticamente. A configuração local do Supabase não configura a hospedagem ou o domínio público do jogo.

Se o login mostrar “Unexpected end of JSON input” ou indicar que o endereço só exibe arquivos, confira a URL: o Live Server na porta 5500 não executa a API. Inicie `npm.cmd start` e abra `http://127.0.0.1:5173`, conforme o endereço anunciado. O Supabase usa e-mail no login. Senhas já existentes podem ter menos de 12 caracteres; novos cadastros exigem pelo menos 12. Se aparecer confirmação pendente, abra o link do e-mail de confirmação antes de entrar.

Referências: [Auth](https://supabase.com/docs/reference/javascript/auth-getuser), [renovação](https://supabase.com/docs/reference/javascript/auth-refreshsession), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [scrypt/OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [PGlite usado nos testes SQL](https://pglite.dev/docs/api).
