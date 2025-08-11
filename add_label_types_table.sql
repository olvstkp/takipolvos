-- Label types configuration table
create table if not exists public.label_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  fields jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_label_types_name on public.label_types(name);

-- RLS
alter table public.label_types enable row level security;
do $$ begin
  create policy if not exists "label_types_read" on public.label_types for select using (true);
  create policy if not exists "label_types_write" on public.label_types for insert with check (true);
  create policy if not exists "label_types_update" on public.label_types for update using (true) with check (true);
  create policy if not exists "label_types_delete" on public.label_types for delete using (true);
exception when others then null; end $$;


