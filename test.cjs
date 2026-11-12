// SPDX-License-Identifier: MIT
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cursor-zh-tests-'));
const root=path.join(temp,'unsupported');fs.mkdirSync(root);
fs.writeFileSync(path.join(root,'package.json'),'{"version":"0.0.0"}');
const output=path.join(temp,'output');
const run=()=>spawnSync(process.execPath,[path.join(__dirname,'build.cjs'),'--app-root',root,'--output',output,'--language-pack',path.join(temp,'unused.json')],{encoding:'utf8'});
assert.notEqual(run().status,0);assert.equal(fs.existsSync(output),false);
fs.writeFileSync(path.join(root,'package.json'),'{"version":"3.29.15"}');
const supported=JSON.parse(fs.readFileSync(path.join(__dirname,'supported-build.json'),'utf8'));
for(const entry of supported.files){const target=path.join(root,entry.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'unrecognized build');}
assert.notEqual(run().status,0);assert.equal(fs.existsSync(output),false);
for(const entry of supported.files)assert.equal(fs.readFileSync(path.join(root,entry.file),'utf8'),'unrecognized build');
console.log('PASS: unsupported versions/builds rejected before output or application mutation');
const i=process.argv.indexOf('--app-root');
if(i>=0){
  const app=path.resolve(process.argv[i+1]);
  for(const [n,input]of ['{\n // 中文注释\n "enabled":true // trailing comment\n}', '{"enabled":true,}', '// header\n{"locale":"en", "enabled":true}', '{}'].entries()){
    const file=path.join(temp,'argv-'+n+'.json');fs.writeFileSync(file,input);
    const result=spawnSync(process.execPath,[path.join(__dirname,'locale.cjs'),app,file],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const text=fs.readFileSync(file,'utf8');assert.match(text,/"locale"\s*:\s*"zh-cn"/);
    if(input.includes('"enabled"'))assert.match(text,/"enabled"\s*:\s*true/);
    if(input.includes('中文注释'))assert.ok(text.includes('中文注释'));
  }
  console.log('PASS: JSONC comments, trailing commas, existing locale and empty object');
}
console.log('Temporary non-executable fixtures: '+temp);
