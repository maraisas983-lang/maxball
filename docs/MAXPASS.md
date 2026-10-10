# MaxPass

O MaxPass tem 50 níveis, uma trilha gratuita e uma Plus. Os dados ficam no banco do servidor, compartilhados entre sessões e dispositivos conectados ao mesmo serviço. Cosméticos não alteram a física, a velocidade ou os atributos.

## Temporadas e progressão

- Temporadas de 56 dias. A primeira começa em 01/10/2026 às 00:00 UTC e termina em 26/11/2026 às 00:00 UTC. O calendário continua automaticamente, com temas alternados.
- O jogador começa com zero níveis completados. O nível 1 exige 600 XP; cada etapa seguinte acrescenta 100 ao custo. São 152.500 XP para completar o nível 50.
- XP de perfil e XP do MaxPass são independentes.
- A nova temporada começa com progresso zerado e Plus independente. Itens adquiridos, títulos, molduras e histórico permanecem. Recompensas alcançadas em temporadas anteriores continuam resgatáveis pelo endpoint com `seasonId`.
- O catálogo de uma temporada é congelado no banco quando ela é criada. Alterar o catálogo do código não muda o passe que já está em andamento.

O calendário, os preços iniciais, objetivos, custos e recompensas são declarados em `src/data/maxpass.js`. Os tipos de recompensa são `GEMS`, `ITEM`, `PROFILE_XP`, `TITLE` e `FRAME`. Novos temas e combinações podem ser adicionados no catálogo; novas categorias precisam de um manipulador explícito em `deliver()` e uma prévia na interface. O banco também aceita custos e catálogos próprios por temporada.

## XP validado no servidor

Somente `rooms.persistResult()` concede XP, na mesma transação que conclui a partida. Não existe uma rota para enviar XP ou nível pelo cliente.

São elegíveis partidas online, salas, campeonatos e carreira executadas pelo servidor. Treino e partidas locais não enviam resultados confiáveis ao servidor e não concedem XP do passe.

A partida precisa estar `COMPLETED`, terminar por tempo, limite de gols, gol de ouro ou pênaltis, ter pelo menos 60 segundos de simulação e 45 segundos reais. Desistências, cancelamentos, W.O., abandono e reinício do servidor não concedem XP. O jogador precisa participar ativamente por pelo menos 20 segundos e 20% da duração. Pausas, apresentações, intervalo, substituições e comandos antigos não contam como atividade.

XP por partida elegível:

| Origem | XP |
| --- | --- |
| Partida concluída | 180 |
| Vitória | 80 |
| Desempenho | Nota oficial × 10, até 100 |
| MVP | 100 |
| Sequência em até uma hora | 10 por partida adicional, até 40 |
| 3 partidas no dia | 400, uma vez |
| 1 vitória no dia | 250, uma vez |
| 15 partidas na semana | 1.800, uma vez |
| 10 gols ou assistências na semana | 1.200, uma vez |

Os períodos diários e semanais usam UTC; a semana começa na segunda-feira. Há limite de 25 partidas com XP por dia e intervalo mínimo de um minuto entre resultados elegíveis. Estatísticas e bônus são limitados pelo servidor. Essas medidas reduzem abuso; não constituem detecção de macros ou de conluio entre contas.

## Recompensas e preservação

A trilha contém gemas, uniformes, emotes, bolas, rastros, comemorações, XP de perfil, títulos e molduras. O Plus tem uma bola exclusiva por tema e o título Lenda da temporada no nível 50. Títulos e molduras podem ser equipados pelo inventário e aparecem no perfil.

Ao comprar Plus, todas as recompensas premium dos níveis já completados são entregues imediatamente. Os próximos níveis ficam disponíveis para resgate individual ou em lote. Um item já possuído gera 1 gema na trilha gratuita ou 3 no Plus, uma única vez. Resgates repetidos não duplicam itens, XP de perfil ou gemas.

O antigo passe Mini/MAX continua disponível no backend para compatibilidade. Na primeira temporada do MaxPass, o acesso MAX já comprado é reconhecido gratuitamente e o progresso existente é convertido, até 20 níveis. Inventários anteriores são preservados. A interface principal usa o novo MaxPass.

## Compra com gemas e compra em reais

O Plus custa **600 gemas ou R$19,90** nesta temporada. A compra com gemas é transacional, valida dívida/saldo e cobra somente uma vez. O resgate retroativo faz parte dessa mesma transação.

A compra em reais usa a Cakto. Ela não é ativada pelo clique no botão ou por um retorno do navegador. A ativação depende do webhook autenticado, com status pago, oferta correta, valor exato, e-mail confirmado e checkout associado à conta e temporada.

Para liberar o pagamento real:

1. Cadastre na Cakto uma oferta de R$19,90 exclusiva da temporada.
2. Em **Command Center → Pagamentos → MaxPass Plus · oferta da temporada**, informe ID e URL HTTPS da oferta e ative a compra.
3. Configure na Cakto o webhook `PUBLIC_ORIGIN/api/payments/cakto/webhook`, usando a chave gerada em Pagamentos.
4. O comprador precisa entrar com uma conta de e-mail confirmado.

A oferta não pode compartilhar seu identificador com pacotes de gemas ou com outra temporada. A chave do webhook é compartilhada com o serviço de pagamentos existente e nunca é devolvida ao jogador. Sem oferta e chave configuradas, a opção em reais permanece indisponível; não existe simulação de compra aprovada.

Confirmações atrasadas concedem acesso à temporada do checkout original. Pedidos repetidos não entregam novamente as recompensas. Reembolso/chargeback revoga o acesso daquele pedido e as recompensas premium entregues, preserva itens que já eram possuídos, remove títulos/molduras equipados e reverte gemas; saldo gasto vira dívida no sistema existente. O histórico mantém os resgates revogados. Uma compra posterior válida pode restaurar as recompensas, com uma nova geração idempotente.

## Rotas

| Rota | Finalidade |
| --- | --- |
| `GET /api/maxpass` | Temporada, progresso, objetivos, recompensas, histórico e saldo |
| `GET /api/maxpass?season=maxpass-1` | Consulta histórica |
| `POST /api/maxpass/plus` | Compra com gemas; `{seasonId}` |
| `POST /api/maxpass/claim` | `{seasonId,track:"Free" ou "Plus",level}` ou `{seasonId,all:true}` |
| `POST /api/maxpass/checkout` | Checkout real; `{seasonId}` |
| `GET /api/maxpass/cosmetics` | Títulos e molduras adquiridos |
| `POST /api/maxpass/cosmetics/equip` | `{kind:"TITLE" ou "FRAME",id}`; `id:null` remove |
| `GET/PATCH /api/command/maxpass/payment` | Configuração da oferta, restrita ao e-mail confirmado maraisas983@gmail.com |

Todas as rotas do jogador exigem sessão; mutações exigem origem permitida e CSRF. Campos adicionais como XP, nível, preço ou saldo são rejeitados. Chaves únicas no banco e transações protegem partidas, compras, objetivos, pedidos e resgates contra repetição.

## Interface e execução

A tela exibe duas recompensas por nível, estados recebido/disponível/bloqueado, contagem de resgates, XP, objetivos e contador baseado no relógio do servidor. O resumo da partida mostra XP ganho, detalhamento dos bônus e níveis antes/depois. A notificação não abre um modal. As animações respeitam redução de movimento.

A migração `013_maxpass.sql` é aplicada ao iniciar o servidor. Reinicie um servidor antigo e recarregue a página para usar o contrato `2026-10-08-android-commerce-7`.

Verificações automatizadas estão em `tests/maxpass.test.cjs`, `tests/maxpass-runtime.test.cjs` e `tests/maxpass-ui.test.cjs`: catálogo, progressão real, atividade, fraude, objetivos, limites, idempotência, saldo, retroatividade, histórico, pagamento, reembolso, CSRF e interface. Os testes de interface usam DOM em memória; eles não substituem inspeção visual em um Android real nem uma transação financeira real na Cakto.

Validação desta entrega: suíte completa com 236 testes aprovados; mais 2 testes adicionais de integração/atividade aprovados. Os 17 testes específicos do MaxPass foram repetidos após os ajustes finais e passaram. O servidor local em `127.0.0.1:5173` respondeu com o novo contrato de API.
