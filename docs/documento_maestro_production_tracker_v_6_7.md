Production Tracker — Documento Maestro v6.7

Versión consolidada tras:

Cierre completo del módulo QC

Activación operativa BSG (compra / venta)

UI Producción funcional con BSG

✅ Sincronización Master (Modelos / Variantes / Precios) desde POs existentes

✅ Snapshot histórico de precios por línea

✅ UI Modelos con buscador, filtros y paginación

✅ Pricing, Márgenes y base analítica definidos

Este documento es la fuente de verdad del proyecto a partir de este commit.

1. Objetivo del sistema

Production Tracker es una plataforma interna para gestionar de forma integral:

Pedidos (POs)

Líneas de pedido

Producción y muestras

Calidad (QC)

Pricing y márgenes

Alertas automatizadas

Importación / exportación

Reporting y análisis

Sustituye completamente los Excels operativos entre España ↔ China, garantizando:

Trazabilidad histórica

Control de cambios

Auditoría

Escalabilidad analítica

2. Arquitectura Tecnológica
2.1 Frontend

Next.js 14 (App Router)

React Server / Client Components

TailwindCSS

ShadCN UI

ExcelJS (QC import)

2.2 Backend

API Routes (/app/api/*)

Runtime: Node.js

2.3 Base de Datos

Supabase (PostgreSQL)

UUIDs

Relaciones estrictas

Preparado para RLS / multiusuario

2.4 Almacenamiento

Cloudflare R2 (S3 compatible)

Usado para:

Imágenes QC

PDFs QC

Imágenes de Modelos / Variantes

3. Estructura del Proyecto (estado actual)
src/
├─ app/
│ ├─ produccion/
│ │ ├─ dashboard/        ← Listado principal de POs (BSG activo)
│ │ ├─ alertas/
│ │ ├─ import/
│ │ └─ po/[id]/editar/   ← Edición PO (manual + autofill)
│ ├─ qc/
│ │ ├─ page.tsx
│ │ └─ inspections/[id]/report/
│ ├─ desarrollo/
│ │ └─ modelos/
│ │   ├─ page.tsx        ← Listado con filtros + paginación
│ │   ├─ nuevo/
│ │   └─ [id]/
│ ├─ api/
│ │ ├─ import-csv/
│ │ ├─ import-china/
│ │ ├─ export-china/
│ │ ├─ qc/
│ │ ├─ generar-alertas/
│ │ ├─ modelos/
│ │ └─ modelos-filters/
│ └─ page.tsx
│
├─ components/
│ ├─ dashboard/
│ ├─ qc/
│ └─ ui/
│
├─ lib/
│ ├─ groupRowsByPO.ts
│ ├─ csv-utils.ts
│ ├─ r2.ts
│ └─ extractExcelImages.ts
│
├─ services/
│ ├─ import-csv.ts
│ ├─ compare-with-supabase.ts
│ └─ pos.ts
│
└─ types/
4. Modelo de Datos (visión funcional)
4.1 pos

Cabecera del pedido.

4.2 lineas_pedido

Campos operativos:

style

reference

color

qty

price

amount

Campos BSG:

pi_bsg

price_selling

amount_selling

Enlace Master

modelo_id

variante_id

Snapshot histórico de precios (clave del sistema)

master_buy_price_used

master_sell_price_used

master_currency_used

master_valid_from_used

master_price_id_used

master_price_source (autofill | manual | import)

📌 El snapshot es inmutable salvo edición consciente.

5. Master de Modelos (Módulo Desarrollo)
5.1 Modelos

Identificados por style

Imagen principal (kind=main)

Datos comerciales base

5.2 Variantes

Identificadas por (modelo_id, season, color)

Factory puede variar por season

Imágenes viven en la variante

5.3 Precios (modelo_precios)

Buy / Sell

Por variante

Históricos por valid_from

Moneda: USD

Constraint clave:

unique (variante_id, valid_from)

➡️ Para corregir precio el mismo día: PATCH, no INSERT.

6. Pricing y Márgenes (definitivo)
6.1 Operativas coexistentes
Xiamen DIC — Comisión pura

price = venta

amount = total venta

margen_xiamen = amount * 0.10

No existe coste real en sistema.

BSG — Compra / Venta

price = buy_price

amount = buy_amount

price_selling

amount_selling

Margen base:

amount_selling - amount

Comisión opcional:

amount * 0.10

Margen total:

(amount_selling - amount) + comisión

⚠️ La comisión debe poder activarse/desactivarse por reglas futuras.

7. Flujo Master → Pedido (autofill)

Usuario selecciona:

Modelo

Variante (season + color)

Sistema:

Resuelve factory

Busca precio vigente (valid_from <= today)

Propone buy / sell según operativa

Usuario:

Acepta o modifica

Sistema:

Guarda snapshot en lineas_pedido

Marca master_price_source

📌 Cambios futuros en master NO afectan a pedidos existentes.

8. Importadores
8.1 Importador CSV España

Estado: ✅ estable

Agrupa por PO (groupRowsByPO.ts)

Crea:

POs

Líneas

Muestras

Importa BSG fields correctamente

8.2 Importador China

Estado: ✅ estable

Solo actualiza fechas

8.3 Exportador China

Estado: ✅ v2 estable

Multi-season

Excel bloqueado

9. QC (v1 definitivo)

Subida imágenes R2

Reportes PDF

Inspecciones y defectos

KPIs

📌 Módulo cerrado funcionalmente.

10. Dashboard Producción

Estado: ✅ operativo (BSG incluido)

Listado POs

Totales

Preview PO

BSG fields visibles

Cálculos correctos

11. Calculadora de Precios y Márgenes (siguiente bloque)

La calculadora será:

Herramienta operativa

Simulador

Generador opcional de nuevos precios master

Funciones:

Partir de buy_price

Aplicar:

margen deseado

comisión

redondeos

Generar:

selling_price sugerido

margen esperado

Resultados:

Guardar en master o

Usar solo como simulación

⚠️ Nunca recalcula histórico.

12. Sistema de Cubos (visión analítica)

Gracias al snapshot, el sistema soporta analítica real.

Dimensiones

Supplier

Customer

Factory

Season

Modelo / Variante

Operativa

Fechas

Métricas

Ventas

Compras

Márgenes

Comisión

Demoras

Incidencias

📌 Los cubos no recalculan, solo leen hechos históricos.

13. Estado Global
Módulo	Estado
Importadores	✔
QC	✔
Master Modelos	✔
Snapshot precios	✔
UI Modelos	✔
Producción BSG	✔
Pricing definido	✔
Base analítica	✔
14. Punto de corte

Documento Maestro v6.7
✔ Proyecto estable
✔ Listo para commit
✔ Base sólida para calculadora y reporting