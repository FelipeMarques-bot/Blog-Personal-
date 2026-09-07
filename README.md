# FitApp — App do Personal Trainer (Template)

> Projeto de exemplo criado para servir de **template**: troque o nome do personal,
> o WhatsApp e as cores e publique para um novo treinador. As referências de marca
> usam um nome fictício de demonstração (**Rafael Lima**) e um número de contato
> placeholder (**+55 11 99999-9999**).

Aplicação web completa (3 áreas em um só site, estilo academia com cores neon), publicada como **PWA instalável**:

| Página | Arquivo | Para que serve |
|---|---|---|
| Blog / Site público | `index.html` | Propaganda, apresentação do personal, carrosséis de fotos e **botão de WhatsApp** para novos alunos contratarem |
| Área do Aluno | `login.html` → `aluno.html` | Login com e-mail + senha + código de verificação, plano de treino mensal, check-in diário, métricas de evolução e **timer de descanso entre séries** |
| Painel Admin | `admin.html` | Exclusivo do personal: cadastrar alunos, publicar/editar treinos, **acompanhar a progressão de cada aluno** (botão Progresso) |

## Como reutilizar (novo projeto)

1. **Nome do personal**: `index.html` usa "Rafael Lima" no logo, título, seção "sobre" e rodapé; `manifest.json` também tem o nome.
2. **Contato / WhatsApp**: sem precisar de código — painel admin → aba **Configurações** → campo "Número do WhatsApp". O padrão (placeholder) também está em `js/store.js` (`WHATSAPP_PADRAO`).
3. **Cores**: todas no `css/styles.css`, no bloco `:root` (`--neon`, `--cyan`, `--pink`, `--bg`, etc.). É só trocar ali.
4. **Fotos**: substitua os arquivos em `assets/` (`blog-personal.jpg`, `foto-1.jpg`, `foto-2.jpg`, `car1/`, `car2/`) e o `assets/logo.png`.

## Site no ar

- Hospedagem: Render (site estático), deploy automático a cada push na branch `main`
- Dados: banco **Supabase** (multi-dispositivo — aluno vê na hora o treino publicado pelo personal)

## Acessos

- **Alunos:** cadastro próprio na página de login (`joao@email.com` e `maria@email.com`, senha `123456`, são contas de demonstração — podem ser excluídas pelo painel).
- **Admin:** login pessoal configurado na nuvem. Para trocar e-mail/senha: entrar no painel → aba **Configurações** → seção *Acesso Admin*. (As credenciais não ficam anotadas neste arquivo por segurança.)

## Funcionalidades

- **PWA**: botões "⤓ APP" no site e na área do aluno instalam o aplicativo na tela inicial do celular (Android via prompt nativo; iOS via Compartilhar → Adicionar à Tela de Início).
- **Timer de descanso**: o aluno escolhe 0:30–2:00 e o tempo continua contando mesmo com a tela bloqueada ou app em segundo plano (baseado em horário-final salvo); ao terminar apita, vibra e avisa.
- **Check-in diário**, calendário do mês, sequência atual, recorde e barras das últimas 4 semanas.
- **Painel admin**: tabela com treinos no mês/sequência + botão Progresso com detalhes por aluno.

## Onde os dados ficam

Supabase, tabelas (prefixo `fitapp_` no template):
- `fitapp_alunos` — cadastro e plano mensal (jsonb)
- `fitapp_checkins` — check-ins diários
- `fitapp_config` — configurações gerais e credenciais do admin

> Nota: as senhas são salvas em texto puro e legíveis pela chave pública do site. Para produção séria, migrar autenticação para Supabase Auth (senhas com hash).

## Estrutura

```
fitapp/
├── index.html              Blog público + carrosséis + WhatsApp
├── login.html              Login/cadastro + verificação
├── aluno.html              Dashboard do aluno (treino, check-in, timer)
├── admin.html              Painel do personal (+ modal de progresso)
├── manifest.json           Manifesto do PWA
├── sw.js                   Service worker (offline básico)
├── css/styles.css          Tema neon academia
├── js/store.js             Estado local + helpers de métricas
├── js/cloud.js             Sincronização com Supabase
├── js/supabase-config.js   URL e chave do projeto
├── js/pwa.js               Registro do SW + botão instalar
├── js/login.js             Autenticação
├── js/aluno.js             Lógica do aluno + timer de descanso
├── js/admin.js             Lógica do painel
└── assets/                 Logo, ícones PWA e fotos
```

## WhatsApp do personal

Número placeholder: **+55 11 99999-9999** (numero de exemplo — troque no painel).
Para trocar: painel admin → aba **Configurações** → campo "Número do WhatsApp". Todos os botões do site atualizam sozinhos.