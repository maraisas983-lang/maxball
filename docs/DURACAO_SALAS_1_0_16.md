# Duração de cada tempo nas salas — 1.0.16

Ao criar uma sala personalizada ou salvar suas configurações antes da partida, escolha **Duração de cada tempo**: 1, 3, 5 ou 10 minutos.

Com **Intervalo: Ligado — dois tempos**, o valor vale para cada metade. Dez minutos significa 10 + 10 minutos de jogo. Com **Desligado — tempo único**, a partida tem apenas a duração selecionada. O cabeçalho informa explicitamente o formato escolhido.

Salas já existentes mantêm a duração total anterior, inclusive valores fora dos novos atalhos. Pedidos antigos da API continuam usando `time` como duração total em segundos; seu limite foi ampliado de 600 para 1200 para permitir dois tempos de dez. As regras fixas de amistosos, campeonatos e ranqueadas não foram alteradas.

## Verificação

Passaram 12 testes de salas, permissões, coleções e duração. Os novos testes verificam criação e edição, limite máximo, preservação de alterações inválidas, intervalo após dez minutos, encerramento após o segundo tempo e compatibilidade com tempo único e API antiga. A sintaxe foi verificada em 209 arquivos.

O roteiro `scripts/qa-room-duration.cjs` verifica no navegador com toque em 740 × 360: criar dois tempos de dez minutos, editar para cinco e selecionar tempo único de dez. A captura fica em `docs/qa-1.0.16/duration-mobile.png`.

APK 1.0.16, código 17, assinado para testes. A validação em aparelho físico continua pendente.
