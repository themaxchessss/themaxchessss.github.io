alter table public.message_reports
  add column if not exists reviewed_at timestamptz;

create policy "MaxChess owner can view message reports"
on public.message_reports
for select
to authenticated
using ((select auth.uid()) = 'f686e7f3-45ee-47bd-9279-c835b088744b'::uuid);

create policy "MaxChess owner can mark message reports reviewed"
on public.message_reports
for update
to authenticated
using ((select auth.uid()) = 'f686e7f3-45ee-47bd-9279-c835b088744b'::uuid)
with check ((select auth.uid()) = 'f686e7f3-45ee-47bd-9279-c835b088744b'::uuid);

create policy "MaxChess owner can view reported private messages"
on public.direct_messages
for select
to authenticated
using (
  (select auth.uid()) = 'f686e7f3-45ee-47bd-9279-c835b088744b'::uuid
  and exists (
    select 1
    from public.message_reports mr
    where mr.message_id = direct_messages.id
  )
);
