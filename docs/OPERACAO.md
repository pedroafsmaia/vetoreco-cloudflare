# Operação / Deploy (Cloudflare)

## API (Workers + D1)

### Criar do zero
1) Criar banco D1
2) Executar `db/schema.sql`
3) Ajustar `apps/api/wrangler.jsonc` (binding DB e APP_ORIGIN)
   - `APP_ORIGIN`: lista de origens permitidas separadas por vírgula.
     - Ex.: `https://vetoreco.pages.dev,http://localhost:5173`
   - `COOKIE_SECURE` (opcional): defina `true` para forçar cookies Secure.
4) `wrangler deploy`

### Atualizar um D1 existente (rework antigo)
Se você já tinha um banco do rework anterior, aplique as migrações necessárias:

- `db/migrations/001_rework_improvements.sql`
- `db/migrations/002_project_profile.sql`
- `db/migrations/003_knowledge_pack.sql` (novo — adiciona `knowledge_pack_id` em `projects`)

Exemplo:
```bash
cd apps/api
npx wrangler d1 execute vetoreco --file ../../db/migrations/003_knowledge_pack.sql
```

> Nota: o SQLite/D1 não suporta `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Se a migração já tiver sido aplicada, ela pode falhar; nesse caso, basta ignorar.

## Web (Pages)
1) Build do Vite (`npm run build`)
2) Setar `VITE_API_URL` no Pages
3) Deploy
