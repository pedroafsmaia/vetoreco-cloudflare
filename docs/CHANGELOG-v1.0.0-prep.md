# Changelog de preparação para v1.0.0

## Implementado nesta entrega

- **PDF do memorial implementado** (`GET /projects/:id/memorial.pdf`) usando `pdf-lib`
- **CRUD admin normativo**:
  - Pacotes (`/admin/normative/packages`)
  - Regras (`/admin/normative/rules`)
- **Multi-tenant (organizations/workspaces)** com seleção via header `X-Organization-Id`
- **Checklist de triagem** por tipologia e resumo de risco
- **Contexto regulatório** com suporte INI / RTQ legado
- **Inputs técnicos** com normalização e validação
- **Pré-cálculo auditável MVP** com persistência de `calculation_runs`
- **Memorial e dossiê** HTML/JSON-first
- **Golden cases** com endpoints admin e seed base
- **Logs de auditoria** e **versionamento de projeto**
- **Frontend React** para operar o fluxo de ponta a ponta
- **Testes Vitest** (domínio + fluxo básico de API)

## Limitações mantidas (intencionais do MVP)

- Motor normativo completo P1/P2 ainda não foi fechado
- PDF com layout simples (texto estruturado); pode evoluir para template institucional
- Sem integração externa de assinatura/SEI/protocolo
