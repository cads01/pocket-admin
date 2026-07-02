-- ============================================================
-- COMPLETE RESET — run ONCE in Supabase SQL Editor
-- Drops everything, rebuilds full schema, backfills existing users
-- ============================================================

-- Drop all tables + trigger
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user;
drop table if exists cleaner_videos cascade;
drop table if exists dispute_messages cascade;
drop table if exists disputes cascade;
drop table if exists inspection_reports cascade;
drop table if exists escrow_transactions cascade;
drop table if exists task_photos cascade;
drop table if exists booking_tasks cascade;
drop table if exists cleaner_locations cascade;
drop table if exists payouts cascade;
drop table if exists reviews cascade;
drop table if exists bookings cascade;
drop table if exists cleaners cascade;
drop table if exists customers cascade;
drop table if exists profiles cascade;

-- PROFILES
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  phone text,
  role text check (role in ('admin','cleaner','customer')) default 'customer',
  avatar_url text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users view own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Admin view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', coalesce(new.raw_user_meta_data->>'role', 'customer'));
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Backfill profiles for EXISTING auth users (so your login works)
insert into public.profiles (id, email, name, role)
select id, email, raw_user_meta_data->>'name', coalesce(raw_user_meta_data->>'role', 'admin')
from auth.users
on conflict (id) do nothing;

-- CLEANERS
create table cleaners (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null unique,
  business text,
  bio text,
  services text[] default array['standard'],
  hourly_rate numeric(10,2) default 50.00,
  verified boolean default false,
  active boolean default true,
  rating numeric(3,2) default 5.00,
  completed_jobs int default 0,
  total_earnings numeric(12,2) default 0,
  stripe_account_id text,
  experience text default 'Experienced',
  video_profile_url text,
  route_preferences jsonb default '{}',
  created_at timestamptz default now()
);
alter table cleaners enable row level security;
create policy "Anyone view active cleaners" on cleaners for select using (active = true);
create policy "Admin manage cleaners" on cleaners for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Cleaner update own" on cleaners for update using (profile_id = auth.uid());

-- CUSTOMERS
create table customers (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null unique,
  default_address text,
  notes text,
  total_jobs int default 0,
  total_spent numeric(12,2) default 0,
  created_at timestamptz default now()
);
alter table customers enable row level security;
create policy "Admin manage customers" on customers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Customer view own" on customers for select using (profile_id = auth.uid());

-- BOOKINGS
create table bookings (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade not null,
  cleaner_id uuid references cleaners(id) on delete cascade not null,
  status text check (status in ('requested','assigned','in_progress','completed','reviewed','cancelled')) default 'requested',
  scheduled_date timestamptz not null,
  duration int default 2,
  amount numeric(10,2) not null,
  platform_fee numeric(10,2) default 0,
  cleaner_amount numeric(10,2) default 0,
  address text,
  notes text,
  payment_intent_id text,
  payment_status text default 'pending',
  escrow_status text check (escrow_status in ('held','approved','released','disputed')) default 'held',
  inspection_status text check (inspection_status in ('pending','approved','flagged')) default 'pending',
  recovery_deadline timestamptz,
  recovery_status text check (recovery_status in ('none','requested','in_progress','resolved')) default 'none',
  created_at timestamptz default now()
);
alter table bookings enable row level security;
create policy "Admin manage bookings" on bookings for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Cleaner view assigned" on bookings for select using (
  exists (select 1 from cleaners where id = bookings.cleaner_id and profile_id = auth.uid())
);
create policy "Customer view own" on bookings for select using (
  exists (select 1 from customers where id = bookings.customer_id and profile_id = auth.uid())
);

-- BOOKING_TASKS
create table booking_tasks (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null,
  room text not null,
  task text not null,
  is_completed boolean default false,
  completed_at timestamptz,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table booking_tasks enable row level security;
create policy "Admin full access booking_tasks" on booking_tasks for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parties view booking_tasks" on booking_tasks for select using (
  exists (select 1 from bookings b
    left join cleaners cl on cl.id = b.cleaner_id
    left join customers cu on cu.id = b.customer_id
    where b.id = booking_tasks.booking_id
    and (cl.profile_id = auth.uid() or cu.profile_id = auth.uid()))
);
create policy "Cleaner update booking_tasks" on booking_tasks for update using (
  exists (select 1 from bookings b join cleaners cl on cl.id = b.cleaner_id
    where b.id = booking_tasks.booking_id and cl.profile_id = auth.uid())
);

-- TASK_PHOTOS
create table task_photos (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null,
  task_id uuid references booking_tasks(id) on delete set null,
  photo_type text check (photo_type in ('before','after')) not null,
  url text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table task_photos enable row level security;
create policy "Admin full access task_photos" on task_photos for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parties view task_photos" on task_photos for select using (
  exists (select 1 from bookings b
    left join cleaners cl on cl.id = b.cleaner_id
    left join customers cu on cu.id = b.customer_id
    where b.id = task_photos.booking_id
    and (cl.profile_id = auth.uid() or cu.profile_id = auth.uid()))
);

-- CLEANER_LOCATIONS
create table cleaner_locations (
  id uuid default gen_random_uuid() primary key,
  cleaner_id uuid references cleaners(id) on delete cascade not null unique,
  booking_id uuid references bookings(id) on delete cascade,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  heading numeric(5,2),
  speed numeric(5,2),
  is_en_route boolean default false,
  updated_at timestamptz default now()
);
alter table cleaner_locations enable row level security;
create policy "Parties view locations" on cleaner_locations for select using (
  exists (select 1 from bookings b
    left join cleaners cl on cl.id = b.cleaner_id
    left join customers cu on cu.id = b.customer_id
    where b.id = cleaner_locations.booking_id
    and (cl.profile_id = auth.uid() or cu.profile_id = auth.uid()))
);
create policy "Cleaner upsert location" on cleaner_locations for insert with check (
  exists (select 1 from cleaners where id = cleaner_locations.cleaner_id and profile_id = auth.uid())
);
create policy "Cleaner update location" on cleaner_locations for update using (
  exists (select 1 from cleaners where id = cleaner_locations.cleaner_id and profile_id = auth.uid())
);

-- ESCROW_TRANSACTIONS
create table escrow_transactions (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  amount numeric(10,2) not null,
  status text check (status in ('held','approved','released','refunded')) default 'held',
  stripe_transfer_id text,
  held_at timestamptz default now(),
  released_at timestamptz,
  created_at timestamptz default now()
);
alter table escrow_transactions enable row level security;
create policy "Admin full access escrow" on escrow_transactions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parties view escrow" on escrow_transactions for select using (
  exists (select 1 from bookings b
    left join cleaners cl on cl.id = b.cleaner_id
    left join customers cu on cu.id = b.customer_id
    where b.id = escrow_transactions.booking_id
    and (cl.profile_id = auth.uid() or cu.profile_id = auth.uid()))
);

-- INSPECTION_REPORTS
create table inspection_reports (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  client_approved boolean default false,
  flagged_areas text[],
  client_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
alter table inspection_reports enable row level security;
create policy "Admin full access inspections" on inspection_reports for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parties view inspections" on inspection_reports for select using (
  exists (select 1 from bookings b
    left join cleaners cl on cl.id = b.cleaner_id
    left join customers cu on cu.id = b.customer_id
    where b.id = inspection_reports.booking_id
    and (cl.profile_id = auth.uid() or cu.profile_id = auth.uid()))
);

-- DISPUTES
create table disputes (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null,
  raised_by uuid references profiles(id) not null,
  dispute_type text check (dispute_type in ('scope_creep','missed_area','quality','other')) not null,
  description text not null,
  status text check (status in ('open','in_review','resolved','dismissed')) default 'open',
  resolution text,
  partial_credit numeric(10,2),
  created_at timestamptz default now(),
  resolved_at timestamptz
);
alter table disputes enable row level security;
create policy "Admin full access disputes" on disputes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parties view disputes" on disputes for select using (
  exists (select 1 from bookings b
    left join cleaners cl on cl.id = b.cleaner_id
    left join customers cu on cu.id = b.customer_id
    where b.id = disputes.booking_id
    and (cl.profile_id = auth.uid() or cu.profile_id = auth.uid()))
);

-- DISPUTE_MESSAGES
create table dispute_messages (
  id uuid default gen_random_uuid() primary key,
  dispute_id uuid references disputes(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  message text not null,
  created_at timestamptz default now()
);
alter table dispute_messages enable row level security;
create policy "Admin full access dispute_msgs" on dispute_messages for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parties view dispute_msgs" on dispute_messages for select using (
  exists (select 1 from disputes d
    join bookings b on b.id = d.booking_id
    left join cleaners cl on cl.id = b.cleaner_id
    left join customers cu on cu.id = b.customer_id
    where d.id = dispute_messages.dispute_id
    and (cl.profile_id = auth.uid() or cu.profile_id = auth.uid()))
);
create policy "Parties insert dispute_msgs" on dispute_messages for insert with check (
  auth.uid() = sender_id
);

-- CLEANER_VIDEOS
create table cleaner_videos (
  id uuid default gen_random_uuid() primary key,
  cleaner_id uuid references cleaners(id) on delete cascade not null,
  title text,
  url text not null,
  video_type text check (video_type in ('youtube','tiktok','upload')) default 'youtube',
  thumbnail_url text,
  is_published boolean default true,
  created_at timestamptz default now()
);
alter table cleaner_videos enable row level security;
create policy "Anyone view videos" on cleaner_videos for select using (true);
create policy "Cleaner manage own videos" on cleaner_videos for all using (
  exists (select 1 from cleaners where id = cleaner_videos.cleaner_id and profile_id = auth.uid())
);
create policy "Admin manage videos" on cleaner_videos for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- REVIEWS
create table reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  customer_id uuid references customers(id) on delete cascade not null,
  cleaner_id uuid references cleaners(id) on delete cascade not null,
  rating int check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamptz default now()
);
alter table reviews enable row level security;
create policy "Admin manage reviews" on reviews for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Anyone view reviews" on reviews for select using (true);

-- PAYOUTS
create table payouts (
  id uuid default gen_random_uuid() primary key,
  cleaner_id uuid references cleaners(id) on delete cascade not null,
  amount numeric(10,2) not null,
  period text,
  status text check (status in ('pending','paid')) default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);
alter table payouts enable row level security;
create policy "Admin manage payouts" on payouts for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Cleaner view own payouts" on payouts for select using (
  exists (select 1 from cleaners where id = payouts.cleaner_id and profile_id = auth.uid())
);

-- ============================================================
-- STORAGE BUCKETS + REALTIME
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('task-photos', 'task-photos', true),
  ('cleaner-avatars', 'cleaner-avatars', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload task photos"
  on storage.objects for insert
  with check (bucket_id = 'task-photos' and auth.role() = 'authenticated');

create policy "Booking parties can view task photos"
  on storage.objects for select
  using (bucket_id = 'task-photos' and auth.role() = 'authenticated');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'cleaner-avatars' and auth.role() = 'authenticated');

alter publication supabase_realtime add table cleaner_locations;
