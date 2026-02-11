# 📘 Production Tracker — Documento Maestro v6.6

> **Versión consolidada tras:**
> - Cierre del Módulo QC (import + PDF report)
> - Activación operativa BSG (pi_bsg, price_selling, amount_selling)
> - ✅ Sincronización Master (Modelos/Variantes/Precios) desde POs existentes
> - ✅ Enlace `lineas_pedido` ↔ Master + snapshot de precios usados
> - ✅ UI Modelos con buscador + filtros desplegables + paginación
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

src/
├─ app/
│ ├─ produccion/
│ │ ├─ dashboard/ ← 📌 LISTADO PRINCIPAL DE POs
│ │ ├─ alertas/
│ │ ├─ import/
│ │ └─ po/[id]/ ← ⏳ Vista detalle PO (pendiente)
│ ├─ qc/
│ │ ├─ page.tsx ← Listado QC + KPIs
│ │ └─ inspections/
│ │ └─ [id]/
│ │ └─ report/ ← PDF QC
│ ├─ desarrollo/
│ │ └─ modelos/
│ │ ├─ page.tsx ← ✅ Listado modelos (buscador + filtros + paginación)
│ │ ├─ nuevo/
│ │ └─ [id]/
│ ├─ api/
│ │ ├─ import-csv/ ← 📌 Importador España (POs)
│ │ ├─ import-china/
│ │ ├─ export-china/
│ │ ├─ qc/
│ │ │ ├─ upload/
│ │ │ └─ inspections/
│ │ ├─ generar-alertas/
│ │ ├─ modelos/ ← ✅ GET con filtros+count+pag; POST crea modelo+1ª variante
│ │ └─ modelos-filters/ ← ✅ dropdowns supplier/customer/factory
│ └─ page.tsx
│
├─ components/
│ ├─ dashboard/ ← Tabla y filtros POs
│ ├─ alertas/
│ └─ qc/
│
├─ lib/
│ ├─ csv-utils.ts
│ ├─ groupRowsByPO.ts ← 📌 CONSTRUYE groupedPOs
│ ├─ extractExcelImages.ts
│ └─ r2.ts
│
├─ services/
│ ├─ import-csv.ts
│ ├─ compare-with-supabase.ts
│ └─ pos.ts
│
└─ types/
└─ index.ts


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

✅ **Nuevo: enlace con Master**
- `modelo_id uuid`  → referencia a `modelos.id`
- `variante_id uuid` → referencia a `modelo_variantes.id`

✅ **Nuevo: snapshot de precios usados por línea** (histórico inmutable)
- `master_buy_price_used numeric`
- `master_sell_price_used numeric`
- `master_currency_used text`
- `master_valid_from_used date`
- `master_price_id_used uuid` → referencia a `modelo_precios.id`
- `master_price_source text` (ej: `autofill`)

> Snapshot aplicado automáticamente a líneas existentes:
> - total_lineas = 651
> - con_snapshot = 503
> - sin_snapshot = 148
>
> Las líneas sin snapshot suelen ser: líneas sin precio master disponible (o sin match completo).

### muestras

- CFMS
- COUNTERS
- FITTINGS
- PPS
- TESTINGS
- SHIPPINGS

Creación automática desde importador España.

---

## 4A. Módulo Desarrollo — Modelos, Variantes, Composición, Precios e Imágenes

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
- Las imágenes “de producto” viven en la variante y quedan ligadas a `variante_id`.

**Composición**
- Cada registro es un “componente” de la variante: `kind` + `slot`.
- Único por `(variante_id, kind, slot)` para evitar duplicados.

**Precios**
- Regla de integridad actual: **1 precio por variante y día** (unique: `variante_id + valid_from`).
- Si necesitas corregir el precio el mismo día: **editar** (PATCH) el registro del día (no insertar otro).

✅ **Aclaración operativa actual (muy importante): moneda**
- Toda la operativa de precios es en **USD**
- `modelo_precios.currency` tiene default = **USD**
- El volcado masivo desde POs usa USD

✅ **Aclaración técnica importante sobre unicidad en `modelo_precios`**
- Existe constraint/unique relevante: `(variante_id, valid_from)`
- Esto implica que el conflicto se gestiona por `(variante_id, valid_from)` (no por season)

---

## 4B. Sincronización Master desde POs existentes (NUEVO)

Durante fase de desarrollo es habitual cargar datos masivos (CSV/Excel) antes de estar 100% operativos en el sistema.
Por eso se ha implementado un flujo seguro para:

1) Crear modelos faltantes desde `lineas_pedido.style`
2) Crear/actualizar variantes desde `lineas_pedido` + `pos.season` + `lineas_pedido.color`
3) Vincular `lineas_pedido` con `modelo_id` y `variante_id`
4) Volcar precios al master desde `lineas_pedido.price` (+ opcional sell)
5) Guardar snapshot de precio usado en cada línea (`lineas_pedido.master_*`)

### 4B.1 Resultado tras la última sincronización
- Modelos creados desde POs: ✅
- Variantes creadas/actualizadas (latest po_date por color/season): ✅
- Status de modelos: ✅ (modelos provenientes de POs se han marcado como `activo`)
- Precios master importados en USD: ✅
- Snapshot de precio aplicado en líneas: ✅ (503 con snapshot; 148 pendientes)

---

## 4C. UI Modelos mejorada (NUEVO)

El listado de modelos era demasiado largo y poco usable.
Se ha actualizado la pantalla **/desarrollo/modelos** para incluir:

- Buscador: `style` y `reference`
- Filtros desplegables:
  - `supplier`
  - `customer`
  - `factory`
- Status desplegable (enum):
  - desarrollo | activo | en_fabricacion | cancelado
- Paginación:
  - `limit/offset` con `count` (para rendimiento)

### Endpoints implicados

- `GET /api/modelos`
  - Soporta filtros + paginación
  - Devuelve: `{ data, count, limit, offset }`

- `GET /api/modelos-filters`
  - Devuelve listas únicas:
  - `{ suppliers, customers, factories }`

---

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

📌 **`groupRowsByPO.ts`** es el archivo que:
- Lee columnas CSV
- Construye `header` + `lines`
- Debe mapear **pi_bsg / price_selling / amount_selling**

👉 Si un campo llega `null`, el origen SIEMPRE está aquí.

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

Pendiente aquí:
- Mostrar columnas:
  - pi_bsg
  - price_selling
  - amount_selling
- Lógica condicional:
  - Supplier = Xiamen → intermediario
  - Supplier = BSG → desarrollo completo

---

## 10. MÓDULO QC — ESTADO DEFINITIVO v1

(Se mantiene como en v6.5)

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
| ✅ Sync Master desde POs + snapshot | ✔ |
| ✅ UI Modelos filtros/paginación | ✔ |

---

## 12. Próximo Bloque de Trabajo

### 12.1 Conectar Producción (lineas_pedido) con Master (autofill)
Objetivo:
- Añadir/usar `modelo_id` y `variante_id` en `lineas_pedido`
- En UI de líneas:
  - seleccionar modelo
  - resolver variante por season/color
  - autofill de precio vigente master
  - guardar snapshot en `lineas_pedido.master_*`
- Gestionar excepciones:
  - listado de líneas sin snapshot (148)

---

Documento Maestro **v6.6** (punto de corte estable).