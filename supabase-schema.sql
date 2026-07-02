-- Pocket Admin Schema
-- Run this in your Supabase SQL Editor

-- 1. PROFILES
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  phone text,
  role text check (role in ('admin', 'cleaner', 'customer')) default 'customer',
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admin can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', coalesce(new.raw_user_meta_data->>'role', 'customer'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. CLEANERS
create table if not exists cleaners (
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
  created_at timestamptz default now()
);

alter table cleaners enable row level security;

create policy "Anyone can view active cleaners"
  on cleaners for select using (active = true);

create policy "Admin can manage cleaners"
  on cleaners for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Cleaner can update own"
  on cleaners for update using (profile_id = auth.uid());

-- 3. CUSTOMERS
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null unique,
  default_address text,
  notes text,
  total_jobs int default 0,
  total_spent numeric(12,2) default 0,
  created_at timestamptz default now()
);

alter table customers enable row level security;

create policy "Admin can manage customers"
  on customers for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Customer can view own"
  on customers for select using (profile_id = auth.uid());

-- 4. BOOKINGS
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade not null,
  cleaner_id uuid references cleaners(id) on delete cascade not null,
  status text check (status in ('requested', 'assigned', 'in_progress', 'completed', 'reviewed', 'cancelled')) default 'requested',
  scheduled_date timestamptz not null,
  duration int default 2,
  amount numeric(10,2) not null,
  platform_fee numeric(10,2) default 0,
  cleaner_amount numeric(10,2) default 0,
  address text,
  notes text,
  payment_intent_id text,
  payment_status text default 'pending',
  created_at timestamptz default now()
);

alter table bookings enable row level security;

create policy "Admin can manage bookings"
  on bookings for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Cleaner can view assigned"
  on bookings for select using (
    exists (select 1 from cleaners where id = bookings.cleaner_id and profile_id = auth.uid())
  );

create policy "Customer can view own"
  on bookings for select using (
    exists (select 1 from customers where id = bookings.customer_id and profile_id = auth.uid())
  );

-- 5. REVIEWS
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  customer_id uuid references customers(id) on delete cascade not null,
  cleaner_id uuid references cleaners(id) on delete cascade not null,
  rating int check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamptz default now()
);

alter table reviews enable row level security;

create policy "Admin can manage reviews"
  on reviews for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Anyone can view reviews"
  on reviews for select using (true);

-- 6. PAYOUTS
create table if not exists payouts (
  id uuid default gen_random_uuid() primary key,
  cleaner_id uuid references cleaners(id) on delete cascade not null,
  amount numeric(10,2) not null,
  period text,
  status text check (status in ('pending', 'paid')) default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);

alter table payouts enable row level security;

create policy "Admin can manage payouts"
  on payouts for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Cleaner can view own"
  on payouts for select using (
    exists (select 1 from cleaners where id = payouts.cleaner_id and profile_id = auth.uid())
  );
