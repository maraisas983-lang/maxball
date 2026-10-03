# MAXBALL — entrega da evolução

Data: 03/10/2026. A auditoria inicial está em [AUDITORIA_EVOLUCAO.md](AUDITORIA_EVOLUCAO.md).

## Comportamento entregue

| Área | Resultado |
| --- | --- |
| Ranqueada | Grupos de 1–4, líder, convite, prontidão, remoção, saída, reconexão e cancelamento do grupo inteiro. Formatos 1v1–4v4. Grupos do mesmo tamanho e formato entram juntos; bots completam vagas. |
| Elo | Média das equipes determina o resultado; cada integrante recebe seu delta, estatísticas e histórico uma vez. Outbox mantém os resultados até a sincronização. |
| Notas e MVP | Nota de 1–10 usa gols, assistências, passes, chances, defesas, recuperações, interceptações, desarmes, perdas e erros. MVP é a maior nota; empate usa ID estável. Notas aparecem no resultado local e online. |
| Saves | Até 12 carreiras por conta, com criação, seleção, renomeação e exclusão confirmada. Jogador, clube, elenco, calendário, dinheiro, progressão, histórico e conquistas pertencem ao save. A camisa global da conta permanece independente. |
| Clubes | Brasileirão Série A 2026 com 20 clubes e escudos locais; Mamoball com 21 equipes. Categorias separadas na criação de carreira. Clubes antigos permanecem disponíveis nos saves existentes. |
| Elencos | Seleção de cinco jogadores por clube para a adaptação 5v5, com reservas adicionais em cinco clubes. Fonte e data ficam nos dados. Goleiros ocupam o slot de goleiro; velocidade, aceleração, chute e passe usam parâmetros de balanceamento. |
| Treino | Entrada sem conta e sem matchmaking. Treino livre não tem cronômetro; opção com bots mantém a sessão configurada. |
| Salas | Equipes à esquerda, configuração à direita, regras recolhíveis e layout de celular. Notificações de presença preservam o formulário em edição. Bola padrão; campo segue o formato. |
| Regras | Contato físico não concede pênalti. Prorrogação e disputa de pênaltis por empate continuam. Intervalo e limite de gols continuam independentes. |
| Área 4v4 | Área ampliada, máximo de dois defensores próprios; o terceiro fica fora até liberar vaga. Estado vai no snapshot e a área ocupada fica amarela. |
| Colisões | Jogadores podem passar as linhas do campo, com margem externa. Postes e laterais/fundo da rede usam colisão ao longo do deslocamento. A bola permanece contida pelas regras físicas. |
| Cakto | Preços, ofertas, checkout, chave e ativação no Command Center. Entrega pelo webhook validado no servidor, duplicidade bloqueada e estorno com registro e saldo pendente. |
| Emotes | Compra com gemas, inventário e quatro slots. Uso visual durante a partida, com intervalo; não altera física ou estatísticas. |
| Chat | Lobby ou sala atual, histórico persistente, horário, mensagens do sistema, silenciamento, texto seguro e limite de envio. Dentro do jogo, T abre e Esc fecha; controles são zerados durante a escrita. |

## Campos usados pela simulação

| Formato | Dimensões |
| --- | --- |
| 1v1 | 760 × 440 |
| 2v2 | 1000 × 560 |
| 3v3 | 1240 × 680 |
| 4v4 | 1480 × 800 |
| Carreira 5v5 | 1600 × 860 |

O raio padrão da bola é 11. Configurações antigas de tamanho não mudam a bola das novas salas.

## Dados e balanceamento

Os elencos estão em `src/data/rosters2026.js`, separados da interface e da física. São seleções para o jogo 5v5, não listas completas de inscrição. A referência principal é a rodada de 19/09/2026, complementada pelas fontes dos clubes indicadas no arquivo. Transferências posteriores exigem atualizar os dados e sua data de verificação.

Os jogadores têm nota de catálogo 70 e atributos por posição, iguais entre clubes. São valores de jogo, não notas oficiais. A influência de velocidade, aceleração, chute e passe é limitada a 20% em torno da base. A nota pós-partida mede ações efetivamente registradas; é outro indicador.

As temporadas são a adaptação MAXBALL, com liga em turno único e copas próprias. Mamoball admite a rodada de folga por ter 21 clubes. Esses calendários não reproduzem as tabelas oficiais completas.

Fontes: [clubes 2026 da CBF](https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026), [escalações de setembro do ge](https://ge.globo.com/cartola/noticia/2026/09/19/cartola-2026-veja-suspensos-lesionados-e-escalacoes-provaveis-da-rodada-28-do-brasileirao.ghtml), [elenco oficial do São Paulo](https://www.saopaulofc.net/esporte/futebol-masculino-profissional/). As demais fontes específicas acompanham os dados.

## Validação

- Suíte automatizada: **89 testes passaram**, com zero falhas. Cobertura: contas, autenticação, consentimento, permissões, carreira, migração de saves existentes, economia, Cakto, chat, emotes, física, regras, IA, rede, grupos e SQL/RLS do Supabase.
- Teste com quatro clientes WebSocket: dois grupos de dois permaneceram juntos e os quatro receberam Elo e histórico uma vez. Formatos incompatíveis não se encontraram; saída cancelou a fila inteira.
- Navegador Edge: painel Cakto, seleção de 20/21 clubes, escudos, carreira e sala compacta em desktop e celular.
- Navegador com outro cliente WebSocket: chat dentro da partida, texto contendo HTML exibido como texto, emote equipado, T/Esc, bloqueio de comandos e resultado com MVP. Chat verificado em 1280×720 e 740×360.
- Medição isolada da simulação, após aquecimento, 600 passos por formato: p95 de 0,397 ms (1v1), 0,467 ms (2v2), 0,586 ms (3v3), 1,174 ms (4v4), 0,851 ms (5v5). Picos observados: 15,653; 16,640; 11,568; 22,688; 94,405 ms. A medição antecede o ajuste de atributos dos elencos e não mede GPU, rede ou o desempenho de celulares reais.

## Ativação externa

1. **Supabase:** o projeto conectado ainda usa a migração inicial. Execute `server/database/supabase/002_ranked_parties.sql` no SQL Editor. O arquivo é transacional e pode ser repetido. A API só libera fila em grupo quando a função de versão confirma essa migração; isso evita entregar Elo parcial pela função antiga. A fila individual continua compatível.
2. **Cakto:** siga [PAGAMENTOS_CAKTO.md](PAGAMENTOS_CAKTO.md) quando as ofertas estiverem prontas. Compras começam desligadas. O fluxo real de pagamento só pode ser verificado após cadastrar ofertas e webhook público.
3. **Hospedagem:** esta entrega prepara e testa o servidor local. Os dados SQLite e a configuração do painel precisam permanecer no disco persistente do servidor publicado.

## Balanceamento a observar nas partidas

- Frequência de recuperações e desarmes para evitar notas defensivas altas por contatos repetidos.
- Pesos de passes importantes, defesas e erros em partidas de durações diferentes.
- Distribuição de bots e espera de grupos do mesmo tamanho.
- Bloqueio de terceiro defensor nas bordas e sob colisões simultâneas.
- Atributos por posição e dificuldade da IA nas equipes reais.
- Ping, reconexão e picos de tempo em partidas simultâneas e celulares reais.

## Arquivos principais

### Núcleo da evolução já integrado

- `src/game/fieldConfig.js`, `src/game/field.js`, `src/game/rules.js`, `src/game/performance.js`.
- `src/physics/goalColliders.js`, `src/physics/playerPhysics.js`, `src/physics/movement.js`.
- `server/online/match.cjs`, `server/online/rooms.cjs`, `server/services/party.cjs`, `server/services/ranked.cjs`, `server/services/career.cjs`.
- Migrações SQLite `006_ranked_participants.sql`, `007_career_saves.sql`; Supabase `002_ranked_parties.sql`.

### Criados nesta conclusão

- `server/database/migrations/008_social_payments.sql`.
- `server/services/payments.cjs`, `server/services/social.cjs`.
- `src/data/emotes.js`, `src/data/rosters2026.js`, `src/ui/socialView.js`, `styles/social.css`.
- `assets/crests/br-0.png` a `br-19.png`, e `assets/crests/README.md`.
- `tests/social-payments-saves.test.cjs`, `tests/party-network.test.cjs`, `tests/career-migration.test.cjs`.
- `docs/PAGAMENTOS_CAKTO.md`, este relatório.

### Atualizados nesta conclusão

- `index.html`, `package.json`, `scripts/check-supabase.cjs`, `scripts/serve.cjs`.
- `server/app.cjs`, `server/database/index.cjs`, `server/database/supabase/002_ranked_parties.sql`.
- `server/online/match.cjs`, `server/online/rooms.cjs`.
- Serviços `admin.cjs`, `auth.cjs`, `career.cjs`, `economy.cjs`, `party.cjs`, `supabase.cjs`.
- `src/data/teams.js`, `src/legacy/game.js`, `src/physics/movement.js`, `src/physics/playerPhysics.js`.
- Telas `careerView.js`, `commandView.js`, `economyView.js`, `home.js`, `lobbyShell.js`, `modesView.js`, `onlineView.js`, `portal.js`, `rankedView.js`.
- Testes `portal.test.cjs`, `supabase.test.cjs`, `restructure.test.cjs`; `docs/CONFIGURACAO.md`.
