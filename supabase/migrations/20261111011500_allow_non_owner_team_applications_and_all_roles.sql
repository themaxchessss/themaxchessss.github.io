drop policy if exists "Applicants can submit their own application" on public.team_applications;
create policy "Non-owner players can submit their own application"
on public.team_applications
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and (select auth.uid()) <> 'f686e7f3-45ee-47bd-9279-c835b088744b'::uuid
);

alter table public.team_applications
  drop constraint if exists team_applications_role_check;

alter table public.team_applications
  add constraint team_applications_role_check
  check (role = any (array[
    'Puzzle maker',
    'Lesson writer or coach',
    'Chess coach',
    'Quiz maker',
    'Opening researcher',
    'Endgame specialist',
    'Tournament organizer',
    'Event host',
    'Game broadcaster',
    'Stream / video helper',
    'Chess content creator',
    'Community helper',
    'Fair-play helper',
    'Designer',
    'Website tester',
    'Bug reporter',
    'Translator',
    'Accessibility helper',
    'Documentation writer',
    'Website developer',
    'Ambassador',
    'Something else'
  ]::text[]));
