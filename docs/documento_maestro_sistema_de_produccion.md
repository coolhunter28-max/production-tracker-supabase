📘 Production Tracker — Documento Maestro v6.2

Versión consolidada tras cierre del Módulo QC – Importación
Este documento es la fuente de verdad del proyecto a partir de este commit.

1. Objetivo del sistema

El Production Tracker es una plataforma interna para gestionar:

Pedidos (POs)

Producción y muestras

Calidad (QC)

Alertas automatizadas

Importación / exportación de datos

Seguimiento por fábricas

Sustituye completamente los Excels operativos entre España ↔ China, manteniendo trazabilidad y control.

2. Arquitectura Tecnológica
2.1 Frontend

Next.js 14 (App Router)

React Server / Client Components

TailwindCSS

ShadCN UI

ExcelJS (lectura Excel)

2.2 Backend

API Routes (/app/api/*)

Node.js (runtime nodejs)

2.3 Base de Datos

Supabase (PostgreSQL)

UUIDs

Relaciones estrictas

Preparado para RLS / multiusuario

2.4 Almacenamiento de archivos

Cloudflare R2

Usado para:

Imágenes QC (PPS y defectos)

Archivos futuros

3. Estructura del Proyecto
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
 │   │   │   └─ upload/     ← API QC
 │   │   └─ generar-alertas/
 │   └─ page.tsx
 │
 ├─ components/
 │   ├─ dashboard/
 │   ├─ alertas/
 │   └─ qc/
 │       └─ (pendiente UI defect photos)
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

4. Modelo de Base de Datos (resumen)
pos

Pedido principal.

lineas_pedido

Líneas por referencia / color.

muestras

CFM, Counter, Fitting, PPS, Testing, Shipping
(solo creadas desde importador España)

5. Importador CSV España

Estado: COMPLETADO Y ESTABLE

Flujo 4 pasos (Upload → Validate → Preview → Confirm)

Normalización EU

Creación automática de muestras

Base del sistema

6. Importador China

Estado: COMPLETO

Actualiza fechas

No crea datos nuevos

Identificación por SCO

Flujo seguro ida/vuelta

7. Exportador China

Estado: COMPLETO (v2)

Selección por season

Funciona con 1 o múltiples seasons

Excel bloqueado

Usado operativamente

8. Sistema de Alertas

Estado: OPERATIVO

Retrasos

Fechas vencidas

Muestras pendientes

Ruta:

/api/generar-alertas

9. Dashboard Producción

Estado: Refactorizado

DashboardHeader

Cards

Filters

Tabla POs

Import / Export China

10. MÓDULO QC (CALIDAD) — ESTADO DEFINITIVO v1
10.1 Objetivo

Gestionar inspecciones de calidad desde Excel con:

Trazabilidad por report_number

Metadatos completos

Defectos estructurados (D1–D10)

Imágenes PPS automáticas

Imágenes de defectos manuales

10.2 Flujo definitivo QC
1️⃣ Importación automática desde Excel

Endpoint

POST /api/qc/upload


Se importan:

🔹 Inspección

Tabla: qc_inspections

Clave única: report_number

Upsert seguro

🔹 Defectos

Tabla: qc_defects

Defectos D1–D10

Reimport seguro (delete + insert)

🔹 PPS / Style Views

Hoja Excel: Style Views

Imágenes detectadas con extractExcelImages

Subidas a Cloudflare R2

URLs guardadas en qc_pps_photos

2️⃣ Fotos de defectos (MANUAL)

📌 Decisión técnica definitiva

Las fotos de defectos NO se importan desde Excel.

Motivo:

ExcelJS no detecta de forma fiable imágenes en hojas D1–D10

Probado con:

copiar/pegar

insertar desde dispositivo

imágenes nuevas

Resultado consistente: no detectable

👉 Decisión consciente:
Las fotos de defectos se suben manualmente desde la aplicación.

Tabla: qc_defect_photos

Relación directa con qc_defects.id

Almacenamiento: Cloudflare R2

Esto permite:

Control total

Reemplazo / borrado

Independencia del Excel

Uso directo por QC en China

10.3 Estructura de almacenamiento en R2
PPS
qc/pps/{po}/{reference}/{style}/{color}/pps_{n}.jpg

Defect photos (manual)
qc/defects/{po}/{reference}/{style}/{color}/{defect_id}/defect_{n}.jpg

10.4 Estado del módulo QC
Componente	Estado
QC Inspections	✅ Completo
QC Defects	✅ Completo
PPS automático (Excel)	✅ Completo
Defect photos desde Excel	❌ Descartado
Defect photos manual	⏳ Siguiente fase
Vista detalle QC	⏳ Pendiente
11. Estado Global del Proyecto
Módulo	Estado
Importador CSV España	✔
Importador China	✔
Exportador China	✔
Alertas	✔
Dashboard	✔
QC Import	✔
QC PPS	✔
QC Defect Photos Manual	🔜
Vista Detalle PO	❌
Fechas Teóricas v2	❌
Multiusuario	❌
12. Próximos Pasos (ROADMAP INMEDIATO)
1️⃣ UI subida manual de fotos de defectos

Vista QC

Listado D1–D10

Upload a R2

Guardar en qc_defect_photos

2️⃣ Vista Detalle QC

PPS arriba

Defectos + fotos debajo

Preparado para QC China

13. FIN

Documento Maestro v6.2
Punto de corte estable tras cierre del Módulo QC – Importación.