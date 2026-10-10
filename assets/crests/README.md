# Emblemas próprios MAXBALL

O catálogo usa 41 emblemas vetoriais originais. As paletas remetem às equipes representadas; os contornos, símbolos centrais e composições pertencem ao conjunto visual do jogo. Não usamos mais os PNGs oficiais baixados do catálogo anterior.

Fonte dos desenhos: `src/data/crests.js`. O mesmo módulo desenha diretamente em Canvas nos menus, nas apresentações e no vestiário, sem esperar imagens. Os SVGs locais permitem usar os emblemas em outros lugares e escalar sem perder nitidez.

Para gerar novamente os arquivos: `node scripts/generate-crests.cjs`. IDs, nomes de equipes, saves e uniformes não são modificados. URLs antigas `br-N.png` redirecionam para o SVG próprio correspondente.
