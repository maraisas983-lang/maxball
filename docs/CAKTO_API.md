# Configuração da API Cakto

Atualizado em 10/10/2026.

As credenciais foram configuradas no `.env` local privado, com as variáveis `CAKTO_CLIENT_ID` e `CAKTO_CLIENT_SECRET`. O arquivo é ignorado pelo Git. Nenhum valor foi incluído em documentação, código público ou APK. Na hospedagem, configure essas mesmas variáveis no ambiente do backend e reinicie o serviço.

O cliente em `server/services/cakto.cjs` segue a [autenticação oficial](https://docs.cakto.com.br/authentication): POST para `https://api.cakto.com.br/public_api/token/` com formulário. O token permanece em memória, é reutilizado até próximo da expiração e sua obtenção é compartilhada entre consultas concorrentes. Requisições têm timeout, não seguem redirects e erros não devolvem respostas brutas ou credenciais do provedor.

## Resultado real

`npm run check:cakto` autenticou com sucesso. A consulta GET de ofertas retornou HTTP 403. Para consultar ofertas, a chave precisa dos escopos `read` e `offers` no painel Cakto → Integrações → Cakto API. Se o painel exigir uma nova chave, substitua os dois valores no `.env`; nunca use o Client Secret como chave do webhook.

O Command Center → Pagamentos mostra se as credenciais estão configuradas e oferece “Consultar ofertas na Cakto”. A consulta `/api/command/payments/cakto` exige a identidade comercial confirmada da proprietária, limita consultas e entrega somente campos do catálogo. A primeira página mostra até 50 ofertas; o endpoint também aceita `?page=2`, etc. A API do servidor não disponibiliza criação de cobranças, saques ou alterações remotas por essa integração.

## Para concluir a liberação das compras

1. Habilitar `read` e `offers` na chave e repetir `npm run check:cakto`.
2. Associar cada um dos seis pacotes de gemas à oferta correta e ao checkout correspondente no painel de pagamentos; conferir preços. Configurar o MaxPass na oferta própria da temporada.
3. Usar uma origem HTTPS publicada para o backend. O webhook será `https://SEU-DOMINIO/api/payments/cakto/webhook`.
4. Configurar na Cakto a chave de webhook gerada pelo painel do jogo e os eventos já tratados: aprovação, reembolso e chargeback.
5. Validar entrega e idempotência em ambiente de teste antes de liberar compras. O APK offline não recebe pagamentos/webhooks; a edição online precisa apontar para esse backend HTTPS.

Não houve criação de produtos, ofertas, cobranças ou webhooks remotos nesta configuração. Autenticar a API não ativa automaticamente os links de compra existentes.

## Testes

13/13 testes aprovados em `tests/cakto-api.test.cjs`, `tests/commerce-android.test.cjs` e `tests/social-payments-saves.test.cjs`. Incluem cache/expiração de token, concorrência, renovação após 401, erros sem vazamento, isolamento da proprietária, valores/idempotência/estornos e exclusão de arquivos privados do pacote Android.
