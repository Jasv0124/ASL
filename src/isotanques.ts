import readXlsxFile from 'read-excel-file';
import rawData from './isotanques-data.tsv?raw';

type IsoRecord={
 id:string;week:number;day:number;month:string;date:string;center:string;management:string;
 totalPallets:number;base:number;typeA:number;typeB:number;typeC:number;capacity:number;hl:number;
 full:number;process:number;empty:number;damaged:number;people:number;note:string;
};

const nf=new Intl.NumberFormat('es-CO');
const decimal=new Intl.NumberFormat('es-CO',{maximumFractionDigits:1});
const clean=(value:unknown)=>String(value??'').replace(/\u00a0/g,' ').trim();
const num=(value:unknown)=>Number(clean(value).replace(',','.'))||0;
const safe=(value:unknown)=>clean(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const isoDate=(value:unknown)=>{
 if(value instanceof Date)return value.toISOString().slice(0,10);
 const match=clean(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
 return match?`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`:'';
};
function fromRows(rows:unknown[][]):IsoRecord[]{
 return rows.slice(1).filter(row=>clean(row[0])&&clean(row[8])).map(row=>({
  id:clean(row[0]),week:num(row[4]),day:num(row[5]),month:clean(row[6]).toLowerCase(),date:isoDate(row[7]),center:clean(row[8]),management:clean(row[9]),
  totalPallets:num(row[11]),base:num(row[12]),typeA:num(row[13]),typeB:num(row[14]),typeC:num(row[15]),capacity:num(row[16]),hl:num(row[17]),
  full:num(row[18]),process:num(row[19]),empty:num(row[20]),damaged:num(row[21]),people:num(row[22]),note:clean(row[23])
 })).filter(row=>row.date);
}
function parseTsv(text:string){return fromRows(text.trim().split(/\r?\n/).map(line=>line.split('\t')));}

let records=parseTsv(rawData);
let view:'pallets'|'tanks'='tanks';
const root=()=>document.getElementById('isotanques-app')!;
const value=(id:string)=>((document.getElementById(id) as HTMLSelectElement)?.value??'');
const unique=(key:keyof IsoRecord)=>[...new Set(records.map(row=>String(row[key])))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
const options=(items:string[],selected='',all='Todas')=>`<option value="">${all}</option>${items.map(item=>`<option value="${safe(item)}" ${item===selected?'selected':''}>${safe(item)}</option>`).join('')}`;

function filtered(){
 const rows=records.filter(row=>(!value('iso-center')||row.center===value('iso-center'))&&(!value('iso-management')||row.management===value('iso-management'))&&(!value('iso-week')||row.week===Number(value('iso-week')))&&(!value('iso-month')||row.month===value('iso-month'))&&(!value('iso-day')||row.day===Number(value('iso-day'))));
 const latest=new Map<string,IsoRecord>();
 for(const row of rows){const current=latest.get(row.center);if(!current||row.date>current.date||(row.date===current.date&&Number(row.id)>Number(current.id)))latest.set(row.center,row);}
 return [...latest.values()];
}
const sum=(rows:IsoRecord[],key:keyof IsoRecord)=>rows.reduce((total,row)=>total+Number(row[key]),0);
const by=(rows:IsoRecord[],key:keyof IsoRecord,metric:keyof IsoRecord)=>{
 const map=new Map<string,number>();for(const row of rows)map.set(String(row[key]),(map.get(String(row[key]))||0)+Number(row[metric]));return [...map].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
};
function horizontal(items:{label:string;value:number}[],empty='Sin datos'){
 const max=Math.max(...items.map(item=>item.value),1);
 return items.length?`<div class="iso-hbars">${items.map(item=>`<div class="iso-hrow"><span title="${safe(item.label)}">${safe(item.label)}</span><i><b style="width:${item.value/max*100}%"></b></i><strong>${nf.format(item.value)}</strong></div>`).join('')}</div>`:`<div class="iso-empty">${empty}</div>`;
}
function funnel(items:{label:string;value:number}[]){
 const max=Math.max(...items.map(item=>item.value),1);
 return items.length?`<div class="iso-funnel">${items.map(item=>`<div><span>${safe(item.label)}</span><i style="width:${Math.max(3,item.value/max*100)}%">${nf.format(item.value)}</i></div>`).join('')}</div>`:'<div class="iso-empty">Sin datos</div>';
}
function panel(title:string,content:string,cls=''){return `<article class="iso-panel ${cls}"><h3>${title}</h3>${content}</article>`;}
function cards(rows:IsoRecord[]){
 if(view==='pallets'){
  const total=sum(rows,'totalPallets'),centers=new Set(rows.map(r=>r.center)).size,average=centers?total/centers:0,rank=by(rows,'center','totalPallets');
  return `<div class="iso-cards">${[['▦','Total estibas',nf.format(total),'Estibas'],['▥','CD reportados',nf.format(centers),'Centros de distribución'],['↗','Promedio por CD',decimal.format(average),'Estibas'],['⇧','Mayor inventario',rank[0]?.label||'—',rank[0]?nf.format(rank[0].value):'Sin datos'],['⇩','Menor inventario',rank.at(-1)?.label||'—',rank.at(-1)?nf.format(rank.at(-1)!.value):'Sin datos']].map((c,i)=>`<article class="iso-card c${i}"><span>${c[0]}</span><div><small>${c[1]}</small><strong>${safe(c[2])}</strong><p>${safe(c[3])}</p></div></article>`).join('')}</div>`;
 }
 return `<div class="iso-cards">${[['◯','Total HL por verter',nf.format(sum(rows,'hl')),'HL'],['▥','Centros de distribución',nf.format(new Set(rows.map(r=>r.center)).size),'CD'],['▣','Isotanques llenos',nf.format(sum(rows,'full')),'Unidades'],['◆','Isotanques averiados',nf.format(sum(rows,'damaged')),'Unidades'],['□','Isotanques vacíos',nf.format(sum(rows,'empty')),'Unidades']].map((c,i)=>`<article class="iso-card c${i}"><span>${c[0]}</span><div><small>${c[1]}</small><strong>${safe(c[2])}</strong><p>${safe(c[3])}</p></div></article>`).join('')}</div>`;
}
function palletsDashboard(rows:IsoRecord[]){
 const centers=by(rows,'center','totalPallets'),management=by(rows,'management','totalPallets'),total=sum(rows,'totalPallets');
 const colors=['#d71920','#27272a','#ef4444','#71717a','#f87171','#a1a1aa','#991b1b','#52525b'];
 const donut=centers.length?`<div class="iso-donut-wrap"><div class="iso-donut" style="background:conic-gradient(${centers.map((item,i)=>`${colors[i%colors.length]} ${centers.slice(0,i).reduce((s,x)=>s+x.value,0)/total*100}% ${centers.slice(0,i+1).reduce((s,x)=>s+x.value,0)/total*100}%`).join(',')})"><span>${nf.format(total)}<small>estibas</small></span></div><div class="iso-legend">${centers.map((item,i)=>`<span><i style="background:${colors[i%colors.length]}"></i>${safe(item.label)} <b>${total?decimal.format(item.value/total*100):0}%</b></span>`).join('')}</div></div>`:'<div class="iso-empty">Sin datos</div>';
 const typeRows=[...rows].sort((a,b)=>b.typeC-a.typeC);
 const maxType=Math.max(...typeRows.map(r=>r.typeC),1);
 const typeChart=`<div class="iso-columns">${typeRows.map(r=>`<div title="${safe(r.center)}: ${nf.format(r.typeC)}"><strong>${nf.format(r.typeC)}</strong><i style="height:${Math.max(2,r.typeC/maxType*100)}%"></i><span>${safe(r.center)}</span></div>`).join('')}</div>`;
 const abc=`<div class="iso-table-wrap"><table><thead><tr><th>CD</th><th>Base</th><th>Tipo A</th><th>Tipo B</th><th>Tipo C</th><th>Total</th></tr></thead><tbody>${rows.sort((a,b)=>b.totalPallets-a.totalPallets).map(r=>`<tr><td>${safe(r.center)}</td><td>${nf.format(r.base)}</td><td>${nf.format(r.typeA)}</td><td>${nf.format(r.typeB)}</td><td>${nf.format(r.typeC)}</td><td><strong>${nf.format(r.totalPallets)}</strong></td></tr>`).join('')}</tbody></table></div>`;
 return `<div class="iso-grid iso-pallets-grid">${panel('Total estibas por CD',horizontal(centers),'iso-full-panel')}${panel('Inventario A, B y C',abc,'iso-table-panel')}${panel('Seguimiento diario',dailyTable(rows,'totalPallets'),'iso-table-panel')}${panel('Participación por CD',donut)}${panel('Total estibas por gerencia',funnel(management))}${panel('Tipo C por CD',typeChart)}</div>`;
}
function dailyTable(rows:IsoRecord[],metric:keyof IsoRecord){
 const history=records.filter(row=>(!value('iso-center')||row.center===value('iso-center'))&&(!value('iso-management')||row.management===value('iso-management'))&&(!value('iso-week')||row.week===Number(value('iso-week')))&&(!value('iso-month')||row.month===value('iso-month')));
 const dates=[...new Set(history.map(row=>row.date))].sort().slice(-5);
 return `<div class="iso-table-wrap"><table><thead><tr><th>CD</th>${dates.map(d=>`<th>${Number(d.slice(8))}</th>`).join('')}<th>Total</th></tr></thead><tbody>${[...rows].sort((a,b)=>a.center.localeCompare(b.center,'es')).map(r=>`<tr><td>${safe(r.center)}</td>${dates.map(d=>`<td>${history.filter(x=>x.center===r.center&&x.date===d).sort((a,b)=>Number(b.id)-Number(a.id))[0]?.[metric]??'—'}</td>`).join('')}<td><strong>${nf.format(Number(r[metric]))}</strong></td></tr>`).join('')}</tbody></table></div>`;
}
function tanksDashboard(rows:IsoRecord[]){
 const hlCenters=by(rows,'center','hl'),management=by(rows,'management','hl'),damaged=by(rows,'center','damaged');
 const inventory=`<div class="iso-table-wrap"><table><thead><tr><th>CD</th><th>Llenos</th><th>En proceso</th><th>Vacíos</th><th>Averiados</th><th>Novedad</th></tr></thead><tbody>${[...rows].sort((a,b)=>b.damaged-a.damaged||a.center.localeCompare(b.center,'es')).map(r=>`<tr><td>${safe(r.center)}</td><td>${nf.format(r.full)}</td><td>${nf.format(r.process)}</td><td>${nf.format(r.empty)}</td><td><strong>${nf.format(r.damaged)}</strong></td><td title="${safe(r.note)}">${safe(r.note||'Sin novedad')}</td></tr>`).join('')}</tbody></table></div>`;
 const damagedChart=`<div class="iso-columns">${damaged.map(r=>`<div><strong>${nf.format(r.value)}</strong><i style="height:${Math.max(2,r.value/Math.max(...damaged.map(x=>x.value),1)*100)}%"></i><span>${safe(r.label)}</span></div>`).join('')}</div>`;
 return `<div class="iso-grid">${panel('Total HL por CD',horizontal(hlCenters),'wide')}${panel('Resumen diario · HL',dailyTable(rows,'hl'),'wide')}${panel('Total HL por gerencia',funnel(management),'wide')}${panel('Inventario de isotanques',inventory,'span2')}${panel('Isotanques averiados por CD',damagedChart,'wide')}</div>`;
}
function render(){
 const rows=filtered();
 document.getElementById('iso-results')!.innerHTML=`${cards(rows)}${view==='pallets'?palletsDashboard(rows):tanksDashboard(rows)}`;
 document.querySelectorAll<HTMLButtonElement>('[data-iso-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.isoView===view));
}
function filters(){
 const latest=records.map(r=>r.date).sort().at(-1)||'';
 const latestRow=records.find(r=>r.date===latest);
 return `<div class="iso-filters"><label>CD<select id="iso-center">${options(unique('center'),'','Todos')}</select></label><label>Semana<select id="iso-week">${options(unique('week'),'','Todas')}</select></label><label>Mes<select id="iso-month" value="${safe(latestRow?.month)}">${options(unique('month'),latestRow?.month,'Todos')}</select></label><label>Día<select id="iso-day">${options(unique('day'),String(latestRow?.day??''),'Todos')}</select></label><label>Gerencia<select id="iso-management">${options(unique('management'),'','Todas')}</select></label></div>`;
}
export function initIsotanques(){
 document.body.classList.remove('tv-view');
 root().innerHTML=`<div class="iso-titlebar"><div><span>CONTROL Y SEGUIMIENTO</span><h1 id="title-isotanques">Inventario de isotanques</h1><p>Regional Norte</p></div><div class="iso-updated"><small>Fecha de actualización</small><strong>${records.map(r=>r.date).sort().at(-1)?.split('-').reverse().join('/')||'—'}</strong></div></div><div class="iso-actions"><div class="iso-tabs"><button data-iso-view="tanks" class="active">Isotanques</button><button data-iso-view="pallets">Inventario de estibas</button></div><label class="iso-import">＋ Importar Excel<input type="file" id="iso-file" accept=".xlsx" hidden></label></div>${filters()}<div id="iso-message" role="status"></div><div id="iso-results"></div>`;
 root().querySelectorAll('select').forEach(select=>select.addEventListener('change',render));
 root().querySelectorAll<HTMLButtonElement>('[data-iso-view]').forEach(btn=>btn.onclick=()=>{view=btn.dataset.isoView as typeof view;render();});
 (document.getElementById('iso-file') as HTMLInputElement).onchange=async event=>{
  const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
  const message=document.getElementById('iso-message')!;
  try{const rows=await readXlsxFile(file);const header=rows[0]?.map(clean)||[];if(!header.some(h=>h.includes('Total Estibas ABC'))||!header.some(h=>h.includes('Isotanques Llenos')))throw Error('El Excel no tiene la estructura esperada de estibas e isotanques.');const parsed=fromRows(rows as unknown[][]);if(!parsed.length)throw Error('No se encontraron registros válidos.');records=parsed;initIsotanques();const success=document.getElementById('iso-message')!;success.className='notice';success.textContent=`${file.name}: ${nf.format(records.length)} registros cargados.`;}catch(error){message.className='notice error';message.textContent=error instanceof Error?error.message:String(error);}
 };
 render();
}
