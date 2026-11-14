create table if not exists public.team_work_drafts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (char_length(btrim(role)) between 2 and 80),
 title text not null check (char_length(btrim(title)) between 3 and 120),
 content jsonb not null default '{}'::jsonb,
 status text not null default 'draft' check (status in ('draft','submitted','approved','needs_changes')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_at timestamptz
);
alter table public.team_work_drafts enable row level security;
grant select,insert,update on public.team_work_drafts to authenticated;
create policy "Approved members create own work drafts" on public.team_work_drafts for insert to authenticated with check (author_id=(select auth.uid()) and status in ('draft','submitted') and exists(select 1 from public.team_applications a where a.user_id=(select auth.uid()) and a.status='approved' and a.role=team_work_drafts.role));
create policy "Members read own work drafts and owner reads all" on public.team_work_drafts for select to authenticated using (author_id=(select auth.uid()) or (select auth.uid())='f686e7f3-45ee-47bd-9279-c835b088744b'::uuid);
create policy "Members update own drafts and owner reviews" on public.team_work_drafts for update to authenticated using (author_id=(select auth.uid()) or (select auth.uid())='f686e7f3-45ee-47bd-9279-c835b088744b'::uuid) with check (((author_id=(select auth.uid())) and status in ('draft','submitted') and exists(select 1 from public.team_applications a where a.user_id=(select auth.uid()) and a.status='approved' and a.role=team_work_drafts.role)) or (select auth.uid())='f686e7f3-45ee-47bd-9279-c835b088744b'::uuid);
create index if not exists team_work_drafts_author_created_idx on public.team_work_drafts(author_id,created_at desc);
create index if not exists team_work_drafts_status_created_idx on public.team_work_drafts(status,created_at desc);