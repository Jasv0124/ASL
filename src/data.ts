export interface LoadRecord { source_id:string; source_row:number; date:string; region:string; center:string; scheduled:number; loaded:number; reported:string }
export interface Summary {center:string;region:string;scheduled:number;loaded:number;count:number;issues:number}
export type RawRow = {row:number} & Record<string,any>;
export function normalize(rows:RawRow[]) {
  const records:LoadRecord[] = [], errors:string[] = [];
  for (const r of rows) {
    if (!r.A && !r.L && !r.M) continue;
    const center = [r.G,r.H,r.I,r.J,r.K].find(v => String(v ?? '').trim());
    const scheduled = Number(r.L), loaded = Number(r.M);
    if (!center || r.L == null || r.M == null || r.L === '' || r.M === '' || !Number.isInteger(scheduled) || !Number.isInteger(loaded) || scheduled < 0 || loaded < 0) { errors.push(`Fila ${r.row}: centro o cantidades inválidas.`); continue; }
    let date;
    if (r.B instanceof Date) date = r.B.toISOString().slice(0,10);
    else if (Number.isFinite(Number(r.B)) && Number(r.B)>0) date = new Date(Date.UTC(1899,11,30)+Math.floor(Number(r.B))*86400000).toISOString().slice(0,10);
    if (!date) { errors.push(`Fila ${r.row}: fecha inválida.`); continue; }
    records.push({source_id:String(r.A || r.row),source_row:r.row,date,region:String(r.F || 'Sin regional').trim(),center:String(center).trim(),scheduled,loaded,reported:String(r.N || '').trim()});
  }
  return {records,errors};
}
export function status(r:Pick<LoadRecord,'loaded'|'scheduled'>) { return r.loaded > r.scheduled ? 'Revisar' : r.scheduled === 0 ? 'Sin programación' : r.loaded >= r.scheduled ? 'Cumplió' : 'No cumplió'; }
export function summarize(records:LoadRecord[]) {
  const groups = new Map<string,Summary>();
  for (const r of records) {
    const key = `${r.region}|${r.center}`;
    if (!groups.has(key)) groups.set(key,{center:r.center,region:r.region,scheduled:0,loaded:0,count:0,issues:0});
    const g=groups.get(key)!; g.scheduled+=r.scheduled;g.loaded+=r.loaded;g.count++;g.issues+=Number(r.loaded>r.scheduled);
  }
  return [...groups.values()].sort((a,b)=>a.center.localeCompare(b.center,'es'));
}
export function groupStatus(r:Summary) { return r.issues ? 'Revisar' : status(r); }
