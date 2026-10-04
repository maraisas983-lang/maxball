# Intervalo, vestiário e controle da partida

## Como testar

Abra `http://127.0.0.1:5173` e recarregue com **Ctrl + F5**.

- **Sala personalizada → Ir ao vestiário**: ande com WASD/setas ou os quatro botões na tela. O ambiente usa as cores, nome e escudo do seu time. **T** abre o chat da sala. **Voltar à sala** mantém sua vaga; **GO** permite ao anfitrião iniciar dali.
- Ative **Intervalo** na configuração da sala. No fim do primeiro tempo, os times saem pelo túnel e retornam com lados invertidos. Gols, impedimento, defesa e bots passam a seguir a nova direção. A carreira tem intervalo; partidas locais também.
- No canto superior direito, abra **Partida** para pausar. **Retomar** congela os comandos e o relógio durante **3, 2, 1**. Na sala personalizada, o árbitro controla a pausa; sem árbitro, o anfitrião controla. Na carreira, o jogador pode pausar. A ranqueada mantém as regras competitivas existentes.
- Para substituir na sala personalizada, pause e selecione **Quem sai** e **Espectador que entra** no painel **Partida**. O anfitrião ou árbitro pode trocar um humano ou bot. O humano que sai passa a espectador. Quem entra assume o time e a posição, com animação de saída e entrada. A retomada fica disponível após a animação.
- Ao terminar, escolha **Assistir melhores momentos** para rever os gols com autor e assistência, ou **Sair pelo túnel até o vestiário**. Ande até o túnel no centro da lateral inferior e siga pelo corredor. O botão **Ir para o lobby** continua disponível embaixo.

## Física e transições

A velocidade do personagem, do chute e do passe permanece na configuração já ajustada. O contato com a bola separa o quique da força de condução, evitando aplicar toda a velocidade do jogador como um chute. Colisões entre personagens retiram a velocidade de aproximação e preservam o movimento lateral.

A entrada em campo usa trajetórias contínuas com início e fim suaves. O intervalo guarda as posições antes da saída e calcula a formação do segundo tempo com a direção invertida. A física da partida não roda durante essas cenas.

O vestiário personalizado usa movimento calculado pelo servidor e atualizações a 10 Hz, separadas dos comandos da partida. Os bancos e limites têm colisões. A renderização interpola as posições recebidas. Os melhores momentos guardam até 12 gols desta sessão, sem alterar placar, resultados ou recompensas.

## Verificação

Os testes cobrem troca de lados local e online, gols após o intervalo, áreas defensivas, condução e paredes, contatos entre personagens, permissões do vestiário, limites e bancos, substituição e resultado dos participantes, pausa e retomada, memória dos replays e saída após a partida.

O fluxo completo também é verificado no Edge com HTTP e WebSocket reais, incluindo chat, substituição, melhores momentos e passagem pelo túnel. Nenhuma nova migração Supabase é necessária para estas mudanças.

Nesta rodada, a suíte completa passou com 139 testes. Após os ajustes finais, passaram 40 testes dos sistemas afetados e duas regressões adicionais para contato durante recuo e interpolação das cutscenes. O fluxo completo no navegador passou em desktop e tela pequena; uma repetição posterior encontrou timeout ao abrir o vestiário, e a repetição da suíte foi interrompida durante a lentidão do ambiente. Não foram contabilizadas como execuções aprovadas.

A reinicialização automática do servidor local foi bloqueada pela revisão de aprovação. Foi criado backup do banco. Reinicie o processo existente antes de testar as novas rotas online; os arquivos atualizados, por si só, não recarregam o código Node já em execução.
