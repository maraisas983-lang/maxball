# Atualização de jogabilidade e comunidade

Passe Mini / MAX, Campeonatos e Criar skins aparecem como cartões no menu, com adaptação para telas menores.

O editor circular tem seis modelos, dez padrões de uniforme, quatorze tipos de camada e limite de 32 camadas. Permite texto, arrastar, ajustar com setas, opacidade, espelhar, duplicar, ordenar, ocultar, desfazer/refazer e exportar PNG. Os designs antigos continuam válidos. A inspiração é o futebol arcade do Mamoball; os parâmetros de física são próprios do MAXBALL.

Os bots antecipam o movimento do destinatário, consideram atrito e risco de interceptação e podem correr para receber a devolução de uma tabela. Passes, dribles e chutes exigem contato físico com a bola. Segurar o botão repete o chute após o tempo de recuperação.

Partidas com intervalo levam a sala ao vestiário por até cinco minutos. O relógio da partida fica congelado, o chat da sala continua disponível e é possível substituir jogadores. O árbitro designado pode iniciar o segundo tempo antes do limite; sem árbitro, esse controle pertence ao anfitrião. A retomada acontece automaticamente ao esgotar o prazo.

Administradores publicam rodadas do campeonato após aprovar os elencos. Cada rodada tem 48 horas para combinar e iniciar os confrontos. O capitão mandante propõe um dia e horário e o visitante aceita ou solicita outra proposta. A presença abre 15 minutos antes e exige o elenco conectado na sala oficial. No horário acordado, o servidor inicia com os dois times completos; há até cinco minutos de tolerância, limitada pelo prazo da rodada. A ausência resulta em W.O. por 3 × 0; ausência dos dois resulta em W.O. duplo sem pontos. A falta de acordo fica registrada separadamente e não concede vitória automática. Reinicialização interrompe jogos em andamento ou já vencidos para remarcação administrativa.

O resultado mostra os autores dos gols de ambas as equipes, inclusive substituídos e gols contra, em partidas locais e online.

## Estúdio e bots

O estúdio organiza uniforme, símbolos e desenho em abas. O pincel cria traços vetoriais, com opção de simetria, dentro do avatar circular; cada traço pode ser transformado como uma camada. A grade pode encaixar movimentos e desenhos. As camadas podem receber nomes, ser bloqueadas e ter largura e altura independentes. A prévia em campo usa a skin em tamanhos de partida. Além do PNG, o design pode ser exportado e importado em JSON e aplicado diretamente a um clube do dono.

Desenhos têm até 96 pontos por traço e 384 pontos no total para caber no limite de requisição do servidor. Coordenadas, transformações e textos são validados também no backend; arquivos antigos permanecem compatíveis.

Os bots avaliam mais instantes da trajetória para interceptar. O apoio procura espaços com linha de passe aberta e mantém a escolha por um curto período. A marcação distribui os adversários entre defensores. O goleiro protege sua posição e antecipa a altura de chutes que conseguem chegar ao gol. A finalização avalia o movimento dos defensores; pedidos de passe não forçam bolas além do alcance físico.

## Serviço de contas

O login mantém o Supabase configurado. Falhas temporárias de conexão ou respostas 5xx recebem uma nova tentativa em operações seguras. Cadastro e renovação de token não são repetidos automaticamente. As mensagens distinguem credenciais inválidas, confirmação de e-mail, limite de tentativas e falha do serviço.

Diagnóstico em 08/10/2026: servidor local e endpoint de login responderam; uma credencial fictícia recebeu `LOGIN`/401, sem criar conta. Autenticação bem-sucedida com uma conta real não foi validada. O diagnóstico da ranqueada em grupo identificou a migração remota pendente `server/database/supabase/002_ranked_parties.sql`; execute-a no SQL Editor do projeto Supabase e confira com `npm.cmd run check:supabase`. Essa migração é separada das migrações SQLite, que são aplicadas automaticamente na inicialização.
