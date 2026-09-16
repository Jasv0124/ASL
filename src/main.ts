import './style.css';
import {summarize,status,groupStatus,type LoadRecord} from './data';
import {saveExcel,loadCloud} from './cloud';
import {initIsotanques} from './isotanques';

let records:LoadRecord[]=[], source='Esperando un archivo Excel', page=1, centerPage=1, followupPage=1, earlyLoadPage=1;
let pending:{file:File;records:LoadRecord[]}|null=null;
const number=new Intl.NumberFormat('es-CO');
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const pct=(s:number,l:number)=>s ? `${(l/s*100).toLocaleString('es-CO',{maximumFractionDigits:1})} %`:'—';
const date=(d:string)=>d.split('-').reverse().join('/');
const badge=(s:string)=>`<span class="badge ${s==='Cumplió'?'good':s==='No cumplió'?'bad':'warn'}">${s}</span>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="portal-header"><a class="brand" href="#inicio" aria-label="ASL inicio"><span class="brand-mark">A</span><span class="portal-brand-copy"><strong>ASL</strong><small>Operación logística</small></span></a><div class="header-actions"><button class="ghost" id="capture" hidden>Vista captura</button></div></header>
<main><section id="module-inicio" aria-labelledby="title-inicio">
<div class="portal-hero"><svg class="portal-routes" aria-hidden="true" viewBox="0 0 360 180" fill="none"><path d="M0 140H90Q120 140 120 110V70Q120 40 150 40H360M35 180V120Q35 95 60 95H230Q260 95 260 65V0" stroke="currentColor" stroke-width="2" stroke-dasharray="5 5"/><circle cx="120" cy="95" r="9" fill="currentColor"/></svg><div><p class="portal-kicker">Panel operativo</p><h1 id="title-inicio">Gestión central para ASL</h1><p class="portal-description">Accede a los módulos de tu operación logística.</p></div><div class="portal-count"><span>ESPACIO OPERATIVO</span><strong>2</strong><p>módulos disponibles</p></div></div>
<div class="portal-heading"><div><p class="portal-kicker">Tu espacio de trabajo</p><h2>Módulos disponibles</h2></div><span>2 módulos</span></div>
<nav class="portal-modules" aria-label="Módulos disponibles">
<a class="module-card" href="#cargue"><span class="module-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 17V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12h2m4 0h8m4 0h2v-5l-4-5h-4"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg></span><span class="module-copy"><strong>Cargue</strong><small>Programación, cargue y cumplimiento</small></span><span class="module-arrow" aria-hidden="true">→</span></a>
<a class="module-card module-card-dark" href="#isotanques"><span class="module-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="1"/><rect x="5" y="7" width="14" height="10" rx="5"/><path d="M2 8h3m14 0h3M2 16h3m14 0h3M10 4v3m4-3v3"/></svg></span><span class="module-copy"><strong>Isotanques</strong></span><span class="module-arrow" aria-hidden="true">→</span></a>
</nav></section>
<a href="#inicio" class="back-modules" id="back-modules" hidden>← Volver a módulos</a>
<div id="module-cargue" aria-labelledby="title-cargue"><div class="eyebrow">OPERACIONES / CARGUE</div><section class="intro"><div><h1 id="title-cargue">Cargue<span>.</span></h1><p>La operación de tus centros, antes de las 6:00 a. m.</p></div><button class="primary" id="upload">＋ Importar Excel</button><input type="file" accept=".xlsx" id="file" hidden></section>
<div class="source-line"><span class="live-dot"></span><span id="source"></span><span class="separator">/</span><span id="range"></span></div>
<section class="filters" aria-label="Filtros"><label>Centro de distribución<select id="center"><option value="">Todos los centros</option></select></label><label>Regional<select id="region"><option value="">Todas las regionales</option></select></label><label>Desde<input type="date" id="from"></label><label>Hasta<input type="date" id="to"></label><button class="ghost" id="reset">Restablecer ↺</button></section>
<div id="notice" role="status" aria-live="polite"></div><section id="metrics" class="metrics"></section>
<div class="dashboard-grid"><section class="panel centers-panel"><div class="panel-heading"><div><h2>01 · Centros de distribución</h2><p>Programación y cumplimiento consolidado</p></div><span class="pill" id="center-count"></span></div><div class="table-scroll dashboard-scroll"><table><thead><tr><th>Centro</th><th>Regional</th><th class="numeric">Prog.</th><th class="numeric">Carg.</th><th>Estado</th><th>%</th></tr></thead><tbody id="summary"></tbody><tfoot id="total"></tfoot></table></div><div class="pagination centers-pagination"><span id="center-page-label"></span><div><button id="center-prev" class="ghost" aria-label="Página anterior de centros">←</button><button id="center-next" class="ghost" aria-label="Página siguiente de centros">→</button></div></div></section>
<section class="panel regional-panel"><div class="panel-heading"><div><h2>02 · Regionales</h2><p>Comparativo de desempeño</p></div><span class="pill" id="region-count"></span></div><div id="regional-hero" class="regional-hero"></div><div id="regional" class="regional-cards"></div></section>
<section class="trends-panel"><article class="panel daily-panel"><div class="panel-heading"><div><h2>Tendencia de cumplimiento diario</h2><p>Porcentaje consolidado por fecha</p></div><span class="pill">Últimos 14 días</span></div><div class="chart-body"><canvas id="daily-chart" role="img" aria-label="Gráfico de tendencia diaria de cumplimiento"></canvas></div></article><article class="panel monthly-panel"><div class="panel-heading"><div><h2>Tendencia mensual</h2><p>Evolución por mes</p></div></div><div id="monthly-chart" class="monthly-chart"></div></article></section>
<section class="panel followup-panel"><div class="panel-heading"><div><h2>Seguimiento al cargue antes de las 6:00 a. m.</h2><p>Cantidad de vehículos a cargar, cargados y cumplimiento por CD.</p></div><span class="pill" id="followup-count"></span></div><div class="table-scroll followup-table-scroll"><table><thead><tr><th>CD</th><th>Regional</th><th class="numeric">Vehículos a cargar</th><th class="numeric">Vehículos cargados</th><th class="numeric">Cumplimiento</th></tr></thead><tbody id="followup"></tbody></table></div><div class="pagination followup-pagination"><span id="followup-page-label"></span><div><button id="followup-prev" class="ghost" aria-label="Página anterior del seguimiento">←</button><button id="followup-next" class="ghost" aria-label="Página siguiente del seguimiento">→</button></div></div></section>
<section class="panel early-load-panel"><div class="panel-heading"><div><h2>Cargue diario</h2><p>Seguimiento diario del cumplimiento por CD.</p></div><span class="pill" id="early-load-count"></span></div><div class="table-scroll early-load-table-scroll"><table><thead id="early-load-head"></thead><tbody id="early-load"></tbody></table></div><div class="pagination early-load-pagination"><span id="early-load-page-label"></span><div><button id="early-load-prev" class="ghost" aria-label="Página anterior del cargue diario">←</button><button id="early-load-next" class="ghost" aria-label="Página siguiente del cargue diario">→</button></div></div></section>
<section class="panel detail-panel"><div class="panel-heading"><div><h2>03 · Últimos registros</h2><p>Detalle operativo del período</p></div><span class="pill" id="record-count"></span></div><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Centro</th><th class="numeric">Prog.</th><th class="numeric">Carg.</th><th>Estado</th><th class="numeric">%</th></tr></thead><tbody id="detail"></tbody></table></div><div class="pagination"><span id="page-label"></span><div><button id="prev" class="ghost" aria-label="Página anterior">←</button><button id="next" class="ghost" aria-label="Página siguiente">→</button></div></div></section></div>
<footer><strong>ASL</strong><span>Control de cargue · Primera versión</span><span>Fuente: Registro de cargue · Fecha basada en «Hora de inicio»</span></footer></div>
<section id="module-isotanques" aria-labelledby="title-isotanques" hidden><div id="isotanques-app"></div></section></main>
<dialog id="import-dialog"><div class="dialog-title"><h2>Importar Excel</h2><button class="close" data-close="import-dialog" aria-label="Cerrar">×</button></div><p id="preview-text"></p><p class="hint">Puedes revisar el archivo en pantalla o guardarlo directamente. El guardado se realiza automáticamente en segundo plano.</p><div id="import-message" role="status"></div><div class="dialog-actions"><button class="ghost" id="preview">Ver sin guardar</button><button class="primary" id="save">Guardar archivo</button></div></dialog>`;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const value=(id:string)=>el<HTMLInputElement>(id).value;
function message(id:string,text:string,error=false){el(id).textContent=text;el(id).className=text?`notice ${error?'error':''}`:'';}
function options(){for(const [id,key,title] of [['center','center','Todos los centros'],['region','region','Todas las regionales']] as const){el(id).innerHTML=`<option value="">${title}</option>`+[...new Set(records.map(r=>r[key]))].sort((a,b)=>a.localeCompare(b,'es')).map(v=>`<option value="${escape(v)}">${escape(v)}</option>`).join('');}}
function filtered(){return records.filter(r=>(!value('center')||r.center===value('center'))&&(!value('region')||r.region===value('region'))&&(!value('from')||r.date>=value('from'))&&(!value('to')||r.date<=value('to')));}
function render(){
 const rows=filtered(),groups=summarize(rows),scheduled=rows.reduce((s,r)=>s+r.scheduled,0),loaded=rows.reduce((s,r)=>s+r.loaded,0),issues=rows.filter(r=>r.loaded>r.scheduled).length;
 el('source').textContent=source;const dates=records.map(r=>r.date).sort();el('range').textContent=dates.length?`${date(dates[0])} — ${date(dates.at(-1)!)}`:'Sin registros';
 const met=[['VH programados',number.format(scheduled),'Vehículos previstos en el período'],['VH cargados',number.format(loaded),'Reportados antes de las 6:00 a. m.'],['Porcentaje de cargue',pct(scheduled,loaded),issues?'Incluye datos pendientes de revisión':'Meta de operación: 100 %'],['Centros que cumplieron',`${groups.filter(g=>groupStatus(g)==='Cumplió').length} <small>/ ${groups.length}</small>`,'Sin inconsistencias en sus registros']];
 el('metrics').innerHTML=met.map(([label,val,sub],i)=>`<article class="metric metric-${i+1} ${i===2?'featured':''}"><div><span class="metric-icon">${['↗','✓','%','◎'][i]}</span><span class="metric-label">${label}</span><span class="metric-number">0${i+1}</span></div><strong>${val}</strong><p>${sub}</p></article>`).join('');
 message('notice',value('from')&&value('to')&&value('from')>value('to')?'La fecha inicial debe ser anterior a la fecha final.':issues?`${issues} registros por revisar: los VH cargados superan a los programados. Se conservan las cifras originales; sus centros quedan marcados como «Revisar».`:'');
 const regionGroups=[...new Set(rows.map(r=>r.region))].map(region=>{const items=rows.filter(r=>r.region===region);return {region,scheduled:items.reduce((s,r)=>s+r.scheduled,0),loaded:items.reduce((s,r)=>s+r.loaded,0),issues:items.filter(r=>r.loaded>r.scheduled).length};}).sort((a,b)=>(b.scheduled?b.loaded/b.scheduled:0)-(a.scheduled?a.loaded/a.scheduled:0));
 el('center-count').textContent=`${groups.length} centros`;el('region-count').textContent=`${regionGroups.length} regionales`;el('record-count').textContent=`${number.format(rows.length)} registros`;
 const overallPct=scheduled?Math.min(100,loaded/scheduled*100):0,failed=Math.max(0,scheduled-loaded);
 el('regional-hero').innerHTML=`<div class="donut" style="--value:${overallPct.toFixed(1)}"><div><strong>${pct(scheduled,loaded)}</strong><span>cumplimiento</span></div></div><div class="hero-stats"><div><span>Cargados</span><strong>${number.format(loaded)}</strong></div><div><span>Pendientes</span><strong>${number.format(failed)}</strong></div><div><span>Meta</span><strong>100 %</strong></div></div>`;
 const centerPages=Math.max(1,Math.ceil(groups.length/7));centerPage=Math.min(centerPage,centerPages);
 el('summary').innerHTML=groups.slice((centerPage-1)*7,centerPage*7).map(g=>`<tr><td><strong>${escape(g.center)}</strong><small class="sub">${g.count} reportes</small></td><td><span class="region-tag">${escape(g.region)}</span></td><td class="numeric">${number.format(g.scheduled)}</td><td class="numeric">${number.format(g.loaded)}</td><td>${badge(groupStatus(g))}</td><td class="numeric percentage">${pct(g.scheduled,g.loaded)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>Sin información</strong><small>Importa un Excel para mostrar los centros.</small></td></tr>';
 el('center-page-label').textContent=`Página ${centerPage} de ${centerPages} · Meta 100 %`;el<HTMLButtonElement>('center-prev').disabled=centerPage===1;el<HTMLButtonElement>('center-next').disabled=centerPage===centerPages;
 el('total').innerHTML=rows.length?`<tr><td>Total seleccionado</td><td>${groups.length} centros</td><td class="numeric">${number.format(scheduled)}</td><td class="numeric">${number.format(loaded)}</td><td>${badge(issues?'Revisar':status({scheduled,loaded}))}</td><td>${pct(scheduled,loaded)}</td></tr>`:'';
 const followupPages=Math.max(1,Math.ceil(groups.length/8));followupPage=Math.min(followupPage,followupPages);
 el('followup-count').textContent=`${groups.length} CD`;
 el('followup').innerHTML=groups.slice((followupPage-1)*8,followupPage*8).map(g=>`<tr><td><strong>${escape(g.center)}</strong></td><td><span class="region-tag">${escape(g.region)}</span></td><td class="numeric">${number.format(g.scheduled)}</td><td class="numeric">${number.format(g.loaded)}</td><td class="numeric"><strong>${pct(g.scheduled,g.loaded)}</strong><br>${badge(groupStatus(g))}</td></tr>`).join('')||'<tr><td colspan="5" class="empty"><strong>Sin información</strong><small>Importa un Excel para mostrar el seguimiento.</small></td></tr>';
 el('followup-page-label').textContent=`Página ${followupPage} de ${followupPages}`;el<HTMLButtonElement>('followup-prev').disabled=followupPage===1;el<HTMLButtonElement>('followup-next').disabled=followupPage===followupPages;
 const earlyDates=[...new Set(rows.map(r=>r.date))].sort();
 const earlyCenters=[...new Set(rows.map(r=>r.center))].sort((a,b)=>a.localeCompare(b,'es'));
 const earlyByCenter=new Map<string,Map<string,{scheduled:number;loaded:number}>>();
 for(const row of rows){const byDate=earlyByCenter.get(row.center)??new Map<string,{scheduled:number;loaded:number}>();const totals=byDate.get(row.date)??{scheduled:0,loaded:0};totals.scheduled+=row.scheduled;totals.loaded+=row.loaded;byDate.set(row.date,totals);earlyByCenter.set(row.center,byDate);}
 const earlyPages=Math.max(1,Math.ceil(earlyCenters.length/8));earlyLoadPage=Math.min(earlyLoadPage,earlyPages);
 el('early-load-count').textContent=`${earlyCenters.length} CD · ${earlyDates.length} días`;
 el('early-load-head').innerHTML=`<tr><th>CD</th>${earlyDates.map(d=>`<th class="numeric day-header"><strong>${Number(d.slice(8))}</strong><small>Seguimiento %</small></th>`).join('')}<th class="numeric accumulated-header">Cumplimiento acumulado</th></tr>`;
 el('early-load').innerHTML=earlyCenters.slice((earlyLoadPage-1)*8,earlyLoadPage*8).map(center=>{const byDate=earlyByCenter.get(center)!;const totals=[...byDate.values()].reduce((sum,item)=>({scheduled:sum.scheduled+item.scheduled,loaded:sum.loaded+item.loaded}),{scheduled:0,loaded:0});return `<tr><td><strong>${escape(center)}</strong></td>${earlyDates.map(day=>{const dayTotals=byDate.get(day);return `<td class="numeric">${dayTotals?`<strong>${pct(dayTotals.scheduled,dayTotals.loaded)}</strong>`:'—'}</td>`}).join('')}<td class="numeric"><strong>${pct(totals.scheduled,totals.loaded)}</strong></td></tr>`}).join('')||`<tr><td colspan="${earlyDates.length+2}" class="empty"><strong>Sin información</strong><small>Importa un Excel para mostrar el cargue diario.</small></td></tr>`;
 el('early-load-page-label').textContent=`Página ${earlyLoadPage} de ${earlyPages}`;el<HTMLButtonElement>('early-load-prev').disabled=earlyLoadPage===1;el<HTMLButtonElement>('early-load-next').disabled=earlyLoadPage===earlyPages;
 el('regional').innerHTML=regionGroups.map((g,i)=>`<article class="region-card region-${i%4}"><div class="region-card-top"><span><i></i>${escape(g.region)}</span><strong>${pct(g.scheduled,g.loaded)}</strong></div><div class="region-bar"><i style="width:${g.scheduled?Math.min(100,g.loaded/g.scheduled*100):0}%"></i></div><div class="region-values"><div><span>Programados</span><strong>${number.format(g.scheduled)}</strong></div><div><span>Cargados</span><strong>${number.format(g.loaded)}</strong></div>${g.issues?`<div class="region-issue"><span>Revisar</span><strong>${g.issues}</strong></div>`:'<div class="region-ok"><span>Calidad</span><strong>OK</strong></div>'}</div></article>`).join('')||'<div class="empty">Sin datos.</div>';
 renderTrends(rows);
 const pages=Math.max(1,Math.ceil(rows.length/7));page=Math.min(page,pages);const sorted=[...rows].sort((a,b)=>b.date.localeCompare(a.date)||b.source_row-a.source_row);
 el('detail').innerHTML=sorted.slice((page-1)*7,page*7).map(r=>`<tr><td>${date(r.date)}<small class="sub">Id ${escape(r.source_id)} · Fila ${r.source_row}</small></td><td>${escape(r.center)}</td><td class="numeric">${number.format(r.scheduled)}</td><td class="numeric">${number.format(r.loaded)}</td><td>${badge(status(r))}</td><td class="numeric">${pct(r.scheduled,r.loaded)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>Sin registros</strong><small>Los datos aparecerán después de importar el Excel.</small></td></tr>';
 el('page-label').textContent=`Página ${page} de ${pages}`;el<HTMLButtonElement>('prev').disabled=page===1;el<HTMLButtonElement>('next').disabled=page===pages;
}
function replace(next:LoadRecord[],name:string){records=next;source=name;page=1;centerPage=1;followupPage=1;earlyLoadPage=1;options();el<HTMLInputElement>('from').value='';el<HTMLInputElement>('to').value='';render();}
for(const id of ['center','region','from','to'])el(id).addEventListener('change',()=>{page=1;centerPage=1;followupPage=1;earlyLoadPage=1;render();});
el('reset').onclick=()=>{for(const id of ['center','region','from','to'])el<HTMLInputElement>(id).value='';page=1;centerPage=1;followupPage=1;earlyLoadPage=1;render();};
el('capture').onclick=()=>{const tv=location.hash==='#isotanques';document.body.classList.toggle(tv?'tv-view':'capture-view');el('capture').textContent=document.body.classList.contains(tv?'tv-view':'capture-view')?'Salir de TV':'Modo TV';};
el('prev').onclick=()=>{page--;render();};el('next').onclick=()=>{page++;render();};
el('center-prev').onclick=()=>{centerPage--;render();};el('center-next').onclick=()=>{centerPage++;render();};
el('followup-prev').onclick=()=>{followupPage--;render();};el('followup-next').onclick=()=>{followupPage++;render();};
el('early-load-prev').onclick=()=>{earlyLoadPage--;render();};el('early-load-next').onclick=()=>{earlyLoadPage++;render();};
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(b=>b.onclick=()=>el<HTMLDialogElement>(b.dataset.close!).close());
el('upload').onclick=()=>el<HTMLInputElement>('file').click();
el('file').onchange=async()=>{const file=el<HTMLInputElement>('file').files?.[0];if(!file)return;try{message('notice','Leyendo Excel…');pending={file,records:await (await import('./excel')).parseExcel(file)};el('preview-text').textContent=`${file.name} · ${number.format(pending.records.length)} registros · ${summarize(pending.records).length} centros.`;message('import-message','');el<HTMLDialogElement>('import-dialog').showModal();render();}catch(e){message('notice',errorText(e),true);}finally{el<HTMLInputElement>('file').value='';}};
el('preview').onclick=()=>{if(pending)replace(pending.records,`${pending.file.name} · Vista previa, sin guardar`);el<HTMLDialogElement>('import-dialog').close();};
function errorText(e:unknown){const text=e instanceof Error?e.message:String((e as {message?:string})?.message??e);return /schema cache|does not exist|Bucket not found/i.test(text)?'Falta preparar las tablas de Supabase. Ejecuta supabase/setup.sql en el SQL Editor del proyecto.':text;}
el('save').onclick=async()=>{if(!pending)return;const b=el<HTMLButtonElement>('save');b.disabled=true;message('import-message','Guardando archivo y registros…');try{await saveExcel(pending.file,pending.records);replace(await loadCloud(),'Supabase · Datos guardados');el<HTMLDialogElement>('import-dialog').close();message('notice','Excel y registros guardados correctamente en Supabase.');pending=null;}catch(e){message('import-message',errorText(e),true);}finally{b.disabled=false;}};
type TrendPoint={label:string;scheduled:number;loaded:number};
let trendRows:LoadRecord[]=[];
function aggregateTrend(rows:LoadRecord[],key:(row:LoadRecord)=>string){const map=new Map<string,TrendPoint>();for(const row of rows){const label=key(row);const item=map.get(label)??{label,scheduled:0,loaded:0};item.scheduled+=row.scheduled;item.loaded+=row.loaded;map.set(label,item);}return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label));}
function renderTrends(rows:LoadRecord[]){
 trendRows=rows;
 const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
 const monthly=aggregateTrend(rows,r=>r.date.slice(0,7)).slice(-6);
 el('monthly-chart').innerHTML=monthly.map(m=>{const value=m.scheduled?m.loaded/m.scheduled*100:0;const [year,month]=m.label.split('-');return `<div class="month-row"><span>${months[Number(month)-1]} <small>${year}</small></span><div class="month-bar"><i style="width:${Math.min(100,value)}%"></i></div><strong>${value.toLocaleString('es-CO',{maximumFractionDigits:1})} %</strong></div>`;}).join('')||'<div class="empty">Sin datos</div>';
 requestAnimationFrame(()=>drawDaily(rows));
}
function drawDaily(rows:LoadRecord[]){
 const canvas=el<HTMLCanvasElement>('daily-chart'),box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(ratio,ratio);ctx.clearRect(0,0,box.width,box.height);
 const data=aggregateTrend(rows,r=>r.date).slice(-14),left=34,right=18,top=18,bottom=24,w=box.width-left-right,h=box.height-top-bottom;
 if(!data.length){ctx.fillStyle='#718895';ctx.font='11px DM Sans';ctx.fillText('Sin datos para el período',left,top+20);return;}
 const values=data.map(d=>d.scheduled?d.loaded/d.scheduled*100:0),rawMin=Math.min(...values),rawMax=Math.max(...values),min=Math.max(0,Math.floor((rawMin-2)/5)*5),max=Math.max(100,Math.ceil((rawMax+1)/5)*5),range=Math.max(5,max-min);const x=(i:number)=>left+(data.length===1?w/2:i*w/(data.length-1)),y=(v:number)=>top+(max-v)/range*h;
 ctx.strokeStyle='#d9e5eb';ctx.lineWidth=1;for(let i=0;i<3;i++){const gy=top+h*i/2;ctx.beginPath();ctx.moveTo(left,gy);ctx.lineTo(left+w,gy);ctx.stroke();const val=max-range*i/2;ctx.fillStyle='#79909c';ctx.font='9px DM Sans';ctx.textAlign='right';ctx.fillText(`${Math.round(val)}%`,left-6,gy+3);}
 ctx.strokeStyle='#0b4566';ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();data.forEach((d,i)=>{const px=x(i),py=y(values[i]);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();
 data.forEach((d,i)=>{const px=x(i),py=y(values[i]);ctx.fillStyle=values[i]>=100?'#0bab78':values[i]>=95?'#ffb21c':'#ef6756';ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#21485c';ctx.font='8px DM Sans';ctx.textAlign='center';ctx.fillText(`${values[i].toLocaleString('es-CO',{maximumFractionDigits:0})}%`,px,Math.max(8,py-7));if(i===0||i===data.length-1||data.length<=8||i%2===0){ctx.fillStyle='#6e8794';ctx.fillText(d.label.slice(8),px,box.height-7);}});
}
window.addEventListener('resize',()=>drawDaily(trendRows));
function showModule(){
 const active=location.hash==='#isotanques'?'isotanques':location.hash==='#cargue'?'cargue':'inicio';
 for(const name of ['inicio','cargue','isotanques']){
  el(`module-${name}`).hidden=name!==active;
 }
 el('back-modules').hidden=active==='inicio';
 el('capture').hidden=active==='inicio';
 document.body.classList.remove('tv-view');
 document.body.classList.remove('capture-view');
 el('capture').textContent=active==='isotanques'?'Modo TV':'Vista captura';
 document.title=`ASL · ${active==='inicio'?'Módulos':active==='cargue'?'Cargue':'Isotanques'}`;
 window.scrollTo(0,0);
 if(active==='cargue')requestAnimationFrame(()=>drawDaily(trendRows));
}
window.addEventListener('hashchange',showModule);
showModule();
initIsotanques();
options();render();
