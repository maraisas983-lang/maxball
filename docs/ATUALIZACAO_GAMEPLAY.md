**MAXBALL — atualização de gameplay, salas e interface — 02/10/2026**

O trabalho foi integrado à base existente de Canvas, física compartilhada, servidor Node e SQLite. As duas imagens fornecidas orientaram a composição da home e da apresentação. Este relatório descreve o resultado e seus limites.

1. **Gameplay alterado.** A movimentação usa respostas distintas para acelerar, soltar o controle e inverter a direção. O vetor diagonal é normalizado. A simulação permanece em 60 passos por segundo; renderização e envio de comandos continuam independentes. O passe humano segue a direção do movimento ou a última direção apontada. O chute segue o contato jogador–bola. Bots podem escolher um alvo, inclusive nos pedidos de passe e chute da carreira. Os personagens continuam atravessando as linhas até a margem externa; a bola respeita paredes, traves e gols.

2. **Bugs corrigidos.** Contato comum passou a usar velocidade relativa, massas e restituição baixa. Os impulsos de uma dividida são calculados antes da aplicação, com desempate estável para ações simultâneas. Passe e chute têm velocidades próprias; foram removidos bônus de corrida e a multiplicação do chute após passe. Uma ação humana dispara na borda do botão ou por um contador de toque, sem repetir enquanto o botão fica pressionado. Há proteção de 120 ms contra novo impulso do próprio cobrador, preservando a separação física. Também foi corrigido o cruzamento da linha de gol provocado pela correção de contato e o encaixe da bola ao lado da trave.

   O joystick possui um dedo proprietário, deadzone e cancelamento por perda de captura. Os botões controlam seus próprios dedos. Soltar um botão mantém o joystick ativo; soltar o joystick mantém o botão ativo. A troca de tela, perda de foco e cancelamento limpam os comandos. O joystick do vestiário também usa essa implementação.

   No login, respostas vazias/HTML de um servidor estático são identificadas antes de ler JSON. O Live Server do VS Code não executa `/api`; a tela agora oferece o endereço do servidor completo em desenvolvimento. O login Supabase aceita a senha existente da conta; a exigência de 12 caracteres permanece para novos cadastros. Erros de credenciais, confirmação de e-mail e limite de tentativas têm mensagens distintas.

3. **Parâmetros e medidas.** Os valores estão em `src/core/config.js`; são parâmetros do MAXBALL. A referência de gameplay do Mamoball foi qualitativa, sem alegar acesso aos seus valores internos.

   | Parâmetro | Antes | Agora |
   | --- | --- | --- |
   | Velocidade máxima humana | 205 | 205 |
   | Resposta de aceleração | 12 | 18 |
   | Resposta ao soltar | 12 | 24 |
   | Resposta ao inverter direção | 12 | 28 |
   | Passe manual | 260 + bônus | 280, sem bônus |
   | Chute | 420 + bônus / multiplicação | 460, sem bônus |
   | Passe dos bots | até 360 | 210–310 conforme distância |
   | Limite da bola | 560 | 560 |
   | Retenção da velocidade da bola em 1 s | 0,46 | 0,52 |
   | Restituição da parede / trave | 0,92 / 0,70 | 0,82 / 0,62 |
   | Restituição do contato jogador–bola | impulso anterior | 0,06 |
   | Massa jogador / bola | sem relação explícita | 3 / 1 |
   | Cooldown / buffer / proteção de contato | 0,30 s / sem buffer / sem proteção | 0,30 / 0,12 / 0,12 s |
   | Profundidade / margem vertical da área, campo 1000 × 560 | 150 / 70 | 200 / 100 |
   | Raio do círculo central no mesmo campo | 80 | 105 |
   | Largura de formação / distância mínima de companheiros | 200 / 76 | 240 / 90 |

   Na comparação de um passo com jogador sobreposto, comando neutro e velocidade inicial 0, 60 ou 205, a velocidade da bola foi de **0 / 39,299 / 150,331** para **0 / 31,974 / 109,245**. Essa medida inclui a desaceleração antes do contato; não representa corrida com input mantido. Mesmo o contato rápido fica abaixo do passe de 280 e do chute de 460.

   Partindo do repouso, o jogador chega a 171,114 após 100 ms de input. Após soltar por 500 ms, fica em 0,001051. A bola livre leva cerca de 1,067 s para perder metade da velocidade; percorre 216,200 no passe e 355,185 no chute nesse intervalo. Valores em unidades do mundo. Reproduzir com `node scripts/physics-benchmark.cjs`.

   A geometria maior é compartilhada pelo desenho, posicionamento defensivo e afastamento no kickoff. As dimensões escalam com o campo, em `src/game/field.js`.

4. **IA alterada.** A base de papéis e histerese foi preservada e ajustada à nova física: dois atacantes e dois volantes no 4 × 4, formação mais aberta, separação maior e defesa usando a área ampliada. Há um perseguidor principal por equipe; os outros oferecem passe ou cobertura. A escolha considera trajetória da bola, distância, papel e ocupação defensiva. Permanecem o intervalo de decisão de 100 ms, cooldown de troca de 650 ms e vantagem mínima de 40. Passes avaliam distância, companheiro livre, avanço e obstrução; finalizações consideram região, ângulo e espaço, com erro por dificuldade.

5. **Salas alteradas.** O servidor guarda mandantes, visitantes, espectadores, anfitrião, equipes, regras e estado. Nome e senha opcional são validados; a senha fica em hash scrypt com salt e nunca é enviada nos estados públicos. Tentativas de senha são limitadas. Apenas o anfitrião move jogadores, troca equipes/regras e inicia. Um pedido é validado completamente antes de modificar a sala. Arraste por mouse/toque possui cópia acompanhando o ponteiro, destaque de destino, origem visível, cancelamento e rolagem nas bordas. Há também seletor de destino por jogador.

   Os movimentos são aplicados no servidor e difundidos para todos. Jogadores não aparecem em dois grupos. Espectadores recebem snapshots e não controlam jogadores. Ao sair, um participante é removido do lobby e, durante a partida, substituído por bot; os participantes originais são preservados para resultados. A saída do anfitrião transfere o controle. Uma desconexão tem 20 s para reconectar; depois, a sala customizada remove o participante. O ranqueado mantém sua regra de derrota por abandono.

6. **Times adicionados.** Brasileirão reutiliza os 20 uniformes brasileiros existentes; os dois uniformes básicos continuam na loja/inventário. A categoria Mamoball contém os 21 nomes e paletas pedidos: Fimose, The Gods, Evolve, Trembala, The Fury, Bananudos, North, Locomotives, Fulham, CRF - Flamengo, FC Angels, Só Tapa Diamond, Komanda Voinov, Vloce, Black Dragons, Over Power, Retranqueiros, Real RJ, Four, Terabithia e Palestra. A apresentação das equipes usa nome e uniforme por cores. Nenhum logo oficial foi acrescentado. Cores semelhantes recebem uniforme alternativo no visitante.

7. **Clubes implementados.** A aba Clubes permite nome, três cores e estilos SOLID, HALF, STRIPES, SLEEVES e DETAIL, com preview ao alterar os campos. Nome e cores são validados no servidor. A migration SQLite `004_custom_clubs.sql` vincula os clubes à conta; permanecem após recarregar e reiniciar o banco. Meus Clubes aparece no seletor separado de mandante/visitante. Um usuário não pode selecionar por ID um clube privado de outra conta. As equipes já escolhidas ficam visíveis aos participantes da sala.

8. **Regras implementadas.** Configurações incluem impedimento, prorrogação, pênaltis em empate e pênaltis após prorrogação. A última opção exige prorrogação e pênaltis ligados. Uma vantagem no placar encerra o tempo sem disputa adicional. Empates podem terminar empatados, ir para 60 s de prorrogação ou ir para pênaltis conforme as opções. Os estados públicos são LOBBY, STARTING, PLAYING, EXTRA_TIME, PENALTIES e FINISHED.

   O impedimento arcade registra posições no instante do passe/chute, considerando metade adversária, bola e penúltimo adversário. Só é cobrado quando o candidato toca a bola. Toque adversário limpa os candidatos. A cobrança reposiciona a bola, afasta adversários, atribui o reinício ao outro time e mostra aviso. Kickoff limpa as marcações anteriores.

9. **Pênaltis implementados.** O sorteio de vencedor foi substituído por cobranças com bola, cobrador, defensor, gol físico, defesa/erro e limite de tempo. Há cinco cobranças por equipe, encerramento antecipado quando o adversário não pode alcançar e morte súbita em pares. O placar fica separado do placar da partida. Humanos controlam o cobrador e o defensor de sua vez; bots cobram e defendem com direção, tempo e reação variáveis. O servidor determina o resultado. A carreira registra vencedor e placar dos pênaltis e usa o vencedor na progressão das copas.

10. **Telas alteradas.** A home segue o estádio claro, perfil/XP no canto, carteira/configurações, marca central, avatar com setas, atalhos à esquerda e navegação inferior da referência. Os recursos existentes usam os atalhos; os modos offline continuam no menu Modos locais. O lobby organiza mandante, visitante e espectadores com uniformes, nomes, números, vagas e controles do anfitrião. A tela VS usa as cores e dados reais, cards e progresso sincronizado de 2,8 s. O servidor bloqueia comandos nesse período e inicia o kickoff. O HUD de pênaltis indica placar, cobrador, tempo e controle da vez.

11. **Arquivos principais.** Física/configuração: `src/core/config.js`, `src/physics/playerPhysics.js`, `contacts.js`, `ballPhysics.js`, `src/input/pointerControls.js`, `src/game/field.js`, `kickoff.js` e `rules.js`. IA: `src/ai/tactics.js`. Partida/sala: `server/online/match.cjs`, `rooms.cjs`, `offside.cjs` e `penalties.cjs`. Clubes: `src/data/teams.js`, `server/services/clubs.cjs` e migration 004. Interface: `index.html`, `styles/lobby.css`, `src/ui/home.js`, `onlineView.js`, `roomDrag.js`, `clubView.js`, `presentation.js`, `portal.js`, `careerView.js` e o renderer `src/legacy/game.js`. Login: `src/services/apiClient.js` e `server/services/supabase.cjs`.

12. **Verificação.** `npm.cmd test` concluiu com **71 testes aprovados, zero falhas**; `npm.cmd run check` verificou a sintaxe de **66 arquivos**. A execução dos arquivos de teste é sequencial para caber na memória desta máquina de 4 GB, especialmente durante scrypt e PostgreSQL/WASM. A suíte cobre contas, compras, carreira, ranqueado, saves, HTTP/WebSocket, SQL/RLS, física, IA e interface. Os testes novos incluem passe/recontato, ação mantida, dedos independentes, impedimento, dependências de regras, pênaltis de bots em nove combinações de formato/seed, cobrança humana, apresentação, gol/trave, posições idênticas em 20/60/144 FPS, senha, permissões, edições atômicas, espectadores, migração do anfitrião, persistência dos clubes e arraste mouse/toque. Três sockets reais confirmaram atualizações de equipes/regras. O Supabase real respondeu HTTP 200 nos seis diagnósticos de Auth, JWKS, tabelas e RPC.

   Também foi usado um navegador local Chromium/Edge em desktop 1600 × 900 e landscape 740 × 360. Foram conferidos home, lobby, apresentação, campo com controles e pênaltis; houve correção de sobreposição na home pequena. O fluxo real de interface criou clube, recarregou, selecionou o clube na sala, moveu jogador por toque, iniciou partida e manteve joystick durante liberação do chute. Esses fluxos terminaram sem erros JavaScript. O teste na instalação configurada confirmou formulário por e-mail, resposta de credenciais inválidas e mensagem/link corretos ao abrir pelo Live Server.

13. **Limites e operação.** A avaliação de sensação de jogo ainda depende de jogar em aparelhos físicos; emulação não mede atraso do touchscreen ou rede móvel. A rede mantém snapshots a 20 Hz, input a 30 Hz e interpolação; não foi feita medição de latência em internet pública. O impedimento implementa envolvimento por toque, sem todas as interpretações de interferência da regra profissional. As novas regras/pênaltis são usadas pelas partidas do servidor e pelas copas da carreira; o modo de sala offline mantém seu ciclo local anterior. Nome/senha e composição de salas permanecem em memória durante o processo; clubes, carreira e resultados usam o SQLite persistente.

   A atualização do código não cria hospedagem pública. Use `npm.cmd start` e abra o endereço anunciado, por padrão **http://127.0.0.1:5173**. O Live Server na porta 5500 e `start:offline` exibem os arquivos e não fazem autenticação. O login completo com uma conta pessoal depende de credenciais válidas e confirmação do e-mail; não foi usada uma senha pessoal do usuário nos testes. A migration de clubes é automática no Node; não exige repetir o SQL de ranqueado já aplicado no Supabase.
