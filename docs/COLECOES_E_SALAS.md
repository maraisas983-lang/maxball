# Coleções e salas personalizadas

## Como testar

Execute `npm.cmd run dev` na pasta do projeto e abra http://127.0.0.1:5173. Se o servidor já estiver rodando, atualize o navegador com Ctrl+F5.

- **Loja:** cinco pacotes (skins, bolas, emojis, comemorações e rastros). Cada abertura entrega um item ainda não adquirido. A confirmação mostra os itens possíveis e suas chances iguais. O inventário permite equipá-los.
- **Passe Mini / MAX:** disponível no menu principal e na loja. Mini gratuito; MAX custa gemas. São 20 níveis, com um nível por duas ranqueadas válidas. Partidas canceladas e desistências não avançam o passe. Resgates não concedem gemas extras quando o item já pertence ao jogador.
- **Preços iniciais:** 30 gemas por pacote; 150 pelo MAX. Altere no Command Center → Pagamentos → Pacotes e passe MAX. A cobrança é protegida contra repetição da mesma requisição.
- **Perfil:** primeira mudança de nick gratuita; demais custam 10 gemas, com confirmação. Mudar apenas número, posições ou nome da camisa não cobra. Perfis públicos não expõem e-mail nem saldo.
- **Sala:** escolha GK, MC, VL ou PV, inclusive repetidos; troque sua skin, procure salas por nome/código e convide pelo ID ou nome de usuário. Convites duram dois minutos e permitem ao destinatário entrar em sala protegida por senha.
- **Durante a partida:** o ícone de jogadores no canto superior direito abre times e espectadores. Trocas são revisadas antes da confirmação e usam animação. Movimentações exigem pausa; o amistoso mantém as exigências de clube.
- **Cancelamento:** apenas o dono pode cancelar. Todos continuam na mesma sala; a partida cancelada não concede recompensas.
- **Cartões:** apenas o árbitro designado pode aplicá-los. Dois amarelos equivalem a vermelho. O expulso não retorna nos reinícios nem pode ser substituído.
- **Controles:** analógico fixo, móvel, seguindo o dedo ou desligado, nas configurações do lobby e da partida. No fixo, o toque na metade esquerda usa o centro dessa área como referência. Tamanhos ajustáveis até 200%. FPS e ping aparecem discretamente no canto inferior esquerdo.
- **Entrada:** login após o carregamento chegar a 100%. A sessão permanece por até 30 dias, salvo logout, revogação ou limpeza de dados do navegador.

A migração SQLite `011_collections_pass.sql` roda automaticamente na inicialização. Os dados existentes são preservados. Este documento não confirma implantação no Render; o serviço precisa usar o novo commit da branch `develop/maxball`.
