-- SplitTab (Next.js) — Supabase schema
-- Run once per deployment: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Model: this app is self-hosted per deployer (bring-your-own Supabase
-- project — see SETUP.md). Real accounts + multiple groups live INSIDE one
-- project. Nobody outside your own group can see your data; RLS is scoped
-- by group membership, not by "everyone who has the anon key" like the
-- static SplitTab prototype.

-- ------------------------------------------------------------------
-- profiles — one row per signed-in user (auth.users), auto-created on signup
-- ------------------------------------------------------------------

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles readable by anyone signed in" on profiles;
create policy "profiles readable by anyone signed in" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles editable by owner" on profiles;
create policy "profiles editable by owner" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------------
-- groups + membership
-- ------------------------------------------------------------------

create table if not exists groups (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  currency_default text not null default 'NPR',
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

create table if not exists group_members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  -- Nullable: an owner can add "Sashank" before Sashank ever signs up.
  -- Sashank later redeems an invite and this row is claimed (user_id set)
  -- instead of a duplicate member being created.
  user_id      uuid references profiles(id) on delete set null,
  display_name text not null,
  avatar_url   text,
  role         text not null default 'member' check (role in ('owner', 'member')),
  created_at   timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists group_invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  code       text not null unique,
  created_by uuid not null references profiles(id),
  -- NULL = generic "join this group" invite, always creates a new member.
  -- Set = a personal invite for exactly this (usually unclaimed) member row;
  -- redeeming it claims that row and only that row, never a different one.
  member_id  uuid references group_members(id) on delete cascade,
  expires_at timestamptz,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- expenses — same `data` jsonb shape the static SplitTab used
-- (participants/items/discount/charges/payments/settledPairs/forceSettled),
-- so the calculation engine needed no redesign, only a `group_id` scope.
-- ------------------------------------------------------------------

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  title       text not null,
  date        date not null,
  location    text,
  currency    text not null default 'NPR',
  notes       text,
  receipt_url text,
  data        jsonb not null default '{}'::jsonb,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists expenses_group_date_idx on expenses(group_id, date desc);
create index if not exists group_members_group_idx on group_members(group_id);
create index if not exists group_members_user_idx on group_members(user_id);

-- ------------------------------------------------------------------
-- membership helper functions, reused by every RLS policy below and by
-- the storage policies further down.
-- ------------------------------------------------------------------

create or replace function is_group_member(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function is_group_owner(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table groups         enable row level security;
alter table group_members  enable row level security;
alter table group_invites  enable row level security;
alter table expenses       enable row level security;

drop policy if exists "members read their groups" on groups;
create policy "members read their groups" on groups
  for select using (is_group_member(id));

drop policy if exists "signed-in users create groups" on groups;
create policy "signed-in users create groups" on groups
  for insert with check (auth.uid() = created_by);

drop policy if exists "owners update their group" on groups;
create policy "owners update their group" on groups
  for update using (is_group_owner(id)) with check (is_group_owner(id));

drop policy if exists "owners delete their group" on groups;
create policy "owners delete their group" on groups
  for delete using (is_group_owner(id));

drop policy if exists "members read the roster" on group_members;
create policy "members read the roster" on group_members
  for select using (is_group_member(group_id));

drop policy if exists "owners manage members" on group_members;
create policy "owners manage members" on group_members
  for all using (is_group_owner(group_id)) with check (is_group_owner(group_id));

drop policy if exists "members leave their own row" on group_members;
create policy "members leave their own row" on group_members
  for delete using (user_id = auth.uid());

drop policy if exists "members read invites" on group_invites;
create policy "members read invites" on group_invites
  for select using (is_group_member(group_id));

drop policy if exists "owners manage invites" on group_invites;
create policy "owners manage invites" on group_invites
  for all using (is_group_owner(group_id)) with check (is_group_owner(group_id));

drop policy if exists "members read group expenses" on expenses;
create policy "members read group expenses" on expenses
  for select using (is_group_member(group_id));

drop policy if exists "members write group expenses" on expenses;
create policy "members write group expenses" on expenses
  for all using (is_group_member(group_id)) with check (is_group_member(group_id));

-- ------------------------------------------------------------------
-- Group creation: the creator must become the owner in the same
-- transaction the group is created in, done via one RPC so the client
-- never has a moment where the group exists with no members (which RLS
-- would then hide from them).
-- ------------------------------------------------------------------

create or replace function create_group(p_name text, p_currency text default 'NPR')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
  uname text;
begin
  select display_name into uname from profiles where id = auth.uid();
  insert into groups (name, currency_default, created_by) values (p_name, coalesce(p_currency, 'NPR'), auth.uid())
    returning id into gid;
  insert into group_members (group_id, user_id, display_name, role)
    values (gid, auth.uid(), coalesce(uname, 'You'), 'owner');
  return gid;
end;
$$;

-- ------------------------------------------------------------------
-- Invite redemption: a PERSONAL invite (member_id set) claims exactly that
-- member row and nothing else — it never guesses. A GENERIC invite
-- (member_id null) always inserts a brand-new member row; it must NOT touch
-- any existing unclaimed ("ghost") row, since there is no way to know which
-- ghost, if any, the person redeeming it actually corresponds to. Runs
-- atomically so two people can't race into duplicate/conflicting claims.
-- ------------------------------------------------------------------

create or replace function redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv group_invites%rowtype;
  uname text;
  target_user_id uuid;
begin
  select * into inv from group_invites where code = p_code and not revoked
    and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'This invite link is invalid or has expired.';
  end if;

  if exists (select 1 from group_members where group_id = inv.group_id and user_id = auth.uid()) then
    return inv.group_id; -- already a member
  end if;

  select display_name into uname from profiles where id = auth.uid();

  if inv.member_id is not null then
    select user_id into target_user_id from group_members where id = inv.member_id and group_id = inv.group_id;
    if not found then
      raise exception 'This invite is no longer valid — the member it was for was removed.';
    end if;
    if target_user_id is not null then
      raise exception 'This invite has already been claimed.';
    end if;
    update group_members set user_id = auth.uid() where id = inv.member_id;
  else
    insert into group_members (group_id, user_id, display_name, role)
      values (inv.group_id, auth.uid(), coalesce(uname, 'New member'), 'member');
  end if;

  return inv.group_id;
end;
$$;

-- ------------------------------------------------------------------
-- Realtime — live updates for open group screens
-- ------------------------------------------------------------------

alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table group_members;
alter publication supabase_realtime add table group_invites;
alter publication supabase_realtime add table expenses;

-- ------------------------------------------------------------------
-- Storage bucket for receipt photos, one folder per group (path
-- "<group_id>/<file>"), readable/writable only by that group's members.
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "group members read receipts" on storage.objects;
create policy "group members read receipts" on storage.objects
  for select using (bucket_id = 'receipts' and is_group_member((storage.foldername(name))[1]::uuid));

drop policy if exists "group members upload receipts" on storage.objects;
create policy "group members upload receipts" on storage.objects
  for insert with check (bucket_id = 'receipts' and is_group_member((storage.foldername(name))[1]::uuid));

drop policy if exists "group members delete receipts" on storage.objects;
create policy "group members delete receipts" on storage.objects
  for delete using (bucket_id = 'receipts' and is_group_member((storage.foldername(name))[1]::uuid));
