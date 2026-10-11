# MAXBALL 1.0.9 — bola controlável e DB

A saída do passe foi reduzida e o rolamento foi recalibrado entre a versão que parava cedo demais e a versão 1.0.8. A desaceleração continua gradual, com o mesmo integrador independente do FPS e a mesma previsão usada pelos bots.

| Parâmetro | 1.0.8 | 1.0.9 |
|---|---:|---:|
| Velocidade inicial do passe padrão | 280 | 250 |
| Faixa do passe direcionado | 220–320 | 200–290 |
| Velocidade de chegada usada na calibração do passe | 180 | 160 |
| Retenção de velocidade por segundo | 0,65 | 0,60 |
| Resistência adicional de rolamento | 8 | 9 |
| Janela do DB | 100 ms | 180 ms |
| Alcance adicional exclusivo do DB | 30 | 60 |

A velocidade do jogador continua em **150** e o chute mantém velocidade inicial **360**. O limite de velocidade da bola continua em 440. Os parâmetros estão centralizados em `src/core/config.js` e são compartilhados pelo jogo local e pelo servidor.

Em campo livre, o passe padrão percorre aproximadamente **395,57**, contra **530,25** anteriormente: redução de cerca de 25%. Um toque a velocidade 40 percorre **37,44**, entre os 30,10 da calibração antiga e os 43,34 da 1.0.8. O chute percorre aproximadamente 599,03 em vez de 705,72; a redução vem do atrito, preservando a potência inicial. São medições do MAXBALL, sem alegação de parâmetros originais do Mamoball.

## DB

A janela anterior de 100 ms era muito curta para executar passe e chute em sequência. A nova janela aceita um gesto de até 180 ms. O alcance acompanha a distância que um passe pode percorrer nesse intervalo, inclusive com atributo de passe elevado.

O alcance normal de passe/chute não foi ampliado. A continuação só vale para o próprio passe do jogador, uma única vez, com a bola à frente e saindo na direção do passe. Contato com outro jogador, trave ou parede cancela a combinação; a bola não é atraída nem reposicionada. A direção continua calculada pela posição física da bola em relação ao disco.

## Verificação

- Suíte completa: **322 testes aprovados, nenhuma falha**. A versão final dos testes ampliados de DB também passou separadamente (8 testes).
- Passe seguido de chute com intervalos de 1–10 ticks (aproximadamente 17–167 ms), em oito direções, parado e correndo.
- Passe longo com atributo máximo de passe, seguido de chute após 167 ms.
- Partida autoritativa com intervalos de 1, 8 e 10 ticks e teste de FPS 20, 30, 60, 120 e 144 com o chute após oito ticks.
- Expiração da janela, bola atrás, distância excessiva, uso único e cancelamento por colisões.
- Rolamento exato, desaceleração gradual e alcance reduzido; regressões de contatos, traves, bots e direção dos chutes.
- Navegador real: DB com dois dedos e teclado, com intervalo programado de 150 ms. O intervalo de toque medido foi 152 ms; houve um passe e um chute, sem erros JavaScript. Registros em [qa-1.0.9/db-browser.json](qa-1.0.9/db-browser.json).

A loja, os cosméticos e a grama foram preservados. Cliente e servidor devem ser atualizados juntos para o contrato `2026-10-11-control-17`. O APK de teste 1.0.9 mantém a configuração local de servidor das versões anteriores.
