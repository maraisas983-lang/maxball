# Implementação

## Organização

| Área | Arquivos |
| --- | --- |
| Configuração e relógio | `src/core/config.js`, `runtime.js` |
| IA coletiva a 10 Hz | `src/ai/tactics.js` |
| Física e contatos | `src/physics/playerPhysics.js`, `contacts.js`, `ballPhysics.js` |
| Saída e rede | `src/game/kickoff.js`, `src/physics/netPhysics.js` |
| Torcida | `src/audio/crowd.js` |
| Renderização/modos originais | `src/legacy/game.js` |
| Conta e telas | `src/ui/*`, `src/services/apiClient.js` |
| Transporte/interpolação | `src/online/*` |
| HTTP/autorização | `server/app.cjs`, `server/services/auth.cjs`, `admin.cjs` |
| Partida/salas/Elo | `server/online/*`, `server/services/ranked.cjs` |
| Carreira/economia | `server/services/career.cjs`, `economy.cjs` |
| Supabase/sincronização | `server/services/supabase.cjs` |

Física compartilhada a 60 Hz, comandos validados no servidor, snapshots a 20 Hz. IA usa formação relativa à bola, pontuação, cobertura e tolerância ao trocar de perseguidor. A área é restringida por navegação dos bots, sem parede invisível para o humano.

Na dividida antiga, cada contato modificava o estado que o próximo contato usaria. O resolvedor novo calcula impulsos do mesmo estado e distribui correções simultâneas. Pressão equilibrada separa os corpos. Os dois impulsos aleatórios de destravamento foram removidos.

Gol exige a trajetória da bola inteira e não pode repetir. Rede usa malha de molas com impacto local, amortecimento, limites e repouso. Torcida usa movimentos/bandeiras sobre o estádio em cache e áudio sintetizado Web Audio, com aumento temporário por gol confirmado.

Pedidos da carreira duram quatro segundos e têm intervalo de um segundo. O companheiro se alinha e precisa alcançar a bola; o pedido não move a bola à distância.

## Migrations

- SQLite `001_initial.sql`: contas, sessões, perfil, economia, carreira, temporadas, partidas, prêmios, transferências e administração.
- SQLite `002_ranked.sql`: Elo, estatísticas, partidas/eventos e fila persistente de sincronização.
- SQLite `003_external_auth.sql`: tokens Supabase vinculados às sessões privadas.
- Supabase `001_ranked.sql`: perfis Auth, histórico/eventos, RLS, trigger e RPC.

SQLite aplica migrations automaticamente. O SQL Supabase é executado separadamente no projeto hospedado.

Uma instância Node é necessária. Salas e fila ficam em memória; resultados e economia em disco. Reinícios cancelam partidas em andamento sem mudar Elo. Sincronização Supabase é idempotente; falhas ficam em `cloud_outbox` para nova tentativa.

O artefato original permanece em `maxball-codigo-6 (1).txt`, SHA-256 `B7C2E5C7470D164DBCB0082C58D6A6268127D393329CB1C4DC2753C9B2D947FC`.

A auditoria em `AUDITORIA.md` é histórica: suas ausências descrevem a base antes das implementações. Estado de configuração e limites atuais: `CONFIGURACAO.md` e `VALIDACAO.md`.
