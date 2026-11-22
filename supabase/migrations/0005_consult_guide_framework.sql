-- Consult guides: decisions first, explanation last. One field per section so
-- every guide has the same structure, plus subsite and linked procedures so
-- guides can be listed by urgency and tied to the consult and procedure logs.
alter table public.consult_guides
  add column if not exists subsite_id             smallint references public.subsites (id),
  add column if not exists before_you_see         text[] not null default '{}',
  add column if not exists bring                  text[] not null default '{}',
  add column if not exists history_exam           text[] not null default '{}',
  add column if not exists workup                 text[] not null default '{}',
  add column if not exists algorithm              text[] not null default '{}',
  add column if not exists linked_procedures      text[] not null default '{}',
  add column if not exists disposition            text[] not null default '{}',
  add column if not exists chart_recommendations  text,
  add column if not exists discharge_instructions text,
  add column if not exists attending_summary      text,
  add column if not exists pearls_pitfalls        text[] not null default '{}',
  add column if not exists deeper_reading         text[] not null default '{}';
