-- Fix waitlist_signups RLS: allow anonymous users to insert
-- (they need to sign up without logging in)

drop policy if exists "Anyone can insert waitlist" on waitlist_signups;
create policy "Anyone can insert waitlist" on waitlist_signups
  for insert
  to anon
  with check (true);
