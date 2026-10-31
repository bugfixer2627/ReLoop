// Local handoff assembly. Only the explicitly listed UI Lab paths are read.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || path.join(root, '../reloop-ui-lab'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest = [];
function copy(relative, destination = relative) {
  const from = path.join(source, relative), to = path.join(root, destination);
  const stat = fs.lstatSync(from);
  if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${relative}`);
  if (stat.isDirectory()) {
    for (const item of fs.readdirSync(from)) copy(path.join(relative, item), path.join(destination, item));
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive:true });
  fs.copyFileSync(from, to);
  manifest.push({source:relative.replaceAll('\\','/'),destination:destination.replaceAll('\\','/'),sha256:digest(from),bytes:stat.size});
}
for (const item of ['src','public']) copy(item);
for (const name of ['README.md','DESIGN_DECISIONS.md','ASSET_LICENSES.md','BRAND_ASSETS.md','TEMPLATE_COMPARISON.md','INTEGRATION_GUIDE.md']) copy(name,`reference-docs/${name}`);
for (const name of fs.readdirSync(path.join(source,'screenshots/brand-kit'))) {
  if (/\.png$/.test(name)) copy(`screenshots/brand-kit/${name}`,`screenshots/${name}`);
}
copy('tailwind.config.ts','build-reference/tailwind.config.ts');
copy('postcss.config.mjs','build-reference/postcss.config.mjs');
const css = fs.readFileSync(path.join(source,'src/app/globals.css'),'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*([^;}]+)/g)].filter(match=>!match[2].includes('var(')).map(match=>[`--${match[1]}`,match[2].trim()]));
fs.mkdirSync(path.join(root,'design-tokens'),{recursive:true});
fs.writeFileSync(path.join(root,'design-tokens/tokens.json'),JSON.stringify({description:'Reference inventory only. globals.css then brand.css remain the authoritative cascade.',tokens,fontFamily:'Inter, Microsoft YaHei, PingFang SC, Noto Sans CJK SC, Arial, sans-serif',sidebarDesktopPx:280,cardRadiusDesktopPx:24},null,2)+'\n');
const ts = require(path.join(source,'node_modules/typescript'));
const inventory = [];
for (const entry of manifest.filter(entry=>entry.source.endsWith('.tsx'))) {
  const text = fs.readFileSync(path.join(source,entry.source),'utf8');
  const file = ts.createSourceFile(entry.source,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const values = [], states = [];
  function visit(node) {
    if (ts.isJsxText(node) && node.text.trim()) values.push({kind:'jsx-text',line:file.getLineAndCharacterOfPosition(node.pos).line+1,value:node.text.trim()});
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(file)==='useState') states.push({binding:node.name.getText(file),initialValue:node.initializer.arguments.map(arg=>arg.getText(file)).join(', ')});
    if (ts.isJsxAttribute(node) && ['defaultValue','value','placeholder'].includes(node.name.getText(file)) && node.initializer && ts.isStringLiteral(node.initializer)) values.push({kind:node.name.getText(file),value:node.initializer.text});
    ts.forEachChild(node,visit);
  }
  visit(file);
  inventory.push({file:entry.source,states,values});
}
fs.mkdirSync(path.join(root,'mock-data'),{recursive:true});
fs.writeFileSync(path.join(root,'mock-data/source-inventory.json'),JSON.stringify({mock:true,description:'Exact source-derived static UI text/input and useState inventory, including non-data UI labels. The canonical fixtures remain embedded in src; this file is not a service or runtime data provider.',files:inventory},null,2)+'\n');
fs.writeFileSync(path.join(root,'SOURCE_MANIFEST.json'),JSON.stringify({description:'Exact copied implementation/assets/reference screenshot hashes. Generated handoff-only docs, favicon derivatives and contracts are excluded from this source-copy manifest.',entries:manifest},null,2)+'\n');
console.log(`Copied ${manifest.length} allowlisted files; source screens and assets are byte-identical.`);
