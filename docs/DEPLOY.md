# Deploy MAXBALL

## Render (recomendado para o jogo completo)

1. Crie um **Blueprint** no Render apontando para este repositório. O arquivo `render.yaml` cria o serviço Node, a rota de health check e um disco persistente para o SQLite.
2. Troque `PUBLIC_ORIGIN` pela URL final do serviço (por exemplo, `https://maxball.onrender.com`) e salve `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` no painel. O Blueprint usa `AUTH_PROVIDER=supabase` para entrar com e-mail. Se deixar `PUBLIC_ORIGIN` vazio, o servidor usa automaticamente `RENDER_EXTERNAL_HOSTNAME` no Render.
3. Use a branch **develop/maxball**, que contém as atualizações do jogo. O Render executa `npm ci --omit=dev` e `npm start`, usando Node **24.19.0**.

O Render é a opção completa porque mantém o processo Node ativo, aceita WebSocket e tem disco persistente para carreira, contas e economia.

## Vercel (frontend e API HTTP)

O `vercel.json` e `api/index.cjs` permitem publicar uma instância HTTP. Configure `PUBLIC_ORIGIN` com a URL exata do deployment e, se necessário, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `ADMIN_EMAILS` no painel da Vercel.

A Vercel não mantém WebSocket nem disco persistente. Portanto, salas online e dados locais ficam limitados ao ciclo de vida da função. Para produção, publique o servidor no Render e use a Vercel apenas para o frontend quando essa separação for necessária.

## Variáveis mínimas no Render

```text
NODE_ENV=production
NODE_VERSION=24.19.0
HOST=0.0.0.0
PUBLIC_ORIGIN=https://seu-servico.onrender.com
DATABASE_PATH=/opt/render/project/src/var/maxball.sqlite
AUTH_PROVIDER=supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=configure-no-painel
SUPABASE_SECRET_KEY=configure-no-painel
```

## Serviço já existente com erro

Em **Settings → Build & Deploy**, confira:

- Branch: `develop/maxball`.
- Root Directory: vazio (raiz do repositório).
- Build Command: `npm ci --omit=dev`.
- Start Command: `npm start`.

Em **Environment**, defina `NODE_VERSION=24.19.0`, `NODE_ENV=production` e `HOST=0.0.0.0`.
Uma variável `NODE_VERSION` antiga no painel tem prioridade sobre `.node-version` e `package.json`.
Deixe `PUBLIC_ORIGIN` vazio para usar o endereço fornecido pelo Render, ou informe a URL HTTPS exata do serviço/domínio, sem colchetes.
Para entrar com as contas do Supabase, use `AUTH_PROVIDER=supabase` e as chaves já configuradas no painel. `AUTH_PROVIDER=local` aceita apenas o usuário do cadastro local: ao enviar um e-mail, retorna “Usuário inválido” antes de verificar a senha. As contas locais e as contas Supabase são sistemas diferentes; não crie outra conta para contornar esse erro.
Se o serviço não for gerenciado por um Blueprint sincronizado, alterar `render.yaml` no GitHub não troca a variável do serviço existente: edite `AUTH_PROVIDER` em **Environment** e aplique **Save, rebuild, and deploy**. Se usar Blueprint, sincronize a alteração. As chaves marcadas com `sync: false` precisam existir no painel; não são copiadas do arquivo `.env` do computador.
Mantenha o disco existente e seu `DATABASE_PATH`; não exclua o banco para corrigir o deploy.

Depois use **Manual Deploy → Clear build cache & deploy**.
O log de sucesso contém `event: listening`, `host: 0.0.0.0` e a porta atribuída pelo Render; `/api/health` responde `{"ok":true}`.
Se ainda falhar, copie as últimas linhas do deploy, incluindo a primeira mensagem de erro. A falha pode ocorrer na instalação, na inicialização ou nas migrações; o log identifica qual etapa precisa ser corrigida.

Referências: [versão do Node e prioridade das configurações](https://render.com/docs/node-version), [porta e host do serviço](https://render.com/docs/web-services), [disco persistente](https://render.com/docs/disks).

Diagnóstico de 11/10/2026: `https://maxball.onrender.com/api/config` respondeu `authProvider: local`, embora a entrada desejada seja por e-mail. O Blueprint foi corrigido para Supabase. Após o deploy, essa rota precisa responder `authProvider: supabase`; só então o formulário e o servidor estarão configurados para o e-mail. Referência: [variáveis nos Blueprints](https://render.com/docs/blueprint-spec#setting-environment-variables).
