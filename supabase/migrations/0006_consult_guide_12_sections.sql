-- Consult guide template, 12 sections:
--  1 consult_question  2 red_flags (triage and red flags)  3 focused_history
--  4 focused_exam  5 workup  6 differential  7 initial_management
--  8 escalation_management  9 disposition  10 call_attending
--  11 pearls_pitfalls  12 deeper_reading (key references)
alter table public.consult_guides
  add column if not exists consult_question      text,
  add column if not exists focused_history       text[] not null default '{}',
  add column if not exists focused_exam          text[] not null default '{}',
  add column if not exists differential          text[] not null default '{}',
  add column if not exists initial_management    text[] not null default '{}',
  add column if not exists escalation_management text[] not null default '{}',
  add column if not exists call_attending        text[] not null default '{}';
