# MAXBALL 1.0.2 — celular e jogabilidade

O lobby usa a tela inteira em paisagem, inclusive em aparelhos com largura inferior a 760 pixels. O APK mantém a orientação horizontal, permite ocupar a área do recorte da tela e restaura o modo imersivo quando recupera o foco. Conteúdos longos de salas continuam com rolagem interna.

## Bola, passe e chute

- Chute e passe manuais seguem a direção do analógico ou teclado. Parado, o jogador conserva a última direção escolhida. A movimentação do personagem não mudou.
- A ação considera o alcance no início do movimento do mesmo passo da simulação: virar ou começar a se afastar não descarta um toque que já estava em alcance.
- A velocidade lateral anterior da bola não desvia o passe. O próprio jogador não bloqueia a saída do seu chute; a proteção termina na separação, no contato com outro jogador ou no limite de tempo. Adversários e rebotes continuam colidindo.
- Rolamento com resistência contínua, sem a mudança brusca de amortecimento em baixa velocidade. O contato com outro jogador devolve parte da velocidade, com perda de energia.
- A bola usa projeção vista de cima, sombra discreta e rotação pelo deslocamento. Correções de sobreposição não acrescentam giro artificial.
- Traves resolvem contato pela superfície circular. Uma bola que já entrou não é teleportada para o campo por uma parede retangular invisível.

## Controles e áudio

Em **Controles**, os tamanhos de **Analógico**, **Chute** e **Passe** têm ajustes independentes de 60% a 200%, com posição arrastável. Os três ajustes também aparecem nas configurações durante a partida. As teclas do PC ficam recolhidas no celular e os controles são mantidos dentro da tela. O chat foi retirado da área de toque do analógico.

O modo fixo usa o centro real do analógico. Os dedos de movimento e ação permanecem independentes, inclusive se um botão for reposicionado na metade esquerda.

A rede mantém a informação de que a bola está dentro quando termina de se mover. Isso impede repetir o som de impacto. O efeito de rede é mais baixo e tem entrada suave; o replay não repete sons de chute ou rede.

## Verificação

Os testes em `tests/mobile-ball-regression.test.cjs` reproduziram os problemas de direção, chute durante a virada, parede na entrada do gol, impacto repetido de rede e desaceleração brusca antes das correções. A suíte também verifica persistência independente dos tamanhos e colisões após a saída do chute.

Conferência visual em navegador com tela de toque: 568×320, 640×360, 740×360, 844×390, 915×412 e 1280×720. A verificação de APK inclui compilação, assinatura e comparação dos arquivos públicos empacotados. Teste em aparelho Android físico ainda necessário para confirmar a sensação dos controles e o comportamento do recorte de cada aparelho.

O APK de teste contém os modos locais. Partidas online usam a mesma física no servidor e exigem atualizar também o serviço hospedado; enviar o código ao GitHub não comprova que esse serviço já foi atualizado.

Resultado automatizado: a execução geral teve 282 testes, com 279 aprovados e três falhas. Após corrigir a previsão de passe dos bots e atualizar a referência da nova aparência da bola, os 34 testes relacionados passaram. Os quatro testes de Supabase passaram isoladamente, incluindo o que havia falhado por falta de memória. O teste visual passou nas seis resoluções e verificou chute e passe com dois dedos, liberação independente dos dedos, tamanhos independentes, sala e ausência de erros JavaScript.
