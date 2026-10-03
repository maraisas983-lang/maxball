(function(root){
 'use strict';
 const source='https://ge.globo.com/cartola/noticia/2026/09/19/cartola-2026-veja-suspensos-lesionados-e-escalacoes-provaveis-da-rodada-28-do-brasileirao.ghtml';
 // Selected verified players for five-a-side adaptation; not a complete registration list.
 const selected=[
  ['Rossi','Léo Ortiz','Jorginho','Arrascaeta','Pedro','Léo Pereira','Ayrton Lucas','Bruno Henrique','Plata','Paquetá'],
  ['Carlos Miguel','Gustavo Gómez','Marlon Freitas','Andreas Pereira','Vitor Roque','Murilo','Piquerez','Jhon Arias','Flaco López','Maurício'],
  ['Rafael','Arboleda','Marcos Antônio','Lucas Moura','Calleri','Luciano','Sabino','Danielzinho','Artur','Lucas Ramon'],
  ['Hugo Souza','Gustavo Henrique','Raniele','Rodrigo Garro','Memphis Depay','Yuri Alberto','Breno Bidon','Matheuzinho','Gabriel Paulista','Matheus Bidu'],
  ['Gabriel Brazão','Lucas Veríssimo','João Schmidt','Neymar','Gabigol','Luan Peres','Rodinei','Rollheiser','Rony','Gabriel Bontempo'],
  ['Fábio','Thiago Silva','Martinelli','Ganso','Hulk'],
  ['Léo Jardim','Robert Renan','Thiago Mendes','Lescano','Colidio'],
  ['Gabriel Batista','Ferraresi','Danilo','Montoro','Arthur Cabral'],
  ['Otávio','Fabrício Bruno','Gerson','Matheus Pereira','Kaio Jorge'],
  ['Gabriel Delfim','Lyanco','Alan Franco','Bernard','Cassierra'],
  ['Weverton','Gustavo Martins','Villasanti','Pavón','Carlos Vinícius'],
  ['Matheus Cunha','Mercado','Thiago Maia','Alan Patrick','Carbonero'],
  ['Ronaldo','David Duarte','Acevedo','Rodrigo Nestor','Alejo Véliz'],
  ['Lucas Arcanjo','Cacá','Caique Gonçalves','Emmanuel Martínez','Erick'],
  ['Tiago Volpi','Gustavo Marques','Fabinho','Rodriguinho','Isidro Pitta'],
  ['Walter','João Victor','Denilson','Chico Kim','Fernandinho'],
  ['Pedro Morisco','Rodrigo Moledo','Sebastián Gómez','Josué','Pedro Rocha'],
  ['Mycael','Aguirre','Luiz Gustavo','Jadson','Vargas'],
  ['Anderson','Eduardo Doma','Yago Felipe','Giovanni Augusto','Garcez'],
  ['Marcelo Rangel','Marllon','Zé Welison','Vitor Bueno','Gabriel Taliari']
 ];
 const extraSources={
  0:'https://www.uol.com.br/esporte/futebol/ultimas-noticias/2026/09/10/flamengo-tera-pedro-e-plata-no-banco-contra-o-del-valle-veja-escalacao.ghtm',
  1:'https://ge.globo.com/google/amp/futebol/times/palmeiras/noticia/2026/07/11/palmeiras-aguarda-argentina-para-ter-elenco-completo-veja-time-do-segundo-semestre.ghtml',
  2:'https://www.saopaulofc.net/esporte/futebol-masculino-profissional/',
  3:'https://ge.globo.com/futebol/times/corinthians/noticia/2026/04/05/corinthians-inscreve-50-jogadores-para-fase-de-grupos-da-libertadores-veja-lista.ghtml',
  4:'https://ge.globo.com/sp/santos-e-regiao/futebol/times/santos/noticia/2026/09/05/santos-inscreve-arthur-rodinei-e-lima-na-copa-sul-americana.ghtml'
 };
 const roles=['Goleiro','Defensor','Volante','Meia','Atacante'],presets=[{speed:65,shot:55,pass:70,defense:80},{speed:68,shot:60,pass:70,defense:80},{speed:72,shot:65,pass:78,defense:72},{speed:76,shot:74,pass:82,defense:60},{speed:80,shot:82,pass:65,defense:55}];
 const reserveRoles=[[1,1,4,4,3],[1,1,3,4,3],[4,1,2,4,1],[4,3,1,1,1],[1,1,3,4,3]];
 const clubs=selected.map((names,i)=>({teamId:'br-'+i,season:2026,referenceDate:'2026-09-19',verifiedAt:'2026-10-03',coverage:'Seleção para adaptação 5v5',sources:[source,...(extraSources[i]?[extraSources[i]]:[])],players:names.map((name,j)=>({id:'br-'+i+'-player-'+j,name,role:roles[j<5?j:reserveRoles[i][j-5]],attributes:{...presets[j<5?j:reserveRoles[i][j-5]],acceleration:70,shooting:presets[j<5?j:reserveRoles[i][j-5]].shot,passing:presets[j<5?j:reserveRoles[i][j-5]].pass},rating:70,ratingKind:'GAME_BALANCE',sources:[source,...(j>=5&&extraSources[i]?[extraSources[i]]:[])]}))}));
 const api={clubs,forTeam:id=>clubs.find(c=>c.teamId===id),methodology:'Atributos de jogo por função, iguais para todos os clubes. Não representam notas oficiais ou estatísticas reais.'};
 if(typeof module!=='undefined')module.exports=api;else root.MaxballRosters=api;
})(globalThis);
