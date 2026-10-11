const defaults=require('../android/server.json');
function serverUrl(env=process.env){
 const url=env.MAXBALL_OFFLINE==='1'?'':(env.MAXBALL_SERVER_URL||defaults.url).trim();
 if(url&&!/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]+)?\/?$/.test(url))throw Error('MAXBALL_SERVER_URL deve ser uma origem HTTPS sem caminhos ou credenciais.');
 return url;
}
module.exports={serverUrl};
