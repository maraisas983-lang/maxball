# MAXBALL

Futebol arcade em Canvas 2D, com carreira, contas, economia, administração e partidas online calculadas pelo servidor. O jogo e o save offline originais foram preservados.

## Executar

Requer Node.js **24.19.x** (versão 24, a partir de 24.19.0).

```powershell
npm.cmd install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd start
```

Abra **http://127.0.0.1:5173**. As migrations são aplicadas automaticamente em `var/maxball.sqlite`. Use a origem indicada no terminal: `localhost` e `127.0.0.1` são diferentes. O Live Server do VS Code, normalmente na porta 5500, não executa contas nem partidas online; para esses recursos, use `npm.cmd start`.

`AUTH_PROVIDER=local` permite testar sem credenciais externas. Para Supabase, siga [CONFIGURACAO.md](docs/CONFIGURACAO.md). Somente offline: abra `index.html` ou use `npm.cmd run start:offline`.

## Jogar

- **Jogar** abre a seleção de modos. Cada destino possui lobby e identidade visual próprios, incluindo Suporte.
- **Ranqueada**: grupos de até quatro, formatos 1v1–4v4, prontidão, convites, busca e cancelamento. São necessários dois grupos conectados; com Supabase, grupos com mais de um integrante exigem a migração `002_ranked_parties.sql`.
- **Carreira**: até 12 saves independentes, nome, número, clube, tempo e dificuldade; temporadas, liga, copa, continental e mundial conforme classificação; ofertas, transferências, títulos, prêmios e galeria.
- **Sala personalizada**: nome/senha opcional, anfitrião, arraste de participantes, espectadores, técnicos com chat separado, árbitro organizador, equipes, impedimento, prorrogação e disputa de pênaltis por empate.
- **Clubes**: criar uniforme por cores, salvar na conta e escolher em Meus Clubes. Categorias Brasileirão e Mamoball disponíveis nas salas.
- **Gemas / Conta**: compras, inventário, equipamentos, emotes, perfil e sessão. A Cakto é configurada pelo administrador em Command Center → Pagamentos.
- **Treino / Local**: prática livre sem cronômetro, bots opcionais e dois jogadores no mesmo teclado, disponíveis sem login.

WASD/setas movem; F/Espaço chutam; G/E passam. Em dois jogadores, os padrões são F/G para J1 e Enter/barra para J2. Escolha suas teclas em **Controles → Teclas no PC**, ou na engrenagem durante a partida; ficam salvas neste navegador. Na carreira, **Q pede passe** e **R pede chute ao gol**, também disponíveis em botões na tela. O companheiro precisa alcançar a bola e se alinhar para executar o pedido. **T** abre o chat durante partidas online; **Esc** fecha. Jogadores atravessam as linhas até a margem externa do gramado; a bola permanece nas bordas e gols.

A velocidade base do jogador é de 180 unidades/s. Ao soltar o controle, a velocidade real zera. A bola tem condução mais pesada, chute de 430, passe de 340 e limite de 480 unidades/s. O replay do gol identifica autor e assistência. No resultado, assista aos melhores momentos ou saia andando pelo túnel até o vestiário. Use **Partida**, no canto superior direito, para pausa com retomada em 3, 2, 1 e substituições de espectadores nas salas personalizadas. Veja [Vestiário e substituições](docs/VESTIARIO_E_SUBSTITUICOES.md) e [Confirmação de trocas e bots separados](docs/SUBSTITUICOES_E_BOTS.md).

Elo inicial: 1000; K=32. Busca: ±100, ±200 após 10 segundos e ±400 após 20 segundos. Sair gera derrota; desconexões permitem 20 segundos para reconectar. Reinício do servidor cancela partidas sem alterar Elo.

## Administração

Crie uma conta e execute uma vez no servidor:

```powershell
npm.cmd run admin -- nome_da_conta
```

Com Supabase, passe o UUID. Entre novamente para acessar Admin. Sem senha administrativa padrão. O bootstrap só funciona antes do primeiro SUPER_ADMIN. Ações exigem permissão e justificativa e geram auditoria.

## Verificar e operar

```powershell
npm.cmd run check
npm.cmd test
```

Testes de simulação, HTTP, WebSocket, interface jsdom, SQLite e SQL/RLS em PostgreSQL via PGlite. jsdom/PGlite são dependências de desenvolvimento. Produção: `npm.cmd ci --omit=dev`.

Execute **uma instância Node** com disco persistente. SQLite guarda carreira, economia, permissões e sessões. Supabase opcional verifica identidades e guarda perfis e resultados ranqueados; resultados pendentes ficam numa fila persistente de sincronização. Não apague o SQLite depois de conectar Supabase.

O save offline mantém `maxball` e `maxball.backup`. Moedas e cosméticos locais não concedem direitos online. Contas usam scrypt ou Supabase Auth, cookie HttpOnly, CSRF e transações para compras/resultados.

Documentação: [revisão de todos os pedidos e estado atual](docs/REVISAO_FINAL.md), [configuração](docs/CONFIGURACAO.md), [deploy](docs/DEPLOY.md), [jogabilidade](docs/JOGABILIDADE_RESPONSIVA.md), [imersão e desempenho](docs/IMERSAO_E_DESEMPENHO.md), [auditoria histórica](docs/AUDITORIA.md).

Para medir a física: `node scripts/physics-benchmark.cjs`. `npm.cmd run check:supabase` verifica a instalação externa sem imprimir credenciais. O teste local não publica o jogo no Render. Consulte a revisão final para o estado da migração dos grupos e da hospedagem.

## Estádios e comunidade

Escolha entre cinco estádios nas salas, na carreira e nos modos locais. A entrada apresenta a escalação com nomes e skins do time. **Criar skins** abre o editor de cores e camadas; aplique as skins aos clubes. Clubes públicos e privados recebem vários integrantes. **Campeonatos** permite propostas e inscrições por clube, com aprovação no Command Center e entrada grátis ou taxa em gemas. Veja [Como usar](docs/ESTADIOS_SKINS_E_CAMPEONATOS.md).
