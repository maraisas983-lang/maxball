# Validação — 01/10/2026

Windows, Node.js v24.19.0. Comandos: `npm.cmd run check` e `npm.cmd test`.

Resultado: 50 arquivos com sintaxe aprovada; 53 testes aprovados, zero falhas. `git diff --check` sem erros. Artefato original preservado com SHA-256 conferido. Inicialização com o provedor Supabase aprovada; `.env` retorna HTTP 404 e nenhuma chave secreta aparece nos arquivos rastreados pelo Git.

## Cobertura

- Saves novos/antigos/parciais/corrompidos/futuros, backup, migração, cosméticos e falhas de armazenamento.
- CSS e telas originais preservados, descontando menu e comandos novos.
- Aceleração/movimento humano comparados ao original. A comparação exata dos bots foi substituída porque IA e disputas mudaram deliberadamente.
- Todos os formatos/campos, coordenadas finitas e partida completa de três minutos com bots.
- Disputas de dois/três jogadores: independência da ordem, pressão equilibrada, separação e velocidade limitada.
- Jogadores cruzam linhas, bola limitada, gol por travessia completa, trave, rede e repouso.
- Mandante na saída, time que sofreu gol no reinício, gol sem duplicação.
- Formação, um perseguidor, área reservada ao humano e estabilidade da escolha.
- Pedidos da carreira executam passe real na direção do humano e chute real ao gol.
- Conta, sessão, compra transacional/idempotente, equipamentos, RBAC, banimento e auditoria.
- Temporada, eliminatórias, mundial, transferências, histórico e critérios de prêmios.
- HTTP e WebSockets reais locais; somente o servidor calcula resultados.
- Interface jsdom percorre cadastro, carreira, loja, perfil, admin, partida, resultado e próxima rodada; fila, cancelamento, dois clientes e derrota após tolerância de desconexão.
- Elo, ampliação da busca, abandono e persistência sem duplicação.
- Supabase com transporte simulado: identidade verificada, confirmação pendente, login, renovação, perfil e logout.
- SQL Supabase em PostgreSQL/PGlite: trigger, RPC, idempotência, conflito de rating, RLS, bloqueio de alteração de Elo e de RPC pelo usuário.

## Limitações

A ferramenta de navegador não encontrou uma instância disponível. Canvas/áudio são simulados nos testes de interface. Não houve inspeção de pixels, reprodução de áudio, medição de FPS ou teste em celular físico. Estabilidade numérica não substitui avaliação humana da dificuldade.

Conexão real verificada em 01/10/2026 após a execução da migração no SQL Editor: Auth, JWKS, perfis, partidas e eventos retornaram HTTP 200; a função `record_ranked_match` está disponível na API. `npm.cmd run check:supabase` passou em todas as verificações. Cadastro, confirmação de e-mail e sincronização de uma partida real ainda precisam ser exercitados com contas de jogo. As credenciais ficam apenas no `.env` ignorado pelo Git.

Checklist manual: desktop e celular horizontal, joystick, pedidos da carreira, nomes, torcida, rede, duas contas em redes diferentes, reconexão e restauração de backup.
