(function(root){
 'use strict';
 const {el,button,card,note,field,select,form,table,metrics}=root.MaxballUI;
 root.MaxballViews.admin=async portal=>{
  const data=await portal.api('/admin');
  portal.content.append(card('Administração MAXBALL',metrics([['Contas',data.users],['Online',data.online],['Partidas',data.matches],['Compras',data.purchases],['Gemas',data.gems],['Banimentos',data.bans]])));
  const results=el('div',{class:'admin-results'});
  const search=async query=>{
   const users=await portal.api('/admin/users?q='+encodeURIComponent(query));results.replaceChildren();
   for(const user of users)results.append(card(user.display_name||user.username,note(user.id+' · '+user.role+' · '+user.status),note('Nível '+user.level+' · '+user.balance+' gemas'),button('Gerenciar',()=>manage(user.id),'secondary')));
  };
  async function manage(id){
   const detail=await portal.api('/admin/users/'+id);
   const actions=[['BAN','Banir'],['UNBAN','Desbanir'],['STATUS','Alterar status']];
   if(['ADMIN','SUPER_ADMIN','OWNER'].includes(portal.account.user.role))actions.push(['GEMS','Adicionar/remover gemas'],['GRANT_ITEM','Dar item'],['REMOVE_ITEM','Remover item']);
   if(['SUPER_ADMIN','OWNER'].includes(portal.account.user.role))actions.push(['ROLE','Alterar permissão']);
   results.replaceChildren(card(detail.profile.display_name||detail.user.username,note(detail.user.id),note('Criada em '+new Date(detail.user.created_at).toLocaleString()+' · Último login '+new Date(detail.user.last_login_at).toLocaleString()),metrics([['Elo',detail.profile.rating],['Vitórias',detail.profile.ranked_wins],['Derrotas',detail.profile.ranked_losses],['Sessões',detail.sessions.length],['Chamados',detail.tickets.length],['Temporada',detail.career?.season||'—']]),table(['Item','Categoria'],detail.inventory.map(i=>[i.name,i.category])),
    form([select('Ação','action',actions),field('Motivo obrigatório','reason','text','',{required:'',minlength:5,maxlength:300}),field('Gemas (negativo para remover)','amount','number',0,{min:-1000000,max:1000000}),field('ID do item','itemId','text',''),field('Banimento até (vazio = permanente)','expiresAt','datetime-local',''),select('Status','status',[['ACTIVE','Ativo'],['SUSPENDED','Suspenso']]),select('Permissão','role',[['PLAYER','Jogador'],['SUPPORT','Suporte'],['MODERATOR','Moderador'],['ADMIN','Administrador']])],'Registrar ação',async values=>{
     if(!confirm('Confirmar '+values.action+' para '+detail.user.username+'?'))return;
     const payload={action:values.action,reason:values.reason};
     if(values.action==='GEMS')payload.amount=+values.amount;
     if(values.action.includes('ITEM'))payload.itemId=values.itemId;
     if(values.action==='BAN')payload.expiresAt=values.expiresAt?new Date(values.expiresAt).getTime():null;
     if(values.action==='STATUS')payload.status=values.status;
     if(values.action==='ROLE')payload.role=values.role;
     await portal.api('/admin/users/'+id,'POST',payload);await manage(id);portal.status('Ação registrada no histórico.');
    }),table(['Ação','Motivo','Data'],detail.audit.map(a=>[a.action,a.reason,new Date(a.created_at).toLocaleString('pt-BR')]))));
  }
  portal.content.append(card('Pesquisar contas',form([field('Nome ou ID','query','text','')],'Pesquisar',values=>search(values.query))),results,card('Atividade administrativa',table(['Ação','Conta','Motivo','Data'],data.recent.map(a=>[a.action,a.target_user_id,a.reason,new Date(a.created_at).toLocaleString('pt-BR')]))));
  await search(portal.query||'');
 };
})(globalThis);
