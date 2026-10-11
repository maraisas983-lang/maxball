# MAXBALL 1.0.19 — reversão da regressão online

Após o relato de piora na versão 1.0.18, foram retiradas suas alterações de previsão, reconciliação, confirmação de comandos, buffer de snapshots e limite de congestionamento. Esses arquivos voltaram ao conteúdo da versão 1.0.17, commit `d3e63d8`:

- `src/online/connection.js`
- `src/online/prediction.js`
- `src/online/protocol.js`
- `src/online/snapshotBuffer.js`
- `src/ui/debugView.js`
- `server/online/match.cjs`
- `server/online/rooms.cjs`

A previsão da 1.0.18 criava uma cópia da partida e recalculava física de jogadores e bola a cada frame. Os registros locais incluem picos de 31,3 ms nesse processamento. Isso demonstra um custo capaz de exceder um frame de 60 Hz; não prova que seja a única causa da piora relatada. A apresentação também dependia de estimativas de movimento dos adversários durante contatos. Os testes anteriores não eram suficientes para aprovar essa mudança para partidas reais.

Foram mantidas as correções de login em `server/services/supabase.cjs`, `server/app.cjs` e `src/ui/portal.js`. Fechar/reabrir mantém o cookie de jogador, sujeito à validade da sessão e do provedor. Sair explicitamente da conta continua revogando a sessão.

A física autoritativa, velocidades, bola, DB, personagens, loja, árbitros dentro dos times, saída sem reposição por bot e duração por tempo permanecem como na versão anterior à regressão. Hospedagem, configuração de produção e banco de dados não foram migrados.

Essa entrega desfaz a regressão da atualização; não declara resolvidos o ping Brasil–Ohio ou os problemas anteriores de rede. É necessário comparar novamente em dois dispositivos reais após o deploy.

Validação: **348 testes aprovados, nenhuma falha**; sintaxe de **215 arquivos** conferida; os sete arquivos de rede comparados ao commit anterior à regressão; teste no Edge com toque e RTT artificial medido de 319 ms, sem recuos acima do limite de 0,8 unidade, árbitros dentro dos times e saída sem bot. Evidências em [qa-1.0.19](qa-1.0.19/joystick-trace.json). Isso é um teste controlado em um computador, não uma partida entre celulares no Brasil.

APK 1.0.19, versionCode 20, assinatura v2/v3 verificada e 142 assets comparados byte a byte. SHA-256: `a6021b68374a60377a0bd5e49c6548e6bf478db681922fa4f7e538131c242623`.
