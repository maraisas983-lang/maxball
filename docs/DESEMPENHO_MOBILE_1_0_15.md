# Desempenho e interface mobile — 1.0.15

## Mudanças

- Comandos alterados podem sair a 60 Hz, antes limitados a 30 Hz. Comandos iguais continuam espaçados em 150 ms, evitando tráfego desnecessário. A verificação de congestionamento passa de 16 KB a 4 KB, enviando o estado atual quando a conexão volta a escoar.
- O ping é medido assim que a conexão abre. A previsão de movimento em espaço livre cobre até 200 ms, antes 120 ms, e conserva 500 ms de histórico de direção. A parada aguarda a confirmação do comando correto, respeitando o ping. Bola, chutes e colisões continuam autoritativos no servidor; a física não foi alterada.
- No automático, celulares começam na qualidade média, com limite de resolução de 1,5 vez o tamanho da tela. Em comparação com o antigo perfil alto de 2 vezes, isso representa 43,75% menos pixels no canvas. A adaptação avalia sobrecarga em janelas de 2 segundos, inclusive abaixo de 30 FPS. A seleção manual de qualidade continua disponível.
- Menus do lobby e das funções usam escala de 92% em dispositivos de toque, preservando a área total da tela e os controles da partida. Sombras de cartões foram removidas nesse modo.

## Verificação e limites

A bateria completa passou: 341 testes, nenhuma falha. A verificação de sintaxe aprovou 207 arquivos. O APK 1.0.15 (código 16) teve assinaturas v2/v3 e os 142 arquivos públicos conferidos contra as fontes.

`tests/mobile-latency.test.cjs` cobre envio de direção/passe/chute a 60 Hz, ping real simulado de 300 ms, previsão proporcional, contatos autoritativos, parada, congestionamento e adaptação gráfica. Os testes anteriores de desempenho também foram executados.

`scripts/qa-full-lobby.cjs` verifica os mesmos 11 tamanhos de tela da versão anterior, rotação, limites, sobreposição, tela cheia e acesso a treino/sala personalizada. Use `MAXBALL_QA_OUTPUT=docs/qa-1.0.15` para salvar as capturas desta versão.

`scripts/qa-mobile-performance.cjs` executa Chromium com toque, tela de 740 × 360, DPR 3 e atraso artificial de 150 ms em cada direção do WebSocket. O ping observado foi 320 ms; a qualidade iniciou em média com canvas de largura 1110. Não se trata de teste em aparelho físico, nem de prova de melhoria do FPS no celular. A medição completa está em [mobile-performance.json](qa-1.0.15/mobile-performance.json).

## Ping da hospedagem

O blueprint do projeto seleciona Ohio. Uma amostra HTTP desta máquina para `maxball.onrender.com/api/health` mediu 213–346 ms após a primeira conexão, que levou 1080 ms. Essa medição não equivale ao ping WebSocket do usuário e não identifica sozinha a causa dos 300 ms relatados.

Alterações no cliente reduzem espera adicional e melhoram a resposta visual, mas não eliminam o percurso da rede. O Render recomenda hospedar próximo dos usuários; sua lista atual de regiões não inclui o Brasil e a região de um serviço existente exige migração para outro serviço. Fonte: [documentação oficial de regiões](https://render.com/docs/regions). Nenhuma migração de servidor ou de dados foi realizada nesta atualização.
