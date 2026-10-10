# Entrada em campo, áudio e APK

Atualização de 10/10/2026.

- Os jogadores saem em duas filas pelo túnel central da lateral inferior. Primeiro atravessam a linha lateral; depois se deslocam pelo gramado até a formação. A mesma animação atende partidas locais e online.
- Música instrumental original, sintetizada no próprio jogo, com volume menor durante a partida. Começa após o primeiro toque ou tecla, conforme a política de áudio do navegador/WebView.
- Efeitos distintos para chute, passe, impacto na rede e clique. No online, chutes usam uma sequência confirmada pelo servidor, sem repetir a cada quadro.
- Música e efeitos podem ser desligados separadamente nas configurações. O áudio é suspenso ao ocultar o jogo ou colocar o APK em segundo plano.
- O pacote Android inclui os novos arquivos, mantém paisagem, controles por toque e a edição offline. Não precisa baixar músicas ou sons externos.

## Validação

25 testes aprovados em `audio-entry`, `presentation-polish`, `match-experience` e `commerce-android`: trajetória pelo túnel, continuidade/separação dos jogadores, áudio e ciclo de vida, intervalos/substituições e inclusão somente de arquivos públicos no Android.

Não houve verificação visual ou auditiva em navegador/aparelho: nenhum navegador estava disponível nesta sessão.

## Gerar o APK

O APK de teste foi gerado em 10/10/2026 com JDK 17, Android SDK 35 e Build Tools 35.0.0, instalados em `.work/android-toolchain/`. A compilação direta usa as ferramentas oficiais do SDK e evita o processamento de dependências do Gradle, que ficou lento por falta de memória nesta máquina. Essa alternativa atende a Activity Java atual, sem dependências Android externas.

Para edição offline:

```powershell
npm.cmd run android:apk:lite
```

Para edição online, configure a origem HTTPS real antes de compilar:

```powershell
$env:MAXBALL_SERVER_URL = 'https://SEU-DOMINIO'
npm.cmd run android:apk:lite
```

Arquivo gerado: `android/app/build/outputs/apk/debug/app-debug.apk`. Compatível com Android 8.0 ou superior, em paisagem. Assinaturas v2/v3 verificadas; os arquivos de entrada, áudio e integração Android coincidem com o código atual. A inspeção do pacote não encontrou as credenciais privadas configuradas, servidor, banco, `.env` ou `node_modules`.

Após relato de “página não disponível” no celular, foi gerada a atualização 1.0.1 (versionCode 2), que substitui `file://` por `https://appassets.androidplatform.net/game/index.html`. Essa origem é interceptada pelo próprio app e atendida exclusivamente pelos arquivos do APK, sem conexão de rede. Caminhos ausentes ou inválidos retornam 404 localmente. Contas e consultas periódicas continuam desativadas nessa origem offline. O código completo do erro original não foi informado, portanto a causa exata no aparelho ainda não foi confirmada. Dez testes de integração Android, comércio e erros de login passaram, incluindo bloqueio de chamadas de conta nas duas origens offline.

Copie o arquivo para o celular, abra-o e autorize a instalação pelo aplicativo usado para abri-lo. Esta edição oferece os modos locais; online, contas e compras dependem de servidor HTTPS publicado. A instalação e o funcionamento em aparelho físico ainda não foram verificados.

O comando padrão `npm.cmd run android:apk` e o workflow `Android APK` no GitHub continuam disponíveis para compilar com Gradle. Publicação em loja exige uma compilação release assinada.
