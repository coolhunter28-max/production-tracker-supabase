# Production Tracker — Documento Maestro v6.12

Versión consolidada tras:

- Cierre completo del módulo QC
- Activación operativa BSG (compra / venta)
- UI Producción funcional con BSG
- Sincronización Master (Modelos / Variantes / Precios) desde POs existentes
- Snapshot histórico de precios por línea
- UI Modelos con buscador, filtros y paginación
- Pricing, Márgenes y base analítica definidos
- Generación de Price List comercial (Excel / CSV / PDF)
- Capa analítica completa (Cubo Operativo, QC Analytics y Cubo Desarrollo)
- Business Intelligence Layer con Customer Business Matrix
- Analytics UI consolidado en Executive, Operaciones, Quality, Desarrollo y Clientes / Business Matrix

Este documento es la **fuente de verdad del proyecto** a partir de este commit.

---

## 1. Objetivo del sistema

Production Tracker es una plataforma interna para gestionar de forma integral:

- Pedidos (POs)
- Líneas de pedido
- Producción y muestras
- Calidad (QC)
- Pricing y márgenes
- Alertas automatizadas
- Importación / exportación
- Reporting y análisis

Sustituye completamente los Excels operativos entre España ↔ China, garantizando:

- Trazabilidad histórica
- Control de cambios
- Auditoría
- Escalabilidad analítica

---

## 2. Arquitectura Tecnológica

### 2.1 Frontend

- Next.js 14 (App Router)
- React Server / Client Components
- TailwindCSS
- ShadCN UI
- ExcelJS (QC import)

### 2.2 Backend

- API Routes (`/app/api/*`)
- Runtime: Node.js

### 2.3 Base de Datos

- Supabase (PostgreSQL)

Características:

- UUIDs
- Relaciones estrictas
- Preparado para RLS / multiusuario

### 2.4 Almacenamiento

- Cloudflare R2 (S3 compatible)

Usado para:

- Imágenes QC
- PDFs QC
- Imágenes de Modelos / Variantes

---

## 3. Estructura del Proyecto (estado actual)

```text
src/
├─ app/
│ ├─ produccion/
│ │ ├─ dashboard/
│ │ ├─ alertas/
│ │ ├─ import/
│ │ └─ po/[id]/editar/
│ │
│ ├─ qc/
│ │ ├─ page.tsx
│ │ └─ inspections/[id]/report/
│ │
│ ├─ desarrollo/
│ │ ├─ modelos/
│ │ │ ├─ page.tsx
│ │ │ ├─ nuevo/
│ │ │ └─ [id]/
│ │ │
│ │ └─ cotizaciones/
│ │   └─ oferta/
│ │     └─ page.tsx
│ │
│ ├─ analytics/
│ │ ├─ executive/
│ │ ├─ operaciones/
│ │ │ ├─ customers/
│ │ │ ├─ factories/
│ │ │ ├─ seasons/
│ │ │ └─ logistica/
│ │ ├─ quality/
│ │ │ ├─ customers/
│ │ │ ├─ factories/
│ │ │ └─ models/
│ │ └─ desarrollo/
│ │   ├─ page.tsx
│ │   ├─ customers/
│ │   └─ quotes/
│ │
│ ├─ api/
│ │ ├─ import-csv/
│ │ ├─ import-china/
│ │ ├─ export-china/
│ │ ├─ qc/
│ │ ├─ generar-alertas/
│ │ ├─ modelos/
│ │ ├─ modelos-filters/
│ │ └─ cotizaciones/
│ │   └─ oferta/
│ │     └─ pdf/
│ │
│ └─ page.tsx
│
├─ components/
│ ├─ analytics/
│ │ ├─ cards/
│ │ ├─ charts/
│ │ ├─ filters/
│ │ ├─ layout/
│ │ └─ tables/
│ ├─ dashboard/
│ ├─ qc/
│ └─ ui/
│
├─ lib/
│ ├─ analytics/
│ │ └─ desarrollo.ts
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
  └─ desarrollo.ts
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

Enlace Master:

modelo_id
variante_id

Snapshot histórico de precios (clave del sistema):

master_buy_price_used
master_sell_price_used
master_currency_used
master_valid_from_used
master_price_id_used
master_price_source (autofill | manual | import)

Regla crítica: el snapshot es inmutable salvo edición consciente.

5. Master de Modelos (Módulo Desarrollo)
5.1 Modelos

Identificados por:

style

Incluyen:

Imagen principal (kind=main)
Datos comerciales base
5.2 Variantes

Identificadas por:

(modelo_id, season, color)

Notas:

factory puede variar por season
Las imágenes viven en la variante
5.3 Precios (modelo_precios)

Campos:

buy_price
sell_price

Histórico por:

valid_from

Moneda:

USD

Constraint clave:

unique (variante_id, valid_from)

Para corregir un precio el mismo día se hace PATCH, no INSERT.

6. Pricing y Márgenes (definitivo)
6.1 Operativas coexistentes
Xiamen DIC — Comisión pura
price = venta
amount = total venta
margen_xiamen = amount * 0.10
No existe coste real en sistema
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

La comisión debe poder activarse/desactivarse por reglas futuras.

7. Flujo Master → Pedido (autofill)

Usuario selecciona:

Modelo
Variante (season + color)

Sistema:

Resuelve factory
Busca precio vigente con regla valid_from <= today
Propone buy / sell según operativa

Usuario:

Acepta o modifica

Sistema:

Guarda snapshot en lineas_pedido
Marca master_price_source

Regla crítica: cambios futuros en master no afectan a pedidos existentes.

8. Importadores
8.1 Importador CSV España

Estado: estable.

Funciones:

Agrupa por PO (groupRowsByPO.ts)
Crea POs
Crea líneas
Crea muestras
Importa correctamente campos BSG
8.2 Importador China

Estado: estable.

Solo actualiza:

Fechas
8.3 Exportador China

Estado: v2 estable.

Características:

Multi-season
Excel bloqueado
9. QC (v1 definitivo)

Funciones:

Subida imágenes a R2
Reportes PDF
Inspecciones
Defectos
KPIs

Módulo cerrado funcionalmente.

10. Dashboard Producción

Estado: operativo (BSG incluido).

Funciones:

Listado de POs
Totales
Preview PO
Campos BSG visibles
Cálculos correctos
10.1 Oferta Cliente (Price List)

Estado: operativo.

Objetivo:

Generar listas de precios comerciales a partir de cotizaciones existentes.

Ruta UI:

/desarrollo/cotizaciones/oferta
10.1.1 Selección de oferta

El usuario selecciona:

Customer
Season
Status (opcional)

El sistema:

Consulta cotizaciones
Obtiene todas las variantes
Selecciona automáticamente la última cotización por variante

Regla:

latest(created_at) per variante_id
10.1.2 Datos incluidos en la oferta

Modelo:

style
reference
size_range

Variante:

color
season

Precio:

sell_price
currency
10.1.3 Imágenes

Las imágenes se obtienen de modelo_imagenes.

Prioridad:

Imagen con variante_id
Imagen main del modelo

Campo utilizado:

public_url
10.1.4 Composición

Se obtiene mediante:

/api/modelo-componentes/bulk

Tipos soportados:

upper
lining
insole
outsole
shoelace
packaging
10.1.5 Exportaciones disponibles
Copiar para Excel (TSV compatible Excel ES)
CSV Excel (sep=;)
PDF Price List
10.1.6 PDF Price List

Endpoint:

POST /api/cotizaciones/oferta/pdf

Tecnología:

pdf-lib

Características:

A4 vertical
Logo BSG
Título: Price List
Cabecera con Customer / Season / Date / Incoterm / MOQ
Layout por modelo con foto, style, reference, composición y precio
Paginación Page X / Y
11. Calculadora de Precios y Márgenes

La calculadora será:

Herramienta operativa
Simulador
Generador opcional de nuevos precios master

Funciones:

Partir de buy_price
Aplicar margen deseado
Aplicar comisión
Aplicar redondeos
Generar selling_price sugerido
Calcular margen esperado

Resultados:

Guardar en master
o usar como simulación

Nunca recalcula histórico.

12. Sistema de Cubos (visión analítica)

Gracias al snapshot, el sistema soporta analítica real.

Dimensiones:

Supplier
Customer
Factory
Season
Modelo / Variante
Operativa
Fechas

Métricas:

Ventas
Compras
Márgenes
Comisión
Demoras
Incidencias

Los cubos no recalculan, solo leen hechos históricos.

13. Analytics Layer v1.0
13.1 Principios

La capa analítica se construye directamente sobre PostgreSQL / Supabase mediante:

Materialized views
Vistas analíticas
Business views ejecutivas

Objetivos:

Validar fórmulas antes de llevarlas a frontend
Reducir lógica compleja en la UI
Centralizar reglas de negocio
Facilitar rendimiento y mantenibilidad
13.2 Reglas de negocio congeladas
Margen combinado

La métrica combinada oficial para mezclar operativas es:

contribution_amount

Reglas:

En Xiamen DIC = comisión
En BSG = margen total
Retraso producción
finish_date - etd_pi
etd_pi = compromiso cliente
finish_date = fin real producción fábrica
Retraso booking / logístico
shipping_date - finish_date

Sirve para detectar clientes que presionan PI ETD pero retrasan el booking.

Negotiation Score
40% gap master → quote
30% gap quote → order
20% revisiones
10% tiempo a pedido
Customer Business Profile

Clasificaciones finales:

STRATEGIC
PROFITABLE
NEGOTIATOR
RISKY
LOW_VALUE
14. Cubo Operativo

Hecho principal:

mv_fact_operacion_linea

Dimensiones operativas incluidas:

Customer
Factory
Supplier
Modelo
Variante
Season
Operativa
Fechas

Métricas clave:

qty_total
sell_amount_real
buy_amount_real
margin_base_amount
commission_amount
margin_total_amount
contribution_amount
contribution_pct

Dimensiones auxiliares:

dim_fecha
dim_operativa
15. Timeline Operativo

Vista base temporal:

vw_fact_operacion_timeline

Añade:

booking_delay_days
booking_delay_flag
booking_on_time_flag
has_booking_delay_basis

Lectura temporal del negocio:

PO_DATE → FINISH_DATE → SHIPPING_DATE

Compromiso cliente:

ETD_PI
16. Vistas analíticas operativas
16.1 Rentabilidad
vw_margin_by_customer
vw_margin_by_factory
vw_margin_by_modelo
vw_operativa_xiamen_vs_bsg
16.2 Retrasos
vw_delay_by_factory
vw_delay_by_customer
16.3 Rankings operativos
vw_factory_risk_score
vw_customer_profitability_profile
vw_model_operational_profile
16.4 Executive rankings
vw_exec_summary
vw_exec_customer_ranking
vw_exec_factory_ranking
vw_exec_model_ranking
17. Capa temporal y estacional

Vistas temporales implementadas:

vw_exec_summary_by_season
vw_exec_summary_by_po_month
vw_exec_summary_by_finish_month
vw_exec_summary_by_etd_pi_month
vw_exec_summary_by_shipping_month
vw_customer_timeline_pressure

Objetivo:

Permitir análisis por:

Season
Fecha pedido
Fecha compromiso cliente
Fecha fin producción
Fecha shipping
18. Rankings logísticos y seasonal performance
18.1 Presión logística por cliente

Vista:

vw_exec_customer_logistics_pressure_ranking

Detecta clientes que:

presionan PI ETD
pero retrasan bookings
generan fricción entre finish_date y shipping_date
18.2 Performance por season

Vista:

vw_exec_season_performance_ranking

Analiza por season:

rentabilidad
retrasos producción
retrasos booking
riesgo logístico
19. QC Analytics v1
19.1 Base QC
vw_qc_inspection_summary
vw_qc_defect_summary
19.2 Puente QC + Operación

Vista central:

vw_qc_operacion_bridge

Relaciona inspecciones con:

PO
Customer
Factory
Season
Modelo
Rentabilidad
Retrasos
19.3 Vistas QC de negocio
vw_qc_by_factory
vw_qc_by_customer
vw_qc_by_model
vw_qc_risk_ranking
vw_factory_quality_vs_delay

Permite detectar:

fábricas que llegan tarde y además fallan calidad
modelos con defectos estructurales
clientes con más exposición a incidencias QC
20. Executive KPI Dashboard

Vista principal:

vw_exec_kpi_dashboard

Incluye en una sola fila:

ventas totales
coste total
margen total
% margen
mix operativas Xiamen / BSG
retraso producción
retraso booking
QC fail rate
defect rate
coverage de inspecciones
operational risk score
operational risk level

Es el panel principal de dirección.

21. Cubo Desarrollo (Price Intelligence)

Base principal:

vw_dev_quote_fact

Fuentes:

cotizaciones
modelos
modelo_variantes
modelo_precios
mv_fact_operacion_linea

Dimensiones disponibles:

Customer (vía modelos.customer)
Season (vía modelo_variantes.season)
Style
Color
Factory
Status
Fecha de cotización

Métricas:

quote_buy_price
quote_sell_price
quote_margin_pct
quote_margin_amount
gap_vs_master_buy
gap_vs_master_sell
gap_vs_master_sell_pct
revision_no_inferred
revision_count_inferred
21.1 Vistas del Cubo Desarrollo
vw_dev_price_evolution
vw_dev_quote_vs_master
vw_dev_model_price_dispersion
vw_dev_quote_vs_order
vw_dev_conversion_by_customer
vw_dev_customer_price_pressure
vw_dev_pricing_instability_ranking
vw_dev_exec_summary
vw_dev_exec_customer_ranking
21.2 Negotiation Score

Vista:

vw_dev_customer_negotiation_score

Clasificación:

AGGRESSIVE
NORMAL
EASY

Sirve para detectar clientes que:

presionan pricing vs master
comprimen quote → order
necesitan más revisiones
cierran rápido tras negociar fuerte
22. Customer Business Matrix

Vista de inteligencia de negocio más alta del sistema:

vw_customer_business_matrix

Cruza:

Cubo Operativo
Cubo Desarrollo
QC Analytics
Logística

Perfil generado por cliente:

STRATEGIC
PROFITABLE
NEGOTIATOR
RISKY
LOW_VALUE

Scores incluidos:

customer_business_score
customer_friction_score

Uso principal:

priorización comercial
estrategia de crecimiento
detección de clientes rentables pero problemáticos
23. Arquitectura visual del sistema
23.1 Vista general
┌─────────────────────────────────────────────────────────────┐
│                 PRODUCTION TRACKER PLATFORM                │
└─────────────────────────────────────────────────────────────┘

          ┌───────────────────────────────────────┐
          │             DATA SOURCES              │
          └───────────────────────────────────────┘

   ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐
   │ pos          │  │ lineas_pedido  │  │ cotizaciones    │
   └──────────────┘  └────────────────┘  └─────────────────┘

   ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐
   │ modelos      │  │ modelo_variantes│ │ modelo_precios  │
   └──────────────┘  └────────────────┘  └─────────────────┘

   ┌──────────────┐  ┌────────────────┐
   │ qc_inspections│ │ qc_defects      │
   └──────────────┘  └────────────────┘

                         ↓

          ┌───────────────────────────────────────┐
          │               FACT LAYER              │
          └───────────────────────────────────────┘

        ┌───────────────────────────────┐
        │ mv_fact_operacion_linea       │
        └───────────────────────────────┘

        ┌───────────────────────────────┐
        │ vw_dev_quote_fact             │
        └───────────────────────────────┘

                         ↓

          ┌───────────────────────────────────────┐
          │            ANALYTICS LAYER            │
          └───────────────────────────────────────┘

   ┌─────────────────┐ ┌────────────────┐ ┌────────────────┐
   │ Cubo Operativo  │ │ QC Analytics   │ │ Cubo Desarrollo│
   └─────────────────┘ └────────────────┘ └────────────────┘

                         ↓

          ┌───────────────────────────────────────┐
          │      BUSINESS INTELLIGENCE LAYER      │
          └───────────────────────────────────────┘

   ┌──────────────────────┐  ┌──────────────────────┐
   │ Customer Matrix      │  │ Factory / Season     │
   │ Risk / Profitability │  │ Rankings             │
   └──────────────────────┘  └──────────────────────┘

                         ↓

          ┌───────────────────────────────────────┐
          │           EXECUTIVE LAYER             │
          └───────────────────────────────────────┘

            ┌─────────────────────────────────┐
            │ vw_exec_kpi_dashboard           │
            └─────────────────────────────────┘

                         ↓

          ┌───────────────────────────────────────┐
          │               APP UI                  │
          └───────────────────────────────────────┘

   ┌─────────────────┐ ┌────────────────┐ ┌────────────────┐
   │ Executive Dash  │ │ Production Dash│ │ Quality Dash   │
   └─────────────────┘ └────────────────┘ └────────────────┘

   ┌─────────────────┐
   │ Commercial Dash │
   └─────────────────┘
23.2 Lectura rápida para explicar el sistema

Production Tracker funciona en 5 capas:

Datos origen: pedidos, líneas, cotizaciones, modelos y QC
Hechos analíticos: Cubo Operativo y Cubo Desarrollo
Analítica especializada: producción, logística, calidad y pricing
Business Intelligence: rankings, matrices y scores
UI / Dashboards: explotación visual dentro de la app
24. Estado Global
Módulo	Estado
Importadores	✔
QC	✔
Master Modelos	✔
Snapshot precios	✔
UI Modelos	✔
Producción BSG	✔
Pricing definido	✔
Oferta Cliente (Price List)	✔
Cubo Operativo	✔
QC Analytics	✔
Cubo Desarrollo	✔
Executive KPIs	✔
Customer Business Matrix	✔
25. Punto de corte

Documento Maestro v6.10

Proyecto estable
Capa analítica v1 cerrada
Base sólida para calculadora, reporting, BI y dashboards dentro de la app
Analytics UI consolidado en Executive, Operaciones, Quality, Desarrollo y Clientes / Business Matrix
Base preparada para siguiente bloque: Business Matrix UI / Clientes
26. Analytics UI (v1 implementado)
26.1 Estado general

La capa de Analytics UI ha sido implementada directamente en la aplicación Next.js, conectando de forma directa con la capa analítica en Supabase.

Principios aplicados:

No duplicar lógica en frontend
No crear views adicionales sin necesidad
UI basada únicamente en vistas existentes
Filtros solo cuando están soportados por la view
Uso de search params como fuente de verdad (sin contexto global)
26.2 Arquitectura de rutas
/analytics
  /executive
  /operaciones
    /customers
    /factories
    /seasons
    /logistica
  /quality
    /customers
    /factories
    /models
  /desarrollo
    /customers
    /quotes
26.3 Convención de filtros (URL)

Filtros generales disponibles en Analytics UI:

season
customer
factory
operativa
modelo
style
status
dateType
dateFrom
dateTo
page
sort
view
quoteStatus

Reglas:

Los filtros viven en la URL (search params)
Cada pantalla decide qué filtros usa
No existe estado global compartido
No se fuerzan filtros no soportados por la view
26.4 Módulo Executive

Ruta:

/analytics/executive

Views utilizadas:

vw_exec_kpi_dashboard
vw_exec_customer_ranking
vw_exec_factory_ranking
vw_exec_season_performance_ranking

Filtros:

season
customer
factory
dateType
rango de fechas

Estado:

✔ Implementado
26.5 Módulo Operaciones

Ruta overview:

/analytics/operaciones

Estructura:

Customers (principal)
Factories
Seasons
Logistics

Drill-downs:

/analytics/operaciones/customers
/analytics/operaciones/factories
/analytics/operaciones/seasons
/analytics/operaciones/logistica

Views utilizadas:

vw_exec_customer_ranking
vw_exec_factory_ranking
vw_exec_season_performance_ranking
vw_exec_customer_logistics_pressure_ranking

Regla clave:

Cada pantalla usa únicamente filtros soportados por su view

Estado:

✔ Implementado
26.6 Módulo Quality

Ruta overview:

/analytics/quality

Bloques:

Customers
Factories
Styles

Drill-downs:

/analytics/quality/customers
/analytics/quality/factories
/analytics/quality/models

Views utilizadas:

vw_qc_by_customer
vw_qc_by_factory
vw_qc_by_model

Decisión crítica:

La dimensión modelo en QC se define como:

style

No se usa modelo para evitar inconsistencias con la base de datos.

Estado:

✔ Implementado
26.7 Componentes base reutilizados

Componentes disponibles en Analytics UI:

AnalyticsPageShell
AnalyticsSectionHeader
AnalyticsRankingTable
AnalyticsBarChart

Notas:

La implementación real de pantallas puede usar estos componentes o layouts simples cuando convenga estabilidad
El módulo Desarrollo se ha consolidado primero con versión simple y estable sobre tablas reales antes de volver a reforzar reutilización visual
26.8 Reglas UX consolidadas
❌ No filtros falsos
❌ No columnas inventadas
❌ No datasets duplicados
❌ No scatter charts sin contexto claro
✅ UI refleja el dato real
✅ Jerarquía clara (overview → drill-down)
✅ Navegación consistente entre módulos
✅ Lectura dual por pantalla (ranking + volumen)
✅ Persistencia de filtros entre subpantallas del mismo módulo cuando aporta continuidad
26.9 Estado del módulo Analytics UI
Módulo	Estado
Executive	✔
Operaciones	✔
Quality	✔
Desarrollo	✔
Clientes / Business Matrix UI	⏳ pendiente
26.10 Módulo Desarrollo

Ruta base:

/analytics/desarrollo

Subrutas implementadas:

/analytics/desarrollo
/analytics/desarrollo/customers
/analytics/desarrollo/quotes
Objetivo funcional

El módulo Desarrollo explota el Cubo Desarrollo para analizar:

pricing
negociación
conversión quote → order
detalle transaccional de cotizaciones

Se ha implementado siguiendo las mismas reglas del resto de Analytics UI:

uso exclusivo de views existentes
filtros gestionados por search params
sin duplicar lógica de negocio en frontend
navegación overview → drill-down
máximo control sobre columnas y métricas reales
26.11 Views utilizadas en Desarrollo

Overview:

vw_dev_exec_summary
vw_dev_exec_customer_ranking
vw_dev_conversion_by_customer

Customers:

vw_dev_customer_price_pressure
vw_dev_customer_negotiation_score

Quotes:

vw_dev_quote_vs_order
26.12 Pantalla Overview

Ruta:

/analytics/desarrollo

Bloques implementados:

KPI strip:
Quotes
Customers
Avg Margin %
Avg Gap vs Master %
Customer Negotiation & Conversion
Quote to Order Conversion

Filtros activos:

customer
season

Notas de implementación:

avg_quote_margin_pct se interpreta como ratio y se muestra como porcentaje visual
(0.22 → 22,00%)
avg_gap_vs_master_sell_pct se interpreta como porcentaje ya expresado
(28.54 → 28,54%)

Decisiones UX:

navegación interna hacia customers y quotes
filtros mediante desplegables (select)
persistencia de filtros al navegar entre subpantallas

Estado:

✔ Implementado
26.13 Pantalla Customers

Ruta:

/analytics/desarrollo/customers

Objetivo:

Analizar presión comercial y perfil negociador por cliente.

Bloques implementados:

tabla principal combinando:
gap vs master
margin %
revisiones
gap quote → order
pressure level
negotiation score
negotiation profile
avg days to order

Reglas aplicadas:

merge de presentación por customer + season
sin recalcular métricas de negocio
pressure_level y negotiation_profile renderizados como badges visuales

Filtros activos:

customer
season

Decisiones UX:

navegación completa con Overview y Quotes
badges visuales:
LOW_PRESSURE
MEDIUM_PRESSURE
HIGH_PRESSURE
AGGRESSIVE
NORMAL
EASY
persistencia de filtros entre tabs

Estado:

✔ Implementado
26.14 Pantalla Quotes

Ruta:

/analytics/desarrollo/quotes

Objetivo:

Drill-down transaccional de cotizaciones con lectura completa quote → order.

Bloques implementados:

filtros
KPI strip:
Quotes
Matched Orders
Avg Days to Order
tabla de detalle de quotes

Filtros activos:

customer
season
quoteStatus
dateFrom
dateTo
sort

Ordenaciones soportadas:

quote_date.desc
quote_date.asc
customer.asc
season.asc
quote_status.asc
days_quote_to_order.desc

Columnas priorizadas en la tabla:

Quote Date
Customer
Style
Color
Status
PO
Sell
Margin %
Gap %
Days
Season
Factory
Buy
Margin €
Revisions

Decisiones UX cerradas:

primeras columnas fijadas visualmente:
Quote Date
Customer
reducción de columnas secundarias para mejorar legibilidad
colores visuales en:
status
gap order vs quote
PO Number más visible para lectura rápida de conversión real
uso de scroll horizontal solo para columnas secundarias

Estado:

✔ Implementado
26.15 Reglas de navegación interna del módulo Desarrollo

El módulo mantiene navegación entre:

Overview
Customers
Quotes

Reglas:

los filtros comunes (customer, season) persisten entre pantallas
en Quotes persisten además, cuando existen:
quoteStatus
dateFrom
dateTo
sort
Clear limpia únicamente la pantalla actual
la navegación entre tabs no rompe el contexto del análisis
26.16 Estructura técnica incorporada

A nivel de aplicación, el módulo Desarrollo Analytics ha añadido o consolidado:

Rutas App Router:

src/app/analytics/desarrollo/page.tsx
src/app/analytics/desarrollo/customers/page.tsx
src/app/analytics/desarrollo/quotes/page.tsx

Helpers de lectura:

src/lib/analytics/desarrollo.ts

Tipos del dominio:

src/types/desarrollo.ts

El helper del módulo soporta:

parseo de search params
lectura de summary
ranking por cliente
conversión por cliente
pressure por cliente
negotiation score
detalle quote_vs_order
opciones de filtros (customer, season, quoteStatus)
26.17 Estado consolidado del módulo Desarrollo

Estado:

✔ Overview implementado
✔ Customers drill-down implementado
✔ Quotes drill-down implementado
✔ Filtros reales implementados
✔ Navegación interna completa
✔ Ordenación en Quotes implementada
✔ Pulido visual base en Quotes implementado

Conclusión:

El módulo Desarrollo Analytics queda funcionalmente cerrado en esta fase v1.

26.18 Próximo bloque recomendado

Siguiente desarrollo recomendado:

Analytics → Clientes / Business Matrix UI

Objetivo:

explotar vw_customer_business_matrix
construir lectura ejecutiva por cliente
unir:
rentabilidad
negociación
riesgo
fricción
perfil estratégico
27. Estado Global
Módulo	Estado
Importadores	✔
QC	✔
Master Modelos	✔
Snapshot precios	✔
UI Modelos	✔
Producción BSG	✔
Pricing definido	✔
Oferta Cliente (Price List)	✔
Cubo Operativo	✔
QC Analytics	✔
Cubo Desarrollo	✔
Executive KPIs	✔
Customer Business Matrix	✔
Analytics UI Executive	✔
Analytics UI Operaciones	✔
Analytics UI Quality	✔
Analytics UI Desarrollo	✔
Analytics UI Clientes / Business Matrix	✔
28. Punto de corte operativo

Documento Maestro v6.10

Punto de corte consolidado:

Proyecto estable
Analytics UI consolidado en 4 módulos
Desarrollo Analytics implementado con:
overview
customers
quotes
filtros y navegación interna operativos
base lista para siguiente bloque de inteligencia comercial

Siguiente conversación o siguiente bloque natural:

Construcción de Analytics → Clientes / Business Matrix UI
29. Actualización de versión

Nueva versión: v6.12

Motivo:

- Consolidación completa del módulo Analytics → Clientes / Business Matrix UI.
- Evolución desde `vw_customer_business_matrix` hacia un modelo contextual de negocio.
- Incorporación de reglas específicas para operativas Xiamen DIC y BSG.
- Creación de señales BI de salud comercial (`health_signal`) y prioridad (`health_priority`).
- Implementación del Customer Situation Board como vista ejecutiva principal.
- Implementación del detail por cliente con score contextual, drivers e interpretación ejecutiva.

30. Estado actual del sistema (actualizado)

Módulo	Estado
Executive	✔
Operaciones	✔
Quality	✔
Desarrollo	✔
Clientes / Business Matrix UI	✔ Implementado
Customer Situation Board	✔ Implementado
Customer Detail contextual	✔ Implementado

31. Nuevo módulo — Analytics → Clientes / Business Matrix UI

31.1 Objetivo funcional

El módulo Clientes / Business Matrix UI representa la capa de inteligencia comercial del sistema.

Su función es sintetizar información de:

- Cubo Operativo
- Cubo Desarrollo
- QC Analytics
- Logística
- Evolución de volumen Xiamen
- Health Signal BI

Objetivos funcionales:

- Priorizar clientes por situación real de negocio.
- Diferenciar correctamente clientes BSG y clientes Xiamen DIC.
- Evitar interpretar clientes Xiamen únicamente por margen o fricción.
- Detectar riesgo real en Xiamen mediante caída de volumen y facturación.
- Mantener BSG bajo la lectura estándar de margen, contribución y fricción.
- Convertir métricas BI en acciones visibles para negocio.

31.2 Cambio crítico de interpretación: Xiamen vs BSG

El sistema reconoce dos modelos de negocio distintos:

### Xiamen DIC — Comisión / intermediación

En Xiamen DIC, el valor principal del cliente se mide por:

- volumen de pares
- facturación total
- continuidad entre temporadas
- evolución de volumen
- caída o crecimiento respecto a temporada anterior

El margen unitario o el business score estándar pueden ser secundarios y no deben interpretarse como juicio final del cliente.

Una caída significativa de volumen, por ejemplo igual o superior al 30%, se considera una señal real de riesgo.

### BSG — Compra / venta

En BSG, el valor principal del cliente sigue vinculado a:

- margen de compraventa
- contribución
- rentabilidad
- presión comercial
- fricción operativa

Por tanto, BSG mantiene la lectura estándar de la Business Matrix.

31.3 Views BI principales del módulo Clientes

El módulo Clientes ya no se apoya únicamente en `vw_customer_business_matrix`.

La arquitectura consolidada usa estas views:

### `vw_customer_business_matrix`

View base histórica de inteligencia de cliente.

Incluye:

- customer
- customer_business_profile
- customer_business_score
- customer_friction_score

Sigue siendo útil como matriz base, pero no es la única fuente de verdad visual para Clientes.

### `vw_xiamen_customer_season_volume_evolution`

View analítica de evolución de volumen para clientes Xiamen.

Fuente base:

- `mv_fact_operacion_linea`

Filtro:

- `operativa_code = 'XIAMEN_DIC'`

Métricas:

- customer
- season
- previous_season
- qty_current
- qty_previous
- sell_current
- sell_previous
- po_count_current
- po_count_previous
- line_count_current
- line_count_previous
- qty_growth_pct
- sell_growth_pct
- po_count_growth_pct
- volume_signal

Señales disponibles:

- `NO_BASELINE`
- `VOLUME_DROP_RISK`
- `VOLUME_SOFT_DROP`
- `STABLE`
- `GROWING`
- `UNKNOWN`

Regla crítica:

- `VOLUME_DROP_RISK` se dispara cuando la caída de volumen es igual o superior al 30%.

### `vw_customer_health_signal`

View BI de salud del cliente.

Combina:

- Business Matrix
- Ranking operativo
- Evolución Xiamen

Campos clave:

- customer
- customer_business_profile
- customer_business_score
- customer_friction_score
- customer_size_band
- profitability_band
- contribution_pct
- xiamen_sales_mix_pct
- bsg_sales_mix_pct
- xiamen_latest_season
- xiamen_previous_season
- qty_growth_pct
- sell_growth_pct
- volume_signal
- health_signal
- health_reason
- xiamen_context_flag

Health signals:

- `CRITICAL`
- `WARNING`
- `MONITOR`
- `HEALTHY`
- `NEUTRAL`

Reglas principales:

- `VOLUME_DROP_RISK` → `CRITICAL`
- `VOLUME_SOFT_DROP` → `WARNING`
- `GROWING` → `HEALTHY`
- `STABLE` / `NO_BASELINE` → `MONITOR`
- Cliente RISKY con fricción alta fuera de Xiamen → `WARNING`
- Sin señal específica → `NEUTRAL`

### `vw_customer_business_contextual`

View BI contextual final para la UI de Clientes.

Objetivo:

- Crear un business score adaptado al modelo operativo.
- Mantener BSG con Business Matrix estándar.
- Recalibrar Xiamen por volumen/evolución.
- Añadir prioridad ejecutiva mediante `health_priority`.

Campos clave:

- customer
- raw_business_profile
- raw_business_score
- customer_friction_score
- health_signal
- health_reason
- volume_signal
- qty_growth_pct
- sell_growth_pct
- xiamen_context_flag
- customer_size_band
- profitability_band
- contribution_pct
- xiamen_sales_mix_pct
- bsg_sales_mix_pct
- contextual_business_profile
- contextual_business_score
- score_model
- health_priority

Perfiles contextuales Xiamen:

- `CRITICAL_XIAMEN`
- `WATCH_XIAMEN`
- `GROWING_XIAMEN`
- `NEW_OR_UNTRACKED_XIAMEN`
- `DEMANDING_XIAMEN`

Score model:

- `XIAMEN_VOLUME_BASED`
- `STANDARD_BUSINESS_MATRIX`

Reglas de score contextual Xiamen:

- `VOLUME_DROP_RISK` → `-100`
- `VOLUME_SOFT_DROP` → `-40`
- `NO_BASELINE` → `0`
- `STABLE` → `40`
- `GROWING` → `80`

Para clientes no Xiamen:

- `contextual_business_score = customer_business_score`
- `contextual_business_profile = customer_business_profile`

Health priority:

- `CRITICAL` → `1`
- `WARNING` → `2`
- `MONITOR` → `3`
- `HEALTHY` → `4`
- `NEUTRAL` → `5`
- Otros → `9`

32. Arquitectura del módulo Clientes

Rutas implementadas:

```text
/analytics/clientes
/analytics/clientes/[customer]
```

Archivos principales:

```text
src/types/clientes.ts
src/lib/analytics/clientes.ts
src/app/analytics/clientes/page.tsx
src/app/analytics/clientes/[customer]/page.tsx
```

32.1 Helper de datos

Archivo:

```text
src/lib/analytics/clientes.ts
```

Funciones principales:

- `parseClientesSearchParams`
- `getCustomerBusinessMatrix`
- `getCustomerBusinessDetail`
- `getCustomerBusinessContextualDetail`
- `getCustomerOperationalDetail`
- `getCustomerDevelopmentDetail`
- `getCustomerQualityDetail`
- `getCustomerXiamenVolumeEvolution`
- `getLatestXiamenVolumeSignals`
- `getCustomerHealthSignals`
- `getCustomerHealthSignal`
- `getCustomerDetailBundle`
- `getCustomerBusinessFilterOptions`
- `buildCustomerBusinessKPIs`

Reglas:

- La UI no recalcula Health.
- La UI no recalcula Business Score contextual.
- La UI consume `vw_customer_business_contextual` y `vw_customer_health_signal`.
- El frontend solo formatea, agrupa y representa.

32.2 Tipos

Archivo:

```text
src/types/clientes.ts
```

Incluye, entre otros:

- `CustomerBusinessProfile`
- `CustomerBusinessMatrixRow`
- `CustomerBusinessMatrixFilters`
- `CustomerBusinessKPISet`
- `CustomerOperationalDetail`
- `CustomerDevelopmentDetail`
- `CustomerQualityDetail`
- `CustomerXiamenVolumeEvolutionRow`
- `CustomerDetailBundle`
- `CustomerLatestXiamenVolumeSignal`

33. Overview — Customer Situation Board

Ruta:

```text
/analytics/clientes
```

33.1 Objetivo

Sustituir el ranking plano por una vista ejecutiva por situación.

El objetivo no es preguntar:

> ¿Quién tiene mejor score?

sino:

> ¿A quién tengo que mirar primero?

33.2 Fuente de datos

Fuente principal:

```text
vw_customer_business_contextual
```

Fuentes complementarias:

```text
vw_customer_health_signal
vw_xiamen_customer_season_volume_evolution
```

33.3 Orden de prioridad

El orden principal del board viene de BI:

```text
health_priority asc
contextual_business_score asc
```

Esto garantiza:

1. CRITICAL
2. WARNING
3. MONITOR
4. HEALTHY
5. NEUTRAL

33.4 Filtros activos

Filtros visibles:

- customer
- profile

Filtro eliminado:

- sort

Motivo:

El board ya tiene una jerarquía fija por prioridad BI. Mantener un selector de sort generaba ambigüedad y no aportaba claridad.

Reglas UX:

- filtros vía search params
- sin estado global
- no se fuerzan filtros no soportados
- los labels visibles pueden ser humanos, pero los valores técnicos se mantienen en URL

33.5 KPI strip

KPIs consolidados:

- Total
- Critical
- Warning
- Monitor
- Healthy
- Avg Business Score

Motivo:

Estos KPIs reflejan mejor la situación real de cartera que los antiguos:

- Strategic
- Profitable
- Risky

33.6 Board por Health

Bloques visuales:

- CRITICAL
- WARNING
- MONITOR
- HEALTHY
- NEUTRAL

Cada card de cliente muestra:

- customer
- contextual profile
- health signal
- contextual business score
- friction score
- volume signal cuando existe
- qty growth cuando existe
- sell growth cuando existe
- health reason
- call to action

CTAs por health:

- CRITICAL → Revisar caída de volumen
- WARNING → Validar riesgo operativo
- MONITOR → Seguir evolución
- HEALTHY → Potencial crecimiento
- NEUTRAL → Sin señal relevante

33.7 Decisiones UX descartadas

Se probó un bloque superior de Focus Mode para clientes CRITICAL.

Decisión:

- descartado

Motivo:

- duplicaba información, porque el board ya empieza por CRITICAL.
- generaba redundancia visual.
- el board por prioridad ya cumple esa función.

34. Detail por cliente

Ruta:

```text
/analytics/clientes/[customer]
```

34.1 Objetivo

Explicar la situación de un cliente concreto usando la misma lógica BI que el overview.

34.2 Fuente de datos

El detail combina:

- `vw_customer_business_contextual`
- `vw_customer_health_signal`
- `vw_exec_customer_ranking`
- `vw_dev_customer_negotiation_score`
- `vw_qc_by_customer`
- `vw_xiamen_customer_season_volume_evolution`

34.3 Bloques implementados

Cabecera:

- customer
- contextual profile

KPI strip:

- Business Score contextual
- Coordination Load / Friction Score
- Profile contextual
- Health

Bloques analíticos:

- Operaciones
- Desarrollo
- Quality
- Evolución volumen Xiamen
- Lectura ejecutiva

34.4 Diferencia semántica en Xiamen

Para clientes con:

```text
score_model = XIAMEN_VOLUME_BASED
```

La UI muestra:

- `Business Score` basado en evolución de volumen
- `Coordination Load` en vez de `Friction Score`
- Profile contextual Xiamen
- Health derivado de volumen

Ejemplo:

- `CRITICAL_XIAMEN`
- `contextual_business_score = -100`
- `health_signal = CRITICAL`

34.5 Drivers del estado

Para clientes críticos o con señal de volumen, el detail muestra:

- latest season
- previous season
- qty growth
- sell growth
- PO growth cuando está disponible
- health reason

Objetivo:

- explicar no solo el estado, sino la causa.

35. Reglas clave consolidadas del módulo Clientes

❌ No recalcular Health en frontend  
❌ No recalcular Business Score contextual en React  
❌ No modificar snapshots históricos  
❌ No interpretar Xiamen solo por margen  
❌ No duplicar datos entre pantallas  
❌ No mantener controles UX que generen confusión  

✅ La lógica de Health vive en SQL / BI Layer  
✅ La lógica de Business Score contextual vive en SQL / BI Layer  
✅ Xiamen se evalúa por volumen, facturación y evolución por temporada  
✅ BSG mantiene la matriz estándar de margen, contribución y fricción  
✅ La UI solo representa, agrupa y traduce a lectura ejecutiva  
✅ Los filtros viven en URL mediante search params  
✅ Los labels humanos no sustituyen los valores técnicos  
✅ El overview y el detail usan la misma fuente semántica  
✅ La prioridad visual viene de `health_priority`

36. Estado técnico consolidado

Nuevas views creadas:

- `vw_xiamen_customer_season_volume_evolution`
- `vw_customer_health_signal`
- `vw_customer_business_contextual`

Views existentes reutilizadas:

- `vw_customer_business_matrix`
- `vw_exec_customer_ranking`
- `vw_dev_customer_negotiation_score`
- `vw_qc_by_customer`
- `mv_fact_operacion_linea`

Rutas estabilizadas durante la fase:

- `/analytics/clientes`
- `/analytics/clientes/[customer]`
- `/analytics/executive`
- `/analytics/operaciones/customers`

Decisión técnica:

- Executive y Operaciones Customers se estabilizaron con implementaciones simples sobre datos reales cuando componentes reutilizables generaban errores de render de Server Components.
- Esta decisión es coherente con la regla de estabilidad: layout simple y fiable antes que abstracción visual inestable.

37. Estado Global actualizado

Módulo	Estado
Importadores	✔
QC	✔
Master Modelos	✔
Snapshot precios	✔
UI Modelos	✔
Producción BSG	✔
Pricing definido	✔
Oferta Cliente (Price List)	✔
Cubo Operativo	✔
QC Analytics	✔
Cubo Desarrollo	✔
Executive KPIs	✔
Customer Business Matrix	✔
Analytics UI Executive	✔ Estabilizado
Analytics UI Operaciones	✔ Estabilizado
Analytics UI Quality	✔
Analytics UI Desarrollo	✔
Analytics UI Clientes / Business Matrix	✔ Implementado
Customer Situation Board	✔ Implementado
Customer Detail contextual	✔ Implementado

38. Punto de corte actual

Documento Maestro v6.12

Punto de corte consolidado:

- Clientes / Business Matrix UI implementado.
- Customer Situation Board funcionando como vista principal.
- Detail por cliente funcionando con score contextual.
- Xiamen evaluado por volumen/evolución.
- BSG evaluado por Business Matrix estándar.
- Health Signal centralizado en BI Layer.
- Business Score contextual centralizado en BI Layer.
- Drivers inline visibles en cards.
- Reason ejecutiva visible en cards y detail.
- Sort eliminado del overview para evitar ambigüedad.
- Navegación hacia Executive, Operaciones y Desarrollo estabilizada.

38.1 Actualización incremental (post v6.12)

Estado consolidado tras el último bloque de trabajo en Analytics UI:

- Se integra `vw_customer_commercial_alerts` en Executive como bloque de priorización comercial.
- Executive muestra conteo por severidad (`CRITICAL`, `WARNING`, `MONITOR`) y accesos directos a detalle de cliente.
- Operaciones incorpora un bloque de foco (`Prioridad operativa`) para priorización diaria por presión logística y riesgo de fábrica.
- Operaciones añade franja de insights rápidos con navegación directa a submódulos.
- Se consolida navegación bidireccional en Operaciones con persistencia de filtros vía search params.
- Se añade botón explícito de `Volver atrás` en subpantallas de Operaciones.
- El módulo Clientes evita redundancia visual con el Situation Board y mantiene la lectura BI como fuente única.

Regla de arquitectura aplicada en este bloque:

- No se introduce lógica BI nueva en frontend.
- El frontend solo selecciona, ordena visualmente y navega sobre datos ya calculados en views SQL.
- Persistencia de contexto exclusivamente mediante URL/search params.

39. Mensaje para reiniciar conversación (MUY IMPORTANTE)

Este es el mensaje que debes usar para continuar sin pérdida de contexto:

MENSAJE:

Continuamos el Production Tracker — Analytics UI.

Contexto:

Documento Maestro v6.12 actualizado.
Executive, Operaciones, Quality, Desarrollo y Clientes ya implementados.
El módulo Clientes / Business Matrix UI está funcionalmente consolidado.

Estado actual:

- `/analytics/clientes` usa Customer Situation Board.
- La fuente principal es `vw_customer_business_contextual`.
- Health viene de `vw_customer_health_signal`.
- Evolución Xiamen viene de `vw_xiamen_customer_season_volume_evolution`.
- El board se agrupa por `health_signal`.
- El orden viene de `health_priority`.
- El frontend no recalcula health ni score contextual.
- Xiamen se evalúa por volumen/evolución.
- BSG mantiene matriz estándar.
- `/analytics/clientes/[customer]` muestra score contextual, health, drivers y lectura ejecutiva.
- `/analytics/executive` incorpora bloque de prioridad comercial desde `vw_customer_commercial_alerts`.
- `/analytics/operaciones` incorpora foco operativo e insights con drill-down contextual.
- `customers`, `factories`, `seasons` y `logistica` preservan contexto al volver a overview.

Archivos clave:

- `src/types/clientes.ts`
- `src/lib/analytics/clientes.ts`
- `src/app/analytics/clientes/page.tsx`
- `src/app/analytics/clientes/[customer]/page.tsx`
- `src/app/analytics/executive/page.tsx`
- `src/app/analytics/operaciones/page.tsx`
- `src/components/analytics/operaciones/OperacionesFocusBoard.tsx`
- `src/components/analytics/charts/AnalyticsBarChart.tsx`

Views clave:

- `vw_customer_business_matrix`
- `vw_xiamen_customer_season_volume_evolution`
- `vw_customer_health_signal`
- `vw_customer_business_contextual`
- `vw_customer_commercial_alerts`

Reglas:

- no modificar snapshots históricos
- no recalcular BI en frontend
- no duplicar lógica de negocio
- filtros vía search params
- UI como representación fiel de BI Layer
- estabilidad antes que abstracción visual

Siguiente bloque recomendado:

- Afinar priorización en Executive (menos ruido y mayor foco en `CRITICAL` y `WARNING`).
- Extender cubo operativo con drill-down explicativo por causa (sin lógica duplicada en UI).
- Consolidar cross-navigation Executive <-> Operaciones <-> Clientes preservando contexto.
- Evaluar alertas transversales inter-módulo para seguimiento diario.

40. Conclusión

Con esta actualización:

- Production Tracker incorpora una capa de inteligencia comercial contextual.
- El sistema distingue correctamente Xiamen DIC y BSG.
- El módulo Clientes deja de ser una tabla de scores y pasa a ser un tablero de situación.
- La UI muestra situación, causa y acción.
- La BI Layer mantiene la lógica de decisión.
- El proyecto queda preparado para alertas, reporting ejecutivo y priorización comercial real.
