const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const source = path.resolve(process.argv[2] || path.join(root,'../reloop-ui-lab'));
const ts = require(path.join(source,'node_modules/typescript'));
const sha = file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'SOURCE_MANIFEST.json'),'utf8'));
const failures = [];
for (const entry of manifest.entries) {
  if (sha(path.join(root,entry.destination))!==entry.sha256) failures.push(`Handoff changed: ${entry.destination}`);
  if (sha(path.join(source,entry.source))!==entry.sha256) failures.push(`Source changed: ${entry.source}`);
}
const files=[];
function visit(directory) {
  for (const item of fs.readdirSync(directory,{withFileTypes:true})) {
    const file=path.join(directory,item.name), relative=path.relative(root,file).replaceAll('\\','/');
    if(item.isSymbolicLink()) failures.push(`Symlink: ${relative}`);
    if(/^(node_modules|\.next|out|dist|build|coverage|\.git|\.chrome-capture)$/.test(item.name) || /^\.env(?:\.|$)/.test(item.name) || /\.(tsbuildinfo|log|pem|key)$/.test(item.name) || /^(credentials|config\.env|next-env\.d\.ts)$/.test(item.name)) failures.push(`Excluded artifact: ${relative}`);
    if(item.isDirectory()) visit(file); else files.push(file);
  }
}
visit(root);
const sourceFiles=files.filter(file=>/\.(ts|tsx)$/.test(file) && !file.includes('build-reference'));
const options={target:ts.ScriptTarget.ES5,lib:['lib.dom.d.ts','lib.dom.iterable.d.ts','lib.esnext.d.ts'],strict:true,skipLibCheck:true,noEmit:true,esModuleInterop:true,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.ReactJSX,resolveJsonModule:true,isolatedModules:true,baseUrl:root,paths:{'@/*':['src/*']},typeRoots:[path.join(source,'node_modules/@types')]};
const host=ts.createCompilerHost(options);
host.resolveModuleNames=(names,containingFile)=>names.map(name=>{
  let resolved=ts.resolveModuleName(name,containingFile,options,host).resolvedModule;
  if(!resolved && !name.startsWith('.') && !name.startsWith('@/')) resolved=ts.resolveModuleName(name,path.join(source,'src/__handoff_check__.tsx'),options,host).resolvedModule;
  return resolved;
});
const program=ts.createProgram(sourceFiles,options,host);
const diagnostics=ts.getPreEmitDiagnostics(program);
if(diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:file=>file,getNewLine:()=> '\n'}));
  failures.push(`${diagnostics.length} TypeScript diagnostics in copied UI/contracts/fixtures`);
}
const expected=['landing','login','dashboard','feedback-inbox','claim-investigation','fix-approve'];
for(const name of expected) {
 const file=path.join(root,'screenshots',`${name}-1920x1080.png`);
 if(!fs.existsSync(file)) failures.push(`Missing screenshot: ${name}`);
 else {const b=fs.readFileSync(file);if(b.readUInt32BE(16)!==1920 || b.readUInt32BE(20)!==1080) failures.push(`Wrong screenshot dimensions: ${name}`);}
}
for(const file of files.filter(file=>/src[\\/]app[\\/].*[\\/]route\.(ts|js)$/.test(file))) failures.push(`Unexpected route handler: ${file}`);
const result={checkedAt:new Date().toISOString(),sourceFilesPreserved:manifest.entries.length,scannedFiles:files.length,typecheckedFiles:sourceFiles.length,typecheckPassed:diagnostics.length===0,sourceHashMatch:!failures.some(item=>/changed:/.test(item)),excludedArtifactsAbsent:!failures.some(item=>/Excluded artifact|Symlink/.test(item)),desktopScreenshotDimensions:'1920x1080',failures};
fs.mkdirSync(path.join(root,'validation'),{recursive:true});
fs.writeFileSync(path.join(root,'validation/handoff-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
