-- Run after 001_ranked.sql. This migration can be run again.
create table if not exists public.ranked_participants (
 match_id uuid not null references public.ranked_matches(id),
 user_id uuid not null references public.profiles(id),team integer not null check(team in(0,1)),
 rating_before integer not null,rating_after integer not null,primary key(match_id,user_id)
);
insert into public.ranked_participants select id,home_id,0,home_before,home_after from public.ranked_matches on conflict do nothing;
insert into public.ranked_participants select id,away_id,1,away_before,away_after from public.ranked_matches on conflict do nothing;
alter table public.ranked_participants enable row level security;
revoke all on public.ranked_participants from anon,authenticated;
grant select on public.ranked_participants to authenticated;
grant all on public.ranked_participants to service_role;
drop policy if exists own_ranked_participant on public.ranked_participants;
create policy own_ranked_participant on public.ranked_participants for select to authenticated using(user_id=auth.uid());
drop policy if exists own_matches on public.ranked_matches;
create policy own_matches on public.ranked_matches for select to authenticated using(home_id=auth.uid() or away_id=auth.uid() or exists(select 1 from public.ranked_participants p where p.match_id=id and p.user_id=auth.uid()));
create or replace function public.record_ranked_match(result jsonb) returns void language plpgsql security definer set search_path='' as $$
declare mid uuid:=(result->>'id')::uuid;parts jsonb;sa integer;sb integer;avga numeric;avgb numeric;outcome numeric;delta integer;p jsonb;uid uuid;team integer;before_rating integer;after_rating integer;actual integer;total integer;homes integer;aways integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(mid::text,0));
 if exists(select 1 from public.ranked_matches where id=mid) then return;end if;
 parts:=coalesce(result->'participants',jsonb_build_array(jsonb_build_object('user_id',result->>'home_id','team',0,'rating_before',result->>'home_before','rating_after',result->>'home_after'),jsonb_build_object('user_id',result->>'away_id','team',1,'rating_before',result->>'away_before','rating_after',result->>'away_after')));
 select count(*),count(distinct value->>'user_id'),count(*) filter(where (value->>'team')::int=0),count(*) filter(where (value->>'team')::int=1) into total,actual,homes,aways from jsonb_array_elements(parts);
 if total<>actual or homes<>aways or homes<1 or homes>4 or total<>homes+aways then raise exception 'Invalid participants';end if;
 if not exists(select 1 from jsonb_array_elements(parts) where value->>'user_id'=result->>'home_id' and (value->>'team')::int=0) or not exists(select 1 from jsonb_array_elements(parts) where value->>'user_id'=result->>'away_id' and (value->>'team')::int=1) then raise exception 'Invalid leaders';end if;
 perform 1 from public.profiles where id in(select (value->>'user_id')::uuid from jsonb_array_elements(parts)) order by id for update;
 select avg((value->>'rating_before')::numeric) filter(where (value->>'team')::int=0),avg((value->>'rating_before')::numeric) filter(where (value->>'team')::int=1) into avga,avgb from jsonb_array_elements(parts);
 sa:=((result->>'score')::jsonb->>0)::integer;sb:=((result->>'score')::jsonb->>1)::integer;
 if sa is null or sb is null or sa<0 or sb<0 then raise exception 'Invalid score';end if;
 outcome:=case when sa=sb then 0.5 when sa>sb then 1 else 0 end;
 delta:=floor(32*(outcome-1/(1+power(10::numeric,(avgb-avga)/400)))+0.5)::integer;
 for p in select value from jsonb_array_elements(parts) loop
  uid:=(p->>'user_id')::uuid;team:=(p->>'team')::integer;before_rating:=(p->>'rating_before')::integer;after_rating:=(p->>'rating_after')::integer;
  select rating into actual from public.profiles where id=uid;
  if actual is null or before_rating is null or after_rating is null or actual<>before_rating or after_rating<>before_rating+case when team=0 then delta else -delta end then raise exception 'Rating conflict or invalid Elo';end if;
 end loop;
 insert into public.ranked_matches values(mid,(result->>'home_id')::uuid,(result->>'away_id')::uuid,(result->>'home_before')::integer,(result->>'away_before')::integer,(result->>'home_after')::integer,(result->>'away_after')::integer,(result->>'score')::jsonb,result->>'reason',(result->>'created_at')::bigint,(result->>'finished_at')::bigint);
 for p in select value from jsonb_array_elements(parts) loop
  uid:=(p->>'user_id')::uuid;team:=(p->>'team')::integer;
  insert into public.ranked_participants values(mid,uid,team,(p->>'rating_before')::integer,(p->>'rating_after')::integer);
  update public.profiles set rating=(p->>'rating_after')::integer,wins=wins+((team=0 and sa>sb)or(team=1 and sb>sa))::integer,draws=draws+(sa=sb)::integer,losses=losses+((team=0 and sa<sb)or(team=1 and sb<sa))::integer,goals=goals+coalesce((result->'stats'->uid::text->>'goals')::integer,0),assists=assists+coalesce((result->'stats'->uid::text->>'assists')::integer,0) where id=uid;
 end loop;
 insert into public.ranked_events select mid,(ordinality-1)::integer,value from jsonb_array_elements(result->'events') with ordinality;
end $$;
revoke all on function public.record_ranked_match(jsonb) from public,anon,authenticated;
grant execute on function public.record_ranked_match(jsonb) to service_role;
