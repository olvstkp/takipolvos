-- Label taslakları için tablo
create extension if not exists pgcrypto;

create table if not exists public.label_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb not null,
  thumbnail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Eski tabloda varsa eksik kolonları ekle
do $$ begin
  alter table public.label_templates add column if not exists thumbnail text;
exception when duplicate_column then null; end $$;

-- RLS ve basit açık politikalar (ihtiyaca göre sıkılaştırın)
alter table public.label_templates enable row level security;
do $$ begin
  create policy label_templates_select on public.label_templates for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy label_templates_insert on public.label_templates for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy label_templates_update on public.label_templates for update using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy label_templates_delete on public.label_templates for delete using (true);
exception when duplicate_object then null; end $$;


