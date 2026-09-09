import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize,status,summarize,groupStatus} from '../src/data.ts';
test('consolida centros y cantidades sin depender de datos reales',()=>{
 const records=[
  {source_id:'1',source_row:2,date:'2026-09-01',region:'Norte',center:'Centro A',scheduled:10,loaded:10,reported:'Sí'},
  {source_id:'2',source_row:3,date:'2026-09-01',region:'Norte',center:'Centro A',scheduled:5,loaded:4,reported:'No'},
  {source_id:'3',source_row:4,date:'2026-09-01',region:'Sur',center:'Centro B',scheduled:8,loaded:9,reported:'No'}
 ];
 const summary=summarize(records);
 assert.equal(summary.length,2);
 assert.deepEqual(summary.find(r=>r.center==='Centro A'),{center:'Centro A',region:'Norte',scheduled:15,loaded:14,count:2,issues:0});
 assert.equal(records.reduce((s,r)=>s+r.scheduled,0),23);
 assert.equal(records.reduce((s,r)=>s+r.loaded,0),23);
 assert.equal(records.filter(r=>status(r)==='Revisar').length,1);
});
test('no presenta anomalías ni programación cero como cumplimiento',()=>{
 assert.equal(status({scheduled:0,loaded:0}),'Sin programación');
 assert.equal(status({scheduled:10,loaded:11}),'Revisar');
 assert.equal(status({scheduled:10,loaded:9}),'No cumplió');
 assert.equal(status({scheduled:10,loaded:10}),'Cumplió');
 const rows=[{center:'A',region:'Norte',scheduled:10,loaded:11},{center:'A',region:'Norte',scheduled:10,loaded:9}];
 assert.equal(groupStatus(summarize(rows)[0]),'Revisar');
});
test('extrae centro, fecha Excel, ceros y rechaza filas inválidas',()=>{
 const result=normalize([{row:2,A:'1',B:46206,F:'Andes',G:' San Gil ',L:0,M:0},{row:3,P:'Nota libre'},{row:4,A:'2',B:46206,G:'San Gil',L:'x',M:1}]);
 assert.equal(result.records.length,1);assert.equal(result.records[0].center,'San Gil');assert.equal(result.records[0].date,'2026-07-03');assert.equal(result.errors.length,1);
});
