import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url), ts=require('typescript'), sfc=require('@vue/compiler-sfc');
const root=fileURLToPath(new URL('..',import.meta.url)).replaceAll('\\','/').replace(/\/$/,'');
const directory=root+'/apps/studio/src', virtual=new Map();
async function visit(folder){
  for(const entry of await readdir(folder,{withFileTypes:true})){
    const name=folder+'/'+entry.name;
    if(entry.isDirectory())await visit(name);
    else if(name.endsWith('.vue')){
      const parsed=sfc.parse(await readFile(name,'utf8'),{filename:name});
      if(parsed.errors.length)throw new Error(parsed.errors.map(String).join('\n'));
      virtual.set(name+'.check.ts',sfc.compileScript(parsed.descriptor,{id:'studio-typecheck',inlineTemplate:true}).content);
    }
  }
}
await visit(directory);
virtual.set(directory+'/check-shims.d.ts',`declare module '*.vue' { const component: any; export default component; }
declare module '*?url' { const url: string; export default url; }
declare module '*.css';
interface Window { __GSTORY_BRIDGE__?: unknown; }`);
const options={noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,allowImportingTsExtensions:true,skipLibCheck:true,lib:['lib.es2023.d.ts','lib.dom.d.ts','lib.dom.iterable.d.ts']};
const host=ts.createCompilerHost(options),read=host.readFile,exists=host.fileExists;
host.readFile=name=>virtual.get(name)||read(name);host.fileExists=name=>virtual.has(name)||exists(name);
host.getSourceFile=(name,version)=>{const source=host.readFile(name);return source===undefined?undefined:ts.createSourceFile(name,source,version,true);};
const program=ts.createProgram([...virtual.keys(),directory+'/stores/project-store.ts',directory+'/services/local-api.ts',directory+'/boot/icons.ts'],options,host);
const errors=ts.getPreEmitDiagnostics(program);
if(errors.length){console.error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=>'\n'}));process.exitCode=1;}
else console.log('Studio scripts and compiled Vue templates typecheck successfully.');
