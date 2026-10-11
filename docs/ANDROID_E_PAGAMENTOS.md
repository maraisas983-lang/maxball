# Lobby, preços e Android

O lobby e o menu inicial exibem discretamente **feito por poggi e mateuswsf**. O crédito não captura toques e permanece fora dos controles.

## Proprietária dos pagamentos

Somente a identidade confirmada **maraisas983@gmail.com** pode alterar preços de pacotes, preços do passe antigo, ofertas/links da Cakto e configuração de pagamento do MaxPass, ou trocar a chave do webhook. A validação acontece no servidor por `verified_emails`; nome de usuário, campos enviados pelo cliente e papel ADMIN/SUPER_ADMIN não substituem essa identidade.

Essa conta recebe acesso administrativo ao entrar pelo Supabase com e-mail confirmado. Se o e-mail mudar ou perder a confirmação, sua identidade verificada é atualizada/removida na próxima autenticação. O painel usa uma permissão retornada pelo servidor para exibir o controle; o bloqueio também se aplica a chamadas diretas à API.

## Pacotes iniciais

| Gemas | Preço |
| --- | --- |
| 50 | R$4,90 |
| 100 | R$8,90 |
| 250 | R$24,90 |
| 500 | R$39,90 |
| 1.000 | R$59,90 |
| 2.000 | R$89,90 |

Os preços ficam no banco e podem ser alterados somente pela proprietária. Cada quantidade precisa de uma oferta e URL HTTPS válidas da Cakto, configuradas no Command Center. O MaxPass mantém seu preço atual de 600 gemas ou R$19,90.

A migração do catálogo preserva a chave do webhook e arquiva as ofertas antigas. Novos links ficam aguardando configuração para evitar cobrar o preço antigo por uma quantidade nova. Pagamentos anteriores ainda podem ser confirmados e estornados com a quantidade e o preço originais. Depois que uma oferta é usada, alterar seu valor exige um novo ID de oferta, preservando os pedidos pendentes.

## Projeto Android

O projeto em `android/` utiliza uma Activity com Android WebView acelerada por hardware, modo paisagem, tela cheia e controles existentes do jogo. Não embute Node, SQLite, chaves de serviço ou credenciais no aplicativo.

- Por padrão, o app abre `https://maxball.onrender.com`, definido em `android/server.json`. `MAXBALL_SERVER_URL` permite sobrescrever essa origem HTTPS. Login, cookies HttpOnly, CSRF, MaxPass e WebSocket continuam na mesma origem do site.
- Com `MAXBALL_OFFLINE=1` explícito, o APK abre os arquivos públicos incluídos no app e oferece os modos locais. Contas, carreira persistida no servidor, partidas online e compras exigem o servidor HTTPS.
- Checkout abre no navegador externo. Ao voltar, o saldo é consultado novamente no servidor; o clique ou retorno não aprova o pagamento.
- Pausar o app limpa os controles e suspende timers da WebView. Voltar restaura a tela e atualiza a conta. O botão Voltar fecha diálogos, volta do lobby ou utiliza a saída existente da partida.
- URLs externas não recebem acesso a uma ponte JavaScript nativa. Conteúdo misto e tráfego HTTP são bloqueados.

O empacotador copia somente `index.html`, `src/`, `styles/` e os assets públicos. Arquivos `.env`, banco de contas, servidor e `node_modules` ficam fora do APK. Desde a versão 1.0.1, o conteúdo local usa a origem interna `https://appassets.androidplatform.net/game/index.html`, com recursos atendidos pelo próprio app; não depende de DNS nem servidor publicado. Acesso a arquivos e conteúdo do sistema permanece desativado.

## Gerar um APK

Requisitos locais: JDK 17 e Android SDK com plataforma/build tools 35. As versões usadas pelo projeto seguem a compatibilidade oficial do [Android Gradle Plugin 8.9](https://developer.android.com/build/releases/agp-8-9-0-release-notes).

No PowerShell, para um app conectado ao servidor:

```powershell
npm.cmd run android:apk
# Opcional: $env:MAXBALL_SERVER_URL = 'https://outro-servidor.example'
```

Use apenas a origem HTTPS, sem caminhos, credenciais, parâmetros ou segredos. Não use `127.0.0.1`: dentro do celular esse endereço aponta para o próprio aparelho.

Para compilar uma edição local, defina `$env:MAXBALL_OFFLINE = '1'`. Remova essa variável com `Remove-Item Env:MAXBALL_OFFLINE` antes de voltar a gerar o APK online. Deixar `MAXBALL_SERVER_URL` vazio usa o servidor padrão. O APK de testes fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Ele usa assinatura de depuração e serve para instalação e testes; uma distribuição definitiva precisa de assinatura própria e versão de release.

Também existe o workflow **Android APK** em `.github/workflows/android-apk.yml`. Após enviar o código ao repositório, execute-o manualmente em Actions; o servidor MAXBALL já vem preenchido, e pode ser substituído por outra origem HTTPS. Ele instala JDK/SDK, compila e disponibiliza o artefato **MAXBALL-apk**, sem publicar uma loja nem alterar o servidor.

Atualização de 10/10/2026: JDK 17 e Android SDK 35 foram instalados em `.work/android-toolchain/`. O APK local foi compilado e assinado com sucesso usando `npm.cmd run android:apk:lite`, uma alternativa com menor uso de memória para a Activity Java atual, sem dependências Android externas. O arquivo está em `android/app/build/outputs/apk/debug/app-debug.apk`, exige Android 8.0 ou superior e teve suas assinaturas v2/v3 verificadas. Os assets atuais foram conferidos e nenhuma das credenciais privadas configuradas apareceu no pacote. Ainda falta testar a instalação e a interação em aparelho físico. Desde a 1.0.20, a origem pública do MAXBALL vem configurada por padrão; o APK local histórico não oferecia contas.

Validação da implementação original: 243 testes automatizados aprovados e sintaxe de 174 arquivos verificada. Os testes novos conferem os seis preços, autorização pelo e-mail confirmado, bloqueio de outros administradores via HTTP, idempotência, pedidos antigos e inclusão somente de arquivos públicos no pacote Android. A primeira tentativa de APK foi interrompida por JDK incompatível; a compilação posterior descrita acima gerou o arquivo de teste.
