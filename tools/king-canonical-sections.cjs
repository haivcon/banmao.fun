'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function section(file,name){
 const source=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
 const start=`// BEGIN CANONICAL ${name}\n`,end=`// END CANONICAL ${name}\n`;
 const a=source.indexOf(start),b=source.indexOf(end);
 if(a<0||b<a||source.indexOf(start,a+1)>=0)throw Error(`Missing/duplicate canonical section ${name} in ${file}`);
 return source.slice(a,b+end.length);
}
module.exports={section};
