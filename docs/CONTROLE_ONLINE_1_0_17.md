# Controle online, árbitros e saída — 1.0.17

## Analógico e correção de posição

Havia duas decisões que agravavam a resposta visual com ping alto: a previsão era desligada a 85 unidades da bola e a 90 de outros discos, e o renderizador alternava entre posições previstas e posições interpoladas atrasadas. Isso afetava inclusive aproximações sem contato.

O renderizador agora usa um único caminho de previsão para o jogador controlado durante o jogo. O alcance de contato usa os raios físicos, com pequenos passos e separação local que não aplica força à bola nem aos adversários. A direção atual pode produzir movimento antes do próximo pacote. Correções pequenas do servidor são reconciliadas gradualmente; pausas, apresentações, grandes deslocamentos e reinícios mantêm prioridade autoritativa. A bola e seus comandos continuam calculados pelo servidor.

As velocidades, o peso, o atrito, os chutes, os passes e o tamanho da bola não foram alterados.

## Árbitros dentro dos times

O anfitrião pode atribuir a função a um jogador de cada time. O jogador permanece no elenco e em campo; não há seção ou vaga separada de arbitragem, nem bot criado ao atribuir a função. O papel aparece no cartão do jogador e pode ser removido ou transferido para outro companheiro.

Os dois árbitros podem pausar/retomar e têm as permissões existentes para organizar a sala e fazer substituições autorizadas. O anfitrião escolhe as funções. Espectadores não podem receber esse papel enquanto estiverem fora dos times. Regras de ranqueadas e elencos oficiais continuam preservadas.

## Saída de participantes

A saída explícita remove o disco da simulação e transmite uma nova lista aos clientes, sem converter o jogador em IA. O histórico necessário para resultados permanece separado dos jogadores em campo. A saída para espectadores também deixa uma vaga, sem criar bot; um participante pode ocupar a vaga disponível. Se um time ficar vazio, a partida termina.

Bots que já ocupavam vagas antes da saída continuam existindo. Quedas temporárias de conexão conservam a janela anterior de reconexão de 20 segundos, com comandos removidos e sem troca por IA; ao expirar, o jogador é removido. O abandono ranqueado continua sujeito à derrota.

## Verificação

- 346 testes passaram; sintaxe aprovada em 212 arquivos.
- Testes de permissões, um árbitro por time, permanência em campo, saída sem bot, histórico e encerramento de time vazio.
- Testes de previsão perto da bola sem alterá-la e resposta à direção atual durante reconciliação.
- `scripts/qa-online-controls.cjs`: navegador Chromium com toque em 740 × 360 e atraso artificial de 150 ms em cada sentido do WebSocket. Após dois segundos de aquecimento da renderização, o primeiro movimento registrado ocorreu em cerca de 28 ms. O ping medido pelo protocolo foi 320 ms. Segurar para cima não apresentou recuos superiores a 0,8 unidade entre amostras. O teste também confirmou ausência da seção de árbitro, dois árbitros dentro dos times e propagação da saída aos clientes.
- [Traço de posições, velocidades e ping](qa-1.0.17/joystick-trace.json), com capturas na mesma pasta. Esses resultados não são uma medição de aparelho físico ou do ping real do usuário.
- APK 1.0.17, código 18: assinaturas v2/v3 verificadas e 142 arquivos públicos conferidos contra as fontes.

O ping real da rede/hospedagem continua pendente de investigação da infraestrutura. A compensação visual não reduz o tempo de transporte dos pacotes e não é apresentada como correção dos 300 ms reais relatados.
