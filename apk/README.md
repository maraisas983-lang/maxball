# MAXBALL para Android

[Baixar MAXBALL 1.0.19](MAXBALL-1.0.19.apk?raw=true)

A versão 1.0.19 retira as mudanças de rede da 1.0.18 após o relato de regressão e restaura o sistema online da 1.0.17. Mantém a renovação do login ao reabrir. Veja [Reversão online](../docs/REVERSAO_ONLINE_1_0_19.md).

APK de teste, assinado com certificado de depuração, para Android 8.0 ou superior. Transfira para o celular, abra o arquivo e autorize a instalação pelo aplicativo usado. Quem instalou a versão anterior pode escolher **Atualizar**, preservando os dados.

A versão 1.0.13 aumenta o tamanho da bola em mais 6%, preservando o peso, o rolamento e as velocidades aprovados. O chat fica no rodapé, e os emotes adquiridos têm um botão próprio, separado das mensagens. Veja [Bola e chat](../docs/BOLA_CHAT_1_0_13.md).

Online, contas e pagamentos exigem um servidor HTTPS publicado e outra compilação configurada com sua origem. Os arquivos locais continuam usando a origem HTTPS interna introduzida na 1.0.1. O APK foi compilado e verificado; ainda falta teste em aparelho físico.

Assinaturas APK v2/v3 verificadas. SHA-256:

```text
fb708ee4d1be1606be392110cb7553fa67eda7d4ec30d37b09c403df546dd743
```

Para recompilar: consulte [Entrada, áudio e APK](../docs/ENTRADA_AUDIO_APK.md). A compilação padrão também está disponível no workflow **Android APK** do GitHub Actions.
