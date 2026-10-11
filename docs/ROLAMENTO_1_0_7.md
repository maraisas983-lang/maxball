# MAXBALL 1.0.7 — rolamento mais fluido

A bola perdia velocidade rapidamente, sobretudo na parte final do rolamento. O ajuste atua somente na desaceleração: retenção de velocidade por segundo de **0,55 para 0,65** e resistência adicional de **12 para 8 unidades/s²**, centralizadas em `src/core/config.js`.

O integrador continua sendo a solução exata de `dv/dt = -drag*v - resistência`, com `drag = -log(retenção)`. A bola perde velocidade continuamente e chega a zero sem corte abrupto. A previsão dos bots e o cálculo de tempo dos passes usam esse mesmo modelo.

| Movimento livre | Antes | Agora |
|---|---:|---:|
| Toque a 40: distância até parar | 30,10 | 43,34 |
| Toque a 40: tempo até parar | 1,83 s | 2,67 s |
| Passe a 280: velocidade após 1 s | 144,97 | 175,50 |
| Passe a 280: distância até parar | 377,55 | 530,25 |
| Passe a 280: tempo até parar | 4,52 s | 6,45 s |
| Chute a 360: distância até parar | 503,43 | 705,72 |

Valores medidos sem jogadores ou paredes no caminho. O jogador continua a 150, passe manual a 280, chute nominal a 360 e janela de DB em 100 ms. Os passes calculados para alvos continuam usando o atrito atualizado para estimar o impulso necessário. As colisões, controles e visual permanecem na arquitetura da versão anterior.

`tests/physics-rebuild.test.cjs` verifica a retenção maior em toques, passes e chutes, desaceleração monotônica, parada eventual, distância de um toque fraco e consistência entre intervalos de integração. O teste de alcance foi atualizado para o novo rolamento: o passe continua abaixo do chute e o chute livre continua abaixo da largura do menor campo.

Também foram executadas as regressões de contatos por massa, vetores de direção, condução, DB, arbitragem, bots, traves, rede do gol e controles mobile. A validação do APK e os resultados estão em `docs/qa-1.0.7/validation.json`. Não houve teste em aparelho Android físico nesta revisão.
