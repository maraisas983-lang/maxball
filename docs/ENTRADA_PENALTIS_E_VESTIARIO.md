# Entrada, pênaltis e vestiário

Atualização de 5 de outubro de 2026.

## Entrada e cutscenes

- Cada equipe entra em uma fila. Os jogadores mantêm a ordem vertical da formação para não cruzarem trajetórias ao assumir suas posições.
- A câmera abre o enquadramento durante a cerimônia para mostrar as duas equipes.
- A apresentação comum dura 17,7 segundos; carreira e Final mantêm suas sequências próprias.
- Substituições calculam caminhos ao redor dos jogadores parados. Os demais abrem espaço se necessário. A comemoração e o intervalo também preservam a separação dos corpos.

## Pênaltis

O placar superior mostra o nome dos times, o total convertido e cada cobrança:

- Verde com ✓: gol.
- Vermelho com ×: defesa ou chute para fora.
- Contorno dourado: cobrança atual.
- Círculo neutro: cobrança pendente.

Nas alternadas, a faixa avança mantendo cinco cobranças visíveis por equipe. A numeração continua na sexta, sétima e seguintes. O servidor registra os resultados; a interface não deduz acertos pelo placar agregado. A indicação também funciona sem distinguir as cores.

## Vestiário e modos

O vestiário usa as cores e o escudo do clube, armários com uniformes, bancos e iluminação. Há posições de chegada separadas e colisão entre jogadores do mesmo ambiente. A movimentação local e a do servidor compartilham as mesmas regras de bancos e limites.

Amistosos e Final recebem painéis próprios de preparação, com etapas e regras resumidas. O elenco do amistoso mostra quatro vagas e a prontidão de cada integrante.

## Bots e desempenho

- Previsão de posições futuras da bola em três instantes, incluindo paredes, para selecionar um ponto de interceptação alcançável.
- Escolha do centro ou canto do gol conforme os defensores e o alcance real do chute.
- Saída lateral consistente quando um bot permanece bloqueado, preservando um perseguidor principal por equipe.
- Decisões online continuam no worker separado da física do servidor.
- O cenário do vestiário é desenhado uma vez e reutilizado. O campo coberto pelo vestiário deixa de ser renderizado.
- Após um atraso do servidor, a rede envia o estado mais recente; não serializa uma sequência de quadros antigos durante a recuperação da simulação.
- O placar dos pênaltis só é reconstruído quando os dados visíveis mudam.

## Verificação

`npm.cmd test` inclui entrada em 45 combinações de modo, formato e escala de campo, separação em comemorações, caminhos de substituição, vestiário, histórico de pênaltis, acessibilidade do placar e recuperação de bots bloqueados. A suíte também verifica partidas completas, física, rede, autenticação e os modos existentes.

O teste visual usa Edge com contas e banco de dados isolados. A latência real do Render e de dispositivos móveis depende também da rede e do equipamento; a validação local não mede esses ambientes.
