const {id}=require('../database/index.cjs');
const {fail,text,object}=require('../lib/validation.cjs');
const MAX_BALANCE=1000000000;
function createEconomy(db) {
  // Call only inside the transaction that authorizes the corresponding action.
  function change(userId,amount,type,source,key) {
    const prior=db.one('SELECT * FROM gem_transactions WHERE user_id=? AND idempotency_key=?',userId,key);
    if(prior)return prior;
    const wallet=db.one('SELECT balance FROM wallets WHERE user_id=?',userId);
    if(!wallet||!Number.isSafeInteger(amount))fail('BALANCE','Saldo inválido.',409);
    if(amount>0){const debt=db.one('SELECT amount FROM gem_debts WHERE user_id=?',userId)?.amount||0,paid=Math.min(debt,amount);if(paid){amount-=paid;db.run('UPDATE gem_debts SET amount=amount-? WHERE user_id=?',paid,userId);}}
    if(!wallet||!Number.isSafeInteger(amount)||wallet.balance+amount<0||wallet.balance+amount>MAX_BALANCE)fail('BALANCE','Saldo insuficiente ou limite excedido.',409);
    const now=Date.now(),transaction=id(),balance=wallet.balance+amount;
    db.run('UPDATE wallets SET balance=?,updated_at=? WHERE user_id=?',balance,now,userId);
    db.run('INSERT INTO gem_transactions VALUES(?,?,?,?,?,?,?,?,?)',transaction,userId,type,amount,wallet.balance,balance,source,key,now);
    return db.one('SELECT * FROM gem_transactions WHERE id=?',transaction);
  }
  function purchase(userId,body) {
    object(body,['itemId','requestId']);const itemId=text(body.itemId,'Item',1,50),key=text(body.requestId,'Requisição',8,100,/^[\w-]+$/);
    return db.transaction(()=>{
      const prior=db.one('SELECT * FROM purchases WHERE user_id=? AND idempotency_key=?',userId,key);
      if(prior){if(prior.item_id!==itemId)fail('IDEMPOTENCY','Requisição já usada para outro item.',409);return prior;}
      const item=db.one('SELECT * FROM shop_items WHERE id=? AND enabled=1',itemId);
      if(db.one('SELECT amount FROM gem_debts WHERE user_id=? AND amount>0',userId))fail('PAYMENT_DEBT','Há gemas pendentes de um estorno. Regularize o saldo antes de comprar itens.',409);
      if(!item)fail('ITEM','Item indisponível.',404);
      if(db.one('SELECT 1 FROM inventory WHERE user_id=? AND item_id=?',userId,itemId))fail('OWNED','Você já possui este item.',409);
      change(userId,-item.price,'PURCHASE',itemId,'purchase:'+key);
      const purchaseId=id(),now=Date.now();
      db.run('INSERT INTO inventory VALUES(?,?,?)',userId,itemId,now);
      db.run('INSERT INTO purchases VALUES(?,?,?,?,?,?)',purchaseId,userId,itemId,item.price,key,now);
      return db.one('SELECT * FROM purchases WHERE id=?',purchaseId);
    });
  }
  function equip(userId,body){
    object(body,['itemId','slot']);const itemId=text(body.itemId,'Item',1,50);
    const item=db.one('SELECT s.* FROM inventory i JOIN shop_items s ON s.id=i.item_id WHERE i.user_id=? AND i.item_id=?',userId,itemId);
    if(!item)fail('OWNERSHIP','Item não adquirido.',403);
    if(item.category==='EMOTE'){const slot=require('../lib/validation.cjs').integer(body.slot,'Slot',0,3);db.run('INSERT INTO emote_slots VALUES(?,?,?) ON CONFLICT(user_id,slot) DO UPDATE SET item_id=excluded.item_id',userId,slot,item.id);return inventory(userId);}
    const column={KIT:'kit',EFFECT:'effect',BALL:'ball_skin',CELEBRATION:'celebration'}[item.category];if(!column)fail('ITEM','Categoria inválida.');db.run('UPDATE profiles SET '+column+'=? WHERE user_id=?',item.asset_index,userId);
    return inventory(userId);
  }
  function inventory(userId){return db.all('SELECT s.*,i.acquired_at FROM inventory i JOIN shop_items s ON s.id=i.item_id WHERE i.user_id=? ORDER BY s.category,s.asset_index',userId);}
  return {change,purchase,equip,inventory,catalog:()=>db.all('SELECT * FROM shop_items WHERE enabled=1 ORDER BY category,asset_index'),wallet:userId=>({balance:db.one('SELECT balance FROM wallets WHERE user_id=?',userId).balance,transactions:db.all('SELECT * FROM gem_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 50',userId)})};
}
module.exports={createEconomy};
