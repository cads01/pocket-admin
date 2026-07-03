-- ============================================================
-- Migration 005: Full consolidation — multi-tenant, dedup, RLS fix
-- Run sequentially, safe for re-runs
-- ============================================================

-- ============================================================
-- 1. BUSINESSES (multi-tenancy root)
-- ============================================================
create table if not exists businesses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references profiles(id) on delete cascade not null unique,
  created_at timestamptz default now()
);
alter table businesses enable row level security;
drop policy if exists "Owner manage business" on businesses;
create policy "Owner manage business" on businesses
  for all using (owner_id = auth.uid());

-- ============================================================
-- 2. Add business_id to profiles
-- ============================================================
alter table profiles add column if not exists business_id uuid references businesses(id) on delete set null;
-- Widen role to include employee (drop marketplace roles)
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin','cleaner','customer','employee'));
-- Update default for new signups
alter table profiles alter column role set default 'customer';

-- Fix profile RLS: users see only own profile (admins see their business via join)
drop policy if exists "Admin view all profiles" on profiles;
drop policy if exists "Users view own profile" on profiles;
create policy "Users view own profile" on profiles
  for select using (
    id = auth.uid()
    or business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ============================================================
-- 3. REBUILD managed_clients with business_id + proper FK
-- ============================================================
alter table managed_clients add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table managed_clients add column if not exists email text;
alter table managed_clients add column if not exists address text;
alter table managed_clients add column if not exists notes text;
alter table managed_clients add column if not exists total_jobs int default 0;
alter table managed_clients add column if not exists total_spent numeric(12,2) default 0;

drop policy if exists "Admin all clients" on managed_clients;
drop policy if exists "Manage own clients" on managed_clients;
create policy "Manage own clients" on managed_clients
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
create policy "Manage own clients insert" on managed_clients
  for insert with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ============================================================
-- 4. REBUILD employees with business_id (skip if table missing)
-- ============================================================
do $$
begin
  if to_regclass('public.employees') is not null then
    execute 'alter table employees add column if not exists business_id uuid references businesses(id) on delete cascade';
    drop policy if exists "Admin manage employees" on employees;
    drop policy if exists "Client manage own employees" on employees;
    drop policy if exists "Manage own employees" on employees;
    execute 'create policy "Manage own employees" on employees for all using (business_id in (select id from businesses where owner_id = auth.uid()))';
    execute 'create policy "Manage own employees insert" on employees for insert with check (business_id in (select id from businesses where owner_id = auth.uid()))';
  end if;
end $$;

-- ============================================================
-- 5. REBUILD bookings — drop marketplace FK, use managed_client + employee
-- ============================================================
-- Add new columns (nullable initially)
alter table bookings add column if not exists managed_client_id uuid references managed_clients(id) on delete set null;

-- Drop old marketplace FK constraints (but keep columns for backward compat during migration)
alter table bookings alter column customer_id drop not null;
alter table bookings alter column cleaner_id drop not null;

drop policy if exists "Admin manage bookings" on bookings;
drop policy if exists "Cleaner view assigned" on bookings;
drop policy if exists "Customer view own" on bookings;
drop policy if exists "Manage own bookings" on bookings;
do $$
begin
  if to_regclass('public.employees') is not null then
    execute 'alter table bookings add column if not exists employee_id uuid references employees(id) on delete set null';
    execute 'create policy "Manage own bookings" on bookings
      for all using (
        exists (select 1 from managed_clients where id = bookings.managed_client_id and business_id in (select id from businesses where owner_id = auth.uid()))
        or
        exists (select 1 from employees where id = bookings.employee_id and business_id in (select id from businesses where owner_id = auth.uid()))
      )';
  else
    execute 'create policy "Manage own bookings" on bookings
      for all using (
        exists (select 1 from managed_clients where id = bookings.managed_client_id and business_id in (select id from businesses where owner_id = auth.uid()))
      )';
  end if;
end $$;

-- ============================================================
-- 6. REBUILD reviews — use managed_client + employee
-- ============================================================
alter table reviews add column if not exists managed_client_id uuid references managed_clients(id) on delete cascade;
do $$
begin
  if to_regclass('public.employees') is not null then
    execute 'alter table reviews add column if not exists employee_id uuid references employees(id) on delete set null';
  end if;
end $$;

drop policy if exists "Admin manage reviews" on reviews;
drop policy if exists "Manage own reviews" on reviews;
drop policy if exists "Anyone view reviews" on reviews;
create policy "Manage own reviews" on reviews
  for all using (
    exists (select 1 from managed_clients where id = reviews.managed_client_id and business_id in (select id from businesses where owner_id = auth.uid()))
  );
create policy "Anyone view reviews" on reviews
  for select using (true);

-- ============================================================
-- 7. Add business_id to remaining tables (guard missing tables)
-- ============================================================
do $$
begin
  if to_regclass('public.clock_events') is not null then
    execute 'alter table clock_events add column if not exists business_id uuid references businesses(id) on delete cascade';
    drop policy if exists "Admin manage clock_events" on clock_events;
    drop policy if exists "Employee view own" on clock_events;
    execute 'create policy "Manage own clock_events" on clock_events for all using (business_id in (select id from businesses where owner_id = auth.uid()))';
  end if;
end $$;

do $$
begin
  if to_regclass('public.employee_warnings') is not null then
    execute 'alter table employee_warnings add column if not exists business_id uuid references businesses(id) on delete cascade';
    drop policy if exists "Admin manage warnings" on employee_warnings;
    execute 'create policy "Manage own warnings" on employee_warnings for all using (business_id in (select id from businesses where owner_id = auth.uid()))';
  end if;
end $$;

do $$
begin
  if to_regclass('public.payroll_records') is not null then
    execute 'alter table payroll_records add column if not exists business_id uuid references businesses(id) on delete cascade';
    drop policy if exists "Admin manage payroll" on payroll_records;
    execute 'create policy "Manage own payroll" on payroll_records for all using (business_id in (select id from businesses where owner_id = auth.uid()))';
  end if;
end $$;

alter table booking_tasks add column if not exists business_id uuid references businesses(id) on delete cascade;
drop policy if exists "Admin full access booking_tasks" on booking_tasks;
drop policy if exists "Parties view booking_tasks" on booking_tasks;
drop policy if exists "Cleaner update booking_tasks" on booking_tasks;
create policy "Manage own booking_tasks" on booking_tasks
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table task_photos add column if not exists business_id uuid references businesses(id) on delete cascade;
drop policy if exists "Admin full access task_photos" on task_photos;
drop policy if exists "Parties view task_photos" on task_photos;
create policy "Manage own task_photos" on task_photos
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table disputes add column if not exists business_id uuid references businesses(id) on delete cascade;
drop policy if exists "Admin full access disputes" on disputes;
drop policy if exists "Parties view disputes" on disputes;
create policy "Manage own disputes" on disputes
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table dispute_messages add column if not exists business_id uuid references businesses(id) on delete cascade;
drop policy if exists "Admin full access dispute_msgs" on dispute_messages;
drop policy if exists "Parties view dispute_msgs" on dispute_messages;
drop policy if exists "Parties insert dispute_msgs" on dispute_messages;
create policy "Manage own dispute_msgs" on dispute_messages
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
create policy "Insert dispute_msgs" on dispute_messages
  for insert with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table escrow_transactions add column if not exists business_id uuid references businesses(id) on delete cascade;
drop policy if exists "Admin full access escrow" on escrow_transactions;
drop policy if exists "Parties view escrow" on escrow_transactions;
create policy "Manage own escrow" on escrow_transactions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter table inspection_reports add column if not exists business_id uuid references businesses(id) on delete cascade;
drop policy if exists "Admin full access inspections" on inspection_reports;
drop policy if exists "Parties view inspections" on inspection_reports;
create policy "Manage own inspections" on inspection_reports
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Waitlist signups — anon insert allowed, select by authenticated users
drop policy if exists "Admin all waitlist" on waitlist_signups;
drop policy if exists "Manage own waitlist" on waitlist_signups;
drop policy if exists "View own waitlist" on waitlist_signups;
drop policy if exists "Anyone can insert waitlist" on waitlist_signups;
create policy "Anyone can insert waitlist" on waitlist_signups
  for insert with check (true);
create policy "View waitlist" on waitlist_signups
  for select using (auth.role() = 'authenticated');

-- Cleaner locations — update for employee_id
drop policy if exists "Parties view locations" on cleaner_locations;
drop policy if exists "Cleaner upsert location" on cleaner_locations;
drop policy if exists "Cleaner update location" on cleaner_locations;
do $$
begin
  if to_regclass('public.employees') is not null then
    execute 'alter table cleaner_locations add column if not exists employee_id uuid references employees(id) on delete cascade';
    execute 'create policy "Manage own locations" on cleaner_locations for all using (exists (select 1 from employees where id = cleaner_locations.employee_id and business_id in (select id from businesses where owner_id = auth.uid())))';
  end if;
end $$;

-- ============================================================
-- 8. DROP stale marketplace policies (safe — checks table existence first)
-- ============================================================
do $$
begin
  if to_regclass('public.cleaners') is not null then
    drop policy if exists "Anyone view active cleaners" on cleaners;
    drop policy if exists "Admin manage cleaners" on cleaners;
    drop policy if exists "Cleaner update own" on cleaners;
  end if;
  if to_regclass('public.customers') is not null then
    drop policy if exists "Admin manage customers" on customers;
    drop policy if exists "Customer view own" on customers;
  end if;
  if to_regclass('public.cleaner_videos') is not null then
    drop policy if exists "Anyone view videos" on cleaner_videos;
    drop policy if exists "Cleaner manage own videos" on cleaner_videos;
    drop policy if exists "Admin manage videos" on cleaner_videos;
  end if;
end $$;

-- ============================================================
-- 9. INDEXES for performance (guard missing tables)
-- ============================================================
create index if not exists idx_profiles_business on profiles(business_id);
create index if not exists idx_managed_clients_business on managed_clients(business_id);
create index if not exists idx_bookings_client on bookings(managed_client_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_scheduled on bookings(scheduled_date);
create index if not exists idx_reviews_booking on reviews(booking_id);
create index if not exists idx_reviews_client on reviews(managed_client_id);
create index if not exists idx_disputes_booking on disputes(booking_id);
create index if not exists idx_inspections_booking on inspection_reports(booking_id);

do $$ begin
  if to_regclass('public.employees') is not null then
    execute 'create index if not exists idx_employees_business on employees(business_id)';
    execute 'create index if not exists idx_employees_status on employees(status)';
    execute 'create index if not exists idx_bookings_employee on bookings(employee_id)';
    execute 'create index if not exists idx_reviews_employee on reviews(employee_id)';
  end if;
  if to_regclass('public.clock_events') is not null then
    execute 'create index if not exists idx_clock_events_employee on clock_events(employee_id)';
    execute 'create index if not exists idx_clock_events_business on clock_events(business_id)';
  end if;
  if to_regclass('public.payroll_records') is not null then
    execute 'create index if not exists idx_payroll_employee on payroll_records(employee_id)';
    execute 'create index if not exists idx_payroll_business on payroll_records(business_id)';
  end if;
  if to_regclass('public.employee_warnings') is not null then
    execute 'create index if not exists idx_warnings_employee on employee_warnings(employee_id)';
    execute 'create index if not exists idx_warnings_business on employee_warnings(business_id)';
  end if;
end $$;

-- ============================================================
-- 10. UPDATE auth trigger — auto-create business for new admins
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  v_business_id uuid;
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');

  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', v_role);

  if v_role = 'admin' then
    insert into public.businesses (name, owner_id)
    values (coalesce(new.raw_user_meta_data->>'business', new.email || '''s Business'), new.id)
    returning id into v_business_id;

    update public.profiles set business_id = v_business_id where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 11. BACKFILL — create businesses for existing admin profiles
-- ============================================================
insert into businesses (name, owner_id)
select coalesce(name || '''s Business', email || '''s Business'), id
from profiles
where role = 'admin'
  and id not in (select owner_id from businesses)
on conflict (owner_id) do nothing;

update profiles p
set business_id = b.id
from businesses b
where b.owner_id = p.id
  and p.business_id is null;
