# MAXBALL

Futebol arcade em Canvas 2D, com carreira, contas, economia, administração e partidas online calculadas pelo servidor. O jogo e o save offline originais foram preservados.

## Executar

Requer Node.js **24.14 ou superior**.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd start
```

Abra **http://127.0.0.1:5173**. As migrations são aplicadas automaticamente em `var/maxball.sqlite`. Use a origem indicada no terminal: `localhost` e `127.0.0.1` são diferentes.

`AUTH_PROVIDER=local` permite testar sem credenciais externas. Para Supabase, siga [CONFIGURACAO.md](docs/CONFIGURACAO.md). Somente offline: abra `index.html` ou use `npm.cmd run start:offline`.

## Jogar

- **Jogar** abre o ranqueado: fila real, 4 × 4, um humano e três bots por equipe, 3 minutos. São necessárias duas contas conectadas.
- **Carreira**: nome, número, clube, temporadas, liga, copa, continental e mundial conforme classificação; ofertas, transferências, títulos, prêmios e galeria.
- **Online**: salas e partidas rápidas sem Elo.
- **Gemas / Conta**: compras, inventário, equipamentos, perfil e sessão.
- **Jogar contra bots, Treinar, Sala e 2 jogadores** preservam os modos locais.

WASD/setas movem; F/Espaço chutam; G passa. Na carreira, **Q pede passe** e **R pede chute ao gol**, também disponíveis em botões na tela. O companheiro precisa alcançar a bola e se alinhar para executar o pedido. Jogadores atravessam as linhas até a margem externa do gramado; a bola permanece nas bordas e gols.

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

Documentação: [configuração](docs/CONFIGURACAO.md), [implementação](docs/IMPLEMENTACAO.md), [validação](docs/VALIDACAO.md), [auditoria histórica](docs/AUDITORIA.md).

Pendências externas: credenciais/projeto Supabase, hospedagem pública e revisão visual/áudio em navegador e celular físico.
