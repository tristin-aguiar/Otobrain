-- =====================================================================
-- ENT Resident Database — Version 1 schema
-- Shared library (admin-edited, read by all signed-in users),
-- This week in Otolaryngology posts, and the private per-user pieces
-- that sit on shared pages (notes, chapter progress, uploaded PDFs).
-- Trackers (consults, procedures, research, rotations) arrive in v2.
--
-- Rule for every table: NO patient identifiers. Ever.
-- =====================================================================

-- ---------- Users and roles ----------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  program       text,                         -- e.g. "MCW Otolaryngology"
  pgy           smallint check (pgy between 1 and 7),
  role          text not null default 'user' check (role in ('user', 'admin')),
  theme         text not null default 'light' check (theme in ('light', 'dark')),
  prereading_checklist text[] not null default array[
    'Skim the headings, figures and summary boxes (10 min)',
    'Review the relevant anatomy',
    'Write down 3 questions to answer while reading',
    'Check for upcoming cases or OR days on this topic',
    'Open the related pathology entries'
  ],
  created_at    timestamptz not null default now()
);

-- Create a profile row automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the signed-in user is an admin. Used by every write policy
-- on shared content.
create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Users may edit their own profile but may never promote themselves.
create function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  -- auth.uid() is null when run from the Supabase SQL editor, which is how
  -- the first admin is set.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ---------- Shared reference lists ---------------------------------

create table public.subsites (
  id    smallserial primary key,
  name  text not null unique,
  sort  smallint not null
);

insert into public.subsites (name, sort) values
  ('Ear & temporal bone', 1),
  ('Nose & paranasal sinuses', 2),
  ('Oral cavity & oropharynx', 3),
  ('Pharynx & esophagus', 4),
  ('Larynx & trachea', 5),
  ('Neck', 6),
  ('Salivary glands', 7),
  ('Thyroid & parathyroid', 8),
  ('Face & facial nerve', 9),
  ('Skull base', 10),
  ('General principles', 11),
  ('Whole body & staging', 12);

-- Subspecialty tags used on textbook chapters and pathology entries.
create type public.subspecialty as enum (
  'Head & neck', 'Otology', 'Rhinology', 'Laryngology',
  'Facial plastics', 'Pediatric', 'Sleep', 'General'
);

-- ---------- Curriculum: textbooks and chapters ---------------------

create table public.textbooks (
  id          smallserial primary key,
  short_name  text not null unique,           -- Cummings, Bailey, Lalwani
  full_title  text not null,
  edition     text,                           -- fill in once confirmed
  sort        smallint not null default 0
);

insert into public.textbooks (short_name, full_title, sort) values
  ('Cummings', 'Cummings Otolaryngology–Head and Neck Surgery', 1),
  ('Bailey',   'Bailey''s Head and Neck Surgery–Otolaryngology', 2),
  ('Lalwani',  'CURRENT Diagnosis & Treatment in Otolaryngology–Head and Neck Surgery', 3);

create table public.chapters (
  id            serial primary key,
  textbook_id   smallint not null references public.textbooks (id) on delete cascade,
  number        smallint not null,
  title         text not null,
  subspecialty  public.subspecialty not null default 'General',
  subsite_id    smallint references public.subsites (id),
  unique (textbook_id, number)
);

-- ---------- Shared library content ---------------------------------
-- Long, structured sections are stored as JSON so templates can evolve
-- without a database change. Shape is documented beside each column.

create table public.pathology_entries (
  id            serial primary key,
  slug          text not null unique,
  name          text not null,
  subsite_id    smallint references public.subsites (id),
  subspecialty  public.subspecialty,
  icd10         text,
  definition    text,
  board_yield   text check (board_yield in ('high', 'medium', 'low')),
  sections      jsonb not null default '[]',  -- [{title, lines: [text]}]
  board_pearls  text[] not null default '{}',
  key_studies   jsonb not null default '[]',  -- [{name, year, takeaway, link}]
  published     boolean not null default false,
  reviewed_at   date,
  reviewed_by   uuid references public.profiles (id),
  updated_at    timestamptz not null default now()
);

create table public.consult_guides (
  id            serial primary key,
  slug          text not null unique,
  title         text not null,
  urgency       text not null default 'Urgent' check (urgency in ('Emergent', 'Urgent', 'Routine')),
  red_flags     text[] not null default '{}',
  steps         jsonb not null default '[]',  -- [{title, lines: [text]}]
  sources       text,
  published     boolean not null default false,
  reviewed_at   date,
  reviewed_by   uuid references public.profiles (id),
  updated_at    timestamptz not null default now()
);

create table public.radiology_studies (
  id              serial primary key,
  slug            text not null unique,
  name            text not null,
  modality        text not null check (modality in ('CT', 'MRI', 'Ultrasound', 'X-ray & fluoro', 'Nuclear medicine', 'Angiography')),
  subsite_id      smallint references public.subsites (id),
  contrast        text,
  radiation       text check (radiation in ('none', 'low', 'moderate', 'high')),
  sections        jsonb not null default '[]',   -- [{title, lines: [text]}]
  search_pattern  text[] not null default '{}',
  findings        jsonb not null default '[]',   -- [{pathology, finding, pathology_slug}]
  pitfalls        text[] not null default '{}',
  published       boolean not null default false,
  reviewed_at     date,
  reviewed_by     uuid references public.profiles (id),
  updated_at      timestamptz not null default now()
);

-- Every shared image must be de-identified or openly licensed.
create table public.radiology_images (
  id            serial primary key,
  study_id      int not null references public.radiology_studies (id) on delete cascade,
  storage_path  text not null,                  -- in the library-images bucket
  plane         text,
  caption       text,
  license       text not null,                  -- e.g. "Own image, de-identified" or "CC BY 4.0, source…"
  deidentified  boolean not null check (deidentified),  -- must be confirmed true to save
  overlays      jsonb not null default '[]',    -- [{x, y, label}] for toggle-able labels
  sort          smallint not null default 0
);

create table public.basic_science_topics (
  id            serial primary key,
  slug          text not null unique,
  name          text not null,
  subsite_id    smallint references public.subsites (id),
  discipline    text not null check (discipline in ('Anatomy', 'Embryology', 'Physiology', 'Immunology', 'Microbiology', 'Pharmacology', 'Genetics', 'Oncology', 'Acoustics')),
  why_it_matters text,
  core_concept  text,
  mechanisms    text[] not null default '{}',
  clinical      text[] not null default '{}',
  deep_dive     jsonb not null default '[]',   -- [{title, body}]
  high_yield    text[] not null default '{}',
  questions     jsonb not null default '[]',   -- [{q, a}]
  board_yield   text check (board_yield in ('high', 'medium', 'low')),
  published     boolean not null default false,
  reviewed_at   date,
  reviewed_by   uuid references public.profiles (id),
  updated_at    timestamptz not null default now()
);

-- Cross-links between any two library items (and chapters).
create table public.library_links (
  id         serial primary key,
  from_type  text not null check (from_type in ('pathology', 'consult_guide', 'radiology', 'basic_science', 'chapter', 'post')),
  from_id    int not null,
  to_type    text not null check (to_type in ('pathology', 'consult_guide', 'radiology', 'basic_science', 'chapter', 'post')),
  to_id      int not null,
  unique (from_type, from_id, to_type, to_id)
);

-- ---------- This week in Otolaryngology ----------------------------

create table public.posts (
  id            serial primary key,
  slug          text not null unique,
  title         text not null,
  category      text not null check (category in ('New research', 'Guideline updates', 'Weekly didactics', 'Grand rounds', 'Program news', 'Motivation')),
  audience      text not null default 'everyone' check (audience in ('everyone', 'program')),
  program       text,                          -- required when audience = 'program'
  pinned        boolean not null default false,
  takeaways     text[] not null default '{}',
  body          text not null default '',      -- Markdown
  source        text,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  publish_at    timestamptz,
  author_id     uuid references public.profiles (id),
  updated_at    timestamptz not null default now(),
  check (audience = 'everyone' or program is not null)
);

-- ---------- Private, per-user pieces on shared pages ---------------

-- One private note per user per item: reflections on pathology,
-- consult guides, radiology, basic science, chapters and posts.
create table public.notes (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  item_type   text not null check (item_type in ('pathology', 'consult_guide', 'radiology', 'basic_science', 'chapter', 'post')),
  item_id     int not null,
  body        text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create table public.chapter_progress (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  chapter_id     int not null references public.chapters (id) on delete cascade,
  status         text not null default 'Not started' check (status in ('Not started', 'Scheduled', 'Reading', 'Done')),
  scheduled_for  date,
  checklist_done smallint[] not null default '{}',  -- indexes of ticked pre-reading items
  file_path      text,                              -- in the private chapter-files bucket
  completed_at   date,
  primary key (user_id, chapter_id)
);

-- ---------- Keep updated_at current --------------------------------

create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_pathology   before update on public.pathology_entries    for each row execute function public.touch_updated_at();
create trigger touch_guides      before update on public.consult_guides       for each row execute function public.touch_updated_at();
create trigger touch_radiology   before update on public.radiology_studies    for each row execute function public.touch_updated_at();
create trigger touch_basic_sci   before update on public.basic_science_topics for each row execute function public.touch_updated_at();
create trigger touch_posts       before update on public.posts                for each row execute function public.touch_updated_at();
create trigger touch_notes       before update on public.notes                for each row execute function public.touch_updated_at();

-- =====================================================================
-- Row-level security
-- Shared content: any signed-in user can read what is published;
-- only admins can see drafts or write. Private tables: owner only.
-- =====================================================================

alter table public.profiles             enable row level security;
alter table public.subsites             enable row level security;
alter table public.textbooks            enable row level security;
alter table public.chapters             enable row level security;
alter table public.pathology_entries    enable row level security;
alter table public.consult_guides       enable row level security;
alter table public.radiology_studies    enable row level security;
alter table public.radiology_images     enable row level security;
alter table public.basic_science_topics enable row level security;
alter table public.library_links        enable row level security;
alter table public.posts                enable row level security;
alter table public.notes                enable row level security;
alter table public.chapter_progress     enable row level security;

-- Profiles
create policy "profiles: read own or admin"   on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Reference lists: read by all signed-in users, written by admins
create policy "subsites: read"   on public.subsites  for select to authenticated using (true);
create policy "subsites: admin"  on public.subsites  for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "textbooks: read"  on public.textbooks for select to authenticated using (true);
create policy "textbooks: admin" on public.textbooks for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "chapters: read"   on public.chapters  for select to authenticated using (true);
create policy "chapters: admin"  on public.chapters  for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "links: read"      on public.library_links for select to authenticated using (true);
create policy "links: admin"     on public.library_links for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Library content: published rows for everyone, everything for admins
create policy "pathology: read published" on public.pathology_entries    for select to authenticated using (published or public.is_admin());
create policy "pathology: admin"          on public.pathology_entries    for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "guides: read published"    on public.consult_guides       for select to authenticated using (published or public.is_admin());
create policy "guides: admin"             on public.consult_guides       for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "radiology: read published" on public.radiology_studies    for select to authenticated using (published or public.is_admin());
create policy "radiology: admin"          on public.radiology_studies    for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "basic sci: read published" on public.basic_science_topics for select to authenticated using (published or public.is_admin());
create policy "basic sci: admin"          on public.basic_science_topics for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "images: read with study" on public.radiology_images for select to authenticated
  using (exists (select 1 from public.radiology_studies s where s.id = study_id and (s.published or public.is_admin())));
create policy "images: admin" on public.radiology_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Posts: published and due, and either for everyone or for the reader's program
create policy "posts: read" on public.posts for select to authenticated using (
  public.is_admin()
  or (
    status = 'published'
    and (publish_at is null or publish_at <= now())
    and (
      audience = 'everyone'
      or program = (select p.program from public.profiles p where p.id = auth.uid())
    )
  )
);
create policy "posts: admin" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Private tables: owner only (admins cannot read other users' notes)
create policy "notes: owner"    on public.notes            for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress: owner" on public.chapter_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- File storage
--   chapter-files : private; each user's own textbook PDFs, stored
--                   under a folder named with their user id.
--   library-images: shared radiology and library images; readable by
--                   signed-in users, written by admins.
-- =====================================================================

insert into storage.buckets (id, name, public) values
  ('chapter-files', 'chapter-files', false),
  ('library-images', 'library-images', false)
on conflict (id) do nothing;

create policy "chapter files: owner read"   on storage.objects for select to authenticated using (bucket_id = 'chapter-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chapter files: owner write"  on storage.objects for insert to authenticated with check (bucket_id = 'chapter-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chapter files: owner update" on storage.objects for update to authenticated using (bucket_id = 'chapter-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chapter files: owner delete" on storage.objects for delete to authenticated using (bucket_id = 'chapter-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "library images: read"  on storage.objects for select to authenticated using (bucket_id = 'library-images');
create policy "library images: admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'library-images' and public.is_admin());
create policy "library images: admin update" on storage.objects for update to authenticated using (bucket_id = 'library-images' and public.is_admin());
create policy "library images: admin delete" on storage.objects for delete to authenticated using (bucket_id = 'library-images' and public.is_admin());

-- =====================================================================
-- After you sign up on the live site for the first time, make yourself
-- the admin by running this once in the Supabase SQL editor (replace
-- the email with yours):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- =====================================================================
