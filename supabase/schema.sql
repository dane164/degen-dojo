-- DEGEN DOJO: full backend schema (Supabase / Postgres). Run once on a fresh project (SQL Editor → paste → Run).
create extension if not exists pgcrypto with schema extensions;
create schema if not exists dd_private;

create table if not exists public.dd_players(
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 16 and name ~ '^[A-Za-z0-9_.-]+$'),
  elo integer not null default 1000, best_elo integer not null default 1000,
  wins integer not null default 0, losses integer not null default 0, games integer not null default 0, streak integer not null default 0,
  last_fighter text, last_seen timestamptz not null default now(), created_at timestamptz not null default now(),
  wallet text, holder boolean not null default false, holder_at timestamptz);
create unique index if not exists dd_players_name_lower on public.dd_players (lower(name));
create index if not exists dd_players_elo on public.dd_players (elo desc) where games>0;

create table if not exists public.dd_secrets(player_id uuid primary key references public.dd_players(id) on delete cascade, secret_hash bytea not null);

create table if not exists public.dd_matches(
  id uuid primary key default gen_random_uuid(),
  host uuid not null references public.dd_players(id) on delete cascade,
  guest uuid not null references public.dd_players(id) on delete cascade,
  host_fighter text, guest_fighter text, arena text not null,
  status text not null default 'live' check (status in ('live','final','void')),
  winner uuid, host_report uuid, guest_report uuid, host_elo_before integer, guest_elo_before integer, delta integer,
  created_at timestamptz not null default now(), finished_at timestamptz);
create index if not exists dd_matches_host on public.dd_matches(host);
create index if not exists dd_matches_guest on public.dd_matches(guest);

create table if not exists public.dd_queue(
  player_id uuid primary key references public.dd_players(id) on delete cascade,
  elo integer not null, fighter text, joined_at timestamptz not null default now(), polled_at timestamptz not null default now(),
  match_id uuid references public.dd_matches(id) on delete cascade, active boolean not null default true);
create index if not exists dd_queue_match on public.dd_queue(match_id);

create table if not exists public.dd_votes(
  round int not null, player_id uuid not null references public.dd_players(id) on delete cascade,
  candidate text not null check (candidate ~ '^[a-z0-9_-]{1,24}$'), at timestamptz not null default now(),
  primary key(round, player_id));

-- lock every table: the browser can only go through the checked functions below
alter table public.dd_players enable row level security;
alter table public.dd_secrets enable row level security;
alter table public.dd_matches enable row level security;
alter table public.dd_queue enable row level security;
alter table public.dd_votes enable row level security;

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.dd_tier(e integer) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$
  select case when e >= 1700 then 'DOJO MASTER' when e >= 1500 then 'DIAMOND HANDS' when e >= 1350 then 'WHALE'
              when e >= 1200 then 'APE' when e >= 1050 then 'DEGEN' when e >= 900 then 'RETAIL' else 'PAPER HANDS' end;
$function$;

CREATE OR REPLACE FUNCTION dd_private.dd_name_ok(p text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $function$
declare
  strong text := 'n+i+g+g+|^n+i+g+a+s*$|n+i+g+a+h|f+a+g+g+|f+a+g+o+t|k+i+k+e+|c+h+i+n+k|t+r+a+n+n+y|r+e+t+a+r+d|w+e+t+b+a+c+k|b+e+a+n+e+r|c+u+n+t|f+u+c+k|f+u+k+|f+c+k|f+v+c+k|s+h+i+t|b+i+t+c+h|w+h+o+r+e|s+l+u+t|p+u+s+s+y|p+e+n+i+s|v+a+g+i+n+a|r+a+p+i+s+t|n+a+z+i|h+i+t+l+e+r|k+k+k|p+o+r+n|j+i+z+z|t+w+a+t|w+a+n+k|a+s+s+h+o+l+e|d+i+l+d+o|p+e+d+o+p+h|p+e+d+o+f+i+l|m+o+l+e+s+t|c+o+c+k+s+u+c+k|d+i+c+k+h+e+a+d|n+o+n+c+e|s+p+i+c+k';
  words text[] := array['fag','fags','spic','spics','coon','coons','paki','dyke','cock','dick','cum','ass','rape','raped','raper','tit','tits','homo','jap','gook','gooks','nig','nigs','fck','fk','fuk','sex','anal','anus','semen','boob','boobs','piss','crap','bastard','prick','kys'];
  norm text; tok text;
begin
  norm := regexp_replace(translate(lower(p),'0134578@$!|','oieastbasii'),'[^a-z]','','g');
  norm := replace(replace(replace(norm,'therapist',''),'shiitake',''),'scunthorpe','');
  if norm ~ strong then return false; end if;
  foreach tok in array regexp_split_to_array(regexp_replace(p,'([a-z])([A-Z])','\1 \2','g'),'[^A-Za-z0-9]+') loop
    if tok='' then continue; end if;
    if regexp_replace(translate(lower(tok),'0134578@$!|','oieastbasii'),'[^a-z]','','g') = any(words)
       or regexp_replace(lower(tok),'[^a-z]','','g') = any(words) then return false; end if;
  end loop;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION dd_private.dd_auth(pid uuid, secret text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
  select exists(select 1 from dd_secrets s where s.player_id = pid and s.secret_hash = digest(secret, 'sha256'));
$function$;

CREATE OR REPLACE FUNCTION dd_private.dd_profile(pid uuid) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select json_build_object('id',p.id,'name',p.name,'elo',p.elo,'best_elo',p.best_elo,'wins',p.wins,'losses',p.losses,'games',p.games,'streak',p.streak,
    'tier',dd_tier(p.elo),'wallet',p.wallet,'holder',p.holder,
    'rank',case when p.games>0 then (select count(*)+1 from dd_players o where o.games>0 and o.elo>p.elo and o.name not like 'zzTest%') else null end)
  from dd_players p where p.id = pid;
$function$;

CREATE OR REPLACE FUNCTION dd_private.dd_match_info(mid uuid, me uuid) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select json_build_object('status','matched','match_id',m.id,'arena',m.arena,
    'role',case when m.host=me then 'host' else 'guest' end,
    'opponent',json_build_object('id',o.id,'name',o.name,'elo',o.elo,'tier',dd_tier(o.elo),'holder',o.holder,
       'fighter',case when m.host=me then m.guest_fighter else m.host_fighter end))
  from dd_matches m join dd_players o on o.id = case when m.host=me then m.guest else m.host end
  where m.id=mid;
$function$;

-- ---------- API (called from the browser) ----------
CREATE OR REPLACE FUNCTION public.dd_register(p_name text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private', 'extensions' AS $function$
declare new_id uuid; sec text;
begin
  p_name := btrim(p_name);
  if p_name !~ '^[A-Za-z0-9_.-]{3,16}$' or not dd_private.dd_name_ok(p_name) then raise exception 'BAD_NAME'; end if;
  if exists(select 1 from dd_players where lower(name)=lower(p_name)) then raise exception 'NAME_TAKEN'; end if;
  sec := encode(gen_random_bytes(24),'hex');
  insert into dd_players(name) values (p_name) returning id into new_id;
  insert into dd_secrets(player_id, secret_hash) values (new_id, digest(sec,'sha256'));
  return json_build_object('id',new_id,'secret',sec,'profile',dd_profile(new_id));
end $function$;

CREATE OR REPLACE FUNCTION public.dd_me(pid uuid, secret text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  update dd_players set last_seen=now() where id=pid;
  return dd_profile(pid);
end $function$;

CREATE OR REPLACE FUNCTION public.dd_rename(pid uuid, secret text, p_name text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  p_name := btrim(p_name);
  if p_name !~ '^[A-Za-z0-9_.-]{3,16}$' or not dd_private.dd_name_ok(p_name) then raise exception 'BAD_NAME'; end if;
  if exists(select 1 from dd_players where lower(name)=lower(p_name) and id<>pid) then raise exception 'NAME_TAKEN'; end if;
  update dd_players set name=p_name where id=pid;
  return dd_profile(pid);
end $function$;

CREATE OR REPLACE FUNCTION public.dd_heartbeat(pid uuid, secret text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  update dd_players set last_seen=now() where id=pid;
end $function$;

CREATE OR REPLACE FUNCTION public.dd_queue_join(pid uuid, secret text, p_fighter text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
declare me dd_queue; opp dd_queue; my_elo int; mid uuid; waited numeric; rng int;
  arenas text[] := array['floor','moon','bazaar','volcano','dock','coliseum','gas','server','discord','arcade','park','laneway'];
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  update dd_players set last_seen=now() where id=pid returning elo into my_elo;
  insert into dd_queue(player_id, elo, fighter, active) values (pid, my_elo, p_fighter, true)
    on conflict (player_id) do update set polled_at=now(), fighter=excluded.fighter, elo=excluded.elo,
      joined_at = case when dd_queue.active and dd_queue.polled_at > now()-interval '12 seconds' then dd_queue.joined_at else now() end,
      match_id = case when dd_queue.active then dd_queue.match_id else null end,
      active = true;
  select * into me from dd_queue where player_id=pid for update;
  if me.match_id is not null then
    update dd_queue set active=false where player_id=pid;
    return dd_match_info(me.match_id, pid);
  end if;
  waited := extract(epoch from now()-me.joined_at);
  select * into opp from dd_queue q
    where q.player_id<>pid and q.active and q.match_id is null and q.polled_at > now() - interval '8 seconds'
      and abs(q.elo-my_elo) <= 100 + 12*greatest(waited, extract(epoch from now()-q.joined_at))
    order by q.joined_at limit 1 for update skip locked;
  if found then
    insert into dd_matches(host,guest,host_fighter,guest_fighter,arena,host_elo_before,guest_elo_before)
      values (opp.player_id, pid, opp.fighter, p_fighter, arenas[1+floor(random()*12)::int], opp.elo, my_elo) returning id into mid;
    update dd_queue set match_id=mid where player_id=opp.player_id;
    update dd_queue set active=false, match_id=null where player_id=pid;
    return dd_match_info(mid, pid);
  end if;
  rng := (100 + 12*waited)::int;
  return json_build_object('status','waiting','waited',floor(waited),'range',rng,
    'queue',(select count(*) from dd_queue where active and match_id is null and polled_at > now()-interval '8 seconds'));
end $function$;

CREATE OR REPLACE FUNCTION public.dd_queue_leave(pid uuid, secret text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  update dd_queue set active=false where player_id=pid and match_id is null;
end $function$;

CREATE OR REPLACE FUNCTION public.dd_report(pid uuid, secret text, mid uuid, p_winner uuid) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
declare m dd_matches; other uuid; other_seen timestamptz; w uuid; l uuid; we int; le int; ew numeric; d int; age numeric;
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  update dd_players set last_seen=now() where id=pid;
  select * into m from dd_matches where id=mid for update;
  if not found or (m.host<>pid and m.guest<>pid) then raise exception 'NO_MATCH'; end if;
  if m.status='live' then
    if p_winner is not null and p_winner<>m.host and p_winner<>m.guest then raise exception 'BAD_WINNER'; end if;
    if p_winner is not null then
      if pid=m.host then update dd_matches set host_report=p_winner where id=mid; m.host_report:=p_winner;
      else update dd_matches set guest_report=p_winner where id=mid; m.guest_report:=p_winner; end if;
    end if;
    other := case when pid=m.host then m.guest else m.host end;
    select last_seen into other_seen from dd_players where id=other;
    age := extract(epoch from now()-m.created_at);
    w := null;
    if m.host_report is not null and m.guest_report is not null then
      if m.host_report=m.guest_report then w := m.host_report;
      else update dd_matches set status='void', finished_at=now() where id=mid; m.status:='void'; end if;
    elsif age >= 10 and other_seen < now() - interval '20 seconds' and coalesce(m.host_report, m.guest_report) is not null then
      w := coalesce(m.host_report, m.guest_report);
    elsif age >= 900 then
      update dd_matches set status='void', finished_at=now() where id=mid; m.status:='void';
    end if;
    if w is not null then
      l := case when w=m.host then m.guest else m.host end;
      select elo into we from dd_players where id=w; select elo into le from dd_players where id=l;
      ew := 1/(1+power(10,(le-we)/400.0));
      d := greatest(4, round(32*(1-ew)))::int;
      update dd_players set elo=elo+d, best_elo=greatest(best_elo,elo+d), wins=wins+1, games=games+1, streak=greatest(streak,0)+1,
        last_fighter=case when id=m.host then m.host_fighter else m.guest_fighter end where id=w;
      update dd_players set elo=greatest(100,elo-d), losses=losses+1, games=games+1, streak=least(streak,0)-1,
        last_fighter=case when id=m.host then m.host_fighter else m.guest_fighter end where id=l;
      update dd_matches set status='final', winner=w, delta=d, finished_at=now() where id=mid;
      m.status:='final'; m.winner:=w; m.delta:=d;
    end if;
  end if;
  return json_build_object('status',m.status,'winner',m.winner,
    'delta',case when m.status='final' then (case when m.winner=pid then m.delta else -m.delta end) else 0 end,
    'profile',dd_profile(pid));
end $function$;

CREATE OR REPLACE FUNCTION public.dd_set_wallet(pid uuid, secret text, p_wallet text, p_holder boolean DEFAULT false) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  p_wallet := nullif(btrim(coalesce(p_wallet,'')),'');
  if p_wallet is not null and p_wallet !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$' then raise exception 'BAD_WALLET'; end if;
  update dd_players set wallet=p_wallet, holder=(p_wallet is not null and coalesce(p_holder,false)), holder_at=now() where id=pid;
  return dd_profile(pid);
end $function$;

CREATE OR REPLACE FUNCTION public.dd_stats() RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select json_build_object('online',(select count(*) from dd_players where last_seen > now()-interval '2 minutes' and name not like 'zzTest%'),
    'queue',(select count(*) from dd_queue q join dd_players p on p.id=q.player_id where q.active and q.match_id is null and q.polled_at > now()-interval '8 seconds' and p.name not like 'zzTest%'),
    'players',(select count(*) from dd_players where games>0 and name not like 'zzTest%'));
$function$;

CREATE OR REPLACE FUNCTION public.dd_top(lim integer DEFAULT 100) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select coalesce(json_agg(r),'[]'::json) from (
    select row_number() over (order by elo desc, wins desc, created_at) as rank, name, elo, dd_tier(elo) as tier, wins, losses, streak, last_fighter, holder
    from dd_players where games>0 and name not like 'zzTest%' order by elo desc, wins desc, created_at limit least(greatest(lim,1),200)) r;
$function$;

CREATE OR REPLACE FUNCTION public.dd_vote_tally(p_round integer, pid uuid DEFAULT NULL::uuid) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select json_build_object(
    'counts', coalesce((select json_object_agg(candidate,n) from (select candidate, count(*) n from dd_votes where round=p_round group by candidate) c),'{}'::json),
    'total', (select count(*) from dd_votes where round=p_round),
    'mine', (select candidate from dd_votes where round=p_round and player_id=pid));
$function$;

CREATE OR REPLACE FUNCTION public.dd_vote(pid uuid, secret text, p_round integer, p_cand text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'dd_private' AS $function$
begin
  if not dd_auth(pid,secret) then raise exception 'AUTH'; end if;
  if p_round<1 or p_round>999 then raise exception 'BAD_ROUND'; end if;
  insert into dd_votes(round,player_id,candidate) values (p_round,pid,p_cand)
    on conflict (round,player_id) do update set candidate=excluded.candidate, at=now();
  return dd_vote_tally(p_round, pid);
end $function$;

-- ---------- permissions ----------
grant usage on schema dd_private to anon, authenticated;
grant execute on function public.dd_register(text), public.dd_me(uuid,text), public.dd_rename(uuid,text,text), public.dd_heartbeat(uuid,text),
  public.dd_queue_join(uuid,text,text), public.dd_queue_leave(uuid,text), public.dd_report(uuid,text,uuid,uuid),
  public.dd_set_wallet(uuid,text,text,boolean), public.dd_stats(), public.dd_top(integer), public.dd_tier(integer),
  public.dd_vote(uuid,text,integer,text), public.dd_vote_tally(integer,uuid),
  dd_private.dd_auth(uuid,text), dd_private.dd_profile(uuid), dd_private.dd_match_info(uuid,uuid)
  to anon, authenticated;
