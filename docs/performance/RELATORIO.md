# Auditoria de desempenho MAXBALL — 08/10/2026

## Problemas encontrados

A auditoria percorreu os 145 arquivos de implementação, estilos, scripts, APIs e migrações existentes no início do trabalho, além do HTML, testes e assets. O jogo usa JavaScript e Canvas 2D. Não há React, Redux, Zustand, Three.js, WebGL ou WebRTC; o multiplayer usa WebSocket.

| Sistema | Evidência e decisão |
| --- | --- |
| Renderer | A projeção da bola criava arrays de pontos e recortes para cada face a cada rotação não presente no cache. Os 32 painéis chegam a 900 pontos amostrados. Este caminho roda durante a partida. |
| Física | Inputs eram clonados por jogador em cada passo; subpassos da bola criavam objetos temporários; iterações de contato calculavam distâncias de jogadores já distantes. |
| IA | A escolha do perseguidor recalculava o mesmo custo de interceptação diversas vezes na mesma decisão. As salas enviavam os trabalhos ao worker juntas, no mesmo tick. |
| Rede | Frames completos de campos dinâmicos repetiam velocidades, flags e partes de G sem alteração. O cenário medido consumia aproximadamente 24.245 bytes/s por cliente, excluindo cabeçalhos WebSocket/TCP/TLS. |
| Input | O envio dependia exclusivamente de um intervalo de 30 Hz. A previsão aplicava a direção atual a todo o horizonte de rede, incluindo o período anterior a uma mudança de direção. |
| Partículas | Rajadas, rastros e confetes criavam objetos continuamente. Não existia um pool nem um teto global de partículas. |
| UI/DOM | Havia um segundo requestAnimationFrame permanente apenas para medir FPS. Apresentação e controles da transmissão eram atualizados em todos os frames; alguns textos eram reescritos mesmo sem mudança. |
| Ciclo de vida | A aba oculta não tinha uma proteção explícita no loop principal; ao retornar, podia executar recuperação acumulada. Partidas finalizadas continuavam passando por parte do processamento de sala. |
| Áudio | A torcida repetia a mesma automação de ganho em cada atualização mesmo com volume estável. |
| Qualidade | A seleção era fixa, com qualidade alta como padrão, sem avaliação sustentada da capacidade do aparelho. |
| Carreira | Usa a mesma física e o mesmo renderer, com decisões locais ou worker quando online. Saves, tabelas, calendário e simulação de rodadas são processados por ações/resultados, não em todos os frames. Preservados. |
| Banco/servidor | SQLite usa WAL e cache de statements. Não sincroniza a física pelo banco; autenticação tem verificação periódica e os resultados são persistidos ao encerrar. Não houve migração nem alteração de recompensas. |
| Assets | 20 PNGs de escudos, todos 500 × 500; assets somam aproximadamente 1,83 MB. Imagens, estádio, uniformes, rótulos e redes já tinham caches. Não houve conversão destrutiva ou troca por assets de menor qualidade. |
| Colisões | Máximo atual: 10 jogadores. Já havia rejeição por distância ao quadrado antes da colisão detalhada e seleção de candidatos para os subpassos da bola. Uma grade espacial não foi adicionada sem evidência de ganho para esse tamanho. |

## Correções

- Projeção da bola usa buffers Float64Array reutilizáveis, preservando os comandos de desenho originais. Quatro orientações diferentes foram comparadas com hashes do traçado anterior.
- Física reutiliza inputs e evita distâncias detalhadas desnecessárias. Subpassos reutilizam o ponto anterior.
- IA memoiza custos dentro de cada decisão; mantém papéis, previsões, passes, dribles, tabelas e frequências. As salas distribuem os envios ao worker pelos seis ticks.
- Protocolo delta envia máscaras de campos alterados dos jogadores, mudanças de G e da bola. Snapshot completo continua sendo enviado no início, alterações do elenco e reconexão.
- Decoder valida a cadeia de ticks. Ao perder o baseline, solicita uma nova assinatura. Não usa um delta sobre um estado desconhecido.
- O loop ativo também envia inputs, com limites de frequência e prioridade para ações novas. O intervalo existente permanece como manutenção/heartbeat.
- Previsão usa uma linha do tempo de direções, limitada em memória. Bola, gols e contatos continuam autoritativos; a previsão permanece restrita a espaço livre.
- Saída de substituições interpola a posição do jogador entre quadros correspondentes.
- Pool de partículas com reutilização, teto por qualidade e descarte por tempo de vida. Partículas fora da câmera não são desenhadas.
- Controles da transmissão/apresentação atualizam a 10 Hz; textos estáveis usam cache. O loop de diagnóstico duplicado foi removido.
- Menus, aba oculta e vestiário impedem física/renderização da partida em segundo plano. O relógio acumulado é reiniciado nas transições de visibilidade.
- Partidas finalizadas e já publicadas deixam de executar processamento ativo de jogo.
- Torcida agenda ganho novamente quando o volume muda.
- Qualidade automática considera memória/CPU disponíveis e observa sobrecarga sustentada. Ajusta resolução interna e capacidade dos efeitos, com intervalos entre mudanças. Não reduz automaticamente o FPS para 30 nem altera gameplay. Qualidade manual continua disponível.

Velocidades, aceleração, atrito, impulsos, regras, dimensões, formatos, colisões e frequências de física/rede foram preservados: física 60 Hz; transmissão até 20 Hz.

## Performance antes

Baseline coletado antes das alterações de sistemas, por scripts locais. Canvas simulado em Node: mede CPU do código de desenho, não GPU, FPS real ou qualidade visual em aparelho. O cenário inclui renderer e jogo local 5v5.

| Métrica | Antes |
| --- | ---: |
| Renderer p50 | 0,3323 ms |
| Renderer p95 | 1,0887 ms |
| Física + IA + atualização local p50 | 0,2513 ms |
| Física + IA + atualização local p95 | 2,6406 ms |
| Payload por cliente | 24.245 bytes/s |
| Heap ao final da execução | 10,60 MB |

O baseline separado de 25 salas/250 entidades apresentou p95 de 12,606 ms por rodada do benchmark de simulação/codificação. Esse script não usa a arquitetura completa de WebSocket/worker, portanto não equivale a um teste de servidor em produção.

## Performance depois

Três execuções sequenciais do mesmo benchmark, sem o teste de estresse concorrente. A tabela usa a mediana. Tempos oscilam com JIT, coleta de lixo e carga do computador; o baseline anterior tem uma execução.

| Métrica | Depois | Diferença observada |
| --- | ---: | ---: |
| Renderer p50 | 0,1659 ms | aproximadamente 50% menor |
| Renderer p95 | 0,4844 ms | aproximadamente 56% menor |
| Física + IA + atualização local p50 | 0,1257 ms | aproximadamente 50% menor |
| Física + IA + atualização local p95 | 0,7446 ms | aproximadamente 72% menor |
| Payload por cliente | 15.928 bytes/s | aproximadamente 34% menor |
| Heap ao final da execução | 11,48 MB | não houve redução comprovada |

O pool mantém objetos para reutilização; a memória instantânea não é uma medida de vazamento. Não se afirma redução de heap com esses números. O teste do pool executou 320.000 aquisições com apenas 160 objetos gerenciados criados, sem crescimento do conjunto.

Medições brutas: [measurements.json](measurements.json).

## Maiores ganhos

1. Remoção de arrays temporários na projeção da bola: menor custo do renderer com o mesmo traçado.
2. Reutilização de inputs, rejeição barata de contatos e memoização da IA: menor custo por atualização.
3. Deltas na rede: menos dados por cliente sem mudar a física ou o limite de transmissão.
4. Menos trabalho de UI e áudio durante a partida; proteção de ciclo de vida e qualidade adaptativa.

## Possíveis gargalos restantes

- FPS/GPU, consumo de bateria e comportamento térmico precisam de medição em Android real. Não havia navegador conectado disponível para uma sessão de profiling visual nesta execução.
- Não foi medida latência WAN, Wi-Fi congestionado, 4G/5G ou perda de conexão em aparelho. Deltas e previsão não eliminam a latência física da rede.
- No estresse de 8 salas houve pico de 87,79 ms em uma execução e 42,18 ms na execução com perfil, embora o p95 final tenha ficado entre 5,82 e 8,11 ms. Não se afirma que todos os travamentos foram eliminados.
- O perfil inclui inicialização, contas e conexões. Aproximadamente 89% das amostras estavam ociosas; a maior parte do custo ativo remanescente está na física, codificação e I/O. Perfil apenas do processo principal: não mede integralmente o worker de IA.
- Persistência de muitos resultados simultâneos e autenticação em grandes populações ainda precisam de carga específica. Migrar SQLite/serviços para workers exige uma revisão própria de transações e consistência.
- Partidas/reconexões foram exercitadas por testes; não foi executada uma sessão real de várias horas nem medido heap Android ao longo de horas.

Perfil: [stress-after.cpuprofile](stress-after.cpuprofile), resumo: [stress-profile-summary.json](stress-profile-summary.json).

## Verificação

- Suíte existente: **204 testes passaram**.
- **11 testes novos**: deltas em todos os formatos 1v1 a 5v5, gaps/ressincronização, campos estáveis, pooling prolongado, métricas, perfil automático/manual, histórico de input, menus/visibilidade, traçado original da bola, listeners e envio/limpeza de conexão.
- Regressões direcionadas repetidas após as últimas mudanças: previsão, input, intervalos, substituições e worker.
- Estresse com **16 conexões, 8 salas e 80 jogadores/bots em movimento**, **4 reconexões**, matchmaking e persistência de abandono: passou, **zero pacotes descartados e zero erros de reconstrução**.
- Login local/validações de Supabase, saves, carreira, ranqueada, grupos, ranking, MVP, chat, convites, gol/assistência, bola, colisões, cerimônias, troca de lados e controles de toque permanecem cobertos pelos testes. Login real em conta externa e FPS em celular não foram comprovados por esses testes.
- Contadores de listeners abrangem eventos internos registrados pelo runtime. “Objetos novos/s” conta objetos do pool, não todas as alocações do motor JavaScript. Memória só aparece quando o navegador a expõe.

### Reproduzir

```powershell
node scripts/performance-benchmark.cjs
node scripts/network-stress.cjs
npm.cmd test
npm.cmd run check
```

No jogo, **F3** ou **Configurações → Medições de desempenho** abre FPS atual/mínimo/médio, frame time/p95, custo de física/render/rede/IA, taxas de atualização, entidades, partículas, contatos, objetos do pool, listeners internos, memória quando disponível, ping e jitter. Administradores veem também métricas de servidor.

Em **Configurações → Qualidade gráfica → Automático**, o perfil ajusta o custo visual. Valores manuais anteriores são respeitados. Recarregue com Ctrl + F5 para carregar o protocolo atualizado.

### Ajuste visual posterior da bola

A pedido do usuário, a perspectiva da esfera foi alinhada à inclinação dos elementos elevados do campo. Os painéis agora acompanham o horizonte circular, o cache usa maior precisão angular e os contadores antigos respeitam o mesmo sentido dos quaternions. A referência visual foi atualizada para esse desenho; física, velocidade, colisões e sincronização não foram alteradas. Foram aprovados 31 testes direcionados, incluindo três novos testes de perspectiva/rolamento. As métricas acima pertencem à etapa de otimização anterior a esse ajuste visual.

### Emblemas próprios posteriores

O catálogo passou a usar 41 SVGs próprios (43.512 bytes no total), substituindo os 20 PNGs oficiais. `src/data/crests.js` também desenha os mesmos vetores diretamente em Canvas para evitar carregamento assíncrono nas apresentações e na decoração do vestiário. Os números de assets da auditoria inicial são históricos. Referências PNG antigas redirecionam para os SVGs. Oito testes de catálogo, HTTP, carreira, apresentação e salas passaram. Galeria: [ESCUDOS_MAXBALL.svg](../ESCUDOS_MAXBALL.svg).
