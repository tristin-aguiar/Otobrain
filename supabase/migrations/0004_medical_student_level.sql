-- Training level: 0 = medical student, 1–7 = PGY year.
alter table public.profiles drop constraint if exists profiles_pgy_check;
alter table public.profiles add constraint profiles_pgy_check check (pgy between 0 and 7);
comment on column public.profiles.pgy is '0 = medical student, 1-7 = PGY year';
