# Imersão, regras e desempenho

## O que mudou

- Velocidade base de 130 unidades/s, mudança rápida de direção e parada real imediata ao soltar o controle.
- Círculo de interação com raio de 31,75–32,5 unidades. O desenho e o alcance real usam a mesma função.
- Grande área proporcional: profundidade de 10,5% da largura; em 4v4, 14%. Dois defensores podem entrar; o terceiro é bloqueado pela física.
- A saída de bola fica protegida até um contato ou comando válido da equipe responsável. Não expira por tempo.
- Bots mantêm cobertura, apoiam o avanço humano em faixas diferentes e antecipam a intenção de chute. O contato continua exigindo alcance real.
- Carreira com apresentação de 21,8 segundos: estádio, entrada, escalações, cerimônia do hino, cumprimentos, capitães, formação, arbitragem, bola e contagem. A cerimônia do hino é visual.
- Intervalo com saída e retorno, três formações de comemoração e encerramento com os vencedores celebrando. O replay continua após 1,6 segundo de comemoração, dentro da pausa de 6,2 segundos do gol.

## Técnicos e árbitro na sala personalizada

Antes de iniciar, o dono da sala usa **Mover** para atribuir **Técnico mandante**, **Técnico visitante** ou **Árbitro**. Há uma vaga para cada papel. Esses participantes ficam fora do elenco da física e não chutam nem colidem com a bola. O árbitro é um organizador da sala, sem personagem correndo dentro do campo. Antes de iniciar, ele pode mover jogadores entre times/espectadores e alterar regras, duração, dificuldade, formato e equipes. Somente o anfitrião pode atribuir ou trocar o posto de árbitro.

Os técnicos têm **Chat dos técnicos**, disponível no lobby e durante a partida. O servidor restringe leitura e envio aos dois técnicos; o histórico comum não recebe essas mensagens.

Somente o árbitro atribuído pode usar **Pausar partida** e **Retomar com 3, 2, 1**. Posição, física e relógio ficam congelados durante a pausa e a contagem. Comandos antigos são descartados. Se o árbitro sair enquanto a partida estiver pausada, começa uma retomada automática para evitar uma sala travada. Essas permissões não se aplicam à ranqueada.

## Causas e otimizações

O desenho da bola criava praticamente um canvas por quadro ao girar. Agora reaproveita um conjunto limitado de 96 canvases de 96×96 pixels, cerca de 3,4 MiB de pixels. Redes paradas usam imagens guardadas; redes em movimento mantêm sua animação. Nomes e números usam imagens reutilizadas, a torcida fora da câmera não é desenhada e o HUD reutiliza elementos.

A geometria do campo e as listas de participantes da sala ficam em cache. Os bots compartilham ameaças e reservas de posicionamento; decisões continuam espaçadas pela dificuldade. A previsão do cliente deixou de bloquear todos os jogadores quando a área estava cheia: verifica a entrada do jogador previsto. Estados pausados não são extrapolados.

No ensaio local com 240 desenhos de 5v5 e rotação contínua, os canvases novos passaram de 239 para 95; depois de preencher o conjunto, são reutilizados. O tempo mediano dos comandos de desenho passou de 8,1 ms para 4,7 ms; P95 de 16 para 12,4 ms. Houve um pico de 3,37 s sob pressão de memória do computador. Esses números medem o envio dos comandos de Canvas, não FPS da GPU nem latência da internet.

A física continua autoritária a 60 Hz, snapshots a 20 Hz e comandos até 30 Hz. Nenhum papel visual adiciona atores de colisão ou mensagens a cada quadro.

## Como testar

Abra **http://127.0.0.1:5173** após `npm start` e pressione **Ctrl+F5**.

1. Treino e local: teste parar, inverter direção, chutar junto às linhas e conferir o círculo pequeno.
2. Carreira: salve tempo/dificuldade, entre em campo e acompanhe cerimônia, intervalo, gol, replay e encerramento.
3. Sala personalizada: atribua técnicos e árbitro antes de iniciar. Use contas distintas para testar chat reservado e pausa.
4. Em 3v3, 4v4 e 5v5, mantenha dois defensores na área e tente entrar com um terceiro.
5. Na saída de bola, espere sem tocar: o adversário continua impedido de roubar até o primeiro toque válido.

A suíte cobre regras reais, permissões HTTP, chat isolado, congelamento da simulação, contagem, trajetória, colisões, rede e modos existentes. As cenas também foram examinadas no Edge com snapshots reais de partida. Testes locais não substituem testes entre aparelhos em uma conexão de internet.

Validação desta versão: **126 testes passaram**, sem falhas; sintaxe verificada em **104 arquivos**. No Edge, foram conferidas as cenas em computador/celular e uma sala real com seis postos, botão do árbitro, pausa do relógio e retomada via HTTP/WebSocket.

Carga WebSocket local: **16 conexões, 8 salas, 80 jogadores e 4 reconexões**, zero pacotes descartados. P95 de processamento: **9,93 ms**; pico: **34,02 ms**. O ensaio também confirmou matchmaking e persistência da desistência.

## Ajuste de peso e ritmo

Jogador: 165 → 130 unidades/s; chute: 460 → 320; passe: 340 → 250; limite da bola: 560 → 400. A massa relativa da bola passou de 1 para 1,8, com transferência gradual nos contatos e parte da correção aplicada ao jogador. Condução tem limite de 122 unidades/s e atrito maior; soltar o controle continua zerando a velocidade real do jogador.

O gol é reconhecido ao cruzar completamente a linha, antes de contatos posteriores com jogadores fora do campo. A rede amortece a bola e a mantém dentro do gol. Contatos junto à trave continuam sendo colisões válidas. O replay exibe autor e assistência; gols contra e jogadas sem assistência são indicados explicitamente.

Os bots calculam distâncias de passe e chute usando força, atributos e resistência ao rolamento. Foram verificados oito casos específicos dessa atualização, além da suíte existente: condução gradual, parada, chute/passe, retenção da bola nas redes, nomes e assistência, árbitro no lobby e decisão de avançar em vez de chutar de longe.
