(function(root){
 const {el,card,note,button,field,select,form,table}=root.MaxballUI;
 const categories=[['TECHNICAL','Problema técnico'],['ACCOUNT','Conta'],['MATCH','Partida'],['REPORT','Denúncia'],['BUG','Bug'],['SUGGESTION','Sugestão'],['OTHER','Outro']];
 const statuses={OPEN:'Aberto',REVIEW:'Em análise',AWAITING_USER:'Aguardando sua resposta',RESOLVED:'Resolvido',CLOSED:'Encerrado'};
 async function thread(portal,id,staff=false){
  const path=(staff?'/command/tickets/':'/support/')+id,ticket=await portal.api(path),box=card(ticket.subject,note(categories.find(c=>c[0]===ticket.category)?.[1]+' · '+statuses[ticket.status]));
  for(const message of ticket.messages)box.append(el('article',{class:'ticket-message'},[el('strong',{text:message.display_name+' · '+new Date(message.created_at).toLocaleString('pt-BR')}),el('p',{text:message.body})]));
  if(staff||!['CLOSED','RESOLVED'].includes(ticket.status)){
   const fields=[el('label',{class:'field',text:'Resposta'},[el('textarea',{name:'message',maxlength:4000,...(staff?{}:{required:''})})])];
   if(staff)fields.push(select('Status','status',Object.entries(statuses),ticket.status),select('Prioridade','priority',[['LOW','Baixa'],['NORMAL','Normal'],['HIGH','Alta'],['URGENT','Urgente']],ticket.priority),select('Responsável','assignee',[[ticket.assignee||'','Manter responsável'],[portal.account.user.id,'Atribuir a mim']],ticket.assignee||''));
   box.append(form(fields,'Enviar',async data=>{if(staff){if(!data.message)delete data.message;if(!data.assignee)delete data.assignee;}await portal.api(path,'PATCH',data);await thread(portal,id,staff);}));
  }
  box.append(button('Voltar à lista',()=>staff?root.MaxballSupport.list(portal,true):portal.open('support'),'secondary'));portal.content.replaceChildren(box);
 }
 async function list(portal,staff=false){
  const tickets=await portal.api(staff?'/command/tickets':'/support'),box=card(staff?'Atendimento':'Meus chamados');
  for(const t of tickets.filter(t=>(!portal.ticketCategory||t.category===portal.ticketCategory)&&(!portal.query||t.subject.toLowerCase().includes(portal.query.toLowerCase())||t.id.includes(portal.query))))box.append(button(t.subject+' · '+statuses[t.status]+' · '+t.priority,()=>thread(portal,t.id,staff),'secondary'));
  if(!tickets.length)box.append(note('Nenhum chamado nesta lista.'));portal.content.replaceChildren(box);
  if(!staff)portal.content.append(card('Abrir chamado',note('Descreva o que aconteceu, horário e código da partida quando houver. Você pode incluir links de evidências no texto.'),form([select('Categoria','category',categories,'TECHNICAL'),field('Assunto','subject','text','',{required:'',minlength:5,maxlength:100}),el('label',{class:'field',text:'Descrição'},[el('textarea',{name:'description',required:'',minlength:10,maxlength:4000})])],'Enviar chamado',async data=>{const ticket=await portal.api('/support','POST',data);await thread(portal,ticket.id);} )));
 }
 root.MaxballSupport={list,thread};root.MaxballViews.support=portal=>list(portal);
})(globalThis);
