# MAXBALL 1.0.20 — cadastro no APK

O APK 1.0.19 distribuído estava compilado com `BuildConfig.SERVER_URL` vazio. A Activity abria os assets locais na origem interna do Android. Nesse modo, o cliente bloqueia pedidos de conta, porque não existe um backend nessa origem. O endereço público do site não era incluído automaticamente na compilação.

O APK 1.0.20 abre `https://maxball.onrender.com` por padrão, usando a mesma origem HTTPS do site para cadastro, cookies de login e WebSocket. A configuração pública está em `android/server.json`; os compiladores Gradle e lite compartilham esse padrão. `MAXBALL_SERVER_URL` continua permitindo outro servidor HTTPS. A edição local agora exige a opção explícita `MAXBALL_OFFLINE=1`, evitando gerar outro APK sem contas por engano. O workflow Android foi atualizado para mostrar o servidor padrão.

Também foi corrigido o aviso após cadastro com confirmação de e-mail: ele aparece na tela de entrada visível, em vez de somente no portal escondido. A conta precisa ser confirmada pelo link enviado pelo provedor antes de entrar, quando essa confirmação estiver habilitada.

Não houve alteração de física, previsão de movimento, velocidade, design, infraestrutura de produção ou banco de dados. A reversão de rede da 1.0.19 foi preservada.

Validação: 17 testes direcionados de configuração Android, erros de login/cadastro, sessão persistente, portal e empacotamento passaram; sintaxe de 218 arquivos conferida. O fluxo de cadastro foi exercitado no Edge com viewport mobile e identificação Android: formulário → API real local → provedor Supabase simulado → aviso visível de confirmação. Nenhuma conta de teste ou e-mail de confirmação foi criado em produção. Evidências: [cadastro](qa-1.0.20/cadastro-email.json) e [captura](qa-1.0.20/cadastro-email.png).

O APK foi compilado com o servidor online e assinatura de depuração para permitir atualizar as versões de teste anteriores. A verificação inclui a presença do endereço no código DEX e a comparação dos assets. Não foi executado em aparelho Android físico nesta sessão. O acesso ao cadastro real depende da disponibilidade e configuração do Supabase usado pelo servidor.

APK: versionCode 21, assinaturas v2/v3 verificadas, 142 assets conferidos byte a byte. SHA-256: `fd3035ee7bf428abe4aa46b4d97dc7ccb79e9bab70f8dc8e1e5e708219e51e56`.
