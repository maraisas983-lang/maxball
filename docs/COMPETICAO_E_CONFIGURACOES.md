# Competição, configurações e apresentação

Atualização de 4 de outubro de 2026.

O carregamento abre antes do lobby. Faça login nessa tela ou escolha treinar sem
conta. A autenticação usa o provedor configurado no servidor, inclusive e-mail do
Supabase. Depois de entrar, a engrenagem do lobby abre as configurações.

## Preferências

- Música do lobby e sons/torcida podem ser desligados separadamente.
- Gráficos: baixo, médio e alto. A resolução do canvas acompanha a seleção.
- Limite de renderização: 30, 60, 90 ou 120 FPS, conforme a capacidade da tela.
  A simulação continua com passo fixo; mudar FPS não acelera a partida.
- Efeitos podem ser desligados, incluindo partículas, rastros e tremor.
- “Personalizar controles” abre o editor dos botões e das teclas de chute/passe.

As preferências ficam salvas no navegador. A qualidade escolhida não altera a
física nem as decisões do servidor.

## Gemas, troféus e patentes

Contas novas começam sem gemas. Saldos e cosméticos já existentes são preservados.
Partidas locais, carreira, salas, amistosos e Final não geram gemas. Compras reais
continuam pela Cakto, configurada no painel administrativo.

Uma ranqueada concluída com participação conta para a recompensa: a cada duas,
o jogador ganha 5 gemas. O MVP humano elegível recebe mais 10 gemas. Abandono e
vitória por desistência não contam para essas recompensas. O resultado oficial
define o MVP; o cliente não informa recompensas. A gravação e o crédito são feitos
na mesma transação, com proteção contra repetição.

Vitória concede 30 troféus, empate 10 e derrota desconta 10, com mínimo zero.
O Elo continua sendo usado para encontrar adversários de nível semelhante.
As patentes exibidas no lobby, perfil, ranking e resultado usam troféus:

| Patente | Troféus mínimos |
| --- | ---: |
| MiniBall | 0 |
| Ballista | 100 |
| MaxPlayer | 250 |
| MaxCraque | 500 |
| MaxElite | 850 |
| BallMaster | 1.300 |
| MaxLenda | 1.900 |
| MaxImortal | 2.700 |

O Ranking lista somente os primeiros 100. O cartão pessoal mostra a posição e
os troféus mesmo quando o jogador está abaixo do corte. Empates em troféus usam
o identificador da conta como critério estável.

No perfil, marque até quatro posições diferentes entre GK, MC, VL, PV e TEC.

## Amistosos

Abra Jogar → Amistosos. Crie um grupo, convide três colegas e marque prontidão.
Os quatro precisam estar conectados e ser integrantes aprovados do mesmo clube.
O capitão escolhe o clube e se haverá pênaltis em caso de empate.

A busca combina clubes diferentes com a mesma opção de pênaltis. Os dois capitães
precisam aceitar em até 45 segundos. Recusa, expiração ou saída de um integrante
liberam o grupo para outra busca. A sala só é criada depois dos dois aceites.

O formato é 4 × 4, com dois tempos de 10 minutos. No intervalo, todos retornam à
sala; o placar permanece e os lados são trocados. O dono ou árbitro inicia o segundo
tempo, com contagem de três segundos. As regras aceitas pelos clubes ficam fixas.
Jogadores e substitutos precisam pertencer ao clube do seu lado do campo.

Foi adotada a regra literal de gol de ouro no segundo tempo: o primeiro gol desse
tempo encerra o amistoso e dá a vitória à equipe que marcou. O placar agregado
continua visível. Se os dois tempos terminarem empatados sem esse gol, haverá
pênaltis quando essa opção tiver sido aceita pelos dois clubes.

## Final e encerramento

Jogar → Final prepara uma sala com estádio e duração selecionáveis. O dono pode
organizar os times na sala e convidar jogadores; vagas livres são preenchidas por
bots. Em empate, a decisão segue para pênaltis.

A Final inclui apresentação do estádio, entrada, escalações por seis segundos,
cerimônia, capitães, apresentação da taça e formação. A torcida tem mais integrantes
e reação ampliada. O encerramento mostra o time vencedor e a taça sendo erguida.
“Ver resultado” permite avançar a cerimônia a qualquer momento.

O resultado apresenta MVP e estatísticas, além de troféus/gemas quando for ranqueada.
“Jogar de novo” foi retirado da interface. Os melhores momentos ficam acessíveis,
sem o aviso de apito final sobreposto; a saída pelo túnel e o retorno ao lobby
continuam disponíveis.

## Atualização e verificação

O servidor aplica `010_competitive_progress.sql` automaticamente ao iniciar.
Essa migração é do SQLite; não exige uma nova consulta no painel Supabase.
Use `npm.cmd run dev` localmente e `npm start` no Render. Uma execução antiga
precisa ser encerrada antes de iniciar o código novo na mesma porta.

Foram incluídos testes de recompensas e repetição de resultados, corte do Top 100,
posições, criação de salas com todos os estádios, aceite/recusa/expiração de amistosos,
intervalo e retomada pela arbitragem, cerimônia da Final e acesso aos arquivos da
interface. A verificação no Edge usa banco isolado e contas de teste.

Configuração de preços/checkout Cakto, deploy no Render e a migração Supabase
`002_ranked_parties.sql` continuam dependendo da configuração desses serviços.
Os testes locais não comprovam a publicação ou a estrutura do banco remoto.
