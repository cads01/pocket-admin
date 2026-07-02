-- ============================================================
-- Seed data: waitlist signups, cleaners, clients, bookings
-- Run this after 000_complete_reset.sql
-- ============================================================

-- WAITLIST table
create table if not exists waitlist_signups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  business text,
  email text,
  phone text,
  team_size int default 1,
  pain_point text,
  signed_up_at timestamptz default now()
);
alter table waitlist_signups enable row level security;
create policy "Admin all waitlist" on waitlist_signups for all using (auth.role() = 'authenticated');

-- CLIENTS table (managed accounts, separate from marketplace customers)
create table if not exists managed_clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  business text,
  phone text,
  schedule text,
  price_per_job numeric(10,2) default 0,
  since timestamptz default now(),
  mrr numeric(10,2) default 0,
  status text check (status in ('active','trial','churned')) default 'active',
  created_at timestamptz default now()
);
alter table managed_clients enable row level security;
create policy "Admin all clients" on managed_clients for all using (auth.role() = 'authenticated');

-- === SEED DATA ===

-- Waitlist signups
insert into waitlist_signups (name, business, email, phone, team_size, pain_point, signed_up_at) values
  ('Sarah Johnson', 'Clean Sweep Co.', 'sarah@cleansweep.com', '(555) 101-1010', 1, 'Finding recurring clients', now() - interval '7 days'),
  ('Miguel Torres', 'Torres Cleaning', 'miguel@torresclean.com', '(555) 202-2020', 2, 'Scheduling and route planning', now() - interval '5 days'),
  ('Aisha Patel', 'Sparkle Home', 'aisha@sparklehome.com', '(555) 303-3030', 1, 'Getting paid on time', now() - interval '3 days'),
  ('James Chen', 'Chen Bros Clean', 'james@chenbros.com', '(555) 404-4040', 3, 'Managing customer reviews', now() - interval '2 days'),
  ('Emily Davis', 'Davis Deep Clean', 'emily@davisdc.com', '(555) 505-5050', 1, 'Lead generation', now() - interval '1 day');

-- Managed clients
insert into managed_clients (name, business, phone, schedule, price_per_job, since, mrr, status) values
  ('Oakwood Apartments', 'Property Management Inc.', '(555) 111-1111', 'Weekly Mon 9am', 350.00, now() - interval '90 days', 1400.00, 'active'),
  ('Dr. Lisa Brown', 'Brown Residence', '(555) 222-2222', 'Biweekly Wed 10am', 120.00, now() - interval '60 days', 240.00, 'active'),
  ('TechHub Office', 'TechHub Startup', '(555) 333-3333', 'Weekly Fri 5pm', 200.00, now() - interval '30 days', 800.00, 'active'),
  ('Green Cafe', 'Green Cafe LLC', '(555) 444-4444', 'Daily after close', 80.00, now() - interval '14 days', 400.00, 'trial'),
  ('Hillside School', 'Hillside Academy', '(555) 555-5555', 'Monthly 1st Sat', 500.00, now() - interval '120 days', 0.00, 'churned');

-- Cleaners
insert into cleaners (profile_id, business, hourly_rate, verified, active, rating, completed_jobs, total_earnings)
select id, 'Sparkle Clean Co.', 55.00, true, true, 4.8, 47, 12500.00
from profiles where email = (select email from auth.users limit 1)
on conflict (profile_id) do nothing;

insert into cleaners (profile_id, business, hourly_rate, verified, active, rating, completed_jobs, total_earnings)
select id, 'Maid Pro Services', 50.00, true, true, 4.9, 82, 21000.00
from profiles where email = (select email from auth.users limit 1 offset 1)
on conflict (profile_id) do nothing;

-- If only one user exists, add a second cleaner without profile link
insert into cleaners (id, business, hourly_rate, verified, active, rating, completed_jobs, total_earnings)
values (gen_random_uuid(), 'Eco Clean Team', 45.00, false, true, 4.6, 23, 5800.00)
on conflict do nothing;
