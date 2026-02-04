# DB Schema - Master de Modelos

## Tablas
### modelos
- id (uuid)
- style, customer, supplier, status, etc.
- picture_url (imagen principal)
- ...

### modelo_variantes
- id
- modelo_id (FK modelos)
- season (text, required)
- color (text nullable)
- factory (text nullable)
- reference (nullable)
- notes, status
- unique: (modelo_id, season, color)

### modelo_componentes
- id
- modelo_id (FK)
- variante_id (FK nullable → si null = base)
- kind (upper/lining/insole/...)
- slot (int)
- material_text, percentage, extra, catalogo_id (nullable)
- uniques parciales:
  - base: (modelo_id, kind, slot) WHERE variante_id is null
  - variante: (variante_id, kind, slot) WHERE variante_id is not null

### modelo_precios
- id
- modelo_id (FK)
- variante_id (FK nullable, pero en nuestra operativa se usa variante)
- season (text)
- currency (text)
- buy_price (numeric)
- sell_price (numeric nullable)
- valid_from (date, default today)
- notes
- unique:
  - variante_id + valid_from (si variante_id no es null)
  - (modelo_id, season, valid_from) para base (si variante_id es null)

## Reglas operativas
- Precios:
  - POST crea un nuevo “snapshot”
  - PATCH corrige uno existente (incluido el de hoy)
- Componentes:
  - Composición puede ser base o específica de variante
