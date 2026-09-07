-- ============================================================
-- Deleon Fit | Cargas (peso erguido) por exercício
-- Aplicado no projeto via API/Composio em 2026-08-25.
-- Este arquivo documenta o schema para referência/recriação.
--
-- Uma linha por aluno+exercício; o array jsonb "historico"
-- guarda [{data:'YYYY-MM-DD', peso:number}, ...] (máx. 30,
-- podado no cliente). O app faz POST -> 409 -> PATCH (upsert).
-- ============================================================

create table if not exists public.deleon_cargas (
  id uuid primary key default gen_random_uuid(),
  aluno_email text not null,
  exercicio text not null,
  historico jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);

create unique index if not exists deleon_cargas_aluno_exercicio_idx
  on public.deleon_cargas (aluno_email, exercicio);

alter table public.deleon_cargas enable row level security;

drop policy if exists "deleon_cargas_anon_all" on public.deleon_cargas;
create policy "deleon_cargas_anon_all"
  on public.deleon_cargas
  for all
  using (true)
  with check (true);
