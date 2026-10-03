# Auditoria da evolução do MAXBALL

Cliente JavaScript/canvas com simulação local a 60 Hz. O servidor Node compartilha
movimento, bola, contatos, IA e regras; transmite 20 snapshots/s por WebSocket.
SQLite guarda contas, carreira e economia. Supabase valida identidade e recebe
resultados ranqueados por uma outbox. A persistência já usa transações e
idempotência, e o save local tem normalização e backup.

## Problemas encontrados antes das mudanças

- Dimensões duplicadas entre cliente legado e Match.
- Pênalti por contato ainda implementado, embora desligado por padrão.
- Jogadores colidem com postes, mas atravessam laterais/fundo da rede.
- Não existe limite de defensores na própria área em 4v4.
- Fila e liquidação Elo assumem dois usuários individuais, inclusive no Supabase.
- Carreira tem UNIQUE por usuário e modifica a camisa global da conta.
- Estatísticas sem avaliação defensiva nem MVP comum aos modos.
- Sala reconstrói controles em notificações de presença e empilha configurações,
  times e regras; a cobertura do lobby ocupa espaço adicional.
- Chat legado simula respostas de bots; não há chat online durante a partida.
- Emotes e checkout de gemas ainda não existem.
- Desconexões são verificadas em cada substep; permissões são consultadas a cada
  segundo. Snapshots já compactam movimentos sem reenviar o catálogo completo.

## Ordem de implementação

Consolidar campos/regras/colisões; grupos e Elo; notas/MVP; saves isolados;
clubes/elencos verificáveis; treino/salas; Cakto/emotes; chat; testes e balanceamento.

Compra real depende de produtos, preços e webhook configurados na Cakto. Dados
esportivos precisam de fontes e data de verificação. Atributos de gameplay são
parâmetros de balanceamento, não avaliações oficiais de jogadores.
