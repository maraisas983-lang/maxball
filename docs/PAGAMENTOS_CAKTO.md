# Configurar gemas pela Cakto

1. Entre com uma conta ADMIN ou OWNER e abra **Jogar → Command Center → Pagamentos**.
2. Na Cakto, crie quatro ofertas: 50, 120, 500 e 1.200 gemas. Cada oferta precisa de um ID próprio.
3. Preencha o preço em reais, ID da oferta e link `https://pay.cakto.com.br/...` de cada pacote no painel MAXBALL.
4. Clique **Gerar / substituir chave do webhook**. Copie a chave exibida para a configuração do webhook da Cakto. Gerar outra chave invalida a anterior.
5. Use a URL de webhook exibida no painel. Em produção, ela precisa apontar para o servidor público HTTPS do jogo. `localhost` funciona apenas para testes locais.
6. Ative os eventos `purchase_approved`, `refund` e `chargeback` na Cakto. A assinatura é o campo `secret` enviado no corpo do webhook.
7. Salve a configuração e marque **Liberar compras** quando as quatro ofertas e o webhook estiverem preenchidos.

É possível salvar a configuração incompleta com compras desligadas. Chaves existentes ficam ocultas; deixar o campo vazio mantém a chave atual. Preços e links são configurados pelo painel, sem editar `.env` ou código.

## Entrega e estorno

O jogador precisa entrar com e-mail confirmado no Supabase e usar esse mesmo e-mail no checkout. O servidor confere segredo, oferta, valor e estado pago antes de creditar. O ID do pedido impede entrega repetida, mesmo quando a Cakto reenviar o evento. A loja mostra histórico e situação das compras.

Um estorno remove as gemas disponíveis. Se já foram gastas, a diferença fica pendente, bloqueia novas compras de itens e é descontada dos próximos créditos. O histórico mantém o pedido estornado. Uma aprovação tardia do mesmo pedido não credita novamente.

Webhooks de outros eventos são ignorados. Um estorno recebido antes da aprovação retorna erro para permitir nova tentativa. A chave do Supabase continua exclusivamente no servidor.

Validação automatizada cobre configuração administrativa, e-mail confirmado, segredo inválido, preço incompatível, duplicidade, estorno, créditos posteriores e troca de chave. Um pagamento real e a entrega pela infraestrutura da Cakto ainda dependem das ofertas e do webhook configurados pelo administrador.

Referências: [webhooks da Cakto](https://ajuda.cakto.com.br/pt-br/articles/1-como-funcionam-os-webhooks-na-cakto-guia-completo), [payload de pagamento único](https://cakto-dece4a15.mintlify.app/webhooks/pagamento-unico).
