create table if not exists public.maxchess_site_settings (
 setting_key text primary key check (char_length(setting_key) between 1 and 80),
 setting_value jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.maxchess_site_settings enable row level security;
grant select on public.maxchess_site_settings to anon, authenticated;
grant insert, update on public.maxchess_site_settings to authenticated;
insert into public.maxchess_site_settings(setting_key,setting_value) values ('homepage_theme',jsonb_build_object('name','Original MaxChess')) on conflict (setting_key) do nothing;
create policy "Homepage theme is publicly readable" on public.maxchess_site_settings for select to anon,authenticated using (true);
create policy "Only MaxChess owner can change site settings" on public.maxchess_site_settings for insert to authenticated with check ((select auth.uid())='f686e7f3-45ee-47bd-9279-c835b088744b'::uuid);
create policy "Only MaxChess owner can update site settings" on public.maxchess_site_settings for update to authenticated using ((select auth.uid())='f686e7f3-45ee-47bd-9279-c835b088744b'::uuid) with check ((select auth.uid())='f686e7f3-45ee-47bd-9279-c835b088744b'::uuid);