# MAXBALL 1.0.12 — ajuste leve de peso da bola

A massa da bola passou de 1,8 para 1,908 (+6%). O ajuste usa o sistema existente de colisões entre duas massas, compartilhado pelo cliente e pelo servidor. O disco continua com massa 3.

Num contato frontal com o jogador a 130 unidades/s e a bola parada, a velocidade de saída passou de 91 para aproximadamente 89 unidades/s: redução de 2,2%. A bola oferece um pouco mais de resistência ao contato, sem uma mudança radical de condução. Valores registrados em [qa-1.0.12/weight.json](qa-1.0.12/weight.json).

Velocidades de passe e chute, rolamento, tamanho da bola, alcance, rebote de parede e janela de DB permanecem iguais aos da versão 1.0.11. Chutes ativos já compensam a massa no impulso; aumentar a massa não enfraquece o comando de chute.

Validação: 67 testes aprovados, incluindo 288 impactos medidos, conservação de momento e energia, condução, passe/chute durante o movimento, divididas, paredes, DB e servidor autoritativo. A comparação de velocidade de chute no teste existente passou a usar tolerância numérica de 1e-9 para diferenças de ponto flutuante. Sintaxe dos arquivos alterados verificada.

DB também aprovado no navegador real com toque e teclado, usando intervalo de 150 ms entre passe e chute. A primeira execução de toque expirou; a repetição passou. A janela da mecânica permanece em 180 ms. Evidências em [qa-1.0.12/db-browser.json](qa-1.0.12/db-browser.json).

APK 1.0.12 (código 13) compilado, assinaturas v2/v3 verificadas e os 142 arquivos públicos conferidos contra o projeto. Sem teste em aparelho físico. Cliente e servidor usam o contrato `2026-10-11-ball-weight-20` e precisam ser atualizados juntos.
