# MAXBALL — relatório e roteiro de testes (02/10/2026)

## 1. Auditoria e medida inicial

O servidor mantém física a 60 Hz e publica estados a 20 Hz. O banco grava resultados,
não posições por quadro. A renderização remota usa um buffer fixo de 100 ms.

Medida local nesta máquina, 360 passos, partidas 4v4, duas serializações por sala:

| Salas | p50 do passo | p95 do passo |
| --- | --- | --- |
| 1 | 0,13 ms | 0,70 ms |
| 5 | 0,35 ms | 2,29 ms |
| 10 | 0,58 ms | 3,91 ms |

Um estado após decisões dos bots tinha 6.964 bytes: aproximadamente 139 KB/s por
cliente a 20 Hz, sem contar transporte. Incluía alvos e notas internas da IA.
Cinco cálculos síncronos de senha de sala custaram entre 66 e 89 ms cada: bloqueiam
o mesmo processo que executa a física. Partidas encerradas continuavam publicando
estados até expirar. Esses custos foram medidos localmente; não medem a latência
da conexão do usuário nem provam uma causa única para todo atraso observado.

## 2. Arquivos e arquitetura

- Rede: `server/online/rooms.cjs`, `match.cjs`, `src/online/*`, ponte em `src/legacy/game.js`.
- Formatos e IA: `match.cjs`, `tactics.js`, `kickoff.js`, configurações e carreira.
- Modos e navegação: `index.html`, `src/ui/*`, estilos e ponte local.
- Consentimento, suporte e operações: migrações SQLite, serviços, rotas HTTP e interface.
- Segurança: permissões fechadas por capacidade, CSRF existente, sessões e auditoria.

Novos módulos: `src/online/{protocol,prediction}.js`, `src/physics/movement.js`,
`server/services/operations.cjs`, `src/data/legal.js`,
`src/ui/{modesView,supportView,commandView,debugView,resultsView}.js`,
`styles/command.css`, `tests/restructure.test.cjs` e os dois scripts de medição da rede.

## 3. Funcionalidades

- Jogar abre os modos. Treino e Local funcionam sem conta, com campo, formato,
  dificuldade, bola e equipes. A navegação deixa de oferecer “Sala Offline”.
- Salas 1v1–5v5: anfitrião edita formato, campo, bola, duração, dificuldade, limite
  de gols, intervalo e regras antes do início.
- Carreira exclusivamente 5v5, preservando calendário, objetivos e progressão.
- Ranqueada com busca iniciada pelo jogador, espera e resultado com Elo antes/depois.
- Apresentação de seis segundos: equipes, entrada no campo e contagem. Resultados
  persistem na tela com gols, assistências, chutes, passes, XP e progressão do modo.
- Aceite obrigatório, suporte com histórico e Command Center.

## 4. Causas de atraso identificadas

O estado antigo incluía detalhes internos da IA, era serializado por cliente e
continuava sendo transmitido depois do encerramento. O cálculo síncrono de senha
bloqueava o processo da física. O buffer fixo acrescentava atraso à apresentação
do jogador controlado. Essas são causas locais medidas; não foi medida a internet
do usuário nem demonstrada uma causa única para toda falha de conexão.

## 5. Correções e novas medições

Senhas de sala usam cálculo assíncrono, limitado a quatro operações ativas. Há uma
serialização por sala, metadados no estado inicial e quadros compactos depois.
Dados internos dos bots saíram da rede. O servidor para de transmitir quadros
contínuos de partidas encerradas e usa cache limitado de comandos SQL preparados.
Entradas repetidas são agrupadas, mantendo heartbeat. Física 60 Hz e rede 20 Hz.

Medição de simulação e codificação, 5v5, 600 passos:

| Salas | Jogadores simulados | p50 | p95 |
| --- | --- | --- | --- |
| 1 | 10 | 0,24 ms | 1,67 ms |
| 5 | 50 | 0,74 ms | 3,93 ms |
| 10 | 100 | 1,01 ms | 4,32 ms |
| 25 | 250 | 2,31 ms | 6,68 ms |

O estado interno dessa amostra tinha 9.607 bytes; o quadro de rede, aproximadamente
1.004 bytes, redução de 90% e cerca de 20 KB/s por cliente antes dos cabeçalhos.
A comparação de tamanho usa o mesmo estado 5v5. A auditoria inicial era 4v4:
os tempos antigos e novos não constituem um comparativo direto entre implementações.

## 6. Banco de dados

`005_operations.sql` é aplicada automaticamente no SQLite ao iniciar. Adiciona
papéis administrativos, aceites com `terms_version`, `privacy_version`, `accepted_at`,
chamados, respostas, logs e configurações. Aceites pendentes de confirmação do e-mail
usam hash do identificador, expiram após noventa dias e são vinculados no login.
Não é necessário repetir o SQL inicial do ranqueado no Supabase.

O banco local deve permanecer em armazenamento persistente. Salas continuam em
memória; reiniciar o servidor encerra partidas em andamento.

## 7. Backend

Rotas autenticadas de suporte e operações: `/api/support`, `/api/support/:id`,
`/api/command`, `/api/command/tickets`, `/api/command/tickets/:id`,
`/api/command/settings` e `/api/command/execute`.

Chamados têm categoria, assunto, descrição, prioridade, responsável e respostas.
Estados: Aberto, Em análise, Aguardando usuário, Resolvido e Encerrado. Um jogador
lê apenas seus chamados. Moderadores podem atender denúncias; suporte atende chamados.
Manutenção bloqueia novas partidas; desativar a ranqueada pausa o pareamento.
Comandos usam uma lista explícita e nunca executam comandos do sistema operacional.

## 8. Frontend

Modos têm telas próprias. Equipes compartilham catálogo, cores, uniformes e escudos
originais gerados por iniciais; clubes da carreira usam o mesmo adaptador visual.
Command Center tem barra lateral, busca, gráfico de processamento, métricas,
atendimento, moderação, logs e configurações. A atualização ao vivo troca métricas
e gráfico, sem reconstruir toda a página. Alertas indicam chamados urgentes e
limiares de erros, processamento e espera na fila.

## 9. Rede

Quadros possuem tick e timestamp. O decodificador rejeita quadros antigos; o buffer
tem até vinte estados e atraso adaptativo entre 70 e 150 ms, com tratamento de
mudanças de fase e teletransportes. O jogador controlado tem previsão conservadora
de até 120 ms em espaço livre, corrigida pelos estados autoritativos. Bola, contatos
e proximidade das traves continuam sob autoridade do servidor.

Estados: CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED, MATCHMAKING, IN_MATCH.
Mantida a tolerância de vinte segundos para reconectar. Fila de saída excessiva
provoca reconexão para recuperar um estado completo. Descartes de quadros não são
apresentados como uma porcentagem de perda de pacotes da internet.

## 10. IA e regras

O 5v5 distribui atacante, apoio, meia, defensor e goleiro. Profundidade e apoio
variam com bola, posse, pressão, placar e tempo. Decisões incluem finalização, passe,
condução, drible, proteção, interceptação, marcação e cobertura. Dificuldade altera
intervalo de decisão, precisão e antecipação. Pedidos de passe e chute continuam ativos.

Impedimento, prorrogação e disputa de pênaltis continuam no servidor. A falta para
pênalti é uma regra arcade: contato rápido na área contra um adversário próximo à
bola, sem contato imediato do defensor com a bola, com intervalo entre marcações.
Não é uma implementação completa da arbitragem do futebol profissional.
O limite de gols encerra após a comemoração; o intervalo pausa cinco segundos e
muda a equipe da saída, sem trocar os lados do campo.

## 11. Segurança

- Login/cadastro exigem checkbox e versões exatas também na API.
- Origem, CSRF, sessões e permissões são verificados no servidor. Papel desconhecido
  é recusado; foi corrigido o teste de hierarquia que aceitava papéis não reconhecidos.
- OWNER, ADMIN, MODERATOR e SUPPORT têm capacidades distintas. SUPER_ADMIN permanece
  como alias compatível. Suporte não pode banir ou executar comandos.
- Moderação tem confirmação visual; comandos destrutivos exigem confirmação no payload.
- Logs de acesso, salas, partidas, atendimento e ações administrativas preservam autoria
  e horário. Mudanças críticas têm antes/depois. Senhas e tokens não entram nos logs.
- Detalhes de sessões mostram datas, sem tokens. F3 abre diagnóstico para administradores;
  dados operacionais também exigem permissão na API.

## 12. Testes

- `npm test`: **76 testes aprovados** na execução completa.
- SQL real via PGlite, RLS e gravação idempotente do ranqueado aprovados.
- O runner limita a compilação WebAssembly. Esta máquina tem 4 GB e a compilação
  otimizada do PGlite esgotou memória em tentativas anteriores. Essas opções de teste
  não alteram a execução do servidor do jogo.
- `scripts/network-stress.cjs`: 16 WebSockets autenticados, oito salas, 80 jogadores,
  quatro reconexões e matchmaking com persistência de desistência.
- Amostra do stress: zero descartes, ping médio local de 5 ms, p95 de processamento
  de 10,02 ms e pico de 29,07 ms. Não é uma medida de internet ou garantia de capacidade.
- Edge real: treino 5v5 sem login, documentos e aceite, chamado, páginas administrativas,
  comando permitido, sala 5v5, apresentação, diagnóstico e resultado; desktop e
  740 × 360, sem erros JavaScript na execução registrada.

## 13. Testar e limites

1. Abra **http://127.0.0.1:5173** neste computador e pressione **Ctrl+F5**.
2. Use **Jogar → Treino** ou **Local** para experimentar sem conta.
3. Carreira, Sala personalizada, Ranqueada e Suporte pedem login e aceite.
4. Para ranqueada, use duas contas diferentes em janelas com sessões separadas.
5. Administradores acessam Command Center e podem usar F3 durante o jogo.

Se o servidor estiver fechado, execute `npm.cmd start`. Live Server na porta 5500
não executa a API. O endereço local atende este computador; um link público depende
de hospedagem com Node, WebSocket, HTTPS e banco persistente.

Evidências são links no texto do chamado, sem upload de arquivo. Substituições
manuais, clima e silenciamento de chat não são oferecidos porque esses sistemas
não existem nesta base. Os ensaios locais não substituem testes com usuários em
redes externas para avaliar latência e capacidade da hospedagem.
