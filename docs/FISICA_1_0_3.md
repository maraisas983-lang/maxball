# MAXBALL 1.0.3 — revisão da jogabilidade

A calibração usa a descrição fornecida pelo usuário. Não temos os parâmetros originais do Mamoball nem uma comparação instrumentada com ele; portanto, estes resultados não comprovam física idêntica.

## Causas encontradas e correções

O joystick e o teclado já usam Y positivo para baixo, coerente com o campo. Não foi encontrada uma inversão global de Y. Havia, porém, uma faixa de comando aceita para movimento que não atualizava a mira: a movimentação começava em 0,01, mas a direção só mudava acima de 0,08. Um pequeno movimento para cima podia conservar a mira anterior para baixo. Agora todo movimento aceito atualiza a mira antes de processar passe ou chute.

A proteção após o chute ignorava completamente a colisão com o próprio jogador. Isso permitia chutar uma bola atrás do disco através dele. Essa exceção foi removida. A ação exige contato próximo e uma região frontal de ±60 graus em relação à mira. Fora dela, o comando pode ficar no buffer por 0,12 segundo aguardando uma aproximação válida; não desloca nem atrai a bola. Parado, o jogador mantém a última mira válida. A velocidade anterior da bola não é somada ao chute ativo.

O contato de condução era processado no passo dos jogadores e novamente nos subpassos da bola. Agora a transferência suave do movimento ocorre uma vez por tick; os subpassos seguintes tratam novos impactos e separação, sem reaplicar essa aceleração. O contato continua circular, com transferência limitada, restituição baixa e resolução conjunta de disputas. O jogador que chutou permanece sólido, inclusive para um rebote imediato.

O rolamento usa a solução contínua de `dv/dt = -k*v - a`, onde `k = -ln(ballFriction)` e `a = ballRollingResistance`. Posição e velocidade são integradas juntas até o instante de parada. Isso elimina a diferença causada por aplicar atrito apenas depois do deslocamento e evita um corte artificial de velocidade. A previsão dos bots e a extrapolação visual usam o mesmo integrador e os mesmos obstáculos. Subpassos limitam o avanço a meio raio da bola, impedindo atravessar discos e traves em chutes rápidos.

## Calibração central

Os parâmetros ficam em [`src/core/config.js`](../src/core/config.js). O cliente local e o servidor importam o mesmo conjunto e os mesmos módulos de física.

| Parâmetro | Valor inicial |
| --- | ---: |
| Raio do disco, incluindo aro visível | 20 |
| Raio físico e visual da bola | 8,4 — 42% do disco |
| Velocidade do jogador | 180 unidades/s — 4,5 diâmetros/s |
| Passe manual | 170–340 unidades/s |
| Passe calculado para alvo pelos bots | 170–440 unidades/s |
| Chute | 680 unidades/s — 17 diâmetros/s |
| Limite de velocidade da bola | 816 unidades/s |
| Transferência máxima por condução | 170 unidades/s, limitada também pelo movimento do jogador |
| Retenção exponencial de velocidade por segundo | 0,65 |
| Resistência adicional ao rolamento | 12 unidades/s² |
| Tolerância de alcance da ação além do contato | 1 unidade, sem ampliar o colisor |
| Passo da simulação | 1/60 s |

O analógico pouco deslocado produz um passe curto; totalmente deslocado produz o passe normal. Sem direção nova, conserva a última mira e intensidade. No teclado, a direção tem intensidade máxima. Não havia carregamento de chute a preservar. Atributos já existentes de atletas continuam ajustando as intensidades dentro dos limites anteriores.

Em campo livre, sem colisões, o passe de 170 unidades/s percorre aproximadamente 133 unidades no primeiro segundo; o passe de 340 percorre 271, e o chute de 680 percorre 547. As distâncias totais de parada respectivas são 268, 622 e 1369 unidades. São medidas desta calibração, não do Mamoball.

## Aparência e celular

Os discos agora são planos, sem gradiente de relevo, reflexo ou sombra, inclusive no vestiário e nas substituições. O aro de seleção cabe no raio físico do disco. O sprite anterior ultrapassava esse raio. A bola preserva a esfera branca com painéis escuros, projeção superior e giro por deslocamento/raio, sem eixo vertical físico. A cor e o desenho da grama foram preservados.

Permanecem as correções da 1.0.2 para lobby horizontal em tela cheia, APK em paisagem, controles com tamanhos independentes e impacto de rede sem repetição de áudio no replay. A regra antiga que permitia chutar através do próprio disco foi substituída pela região frontal descrita acima.

## Verificação reproduzível

- `npm.cmd test`: suíte de regressão, incluindo modos, menus, multiplayer, bots, pênaltis e replay.
- `node --test tests/physics-rebuild.test.cjs`: direções, alcance frontal, passe curto/longo, condução lenta, disputas, traves, máxima velocidade, previsão e equivalência de teclado/joystick.
- `node tests/gameplay-calibration.cjs`: gera [`gameplay-calibration.json`](gameplay-calibration.json) com 576 registros de entrada, velocidade resultante e alinhamento. São 72 ângulos, dois comandos, duas intensidades analógicas e bola parada ou vindo no sentido contrário.
- O relatório também registra o mesmo cenário em renderização de 20, 30, 60, 90, 120 e 144 FPS, sempre com 240 passos físicos em quatro segundos e resultados iguais.

O teste em aparelho Android físico e a avaliação subjetiva lado a lado com o Mamoball ainda precisam ser feitos. O APK de teste contém os modos locais; o multiplayer exige um servidor HTTPS atualizado com esta versão. O contrato de compatibilidade foi atualizado para detectar servidor antigo.

Resultado desta revisão: **291 testes aprovados, zero falhas**, além da verificação de sintaxe de 190 arquivos. O navegador com toque passou nas seis resoluções de lobby (568×320, 640×360, 740×360, 844×390, 915×412 e 1280×720), sem botões sobrepostos ou erros JavaScript. Também foram exercitados chute e passe durante movimento com dois dedos, liberação independente de cada dedo, ajustes separados dos três controles e entrada/saída de sala. Os testes de FPS verificam consistência da simulação sob diferentes cadências de renderização; não são uma medição de desempenho em celulares físicos.

APK 1.0.3, código de versão 4: assinaturas v2/v3 verificadas, Android mínimo 8.0 e orientação de paisagem. Os 142 arquivos públicos presentes no repositório foram comparados byte a byte com o conteúdo empacotado. Download e SHA-256 em [`apk/README.md`](../apk/README.md).
