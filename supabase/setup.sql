-- Ejecutar una vez en el SQL Editor del proyecto ohvalcbdwvkcqzivtxff.
begin;
create table if not exists public.asl_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  filename text not null,
  file_hash text not null,
  storage_path text not null,
  record_count integer not null check (record_count > 0),
  created_at timestamptz not null default now(),
  unique(user_id,file_hash)
);
create table if not exists public.asl_records (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  import_id uuid not null references public.asl_imports(id),
  source_id text not null,
  source_row integer not null,
  date date not null,
  region text not null,
  center text not null,
  scheduled integer not null check(scheduled >= 0),
  loaded integer not null check(loaded >= 0),
  reported text not null default '',
  unique(user_id,source_id,date,region,center)
);
alter table public.asl_imports enable row level security;
-- Compatible con la primera versión del esquema que usaba solo Id.
alter table public.asl_records drop constraint if exists asl_records_user_id_source_id_key;
create unique index if not exists asl_records_identity_idx on public.asl_records(user_id,source_id,date,region,center);
alter table public.asl_records enable row level security;
drop policy if exists asl_import_owner on public.asl_imports;
create policy asl_import_owner on public.asl_imports for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists asl_record_owner on public.asl_records;
create policy asl_record_owner on public.asl_records for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update on public.asl_imports,public.asl_records to authenticated;
grant usage,select on sequence public.asl_records_id_seq to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('asl-excel','asl-excel',false,10485760,array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) on conflict(id) do nothing;
drop policy if exists asl_file_owner on storage.objects;
create policy asl_file_owner on storage.objects for all to authenticated
using(bucket_id='asl-excel' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='asl-excel' and (storage.foldername(name))[1]=auth.uid()::text);
create or replace function public.asl_save_import(p_filename text,p_hash text,p_path text,p_records jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records)=0 then raise exception 'No hay registros'; end if;
  if split_part(p_path,'/',1) <> auth.uid()::text then raise exception 'Ruta inválida'; end if;
  insert into public.asl_imports(filename,file_hash,storage_path,record_count)
  values(p_filename,p_hash,p_path,jsonb_array_length(p_records)) returning id into new_id;
  insert into public.asl_records(import_id,source_id,source_row,date,region,center,scheduled,loaded,reported)
  select new_id,r.source_id,r.source_row,r.date,r.region,r.center,r.scheduled,r.loaded,coalesce(r.reported,'')
  from jsonb_to_recordset(p_records) as r(source_id text,source_row integer,date date,region text,center text,scheduled integer,loaded integer,reported text)
  on conflict(user_id,source_id,date,region,center) do update set import_id=excluded.import_id,source_row=excluded.source_row,date=excluded.date,
    region=excluded.region,center=excluded.center,scheduled=excluded.scheduled,loaded=excluded.loaded,reported=excluded.reported;
  return new_id;
end; $$;
revoke all on function public.asl_save_import(text,text,text,jsonb) from public,anon;
grant execute on function public.asl_save_import(text,text,text,jsonb) to authenticated;
commit;
