-- Migration 001: Storage buckets and photo upload policies

insert into storage.buckets (id, name, public) values
  ('task-photos', 'task-photos', true),
  ('cleaner-avatars', 'cleaner-avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to task-photos
create policy "Authenticated users can upload task photos"
  on storage.objects for insert
  with check (
    bucket_id = 'task-photos'
    and auth.role() = 'authenticated'
  );

-- Allow parties of a booking to view its photos
create policy "Booking parties can view task photos"
  on storage.objects for select
  using (
    bucket_id = 'task-photos'
    and (auth.role() = 'authenticated')
  );

-- Allow authenticated users to upload avatars
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'cleaner-avatars'
    and auth.role() = 'authenticated'
  );

-- Enable realtime for cleaner_locations
alter publication supabase_realtime add table cleaner_locations;
