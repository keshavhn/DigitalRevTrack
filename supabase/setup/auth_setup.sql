create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('editor', 'read_only')),
  invited_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row
execute function public.set_updated_at();

alter table public.app_users enable row level security;

drop policy if exists "Users can view their own access row" on public.app_users;
create policy "Users can view their own access row"
on public.app_users
for select
to authenticated
using (
  lower(email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1
    from public.app_users admins
    where lower(admins.email) = lower(auth.jwt() ->> 'email')
      and admins.role = 'editor'
  )
);

drop policy if exists "Editors can insert users" on public.app_users;
create policy "Editors can insert users"
on public.app_users
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_users admins
    where lower(admins.email) = lower(auth.jwt() ->> 'email')
      and admins.role = 'editor'
  )
);

drop policy if exists "Editors can update users" on public.app_users;
create policy "Editors can update users"
on public.app_users
for update
to authenticated
using (
  exists (
    select 1
    from public.app_users admins
    where lower(admins.email) = lower(auth.jwt() ->> 'email')
      and admins.role = 'editor'
  )
)
with check (
  exists (
    select 1
    from public.app_users admins
    where lower(admins.email) = lower(auth.jwt() ->> 'email')
      and admins.role = 'editor'
  )
);

insert into public.app_users (email, role)
values ('keshav.hn@gmail.com', 'editor')
on conflict (email) do update set role = excluded.role;
