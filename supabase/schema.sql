-- Soares pelo Mundo — esquema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro em: Supabase > SQL Editor > New query > Run.
-- Pode rodar de novo com segurança (usa "if not exists").

create extension if not exists pgcrypto;

-- ---------- Clientes ----------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  notes       text,                       -- anotações INTERNAS (nunca vão para a proposta)
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

-- ---------- Histórico de buscas ----------
create table if not exists public.searches (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete set null,
  module      text not null,              -- 'datas' | 'ocultos' | 'escalas' | ...
  title       text not null,
  params      jsonb not null,
  result      jsonb not null,
  mock        boolean not null default false,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists searches_created_idx on public.searches (created_at desc);
create index if not exists searches_client_idx on public.searches (client_id);

-- ---------- Propostas para clientes ----------
create table if not exists public.proposals (
  id            uuid primary key default gen_random_uuid(),
  token         uuid not null unique default gen_random_uuid(),   -- vai no link público /p/<token>
  client_id     uuid references public.clients(id) on delete set null,
  title         text not null,
  items         jsonb not null,           -- opções escolhidas (apenas dados voltados ao cliente)
  currency      text not null default 'BRL',
  service_fee   numeric not null default 0,   -- sua margem/taxa de serviço, somada ao total
  message       text,                     -- mensagem ao cliente (visível na proposta)
  valid_until   date,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists proposals_client_idx on public.proposals (client_id);

-- ---------- Segurança (RLS) ----------
-- Qualquer usuário LOGADO da sua equipe lê e escreve. Por isso, no Supabase,
-- desative o cadastro público: Authentication > Providers > Email > "Allow new users to sign up" = OFF
-- e crie os usuários da equipe manualmente em Authentication > Users.
-- A proposta pública (/p/<token>) é lida pelo servidor com a chave de serviço,
-- então NÃO existe política de leitura para visitantes anônimos.
alter table public.clients   enable row level security;
alter table public.searches  enable row level security;
alter table public.proposals enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'clients' and policyname = 'team_all') then
    create policy team_all on public.clients   for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'searches' and policyname = 'team_all') then
    create policy team_all on public.searches  for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'proposals' and policyname = 'team_all') then
    create policy team_all on public.proposals for all to authenticated using (true) with check (true);
  end if;
end $$;

-- =====================================================================
-- ALERTAS DE PREÇO POR E-MAIL (adicionado depois: rode de novo este arquivo inteiro,
-- ou só o trecho abaixo, no SQL Editor do Supabase)
-- =====================================================================
create table if not exists public.price_alerts (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid references public.clients(id) on delete set null,
  label                text not null,
  origin               text not null,              -- códigos IATA, separados por vírgula
  destination          text not null,
  out_date             date not null,
  return_date          date,
  adults               int  not null default 1,
  currency             text not null default 'BRL',
  travel_class         int  not null default 1,
  target_price         numeric,                    -- avisa quando o menor preço ficar <= este valor
  min_drop_pct         numeric not null default 5, -- avisa quando cair este % desde a última leitura (0 = desligado)
  notify_email         text not null,
  active               boolean not null default true,
  last_price           numeric,
  last_checked_at      timestamptz,
  last_notified_price  numeric,
  last_notified_at     timestamptz,
  last_error           text,
  created_by           uuid default auth.uid(),
  created_at           timestamptz not null default now()
);
create index if not exists price_alerts_active_idx on public.price_alerts (active, last_checked_at);

alter table public.price_alerts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'price_alerts' and policyname = 'team_all') then
    create policy team_all on public.price_alerts for all to authenticated using (true) with check (true);
  end if;
end $$;
