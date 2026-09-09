import {createClient} from '@supabase/supabase-js';
import type {LoadRecord} from './data';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=key ? createClient(import.meta.env.VITE_SUPABASE_URL,key):null;
async function getStorageUser() {
  if(!supabase) throw Error('Falta configurar la clave pública de Supabase.');
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.user) return session.user;
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error) throw Error('No se pudo activar el guardado automático. Habilita Anonymous Sign-Ins en Supabase Auth.');
  if(!data.user) throw Error('No se pudo crear la sesión de guardado.');
  return data.user;
}
export async function saveExcel(file:File,records:LoadRecord[]) {
  if(!supabase) throw Error('Falta configurar la clave pública de Supabase.');
  const client=supabase;
  const user=await getStorageUser();
  const bytes=await file.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const path=`${user.id}/${hash}.xlsx`;
  const {data:existing,error:lookup}=await client.from('asl_imports').select('id').eq('file_hash',hash).maybeSingle();
  if(lookup) throw lookup;
  if(existing) throw Error('Este archivo ya está guardado en Supabase.');
  const {error:upload}=await client.storage.from('asl-excel').upload(path,file,{contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',upsert:false});
  if(upload) throw upload;
  const {error}=await client.rpc('asl_save_import',{p_filename:file.name,p_hash:hash,p_path:path,p_records:records});
  if(error) {await client.storage.from('asl-excel').remove([path]);throw error;}
}
export async function loadCloud():Promise<LoadRecord[]> {
  if(!supabase) throw Error('Supabase no está configurado.');
  const result:LoadRecord[]=[];
  for(let start=0;;start+=1000) {
    const {data,error}=await supabase.from('asl_records').select('source_id,source_row,date,region,center,scheduled,loaded,reported').order('id').range(start,start+999);
    if(error) throw error;
    result.push(...data);
    if(data.length<1000) break;
  }
  return result;
}
