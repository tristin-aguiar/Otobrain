-- Consult guides are listed by subspecialty; urgency stays as a filter.
alter table public.consult_guides add column if not exists subspecialty public.subspecialty;
