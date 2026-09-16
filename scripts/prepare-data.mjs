import fs from 'node:fs';
import {normalize} from '../src/data.ts';
const rows=JSON.parse(fs.readFileSync('src/raw-data.json','utf8').replace(/^\uFEFF/,''));
const result=normalize(rows.slice(1));
if(result.errors.length) throw Error(result.errors.join('\n'));
fs.writeFileSync('src/initial-data.json',JSON.stringify(result.records));
console.log(`Preparados ${result.records.length} registros: ${result.records.reduce((s,r)=>s+r.scheduled,0)}. Cargados: ${result.records.reduce((s,r)=>s+r.loaded,0)}.`);
