# 📘 Production Tracker — Documento Maestro v6.1
**Proyecto completo, actualizado y listo para continuar en conversación nueva sin pérdida de contexto**

---

> ⚠️ Documento consolidado a partir del Documento Maestro original + todo el trabajo realizado hasta hoy (importadores, exportadores, alertas y módulo QC).  
> Este documento es la **fuente de verdad** del proyecto.

---

# 1. Objetivo del sistema

El **Production Tracker** es una plataforma interna para gestionar **pedidos (POs)**, **producción**, **muestras**, **calidad (QC)**, **alertas automatizadas**, **importación / exportación de datos** y **seguimiento por fábricas**, sustituyendo completamente los Excels operativos entre España y China.

Objetivos clave:

- Centralizar información operativa (POs, líneas, muestras, QC)
- Eliminar dependencias manuales de Excel
- Garantizar trazabilidad completa
- Automatizar fechas, estados y alertas
- Soportar trabajo distribuido (España ↔ China)

---

# 2. Arquitectura Tecnológica

## 2.1 Frontend

- **Next.js 14 (App Router)**
- React Server Components + Client Components
- TailwindCSS
- ShadCN UI
- ExcelJS (lectura / escritura de Excel)

## 2.2 Backend

- API Routes con Next.js (`/app/api/*`)
- Lógica server-side (Node)

## 2.3 Base de Datos

- **Supabase (PostgreSQL)**
- Relaciones estrictas
- UUIDs
- Preparado para RLS / multiusuario

## 2.4 Almacenamiento de archivos

- **Cloudflare R2**
- Usado para:
  - Imágenes QC (Style Views y defectos)
  - Archivos futuros (reportes, adjuntos)

---

# 3. Estructura del Proyecto

```
src/
 ├─ app/
 │   ├─ produccion/
 │   │   ├─ dashboard/
 │   │   ├─ alertas/
 │   │   ├─ import/
 │   │   └─ po/[id]/        ← pendiente
 │   ├─ qc/
 │   │   └─ upload/         ← UI subida QC
 │   ├─ api/
 │   │   ├─ import-china/
 │   │   ├─ export-china/
 │   │   ├─ qc/
 │   │   │   └─ upload/
 │   │   └─ generar-alertas/
 │   └─ page.tsx
 │
 ├─ components/
 │   ├─ dashboard/
 │   ├─ alertas/
 │   └─ qc/
 │       └─ ImageUploader.tsx (futuro)
 │
 ├─ lib/
 │   ├─ extractExcelImages.ts
 │   └─ r2.ts
 │
 ├─ services/
 │   └─ pos.ts
 │
 └─ types/
     └─ index.ts
```

---

# 4. Modelo de Base de Datos

## 4.1 pos

Pedido principal.

```
id (uuid)
po
customer
supplier
factory
season
inspection
booking
closing
shipping_date
created_at
updated_at
```

---

## 4.2 lineas_pedido

```
id
po_id → pos.id
reference
style
color
qty
sco
trial_upper
trial_lasting
lasting
finish_date
created_at
updated_at
```

---

## 4.3 muestras

```
id
linea_pedido_id
tipo_muestra (CFM, Counter, Fitting, PPS, Testing, Shipping)
fecha_muestra
created_at
updated_at
```

> ⚠️ Las muestras solo se crean desde el importador CSV España.

---

# 5. Importador CSV España (Fase 3)

Estado: **COMPLETADO Y ESTABLE**

### Flujo UI

1. Upload
2. Validate
3. Preview
4. Confirm

### Funciones

- Agrupa por PO
- Crea / actualiza líneas
- Normaliza fechas y números EU
- Crea automáticamente las 6 muestras base
- Validación estricta

---

# 6. Importador China

Estado: **COMPLETO**

- Lee Excel China
- Identifica líneas por SCO
- Actualiza fechas de producción y muestras
- No crea datos nuevos
- Devuelve reporte detallado

---

# 7. Exportador China

Estado: **COMPLETO (v2 estable)**

- Selección por season
- Funciona con una o múltiples seasons
- Columnas específicas para China
- Excel bloqueado

---

# 8. Sistema de Alertas

Estado: **OPERATIVO**

- Retrasos
- Fechas vencidas
- Muestras pendientes

Ejecutado desde:

```
/api/generar-alertas
```

---

# 9. Dashboard Producción

Estado: **Refactorizado**

Componentes:

- DashboardHeader
- DashboardCards
- FiltersBox
- POsTable
- ExportChina
- ImportChina

---

# 10. MÓDULO QC (CALIDAD)

## 10.1 Objetivo
Importar (desde un **Excel de inspección**) y gestionar inspecciones de calidad por **línea/PO** con:
- **Trazabilidad por `report_number`** (anti-duplicados / reimport seguro).
- Metadatos completos (no solo PO): tipo de inspección, factory, customer, season, inspector, fecha, AQL, etc.
- Defectos D1..D10 asociados a la inspección.
- Imágenes:
  - **PPS / Style Views** (las primeras fotos del reporte) → se guardan como URLs en `qc_pps_photos` (almacenamiento real en **Cloudflare R2**).
  - **Fotos manuales de defectos** (subidas por el usuario) → `qc_defect_photos` (también con URLs en R2).

> Nota importante: un mismo `po_number` puede tener **múltiples inspecciones** (Trial Upper / Trial Lasting / Lasting / etc.), por eso el identificador único real es `report_number`.

---

## 10.2 Endpoints y UI actuales

### UI
- **Página:** `/qc/upload`
  - Subida del Excel y muestra el JSON de respuesta.

### API
- **Ruta correcta (actual):** `POST /api/qc/upload`
  - Lee Excel (ExcelJS), extrae cabecera + AQL + defectos, hace upsert en `qc_inspections` por `report_number`.
  - Extrae imágenes con `extractExcelImages(workbook)` (por ahora se usa para detectar/extraer buffers y su sheetName).
- **Ruta antigua (deprecada):** `POST /api/qc/import`
  - Se usaba antes; generó confusión. La UI estaba apuntando a `/api/qc/upload`, no a `/api/qc/import`.

---

## 10.3 Plantilla Excel QC (celdas clave confirmadas)

Hoja: **`Inspection Report`**

### Cabecera
- `B1` → `report_number`
- `B2` → `inspection_type` (ej. T7-FPI / Trial Upper / etc.)
- `B3` → `factory`
- `B4` → `customer`
- `B5` → `season`
- `B6` → `inspection_date` (fecha)
- `B9` → `po_number`
- `B10` → `reference`
- `B11` → `style`
- `B12` → `color`
- `B13` → `inspector`

### Bloque AQL
(la primera celda combinada está en B28/B29 con C, por eso hay que leer bien B/C según el campo)
- `B28` → `qty_po`
- `B29` → `qty_inspected`
- Allowed:
  - `B30` → `critical_allowed`
  - `B31` → `major_allowed`
  - `B32` → `minor_allowed`
- Found:
  - `C30` → `critical_found`
  - `C31` → `major_found`
  - `C32` → `minor_found`
- `B33` → `aql_result` (Conform / Not Conform)
- `D28` (o similar en bloque central) → `aql_level` (ej. LEVEL II)

### Tabla defectos (D1..D10)
Filas `16..25`:
- `A{row}` → defect_id (D1..D10)
- `B{row}` → defect_type
- `C{row}` → defects_found / defect_quantity
- `D{row}` → defect_category
- `E{row}` → defect_description

### Hoja imágenes PPS / Style Views
- Hoja: **`Style Views`** (ojo: el nombre exacto importa)
- Aquí van las primeras fotos “bonitas” del reporte.

---

## 10.4 Tablas QC en Supabase

### `qc_inspections` (cabecera de inspección)
Campos confirmados (los que ya existen):
- `id` (uuid, PK)
- `po_id` (uuid, FK → `pos.id`)
- `po_number` (text)
- `reference` (text)
- `style` (text)
- `color` (text)
- `inspector` (text)
- `qty_po` (int)
- `qty_inspected` (int)
- `aql_level` (text)
- `aql_result` (text)
- `critical_allowed` / `major_allowed` / `minor_allowed` (int)
- `critical_found` / `major_found` / `minor_found` (int)
- `inspection_date` (date)
- `report_number` (text, **NOT NULL**, **UNIQUE**)
- `inspection_type` (text)
- `factory` (text)
- `customer` (text)
- `season` (text)
- `created_at` (timestamptz)

**Regla anti-duplicados:**
- `report_number` es el identificador único real.
- Importar el mismo Excel dos veces debe hacer **upsert** (no crear duplicados).

### `qc_defects` (defectos asociados a una inspección)
⚠️ Importante: aquí NO podemos inventar nombres; hay que usar el schema real.
Estructura objetivo (la que se venía usando y que debemos alinear con el SQL):
- `id` (uuid, PK)
- `inspection_id` (uuid, FK → `qc_inspections.id`)
- `defect_id` (text)  // D1..D10
- `defect_type` (text)
- `defect_quantity` (int)  // o `defects_found` según SQL definitivo
- `defect_category` (text)
- `defect_description` (text)
- `created_at` (timestamptz)

> Estado: ahora mismo estamos chocando con errores tipo **“could not find column defect_code”** → señal de que el código no coincide con el schema real de `qc_defects`. Hay que ajustar la inserción a los nombres exactos.

### `qc_defect_photos` (fotos manuales por defecto)
- Se usa para fotos que el usuario sube manualmente para un defecto concreto.
- Debe guardar **URL** (Cloudflare R2), no el binario.

### `qc_pps_photos` (fotos PPS / Style Views)
Tabla confirmada (SQL actual):
- `id` (uuid, PK)
- `po_id` (uuid, FK → `pos.id`)
- `reference` (text)
- `style` (text)
- `color` (text)
- `photo_url` (text, NOT NULL)
- `photo_name` (text)
- `photo_order` (int)
- `created_at` (timestamptz)

> Nota: esta tabla **no** tiene `inspection_id` en el SQL actual. Para evitar ambigüedades en el futuro, probablemente añadiremos `report_number` o `inspection_id` (pero no es obligatorio para el primer MVP).

---

## 10.5 Cloudflare R2 (regla de oro)
- El Supabase Storage no se usará para QC (límite 50MB).
- El flujo correcto:
  1) Extraer imagen (buffer) del Excel (ExcelJS).
  2) Subir a R2.
  3) Guardar la **URL pública** en `qc_pps_photos` o `qc_defect_photos`.

---

## 10.6 Estado del módulo QC
✅ Ya funciona:
- Se ha resuelto el bloqueo grande: **la UI llamaba a `/api/qc/upload`**, no a `/api/qc/import`.
- Se insertan correctamente los datos de `qc_inspections` con `report_number` y metadatos.

🚧 Pendiente (lo siguiente a hacer):
1) **Ajustar el insert de `qc_defects`** a los nombres reales del schema (para que no falle y se rellene).
2) **Limpiar/reimport seguro**:
   - Si reimportas el mismo `report_number`, borrar defectos + fotos asociados antes de reinsertar.
3) **PPS/Style Views**:
   - Detectar solo imágenes de la hoja `Style Views` (y no las de defectos).
   - Subir a R2 y rellenar `qc_pps_photos` con `po_id + reference + style + color + url`.
4) Más adelante: import de imágenes por defecto (hojas `D1...D10`) y asignación a `qc_defects` (si decidimos que esas no son “manuales”).




# 11. Estado Actual del Proyecto

| Módulo | Estado |
|------|------|
| Importador CSV España | ✔ Completo |
| Importador China | ✔ Completo |
| Exportador China | ✔ Completo |
| Alertas | ✔ Completo |
| Dashboard | ✔ Refactorizado |
| QC Inspections | ✔ Datos |
| QC Images Style Views | ✔ Automático |
| QC Images Defectos | 🔜 Subida manual |
| Vista Detalle PO | ❌ Pendiente |
| Fechas Teóricas v2 | ❌ Pendiente |
| Multiusuario | ❌ Pendiente |

---

# 12. Próximo Paso RECOMENDADO

### 🎯 Implementar UI QC Defect Image Upload

- Vista detalle QC
- Grid + modal ampliable
- Upload directo a R2
- Asociación por defecto

---

# 13. FIN

**Documento Maestro v6.1**  
Este documento permite continuar el proyecto en una conversación nueva **sin pérdida de contexto ni decisiones técnicas**.

