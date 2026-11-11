-- TripFlow — esquema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro em: Supabase > SQL Editor > New query > Run.
-- Pode rodar de novo com segurança (usa "if not exists").
-- Todas as tabelas começam com "tf_" para não misturar com tabelas de outros projetos.
--
-- Cada linha pertence a um usuário (owner_id). A segurança (RLS) garante que cada
-- consultor só enxerga e altera os PRÓPRIOS dados. Valores em dinheiro ficam em CENTAVOS (inteiros).

create extension if not exists pgcrypto;

-- ---------- Perfil e marca do consultor ----------
create table if not exists public.tf_profiles (
  id              uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  full_name       text,
  agency_name     text,
  tagline         text,
  phone           text,
  email           text,
  website         text,
  instagram       text,
  logo_url        text,
  brand_color     text not null default '#0f1f3d',
  default_markup  numeric not null default 15,         -- % sobre o custo, sugerido nos itens novos
  currency        text not null default 'BRL',
  terms           text,                                -- condições padrão das propostas
  created_at      timestamptz not null default now()
);

-- ---------- Clientes (CRM) ----------
create table if not exists public.tf_customers (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  city            text,
  birth_date      date,
  status          text not null default 'lead'
                  check (status in ('lead','em_contato','proposta_enviada','negociacao','cliente','perdido')),
  source          text,                                -- origem: Instagram, indicação...
  opportunity_cents bigint not null default 0,         -- valor estimado da oportunidade
  next_followup   date,
  travel_style    text,
  preferences     text,                                -- preferências e restrições
  budget_note     text,
  history_notes   text,                                -- viagens anteriores
  notes           text,
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists tf_customers_owner_idx on public.tf_customers (owner_id, created_at desc);

-- ---------- Orçamentos ----------
create table if not exists public.tf_quotations (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_id     uuid references public.tf_customers(id) on delete set null,
  code            text not null,
  title           text not null,
  destination     text,
  start_date      date,
  end_date        date,
  adults          int not null default 1,
  children        int not null default 0,
  status          text not null default 'rascunho'
                  check (status in ('rascunho','enviado','confirmado','perdido')),
  currency        text not null default 'BRL',
  service_fee_cents bigint not null default 0,         -- taxa de assessoria (lucro puro)
  discount_cents  bigint not null default 0,
  total_cost_cents  bigint not null default 0,         -- recalculados ao salvar (app)
  total_price_cents bigint not null default 0,         -- preço final ao cliente
  valid_until     date,
  payment_terms   text,
  inclusions      text,
  exclusions      text,
  notes           text,                                -- notas internas (nunca vão ao cliente)
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tf_quotations_owner_idx on public.tf_quotations (owner_id, created_at desc);
create index if not exists tf_quotations_customer_idx on public.tf_quotations (customer_id);

create table if not exists public.tf_quotation_items (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quotation_id    uuid not null references public.tf_quotations(id) on delete cascade,
  category        text not null default 'outros'
                  check (category in ('voo','hospedagem','transporte','passeio','seguro','outros')),
  description     text not null,
  supplier        text,                                -- fornecedor (interno)
  details         text,                                -- aparece na proposta
  item_date       date,
  quantity        numeric not null default 1,
  unit_cost_cents  bigint not null default 0,          -- quanto você paga (interno)
  unit_price_cents bigint not null default 0,          -- quanto o cliente paga
  position        int not null default 0
);
create index if not exists tf_quotation_items_q_idx on public.tf_quotation_items (quotation_id, position);

-- ---------- Roteiros ----------
create table if not exists public.tf_itineraries (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_id     uuid references public.tf_customers(id) on delete set null,
  title           text not null,
  destination     text,
  start_date      date,
  end_date        date,
  summary         text,
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tf_itineraries_owner_idx on public.tf_itineraries (owner_id, created_at desc);

create table if not exists public.tf_itinerary_days (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  itinerary_id    uuid not null references public.tf_itineraries(id) on delete cascade,
  day_date        date,
  title           text not null default '',
  location        text,
  notes           text,
  position        int not null default 0
);
create index if not exists tf_itinerary_days_i_idx on public.tf_itinerary_days (itinerary_id, position);

create table if not exists public.tf_itinerary_items (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_id          uuid not null references public.tf_itinerary_days(id) on delete cascade,
  itinerary_id    uuid not null references public.tf_itineraries(id) on delete cascade,
  kind            text not null default 'atividade'
                  check (kind in ('atividade','restaurante','transporte','hospedagem','voo','recomendacao')),
  item_time       text,                                -- "09:30"
  title           text not null,
  location        text,
  description     text,
  tips            text,
  position        int not null default 0
);
create index if not exists tf_itinerary_items_d_idx on public.tf_itinerary_items (day_id, position);
create index if not exists tf_itinerary_items_i_idx on public.tf_itinerary_items (itinerary_id);

-- ---------- Propostas ----------
create table if not exists public.tf_proposals (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_id     uuid references public.tf_customers(id) on delete set null,
  quotation_id    uuid references public.tf_quotations(id) on delete set null,
  itinerary_id    uuid references public.tf_itineraries(id) on delete set null,
  title           text not null,
  status          text not null default 'rascunho'
                  check (status in ('rascunho','enviada','aceita','recusada')),
  share_token     uuid not null unique default gen_random_uuid(),   -- vai no link público /p/<token>
  intro_message   text,
  price_display   text not null default 'por_categoria'
                  check (price_display in ('detalhado','por_categoria','total')),
  include_itinerary boolean not null default true,
  valid_until     date,
  terms           text,
  sent_at         timestamptz,
  responded_at    timestamptz,
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tf_proposals_owner_idx on public.tf_proposals (owner_id, created_at desc);

-- ---------- Segurança (RLS): cada usuário só vê os próprios dados ----------
alter table public.tf_profiles          enable row level security;
alter table public.tf_customers         enable row level security;
alter table public.tf_quotations        enable row level security;
alter table public.tf_quotation_items   enable row level security;
alter table public.tf_itineraries       enable row level security;
alter table public.tf_itinerary_days    enable row level security;
alter table public.tf_itinerary_items   enable row level security;
alter table public.tf_proposals         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tf_customers','tf_quotations','tf_quotation_items','tf_itineraries','tf_itinerary_days','tf_itinerary_items','tf_proposals']
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'owner_all') then
      execute format('create policy owner_all on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
    end if;
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tf_profiles' and policyname = 'owner_all') then
    create policy owner_all on public.tf_profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;

-- A proposta pública (/p/<token>) é lida pelo servidor com a chave de serviço (SUPABASE_SERVICE_ROLE_KEY);
-- por isso NÃO existe política de leitura para visitantes anônimos.
