# Auditoria técnica — MAXBALL

Data: 01/10/2026. Todos os arquivos entregues foram inspecionados antes da implementação.

## Arquitetura atual

`index.html` concentrava 669 linhas e 86.720 bytes de HTML, CSS e JavaScript. `maxball-codigo-6 (1).txt` é uma cópia idêntica preservada como referência (SHA-256 B7C2E5C7470D164DBCB0082C58D6A6268127D393329CB1C4DC2753C9B2D947FC). Os dois READMEs continham somente o título. Não há Git, AGENTS.md, dependências instaladas, backend ou banco nesta pasta; não havia testes. Não foi possível usar uma branch de um repositório existente.

Stack: JavaScript nativo, Canvas 2D, DOM, Web Audio, Pointer Events e localStorage. Google Fonts é a única dependência externa identificada, com fontes de fallback.

| Sistema | Linhas do HTML original | Funcionamento |
| --- | --- | --- |
| Inicialização | 203–251, 650–667 | Canvases, save `maxball`, handlers, requestAnimationFrame e home; perfil inicializado no fim. |
| Interface/loja | 254–322 | `show`, `rInv`, `rRoom` e controles dependem de `save`; compras e itens locais. |
| Áudio | 324–326 | Osciladores após gesto do usuário. |
| Input | 330–338, 632–635 | Teclado, dois joysticks e captura de ponteiro; sem gamepad. |
| Vestiário | 341–393 | Loop próprio, bots, bola, colisões retângulo/círculo e túnel para partida. |
| Partida | 396–420 | `start`, `kickoff`; fases intro/count/play/goal/end. |
| Bots | 426–450 | Perseguição, defesa, desvio, passe/chute; consulta estado global. |
| Chute/passe | 453–464 | Direção jogador→bola, passe assistido, domínio e chute duplo. |
| Física | 472–485, 499–506 | Diagonal normalizada, velocidade alvo exponencial, separação de círculos, atrito, paredes/traves. |
| Gol/resultado | 507–532 | Placar, pausa, efeitos, áudio, moedas e estatísticas no mesmo fluxo. |
| Renderização | 534–627 | Bola, sprites, câmera, partículas e estádio em cache. |
| Rede | 567–594 | Cadeia de 15 deslocamentos por gol, quatro subpassos, molas, damping e limite ±45; projeção de painéis. |
| Loop | 628–631 | dt variável limitado a 33 ms; update/draw compartilham estado. |

## Problemas encontrados

### Alta prioridade

- Save sem validação: arrays nulos, controles parciais, índices inválidos e estatísticas com tipos errados podem quebrar telas/cálculos. Migração `v != 2` apaga camisas adquiridas e trata versões futuras como antigas.
- Gravação ignora erros. Nome e estatísticas padrão são criados depois da primeira gravação; podem mudar ao recarregar.
- Nome carregado é interpolado em `innerHTML` na sala. Validação no formulário não protege contra armazenamento adulterado. Não foi identificado endpoint remoto de exploração.
- Moeda, compras, itens e resultados são editáveis no cliente. São somente dados do protótipo offline e não podem virar direitos oficiais online. Não há credenciais nem endpoints administrativos nesta base.

### Média prioridade

- Estado global `G`, `P`, `ball`, `save`, câmera e dimensões. Física chama DOM, áudio, partículas e recompensas. Não existe núcleo de simulação independente nem eventos.
- Inputs não são limpos ao perder foco/navegar; podem ficar presos. Apenas inputs de texto eram ignorados pelo teclado.
- dt variável, limite de 33 ms, damping e partículas por frame impedem equivalência entre taxas de quadros. RNG compartilhado também impede replay determinístico.
- Gol usa X após colisões, sem teste explícito de trajetória da bola inteira pela boca do gol. `goal` e `endMatch` não têm guardas próprias contra repetição. Colisões são discretas.
- Círculos exatamente sobrepostos (`d == 0`) não são resolvidos. Separação entre jogadores ocorre após clamp e pode empurrá-los para fora. Jogadores não colidem explicitamente com traves. Bola é integrada antes do limite de velocidade.
- Rede é cadeia 1D, não malha física 2D; não é reiniciada por partida e atualiza em repouso. Impacto ocorre ao entrar no gol, sem contato localizado por painel. Profundidades física e visual diferem.
- Timeouts de resultado/chat/som sobrevivem à saída. Loop repete erro/toast a cada frame e pode acumular callbacks durante falha persistente.
- Texto CPU/VOCÊ da comemoração não acompanha escolha de visitante/espectador.
- Clipboard usa try/catch síncrono em uma Promise e anuncia sucesso antes da confirmação.

### Manutenção, desempenho e UX

- Funções densas: `rRoom`, `ai`, `lkDraw`, `update`, `draw`, `buildStadium`. Constantes espalhadas; ramo morto `if(true)` na defesa e corrida desativada por `run=false`. `chip`, `skinSpr`, `PM`, `oppI` e variável `L` em `start` têm uso ausente ou redundante; confirmar referências em cada extração.
- IA aloca arrays por jogador/frame; rede e partículas alocam no desenho; HUD escreve DOM todo frame. São candidatos a profiling, não gargalos medidos.
- Cache de estádio/sprites deve ser preservado. Chats são limitados e partículas expiram. Não foi comprovado vazamento contínuo de memória; timers pendentes exigem testes de ciclo de vida.
- Há safe areas, DPR limitado e layout adaptativo. Bloqueio portrait incondicional, zoom desabilitado e controles por pointer coarse exigem teste em aparelhos híbridos/mobile.
- Texto de privacidade diz que não pede nome apesar do perfil local; contato é placeholder. Revisão editorial necessária antes de publicar. Esta auditoria não é parecer jurídico.

## Partes a preservar

Identidade visual, treino, bots, dois jogadores no teclado, sala offline, vestiário, controles móveis/editor, domínio/passe/chute, cosméticos procedurais, áudio, cache e saves válidos. Não ajustar constantes físicas na primeira extração.

## Estrutura proposta e plano de implementação

Primeira etapa: `index.html` (telas), `styles/game.css`, `src/legacy/game.js` (implementação existente encapsulada), `src/services/localSaveRepository.js`, `src/input/inputLifecycle.js`, `tests/` e `docs/`. Scripts clássicos preservam abertura por arquivo. Legacy é transitório; evita reescrever tudo de uma vez.

1. Isolar persistência com validação/backup, separar arquivos e limpar input.
2. Extrair estado/configuração/ciclo da partida; timers canceláveis e eventos de gol/fim com execução única.
3. Extrair simulação sem DOM: timestep fixo, RNG injetável, movimento, bola, colisões e trigger de gol com trajetória. Comparar controle antes de ajustar física.
4. Rede com contato localizado, limites, reset e repouso; preservar projeção visual útil.
5. Separar renderização, áudio, HUD e bots; descarte explícito de listeners.
6. Backend monolítico modular e banco com migrations; decidir stack após contratos. Sessão, validação e RBAC desde os primeiros endpoints.
7. Perfil/carreira por services/repositories: temporadas, performance, transferências, competições, títulos, galeria e prêmios.
8. Economia oficial: ledger, compra atômica/idempotente e inventário no servidor. Não importar moeda local como saldo oficial.
9. Multiplayer autoritativo: inputs sequenciados, snapshots, eventos, salas, interpolação, reconexão; depois matchmaking.
10. Administração auditável, profiling e polimento. Segurança/testes acompanham todas as etapas.

## Limites da verificação

Primeira etapa: sintaxe, carregamento, saves existentes/parciais/corrompidos, migração, backup, falha de storage, perda de foco e fluxos atuais. Próxima etapa de física deve testar diagonais, sobreposição, traves, linha, gols externos, gol único e reinício. Economia futura: saldo exato/insuficiente, compras repetidas/concorrentes, sessões expiradas e banimentos.

Navegador indisponível nesta sessão: nenhuma instância conectada. Testes com DOM/Canvas simulados não substituem verificação visual, performance nem teste em mobile físico. Resultados concretos dos testes estão em VALIDACAO.md.
