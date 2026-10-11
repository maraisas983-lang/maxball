# MAXBALL 1.0.5 — massa, contatos e passe em corrida

Esta revisão implementa uma física própria. Os nomes de classes fornecidos pelo usuário serviram como referência de organização, não como fonte de fórmulas ou números do MamoBall. Não havia vídeos acessíveis neste pedido; a comparação foi feita por cenários reproduzíveis, sem alegar equivalência com o jogo original.

## Problemas encontrados

- O passe manual saía a **190 unidades/s**, enquanto o jogador chega a **180**. Sem qualquer colisão, esse passe já cai para aproximadamente 136 unidades/s em meio segundo: o corredor rapidamente alcança a própria bola.
- O contato passivo misturava restituição, aceleração artificial por `contactResponse`, limite de condução e divisão do impulso pelo número de jogadores. A massa não produzia uma reação oposta na velocidade do disco.
- Um limite aplicado depois das colisões escondia parte dessa composição de forças. Os testes antigos exigiam um jogador imóvel mesmo após receber uma bola e um teto artificial de condução de 135.
- O chute já usava a normal entre os centros na versão 1.0.4. Nesta revisão foi mantida essa regra: o analógico movimenta o disco; o posicionamento relativo determina o contato. Não há correção da bola pela direção do joystick.

## Implementação

`src/physics/contacts.js` substitui a resposta anterior por impulsos entre dois corpos:

```
n = normalize(posição_bola - posição_jogador)
vn = (velocidade_bola - velocidade_jogador) · n
j = -(1 + restituição) * vn / (1/massa_bola + 1/massa_jogador)
velocidade_bola += j * n / massa_bola
velocidade_jogador -= j * n / massa_jogador
```

Essa expressão vale para uma colisão isolada em aproximação. Contatos simultâneos usam restrições acumuladas não negativas, com atualização simultânea e relaxação por quantidade de contatos. A restituição é calculada uma vez a partir da velocidade inicial. Cada iteração refina o impulso existente; não executa outro chute. A ordenação por identificação torna os resultados independentes da ordem do elenco.

A correção de sobreposição é separada das velocidades, ponderada pelas massas e limitada pelas paredes. Ela não injeta energia cinética. Em baixa velocidade, a restituição é desativada para evitar tremulação durante a condução. O contato circular não aplica uma força tangencial artificial: uma raspada preserva essa componente. Foram removidos `contactResponse` e `contactMaxPushSpeed`, além do corte de velocidade que mascarava os impulsos passivos.

`src/physics/ballPhysics.js` concentra o impulso ativo de chute/passe (`kickBall`), a integração exata do rolamento, os substeps para bola rápida, paredes, traves e previsão usada pelos bots. A ação ativa é uma fonte externa e controlada de energia; não se confunde com conservação de energia de uma colisão passiva. Retém contribuições limitadas do movimento anterior da bola.

`src/physics/playerPhysics.js` mantém os estados de pressionamento, buffer, alcance e cooldown. Cada pressionamento humano executa no máximo uma ação. A arbitragem evita dois chutes simultâneos na mesma bola. O módulo delega o impulso ativo à física da bola.

O passo fixo de 60 Hz continua compartilhado entre jogo local e servidor. Os substeps resolvem somente aproximações efetivas; um contato que já se separa não recebe um segundo impulso. O cliente online continua predizendo apenas movimento livre do jogador: bola e colisões são autoritativas. O contrato de compatibilidade foi atualizado para `2026-10-11-mass-13`.

O movimento do jogador mantém a resposta de aceleração e parada já existente. A diferença é que colisões agora podem reduzir sua velocidade, em vez de tratá-lo como um corpo de massa infinita. Não foram alterados modos, contas, inventário, câmera ou gramado.

## Calibração centralizada

Todos os valores estão em `src/core/config.js`. Unidades de comprimento correspondem às coordenadas do campo; não são metros ou parâmetros recuperados do MamoBall.

| Parâmetro | Valor |
|---|---:|
| Raio do disco / bola | 20 / 8,4 |
| Proporção de diâmetros | 42% |
| Massa disco / bola | 3 / 1,8 |
| Velocidade máxima do jogador | 180 |
| Resposta de aceleração / inversão | 36 / 48 por segundo |
| Passe manual | **280** |
| Passe com alvo: mínimo / máximo | **220 / 320** |
| Termo de chegada do passe com alvo | 180 |
| Chute nominal / limite da bola | 360 / 440 |
| Retenção da velocidade por segundo | 0,55 |
| Resistência adicional de rolamento | 12 unidades/s² |
| Restituição contato / parede / trave | 0,12 / 0,45 / 0,32 |
| Limiar de restituição do contato | 24 unidades/s |
| Tolerância de penetração | 0,0001 |
| Limites de iterações: velocidade / posição | 48 / 32 |
| Cooldown individual / global / buffer | 0,18 / 0,08 / 0,12 s |
| Alcance adicional da ação | 1 unidade |
| Retenção normal / tangencial do chute | 10% / 20% |
| Limite tangencial do chute | 15% da força nominal |

Em corrida máxima, o passe abre **32,65 unidades de espaço livre** em 0,5 s, com a bola ainda a **202,47 unidades/s**. Os alcances livres até parar são aproximadamente 285 (passe mínimo), 378 (manual), 440 (passe máximo) e 503 (chute). Os passes continuam abaixo do chute; a grama e o atrito não foram modificados para disfarçar a falta de força.

## Visual

A esfera conserva projeção leve no canvas, orientação acumulada por deslocamento/raio, pentágonos, iluminação e sombra. Esses dados não entram nos impulsos. Correções de sobreposição parada não geram rotação. O acabamento restaurado dos discos foi preservado, com pulsação visual de até 3,5% durante o cooldown de uma ação. O efeito respeita a preferência de efeitos e não altera o raio físico.

## Validação e reprodução

- `tests/mass-contact.test.cjs`: 288 impactos frontais, diagonais, de raspão e de interceptação; verifica a solução analítica por massas, conservação de momento, ausência de ganho de energia e ausência de impulsos repetidos. Inclui dividida simétrica, independência do joystick após o contato, passe em corrida e passes curtos/longos.
- `tests/gameplay-calibration.cjs`: 576 vetores de chute/passe e resultados idênticos com renderização a 20, 30, 60, 90, 120 e 144 FPS.
- Os testes anteriores de contato foram atualizados para verificar massas e velocidade relativa, substituindo expectativas da resposta cinemática removida. Continuam verificando não atravessamento, sobreposição, traves, gols, parada, condução, bots e uma ação por pressionamento.
- `scripts/qa-contact-browser.cjs`: navegador real, dois toques simultâneos no analógico e botão, comparação de sprites e sequência de rotação. Evidências em `docs/qa-1.0.5/`.
- `scripts/qa-mobile-layout.cjs`: lobby em seis resoluções horizontais, controles sem sobreposição, ajustes individuais, sala online, toque simultâneo e alternativa para tela vertical.

A execução completa encontrou 303 testes aprovados em 304. O único caso restante exigia a antiga reflexão contra jogador de massa infinita; após atualizar a expectativa para separação relativa e reação do jogador, os sete testes desse arquivo passaram. Não houve falha restante conhecida. `npm run check` verificou a sintaxe de 194 arquivos.

O navegador confirmou os 22 sprites preservados e executou chute/passe enquanto o analógico apontava para cima e a bola estava à direita: ambas as ações saíram para a direita, pela geometria do contato. Também passaram os layouts 568×320, 640×360, 740×360, 844×390, 915×412 e 1280×720, os ajustes independentes dos botões, a sala online e o retorno para tela vertical, sem erros de execução.

Capturas: [lobby pequeno](qa-1.0.5/mobile-home-568.png), [partida](qa-1.0.5/mobile-game.png), [rotação em oito direções](qa-1.0.5/ball-directions.png), [acabamento dos discos](qa-1.0.5/player-comparison.png). Os vetores de toque estão em [browser-results.json](qa-1.0.5/browser-results.json).

Relatórios: `mass-calibration-1.0.5.json` e `contact-calibration-1.0.5.json`. Para reproduzir: `npm test`, `npm run check`, `node tests/mass-contact.test.cjs --report`, `node tests/gameplay-calibration.cjs` e o script de navegador (requer Playwright local).

## Limites

O motor usa passo fixo e separação iterativa discreta dos discos, com substeps para a bola; não é um solver contínuo geral de corpos rígidos. Não há comparação lado a lado com vídeos nem validação em um telefone físico nesta revisão. O teste mobile é por emulação de viewport e toque em navegador. O APK é de teste, com modos locais; serviços online exigem compilação configurada para um servidor HTTPS publicado.
