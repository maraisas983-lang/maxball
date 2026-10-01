-- Execute in the Supabase SQL editor. Service role is used only by Node.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 24),
 rating integer not null default 1000,wins integer not null default 0,
 draws integer not null default 0,losses integer not null default 0,
 goals integer not null default 0,assists integer not null default 0
);
create table if not exists public.ranked_matches (
 id uuid primary key,home_id uuid not null references public.profiles(id),away_id uuid not null references public.profiles(id),
 home_before integer not null,away_before integer not null,home_after integer not null,away_after integer not null,
 score jsonb not null,reason text not null,created_at bigint not null,finished_at bigint not null
);
create table if not exists public.ranked_events (
 match_id uuid not null references public.ranked_matches(id),sequence integer not null,
 payload jsonb not null,primary key(match_id,sequence)
);
alter table public.profiles enable row level security;
alter table public.ranked_matches enable row level security;
alter table public.ranked_events enable row level security;
revoke all on public.profiles,public.ranked_matches,public.ranked_events from anon,authenticated;
grant select on public.profiles,public.ranked_matches,public.ranked_events to authenticated;
grant all on public.profiles,public.ranked_matches,public.ranked_events to service_role;
grant update(display_name) on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy own_name on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy own_matches on public.ranked_matches for select to authenticated using(home_id=auth.uid() or away_id=auth.uid());
create policy own_events on public.ranked_events for select to authenticated using(exists(select 1 from public.ranked_matches m where m.id=match_id and (m.home_id=auth.uid() or m.away_id=auth.uid())));
create or replace function public.create_maxball_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,display_name) values(new.id,left(split_part(new.email,'@',1),24));return new;end $$;
create trigger maxball_signup after insert on auth.users for each row execute function public.create_maxball_profile();
insert into public.profiles(id,display_name) select id,left(split_part(email,'@',1),24) from auth.users on conflict do nothing;
create or replace function public.record_ranked_match(result jsonb) returns void language plpgsql security definer set search_path='' as $$
declare a uuid:=(result->>'home_id')::uuid;b uuid:=(result->>'away_id')::uuid;mid uuid:=(result->>'id')::uuid;
 ar integer;br integer;sa integer;sb integer;outcome numeric;delta integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(mid::text,0));
 if exists(select 1 from public.ranked_matches where id=mid) then return;end if;
 perform 1 from public.profiles where id in(a,b) order by id for update;
 select rating into ar from public.profiles where id=a;select rating into br from public.profiles where id=b;
 if a=b or ar is null or br is null or ar<>(result->>'home_before')::integer or br<>(result->>'away_before')::integer then raise exception 'Rating conflict';end if;
 sa:=((result->>'score')::jsonb->>0)::integer;sb:=((result->>'score')::jsonb->>1)::integer;
 outcome:=case when sa=sb then 0.5 when sa>sb then 1 else 0 end;
 delta:=floor(32*(outcome-1/(1+power(10::numeric,(br-ar)::numeric/400)))+0.5)::integer;
 if ar+delta<>(result->>'home_after')::integer or br-delta<>(result->>'away_after')::integer then raise exception 'Invalid Elo';end if;
 insert into public.ranked_matches values(mid,a,b,ar,br,ar+delta,br-delta,(result->>'score')::jsonb,result->>'reason',(result->>'created_at')::bigint,(result->>'finished_at')::bigint);
 update public.profiles set rating=ar+delta,wins=wins+(sa>sb)::integer,draws=draws+(sa=sb)::integer,losses=losses+(sa<sb)::integer,goals=goals+coalesce((result->'stats'->a::text->>'goals')::integer,0),assists=assists+coalesce((result->'stats'->a::text->>'assists')::integer,0) where id=a;
 update public.profiles set rating=br-delta,wins=wins+(sb>sa)::integer,draws=draws+(sa=sb)::integer,losses=losses+(sb<sa)::integer,goals=goals+coalesce((result->'stats'->b::text->>'goals')::integer,0),assists=assists+coalesce((result->'stats'->b::text->>'assists')::integer,0) where id=b;
 insert into public.ranked_events select mid,(ordinality-1)::integer,value from jsonb_array_elements(result->'events') with ordinality;
end $$;
revoke all on function public.record_ranked_match(jsonb) from public,anon,authenticated;
grant execute on function public.record_ranked_match(jsonb) to service_role;
