const {fail}=require('./validation.cjs');
const COMMERCE_OWNER='maraisas983@gmail.com';
function canManageCommerce(db,user){return !!user?.id&&db.one('SELECT email FROM verified_emails WHERE user_id=?',user.id)?.email?.trim().toLowerCase()===COMMERCE_OWNER;}
function requireCommerceOwner(db,user){if(!canManageCommerce(db,user))fail('COMMERCE_OWNER','Somente o e-mail confirmado autorizado pode alterar preços e pagamentos.',403);}
module.exports={COMMERCE_OWNER,canManageCommerce,requireCommerceOwner};
