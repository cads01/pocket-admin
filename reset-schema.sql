-- Drop everything to start fresh
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user;

drop table if exists payouts cascade;
drop table if exists reviews cascade;
drop table if exists bookings cascade;
drop table if exists cleaners cascade;
drop table if exists customers cascade;
drop table if exists profiles cascade;
