(function(root){
 function create(players,team){const {el}=root.MaxballUI,box=el('div',{class:'lineup-field','aria-label':'Escalação de '+team.name});players.forEach((p,i)=>{const canvas=el('canvas',{width:80,height:80});root.MaxballGame.teamSkin(canvas,team);const role=i<2?'ATACANTE':i===4?'GOLEIRO':'VOLANTE',row=i<2?1:i===4?3:2,col=i===4?'1 / 3':String(i%2+1),node=el('div',{class:'lineup-position'},[canvas,el('strong',{text:p.displayName||p.name||'BOT'}),el('small',{text:role})]);node.style.gridRow=String(row);node.style.gridColumn=col;box.append(node);});return box;}
 root.MaxballLineup={create};
})(globalThis);
