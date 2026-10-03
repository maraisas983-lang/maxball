const {createHash,timingSafeEqual,randomBytes}=require('node:crypto');
const {fail,object,text,integer}=require('../lib/validation.cjs');
const sizes=[50,120,500,1200],digest=s=>createHash('sha256').update(s).digest();
function createPayments(db,economy,{permit,audit}){
 const initial={enabled:false,secret:'',packs:sizes.map(gems=>({gems,offerId:'',checkoutUrl:'',priceCents:0}))};
 db.run('INSERT OR IGNORE INTO payment_settings VALUES(1,?)',JSON.stringify(initial));
 const config=()=>JSON.parse(db.one('SELECT config FROM payment_settings WHERE id=1').config);
 function publicConfig(){const c=config();return {provider:'Cakto',enabled:c.enabled&&!!c.secret,packs:c.packs.map(p=>({gems:p.gems,priceCents:p.priceCents,available:c.enabled&&!!c.secret&&!!p.offerId&&!!p.checkoutUrl&&p.priceCents>0}))};}
 function admin(user){permit(user,'settings');const c=config();return {...c,secret:undefined,webhookConfigured:!!c.secret};}
 function save(user,body){permit(user,'settings');object(body,['enabled','packs','secret']);const before=config();if(typeof body.enabled!=='boolean'||!Array.isArray(body.packs)||body.packs.length!==4)fail('PAYMENT_CONFIG','Configuração inválida.');const packs=body.packs.map((p,i)=>{object(p,['gems','offerId','checkoutUrl','priceCents']);if(p.gems!==sizes[i])fail('PACK','Pacote inválido.');const offerId=text(p.offerId||'','Oferta',0,100,/^[\w-]*$/),checkoutUrl=text(p.checkoutUrl||'','Checkout',0,500);if(checkoutUrl){let url;try{url=new URL(checkoutUrl);}catch{fail('CHECKOUT','URL de checkout inválida.');}if(url.protocol!=='https:'||url.hostname!=='pay.cakto.com.br'||url.username||url.password)fail('CHECKOUT','Use o link HTTPS de checkout da Cakto.');}return {gems:p.gems,offerId,checkoutUrl,priceCents:integer(p.priceCents,'Preço em centavos',0,1000000)};});if(new Set(packs.filter(p=>p.offerId).map(p=>p.offerId)).size!==packs.filter(p=>p.offerId).length)fail('PACK','Cada pacote precisa de uma oferta diferente.');const secret=body.secret?text(body.secret,'Chave do webhook',16,200):before.secret;if(body.enabled&&(!secret||packs.some(p=>!p.offerId||!p.checkoutUrl||!p.priceCents)))fail('PAYMENT_CONFIG','Preencha as quatro ofertas, preços e a chave do webhook antes de ativar.');db.run('UPDATE payment_settings SET config=? WHERE id=1',JSON.stringify({enabled:body.enabled,secret,packs}));audit(user,'PAYMENTS_CONFIG','Cakto','OK',{enabled:body.enabled,packs:packs.map(p=>({gems:p.gems,priceCents:p.priceCents})),secretChanged:secret!==before.secret});return admin(user);}
 function checkout(user,body){object(body,['gems']);const c=config(),p=c.packs.find(p=>p.gems===body.gems),identity=db.one('SELECT email FROM verified_emails WHERE user_id=?',user.id);if(!identity)fail('PAYMENT_EMAIL','Entre com um e-mail confirmado no Supabase para comprar gemas.',409);if(!c.enabled||!c.secret||!p?.checkoutUrl||!p.offerId||!p.priceCents)fail('PAYMENTS_DISABLED','A compra de gemas ainda não foi configurada.',503);const url=new URL(p.checkoutUrl);url.searchParams.set('email',identity.email);return {url:url.href,gems:p.gems,priceCents:p.priceCents,email:identity.email};}
 function webhook(payload){const c=config();if(!c.secret||typeof payload?.secret!=='string'||!timingSafeEqual(digest(c.secret),digest(payload.secret)))fail('WEBHOOK','Webhook não autorizado.',401);if(!['purchase_approved','refund','chargeback'].includes(payload.event))return {ok:true,ignored:true};const data=payload.data||{},pid=text(data.id,'Pedido',1,100,/^[\w-]+$/);
  return db.transaction(()=>{
   const prior=db.one('SELECT * FROM gem_orders WHERE provider_id=?',pid);
   if(payload.event==='purchase_approved'){
    if(prior)return {ok:true,duplicate:true};if(data.status!=='paid')fail('PAYMENT_STATUS','Pagamento não aprovado.',409);
    const p=c.packs.find(p=>p.offerId===data.offer?.id),cents=Math.round(Number(data.amount)*100);if(!p||!p.priceCents||!Number.isFinite(cents)||cents!==p.priceCents)fail('PAYMENT_AMOUNT','Oferta ou valor de pagamento incompatível.',409);
    const email=typeof data.customer?.email==='string'?data.customer.email.trim().toLowerCase():'',u=db.one('SELECT user_id FROM verified_emails WHERE email=?',email);if(!u)fail('PAYMENT_ACCOUNT','Conta confirmada do comprador não encontrada.',409);
    const now=Date.now();db.run('INSERT INTO gem_orders VALUES(?,?,?,?,?,?,?,?)',pid,u.user_id,p.offerId,p.gems,cents,'PAID',now,now);economy.change(u.user_id,p.gems,'REWARD','CAKTO:'+pid,'cakto:'+pid);return {ok:true};
   }
   if(!prior)fail('PAYMENT_ORDER','A aprovação original precisa ser registrada antes do estorno.',409);if(prior.status!=='PAID')return {ok:true,duplicate:true};
   const balance=db.one('SELECT balance FROM wallets WHERE user_id=?',prior.user_id).balance,removed=Math.min(balance,prior.gems),debt=prior.gems-removed;
   economy.change(prior.user_id,-removed,'PURCHASE','CAKTO_REVERSAL:'+pid,'cakto-reversal:'+pid);if(debt)db.run('INSERT INTO gem_debts VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET amount=amount+excluded.amount',prior.user_id,debt);db.run('UPDATE gem_orders SET status=?,updated_at=? WHERE provider_id=?',payload.event==='refund'?'REFUNDED':'CHARGEBACK',Date.now(),pid);return {ok:true};
  });
 }
 function rotate(user){permit(user,'settings');const c=config(),secret=randomBytes(32).toString('hex');c.secret=secret;db.run('UPDATE payment_settings SET config=? WHERE id=1',JSON.stringify(c));audit(user,'PAYMENT_SECRET_ROTATED','Cakto');return {secret};}
 return {publicConfig,admin,save,checkout,webhook,rotate,history:uid=>db.all('SELECT * FROM gem_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50',uid)};
}
module.exports={createPayments};
