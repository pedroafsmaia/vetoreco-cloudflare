# VetorEco (Cloudflare-first SaaS)

MVP funcional para **triagem e compliance operacional** de eficiência energética (PBE Edifica), com foco em:

- autenticação + sessão
- multi-tenant (organizations/workspaces)
- projetos
- checklist de triagem
- contexto regulatório (INI / RTQ legado)
- inputs técnicos
- pré-cálculo auditável (heurístico MVP)
- memorial e dossiê em **HTML/JSON-first**
- **exportação PDF do memorial (implementada via `pdf-lib`)**
- admin de pacotes/regras normativas (CRUD)
- golden cases (seed + endpoint de gestão)
- auditoria e versionamento de projeto

## Stack

- **Frontend:** React + Vite
- **API:** Hono (Cloudflare Workers)
- **Banco:** Cloudflare D1 (SQLite)
- **PDF:** `pdf-lib` (geração nativa no edge)
- **Testes:** Vitest

## Estrutura

- `apps/api` → API Worker + módulos de domínio + testes
- `apps/web` → Interface React do MVP
- `apps/api/db/schema.sql` → schema D1
- `apps/api/db/seed.sql` → seed normativo inicial
- `apps/api/db/seed_003_golden_cases.sql` → seed dos golden cases oficiais curados
- `docs/golden-cases/` → relatório PDF + análise + JSON extraído

## Rodar localmente

> Requer Node 20+ e Cloudflare Wrangler configurado.

1. Instale dependências:
   - `npm install`

2. Crie/ligue o D1 no `wrangler.jsonc` e aplique schema + seeds (base + térmico + golden cases):
   - `wrangler d1 execute vetoreco-db --file=apps/api/db/schema.sql`
   - `wrangler d1 execute vetoreco-db --file=apps/api/db/seed.sql`
   - `wrangler d1 execute vetoreco-db --file=apps/api/db/migration_002_thermal.sql`
   - `wrangler d1 execute vetoreco-db --file=apps/api/db/seed_002_thermal.sql`

3. Suba a API:
   - `npm run dev:api`

4. Suba o frontend:
   - `npm run dev:web`

Frontend usa proxy `/api` → `wrangler dev` local.

## Fluxo recomendado no MVP

1. Cadastre/login
2. Crie um projeto (ou use **Projeto Demo**)
3. Ajuste checklist, contexto regulatório e inputs técnicos
4. Rode **pré-cálculo**
5. Abra:
   - Memorial JSON/HTML
   - **Memorial PDF**
   - Dossiê operacional

## Observações do MVP

- O motor de cálculo ainda é **heurístico auditável** (pré-cálculo), pronto para evoluir para cobertura normativa P1/P2.
- O PDF já está implementado (texto estruturado em A4 via `pdf-lib`), sem depender de headless browser.
- O admin normativo agora suporta **CRUD** de pacotes e regras.
- Golden cases estão preparados no banco/endpoints para validação progressiva.

## Próximos passos sugeridos

1. Cobertura normativa completa P1/P2 (por tipologia)
2. Golden cases reais validados por especialista
3. Template PDF visual avançado (layout institucional)
4. RBAC refinado por papel (owner/admin/member)
5. Assinatura e trilha de aprovação de memorial


## Novidades da versão 0.4.2

- **Motor térmico rápido no frontend** (RTQ-R / RTQ-C / NBR 15575): formulário único para salvar envelope, janelas, iluminação e HVAC e rodar cálculo.
- **Persistência térmica no D1** usando as tabelas da migration 002 (paredes, coberturas, janelas, iluminação, HVAC, cálculos e checks).
- **Endpoints de catálogo térmico**: zonas bioclimáticas, materiais e municípios.
- **Pré-cálculo integrado ao térmico**: se já existir cálculo térmico ele é anexado ao pré-cálculo; se houver dados térmicos salvos e ainda não houver cálculo, a API tenta rodar automaticamente em modo `auto`.
- **Memorial e dossiê enriquecidos** com seção de resultado térmico complementar.
- **Golden cases (admin)**:
  - `POST /admin/golden-cases/import` para importar casos em lote (JSON)
  - `POST /admin/golden-cases/run` para validar casos existentes e gerar relatório de acerto/erro

## Observações importantes

- Para o módulo térmico funcionar, a migration/seed térmica (`migration_002_thermal.sql` + `seed_002_thermal.sql`) precisa ser aplicada no D1.
- O PDF do memorial já é gerado no backend (via `pdf-lib`) e continua disponível na rota `/projects/:id/memorial.pdf`.
- Os **golden cases normativos completos** ainda dependem da sua pesquisa/curadoria (entradas e resultados oficiais). A infraestrutura para importar e rodar já está pronta.


## Correções da versão 0.4.2

- Corrigido o pipeline do cálculo térmico rápido para usar as assinaturas canônicas de `calculateRTQR` e `calculateRTQC` (evita erro de runtime ao rodar RTQ-R/RTQ-C).
- Ajustado o cálculo automático do parâmetro AVS (estimativa a partir de sombreamento/janelas) e o particionamento de áreas permanentes/transitórias no RTQ-R.
- Pré-cálculo agora pode disparar cálculo térmico automaticamente quando há dados térmicos salvos mas ainda não existe rodada térmica persistida.

## Novidades da versão 0.4.2

- **Curadoria de golden cases PBE Edifica incorporada ao projeto** (5 casos oficiais consolidados em JSON + seed SQL para D1).
- **Tabela `golden_case_results` enriquecida** com metadados de curadoria (`source_url`, normativa, tipologia, ZB, qualidade, completude).
- **Importador admin de golden cases atualizado** para aceitar o **formato do relatório** (normative + technical_inputs + expected_results) além do formato legado.
- **Runner de golden cases com status `SKIPPED`** para casos de referência já importados cuja execução normativa completa ainda depende do motor (evita falso positivo e mantém rastreabilidade).
- **Documentação interna adicionada** em `docs/golden-cases/` com PDF original, JSON extraído e análise.

## Como usar os golden cases curados

1. Aplicar o seed: `apps/api/db/seed_003_golden_cases.sql`
2. Acessar `POST /admin/golden-cases/run`
3. Ler o resumo:
   - `supportedTotal`: casos que o runner consegue executar hoje
   - `skipped`: casos já armazenados, aguardando motor normativo
   - `failed`: casos executados com divergência

> Observação: os 5 casos oficiais da curadoria entram como **referência auditável**; eles passam a virar regressão automática real à medida que os motores normativos completos forem sendo implementados.
