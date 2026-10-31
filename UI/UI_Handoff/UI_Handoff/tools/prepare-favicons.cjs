// Handoff-only derivatives of the supplied infinity mark. No UI Lab files change.
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const source = path.resolve(process.argv[2] || path.join(root,'../reloop-ui-lab'));
const sharp = require(path.join(source,'node_modules/sharp'));
async function main() {
  const brand = path.join(root,'public/brand');
  const input = path.join(brand,'reloop-infinity-on-light.png');
  const icon = await sharp(input).resize(28,28,{fit:'contain',background:'#FFFFFF'}).extend({top:2,bottom:2,left:2,right:2,background:'#FFFFFF'}).png().toBuffer();
  await fs.writeFile(path.join(brand,'favicon-32.png'),icon);
  await sharp(input).resize(132,132,{fit:'contain',background:'#FFFFFF'}).extend({top:24,bottom:24,left:24,right:24,background:'#FFFFFF'}).png().toFile(path.join(brand,'apple-touch-icon.png'));
  // ICO directory + PNG image data (supported by modern browsers).
  const header = Buffer.alloc(22); header.writeUInt16LE(1,2); header.writeUInt16LE(1,4);
  header[6]=32;header[7]=32;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);
  header.writeUInt32LE(icon.length,14);header.writeUInt32LE(22,18);
  await fs.writeFile(path.join(root,'public/favicon.ico'),Buffer.concat([header,icon]));
  console.log('Prepared favicon.ico, favicon-32.png and apple-touch-icon.png from the supplied infinity artwork.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
