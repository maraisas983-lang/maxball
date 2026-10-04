# Estádios, skins, clubes e campeonatos

## Estádios e escalação

Há cinco opções: Arena MAXBALL, Parque Verde, Arena do Litoral, Estádio Luz da Noite e Arena Pôr do Sol. A seleção está nas opções da sala personalizada, da carreira, do treino e do modo local. A sala guarda a escolha e transmite a mesma configuração aos participantes. A carreira guarda a opção por save. A ranqueada mantém seu estádio padrão e suas regras competitivas.

Os estádios têm cores de gramado, arquibancadas e elementos de cenário próprios. O cenário é desenhado uma vez no cache existente. Dimensões, colisões e regras continuam independentes da aparência do estádio.

A apresentação mostra cada equipe em um campo quadrado: dois atacantes à frente, dois volantes atrás e o goleiro no 5v5. Formatos menores mostram apenas suas vagas. Cada posição apresenta o nome e a skin do time; os escudos continuam no cabeçalho. A apresentação funciona na carreira, nas salas e nos modos locais com entrada em campo.

## Estúdio de skins

Abra **Criar skins** no menu ou em **Jogar**. Personalize as cores e a base do uniforme. Adicione até 16 camadas com os ícones disponíveis, selecione uma camada e arraste na prévia. Os controles permitem mudar posição, tamanho, rotação, cor e ordem; também é possível remover camadas.

Salve a skin ou edite uma já criada. Em **Clubes → Criar clube / Personalizar clube**, selecione a skin salva. A personalização fica guardada no clube e é usada nos jogadores, escudos personalizados e escalação quando esse clube é selecionado na sala. As skins são designs originais feitos com os elementos do jogo; nenhum arquivo executável ou imagem externa é enviado.

## Comunidades de clube

Clubes públicos aceitam entrada imediata. Clubes privados recebem pedidos; o dono aprova ou rejeita em **Integrantes**. Cada clube pode ter até 100 integrantes e pedidos, e o dono pode personalizar seu clube e remover integrantes. Membros aprovados podem usar o clube nas seleções de equipe.

Um jogador inscrito em um campeonato pendente ou aprovado deve permanecer no clube. Cancele a inscrição antes de remover esse integrante. O dono do clube permanece como responsável.

## Árbitro e chat

Somente o dono da sala pode atribuir, substituir ou retirar o árbitro. Durante a partida, abra **Partida → Árbitro da sala → Aplicar árbitro**. Espectadores e técnicos podem assumir imediatamente. Para retirar alguém do campo e designá-lo árbitro, pause a partida; um bot ocupa sua vaga com animação de substituição. O árbitro anterior passa a espectador.

**Chat da sala** abre uma janela pequena sobre o lobby. O chat dos técnicos usa a mesma apresentação. Fechar o chat mantém o usuário na sala e preserva suas configurações.

## Patentes

O Elo e o cálculo de resultados continuam existentes. As faixas de apresentação são:

| Patente | Elo mínimo |
| --- | ---: |
| MiniBall | 0 |
| Ballista | 1.150 |
| MaxPlayer | 1.300 |
| MaxCraque | 1.500 |
| MaxElite | 1.750 |
| BallMaster | 2.000 |
| MaxLenda | 2.300 |
| MaxImortal | 2.600 |

O Elo inicial de 1.000 corresponde a MiniBall. As faixas ficam em `src/data/ranks.js`.

## Campeonatos e inscrições

- **Campeonatos** aparece no menu e em **Jogar**. Jogadores podem enviar propostas para aprovação.
- **Command Center → Campeonatos** permite adicionar, editar, aprovar, rejeitar e remover eventos. Somente papéis com permissão de configuração têm acesso.
- O administrador define nome, descrição, data, formato, limite de clubes e taxa. **0 gemas significa entrada grátis**.
- A taxa é **por inscrição do clube**, cobrada uma vez da carteira do dono. A revisão da inscrição mostra o clube, o elenco e o valor antes de confirmar.
- Apenas o dono inscreve o clube. É obrigatório escolher um clube criado no MAXBALL e entre o número de titulares do formato e 20 jogadores com reservas. Todos devem ser integrantes aprovados e contas ativas desse clube.
- Um jogador não pode representar dois clubes no mesmo campeonato. O evento aceita inscrições até sua data de início e até atingir o limite configurado.
- Cada elenco fica pendente até o administrador aprovar. A aprovação verifica novamente os integrantes. O admin pode rejeitar uma inscrição e devolver a taxa.
- Cancelar a inscrição antes do início, rejeitá-la ou remover o evento devolve a taxa uma única vez. Formato e valor ficam bloqueados enquanto houver inscrições ativas.

Esta aba administra eventos e inscrições. Organize os confrontos e horários nas salas existentes.

## Dados e atualização

A migração SQLite `009_community.sql` é aplicada automaticamente ao iniciar o servidor. Ela preserva os clubes existentes e registra seus donos como integrantes aprovados. Skins, membros, campeonatos e inscrições persistem no banco do servidor. Nenhuma migração Supabase nova é necessária para esta rodada.

Reinicie o Node para carregar as rotas e a migração; depois abra `http://127.0.0.1:5173` e use **Ctrl + F5**. Um backup do banco local foi criado antes da entrega. A publicação no Render e a migração Supabase anterior continuam com os limites de acesso registrados em [Revisão final](REVISAO_FINAL.md).

## Verificação da entrega

A suíte completa passou com **158 testes** e a sintaxe de **128 arquivos** foi verificada. A migração também foi testada em um banco da versão anterior, preservando os clubes existentes e seus donos.

No Edge, foram verificados arraste e rotação de ícones, salvamento da skin, aplicação ao clube, seleção de estádio, envio real de mensagens no popup, aprovação do evento e do elenco pelo admin e inscrição com confirmação. A escalação foi inspecionada em desktop e em 740 × 360; o estúdio e os novos links do menu foram conferidos em 390 × 844. O fluxo passou sem erros de JavaScript.
