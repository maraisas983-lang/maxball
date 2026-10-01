# Validação da primeira refatoração

Data: 01/10/2026. Ambiente: Windows, Node.js v24.19.0.

## Alterações entregues

- HTML, estilos e execução separados, mantendo scripts clássicos e abertura por arquivo.
- Jogo existente encapsulado em uma closure; estado legado deixa de ser exposto globalmente.
- Repository local com validação de tipos/limites, migração v2, backup do conteúdo anterior, preservação de itens válidos e tratamento de falhas de armazenamento.
- Perfil padrão completo persistido na inicialização; versões futuras não são sobrescritas.
- Nome da sala inserido com `textContent`.
- Inputs limpos em blur, página oculta, navegação e abertura/fechamento de configurações. Campos de formulário não alimentam o teclado do jogo.
- Documentação, comandos de execução/verificação e servidor estático limitado a localhost.

## Resultados

| Verificação | Resultado |
| --- | --- |
| `npm.cmd run check` | Sintaxe dos três scripts aprovada. |
| `node --check scripts/serve.cjs` | Sintaxe aprovada. |
| `npm.cmd test` | 27 testes aprovados, zero falhas. |
| Comparação de CSS e telas com o original | Conteúdo preservado. |
| Comparação de simulação nos modos bot/train/local | Mesmo estado de jogadores, bola, placar, tempo e rede após 360 passos com os mesmos inputs, dt e RNG. |
| Formatos de partida | 1v1 a 4v4, nos três tamanhos de campo, simulados com coordenadas finitas. |
| Fluxos adicionais | Gol central/recompensa/reinício, resultado, perfil, número, amigos, compra com saldo exato e tentativa sem saldo, vestiário e navegação exercitados. |
| Saves | Novos, v2, antigos, parciais, JSON inválido, versão futura, backup, falha de leitura/gravação e quota exercitados. |
| Input | Perda de foco, ocultação, troca de tela, configurações, campos de formulário e descarte de listeners exercitados. |
| Nome na sala | Inserção como texto confirmada inclusive com marcação adulterada em memória. |
| HTTP local | HTML/CSS/JS retornaram 200; documentos, referência original e tentativa de caminho externo retornaram 404; POST retornou 405. Servidor encerrado após o teste. |
| Referência original | SHA-256 permanece B7C2E5C7470D164DBCB0082C58D6A6268127D393329CB1C4DC2753C9B2D947FC. |

O harness também reproduziu a falha original de inicialização com controles parciais; o caso corrigido abre telas e inicia a partida.

## Limitações e pendências

Os testes executam JavaScript real com DOM, Canvas, timers e armazenamento simulados. A instrumentação de acesso ao estado existe somente no harness de teste. Não foram verificados pixels, áudio real, captura de ponteiro em hardware, uso de memória, FPS ou todos os timings assíncronos.

A ferramenta de navegador não encontrou instâncias disponíveis. A revisão visual e os testes em mobile físico permanecem pendentes. O tratamento visual de erro de storage também precisa dessa revisão.

Checklist manual antes de considerar a etapa visualmente aprovada:

- Abrir na origem habitual e conferir saldo, itens, nome, número e controles existentes.
- Percorrer menu, inventário, loja, perfil, amigos, sala, controles e vestiário.
- Jogar contra bots, treinar e testar dois jogadores no teclado.
- Verificar chute, passe, perda de foco, joystick, entrada no campo, gol, comemoração, fim e reinício.
- Conferir desktop, tablet e mobile landscape, além de retornar de portrait.
- Conferir console, áudio e persistência após recarregar.

Permanecem para as próximas etapas: timers associados à partida, física independente de FPS, gols/traves por trajetória, malha de rede, separação completa dos sistemas e backend. Moeda e inventário continuam exclusivamente offline. Não há autenticação, carreira, multiplayer nem administração implementados nesta entrega.
