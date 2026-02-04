# 📘 Production Tracker — Documento Maestro v6.5

> **Versión consolidada tras:**
> - Cierre del Módulo QC (import + PDF report)
> - Activación operativa BSG (pi_bsg, price_selling, amount_selling)
>
> **Este documento es la fuente de verdad del proyecto a partir de este commit.**

---

## 1. Objetivo del sistema

El **Production Tracker** es una plataforma interna para gestionar de forma integral:

- Pedidos (POs)
- Líneas de pedido
- Producción y muestras
- Calidad (QC)
- Alertas automatizadas
- Importación / exportación de datos
- Seguimiento por fábricas y suppliers

Sustituye completamente los Excels operativos entre **España ↔ China**, manteniendo:

- Trazabilidad
- Control de cambios
- Históricos
- Seguridad de datos

---

## 2. Arquitectura Tecnológica

### 2.1 Frontend

- **Next.js 14** (App Router)
- React Server / Client Components
- TailwindCSS
- ShadCN UI
- ExcelJS (lectura de Excel QC)

### 2.2 Backend

- API Routes (`/app/api/*`)
- Runtime: Node.js

### 2.3 Base de Datos

- Supabase (PostgreSQL)
- UUIDs
- Relaciones estrictas
- Preparado para RLS / multiusuario

### 2.4 Almacenamiento de archivos

- **Cloudflare R2**

Usado para:
- Imágenes QC (PPS y defectos)
- PDFs de reportes QC
- Archivos futuros

---

## 3. Estructura del Proyecto (actual)

```
src/
 ├─ app/
 │   ├─ produccion/
 │   │   ├─ dashboard/        ← 📌 LISTADO PRINCIPAL DE POs
 │   │   ├─ alertas/
 │   │   ├─ import/
 │   │   └─ po/[id]/          ← ⏳ Vista detalle PO (pendiente)
 │   ├─ qc/
 │   │   ├─ page.tsx          ← Listado QC + KPIs
 │   │   └─ inspections/
 │   │       └─ [id]/
 │   │           └─ report/   ← PDF QC
 │   ├─ api/
 │   │   ├─ import-csv/       ← 📌 Importador España (POs)
 │   │   ├─ import-china/
 │   │   ├─ export-china/
 │   │   ├─ qc/
 │   │   │   ├─ upload/
 │   │   │   └─ inspections/
 │   │   └─ generar-alertas/
 │   └─ page.tsx
 │
 ├─ components/
 │   ├─ dashboard/           ← Tabla y filtros POs
 │   ├─ alertas/
 │   └─ qc/
 │
 ├─ lib/
 │   ├─ csv-utils.ts
 │   ├─ groupRowsByPO.ts     ← 📌 CONSTRUYE groupedPOs
 │   ├─ extractExcelImages.ts
 │   └─ r2.ts
 │
 ├─ services/
 │   ├─ import-csv.ts
 │   ├─ compare-with-supabase.ts
 │   └─ pos.ts
 │
 └─ types/
     └─ index.ts
```

---

## 4. Modelo de Base de Datos (resumen)

### pos
Cabecera del pedido.

### lineas_pedido

Campos clave:
- reference
- style
- color
- qty
- price (coste)
- amount

**Campos BSG (operativa desarrollo):**
- `pi_bsg`
- `price_selling`
- `amount_selling`

> Estos campos **ya se importan correctamente desde CSV** y están en Supabase.
> ✅ **Ya pintados en la UI** (listados y detalle PO / líneas), se usan para cálculos comerciales.

### muestras

- CFMS
- COUNTERS
- FITTINGS
- PPS
- TESTINGS
- SHIPPINGS

Creación automática desde importador España.

---

## 4A. Módulo Desarrollo — Modelos, Variantes, Composición, Precios e Imágenes (NUEVO)

Este bloque añade un módulo “catálogo” para gestionar **Modelos** y sus **Variantes** (por Season + Color), y dentro de cada variante:
- **Composición** (materiales por `kind` + `slot`)
- **Precios** (histórico por fecha de validez)
- **Imágenes** (fotos ligadas a `variante_id`, no “random”)

### 4A.1 Reglas de negocio

**Modelos**
- Un modelo tiene **1 imagen principal** (kind=`main`).
- La “galería” ya **no vive en el modelo** (para evitar imágenes sin contexto).

**Variantes**
- Un modelo puede tener N variantes.
- Una variante se identifica por `(modelo_id, season, color)` (único).
- Las imágenes “de producto” (vistas del zapato/piso/color) viven en la variante y quedan ligadas a `variante_id`.

**Composición**
- Cada registro es un “componente” de la variante: `kind` + `slot`.
- Único por `(variante_id, kind, slot)` para evitar duplicados.

**Precios**
- Una variante puede tener **distintos precios por temporada** (campo `season`) y también histórico de cambios por fecha (`valid_from`).
- Regla actual de integridad: **1 precio por variante y día** (unique: `variante_id + valid_from`).
- Si necesitas **corregir un precio el mismo día**, no insertas otro: **EDITAS el registro del día** (PATCH).  
  Esto cubre el caso “me equivoqué” / “actualización de fábrica” sin romper el histórico.

> Nota: Si algún día quieres permitir “varios cambios el mismo día”, entonces habría que cambiar la regla (ej: añadir `valid_from_ts` con timestamp, o permitir múltiples filas y tomar la última por `updated_at`). De momento, la opción segura y simple es “1 por día + edición”.

### 4A.2 Tablas nuevas (resumen)

#### `modelo_variantes`
- Relación: `modelo_variantes.modelo_id -> modelos.id` (CASCADE)
- Campos clave: `season`, `color`, `factory`, `status`, `notes`

#### `modelo_componentes`
- Relación: `modelo_componentes.variante_id -> modelo_variantes.id` (CASCADE)
- Campos clave: `kind` (upper/lining/...), `slot` (1..), `material_text`, `percentage`, `extra`
- Unique: `(variante_id, kind, slot)` cuando `variante_id is not null` (variante)
- Base (futuro): soporte de composición “base” a nivel de modelo (`variante_id is null`)

#### `modelo_precios`
- Relación: `modelo_precios.variante_id -> modelo_variantes.id` (CASCADE)
- Campos clave: `season`, `currency`, `buy_price`, `sell_price`, `valid_from`, `notes`
- Unique: `(variante_id, valid_from)` cuando `variante_id is not null`
- Trigger: `updated_at` automático en update

#### `variante_imagenes` (nuevo)
- Relación: `variante_imagenes.variante_id -> modelo_variantes.id` (CASCADE)
- Campos típicos: `public_url`, `file_key`, `kind` (por ahora `gallery`), `size_bytes`, `created_at`

> Importante: Las rutas de subida guardan la imagen en R2 (o el storage configurado) y registran metadata en la tabla.

### 4A.3 API Routes implementadas

**Modelos**
- `POST /api/modelos`  
  Crea modelo **y crea la primera variante obligatoria** (para que siempre exista un “contenedor” donde colgar composición/precios/imagenes).
- `GET /api/modelos/:id`
- `PATCH /api/modelos/:id`
- `GET /api/modelos/:id/variantes`
- `POST /api/modelos/:id/variantes`

**Variantes**
- `GET /api/variantes/:varianteId`
- `PATCH /api/variantes/:varianteId`
- `DELETE /api/variantes/:varianteId`

**Composición (por variante)**
- `GET /api/variantes/:varianteId/componentes`
- `POST /api/variantes/:varianteId/componentes`
- `PATCH /api/variantes/:varianteId/componentes/:compId`
- `DELETE /api/variantes/:varianteId/componentes/:compId`

**Precios (por variante)**
- `GET /api/variantes/:varianteId/precios`
- `POST /api/variantes/:varianteId/precios`
- `PATCH /api/variantes/:varianteId/precios/:precioId`
- `DELETE /api/variantes/:varianteId/precios/:precioId`

**Imágenes (por variante)**
- `GET /api/variantes/:varianteId/imagenes`
- `POST /api/variantes/:varianteId/imagenes/upload`
- `DELETE /api/variantes/:varianteId/imagenes/:imageId`

### 4A.4 UI Pages implementadas

- `src/app/desarrollo/modelos/nuevo/page.tsx`
  - Form de creación de modelo.
  - Al crear, el backend crea también **la primera variante obligatoria**.

- `src/app/desarrollo/modelos/[id]/page.tsx`
  - Ficha de modelo: info + **imagen principal** + listado de variantes con CRUD inline.
  - Nota: ya no hay galería de modelo.

- `src/app/desarrollo/modelos/[id]/editar/page.tsx`
  - Editor de campos del modelo.

- `src/app/desarrollo/variantes/[varianteId]/page.tsx`
  - Ficha de variante con tabs:
    - **Composición** (CRUD)
    - **Precios** (CRUD + edición del registro del día)
    - **Imágenes** (galería ligada a variante)

### 4A.5 Commits recientes (resumen)

- `feat: modelo variantes + componentes y precios por variante`
- `feat: crear modelo con primera variante obligatoria`
- (y rutas de imágenes por variante)


## 5. Importador CSV España (POs)

**Estado:** ✅ COMPLETADO Y ESTABLE

### Flujo
1. Upload CSV
2. Validate
3. Preview
4. Confirm

### Lógica clave

- Normalización EU
- Agrupación por PO → `groupRowsByPO.ts`
- Regeneración completa (opción B)
- Creación automática de muestras

### Punto crítico identificado

📌 **`groupRowsByPO.ts`** es el archivo que:
- Lee columnas CSV
- Construye `header` + `lines`
- Debe mapear **pi_bsg / price_selling / amount_selling**

👉 Si un campo llega `null`, **el origen SIEMPRE está aquí**.

---

## 6. Importador China

**Estado:** ✅ COMPLETO

- Actualiza fechas
- No crea datos nuevos
- Flujo seguro ida/vuelta

---

## 7. Exportador China

**Estado:** ✅ COMPLETO (v2)

- Selección por season
- Funciona con una o múltiples seasons
- Excel bloqueado

---

## 8. Sistema de Alertas

**Estado:** ✅ OPERATIVO

Genera alertas por:
- Retrasos
- Fechas vencidas
- Muestras pendientes

Ruta:
`/api/generar-alertas`

---

## 9. Dashboard Producción (POs)

**Estado:** ⚠️ FUNCIONAL, PENDIENTE BSG

📌 **Este es el módulo que pinta los pedidos (POs):**

- Página: `src/app/produccion/dashboard/page.tsx`
- Componentes: `src/components/dashboard/*`

### Pendiente aquí

- Mostrar columnas:
  - pi_bsg
  - price_selling
  - amount_selling

- Lógica condicional:
  - Supplier = Xiamen → intermediario
  - Supplier = BSG → desarrollo completo

---

## 10. MÓDULO QC — ESTADO DEFINITIVO v1

### 10.1 Objetivo

Gestión integral de inspecciones QC:
- Importación desde Excel (plantilla “Inspection Report”)
- Defectos estructurados + contadores AQL
- Fotos (Styleviews / PPS / defectos)
- Dashboards y KPIs
- Generación de reporte PDF

### 10.2 Almacenamiento de fotos (Cloudflare R2)

Las imágenes de QC **se suben a Cloudflare R2** (no se guardan como BLOB en Supabase). Flujo:
1) UI → endpoint API (Next.js) → subida a R2  
2) Se guarda en Supabase **solo** el `file_key` y el `public_url` (o URL firmada si lo decidimos más adelante)
3) Las tablas QC relacionan cada foto con su inspección/defecto/pps, para que nunca queden “random”

Piezas clave en código:
- `src/lib/r2.ts` (cliente R2 + helpers)
- Endpoints de subida QC (los que ya teníamos en el módulo QC; usan el mismo patrón que ahora hemos reutilizado en imágenes de variantes)
- Tablas típicas: `qc_pps_photos`, `qc_defect_photos` (y las relacionadas con inspecciones/defectos)

Convención recomendada de keys (ejemplo):
- `qc/{po}/{report_number}/pps/{timestamp}_{name}.jpg`
- `qc/{po}/{report_number}/defects/{defect_id}/{timestamp}_{name}.jpg`

### 10.3 Estado (resumen)

| Componente | Estado |
|-----------|-------|
| QC Import Excel | ✅ |
| PPS automático | ✅ |
| Defectos | ✅ |
| Fotos defectos manual | ✅ |
| KPIs + filtros | ✅ |
| Reporte PDF QC | ✅ |

---

## 11. Estado Global del Proyecto

| Módulo | Estado |
|------|------|
| Importador CSV España | ✔ |
| Importador China | ✔ |
| Exportador China | ✔ |
| Alertas | ✔ |
| Dashboard POs | ⚠️ |
| QC completo | ✔ |
| Desarrollo modelos/variantes | ✔ |

---

## 12. Próximo Bloque de Trabajo (nueva conversación)

### 12.1 Foco inmediato (producción / BSG)
1) Pintar campos BSG en dashboard POs
- `pi_bsg`
- `price_selling`
- `amount_selling`

2) Diferenciar operativa:
- Intermediario vs Desarrollo

3) Vista Detalle PO (`/produccion/po/[id]`)

### 12.2 Mejoras recomendadas (catálogo / desarrollo)
4) Catálogos de materiales (opcional pero muy útil)
- En composición, permitir seleccionar `catalogo_id` desde UI (dropdown + search), manteniendo `material_text` como fallback.
- Validaciones de `percentage` (ej: sumar 100% por kind si queréis).

5) Imágenes de variante (calidad de vida)
- Permitir ordenar imágenes (campo `position`), y/o marcar una como “principal” dentro de variante (si queréis).
- (Opcional) soportar `kind` adicional (ej: `upper`, `outsole`, `packaging`) para clasificar fotos.

6) Precios (reglas y UX)
- En el formulario “Añadir”, si `valid_from` está vacío, avisar claramente de que será “hoy” y puede chocar con el unique.
- Botón rápido: “Editar precio de hoy” si existe.

7) Enlazar Modelo/Variante con Producción (cuando toque)
- Decidir si `lineas_pedido` enlaza a `modelo_variantes` (ideal) o solo a `modelos`/texto.
- Esto habilita que POs “hereden” composición/precios e imágenes.

## 13. Estado actual y siguientes pasos

### 13.1 Qué está hecho (estable)

**Desarrollo — Modelos / Variantes**
- ✅ CRUD de modelos
- ✅ Al crear un modelo se crea **automáticamente** una primera variante (obligatoria)
- ✅ CRUD de variantes dentro del modelo (crear, editar inline, eliminar)
- ✅ Ficha de variante con tabs:
  - Composición (componentes por variante: kind + slot + material_text + % + extra)
  - Precios (histórico por `valid_from`)
  - Imágenes (galería **ligada a variante_id**)
- ✅ Imágenes:
  - Modelo: **solo** 1 imagen principal (main)
  - Variante: galería (una o varias)

**Importación BSG**
- ✅ Importador CSV/Excel BSG funcionando
- ✅ **Campos BSG pintados en la UI** (listados y detalle PO / líneas)

**QC**
- ✅ Módulo QC operativo con subida de fotos a **Cloudflare R2** y referencias en Supabase (ver sección 10)

### 13.2 Reglas de negocio confirmadas

**Precios por variante**
- Una variante puede tener **distintos precios por temporada** (`season`) y por fecha de vigencia (`valid_from`).
- Regla operativa que estamos aplicando:
  - **1 registro por variante y día** (`variante_id + valid_from`)
  - Si necesitas “cambiar el precio hoy”, **no insertas otro**: editas el registro de hoy (PATCH).
- Si en el futuro quieres auditar “cambios intra‑día”, entonces sí: añadiríamos un historial (tabla `modelo_precios_history` o un campo `revision`), pero **no lo necesitamos ahora**.

**Composición por variante**
- La composición vive en la variante porque:
  - Un mismo modelo puede cambiar materiales por color/temporada/fábrica
  - Por eso `modelo_componentes` soporta `variante_id` + `kind` + `slot`

### 13.3 Lo siguiente importante

#### A) Cálculo de precios y márgenes (pendiente)
Objetivo: usar `buy_price`, `sell_price`, `packaging_price` (del modelo) y cualquier coste adicional para mostrar:
- Margen absoluto y % por variante/temporada
- Alertas de margen mínimo
- Resumen por modelo y por PO (cuando conectemos con pedidos)

Propuesta técnica:
- Crear una **view** en Supabase (o funciones SQL) que devuelva:
  - `margin = sell_price - buy_price - packaging_price`
  - `margin_pct = margin / sell_price`
- Pintarlo en:
  - Ficha de variante (tab Precios)
  - Listado de variantes (columna margen actual)
  - (Más adelante) líneas de pedido / dashboards

#### B) Sistema de “cubos” (pendiente)
Objetivo: análisis tipo pivot/BI dentro del tracker:
- Dimensiones: season, customer, supplier, factory, status, modelo, variante…
- Métricas: #POs, #pares, defect rate, buy total, sell total, margin total…

Propuesta de implementación (v1 simple):
1) Definir un esquema de “cubo” (JSON config) con:
   - dimensiones disponibles
   - métricas disponibles
   - filtros por defecto
2) Backend:
   - views SQL para datasets base (POs, QC, precios/variantes…)
   - endpoint genérico que construya agregaciones (GROUP BY) seguras
3) UI:
   - selector de dimensiones (filas/columnas)
   - selector de métricas
   - export a Excel

#### C) Repaso arquitectura (rápido, sin tocar)
- Revisar RLS / Service Role: ahora mismo APIs usan `SUPABASE_SERVICE_ROLE_KEY` (OK para MVP, pero habrá que acotar cuando pase a producción).
- Revisar índices (ya hemos puesto uniques importantes en precios/componentes/imágenes).
- Revisar naming y rutas (mantener consistencia `/api/modelos/...` vs `/api/variantes/...`).

---

Documento Maestro **v6.5** (punto de corte estable).

