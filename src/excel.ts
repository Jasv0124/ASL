import readXlsxFile from 'read-excel-file';
import {normalize,type RawRow} from './data';
export async function parseExcel(file:File) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw Error('Selecciona un archivo Excel .xlsx.');
  if (file.size>10*1024*1024) throw Error('El archivo supera el límite de 10 MB.');
  const rows=await readXlsxFile(file);
  const header=rows[0]?.map(v=>String(v??'').trim()) ?? [];
  if (!header[11]?.includes('Cantidad de vehículos a cargar') || !header[12]?.includes('Cantidad de vehículos cargados')) throw Error('La primera hoja debe tener la estructura del Registro de cargue original (columnas L y M).');
  const raw=rows.slice(1).map((row,i)=>Object.assign({row:i+2},Object.fromEntries(row.map((value,j)=>[String.fromCharCode(65+j),value])))) as RawRow[];
  const result=normalize(raw);
  if (result.errors.length) throw Error(`${result.errors.length} filas inválidas. ${result.errors.slice(0,3).join(' ')}`);
  if (!result.records.length) throw Error('No se encontraron registros de cargue.');
  if (new Set(result.records.map(r=>JSON.stringify([r.source_id,r.date,r.region,r.center]))).size!==result.records.length) throw Error('El archivo repite un Id para la misma fecha, regional y centro. Revisa esos registros.');
  return result.records;
}
