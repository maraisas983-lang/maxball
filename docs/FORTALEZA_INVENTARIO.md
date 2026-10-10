# Inventário técnico — Operação Fortaleza

Gerado do código local em 09/10/2026. Não representa inspeção do ambiente publicado.

## HTTP

Fonte: `server/app.cjs`. As rotas de autenticação, configuração, health, preview e webhook possuem tratamentos públicos específicos; as demais passam por sessão. Escritas autenticadas passam por origem, CSRF, limites e reautenticação após leitura. A lista inclui prefixos dinâmicos; os verbos e permissões específicos estão nos handlers.

- `/api/admin`
- `/api/admin/users`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/refresh`
- `/api/auth/register`
- `/api/career`
- `/api/career/play`
- `/api/career/saves`
- `/api/career/season`
- `/api/career/settings`
- `/api/championships`
- `/api/chat`
- `/api/chat/mute`
- `/api/clubs`
- `/api/clubs/directory`
- `/api/collections`
- `/api/collections/open`
- `/api/command`
- `/api/command/championships`
- `/api/command/collections`
- `/api/command/execute`
- `/api/command/maxpass/payment`
- `/api/command/payments`
- `/api/command/payments/rotate`
- `/api/command/settings`
- `/api/command/tickets`
- `/api/config`
- `/api/emotes`
- `/api/emotes/use`
- `/api/friendlies`
- `/api/friendlies/accept`
- `/api/friendlies/cancel`
- `/api/friendlies/search`
- `/api/gems`
- `/api/gems/checkout`
- `/api/health`
- `/api/inventory`
- `/api/inventory/equip`
- `/api/leaderboard`
- `/api/matches`
- `/api/matchmaking`
- `/api/maxpass`
- `/api/maxpass/checkout`
- `/api/maxpass/claim`
- `/api/maxpass/cosmetics`
- `/api/maxpass/cosmetics/equip`
- `/api/maxpass/plus`
- `/api/maxpass/preview`
- `/api/party`
- `/api/party/`
- `/api/party/players`
- `/api/pass`
- `/api/pass/claim`
- `/api/pass/max`
- `/api/payments/cakto/webhook`
- `/api/profile`
- `/api/ranked`
- `/api/ranked/cancel`
- `/api/ranked/join`
- `/api/room-invites`
- `/api/room-invites/accept`
- `/api/rooms`
- `/api/rooms/leave`
- `/api/shop`
- `/api/shop/purchase`
- `/api/skins`
- `/api/support`
- `/api/teams`
- `/api/wallet`

### Padrões dinâmicos

- Linha 78: `/^\/api\/(support|command\/tickets)\/([\w-]+)$/`
- Linha 96: `/^\/api\/profiles\/([\w-]+)$/`
- Linha 108: `/^\/api\/clubs\/([\w-]+)$/`
- Linha 115: `/^\/api\/admin\/users\/([\w-]+)$/`
- Linha 134: `/^\/api\/rooms\/([\w-]+)\/(cancel|customize|card|invite|move)$/`
- Linha 139: `/^\/api\/skins\/([\w-]+)$/`
- Linha 142: `/^\/api\/command\/championships\/([\w-]+)\/rounds$/`
- Linha 143: `/^\/api\/championship-fixtures\/([\w-]+)\/(propose|respond|checkin)$/`
- Linha 144: `/^\/api\/command\/championship-fixtures\/([\w-]+)\/reopen$/`
- Linha 145: `/^\/api\/command\/championships\/([\w-]+)(?:\/(status))?$/`
- Linha 147: `/^\/api\/command\/championship-entries\/([\w-]+)$/`
- Linha 148: `/^\/api\/championships\/([\w-]+)\/enter$/`
- Linha 149: `/^\/api\/championship-entries\/([\w-]+)\/withdraw$/`
- Linha 150: `/^\/api\/clubs\/([\w-]+)(?:\/(join|leave|members))?$/`
- Linha 151: `/^\/api\/rooms\/([\w-]+)\/referee$/`
- Linha 155: `/^\/api\/(support|command\/tickets)\/([\w-]+)$/`
- Linha 171: `/^\/api\/career\/saves\/([\w-]+)(?:\/(select))?$/`
- Linha 176: `/^\/api\/career\/offers\/([\w-]+)$/`
- Linha 178: `/^\/api\/rooms\/([\w-]+)$/`
- Linha 179: `/^\/api\/rooms\/([\w-]+)\/pause$/`
- Linha 180: `/^\/api\/rooms\/([\w-]+)\/substitute$/`
- Linha 181: `/^\/api\/rooms\/([\w-]+)\/substitutions$/`
- Linha 182: `/^\/api\/rooms\/([\w-]+)\/locker\/skin$/`
- Linha 183: `/^\/api\/rooms\/([\w-]+)\/locker$/`
- Linha 201: `/^\/api\/rooms\/([\w-]+)\/(join|start)$/`
- Linha 202: `/^\/api\/admin\/users\/([\w-]+)$/`

## WebSocket

`/ws`: cookie autenticado, origem exata, limites por conta/IP e capacidade global. Entrada JSON: `ping(sentAt)`, `subscribe`, `lockerInput(x,y)`, `input(seq,x,y,shoot,pass,shootSeq?,passSeq?,requestPass?,requestShot?)`. Binários e comandos desconhecidos são rejeitados. `input` usa a identidade da conexão e a associação de sala; coordenadas, gols e saldos não são aceitos. Sessões são reavaliadas a cada segundo. Saída: connected, room, snapshot/delta, event, result, pong, locker, chat, emote, party, roomInvite, card, matchCancelled e championshipClosed.

## SQLite

- `accolades`
- `active_career`
- `admin_audit`
- `bans`
- `career_seasons`
- `careers`
- `championship_checkins`
- `championship_entries`
- `championship_fixtures`
- `championship_players`
- `championship_rounds`
- `championships`
- `chat_messages`
- `chat_mutes`
- `cloud_outbox`
- `club_members`
- `clubs`
- `collection_settings`
- `competitions`
- `custom_clubs`
- `custom_skins`
- `emote_slots`
- `external_sessions`
- `gem_debts`
- `gem_orders`
- `gem_transactions`
- `inventory`
- `legal_consents`
- `matches`
- `maxpass_checkouts`
- `maxpass_claims`
- `maxpass_cosmetics`
- `maxpass_matches`
- `maxpass_objectives`
- `maxpass_orders`
- `maxpass_progress`
- `maxpass_seasons`
- `operations_log`
- `pack_openings`
- `pass_claims`
- `payment_offers`
- `payment_settings`
- `pending_legal_consents`
- `profiles`
- `purchases`
- `ranked_events`
- `ranked_matches`
- `ranked_participants`
- `ranked_progress`
- `schema_migrations`
- `season_passes`
- `server_settings`
- `sessions`
- `shop_items`
- `support_messages`
- `support_tickets`
- `transfer_history`
- `transfer_offers`
- `users`
- `verified_emails`
- `wallets`

Relações e constraints: `server/database/migrations/001_initial.sql` a `014_payment_offers.sql`. SQLite privado ao processo Node, sem API direta de tabelas. Transações síncronas BEGIN IMMEDIATE; índices e consultas parametrizadas.

## Supabase opcional

Auth: signup, token/password, token/refresh_token, user e logout. REST profiles: leitura e atualização por service key no backend. RPCs: record_ranked_match e maxball_ranked_version. Tabelas públicas: profiles, ranked_matches, ranked_events, ranked_participants. RLS e privilégios definidos em `server/database/supabase/001_ranked.sql` e `002_ranked_parties.sql`. Não foram encontradas integrações de Storage/Edge Functions no repositório.

## Pagamentos

Cakto: checkout HTTPS externo e POST `/api/payments/cakto/webhook`. Eventos aceitos: purchase_approved, refund, chargeback. Segredo compartilhado comparado em tempo constante; catálogo, valor, estado, conta confirmada, idempotência e estornos tratados no servidor. Nenhum dado de cartão é coletado pelo código examinado.
