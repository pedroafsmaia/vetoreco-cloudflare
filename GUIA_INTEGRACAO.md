# GUIA DE INTEGRAÇÃO — Módulos Híbridos

Este documento explica como integrar os novos módulos na API existente.

---

## 📦 MÓDULOS ADICIONADOS

### 1. `climate.ts` — Zonas Bioclimáticas

**Exportações:**
```typescript
export const CLIMATE_ZONES: Record<ClimateZone, ClimateZoneData>
export function getClimateZoneByLocation(city: string, state: string): ClimateZone | null
export function getUValueLimits(zone: ClimateZone, envelopeType: 'wall' | 'roof')
export function getWWRRecommendation(zone: ClimateZone)
```

**Uso:**
```typescript
import { CLIMATE_ZONES, getClimateZoneByLocation } from './modules/climate';

// Endpoint: GET /climate/zones
app.get('/climate/zones', (c) => {
  return c.json({ zones: CLIMATE_ZONES });
});

// Endpoint: GET /climate/detect?city=X&state=Y
app.get('/climate/detect', (c) => {
  const city = c.req.query('city');
  const state = c.req.query('state');
  const zone = getClimateZoneByLocation(city, state);
  return c.json({ zone, data: zone ? CLIMATE_ZONES[zone] : null });
});
```

---

### 2. `validation.ts` — Validações Normativas

**Exportações:**
```typescript
export function validateWallUValue(uValue: number, climateZone: ClimateZone, absorptance: number): ValidationResult
export function validateRoofUValue(uValue: number, climateZone: ClimateZone): ValidationResult
export function validateWWR(...): ValidationResult
export function validateLPD(...): ValidationResult
export function validatePAFT(...): ValidationResult
```

**Uso nas calculadoras (já implementado):**
```typescript
// Em calculators.ts
import { validateWallUValue } from './validation';

export function calcUValue(inputs) {
  // ... cálculo
  
  let validation: ValidationResult | undefined;
  if (inputs.climate_zone) {
    validation = validateWallUValue(U, inputs.climate_zone, absorptance);
  }
  
  return { ..., validation };
}
```

---

### 3. `educational.ts` — Conteúdo Educativo

**Exportações:**
```typescript
export const EDUCATIONAL_LIBRARY: Record<string, EducationalContent>
export function getContextualTip(context: string, data?: any): string | null
export function getNormativeReference(topic: string)
export function suggestNextActions(progress: {...})
```

**Uso:**
```typescript
// Endpoint: GET /educational/:topic
app.get('/educational/:topic', (c) => {
  const topic = c.req.param('topic');
  const content = EDUCATIONAL_LIBRARY[topic];
  return c.json({ content });
});

// Endpoint: POST /educational/tips
app.post('/educational/tips', async (c) => {
  const { context, data } = await c.req.json();
  const tip = getContextualTip(context, data);
  return c.json({ tip });
});

// Endpoint: GET /educational/suggestions?stage=X&progress=Y
app.get('/educational/suggestions', (c) => {
  const suggestions = suggestNextActions({...});
  return c.json({ suggestions });
});
```

---

## 🔧 INTEGRAÇÃO PASSO A PASSO

### Passo 1: Atualizar `index.ts` da API

Adicione os imports:
```typescript
import { CLIMATE_ZONES, getClimateZoneByLocation } from './modules/climate';
import { EDUCATIONAL_LIBRARY, getContextualTip } from './modules/educational';
```

### Passo 2: Adicionar Endpoints de Clima

```typescript
// GET /api/climate/zones - Lista todas as zonas
app.get('/climate/zones', (c) => {
  return c.json({ 
    success: true, 
    data: { zones: CLIMATE_ZONES },
    requestId: crypto.randomUUID() 
  });
});

// GET /api/climate/zone/:id - Detalhes de uma zona
app.get('/climate/zone/:id', (c) => {
  const zoneId = c.req.param('id') as ClimateZone;
  const zone = CLIMATE_ZONES[zoneId];
  
  if (!zone) {
    return c.json({ 
      success: false, 
      error: { code: 'NOT_FOUND', message: 'Zona não encontrada' },
      requestId: crypto.randomUUID()
    }, 404);
  }
  
  return c.json({ 
    success: true, 
    data: { zone },
    requestId: crypto.randomUUID() 
  });
});

// GET /api/climate/detect - Detecta zona por localização
app.get('/climate/detect', (c) => {
  const city = c.req.query('city') || '';
  const state = c.req.query('state') || '';
  
  const zoneId = getClimateZoneByLocation(city, state);
  const zone = zoneId ? CLIMATE_ZONES[zoneId] : null;
  
  return c.json({ 
    success: true, 
    data: { zoneId, zone },
    requestId: crypto.randomUUID() 
  });
});
```

### Passo 3: Adicionar Endpoints Educativos

```typescript
// GET /api/educational/library - Lista todos os tópicos
app.get('/educational/library', (c) => {
  const topics = Object.keys(EDUCATIONAL_LIBRARY);
  return c.json({ 
    success: true, 
    data: { topics },
    requestId: crypto.randomUUID() 
  });
});

// GET /api/educational/:topic - Detalhes de um conceito
app.get('/educational/:topic', (c) => {
  const topic = c.req.param('topic');
  const content = EDUCATIONAL_LIBRARY[topic];
  
  if (!content) {
    return c.json({ 
      success: false, 
      error: { code: 'NOT_FOUND', message: 'Tópico não encontrado' },
      requestId: crypto.randomUUID()
    }, 404);
  }
  
  return c.json({ 
    success: true, 
    data: { content },
    requestId: crypto.randomUUID() 
  });
});

// POST /api/educational/tip - Obtém dica contextual
app.post('/educational/tip', async (c) => {
  const { context, data } = await c.req.json();
  const tip = getContextualTip(context, data);
  
  return c.json({ 
    success: true, 
    data: { tip },
    requestId: crypto.randomUUID() 
  });
});
```

### Passo 4: Atualizar Calculadoras (já feito)

As calculadoras já foram atualizadas para incluir:
- `validation` (quando `climate_zone` fornecida)
- `educational_context`
- `recommendations`

Apenas certifique-se de que os endpoints de calculadora retornam esses novos campos.

---

## 🎨 INTEGRAÇÃO NO FRONTEND

### Exemplo: Mostrar Validação

```typescript
// Ao calcular U-value
const result = await api('/calculations/u-value', {
  method: 'POST',
  body: JSON.stringify({
    ...inputs,
    climate_zone: project.climate_zone,
    absorptance: 0.7
  })
});

// Renderizar validação
if (result.validation) {
  const { severity, message, recommendation } = result.validation;
  
  // Mostrar badge colorido
  <div className={`badge ${severity}`}>
    {message}
  </div>
  
  // Mostrar recomendação
  {recommendation && (
    <div className="recommendation">
      💡 {recommendation}
    </div>
  )}
}

// Mostrar contexto educativo
{result.educational_context && (
  <div className="info-box">
    ℹ️ {result.educational_context}
  </div>
)}

// Mostrar recomendações
{result.recommendations?.map(rec => (
  <div key={rec} className="tip">{rec}</div>
))}
```

### Exemplo: Biblioteca Educativa

```typescript
// Componente de ajuda
function EducationalTooltip({ topic }: { topic: string }) {
  const [content, setContent] = useState(null);
  
  useEffect(() => {
    api(`/educational/${topic}`)
      .then(res => setContent(res.data.content));
  }, [topic]);
  
  if (!content) return null;
  
  return (
    <div className="tooltip">
      <h4>{content.title}</h4>
      <p>{content.summary}</p>
      <button onClick={() => showModal(content)}>
        Saiba mais
      </button>
    </div>
  );
}

// Uso
<EducationalTooltip topic="u-value" />
```

### Exemplo: Sugestões de Próximas Ações

```typescript
// No dashboard do projeto
const suggestions = await api('/educational/suggestions', {
  method: 'POST',
  body: JSON.stringify({
    stage: project.stage_current,
    completedRatio: 0.6,
    hasClimateZone: !!project.climate_zone,
    hasEnvelopeData: project.facades?.length > 0,
    hasCalculations: calculations.length > 0
  })
});

// Renderizar
<div className="next-actions">
  <h3>Próximas Ações Sugeridas:</h3>
  {suggestions.data.suggestions.map(s => (
    <div key={s} className="suggestion">{s}</div>
  ))}
</div>
```

---

## ✅ CHECKLIST DE INTEGRAÇÃO

- [ ] Adicionar imports dos novos módulos no `index.ts`
- [ ] Criar endpoints de clima (`/climate/*`)
- [ ] Criar endpoints educativos (`/educational/*`)
- [ ] Atualizar endpoints de calculadoras para aceitar `climate_zone`
- [ ] Atualizar frontend para mostrar validações
- [ ] Adicionar tooltips educativos na UI
- [ ] Implementar "Próximas Ações" no dashboard
- [ ] Testar validações com dados reais
- [ ] Documentar novos endpoints na API

---

## 🧪 TESTES SUGERIDOS

```typescript
// Testar validação de U-value
const result = await calcUValue({
  layers: [
    { name: 'Reboco', thickness_m: 0.02, conductivity_W_mK: 1.15 },
    { name: 'Tijolo', thickness_m: 0.15, conductivity_W_mK: 0.90 },
    { name: 'Reboco', thickness_m: 0.02, conductivity_W_mK: 1.15 }
  ],
  climate_zone: 'ZB3',
  absorptance: 0.7,
  orientation: 'vertical'
});

console.log(result.U_W_m2K); // ~2.8
console.log(result.validation); // { isValid: false, severity: 'error', ... }
console.log(result.recommendations); // ["⚠️ U-value alto...", "🎨 Cor escura..."]
```

---

## 📝 NOTAS FINAIS

- Todos os módulos são **backwards compatible**
- Campos novos são **opcionais** (validação só ocorre se `climate_zone` fornecida)
- Frontend pode adotar gradualmente (sem quebrar)
- Recomenda-se integrar climate → validation → educational nesta ordem

---

**Tempo estimado de integração:** 1-2 dias de desenvolvimento
