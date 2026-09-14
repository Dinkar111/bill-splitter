-- Run this once in your existing project's SQL Editor to pick up the fix
-- for invite redemption claiming the wrong unclaimed member. Safe to re-run.

alter table group_invites add column if not exists member_id uuid references group_members(id) on delete cascade;

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
