# Normas e referências do VetorEco

O VetorEco é um **guia técnico de preparação** para reduzir retrabalho antes do processo oficial da ENCE.

Ele **não emite** etiqueta e **não reproduz** conteúdo normativo protegido. Em vez disso, ele:

- transforma o processo e os manuais aplicáveis em **checklists por etapa**;
- registra evidências e decisões do projeto;
- disponibiliza calculadoras de apoio com fórmula/assunções;
- aponta **referências institucionais** (links) para apoiar o trabalho.

## Referências institucionais (PBE Edifica / ENCE)

- **Como obter a Etiqueta (PBE Edifica)**
  - https://pbeedifica.com.br/como-obter

- **Manual do RAC (processo de inspeção: ENCE de Projeto e ENCE do Construído)** — maio/2025
  - https://pbeedifica.com.br/sites/default/files/manuais/Manual%20RAC_novo%20formato_maio25.pdf

- **Manuais de aplicação INI-R** — maio/2025
  - https://pbeedifica.com.br/inirmanuais

- **Manuais de aplicação INI-C** — maio/2025
  - https://pbeedifica.com.br/inicmanuais

- **INI-C — Manual de Definições** — maio/2025
  - https://pbeedifica.com.br/sites/default/files/manuais/Manual%20INI-C_Defini%C3%A7%C3%B5es_maio25.pdf

- **INI-R — Manual de Definições** — maio/2025
  - https://pbeedifica.com.br/sites/default/files/manuais/Manual%20INI-R_Defini%C3%A7%C3%B5es_maio25.pdf

- **Manual de Preenchimento da ENCE** (orientações para preenchimento no processo oficial)
  - https://www.pbeedifica.com.br/sites/default/files/Manual%20de%20Preenchimento%20da%20ENCE.pdf

- **RAC — Catálogo de propriedades térmicas (DEZ/2022)**
  - https://www.pbeedifica.com.br/sites/default/files/Manual%20RAC_Cat%C3%A1logo%20de%20propriedades_DEZ-22.pdf

- **MME — Resolução CGIEE nº 4/2025** (índices mínimos e cronograma de implantação)
  - https://www.gov.br/mme/pt-br/assuntos/ee/indices-minimos-de-ee/eficiencia-energetica-das-edificacoes/resolucao-no4-2025

> Observação: a emissão oficial da ENCE segue o processo institucional aplicável (inspeção de projeto e/ou do construído).

## Cobertura do MVP

Este MVP é **INI-first** (maio/2025): ele organiza o preparo, indica dados mínimos e evidencia o que costuma gerar retrabalho, apontando fontes oficiais do PBE Edifica.

O RTQ pode existir como contexto legado em projetos antigos, mas não é o foco do guia nesta fase.

## Referências técnicas usadas nas calculadoras (apoio)

As calculadoras do VetorEco têm objetivo de **apoio ao projeto** e **padronização do preparo** — elas não “fecham” a ENCE.

### U-value (Transmitância térmica por camadas)

O cálculo por camadas usa a formulação clássica de resistência térmica:

- `R_total = Rsi + Σ(e/k) + Rse`
- `U = 1 / R_total`

No contexto do PBE Edifica, materiais e propriedades podem ser suportados por catálogos e anexos do RAC (por exemplo, o catálogo de propriedades térmicas), além de fichas técnicas do fabricante.

> Nota: Em projetos reais, confira sempre as assunções (orientação, condições de contorno, contatos com materiais, etc.) conforme o método aplicável.

## Como o VetorEco usa essas referências

- **Knowledge packs** versionados (ex.: `ini_2025_05`) definem tarefas por etapa e links oficiais.
- **Tarefas do checklist** incluem `referências` (links) e `evidenceHints` (que tipo de evidência anexar).
- **Calculadoras** retornam `formula`, `assumptions` e `references`.
- **Dossiê** organiza prontidão, tarefas, evidências e memórias de cálculo.
