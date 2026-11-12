// SPDX-License-Identifier: MIT
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const args=process.argv.slice(2);
function arg(flag){const i=args.indexOf(flag);return i<0?undefined:args[i+1];}
const root=path.resolve(arg('--app-root')||'.');
const dir=path.resolve(arg('--output')||'.');
const packPath=arg('--language-pack');
if(!arg('--app-root')||!arg('--output')||!packPath)throw Error('Usage: node build.cjs --app-root APP_ROOT --output BACKUP_DIR --language-pack MAIN_I18N_JSON');
if(root===dir||dir.startsWith(root+path.sep))throw Error('Output must be outside the Cursor application directory.');
const supported=JSON.parse(fs.readFileSync(path.join(__dirname,'supported-build.json'),'utf8'));
if(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version!==supported.version)throw Error('Unsupported Cursor version. Expected '+supported.version);
for(const entry of supported.files){const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,entry.file))).digest('hex');if(actual!==entry.originalSHA256)throw Error('Unsupported/modified resource: '+entry.file+'. Restore your original installation before preparing a patch.');}
fs.mkdirSync(dir,{recursive:true});
const acorn=require(path.join(root,'node_modules/acorn'));
const dictionary = new Map();
const nlsKeys=JSON.parse(fs.readFileSync(path.join(root,'out/nls.keys.json'),'utf8'));
const nlsMessages=JSON.parse(fs.readFileSync(path.join(root,'out/nls.messages.json'),'utf8'));
const pack=JSON.parse(fs.readFileSync(packPath,'utf8')).contents;
let nlsIndex=0;
for(const [module,keys] of nlsKeys) for(const key of keys){const original=nlsMessages[nlsIndex++],translated=pack[module]?.[key];if(typeof original==='string'&&typeof translated==='string'&&/[\u3400-\u9fff]/.test(translated)&&!original.includes('{')&&!original.includes('&&'))dictionary.set(original,translated);}
const official=new Set(dictionary.keys());
const machinePath=path.join(__dirname,'machine-translations.json');
if(fs.existsSync(machinePath))for(let [a,b] of Object.entries(JSON.parse(fs.readFileSync(machinePath,'utf8')))){if(/agent/i.test(a))b=b.replace(/特工|代理人/g,'智能体');if(/\bCursor\b/.test(a))b=b.replace(/光标/g,'Cursor');if(/model/i.test(a))b=b.replace(/型号/g,'模型');dictionary.set(a,b);official.add(a);}
for(const line of fs.readFileSync(path.join(__dirname, 'translations.tsv'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const i = line.indexOf('\t');
  if (i < 1) throw Error('Invalid translation: ' + line);
  dictionary.set(line.slice(0,i),line.slice(i+1));
  official.delete(line.slice(0,i));
}
const uiKeys = new Set(['label','title','description','children','tooltip','tooltipContent','placeholder','placeholderContent','aria-label','ariaLabel','accessibleLabel','containerAriaLabel','nameColumn','pageTitle','newAgentLabel','newAutomationButtonLabel','emptyTitle','emptyDescription','buttonLabel','message','detail','heading','subtitle','caption','confirmLabel','cancelLabel']);
const shortConstants = new Set(['ULl','Jrg','ego']);
const files = ['out/vs/workbench/workbench.glass.main.js','out/vs/workbench/workbench.desktop.main.js','out/vs/workbench/workbench.anysphere-ui-automations.js','out/vs/workbench/workbench.xai-commerce-prepaid.js'];
const selectedFiles=files;
const report=[];
const missing=new Map();
for (const relative of selectedFiles) {
  const filename = path.join(root,relative);
  const backup = path.join(dir,path.basename(filename)+'.original');
  if(!fs.existsSync(backup)) fs.copyFileSync(filename,backup);
  const expected=supported.files.find(entry=>entry.file===relative).originalSHA256;
  if(crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex')!==expected)throw Error('Original backup hash mismatch: '+relative);
  const source = fs.readFileSync(backup,'utf8');
  let ast = acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const uiReferences=new Set();
  const referenceStack=[ast];
  while(referenceStack.length){const node=referenceStack.pop();if(node.type==='Property'&&uiKeys.has(node.key.name??node.key.value)&&node.value?.type==='Identifier'&&node.value.name.length>=3)uiReferences.add(node.value.name);for(const value of Object.values(node)){if(Array.isArray(value)){for(const child of value)if(child?.type)referenceStack.push(child);}else if(value?.type)referenceStack.push(value);}}
  const edits=[];
  const hits={};
  function walk(node,parent,ancestors) {
    if(!node || typeof node !== 'object') return;
    const nodeText=node.type==='Literal'&&typeof node.value==='string'?node.value:node.type==='TemplateLiteral'&&parent?.type!=='TaggedTemplateExpression'?node.quasis.map((q,i)=>q.value.cooked+(i<node.expressions.length?'__CZH_EXPR_'+i+'__':'')).join(''):undefined;
    const isReferencedConstant=(parent?.type==='AssignmentExpression'&&uiReferences.has(parent.left?.name)||parent?.type==='VariableDeclarator'&&uiReferences.has(parent.id?.name))&&/\s/.test(nodeText??'');
    if(typeof nodeText==='string' && dictionary.has(nodeText)) {
      const value=nodeText;
      const key=parent?.type==='Property' ? (parent.key.name ?? parent.key.value) : null;
      const isKey=parent?.type==='Property' && parent.key===node;
      const isCompare=parent?.type==='BinaryExpression' || parent?.type==='SwitchCase' || parent?.type==='MemberExpression';
      const isMap=ancestors.some(x=>(x.type==='VariableDeclarator' && ['hHn','tO1','nO1'].includes(x.id?.name))||(x.type==='AssignmentExpression'&&['hHn','tO1','nO1'].includes(x.left?.name)));
      const displayKeys=new Set([...uiKeys,'projectAgentsSectionLabel','collectionLabel','columnHeader','allLabel','selectPlaceholder','sectionTitle','hintText','pillLabel','header','body','clientDisplayName','inputboxShortModelName','displayLabel']);
      const isUI=(parent?.type==='Property'&&parent.value===node&&displayKeys.has(key))||ancestors.slice(-4).some(x=>x.type==='Property'&&displayKeys.has(x.key.name??x.key.value)&&['ConditionalExpression','LogicalExpression','ArrayExpression','CallExpression'].includes(parent?.type));
      const isLong=!official.has(value)&&/\s/.test(value) && value.length>5;
      const isConstant=parent?.type==='VariableDeclarator' && shortConstants.has(parent.id?.name);
      const fixedShort=(['UQf'].includes(parent?.id?.name)||parent?.type==='AssignmentExpression'&&parent.left?.name==='UQf');
      if(!isKey && !isCompare && (isUI || isLong || isMap || isConstant||fixedShort||isReferencedConstant||['Docs','Pin','Unpin','Colors'].includes(value))) {
        let replacement=JSON.stringify(dictionary.get(value));
        if(node.type==='TemplateLiteral'&&node.expressions.length){const translated=dictionary.get(value),regex=/__CZH_EXPR_(\d+)__/g,segments=[];let last=0,match,seen=[];while((match=regex.exec(translated))){const expr=node.expressions[Number(match[1])];if(!expr)throw Error('Unknown template placeholder');segments.push(JSON.stringify(translated.slice(last,match.index)),'('+source.slice(expr.start,expr.end)+')');last=match.index+match[0].length;seen.push(Number(match[1]));}segments.push(JSON.stringify(translated.slice(last)));if(seen.length!==node.expressions.length||new Set(seen).size!==seen.length)throw Error('Lost template placeholder for '+value);replacement='('+segments.join('+')+')';}
        edits.push({start:node.start,end:node.end,text:replacement,original:value});
        hits[value]=(hits[value]||0)+1;
        if(node.type==='TemplateLiteral')return;
      }
    }
    if(typeof nodeText==='string'&&!dictionary.has(nodeText)&&/[A-Za-z]{2}/.test(nodeText)&&!/[\u3400-\u9fff]/.test(nodeText)&&nodeText.length<1500&&nodeText.length>2&&!/^(https?:|[a-z0-9_.:/-]+$)/.test(nodeText)&&((parent?.type==='Property'&&parent.value===node&&uiKeys.has(parent.key.name??parent.key.value)&&!['content','message'].includes(parent.key.name??parent.key.value))||(parent?.type==='CallExpression'&&ancestors.slice(-4).some(x=>x.type==='Property'&&uiKeys.has(x.key.name??x.key.value)))||isReferencedConstant))missing.set(nodeText,(missing.get(nodeText)||0)+1);
    const next=ancestors.length>8 ? ancestors.slice(-7).concat(node) : ancestors.concat(node);
    for(const key of Object.keys(node)) {
      if(key==='start'||key==='end') continue;
      const value=node[key];
      if(Array.isArray(value)) { for(const child of value) if(child?.type) walk(child,node,next); }
      else if(value?.type) walk(value,node,next);
    }
  }
  walk(ast,null,[]);
  ast=null;
  const parts=[];let offset=0;
  for(const edit of edits.sort((a,b)=>a.start-b.start)) {
    if(edit.start<offset) throw Error('Overlapping edits');
    parts.push(source.slice(offset,edit.start),edit.text);offset=edit.end;
  }
  parts.push(source.slice(offset));
  let patched=parts.join('');
  if(relative.includes('.glass.')){
    const tr='function __cursorZhUi(t){return typeof t==="string"&&Object.prototype.hasOwnProperty.call(__cursorZhUiDict,t)?__cursorZhUiDict[t]:t}var __cursorZhUiDict='+JSON.stringify(Object.fromEntries(dictionary))+';';
    patched=tr+patched;
    for(const expression of ['k.action.title','k.action.subtitle'])patched=patched.split('children:'+expression+'}').join('children:__cursorZhUi('+expression+')}');
    patched=patched.replace('renderText:SR0,size:"sm",text:Te,','renderText:SR0,size:"sm",text:__cursorZhUi(Te),');
    patched=patched.split('?"关闭设置":"Settings"').join('?"关闭设置":"设置"');
    patched=patched.replace('R="Repositories",x="group"','R="仓库",x="group"');
    patched=patched.replace('F="Auto";break e}case"fallback"','F="自动";break e}case"fallback"');
    patched=patched.split('?"Unpin":"Pin"').join('?"取消置顶":"置顶"');
  }
  const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:patched,encoding:'utf8',maxBuffer:4*1024*1024});
  if(checked.status!==0)throw Error('Generated module syntax invalid: '+relative+' '+checked.stderr);
  fs.writeFileSync(path.join(dir,path.basename(filename)+'.localized'),patched,'utf8');
  report.push({file:relative,replacements:edits.length,distinct:Object.keys(hits).length,hits,originalSHA256:crypto.createHash('sha256').update(source).digest('hex'),patchedSHA256:crypto.createHash('sha256').update(patched).digest('hex')});
  console.log(relative+': '+edits.length+' replacements, '+Object.keys(hits).length+' translated phrases');
  if(global.gc)global.gc();
}
fs.writeFileSync(path.join(dir,'patch-report.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(dir,'apply-manifest.json'),JSON.stringify(report.map(({hits,...entry})=>entry),null,2));
fs.writeFileSync(path.join(dir,'missing-ui.json'),JSON.stringify([...missing].sort((a,b)=>b[1]-a[1]),null,2));
const productFile=path.join(root,'product.json');
const productBackup=path.join(dir,'product.original.json');
if(!fs.existsSync(productBackup))fs.copyFileSync(productFile,productBackup);
const product=JSON.parse(fs.readFileSync(productBackup,'utf8'));
let text=fs.readFileSync(productBackup,'utf8');
for(const relative of files){
  const checksumKey=relative.replace(/^out\//,'');
  if(product.checksums?.[checksumKey]){
    const old=product.checksums[checksumKey];
    const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,path.basename(relative)+'.localized'))).digest('base64').replace(/=+$/,'');
    text=text.replace(JSON.stringify(checksumKey)+': '+JSON.stringify(old),JSON.stringify(checksumKey)+': '+JSON.stringify(hash));
    if(text.includes(JSON.stringify(old)))throw Error('Checksum update did not match '+relative);
  }
}
fs.writeFileSync(path.join(dir,'product.localized.json'),text);
