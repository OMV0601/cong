-- Lexicon — core schema
--
-- Design notes:
--   * A "signal" is one 4-second clip plus what it means. That is the whole
--     dictionary entry. Everything else exists to get the right signal in front
--     of the right stranger at the right moment.
--   * Lexicon never interprets. There is deliberately no column anywhere that
--     stores a machine's guess about what a signal means. Meaning only ever
--     comes from a human in the person's circle.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Layer 2 ("Point"). A stranger often cannot DESCRIBE what they are seeing,
-- but they can always point at where it is happening.
create type body_region as enum ('hands', 'face', 'legs', 'whole_body', 'other');

create type urgency as enum ('routine', 'attention', 'urgent');

-- The five FLACC categories. FLACC is a validated observational pain scale for
-- people who cannot self-report. We tag against it so a signal's meaning is
-- anchored to a published instrument instead of resting on one person's
-- wording. We do not compute a FLACC score — clinicians do that.
create type flacc_category as enum
  ('face', 'legs', 'activity', 'cry', 'consolability');

create type circle_role as enum ('family', 'caregiver', 'clinician');

create type ask_status as enum ('pending', 'answered', 'no_match', 'expired');

-- ---------------------------------------------------------------------------
-- people — the non-speaking person. Everything hangs off this.
-- ---------------------------------------------------------------------------

create table people (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  avatar_url   text,
  created_by   uuid not null references auth.users (id) on delete restrict,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- circle_members — who may see this person, and who may answer an Ask.
-- ---------------------------------------------------------------------------

create table circle_members (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references people (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       circle_role not null default 'family',
  -- Only people who actually know this person should be paged by an Ask.
  can_answer boolean not null default true,
  created_at timestamptz not null default now(),
  unique (person_id, user_id)
);

create index circle_members_user_idx on circle_members (user_id);
create index circle_members_answerers_idx
  on circle_members (person_id) where can_answer;

-- ---------------------------------------------------------------------------
-- signals — one clip = one dictionary entry.
-- ---------------------------------------------------------------------------

create table signals (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references people (id) on delete cascade,
  label          text not null check (length(trim(label)) between 1 and 60),
  meaning        text not null default '',
  body_region    body_region not null default 'other',
  -- A vocalisation may have no visible movement at all, so "it's a sound" is a
  -- separate axis from body region rather than one of its values.
  is_sound       boolean not null default false,
  urgency        urgency not null default 'routine',
  flacc_category flacc_category,
  video_path     text not null,
  poster_path    text,
  -- Safari records mp4/h264, Chrome records webm/vp9. We store what was
  -- actually produced so playback never has to guess.
  mime_type      text not null default 'video/webm',
  duration_ms    integer not null default 0 check (duration_ms between 0 and 15000),
  sort_order     integer not null default 0,
  -- Set when this signal was promoted from an answered Ask. This is how the
  -- lexicon grows every time someone is confused.
  source_ask_id  uuid,
  created_at     timestamptz not null default now()
);

create index signals_person_idx on signals (person_id, sort_order);
create index signals_region_idx on signals (person_id, body_region);

-- Full-text search over the words a family actually wrote. Secondary to
-- looking and pointing, but useful once a lexicon gets large.
alter table signals add column search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(label, '')),   'A') ||
    setweight(to_tsvector('english', coalesce(meaning, '')), 'B')
  ) stored;

create index signals_search_idx on signals using gin (search);

-- ---------------------------------------------------------------------------
-- access_grants — the scannable code. Short-lived and revocable by design.
-- ---------------------------------------------------------------------------

create table access_grants (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references people (id) on delete cascade,
  token      text not null unique,
  label      text not null default '',
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index access_grants_token_idx on access_grants (token);
create index access_grants_person_idx on access_grants (person_id);

-- One place that decides whether a grant is usable, so the RLS policies and
-- the application can never disagree about it.
create or replace function grant_is_live(g access_grants)
returns boolean
language sql
immutable
as $$
  select g.revoked_at is null and g.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- ask_requests — layer 3. One row per "what is this?".
-- ---------------------------------------------------------------------------

create table ask_requests (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references people (id) on delete cascade,
  grant_id         uuid references access_grants (id) on delete set null,
  clip_path        text not null,
  note             text,
  -- The stranger has no account. We sign them in anonymously when they open a
  -- valid grant, so their Ask belongs to a real auth.uid() and Realtime can
  -- deliver the answer back to them under normal RLS.
  asker_user_id    uuid references auth.users (id) on delete set null,
  status           ask_status not null default 'pending',
  answered_by      uuid references auth.users (id) on delete set null,
  answer_text      text,
  answer_signal_id uuid references signals (id) on delete set null,
  created_at       timestamptz not null default now(),
  answered_at      timestamptz,

  -- An answered Ask must actually carry an answer.
  constraint answered_has_content check (
    status <> 'answered'
    or (answer_text is not null or answer_signal_id is not null)
  )
);

create index ask_requests_person_idx on ask_requests (person_id, created_at desc);
create index ask_requests_pending_idx
  on ask_requests (person_id) where status = 'pending';
create index ask_requests_asker_idx on ask_requests (asker_user_id);

alter table signals
  add constraint signals_source_ask_fk
  foreign key (source_ask_id) references ask_requests (id) on delete set null;

-- ---------------------------------------------------------------------------
-- push_subscriptions — where a circle member's browser can be reached.
-- ---------------------------------------------------------------------------

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- access_log — every view, so a family can see exactly who looked.
-- ---------------------------------------------------------------------------

create table access_log (
  id        uuid primary key default gen_random_uuid(),
  person_id uuid not null references people (id) on delete cascade,
  grant_id  uuid references access_grants (id) on delete set null,
  action    text not null,
  signal_id uuid references signals (id) on delete set null,
  created_at timestamptz not null default now()
);

create index access_log_person_idx on access_log (person_id, created_at desc);
