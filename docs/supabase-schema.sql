create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('photo','project')),
  title text not null,
  description text,
  tags text[] not null default '{}',
  target_page text not null check (target_page in ('art.html','tech.html')),
  image_path text,          -- path inside portfolio-inbox bucket
  link_url text,            -- projects only
  status text not null default 'submitted'
    check (status in ('submitted','ready_to_place','placed')),
  layout jsonb,             -- change spec written by edit mode (Task 4)
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

-- Reads require sign-in (tightened 2026-07-20, migration submissions_read_authenticated;
-- originally "public read"). The service-role key used by scripts/ bypasses RLS.
create policy "authenticated read" on public.submissions
  for select to authenticated using (true);
create policy "authenticated insert" on public.submissions
  for insert to authenticated with check (true);
create policy "authenticated update" on public.submissions
  for update to authenticated using (true);

insert into storage.buckets (id, name, public)
  values ('portfolio-inbox','portfolio-inbox', true)
  on conflict (id) do nothing;

create policy "inbox public read" on storage.objects
  for select using (bucket_id = 'portfolio-inbox');
create policy "inbox auth write" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio-inbox');
