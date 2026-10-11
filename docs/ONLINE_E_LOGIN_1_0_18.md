# MAXBALL 1.0.18 — reconciliação online e login persistente

## Causas encontradas no código

1. A previsão anterior reconstruía um intervalo estimado por metade do ping, sem reaplicar os comandos a partir de uma confirmação da simulação. Mudanças rápidas de direção podiam cair no intervalo errado.
2. `acks` refletia a última sequência recebida pelo WebSocket, inclusive antes de a física consumir esse comando. Recebimento não equivale a movimento confirmado.
3. Perto de contatos, a previsão congelava ou separava o jogador contra círculos estáticos por uma regra diferente do motor autoritativo. Isso favorecia atraso e correções nas disputas.
4. O buffer guardava timestamps já convertidos com offsets diferentes. Além disso, aumentar o atraso adaptativo podia fazer seu relógio de reprodução voltar, apresentando posições anteriores.
5. O login local já usava cookie persistente de 30 dias. No Supabase, porém, a sessão do MAXBALL era encurtada à validade do token de acesso, normalmente uma hora, sem restauração automática ao reabrir.

Esses são problemas demonstráveis no código. Não houve instrumentação do processo de produção para atribuir os 200 ms relatados a CPU, rede ou uma combinação dos dois.

## Implementação

| Arquivo | Correção |
| --- | --- |
| `src/online/connection.js` | Histórico limitado de comandos sequenciados, reaplicação do trecho ainda não simulado, resposta ao comando atual e erro visual que decai gradualmente. Reinício do histórico em nova partida/reconexão. Métricas de previsão, correção e comandos pendentes. |
| `src/online/prediction.js` | Usa o motor físico existente numa cópia isolada do estado. Reaplica movimento em substeps de até 1/60 s, inclusive contatos e limites reais, sem alterar o estado recebido. Não executa chutes especulativos. Bola e adversários exibidos continuam autoritativos. |
| `server/online/match.cjs` | Registra a sequência realmente consumida pela física e o tempo simulado com aquele comando. Limpa o registro quando o jogador sai. |
| `server/online/rooms.cjs` | Encaminha sequências à partida; confirma consumo em vez de simples recebimento. Limita congestionamento persistente do socket para evitar uma fila longa de estados antigos. |
| `src/online/protocol.js` | Transporta `inputState` com sequência e duração consumida nos snapshots, frames e deltas, mantendo `acks` numérico para compatibilidade. |
| `src/online/snapshotBuffer.js` | Conserva timestamps no relógio do servidor e usa um único offset na leitura. O relógio de interpolação nunca retrocede quando o jitter muda. Mantém memória limitada e extrapolação curta; contatos não são extrapolados livremente. |
| `server/services/supabase.cjs`, `server/app.cjs` | Separa a sessão persistente do token curto de acesso; `/auth/me` renova tokens no servidor ao restaurar a conta, com deduplicação de pedidos simultâneos e revalidação contra logout/revogação. |
| `src/ui/portal.js` | Restaura a conta ao abrir, verifica a sessão a cada cinco minutos e ao recuperar foco; reconecta uma sala quando necessário. |
| `src/ui/debugView.js` | Acrescenta idade do snapshot, comandos pendentes, magnitude da correção e custo da previsão às medidas existentes de FPS, renderização, ping e servidor. |
| `src/core/apiContract.js` | Atualiza o contrato para impedir o uso dessa interface com um backend antigo. |

Física autoritativa de bola, velocidades, DB, cores, personagens e regras offline não foram recalibrados. A simulação continua a 60 Hz e a transmissão a aproximadamente 20 Hz. O cliente envia mudanças a até 60 Hz e repete comandos inalterados a cada 150 ms. O servidor continua decidindo posições, gols, passes e chutes; o tempo declarado pelo cliente não controla a velocidade no servidor.

A previsão de contatos reutiliza as mesmas regras, mas não conhece comandos futuros dos adversários. Estima sua continuidade pelo movimento recebido. Divididas ainda podem exigir correções legítimas. A compensação de movimento tem limite de 500 ms; não tenta esconder uma desconexão prolongada.

## Testes e evidências

Validação final: **373 testes aprovados, zero falhas**, `npm run check` com **216 arquivos**, APK 1.0.18 (versionCode 19) assinado e os **142 arquivos empacotados comparados byte a byte** aos assets gerados. SHA-256 do APK: `49a25a4334c443384759c90d3c99e571e4a7cf0ea562bbc98ef38c943b15ecc1`.

- `tests/online-reconciliation.test.cjs`: confirmação depois do passo físico; duração consumida preservada pelo protocolo; descarte dos comandos já aplicados; mudanças de direção/paradas; contatos e divididas comparados ao motor do servidor; relógio de interpolação monotônico; recuperação de baseline.
- Matriz determinística de RTT **50, 100, 200 e 300 ms**, cada um sem jitter, com jitter de até 30 ms e com bloqueios de transporte de 180 ms. Os 12 cenários responderam em até um frame de 60 Hz no simulador e terminaram a menos de 0,2 unidade da posição autoritativa. Os números são de simulação, não de celulares reais.
- Passe seguido de chute em oito cenários de latência/entrega em bloco: exatamente um passe e um chute consumidos, preservando DB. Os testes existentes também cobrem oito direções e diferentes FPS.
- `scripts/qa-online-reconciliation.cjs`: **duas sessões reais do Edge**, WebSockets reais para servidor local, controle por eventos de toque, viewport 740×360. X1 nos quatro RTTs; 2v2, 3v3 e 4v4 com RTT nominal de 200 ms e jitter. Nessas salas maiores, duas posições são humanas e as demais ficam neutras para isolar a rede; não equivale a oito dispositivos independentes. Inclui descarte intencional de um delta na aplicação, ressincronização e reabertura da página com login mantido.
- `scripts/qa-online-actions.cjs`: botões reais de passe/chute, intervalo de aproximadamente 50 ms, RTT artificial de 200 ms: exatamente uma execução de cada ação.
- `tests/persistent-login.test.cjs`: expiração do token de acesso, restauração simultânea por duas abas, cookie persistente real via HTTP e revogação ao sair explicitamente. Testes existentes mantêm proteção contra refresh após logout, troca de identidade e validade administrativa limitada.

Resultados brutos: [matriz no navegador](qa-1.0.18/browser-matrix.json), [matriz determinística](qa-1.0.18/simulation-matrix.json), [passe + chute por toque](qa-1.0.18/touch-pass-shot.json), [captura mobile](qa-1.0.18/online-mobile-300ms.png).

Nos testes com dois navegadores no mesmo computador, a primeira resposta observada variou aproximadamente de **25 a 130 ms**, incluindo variações de agendamento e renderização. O custo médio da previsão ficou aproximadamente entre **1 e 4 ms**, com picos de até **31 ms**. Os FPS médios recentes ficaram entre **49 e 60**, e o p95 do passo do servidor local entre **2,6 e 13,9 ms**. Os RTTs medidos excedem os nominais quando há jitter ou agendamento do navegador. Isso confirma que CPU/FPS também devem ser medidos: uma alteração de rede não elimina travamentos de renderização.

WebSocket usa TCP confiável e ordenado. Perda de pacotes de rede costuma virar retransmissão e bloqueio dos seguintes, não descarte independente de snapshots. Por isso os testes separam bloqueios do transporte do descarte artificial de um delta, que exercita a recuperação do protocolo.

## Login salvo

Fechar e reabrir a página mantém a sessão de jogador por até 30 dias, sujeito à validade do provedor, cookies e armazenamento persistente do servidor. A senha não é salva no navegador. Tokens do Supabase permanecem no servidor; o cookie é HttpOnly. “Sair da conta” revoga a sessão e exige login novamente. Contas administrativas mantêm seu limite de oito horas. Sessões antigas já expiradas podem exigir um novo login uma vez.

## Hospedagem e validação real

`render.yaml` continua em Ohio. Nenhuma migração, configuração de produção ou exclusão de dados foi executada. A [lista oficial do Render](https://render.com/docs/regions) não inclui Brasil; trocar a região de um serviço existente exige criar outro e migrar os dados/configuração. A [Fly.io lista São Paulo (`gru`)](https://docs.fly.io/reference/regions) como alternativa para um ensaio futuro, sujeito a disponibilidade e medição da rota dos jogadores. Proximidade geográfica é uma hipótese favorável, não uma garantia de ping.

Antes de considerar a experiência competitiva validada, jogar em dois dispositivos físicos no Brasil, preferencialmente com redes diferentes. Registrar ping/jitter, FPS/p95 de frame, correção da previsão e p95 do servidor durante mudanças rápidas, paradas, condução, DB e divididas em cada formato. Comparar essas medidas após o deploy com as anteriores. Para testar outra hospedagem, usar um serviço isolado, cópia de segurança e plano de retorno; migrar produção somente com autorização específica.

As correções compensam parte da latência percebida, mas não reduzem fisicamente a viagem Brasil–Ohio. A documentação de [sessões do Supabase](https://supabase.com/docs/guides/auth/sessions) fundamenta a separação entre token curto de acesso e renovação da sessão.
