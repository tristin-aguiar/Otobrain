-- Newer Supabase projects do not grant table access to the API roles
-- automatically. Signed-in users need basic table access; the row-level
-- security policies in 0001 still decide which rows each person can see
-- or change. Signed-out visitors (anon) get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Tables and sequences added by later files get the same access.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
