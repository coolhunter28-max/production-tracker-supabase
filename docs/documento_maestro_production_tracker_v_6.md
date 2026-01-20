# 📘 Production Tracker — Documento Maestro v6.3

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
> Pendiente: **pintarlos en la UI**.

### muestras

- CFMS
- COUNTERS
- FITTINGS
- PPS
- TESTINGS
- SHIPPINGS

Creación automática desde importador España.

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
- Import Excel
- Defectos estructurados
- Imágenes
- Reporte PDF

### 10.2 Estado

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

---

## 12. Próximo Bloque de Trabajo (nueva conversación)

🎯 **FOCO SIGUIENTE:** Operativa BSG en POs

1️⃣ Pintar campos BSG en dashboard
- pi_bsg
- price_selling
- amount_selling

2️⃣ Diferenciar operativa:
- Intermediario vs Desarrollo

3️⃣ Vista Detalle PO (`/produccion/po/[id]`)

---

## 13. FIN

Documento Maestro **v6.3**

👉 Punto de corte estable tras:
- QC cerrado
- Importación BSG activa
- Pendiente solo UI y vistas PO

