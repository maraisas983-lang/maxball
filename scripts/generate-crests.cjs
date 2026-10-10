const fs=require('node:fs'),path=require('node:path'),{teams}=require('../src/data/teams.js'),crests=require('../src/data/crests.js');
const directory=path.resolve(__dirname,'../assets/crests');
for(const team of teams)fs.writeFileSync(path.join(directory,team.id+'.svg'),crests.svg(team));
console.log('Emblemas próprios gerados: '+teams.length);
