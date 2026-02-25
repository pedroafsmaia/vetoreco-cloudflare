# Golden Cases PBE Edifica — Curadoria e ingestão (v0.4.2)

Este diretório consolida o material de referência usado para popular a tabela `golden_case_results` do VetorEco.

## O que foi incluído

- **Relatório original**: `Relatorio_Golden_Cases_PBE_Edifica_VetorEco.pdf`
- **JSON extraído/normalizado**: `golden_cases_pbe_edifica_2026.json`
- **Seed SQL para D1**: `apps/api/db/seed_003_golden_cases.sql` (fora deste diretório)

## Casos oficiais importados

Foram preparados **5 golden cases** da curadoria:

1. `GC-INI-C-001` — INI-C (hotel, ZB3) — completude 92%
2. `GC-INI-R-UH-001` — INI-R (UH multifamiliar, ZB3) — completude 95%
3. `GC-INI-R-AUC-001` — INI-R (AUC hospedagem) — completude 88%
4. `GC-RTQ-C-ENV-001` — RTQ-C (envoltória comercial, ZB1) — completude 90%
5. `GC-RTQ-R-MF-001` — RTQ-R (multifamiliar + UH + AUC, ZB3) — completude 72% (**partial**)

## Como o VetorEco trata esses casos agora

- Os registros entram no banco com metadados extras:
  - `source_url`
  - `normative_code`
  - `building_type`
  - `bioclimatic_zone`
  - `data_quality` (`full` / `partial`)
  - `completeness_pct`
- O endpoint `POST /admin/golden-cases/import` aceita **dois formatos**:
  1. formato legado do VetorEco (`case_key`, `input`, `expected_output`, etc.)
  2. formato do relatório (com `normative`, `technical_inputs`, `expected_results`, etc.)

## Importante (execução automática)

O runner de golden cases foi atualizado para **reconhecer** os casos do relatório e marcá-los como `SKIPPED` quando a execução normativa completa ainda não estiver implementada para aquela normativa/caso.

Isso foi feito de propósito para:
- manter a base oficial já dentro do banco
- permitir rastreabilidade e auditoria
- evitar “falso verde” (não compara resultado inexistente)

Quando os motores normativos completos (INI-C/INI-R/RTQ-C prescritivo detalhado/RTQ-R legado completo) forem finalizados, basta adicionar os adaptadores de execução no módulo `apps/api/src/modules/goldenCases.ts` para transformar esses mesmos registros em regressão automática real.

## Próximo passo recomendado

Seu deep research de golden cases pode continuar em paralelo. Quando você fechar os **golden cases com insumos completos** e/ou fórmulas implementadas:

1. atualizar o JSON de fixtures (ou usar import via endpoint admin),
2. rodar `POST /admin/golden-cases/run`,
3. acompanhar `summary.supportedTotal`, `summary.skipped` e `summary.failed`.
