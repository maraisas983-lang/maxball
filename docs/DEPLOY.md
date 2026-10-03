# Deploy MAXBALL

## Render (recomendado para o jogo completo)

1. Crie um **Blueprint** no Render apontando para este repositório. O arquivo `render.yaml` cria o serviço Node, a rota de health check e um disco persistente para o SQLite.
2. Troque `PUBLIC_ORIGIN` pela URL final do serviço (por exemplo, `https://maxball.onrender.com`) e salve as variáveis secretas do Supabase no painel, se for usar Supabase.
3. Faça o deploy. O Render executa `npm ci --omit=dev` e `npm start`.

O Render é a opção completa porque mantém o processo Node ativo, aceita WebSocket e tem disco persistente para carreira, contas e economia.

## Vercel (frontend e API HTTP)

O `vercel.json` e `api/index.cjs` permitem publicar uma instância HTTP. Configure `PUBLIC_ORIGIN` com a URL exata do deployment e, se necessário, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `ADMIN_EMAILS` no painel da Vercel.

A Vercel não mantém WebSocket nem disco persistente. Portanto, salas online e dados locais ficam limitados ao ciclo de vida da função. Para produção, publique o servidor no Render e use a Vercel apenas para o frontend quando essa separação for necessária.

## Variáveis mínimas no Render

```text
NODE_ENV=production
HOST=0.0.0.0
PUBLIC_ORIGIN=https://seu-servico.onrender.com
DATABASE_PATH=/opt/render/project/src/var/maxball.sqlite
AUTH_PROVIDER=local
```
