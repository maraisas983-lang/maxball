# Operação Fortaleza — auditoria e implementação

Data: 09/10/2026. Escopo: repositório local MAXBALL, Node.js 24.19.0. Testes com bancos em memória/temporários e servidores em loopback. Nenhum deploy, migração remota, pagamento real ou alteração deliberada de dados de produção foi executado.

## 1. Resumo executivo

Foram reproduzidas duas condições de corrida importantes: uma renovação Supabase recriava a sessão depois do logout; uma requisição administrativa iniciada antes do logout ainda concedia gemas ao terminar o envio. Ambas foram corrigidas e cobertas por testes negativos reais. Também foram reforçados WebSocket, limites de recursos, sessões, processamento de corpos HTTP, logs e integridade de encerramentos ranqueados.

Os controles existentes de simulação autoritativa, CSRF, cookies HttpOnly, scrypt, transações da economia, idempotência de compras/recompensas, RLS e permissões administrativas foram preservados. Física, controles, animações e identidade visual não foram alterados.

Este relatório não certifica a segurança da instalação publicada. Há ações externas e riscos residuais nas seções 9–10. A árvore de trabalho já continha muitas alterações anteriores; elas foram preservadas. Cópias dos arquivos existentes alterados nesta auditoria estão em `.work/fortaleza-before/`, sem incluir `.env` ou bancos reais.

## 2. Arquitetura e fronteiras de confiança

| Componente | Autoridade e dados |
| --- | --- |
| Navegador | JavaScript sem framework, Canvas 2D; comandos de entrada não confiáveis. Save offline em localStorage não concede saldo online. Texto de jogadores usa textContent. |
| Android | WebView HTTPS ou assets offline; sem ponte JavaScript nativa; cleartext e backups Android desativados. APK de release não foi compilado nesta auditoria. |
| Node HTTP/WS | Servidor autoritativo, passo de simulação de 60 Hz, snapshots de 20 Hz; worker para bots. Identidade vem da sessão, não do payload. |
| SQLite | Banco privado ao processo, WAL, foreign keys, consultas parametrizadas e transações BEGIN IMMEDIATE. Carreira, economia, sessões, inventário e auditoria. Requer uma instância e disco persistente. |
| Supabase opcional | Auth verificado via `/auth/v1/user`; tokens externos somente no backend. Perfis e ranqueadas sincronizados por service key e outbox. RLS/SECURITY DEFINER nos SQL locais. |
| Cakto | Checkout externo e webhook com segredo compartilhado, validação de oferta/valor/conta/estado, idempotência e estornos. A tela do cliente não credita saldo. |
| Hospedagem | Render configurado com disco persistente; Vercel possui adaptador HTTP experimental com SQLite em `/tmp` e não serve como backend durável do jogo completo. |

O [inventário de endpoints, protocolo e tabelas](FORTALEZA_INVENTARIO.md) complementa este relatório. Papéis encontrados: PLAYER, SUPPORT, MODERATOR, ADMIN, SUPER_ADMIN/OWNER. A política comercial adicional depende de um e-mail confirmado definido no servidor; não é um campo de perfil editável pelo cliente.

Dados pessoais presentes: identificador de conta, nome/apelido, e-mail confirmado quando Supabase é usado, histórico de partidas/compras, mensagens, chamados/denúncias, consentimentos e registros administrativos. Hashes de senha e tokens externos são sensíveis. O código examinado não coleta cartões ou dados invasivos de dispositivo. Retenção e exclusão globais precisam de política operacional; os limites locais de histórico não substituem essa política.

## 3–4. Achados confirmados, gravidade e verificação

| ID / gravidade | Causa e impacto antes da correção | Correção e evidência |
| --- | --- | --- |
| F01 — Alta | `services/supabase.cjs`, refresh aguardava a rede e depois criava sessão sem conferir se a antiga ainda existia. Logout durante refresh não impedia nova sessão; dois refreshes podiam concorrer. | Exclusão mútua por token, revalidação dentro da transação após os awaits, vínculo à mesma identidade e substituição atômica. Prova anterior local: `replacementAuthenticates:true` após logout. Teste `Supabase refresh cannot revive logout...` agora rejeita a operação. |
| F02 — Alta | `app.cjs`, autenticação/autorização usavam estado anterior à leitura assíncrona do corpo. Logout ou rebaixamento de cargo durante upload não impediam uma concessão. | Reautenticação e nova leitura de cargo após o corpo, antes do despacho. Prova anterior: HTTP 200 e saldo do alvo 50 após logout; teste agora espera 401/403 e saldo zero. |
| F03 — Alta | `online/rooms.cjs`, socket substituído mantinha handler capaz de escrever comandos durante fechamento; comandos desconhecidos eram ignorados. | Handler exige conexão atual, não revogada e aberta. Esquemas por tipo, rejeição de binários/comandos desconhecidos. Teste com dois sockets reais mantém o primeiro pausado durante o handshake de fechamento e confirma que não substitui a entrada do segundo. |
| F04 — Alta | Criação de carreira e pareamento ranqueado não aplicavam o limite global de salas. Upgrades WS não tinham limite de frequência/capacidade global. | Limites configuráveis em todas as criações; pareamento preserva fila quando lotado. Upgrades limitados por conta/IP; total inclui sockets em fechamento. Testes confirmam 429/503 e fila preservada. |
| F05 — Média | `ranked.cjs` processava Elo/estatísticas mesmo para ABANDONED, antes do guard de abandono em `persistResult`. | Encerramento registra ratings inalterados, sem estatísticas competitivas, progresso ou outbox. Teste finaliza com placar 5–0, repete persistência e verifica ausência de ganhos. |
| F06 — Média | Log HTTP gravava cada POST negado, inclusive anônimo, no SQLite; stack traces de exceções inesperadas iam para logs. Permitia amplificação de armazenamento. | Auditoria de sucesso autenticado preservada; falhas agregadas por código e janela de 60 s, sem URL/payload/stack. Testes de spam verificam banco sem crescimento e contagens agregadas. |
| F07 — Média | Sessões por conta eram ilimitadas; sessões privilegiadas herdavam até 30 dias. Refresh Supabase não conservava um limite absoluto da cadeia local. | Máximo de 10 sessões por conta, 8 h absolutas para cargos privilegiados, cadeia externa limitada pelo prazo original e access token de no máximo 1 h. Testes conferem expiração, rotação e eviction. |
| F08 — Média | Revogar BALL/CELEBRATION em `admin.cjs` zerava effect em vez do equipamento correspondente; item removido podia continuar equipado. | Mapa fechado de categoria para coluna. Teste HTTP revoga os dois tipos, confirma desequipamento e preserva o efeito. |
| F09 — Média, configuração | `.vercelignore` não excluía explicitamente var, .work, bancos, chaves e artefatos locais. Risco de inclusão no pacote; exposição pública efetiva não foi demonstrada. | Exclusões acrescentadas. Verificação local; pacote/deployment real da Vercel não foi gerado. Servidor Node já usa allowlist de arquivos públicos, validada por HTTP. |
| F10 — Baixa | Content-Type era aceito por prefixo, incluindo application/json-not-json; chunks eram convertidos separadamente e podiam corromper UTF-8. | Tipo de mídia exato, contagem de bytes, decodificação após concatenação, limite de 16 KiB e resposta 413 para envio chunked. |
| F11 — Baixa | Limite de login agrupava apenas os primeiros 24 caracteres da identidade, permitindo colisões entre e-mails longos. | Chave do limite usa hash da identidade normalizada completa, até 254 caracteres, sem guardar o e-mail no mapa. |
| F12 — Média | `online/rooms.cjs` concedia XP legado/achievements após FORFEIT quando existia qualquer entrada, permitindo ganhar progresso em partida incompleta. | XP de perfil somente em TIME, GOAL_LIMIT, GOLDEN_GOAL ou PENALTIES. Teste confere zero XP/achievements em desistência e concessão única em encerramento normal; penalidade de Elo por desistência continua válida. |
| F13 — Baixa, estabilidade | Durante reconexão, a simulação podia enviar delta antes de o subscribe do cliente chegar; o novo decoder ainda não possuía baseline. O teste de carga falhou no código anterior e no atual antes desta correção. | Snapshot enviado no connect e reinício da cadeia de deltas compartilhada. Teste específico inicialmente falhou recebendo delta como primeiro pacote, em vez de snapshot. |

Não foi comprovada vulnerabilidade crítica de execução remota, SQL injection ou concessão direta de saldo pelo cliente. Isso descreve a evidência examinada, não uma garantia de ausência.

Referências no código final: F01 em `server/services/supabase.cjs:45` e `:87`; F02 em `server/app.cjs:118`; F03 em `server/online/rooms.cjs:259`; F04 em `server/online/rooms.cjs:136`, `:248` e `:327`; F05 em `server/services/ranked.cjs:20`; F06 em `server/app.cjs:206` e `server/lib/security.cjs:27`; F07 em `server/services/auth.cjs:24`; F08 em `server/services/admin.cjs:34`; F10 em `server/app.cjs:38`; F11 em `server/app.cjs:62`; F12 em `server/online/rooms.cjs:102`; F13 em `server/online/rooms.cjs:287`.

## 5–6. Arquivos modificados e controles implementados

| Arquivo | Alteração desta auditoria |
| --- | --- |
| `server/lib/security.cjs` | Configuração validada, rate limiter com memória limitada e agregador de eventos. |
| `server/app.cjs` | Reautenticação após corpo, limites por conta/operação, parser e logs protegidos. |
| `server/index.cjs`, `.env.example` | Conexão dos limites às variáveis de ambiente. |
| `server/online/rooms.cjs` | Capacidade uniforme, upgrades limitados, validação de protocolo, bloqueio de sockets antigos, limpeza de entradas na desconexão. |
| `server/services/auth.cjs` | Limite de sessões e duração privilegiada. |
| `server/services/supabase.cjs` | Refresh serializado, atômico e revogável; preservação do prazo absoluto. |
| `server/services/ranked.cjs` | Abandono sem alterar classificação. |
| `server/services/admin.cjs` | Revogação correta de equipamento. |
| `.vercelignore` | Exclusão de arquivos privados/locais. |
| `.github/workflows/android-apk.yml` | Seis actions fixadas por SHA verificado no repositório oficial; compilação usa o wrapper com checksum da distribuição. |
| `scripts/security-backup.cjs` | Backup WAL consistente, publicação sem sobrescrita, verificação e reconciliação de saldos. |
| `tests/security-fortaleza.test.cjs`, `tests/security-backup.test.cjs` | Testes HTTP/WS, corrida, concorrência, abuso e restauração. |
| `tests/maxpass-ui.test.cjs` | Correção de teste intermitente preexistente; mesmo instante inicial e verificação explícita do próximo limite. |
| `docs/FORTALEZA_*.md` | Inventário, resultados e operação/reversão. |

Nenhuma migração de banco foi acrescentada. Não foram instaladas dependências nem alterados lockfile, engine ou framework.

## 7. Testes e resultados

Logs completos locais em `.work/fortaleza-*.log`. A suíte inicial foi executada antes das alterações nos arquivos existentes.

| Comando | Resultado real |
| --- | --- |
| `npm.cmd test` — linha de base | 251 testes: 250 aprovados, 1 falhou; 0 ignorados/cancelados. 548,3 s. |
| `npm.cmd run check` — linha de base | Sintaxe aprovada em 177 arquivos. |
| `npm.cmd audit --json` | 0 vulnerabilidades conhecidas; 39 dependências contabilizadas. |
| `node --test --test-concurrency=1 --test-timeout=30000 tests/security-fortaleza.test.cjs` — primeira rodada | 12/12 aprovados, 5,2 s. |
| `node --test --test-concurrency=1 --test-timeout=30000 tests/security-fortaleza.test.cjs tests/security-backup.test.cjs` | 15/15 aprovados, 51,5 s, sem ignorados/cancelados. Inclui restauração de conta, inventário, compra e saldo de fixture. |
| `npm.cmd test` — regressão após correções de segurança | 266/266 aprovados; 0 falhos, ignorados ou cancelados; 590,4 s. Inclui 15 testes novos de segurança. A correção adicional de reconexão foi validada depois, nos testes direcionados abaixo. |
| `npm.cmd run check` — após correções | Sintaxe aprovada em 181 arquivos. |
| `node --test --test-concurrency=1 --test-timeout=90000 tests/security-fortaleza.test.cjs tests/security-backup.test.cjs tests/server.test.cjs tests/party-network.test.cjs tests/performance.test.cjs tests/maxpass-ui.test.cjs` — estado final, incluindo F13 | 43/43 aprovados; 0 falhos, ignorados ou cancelados; 42,1 s. Inclui os 16 testes de segurança/reconexão, o teste de backup/restauração e regressões de HTTP, WS, grupos, protocolo, física e MaxPass UI. |
| `node scripts/network-stress.cjs` — estado final | Aprovado: 16 conexões, 8 salas, 80 jogadores, 4 reconexões, zero pacotes descartados e nenhum erro de decodificação detectado. p95 de processamento 19,64 ms, pico 315,68 ms e ping 16 ms; log `.work/fortaleza-network-final.log`. |
| Verificação do pipeline Android | Seis referências conferidas com `git ls-remote` dos repositórios oficiais e fixadas por SHA de 40 caracteres. Checksums da distribuição e do JAR do wrapper conferidos com os arquivos oficiais do Gradle 8.11.1. Execução remota do workflow não realizada. |
| `node --test --test-concurrency=1 --test-timeout=90000 tests/commerce-android.test.cjs` | 5/5 aprovados; 0 falhos, ignorados ou cancelados; 10,3 s. Inclui permissões comerciais, idempotência de pagamentos e pacote Android contendo somente assets públicos com referências válidas. Não compila o APK. |

A regressão existente cobre compras simultâneas/idempotência, MaxPass e estornos, RLS em PostgreSQL/PGlite, salas privadas/convites, grupos 2v2, carreira, regras e física, moderação, chat, interface jsdom, migrações e assets Android. Consultas remotas foram simuladas nos testes Auth; SQL foi executado em banco local, não no Supabase de produção.

Varredura local: 325 caminhos rastreados/não ignorados examinados por padrões de chave privada, AWS e chaves Supabase secret; nenhum achado. Busca de JWTs em arquivos rastreados: nenhum. Nenhum `.env`, banco ou chave privada rastreado nessa inspeção. `.env` existe e foi lido apenas para enumerar nomes de variáveis. Essa busca por padrões não é uma análise completa do histórico Git ou detector universal de segredos.

## 8. Falhas e testes não executados

A falha inicial foi `post-match XP card...`, em `tests/maxpass-ui.test.cjs`: duas chamadas distintas a Date.now podiam produzir `0d 23h 59m` em vez de `1d 0h 0m`. O teste agora usa um instante único e verifica também a passagem de 1 ms; a implementação visual não mudou.

O stress isolado falhou uma vez no código anterior (`node .work/fortaleza-benchmark-baseline/scripts/network-stress.cjs`) e uma vez no código corrente antes de F13 (`node scripts/network-stress.cjs`), ambos com `decodeErrors: 1`. Uma execução instrumentada intermediária passou, caracterizando intermitência. O teste `node --test --test-name-pattern="a fresh connection" tests/security-fortaleza.test.cjs` reproduziu deterministicamente a causa antes de F13: primeiro pacote delta sem snapshot. Esses resultados não foram ocultados nem o decoder/teste de carga foi relaxado para aceitar a falha.

Após F13, o teste direcionado e o stress final passaram. A primeira execução de stress concorria com a suíte completa e mediu p95 de 166,6 ms e ping de 1.134 ms; não serve para comparar desempenho. Como a linha de base isolada falhou, não é possível atribuir um percentual de melhoria. O p95 final de 19,64 ms ainda excede o orçamento de 16,67 ms para 60 Hz: o teste confirma os cenários funcionais exercitados, mas não comprova capacidade de produção nem 60 Hz sustentados na lotação configurada.

Não executados: testes contra produção/staging remoto, validação de configuração real de RLS/Auth/WAF, compra real Cakto, compilação/assinatura de APK release, pentest externo, carga destrutiva, restauração de backup real do proprietário e auditoria completa do histórico Git. Nenhum desses itens foi apresentado como aprovado.

## 9. Riscos residuais e limites

- **Alta — infraestrutura:** a segurança depende de uma instância Node com SQLite persistente. Vercel com `/tmp` não é armazenamento durável nem ambiente adequado para a economia/multiplayer completos. A implantação real não foi verificada.
- **Alta — operação:** backups reais, acesso ao disco, criptografia, MFA do provedor, recuperação de contas e alertas externos não foram verificados. O novo utilitário foi restaurado apenas com dados fictícios. O BFF atual não possui desafio/verificação de segundo fator para administradores; ativar MFA apenas no painel de hospedagem não acrescenta MFA às rotas do jogo.
- **Média — sessões:** logout/ban locais são aplicados no HTTP e em até cerca de 1 s no WS, sujeito ao event loop. Revogação exclusivamente no Supabase depende do próximo contato com o provedor/expiração do access token, até 1 h no BFF; não há consulta remota por movimento.
- **Média — fraude comportamental:** servidor autoritativo bloqueia placares/coordenadas arbitrários, mas não elimina bots que enviam comandos legais, conluio, contas múltiplas ou combinação de resultados. MaxPass possui atividade, duração, cooldown e teto diário; progressão legada e classificação ainda precisam de análise longitudinal e política antifraude. Nenhum banimento automático por heurística foi adicionado.
- **Média — identificação por IP:** limites usam remoteAddress e deliberadamente não confiam em X-Forwarded-For enviado pelo usuário. Atrás de proxy, usuários podem compartilhar a cota do proxy. Limites por conta continuam separados; proteção por IP real deve ser configurada na borda.
- **Média — dados:** tokens externos e segredo do webhook permanecem no banco privado conforme a arquitetura atual. Proteja banco/backups, defina retenção e procedimento de exclusão. Política comercial por e-mail confirmado e ADMIN_EMAILS devem ser revisadas ao remover administradores; rebaixar só o banco não remove a política de promoção no próximo login.
- **Média — pagamentos:** estorno anterior à aprovação retorna erro e requer reentrega; conferência de entrega/reconciliação deve acompanhar o painel Cakto. Não houve teste de entrega real, assinatura adicional de provedor ou reconciliação com API financeira.
- **Baixa — autenticação local:** não há recuperação de senha, troca de senha ou verificação de e-mail local implementadas; não foram inventados fluxos sem provedor de entrega. Cadastro local existente revela indisponibilidade de um nome de usuário. CAPTCHA e limites globais de criação de contas dependem da operação/provedor.
- Agregação de eventos de falha é em memória: reinício pode perder contagens não exportadas. Não inclui payloads nem identificadores de usuário; investigação individual usa as auditorias específicas de ações e suporte.

## 10. Configurações externas do proprietário

1. Publicar somente após revisão em staging; manter disco e DATABASE_PATH atuais. Não copiar `.env` para assets, imagens públicas, APK ou Git. Verificar HTTPS/PUBLIC_ORIGIN exata e executar uma réplica.
2. Confirmar aplicação dos dois SQL Supabase existentes e RLS/permissões com contas de teste. Conferir confirmação de e-mail, limites Auth, regras de senha, MFA administrativo e política de revogação. A API do BFF verifica identidade no provedor, não apenas decodifica JWT. [Sessões Supabase](https://supabase.com/docs/guides/auth/sessions).
3. Configurar limites por IP real e DDoS/WAF no proxy/CDN do provedor, cobrindo `/api/auth/*`, `/api/*` e upgrade `/ws`; não habilitar confiança irrestrita em cabeçalhos de proxy. Os limites por processo não substituem mitigação de rede.
4. Validar evento Cakto de staging, segredo, seis ofertas de gemas e oferta exclusiva do MaxPass. Conferir reentregas, valores, estornos e conta recebedora. O mecanismo documentado é chave secreta compartilhada; não é HMAC do corpo. [Webhooks Cakto](https://ajuda.cakto.com.br/pt-br/articles/1-como-funcionam-os-webhooks-na-cakto-guia-completo).
5. Restringir permissões de leitura de banco/backups a operadores; criptografar armazenamento e cópias externas, habilitar MFA das contas operacionais e definir retenção. No Windows, ACLs devem ser configuradas pelo operador; chmod 0600 não equivale a ACL exclusiva.

## 11. Dependências e cadeia de fornecimento

Auditoria npm não encontrou vulnerabilidades conhecidas; não há atualização de dependência exigida por esse resultado. Produção: ws; desenvolvimento: jsdom e PGlite. O lockfile examinado não sinaliza scripts de instalação. Licenças declaradas: MIT, MIT-0, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, BlueOak-1.0.0 e CC0-1.0; isso não é parecer jurídico nem auditoria da autoria dos assets.

O pipeline Android mantém permissões contents:read e agora fixa suas seis actions por commits obtidos dos repositórios oficiais, preservando as versões principais existentes. A compilação invoca o GradleWrapperMain pelo Java 17 configurado no workflow, aplicando o distributionSha256Sum já existente. Foram conferidos os hashes oficiais da [distribuição Gradle 8.11.1](https://services.gradle.org/distributions/gradle-8.11.1-bin.zip.sha256), `f397b287023acdba1e9f6fc5ea72d22dd63669d59ed4a289a29b1a76eee151c6`, e do [JAR do wrapper](https://services.gradle.org/distributions/gradle-8.11.1-wrapper.jar.sha256), `2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046`. Os hashes coincidem com a configuração e o arquivo local. O workflow remoto e o APK release não foram executados nesta auditoria; revisar atualizações das actions antes de trocar os commits fixados.

## 12. Monitoramento, backup e manutenção

Limites configuráveis em `.env.example`: MAX_ROOMS=100, MAX_CONNECTIONS=1000, WS_ACCOUNT_HANDSHAKES=30/min, WS_IP_HANDSHAKES=1200/min, WS_MESSAGES_PER_SECOND=90, API_ACCOUNT_PER_MINUTE=300, ROOM_OPERATIONS_PER_MINUTE=30. Mensagens normais do cliente ficam em até aproximadamente 30 Hz; não houve redução do tick físico. Handshakes incluem reconexões; ajustar limites com telemetria de jogadores legítimos.

Exportar `security_event`/`security_summary` para o coletor do provedor, com retenção limitada. Alertar para aumento sustentado de LOGIN/SESSION/FORBIDDEN/WS_INVALID_MESSAGE/WS_UPGRADE_RATE/INTERNAL e falhas da outbox; cruzar com CPU, memória, disco livre, p95 de tick e atraso de pagamentos. O coletor e os alertas não foram criados remotamente. Agregação local emite primeiro evento e contagens suprimidas a cada 60 s.

Backup explícito para destino novo, fora das pastas públicas, com diretório previamente criado e acesso restrito:

```powershell
node scripts/security-backup.cjs CAMINHO_DO_BANCO.sqlite DIRETORIO_PRIVADO/backup-NOVO.sqlite
```

O utilitário abre a origem em modo somente leitura, usa a API de backup SQLite para incluir WAL, verifica integrity_check, foreign_key_check e saldo versus última transação, e publica somente após essas verificações. Não sobrescreve destino existente. Não configura agendamento/cópia externa e não restaura produção. [API SQLite backup do Node](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsourceDb-path-options).

Reconciliar saldos inconsistentes por investigação/auditoria; não ajustar saldos automaticamente. Testar restauração em diretório e processo isolados: confirmar contas, inventários, compras, saldos e histórico; manter webhooks e sincronização externa desligados durante o ensaio. Para restauração real, planejar reconciliação de pedidos posteriores ao snapshot e invalidar sessões restauradas antes da reabertura, sob autorização do operador.

Reexecutar testes e npm audit em cada release; revisar limites com métricas, permissões administrativas e restaurações periodicamente. Rotacionar segredo exposto no provedor e invalidar sessões pertinentes; excluir arquivo do Git não revoga credencial.

## 13. Reversão

Não usar `git reset --hard` ou `git restore` indiscriminados: existem alterações anteriores do proprietário. Comparar cada arquivo com sua cópia em `.work/fortaleza-before/` e reverter somente o diff desta auditoria, preservando edições posteriores. Os novos módulos/testes/documentos podem ser removidos apenas depois de remover suas referências. Reiniciar em staging e repetir testes antes do rollout.

Não há migração a desfazer. Sessões antigas expulsas/expiradas exigem novo login; não devem ser recriadas. Correção de abandono afeta novos encerramentos, não reescreve resultados históricos. Backups gerados são arquivos novos e nenhuma restauração automática é executada. Reverter o código de segurança reintroduz as falhas descritas.

## 14. Próximos passos priorizados

1. Revisar as correções locais e os resultados registrados na seção 7; executar o workflow Android no GitHub antes de distribuir um novo APK. Regressão local, testes direcionados e stress final estão concluídos.
2. Validar implantação em staging, capacidade real da máquina, borda/proxy e configuração Auth/RLS.
3. Executar backup/restauração com cópia autorizada de dados reais; instituir agenda e armazenamento externo protegido.
4. Validar entrega Cakto, alertas e reconciliação operacional; revisar credenciais e política administrativa.
5. Endurecer progressão legada contra conluio/farming com métricas e regras de elegibilidade revisadas; definir recuperação de conta, retenção/exclusão e rotina de revisão de denúncias.
