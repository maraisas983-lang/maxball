# MAXBALL 1.0.6 — velocidade e DB

O jogador estava rápido demais e o passe seguido de chute era bloqueado pelo cooldown compartilhado de 180 ms. Quando os dois botões chegavam no mesmo passo, o chute tinha prioridade e apagava o passe pendente.

## Alterações

- Velocidade máxima do jogador: **180 → 150 unidades/s**, redução de 16,7%. Bots: **158/170/180 → 132/142/150**, conforme dificuldade. Aceleração, inversão de direção e parada continuam responsivas.
- **DB: passe seguido de chute em até 100 ms.** O chute pode completar o próprio passe durante esse intervalo, apesar do cooldown comum. Os comandos recebidos juntos executam passe e depois chute, preservando as duas ações.
- A continuidade do DB acompanha exclusivamente a bola recém-passada pelo mesmo jogador. Há um alcance adicional de 30 unidades para essa sequência curta, necessário porque a bola já se afasta entre os comandos. Isso não aumenta a hitbox de colisão nem o alcance dos chutes normais.
- O DB é consumido após um chute. Expiração, troca da bola, contato com outro jogador, parede ou trave invalidam a continuidade. A bola precisa continuar à frente e se afastando na direção do passe.
- Segurar os botões não repete a combinação. A velocidade máxima da bola continua em 440; a potência do passe continua em 280 e a do chute em 360, com a contribuição anterior limitada já existente.
- O servidor online usa a mesma regra. Os contadores de pressionamento preservam comandos rápidos mesmo quando chegam no mesmo pacote. O contrato de compatibilidade foi atualizado para `2026-10-11-db-14`.

## Arquivos principais

- `src/core/config.js`: velocidade, bots, janela e alcance do DB.
- `src/physics/playerPhysics.js`: estado temporário do DB por jogador, consumo e ordem das ações.
- `src/physics/ballPhysics.js` e `src/physics/contacts.js`: identificação de impactos para cancelar sequências interrompidas.
- `tests/db-combo.test.cjs`: movimento, DB em oito direções, parado/correndo, atrasos de 1–5 passos, comandos simultâneos, expiração, bloqueio após impactos, servidor e consistência entre FPS.
- `scripts/qa-db-browser.cjs`: botões por toque real no navegador e teclas G/F, verificando um passe e um chute por combinação.
- `android/app/build.gradle`: versão 1.0.6, código 7.

## Verificação

Os cenários físicos verificam a sequência em intervalos de aproximadamente 17, 33, 50, 67 e 83 ms, além dos comandos no mesmo passo. A comparação entre renderizações de 20, 30, 60, 120 e 144 FPS exige posições e velocidades idênticas. Os testes de movimento verificam a velocidade de 150 também nas diagonais.

As medições anteriores de 1.0.5 permanecem como histórico daquela versão. O teste de passe em corrida foi ajustado para comparar seu espaço livre com o deslocamento esperado na nova velocidade do jogador. O APK e a validação desta versão estão em `apk/MAXBALL-1.0.6.apk` e `docs/qa-1.0.6/`.

O teste no navegador confirmou **um passe e um chute** tanto por dois botões de toque quanto pelas teclas G/F. Nos dois casos a bola seguiu a direção esperada, com componente lateral zero. As velocidades registradas após a execução foram 374,57 (toque) e 383,66 (teclado); a diferença corresponde ao tempo decorrido até a amostragem, durante o rolamento. Dados: [db-browser.json](qa-1.0.6/db-browser.json). Captura: [DB no layout mobile](qa-1.0.6/db-mobile.png).

A suíte completa executou 311 testes: 309 aprovados e duas expectativas antigas a atualizar em `responsive-gameplay.test.cjs`. O teste de alcance normal iniciava com passe e, portanto, armava o novo DB; passou a começar com chute para verificar o alcance comum. O teste de canto exigia um chute ou passe em 10 segundos mesmo quando a bola já havia saído por condução; passou a verificar saída efetiva, toque de um jogador válido e velocidade limitada. Após esses ajustes, todos os 16 testes desse arquivo passaram. Não houve alteração de produção depois dessa execução. A verificação de sintaxe cobriu 196 arquivos.

O APK foi compilado com assinaturas v2/v3 verificadas, versão 1.0.6/código 7. Os 142 arquivos públicos empacotados foram comparados byte a byte com os assets gerados e os arquivos correspondentes do projeto.

O teste de toque ocorre em navegador com viewport mobile. Ainda não houve validação desta versão em aparelho Android físico nem comparação lado a lado com vídeos do MamoBall.
