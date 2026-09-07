-- ============================================================
-- FitApp | Cargas (peso erguido) por exercÃ­cio
-- Aplicado no projeto via API/Composio em 2026-08-25.
-- Este arquivo documenta o schema para referÃªncia/recriaÃ§Ã£o.
--
-- Uma linha por aluno+exercÃ­cio; o array jsonb "historico"
-- guarda [{data:'YYYY-MM-DD', peso:number}, ...] (mÃ¡x. 30,
-- podado no cliente). O app faz POST -> 409 -> PATCH (upsert).
-- ============================================================

create table if not exists public.fitapp_cargas (
  id uuid primary key default gen_random_uuid(),
  aluno_email text not null,
  exercicio text not null,
  historico jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);

create unique index if not exists fitapp_cargas_aluno_exercicio_idx
  on public.fitapp_cargas (aluno_email, exercicio);

alter table public.fitapp_cargas enable row level security;

drop policy if exists "fitapp_cargas_anon_all" on public.fitapp_cargas;
create policy "fitapp_cargas_anon_all"
  on public.fitapp_cargas
  for all
  using (true)
  with check (true);
