create or replace function public.maxchess_active_game_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $function$
  select count(*)::bigint
  from public.games
  where status = 'active';
$function$;

revoke all on function public.maxchess_active_game_count() from public;
grant execute on function public.maxchess_active_game_count() to anon, authenticated;
