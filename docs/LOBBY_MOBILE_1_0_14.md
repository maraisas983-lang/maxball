# Lobby mobile — 1.0.14

O lobby em paisagem agora divide o espaço entre cabeçalho, menus, jogador, atalhos e rodapé usando uma única grade. A altura acompanha a área visível do navegador (`100dvh`), incluindo mudanças provocadas pelas barras do navegador, e respeita as margens seguras do aparelho.

Antes da correção, o teste em 568 × 240 reproduzia sobreposição entre perfil e menu lateral. Agora todos os grupos e botões permanecem dentro da tela em paisagem, sem rolagem ou sobreposição. Nomes compridos e saldos grandes são limitados ao espaço do cabeçalho. Em retrato, os menus continuam acessíveis por rolagem interna.

O botão ⛶ solicita tela cheia quando o navegador oferece essa função e tenta orientar a tela em paisagem quando permitido. No APK, que já usa tela cheia e paisagem, esse botão fica oculto. O layout do PC e os sistemas de física continuam preservados.

## Verificação

Execute `node scripts/qa-full-lobby.cjs` com Playwright disponível em `.work/browser/node_modules` e Microsoft Edge instalado; `MAXBALL_BROWSER` permite selecionar outro executável Chromium.

O roteiro usa uma conta local de teste, nome longo e saldo de 999.999.999. Verifica 11 tamanhos distintos de 568 × 240 a 1280 × 720, além de retrato em 390 × 844; repete uma dimensão durante a rotação. Mede os limites e sobreposições, solicita e sai de tela cheia, verifica o modo visual do APK e abre treino e sala personalizada. Capturas e medidas estão em [qa-1.0.14](qa-1.0.14/layout.json).

Os testes de navegador usam emulação de viewport e toque. A compilação Android é verificada pelas ferramentas do SDK; a validação em aparelho físico continua pendente.
