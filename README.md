# VetorEco v0.1.0 (MVP pronto para GitHub)

MVP de SaaS para arquitetos/engenheiros organizarem **enquadramento regulatório**, **checklist técnico**, **inputs de pré-cálculo** e **documentação preliminar** de eficiência energética de edificações (com foco no fluxo de conformidade associado às exigências que entram em vigor nos próximos anos).

## Proposta do SaaS

O VetorEco nasce para resolver o problema prático do escritório:
- entender **quando** a exigência passa a valer para cada projeto (porte do município, ente público/privado, data do processo),
- evitar retrabalho com **checklist técnico guiado**,
- consolidar **inputs canônicos** para cálculo,
- registrar **versões e trilha de auditoria**,
- gerar **memorial** e **dossiê operacional** em HTML/JSON,
- manter um motor **versionado** (INI-first, RTQ legado apenas para transição).

## O que esta versão já entrega

### Front-end (React + Vite)
- Login/cadastro básico
- CRUD de projetos
- Tela única de operação com blocos:
  1. Projeto
  2. Enquadramento legal (contexto regulatório)
  3. Checklist técnico por tipologia
  4. Inputs técnicos canônicos
  5. Pré-cálculo + histórico de execuções
- Abertura de Memorial e Dossiê em **HTML** ou **JSON**
- Exibição dos pacotes normativos carregados no banco (somente leitura)

### Back-end (Cloudflare Workers + Hono)
- Auth básica (senha com PBKDF2 + sessão em cookie HttpOnly)
- Rotas protegidas por sessão
- Auditoria (`audit_logs`) com `requestId`
- Versionamento de snapshots do projeto (`project_versions`)
- `project_regulatory_context` com método `INI` / `RTQ_LEGADO`
- Motor de enquadramento legal versionado (INI-first)
- Validação de inputs técnicos por tipologia
- Pipeline canônico de pré-cálculo com persistência em `calculation_runs`
- Geração de Memorial e Dossiê (HTML/JSON)
- Rota de PDF explícita com `NOT_IMPLEMENTED` (estratégia HTML/JSON-first)

### Banco de dados (Cloudflare D1)
Schema inclui tabelas operacionais e de evolução normativa:
- `users`, `sessions`
- `projects`, `project_regulatory_context`
- `project_checklist_items`, `project_versions`, `audit_logs`
- `normative_packages`, `normative_rules`
- `calculation_profiles`, `calculation_coefficients`
- `calculation_runs`
- `golden_case_results`

## Estrutura do código

```text
vetoreco-v01/
  apps/
    api/
      src/
        index.ts                     # Rotas principais Hono
        db.ts                        # audit + helpers de snapshot/ownership
        utils.ts                     # hash, cookies, erros, helpers
        modules/
          auth/session.ts            # cadastro/login/logout + middleware requireAuth
          checklist/
            templates.ts             # checklist por tipologia
            risk.ts                  # cálculo de risco/progresso
          regulatory/
            engine.ts                # contexto + enquadramento legal versionado
            seed.ts                  # seed de pacotes/regras normativas no D1
          technical/inputs.ts        # inputs canônicos + validação
          calculation/pipeline.ts    # pré-cálculo canônico auditável
          documents/render.ts        # memorial/dossiê HTML/JSON
      test/                         # testes unitários (Vitest) + scaffold integração
      wrangler.jsonc                # binding D1 + vars
    web/
      src/
        App.tsx                     # UI do MVP
        api.ts                      # helper fetch
        styles.css                  # estilos básicos
  db/schema.sql                     # schema completo do D1
```

## Rotas principais (API)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Projetos e fluxo técnico
- `GET/POST /projects`
- `GET/PUT/DELETE /projects/:id`
- `GET/PUT /projects/:id/checklist`
- `GET /projects/:id/risk`
- `GET/PUT /projects/:id/regulatory-context`
- `GET /projects/:id/legal-framing`
- `GET/PUT /projects/:id/technical-inputs`
- `POST /projects/:id/calculation/run`
- `GET /projects/:id/calculation/runs`
- `GET /projects/:id/calculation/latest`
- `GET /projects/:id/memorial?format=json|html`
- `GET /projects/:id/dossier?format=json|html`
- `GET /projects/:id/memorial.pdf` (retorna `NOT_IMPLEMENTED`)
- `POST /projects/demo`

### Normativos (somente leitura por enquanto)
- `GET /normatives/packages`
- `GET /normatives/rules`

## Como rodar localmente

### 1) Instalar dependências
```bash
npm install
```

### 2) Criar o banco D1 e aplicar schema
```bash
cd apps/api
npx wrangler d1 create vetoreco
# copie o database_id para apps/api/wrangler.jsonc
npx wrangler d1 execute vetoreco --local --file=../../db/schema.sql
```

### 3) Rodar API e Front
Terminal 1:
```bash
npm run dev:api
```

Terminal 2:
```bash
npm run dev:web
```

## Testes

Foram incluídos testes unitários de:
- motor regulatório
- validação de inputs técnicos
- pipeline de pré-cálculo

Rodar:
```bash
npm --workspace apps/api exec vitest run
```

> Observação: existe também um `auth.integration.test.ts` em scaffold (skip) para você completar com D1 local/miniflare quando quiser validar fluxo completo de auth + rotas protegidas.

## Limitações atuais desta versão (transparentes)

- **Cálculo normativo ainda parcial**: o pipeline é canônico, auditável e útil para pré-avaliação, mas não cobre integralmente todas as fórmulas/casos normativos P1/P2.
- **PDF final não implementado** nesta etapa (rota retorna `NOT_IMPLEMENTED`). A estratégia atual é HTML/JSON-first.
- **Normativos admin** ainda estão em **read-only** (sem CRUD de pacotes/regras via UI/API).
- **Engine regulatória** é um MVP operacional com regras versionadas simplificadas; precisa de consolidação jurídica completa antes de uso em produção regulada.

## Próximos passos sugeridos (v0.2+)

1. Completar cálculo normativo formal por tipologia (P1/P2 completos)
2. Exportar PDF (Workers + HTML renderer ou serviço dedicado)
3. CRUD admin para pacotes normativos e regras
4. Gestão de times/escritórios (multiusuário)
5. Templates de memorial por prefeitura/OIA
6. Assinatura/planos e limites por projeto

## Sugestões de commit (já pensando no seu padrão)

Como você gosta de commits por pasta, eu faria assim:

- **apps/api** → `feat(api): add regulatory framing, technical inputs, and auditable pre-calc pipeline`
- **apps/web** → `feat(web): add mvp workspace for legal framing checklist and pre-calc`
- **db** → `feat(db): add normative versioning and calculation run schema`
- **root/docs** → `docs: update readme for vetoreco v0.1.0 setup and architecture`

---
Se quiser, no próximo passo eu posso te entregar um **checklist exato de publicação no GitHub + Cloudflare** (ordem dos comandos, bindings, secrets e deploy), já no formato que você vai executar.
