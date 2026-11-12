// SPDX-License-Identifier: MIT
'use strict';
const fs=require('node:fs'),path=require('node:path');
const [appRoot,argvPath]=process.argv.slice(2);
if(!appRoot||!argvPath)throw Error('Usage: node locale.cjs APP_ROOT ARGV_JSON');
const acorn=require(path.join(appRoot,'node_modules/acorn'));
const original=fs.existsSync(argvPath)?fs.readFileSync(argvPath,'utf8'):'{\n}\n';
const tokens=acorn.tokenizer(original,{ecmaVersion:'latest'});
const first=tokens.getToken();
if(first.type.label!=='{')throw Error('argv.json must contain a JSONC object');
const object=acorn.parseExpressionAt(original,first.start,{ecmaVersion:'latest'});
if(object.type!=='ObjectExpression')throw Error('argv.json is not an object');
const property=object.properties.find(p=>p.type==='Property'&&(p.key.value??p.key.name)==='locale');
let result;
if(property)result=original.slice(0,property.value.start)+'"zh-cn"'+original.slice(property.value.end);
else {
  const last=object.properties.at(-1);
  let head=original.slice(0,object.end-1);
  if(last){const trailing=original.slice(last.end,object.end-1);const tailTokens=acorn.tokenizer(trailing,{ecmaVersion:'latest'});if(tailTokens.getToken().type.label!==',')head=head.slice(0,last.end)+','+head.slice(last.end);}
  result=head+'\n\t"locale": "zh-cn"\n'+original.slice(object.end-1);
}
acorn.parseExpressionAt(result,first.start,{ecmaVersion:'latest'});
fs.mkdirSync(path.dirname(argvPath),{recursive:true});
fs.writeFileSync(argvPath,result,'utf8');
