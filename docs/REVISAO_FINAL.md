# Revisão dos pedidos — MAXBALL

Revisão de 3 de outubro de 2026. Foram confrontados os seis anexos e os pedidos
posteriores com o código, os testes e a configuração disponível. As correções
mais recentes do usuário prevalecem sobre versões anteriores dos pedidos.

## Testar agora

Abra **http://127.0.0.1:5173** neste computador e pressione **Ctrl+F5**.
Se o servidor estiver fechado, execute `npm.cmd start` na raiz do projeto.

1. **Jogar → Treino:** experimente condução, passe, chute, paredes e parada.
   O treino livre permite jogar sem login e sem cronômetro.
2. **Controles → Teclas no PC:** clique em chute ou passe e pressione a tecla
   desejada. Há configurações para J1 e J2; Esc cancela. A engrenagem durante
   a partida oferece os mesmos controles. As escolhas ficam neste navegador.
3. **Carreira:** escolha um save, configure tempo/dificuldade e entre em campo.
   Q pede passe na sua direção; R pede finalização do companheiro.
4. **Gol:** confira comemoração, replay, autor e assistência; o gol contra tem
   indicação própria. A bola deve ficar amortecida na rede.
5. **Sala personalizada:** antes de iniciar, atribua técnicos e árbitro. O árbitro
   organiza jogadores e configurações, além de controlar pausa/retomada.

## Pedidos e implementação

| Pedido | Implementação disponível |
| --- | --- |
| Preservar o jogo | Canvas, menus, modos locais, saves antigos e sistemas existentes preservados; módulos compartilhados entre navegador e Node. |
| Bola com volume | Painéis de bola de futebol, iluminação, sombra e rotação; imagens reutilizadas em um conjunto limitado. |
| Bola menos rápida e com peso | Massa relativa 1,8; condução gradual, limite de condução 132, passe 275, chute 350 e limite da bola 400 unidades/s. Colisões usam velocidade relativa, massa e subpassos. |
| Velocidade do boneco | Base ajustada levemente de 130 para 140 unidades/s conforme o último pedido; soltar o controle zera a velocidade real, com direção diagonal normalizada. |
| Círculo pequeno, sem sensor antigo | Somente no jogador controlado; raio de 31,75–32,5, com desenho e alcance real compartilhados e escala limitada conforme o campo. |
| Limites e gol | Personagens atravessam as linhas até a margem externa; traves e redes têm colisão. A bola respeita as bordas. Gol confirmado ao cruzar completamente a linha, antes de contato posterior com defensor externo. |
| Replay | Histórico limitado, reprodução mais lenta, pular, nome do autor e da assistência, indicação de gol contra e de ausência de assistência. |
| Bots | Formação por função, um perseguidor por equipe, cobertura, faixas de apoio, previsão com atrito/paredes/traves, decisões espaçadas por dificuldade e alcance de passe/chute compatível com a nova física. |
| Área defensiva | Até dois defensores; terceiro bloqueado até liberar vaga, com indicação amarela discreta e geometria proporcional. |
| Lobbies separados | Ranqueada, carreira, treino, local, sala, partida rápida e suporte têm destinos e identidade visual próprios. Home e apresentação usam a estrutura das referências fornecidas. |
| Sala personalizada | Nome, senha protegida, arraste por mouse/toque, anfitrião, espectadores, equipes, regras, formatos 1v1–5v5 e estados sincronizados. Tamanho da bola padronizado. |
| Técnicos e árbitro | Dois postos de técnico fora da física, chat reservado e um organizador. O anfitrião atribui o árbitro; o árbitro move jogadores e altera regras antes de iniciar. Não há juiz NPC correndo em campo. Pausa e contagem congelam física e relógio. |
| Carreira | Até 12 saves isolados, nome/camisa, clubes, elenco, dinheiro, progressão, temporadas, calendário, estatísticas, propostas, transferências, competições, títulos e prêmios, incluindo Bola de Ouro. Tempo e dificuldade por save. |
| Imersão | Entrada mais lenta, escalações, cerimônia visual, cumprimentos, capitães, formação, contagem, intervalo com saída/retorno, variações de comemoração e encerramento. |
| Galeria | Troféus persistentes com temporada, clube e jogador do save correto; cerimônia e detalhes legíveis. O nome geral da conta não substitui o jogador da carreira. |
| Clubes e elencos | 20 clubes do Brasileirão 2026 e 21 times fornecidos do Mamoball; criação de clube e uniforme persistente. Elencos selecionados para adaptação 5v5, fontes e data de referência em `src/data/rosters2026.js`; atributos são valores de equilíbrio do jogo. |
| Ranqueada e grupos | Convites, prontidão, líder, cancelamento, grupos de 1–4, formatos 1v1–4v4, desconexão/reconexão, Elo e notas/MVP calculados no servidor. A ativação externa dos grupos está descrita abaixo. |
| Contas e admins | Login/cadastro, aceite também no servidor, sessão, expiração, autorização e mensagens de erro. Os dois e-mails administrativos solicitados estão na configuração privada do servidor. |
| Suporte e Command Center | Chamados, respostas, categorias/status, permissões OWNER/ADMIN/MODERATOR/SUPPORT, métricas, monitoramento, busca, logs, auditoria, comandos permitidos e moderação. Evidências são links no chamado. |
| Gemas, loja e Cakto | Saldo, compras atômicas, idempotência, inventário, cosméticos, emotes e slots. Preços, checkout, ofertas e webhook configuráveis no painel administrativo, conforme solicitado. |
| Chat | Histórico, nomes, mensagens de sistema, limite, proteção contra spam, texto seguro, mute, chat durante partida com T/Esc e controles neutralizados ao digitar. |
| Desempenho e multiplayer | Simulação autoritária a 60 Hz, snapshots a 20 Hz, comandos até 30 Hz, interpolação, previsão limitada, tratamento de pausa, geometria/rosters/HUD em cache, IA com intervalos, redes em repouso e reutilização dos desenhos. |
| Render/GitHub | Configuração versionada para `develop/maxball`, Node 24.19.0, `npm ci --omit=dev`, `npm start`, health check e disco persistente. A publicação externa não é confirmada por um teste local. |

### Correções feitas nesta revisão

- Teclas de chute e passe configuráveis para os dois jogadores, persistência e
  ajuda que acompanha a escolha, sem alterar controles de toque nem a velocidade.
- Galeria e cerimônia passaram a identificar a carreira vencedora. O backend
  acrescenta jogador/save/clube aos dados já existentes; nenhuma migração nova.
  A cerimônia também foi ajustada para caber em telas com pouca altura.
- Descrição do ranqueado corrigida para os formatos atuais.
- README e configuração corrigidos para Node 24.19 e para os modos atuais.
- Diagnóstico Supabase agora orienta aplicar somente `002_ranked_parties.sql`
  quando a instalação inicial já existe, evitando repetir políticas de `001`.

## Validação

Os registros anteriores de desempenho e dos ensaios com 16 conexões, oito salas,
80 jogadores e quatro reconexões estão em [Imersão e desempenho](IMERSAO_E_DESEMPENHO.md).
Eles medem o ambiente local, sem garantir latência em redes externas.

**131 testes aprovados, zero falhas**, com sintaxe verificada em **108 arquivos**.
As verificações desta revisão cobrem remapeamento local/online, persistência,
controles de toque preservados, identidade dos saves na galeria, segurança de
texto, contas, carreira, economia, sala, ranqueada, WebSocket, física, bots e SQL/RLS.
A verificação no Edge inclui controles em desktop e em 740 × 360, sem erros
JavaScript, além de persistência após recarregar e restauração dos padrões.
A cerimônia de conquista também foi conferida nessas duas resoluções, incluindo
a visibilidade do botão de continuar na tela pequena.

## Estado externo confirmado

### Supabase: migração de grupos ainda ausente

O diagnóstico real respondeu HTTP 200 para Auth, JWKS, perfis, partidas, eventos
e a RPC inicial. `ranked_participants` e `maxball_ranked_version` responderam 404.
Portanto, **a migração `002_ranked_parties.sql` ainda não foi aplicada nesse projeto**.
Ela está implementada, permite repetição e é testada em PostgreSQL via PGlite.

As chaves de API disponíveis não executam DDL. Este ambiente não tem conexão
PostgreSQL nem credencial de gerenciamento Supabase configurada. A instrução
para fazer a migração sozinho foi considerada, mas essa autorização não fornece
o acesso necessário. Grupos com mais de um integrante permanecem bloqueados,
com mensagem clara, para evitar resultados parcialmente registrados.

### Render: publicação não verificada

Branch e comandos estão preparados e testados no projeto. Não há URL do serviço,
logs do deploy ou acesso de gerenciamento Render disponíveis nesta sessão.
O endereço local acima já permite testar; não é um link público. Consulte
[Deploy](DEPLOY.md) para a configuração do serviço existente.

### Cakto: configuração pelo administrador

Preços e links foram deixados no painel por escolha explícita do usuário.
Compras reais ficam desativadas até preencher os dados e ativar a integração.
Não são usados preços ou ofertas inventados.

Substituições manuais e vestiário foram implementados na rodada descrita em
[Vestiário e substituições](VESTIARIO_E_SUBSTITUICOES.md). Clima, controle por gamepad e upload de evidências foram
pedidos somente se já houvesse suporte na base. Os itens descritos como visão
futura nos anexos, como clãs e passe de temporada, não foram ativados nesta entrega.
