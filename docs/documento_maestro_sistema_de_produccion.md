# 📘 Production Tracker — Documento Maestro v6.0
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

Gestionar **inspecciones de calidad** provenientes de Excel QC, incluyendo:

- Datos de inspección
- Defectos
- Imágenes

---

## 10.2 Tablas QC

### qc_inspections

```
id
po_id
po_number
reference
style
color
inspector
qty_po
qty_inspected
aql_level
aql_result
critical_allowed
major_allowed
minor_allowed
critical_found
major_found
minor_found
created_at
```

### qc_defects

```
id
inspection_id
defect_id
defect_type
defect_quantity
defect_category
defect_description
created_at
```

### qc_defect_photos

```
id
inspection_id
defect_id
image_url
created_at
```

---

## 10.3 Importación QC (Excel)

Ruta:

```
/api/qc/upload
```

✔ Inserta inspección
✔ Inserta defectos
✔ Valida PO existente

---

## 10.4 Imágenes QC — Estado REAL

### Lo que FUNCIONA

- ExcelJS **sí extrae** imágenes embebidas
- Se detectan correctamente imágenes de **Style Views**

### Lo que NO funciona (limitación técnica)

- Las imágenes de defectos **NO se pueden detectar de forma fiable**
- Aunque estén copiadas/pegadas visualmente
- Excel las guarda como `background / drawing / vml`
- ExcelJS no las expone

👉 **No es un error del código**
👉 **No es corregible solo tocando el route**
👉 Es una limitación estructural de ExcelJS

---

## 10.5 Decisión Técnica TOMADA

### ❌ NO intentar capturar imágenes de defectos desde Excel

### ✅ NUEVA ESTRATEGIA

1. Importar Excel QC **sin imágenes de defectos**
2. Guardar:
   - inspección
   - defectos
   - Style Views (automático)
3. En la UI del sistema:
   - Mostrar D1, D2, D3...
   - Permitir **subida manual de imágenes desde local**
   - Asignarlas al defecto
4. Subir imágenes a **Cloudflare R2**
5. Guardar URL en `qc_defect_photos`

👉 Flujo más robusto, controlado y mantenible

---

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

**Documento Maestro v6.0**  
Este documento permite continuar el proyecto en una conversación nueva **sin pérdida de contexto ni decisiones técnicas**.

