# Física, controles e carreira

## Testar

Abra http://127.0.0.1:5173 e pressione Ctrl+F5 após reiniciar o servidor com `npm start`.
Na carreira, use **Opções da carreira → Salvar opções** antes de entrar em campo.
Cada save guarda seu tempo (1, 2, 3, 5 ou 10 minutos) e dificuldade (Fácil, Normal ou Difícil).
Saves antigos começam com 2 minutos e dificuldade Normal até você salvar outra escolha.
Transferências preservam as opções; não é necessária outra migração SQL.

## Problemas encontrados e correções

- **Deslizamento:** a integração usava uma desaceleração exponencial mesmo sem comando. Agora zera as duas componentes reais da velocidade no primeiro passo sem movimento. Essa mesma função roda no servidor, localmente e na previsão do cliente.
- **Contatos rápidos:** a bola era testada contra jogadores antes de andar. Agora os subpassos de deslocamento também resolvem contatos. Uma seleção inicial de candidatos evita testar todos os jogadores em cada subpasso.
- **Bola junto à parede:** a correção de penetração podia empurrar a bola para fora e causar correções repetidas. O deslocamento bloqueado pela parede passa aos corpos envolvidos. Contatos simultâneos usam uma única velocidade inicial e arbitragem estável.
- **Reação ao jogador parado:** os jogadores seguem os comandos como corpos cinemáticos. A bola reflete sua velocidade relativa já no primeiro contato, sem continuar avançando contra o corpo e depender de correções sucessivas. O contato não introduz uma velocidade residual no jogador.
- **Alcance visual diferente do chute:** `src/physics/interaction.js` calcula o alcance usado tanto pelos comandos quanto pelo círculo. O raio inclui a distância máxima entre os centros do jogador e da bola, com a parcela adicional limitada entre 0,75 e 1,5 unidades. O círculo só aparece nos jogadores humanos controlados naquela tela; no local com dois controles, aparecem dois círculos.
- **Chutes dos elencos reais:** os atributos desses jogadores não incluíam `aggression`. Multiplicar pelo valor ausente gerava `NaN`. O cálculo agora usa um valor padrão explícito.
- **Intercepções erradas:** bots extrapolavam em linha reta através das paredes. A previsão compartilhada considera atrito, paredes e traves, uma vez por decisão. As decisões permanecem espaçadas em 200, 130 ou 85 ms, conforme a dificuldade. Mantêm funções táticas, um perseguidor por time, cobertura, apoio e separação; o jogador com posse assume a ação sem esperar a troca do perseguidor.
- **Disputa travada no canto:** a margem externa do campo também está disponível aos bots, para se colocarem atrás da bola junto à linha. Nessa situação, priorizam um passe ao companheiro ou ao espaço central; pedidos de passe e chute da carreira continuam tendo prioridade. Um teste reproduz dois bots no canto e verifica que a bola sai dali.
- **Alocações na física:** listas de jogadores ativos, posições anteriores, correções e memória de contatos são reutilizadas. A separação termina assim que não há sobreposição. Testes de distância ao quadrado evitam raízes desnecessárias.
- **Trabalho duplicado na rede:** antes de cada pacote compacto, o servidor construía um snapshot com todo o elenco. Agora monta o pacote diretamente, mantendo snapshots completos para início, reconexão e resultado. O cliente também reutiliza os índices do elenco.
- **Renderização:** o cliente usa diretamente as cópias produzidas pela interpolação; partículas são removidas por compactação, sem vários `splice`; placar e relógio só mudam o texto quando necessário. A apresentação reutiliza seus elementos.

## Ajustes de jogo

- Passe manual: **275** unidades/s; passes com mira: **250–310** antes dos atributos.
- Chute: **350** unidades/s; limite da bola: **400** unidades/s. Há uma contribuição pequena do movimento do jogador e da velocidade tangencial anterior da bola, respeitando o limite.
- Atrito da bola: fator por segundo **0,38**, para dar resistência à condução e encerrar o movimento mais cedo. Velocidades abaixo de 0,5 são zeradas para encerrar o movimento residual.
- Entrada local e online usam a mesma sequência com movimento suave e saídas escalonadas. A opção de pular a entrada local continua disponível.
- Entrada online: 0,8 → **5 segundos**; apresentação comum: **10,2 segundos**, carreira: **21,8 segundos**.
- Bola: painéis projetados sobre uma esfera, sombra e iluminação fixa, com rotação em dois eixos derivada do deslocamento. Usa canvas 2D e até 96 imagens de 96×96, cerca de 3,4 MiB de pixels, além da memória do navegador.

## Rede e limites da previsão

A física continua autoritária a 60 Hz, com pacotes a 20 Hz e comandos até 30 Hz.
A interpolação mantém atraso adaptativo de 70–150 ms. Em espaço livre, pode continuar o movimento por até 50 ms quando falta um pacote; evita prever contatos. A bola prevista nunca altera o resultado no servidor.
Ao soltar o controle, o cliente mantém brevemente a posição prevista até a confirmação do comando de parada, por no máximo 200 ms. O servidor zera a velocidade assim que recebe o comando. Isso não elimina a latência física da conexão.

## Validação

- **105 testes passaram**, incluindo carreira e isolamento dos saves, contato simultâneo, bola rápida, paredes, chute, passe, oito direções, parada, previsão, círculo, bots, rede, matchmaking, grupos, administração, pagamentos e SQL/RLS do Supabase.
- O teste de SQL inicialmente encontrou falta de memória para um buffer. Passou isoladamente e depois na suíte completa. O comando de testes limita o heap JavaScript a 128 MiB, mantendo as opções existentes para reduzir o custo de compilação WebAssembly.
- Navegador Edge: carreira com opções salvas, partida real 5v5 no servidor, parada, círculo, treino e dois controles locais. Conferência visual em 1280×720 e 740×360, sem erros JavaScript.
- Stress WebSocket: **16 conexões, 8 salas, 80 jogadores, 4 reconexões**, com fila ranqueada e desistência persistida; **zero pacotes descartados**. P95 do processamento das salas: **6,17 ms**, pico **42,02 ms**.

Medição local de simulação e codificação após aquecimento, 1.800 passos por formato:

| Formato | P50 por passo | P95 por passo | Pico |
| --- | ---: | ---: | ---: |
| 1v1 | 0,044 ms | 0,198 ms | 1,741 ms |
| 2v2 | 0,050 ms | 0,250 ms | 2,790 ms |
| 3v3 | 0,045 ms | 0,200 ms | 2,140 ms |
| 4v4 | 0,061 ms | 0,219 ms | 3,421 ms |
| 5v5 | 0,061 ms | 0,476 ms | 11,197 ms |

Em três rodadas de 10.000 pacotes iguais, montar e serializar diretamente custou **29,7–51,1 ms por 1.000 pacotes**, contra **75,5–92,3 ms** usando snapshot intermediário. Comparando as medianas, a redução foi de aproximadamente **57% nessa etapa**. A mensagem resultante é equivalente e isso foi verificado por teste.

Reproduza com `node scripts/gameplay-benchmark.cjs`, `node scripts/physics-benchmark.cjs` e `node scripts/network-stress.cjs`. As medições excluem GPU e internet; não garantem 60 FPS em todos os aparelhos. As comparações de simulação antes/depois variaram com a carga do computador e com as trajetórias diferentes dos bots, por isso não são usadas como promessa de ganho de FPS.

## Ajuste visual e replay de gol

- Bola com 12 gomos pentagonais e 20 hexagonais conectados, iluminação suave, rotação e sprites de 96 px em cache limitado.
- Círculo mais discreto: raio de 31,75 a 32,5 unidades, compartilhado com o alcance real de chute e passe.
- Replay automático dos últimos 3 segundos, gravados a 20 Hz e exibidos a 0,8× após a comemoração inicial. O buffer guarda no máximo 66 amostras de posições.
- Replay disponível nas partidas locais, treino, carreira e online. Não repete física, gols, estatísticas ou recompensas. O servidor mantém uma pausa de 6,2 segundos após o gol.
- Pular replay retoma imediatamente a saída de bola local; no online, pula a imagem e aguarda a mesma saída sincronizada dos demais jogadores.

Veja [Imersão e desempenho](IMERSAO_E_DESEMPENHO.md) para as regras, papéis e medições da atualização atual.

## Escolher teclas no PC

Abra **Controles → Teclas no PC** no menu principal, ou a engrenagem durante a partida. Clique no botão de chute/passe e pressione a tecla desejada. As quatro ações (chute e passe de J1 e J2 local) são configuráveis. **Esc** cancela a captura; **Restaurar teclas padrão** recupera os atalhos originais. A escolha é salva automaticamente neste navegador e os lembretes da partida são atualizados. Teclas de movimento, pedidos da carreira, chat e ações já atribuídas são protegidas contra conflitos. Os botões de toque e a velocidade atual do jogador permanecem disponíveis.
