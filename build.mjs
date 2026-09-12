import {readFile,writeFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const source = (await readFile('app.jsx','utf8')) + '\n' + (await readFile('shim.jsx','utf8'));
const {code} = await transform(source,{loader:'jsx',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',minify:true,target:'es2020'});
const template = await readFile('index.template.html','utf8');
await writeFile('index.html',template.replace('/* APP_BUNDLE */',()=>code.replace(/<\/script/gi,'<\\/script')));
console.log('Built index.html');
