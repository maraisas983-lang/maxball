(function(root){
 const {el,card,note,field,select,form,button}=root.MaxballUI;
 root.MaxballViews.clubs=async portal=>{
  const canvas=el('canvas',{width:160,height:160,class:'club-preview'}),fields=[field('Nome do clube','name','text','',{required:'',minlength:3,maxlength:30}),field('Cor principal','primaryColor','color','#146b47'),field('Cor secundária','secondaryColor','color','#ffffff'),field('Detalhes','accentColor','color','#ffd52a'),select('Uniforme','kitStyle',root.MaxballTeams.styles.map(s=>[s,s]),'HALF')];
  const editor=form(fields,'Criar clube',async values=>{await portal.api('/clubs','POST',values);await portal.open('clubs');});
  const draw=()=>root.MaxballGame.teamSkin(canvas,{...Object.fromEntries(new FormData(editor)),name:'Preview'});editor.addEventListener('input',draw);
  portal.content.append(card('Criar clube',note('Escolha o nome, as cores e o uniforme. Seu clube fica salvo na sua conta.'),canvas,editor));draw();
  const list=card('Meus clubes');for(const team of await portal.api('/clubs')){const preview=el('canvas',{width:80,height:80});root.MaxballGame.teamSkin(preview,team);list.append(el('div',{class:'club-row'},[preview,el('strong',{text:team.name}),note(team.kitStyle)]));}
  if(!list.querySelector('.club-row'))list.append(note('Seu primeiro clube aparecerá aqui.'));
  list.append(button('Usar em sala personalizada',()=>portal.open('online'),'secondary'));portal.content.append(list);
 };
})(globalThis);
