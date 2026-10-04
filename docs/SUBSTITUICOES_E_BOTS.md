# Substituições, movimento e bots

## Substituições na sala personalizada

1. Abra **Partida**, no canto superior direito, e pause a partida.
2. No painel dos times e espectadores, selecione quem sai e depois o espectador que entra. Você pode preparar trocas nos dois times.
3. Use **Desfazer** para retirar uma troca ou **Revisar substituições** para conferir a lista.
4. Na tela de confirmação, escolha **Voltar e editar** ou **Confirmar todas as trocas**.
5. Aguarde as animações e use **Retomar · 3, 2, 1**.

Preparar, revisar ou fechar o painel não altera o elenco no servidor. A confirmação envia um único pedido com todas as trocas. O servidor verifica permissões, pausa, participantes e duplicidades antes de aplicar qualquer troca. Se a sala mudou enquanto o painel estava aberto, o pedido é rejeitado.

As animações acontecem em sequência, com o relógio parado. O humano que sai passa a espectador; os participantes anteriores continuam registrados no resultado. Anfitrião e árbitro mantêm as permissões existentes. As cores dos times, cartões e destaque verde seguem a identidade MAXBALL. Em telas estreitas, os espectadores aparecem abaixo dos dois times.

## Velocidade e rotação da bola

- Velocidade base do personagem: **160 unidades/s**, antes 140. Soltar o controle continua zerando a velocidade real imediatamente.
- A bola conserva **57%** da velocidade após um segundo de rolagem acima de 45 unidades/s, antes 38%. A amortização adicional abaixo desse limite também foi reduzida.
- Chute de 350, passe de 275, limite da bola de 400 e massa de 1,8 permanecem na configuração compartilhada.
- A orientação da bola é calculada pelo deslocamento real, inclusive durante os contatos com personagens. Mudar de direção muda o eixo de rotação; a bola parada não gira.
- Rede e replay interpolam a orientação pelo caminho mais curto. A aparência utiliza a geometria existente e um cache limitado a 96 imagens.

## Bots fora do processamento principal

`server/online/bot-worker.cjs` executa as decisões táticas em um worker Node separado. `server/online/bots.cjs` coordena os pedidos e entrega os comandos à física. Um worker atende as partidas online e calcula decisões a 10 Hz, com no máximo um pedido pendente por partida.

A física, as colisões, os gols e os resultados continuam calculados pelo servidor principal. Clientes não controlam os bots. Comandos antigos são descartados após 400 ms ou quando muda a fase, o lado, a pausa ou o elenco. Uma interrupção do worker suspende esses comandos e permite recriá-lo; não transfere o cálculo tático para o processamento principal. Os modos locais continuam usando a lógica compartilhada no navegador.

## Execução

Essas mudanças não exigem migração SQL. Para carregar o código online atualizado, reinicie o servidor Node e abra `http://127.0.0.1:5173`, usando **Ctrl + F5**. Os arquivos estáticos atualizados não reiniciam um servidor que já estava aberto.

A migração anterior do ranqueado em grupo e a verificação de publicação no Render continuam dependendo dos acessos descritos em [Revisão final](REVISAO_FINAL.md).

## Verificação desta rodada

A suíte completa passou com 150 testes, incluindo física e contato, parada imediata, orientação da bola, replay, fila de substituições, confirmação e descarte do rascunho, permissões e recuperação do worker. Foram testadas quatro partidas simultâneas com dez jogadores cada no mesmo worker. Isso verifica funcionamento e isolamento; não representa uma medição de capacidade de produção.

No Edge, o painel foi verificado em 1100 × 720 e 390 × 844, com trocas nos dois times, revisão, retorno para editar e envio somente após confirmar. Não ocorreram erros de JavaScript.

## Ajuste de força e velocidade

A configuração atual usa personagem a 180 unidades/s (antes 160), chute de 430 (antes 350), passe de 340 (antes 275) e limite da bola de 480 (antes 400). Passes direcionados usam a faixa de 310–380. A condução tem limite de 170, e os bots acompanham o novo ritmo por dificuldade. Soltar o controle continua zerando a velocidade real; a massa e a desaceleração da bola permanecem iguais.
