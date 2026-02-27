# VetorEco — MVP (Guia técnico normativo: INI-first + RAC)

**Stack**: Cloudflare Workers + Hono + React + D1  
**Base**: vetoreco-hybrid-v3  
**Status**: MVP (pronto para GitHub)

---

## O que é o VetorEco

O VetorEco é um **guia técnico normativo** para ajudar arquitetos a preparar e organizar a documentação exigida para conquistar a **ENCE (Projeto e Construído)**.

Ele transforma normas e manuais em:
- checklist por etapa (estudo → anteprojeto → executivo → obra)
- biblioteca técnica (conteúdo educativo + referências)
- apoio de rastreabilidade (cálculos, evidências e dossiê PDF)

### O que o VetorEco NÃO é

- **Não emite ENCE**
- **Não é motor de cálculo oficial**
- **Não inventa números normativos**

Quando não houver uma fonte pública verificável para um número, o sistema **remove o número** ou **vira alerta qualitativo**.

---

## O que existe no MVP

### Backend (API)
- Rotas de projetos, checklist, cálculos e evidências
- Rotas de biblioteca técnica (`/education/*`)
- Rotas de clima (`/climate/*`) com **estimativa aproximada** de ZB (sempre com disclaimer)
- Rota RTQ-C DPIL (`/rtqc/dpil`) com tabela estruturada
- Dossiê PDF profissional (`/projects/:id/dossier.pdf`) com:
  - capa
  - resumo do projeto
  - checklist com status
  - evidências vinculadas
  - memórias de cálculo
  - pendências críticas
  - base normativa (pack + links oficiais)

### Frontend (Web)
- Aba **Biblioteca técnica** consumindo `/education/topics`
- Perfil técnico com botão **“Estimar Zona Bioclimática (aproximado)”**
- Calculadora LPD com comparação contra DPIL (RTQ-C)

### Request ID e logs (observabilidade mínima)

O backend gera um **Request ID** por requisição e devolve:

- Header: `X-Request-Id`
- Campo `requestId` em todas as respostas JSON

Em caso de erro, o frontend exibe esse ID no alerta (ex.: `ID: ...`). Isso facilita depuração em produção.

---

## Estrutura do projeto

```
vetoreco-hybrid/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── climate.ts
│   │       │   ├── educational.ts
│   │       │   ├── validation.ts
│   │       │   ├── rtqc.ts
│   │       │   ├── calculators.ts
│   │       │   ├── dossier_improved.ts
│   │       │   └── journey.ts
│   │       └── knowledge/
│   │           └── packs/
│   │               └── ini_2025_05/    ✅ MANTIDO
│   └── web/
├── db/
│   └── schema.sql
└── docs/
    ├── CONCEITO.md
    ├── NORMAS_E_REFERENCIAS.md
    ├── PACOTE_SUBMISSAO.md
    └── MEMORIAL_GUIADO.md
```

---

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar API
cd apps/api
npx wrangler d1 create vetoreco-hybrid
npx wrangler d1 migrations apply vetoreco-hybrid --local
# (produção) npx wrangler d1 migrations apply vetoreco-hybrid

# Opcional: (re)criar do zero via schema.sql
# npx wrangler d1 execute vetoreco-hybrid --file ../../db/schema.sql
npx wrangler dev

# 3. Configurar Frontend
cd ../web
cp .env.example .env
npm run dev
```

## Migrações (D1)

O banco é mantido via migrações em `db/migrations/`.

Fluxo recomendado:
```bash
cd apps/api
# ambiente local
npx wrangler d1 migrations apply vetoreco-hybrid --local

# produção (sem --local)
npx wrangler d1 migrations apply vetoreco-hybrid
```

Se você mudar o schema (evidências, audit logs, etc.), **crie uma nova migração** e não edite migrações antigas.

---

## Cache do Dossiê (PDF) no R2 (recomendado para Free tier)

Para reduzir CPU no Workers (especialmente no plano gratuito), o VetorEco **cacheia o PDF do dossiê em R2** e **regenera somente quando o projeto mudar**.

### Criar bucket

```bash
cd apps/api
wrangler r2 bucket create vetoreco-dossiers
```

O binding já está configurado em `apps/api/wrangler.jsonc` como `DOSSIERS`.

### Endpoints

- `GET /projects/:id/dossier/status` → informa se existe cache e se precisa regenerar
- `POST /projects/:id/dossier/generate?force=true|false` → gera/atualiza o PDF no R2
- `GET /projects/:id/dossier/download` → retorna o PDF **somente se estiver atualizado**
- `GET /projects/:id/dossier.pdf` → compatível: retorna cache se existir, senão gera e salva

### Expiração automática (TTL) dos PDFs (recomendado)

Para evitar acumular PDFs e manter o custo/armazenamento sob controle, ative uma regra de **Object Lifecycles** no bucket para apagar automaticamente os objetos do dossiê após um período.

> Nota: objetos normalmente são removidos em até ~24h após vencerem.

Os PDFs são gravados com o prefixo `project-` (ex.: `project-<id>/dossier-<hash>.pdf`).

Exemplo (TTL = **7 dias**):

```bash
cd apps/api
npx wrangler r2 bucket lifecycle add vetoreco-dossiers dossier-ttl-7d project- --expire-days 7 --force
```

Para conferir as regras:

```bash
cd apps/api
npx wrangler r2 bucket lifecycle list vetoreco-dossiers
```

---

## Checklist de Go‑Live (produção)

Use esta lista antes de divulgar o link para usuários reais.

### Infra (Cloudflare)
- [ ] **D1 (produção)**: migrações aplicadas
  - `cd apps/api && npx wrangler d1 migrations apply vetoreco-hybrid`
- [ ] **R2**: bucket criado e binding `DOSSIERS` configurado
  - `cd apps/api && wrangler r2 bucket create vetoreco-dossiers`
- [ ] **R2 TTL**: lifecycle ativo (ex.: 7 dias) para prefixo `project-`
  - `cd apps/api && npx wrangler r2 bucket lifecycle add vetoreco-dossiers dossier-ttl-7d project- --expire-days 7 --force`

### Segurança
- [ ] **APP_ORIGIN definido** (CORS)
  - Sem `APP_ORIGIN`, a API aceita apenas `localhost`.
- [ ] **Segredos/vars** conferidos no ambiente (Workers/Pages)

### Smoke test (rápido)
- [ ] `GET /education/topics` retorna lista
- [ ] `GET /rtqc/dpil` retorna tabela DPIL com referência
- [ ] `GET /climate/estimate?city=...&state=...` retorna `zone`, `method`, `confidence` + disclaimer
- [ ] Criar projeto, anexar evidência e cálculo, e gerar dossiê:
  - `GET /projects/:id/dossier.pdf` (primeira vez gera)
  - repetir `GET /projects/:id/dossier.pdf` (deve vir do cache)
- [ ] **Request ID** aparece nos erros do frontend (ex.: `ID: ...`) quando simular falha de API

### Produto / comunicação
- [ ] Texto “**não emite ENCE** / **não é motor oficial**” visível no app
- [ ] Política de retenção: PDFs cacheados temporariamente (R2) + TTL configurado


---

## 📊 O QUE ESTA VERSÃO COMBINA

| Feature | Knowledge Packs | Fundamentos | **Híbrida** |
|---------|----------------|-------------|-------------|
| Checklist Oficial | ✅ | ❌ | ✅ |
| Validações Auto | ❌ | ✅ | ✅ |
| Conteúdo Educativo | ⚠️ | ✅ | ✅ |
| Versionamento | ✅ | ❌ | ✅ |
| Dossiê PDF | ⚠️ | ✅ | ✅ |

---

## 📖 DOCUMENTAÇÃO

Consulte os arquivos em `docs/` para:
- Conceito do produto
- Normas e referências oficiais
- Como preparar submissão ENCE
- Template de memorial descritivo

---

## Documentos usados (e de onde vêm os números)

### Fontes principais
- **RTQ-R — Manual para Aplicação (2014)**
- **RTQ-C — Manual para Aplicação (2016)**
- **RAC — versão atual (PBE Edifica)**

### NormPack (governança)
As referências normativas públicas ficam centralizadas em `apps/api/src/normative_sources.ts` com um `NORMPACK_VERSION_ID` para rastreabilidade (dossiê e validações).

### Números normativos implementados no código

Somente estes conjuntos possuem validação numérica (todos com comentário + link público no código):
- **U-value (paredes/coberturas)**: RTQ-R Manual 2014 — **Tabela 3.1** (PDF oficial no PBE Edifica)
- **Ventilação mínima**: RTQ-R Manual 2014 — **Tabela 3.2** (PDF oficial no PBE Edifica)
- **DPIL (LPD)**: RTQ-C Manual 2016 — **Tabela 4.1** (PDF oficial no PBE Edifica)

Qualquer outro número exibido no app deve estar associado a uma fonte pública verificável — caso contrário, deve ser removido.

**VetorEco** — guia normativo real, sem motor de ENCE, sem números inventados. 🇧🇷


## Privacidade e retenção do dossiê (PDF)

O VetorEco pode armazenar temporariamente o PDF do dossiê no **Cloudflare R2** para evitar reprocessamento (e reduzir consumo de CPU no Workers).

- O PDF é regenerado **somente quando o projeto muda** (hash do conteúdo).
- Recomenda-se configurar **expiração automática (TTL)** no bucket R2 (ex.: 7 dias) via Object Lifecycles.

Veja a seção de TTL no README para os comandos do Wrangler.
