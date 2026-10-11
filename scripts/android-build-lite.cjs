// Small WebView-only debug build using official SDK tools; no Gradle dependency transforms.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {buildAssets}=require('./android-assets.cjs');
const root=path.resolve(__dirname,'..'),tools=path.join(root,'.work/android-toolchain'),project=path.join(root,'android'),win=process.platform==='win32',exe=win?'.exe':'';
function build(){
 const server=require('./android-server.cjs').serverUrl();
 console.log(server?'APK online: '+server:'APK local: contas e multiplayer indisponíveis.');
 let home=process.env.JAVA_HOME;const portable=path.join(tools,'jdk');
 if(!home&&fs.existsSync(portable)){const folder=fs.readdirSync(portable).find(n=>fs.existsSync(path.join(portable,n,'bin','java'+exe)));if(folder)home=path.join(portable,folder);}
 const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(tools,'sdk');
 if(!home)throw Error('Configure JAVA_HOME para JDK 17 ou superior.');
 const java=path.join(home,'bin','java'+exe),bin=path.join(sdk,'build-tools/35.0.0'),androidJar=path.join(sdk,'platforms/android-35/android.jar');
 for(const file of [java,androidJar,path.join(bin,'lib/d8.jar'),path.join(bin,'lib/apksigner.jar')])if(!fs.existsSync(file))throw Error('Ferramenta Android ausente: '+file);
 // This build intentionally supports only the current dependency-free Java Activity.
 const javaSource=path.join(project,'app/src/main/java/com/maxball/game/MainActivity.java');
 const sources=fs.readdirSync(path.join(project,'app/src/main/java'),{recursive:true}).filter(n=>n.endsWith('.java'));
 if(sources.length!==1||!fs.existsSync(javaSource)||/\bimplementation\s*[( '"\w]/.test(fs.readFileSync(path.join(project,'app/build.gradle'),'utf8')))throw Error('Use a compilação Gradle para apps com fontes ou dependências Android adicionais.');
 const work=path.join(root,'.work/android-apk-lite',String(Date.now())),gen=path.join(work,'generated'),classes=path.join(work,'classes'),dex=path.join(work,'dex');
 for(const dir of [gen,classes,dex])fs.mkdirSync(dir,{recursive:true});
 function run(command,args){const result=spawnSync(command,args,{stdio:'inherit',windowsHide:true,env:{...process.env,JAVA_HOME:home,ANDROID_HOME:sdk}});if(result.error)throw result.error;if(result.status!==0)throw Error(path.basename(command)+' falhou ('+result.status+').');}
 buildAssets();
 let manifest=fs.readFileSync(path.join(project,'app/src/main/AndroidManifest.xml'),'utf8');
 if(/\bpackage\s*=/.test(manifest))throw Error('Manifest inesperado; use Gradle.');
 manifest=manifest.replace('<manifest ','<manifest package="com.maxball.game" ');const manifestFile=path.join(work,'AndroidManifest.xml');fs.writeFileSync(manifestFile,manifest);
 const aapt=path.join(bin,'aapt2'+exe),compiled=path.join(work,'resources.zip'),unsigned=path.join(work,'unsigned.apk');
 console.log('Compilando recursos Android…');run(aapt,['compile','--dir',path.join(project,'app/src/main/res'),'-o',compiled]);
 const gradleConfig=fs.readFileSync(path.join(project,'app/build.gradle'),'utf8');
 const versionCode=gradleConfig.match(/\bversionCode\s+(\d+)/)?.[1],versionName=gradleConfig.match(/\bversionName\s+'([^']+)'/)?.[1];
 if(!versionCode||!versionName)throw Error('Versão Android ausente no build.gradle.');
 run(aapt,['link','-o',unsigned,'-I',androidJar,'--manifest',manifestFile,'--java',gen,'--min-sdk-version','26','--target-sdk-version','35','--version-code',versionCode,'--version-name',versionName,'--debug-mode',compiled,'-A',path.join(project,'app/src/main/assets')]);
 const generatedPackage=path.join(gen,'com/maxball/game');fs.mkdirSync(generatedPackage,{recursive:true});const buildConfig=path.join(generatedPackage,'BuildConfig.java');
 fs.writeFileSync(buildConfig,'package com.maxball.game; public final class BuildConfig { public static final boolean DEBUG = true; public static final String SERVER_URL = '+JSON.stringify(server)+'; }');
 console.log('Compilando aplicativo Java…');run(path.join(home,'bin','javac'+exe),['-J-Xmx128m','-encoding','UTF-8','-source','8','-target','8','-bootclasspath',androidJar+path.delimiter+path.join(bin,'core-lambda-stubs.jar'),'-d',classes,javaSource,buildConfig,path.join(generatedPackage,'R.java')]);
 const jar=path.join(home,'bin','jar'+exe),classJar=path.join(work,'classes.jar');run(jar,['-J-Xmx64m','--create','--file',classJar,'-C',classes,'.']);
 console.log('Gerando código Android…');run(java,['-Xmx256m','-cp',path.join(bin,'lib/d8.jar'),'com.android.tools.r8.D8','--lib',androidJar,'--min-api','26','--output',dex,classJar]);
 run(jar,['-J-Xmx64m','--update','--file',unsigned,'-C',dex,'classes.dex']);
 const aligned=path.join(work,'aligned.apk');run(path.join(bin,'zipalign'+exe),['-f','-p','4',unsigned,aligned]);
 const keystore=path.join(process.env.USERPROFILE||process.env.HOME,'.android/debug.keystore');
 if(!fs.existsSync(keystore)){fs.mkdirSync(path.dirname(keystore),{recursive:true});run(path.join(home,'bin','keytool'+exe),['-J-Xmx64m','-genkeypair','-keystore',keystore,'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Android Debug,O=Android,C=US','-keyalg','RSA','-keysize','2048','-validity','10000','-storetype','JKS','-noprompt']);}
 const out=path.join(project,'app/build/outputs/apk/debug/app-debug.apk');fs.mkdirSync(path.dirname(out),{recursive:true});
 console.log('Assinando APK de teste…');run(java,['-Xmx128m','-jar',path.join(bin,'lib/apksigner.jar'),'sign','--ks',keystore,'--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','androiddebugkey','--out',out,aligned]);
 run(java,['-Xmx128m','-jar',path.join(bin,'lib/apksigner.jar'),'verify','--verbose',out]);console.log('APK pronto: '+out);
}
try{build();}catch(error){console.error(error.message);process.exitCode=1;}
