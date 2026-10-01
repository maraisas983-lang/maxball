# MAXBALL

Jogo de futebol arcade em JavaScript e Canvas 2D. A base existente foi preservada e está sendo refatorada em etapas.

## Jogar

Abra `index.html` no navegador, mantendo `src/` e `styles/` ao lado dele. Para desenvolvimento, use Node.js 22 ou superior:

```sh
npm start
```

Acesse http://127.0.0.1:5173. O servidor é somente local; encerre com Ctrl+C. Não é necessário instalar dependências. No PowerShell, se a execução de `npm.ps1` estiver bloqueada, use `npm.cmd`.

- Mover: WASD/setas; chute: F/Espaço; passe: G (também E no modo individual).
- Dois jogadores: J1 usa WASD/F/G; J2 usa setas/Enter/barra.
- Celular: modo horizontal, analógico e botões ajustáveis em Controles.
- Modos atuais: bots, treino, dois jogadores locais, sala offline e vestiário.

## Verificar

```sh
npm run check
npm test
```

Os testes usam o runner nativo do Node, armazenamento em memória e DOM/Canvas simulados. Não medem aparência, áudio real ou desempenho do navegador. Veja [validação](docs/VALIDACAO.md) e [auditoria/plano](docs/AUDITORIA.md).

## Organização

- `index.html`: telas e ordem de carregamento.
- `styles/game.css`: estilos existentes.
- `src/legacy/game.js`: jogo original encapsulado; próximo alvo de extrações graduais.
- `src/services/localSaveRepository.js`: validação, migração e gravação local.
- `src/input/inputLifecycle.js`: limpeza de comandos ao perder foco/ocultar página.
- `scripts/serve.cjs`: servidor estático para desenvolvimento.
- `tests/`: persistência, input e regressões do jogo.
- `maxball-codigo-6 (1).txt`: referência original, não utilizada em execução.

## Saves e compatibilidade

A chave `maxball` do localStorage continua sendo usada, na mesma origem do navegador. Antes de regravar um save existente, o adaptador guarda seu conteúdo original em `maxball.backup` se essa chave ainda não existir. Preserve essa cópia antes de tentar qualquer restauração manual.

Saves v2 mantêm saldo e cosméticos válidos; versões antigas recebem uma única vez o bônus de 150 moedas já previsto pelo protótipo, preservando itens válidos. Campos inválidos recebem padrões seguros. Saves de versão superior a 2 são abertos em memória sem gravação. Falha ao ler ou criar backup também impede sobrescrever o original; falha de gravação é informada na interface.

Abrir por `file://` e por HTTP pode usar armazenamentos diferentes. Mantenha a origem habitual para continuar com seu save. Moedas, perfil, lista de amigos e inventário são locais e não representam uma conta ou direitos oficiais online.

## Evolução futura

Backend, login, carreira, gemas oficiais, multiplayer e administração ainda não estão implementados. Não existem variáveis de ambiente, migrations ou serviços a configurar nesta etapa. A auditoria documenta as dependências e a ordem de implementação, incluindo autenticação, banco e economia autoritativa.

Google Fonts é usado para tipografia; o jogo possui fontes de fallback. A validação visual em desktop/mobile está pendente.
