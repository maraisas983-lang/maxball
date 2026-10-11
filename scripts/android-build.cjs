const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const {buildAssets}=require('./android-assets.cjs');
let server;try{server=require('./android-server.cjs').serverUrl();}catch(error){console.error(error.message);process.exit(1);}
buildAssets();
const win=process.platform==='win32',project=path.resolve(__dirname,'../android'),tools=path.resolve(__dirname,'../.work/android-toolchain'),wrapper=path.join(project,'gradle/wrapper/gradle-wrapper.jar');
if(!fs.existsSync(wrapper)){console.error('Wrapper Gradle ausente. Restaure android/gradle/wrapper antes de compilar.');process.exit(1);}
const env={...process.env},portableJdk=path.join(tools,'jdk'),javaName=win?'java.exe':'java';
if(!env.JAVA_HOME&&fs.existsSync(portableJdk)){const folder=fs.readdirSync(portableJdk).find(name=>fs.existsSync(path.join(portableJdk,name,'bin',javaName)));if(folder)env.JAVA_HOME=path.join(portableJdk,folder);}
if(!env.ANDROID_HOME&&!env.ANDROID_SDK_ROOT&&fs.existsSync(path.join(tools,'sdk','platforms','android-35')))env.ANDROID_HOME=path.join(tools,'sdk');
if(!env.GRADLE_USER_HOME&&fs.existsSync(portableJdk))env.GRADLE_USER_HOME=path.join(tools,'gradle-home');
const java=env.JAVA_HOME?path.join(env.JAVA_HOME,'bin',javaName):'java';const jdk=spawnSync(java,['-version'],{encoding:'utf8',windowsHide:true,env}),version=(jdk.stderr||jdk.stdout||'').match(/version \"(\d+)(?:\.(\d+))?/),major=version?(version[1]==='1'?Number(version[2]):Number(version[1])):0;if(major<17){console.error('A compilação Android exige JDK 17 ou superior. Configure JAVA_HOME para o JDK do Android Studio.');process.exit(1);}
const args=['-Xmx128m','-classpath',wrapper,'org.gradle.wrapper.GradleWrapperMain','--no-daemon','--max-workers=1','-Dorg.gradle.jvmargs=-Xmx768m -Dfile.encoding=UTF-8','assembleDebug'];if(server)args.push('-PMAXBALL_SERVER_URL='+server);if(env.MAXBALL_OFFLINE==='1')args.push('-PMAXBALL_OFFLINE=1');
const result=spawnSync(java,args,{cwd:project,stdio:'inherit',env,windowsHide:true});if(result.error)console.error(result.error.message);process.exitCode=result.status??1;
if(result.status===0)console.log('APK pronto: '+path.join(project,'app/build/outputs/apk/debug/app-debug.apk'));
