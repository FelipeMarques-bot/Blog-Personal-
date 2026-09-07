-- ============================================================
-- Deleon Fit | Tabela de medidas e peso dos alunos
-- Rode este script no SQL Editor do painel do Supabase.
--
-- Enquanto esta tabela NÃO existir, o app continua funcionando
-- normalmente: as medições ficam salvas apenas no aparelho
-- (localStorage) com aviso silencioso no console.
--
-- Modelo de acesso idêntico às tabelas existentes
-- (deleon_alunos / deleon_checkins / deleon_config): a anon key
-- do front tem acesso direto, protegido por RLS liberado para a
-- service_role/anon conforme o padrão já usado no projeto.
-- ============================================================

create table if not exists public.deleon_medidas (
  id uuid primary key default gen_random_uuid(),
  aluno_email text not null,
  data text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

-- Evita medições duplicadas do mesmo aluno no mesmo dia
create unique index if not exists deleon_medidas_aluno_data_idx
  on public.deleon_medidas (aluno_email, data);

alter table public.deleon_medidas enable row level security;

drop policy if exists "deleon_medidas_anon_all" on public.deleon_medidas;
create policy "deleon_medidas_anon_all"
  on public.deleon_medidas
  for all
  using (true)
  with check (true);
