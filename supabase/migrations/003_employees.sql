-- ============================================================
-- Employee management subsystem
-- Run after 000_complete_reset.sql
-- ============================================================

-- EMPLOYEES
create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  role text default 'cleaner',
  hourly_rate numeric(10,2) default 25.00,
  per_job_rate numeric(10,2) default 0,
  pay_type text check (pay_type in ('hourly','per_job','both')) default 'hourly',
  status text check (status in ('active','suspended','terminated')) default 'active',
  hire_date date default current_date,
  rating numeric(3,2) default 5.00,
  completion_rate numeric(5,2) default 100.00,
  punctuality_score numeric(3,2) default 5.00,
  missed_jobs int default 0,
  total_jobs int default 0,
  skills text[] default '{}',
  certifications text[] default '{}',
  stripe_account_id text,
  notes text,
  created_at timestamptz default now()
);
alter table employees enable row level security;
create policy "Admin manage employees" on employees for all using (auth.role() = 'authenticated');
create policy "Client manage own employees" on employees for all using (client_id = auth.uid());

-- CLOCK_EVENTS
create table if not exists clock_events (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) on delete cascade not null,
  booking_id uuid references bookings(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  duration_minutes int generated always as (
    case when clock_out is not null
      then extract(epoch from (clock_out - clock_in)) / 60
      else null
    end
  ) stored,
  created_at timestamptz default now()
);
alter table clock_events enable row level security;
create policy "Admin manage clock_events" on clock_events for all using (auth.role() = 'authenticated');
create policy "Employee view own" on clock_events for select using (
  exists (select 1 from employees where id = clock_events.employee_id and client_id = auth.uid())
);

-- Add employee_id to bookings
alter table bookings add column if not exists employee_id uuid references employees(id) on delete set null;

-- Add employee_id to reviews
alter table reviews add column if not exists employee_id uuid references employees(id) on delete set null;

-- Add employee_id to booking_tasks for task-level tracking
alter table booking_tasks add column if not exists employee_id uuid references employees(id) on delete set null;

-- WARNINGS table for early warning system
create table if not exists employee_warnings (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) on delete cascade not null,
  warning_type text check (warning_type in ('low_rating','high_missed','low_punctuality','attendance')) not null,
  message text not null,
  severity text check (severity in ('yellow','red')) default 'yellow',
  acknowledged boolean default false,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
alter table employee_warnings enable row level security;
create policy "Admin manage warnings" on employee_warnings for all using (auth.role() = 'authenticated');

-- PAYROLL
create table if not exists payroll_records (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  hours_worked numeric(10,2) default 0,
  jobs_completed int default 0,
  hourly_earnings numeric(10,2) default 0,
  per_job_earnings numeric(10,2) default 0,
  total_earnings numeric(10,2) default 0,
  status text check (status in ('pending','paid')) default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);
alter table payroll_records enable row level security;
create policy "Admin manage payroll" on payroll_records for all using (auth.role() = 'authenticated');
