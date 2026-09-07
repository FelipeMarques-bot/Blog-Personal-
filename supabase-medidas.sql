-- ============================================================
-- FitApp | Tabela de medidas e peso dos alunos
-- Rode este script no SQL Editor do painel do Supabase.
--
-- Enquanto esta tabela NÃƒO existir, o app continua funcionando
-- normalmente: as mediÃ§Ãµes ficam salvas apenas no aparelho
-- (localStorage) com aviso silencioso no console.
--
-- Modelo de acesso idÃªntico Ã s tabelas existentes
-- (fitapp_alunos / fitapp_checkins / fitapp_config): a anon key
-- do front tem acesso direto, protegido por RLS liberado para a
-- service_role/anon conforme o padrÃ£o jÃ¡ usado no projeto.
-- ============================================================

create table if not exists public.fitapp_medidas (
  id uuid primary key default gen_random_uuid(),
  aluno_email text not null,
  data text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

-- Evita mediÃ§Ãµes duplicadas do mesmo aluno no mesmo dia
create unique index if not exists fitapp_medidas_aluno_data_idx
  on public.fitapp_medidas (aluno_email, data);

alter table public.fitapp_medidas enable row level security;

drop policy if exists "fitapp_medidas_anon_all" on public.fitapp_medidas;
create policy "fitapp_medidas_anon_all"
  on public.fitapp_medidas
  for all
  using (true)
  with check (true);
