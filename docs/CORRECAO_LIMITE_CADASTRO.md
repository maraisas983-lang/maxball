# Limites de cadastro e login

O relato foi de erro por excesso de tentativas em um APK diferente do distribuído pelo projeto. Não foi possível identificar o código exato da resposta desse APK. Portanto, os problemas abaixo foram reproduzidos no código e em ambiente local; não comprovam qual deles bloqueou a conta relatada.

## Correções

- A aplicação usava `req.socket.remoteAddress` para limitar todas as tentativas. Atrás de um proxy, isso pode agrupar jogadores diferentes na cota do mesmo proxy. O processo em produção no Render (`NODE_ENV=production`, `RENDER=true`) passa a usar o último IP válido de `X-Forwarded-For`, anexado pela entrada confiável. Outros ambientes continuam usando o socket. Cabeçalhos inválidos voltam ao socket; prefixos enviados pelo cliente não selecionam a identidade.
- As cotas existentes por IP e por conta foram preservadas. Bloqueios locais retornam `Retry-After` e o tempo restante na mensagem, sem classificar todo bloqueio como senha inválida.
- Login e cadastro compartilham uma trava na interface. Durante uma requisição, tocar nos botões ou enviar o formulário novamente não inicia outro pedido.
- O erro Supabase `over_email_send_rate_limit`, nos campos `code` ou `error_code`, recebe a identificação `AUTH_EMAIL_RATE_LIMIT`. O aviso explica que o limite é de e-mails de confirmação. Outros erros 429 continuam identificados separadamente. O `Retry-After` do provedor é preservado quando informado; cadastro nunca é repetido automaticamente.

## Validação

30 testes passaram: `auth-limits`, `login-errors`, `persistent-login`, `security-fortaleza` e `portal`. Incluem 13 clientes atrás do mesmo proxy sem bloqueio coletivo, bloqueio da 13ª tentativa do mesmo IP, bloqueio da nona tentativa da mesma conta mesmo trocando IP, expiração da janela e tratamento das duas variantes de erro do provedor.

`node scripts/qa-auth-limits.cjs` passou no Edge com viewport mobile 740 × 360 e identificação Android. Repetição de toque, envio do formulário e `requestSubmit` durante um cadastro pendente geraram um único cadastro e nenhum login. A mensagem específica de limite de e-mails ficou visível. Evidências: `qa-auth-limits/result.json` e `qa-auth-limits/email-limit.png`.

Todos os pedidos de cadastro dos testes usam banco em memória e provedor simulado. Nenhuma conta ou e-mail real foi criado. Não houve teste em aparelho Android físico. Física, multiplayer e parâmetros de jogabilidade não foram modificados.

## Limites externos

Um bloqueio imposto pelo Supabase não pode ser removido por essa alteração. O provedor documenta limites próprios de autenticação e envio de e-mails; eventuais ajustes de SMTP/limites exigem configuração administrativa do projeto. Não foram alterados SMTP, confirmação de e-mail ou configurações de produção.

Referências: [limites do Supabase](https://supabase.com/docs/guides/auth/rate-limits), [códigos de erro](https://supabase.com/docs/guides/auth/debugging/error-codes), [discussão sobre o cabeçalho no Render](https://feedback.render.com/features/p/send-the-correct-x-forwarded-for).
