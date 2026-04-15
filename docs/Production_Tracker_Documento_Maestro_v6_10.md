# Production Tracker — Documento Maestro v6.9

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
```

---

## 4. Modelo de Datos (visión funcional)

### 4.1 `pos`

Cabecera del pedido.

### 4.2 `lineas_pedido`

Campos operativos:

- `style`
- `reference`
- `color`
- `qty`
- `price`
- `amount`

Campos BSG:

- `pi_bsg`
- `price_selling`
- `amount_selling`

Enlace Master:

- `modelo_id`
- `variante_id`

Snapshot histórico de precios (clave del sistema):

- `master_buy_price_used`
- `master_sell_price_used`
- `master_currency_used`
- `master_valid_from_used`
- `master_price_id_used`
- `master_price_source` (`autofill | manual | import`)

**Regla crítica:** el snapshot es inmutable salvo edición consciente.

---

## 5. Master de Modelos (Módulo Desarrollo)

### 5.1 Modelos

Identificados por:

- `style`

Incluyen:

- Imagen principal (`kind=main`)
- Datos comerciales base

### 5.2 Variantes

Identificadas por:

- `(modelo_id, season, color)`

Notas:

- `factory` puede variar por season
- Las imágenes viven en la variante

### 5.3 Precios (`modelo_precios`)

Campos:

- `buy_price`
- `sell_price`

Histórico por:

- `valid_from`

Moneda:

- USD

Constraint clave:

```sql
unique (variante_id, valid_from)
```

Para corregir un precio el mismo día se hace `PATCH`, no `INSERT`.

---

## 6. Pricing y Márgenes (definitivo)

### 6.1 Operativas coexistentes

#### Xiamen DIC — Comisión pura

- `price = venta`
- `amount = total venta`
- `margen_xiamen = amount * 0.10`
- No existe coste real en sistema

#### BSG — Compra / Venta

- `price = buy_price`
- `amount = buy_amount`
- `price_selling`
- `amount_selling`

Margen base:

```text
amount_selling - amount
```

Comisión opcional:

```text
amount * 0.10
```

Margen total:

```text
(amount_selling - amount) + comisión
```

La comisión debe poder activarse/desactivarse por reglas futuras.

---

## 7. Flujo Master → Pedido (autofill)

Usuario selecciona:

- Modelo
- Variante (`season + color`)

Sistema:

- Resuelve `factory`
- Busca precio vigente con regla `valid_from <= today`
- Propone `buy / sell` según operativa

Usuario:

- Acepta o modifica

Sistema:

- Guarda snapshot en `lineas_pedido`
- Marca `master_price_source`

**Regla crítica:** cambios futuros en master no afectan a pedidos existentes.

---

## 8. Importadores

### 8.1 Importador CSV España

Estado: estable.

Funciones:

- Agrupa por PO (`groupRowsByPO.ts`)
- Crea POs
- Crea líneas
- Crea muestras
- Importa correctamente campos BSG

### 8.2 Importador China

Estado: estable.

Solo actualiza:

- Fechas

### 8.3 Exportador China

Estado: v2 estable.

Características:

- Multi-season
- Excel bloqueado

---

## 9. QC (v1 definitivo)

Funciones:

- Subida imágenes a R2
- Reportes PDF
- Inspecciones
- Defectos
- KPIs

Módulo cerrado funcionalmente.

---

## 10. Dashboard Producción

Estado: operativo (BSG incluido).

Funciones:

- Listado de POs
- Totales
- Preview PO
- Campos BSG visibles
- Cálculos correctos

---

## 10.1 Oferta Cliente (Price List)

Estado: operativo.

Objetivo:

Generar listas de precios comerciales a partir de cotizaciones existentes.

Ruta UI:

```text
/desarrollo/cotizaciones/oferta
```

### 10.1.1 Selección de oferta

El usuario selecciona:

- Customer
- Season
- Status (opcional)

El sistema:

- Consulta cotizaciones
- Obtiene todas las variantes
- Selecciona automáticamente la última cotización por variante

Regla:

```text
latest(created_at) per variante_id
```

### 10.1.2 Datos incluidos en la oferta

Modelo:

- `style`
- `reference`
- `size_range`

Variante:

- `color`
- `season`

Precio:

- `sell_price`
- `currency`

### 10.1.3 Imágenes

Las imágenes se obtienen de `modelo_imagenes`.

Prioridad:

1. Imagen con `variante_id`
2. Imagen `main` del modelo

Campo utilizado:

- `public_url`

### 10.1.4 Composición

Se obtiene mediante:

```text
/api/modelo-componentes/bulk
```

Tipos soportados:

- `upper`
- `lining`
- `insole`
- `outsole`
- `shoelace`
- `packaging`

### 10.1.5 Exportaciones disponibles

- Copiar para Excel (TSV compatible Excel ES)
- CSV Excel (`sep=;`)
- PDF Price List

### 10.1.6 PDF Price List

Endpoint:

```text
POST /api/cotizaciones/oferta/pdf
```

Tecnología:

- `pdf-lib`

Características:

- A4 vertical
- Logo BSG
- Título: Price List
- Cabecera con Customer / Season / Date / Incoterm / MOQ
- Layout por modelo con foto, style, reference, composición y precio
- Paginación `Page X / Y`

---

## 11. Calculadora de Precios y Márgenes

La calculadora será:

- Herramienta operativa
- Simulador
- Generador opcional de nuevos precios master

Funciones:

- Partir de `buy_price`
- Aplicar margen deseado
- Aplicar comisión
- Aplicar redondeos
- Generar `selling_price` sugerido
- Calcular margen esperado

Resultados:

- Guardar en master
- o usar como simulación

Nunca recalcula histórico.

---

## 12. Sistema de Cubos (visión analítica)

Gracias al snapshot, el sistema soporta analítica real.

Dimensiones:

- Supplier
- Customer
- Factory
- Season
- Modelo / Variante
- Operativa
- Fechas

Métricas:

- Ventas
- Compras
- Márgenes
- Comisión
- Demoras
- Incidencias

Los cubos no recalculan, solo leen hechos históricos.

---

## 13. Analytics Layer v1.0

### 13.1 Principios

La capa analítica se construye directamente sobre PostgreSQL / Supabase mediante:

- Materialized views
- Vistas analíticas
- Business views ejecutivas

Objetivos:

- Validar fórmulas antes de llevarlas a frontend
- Reducir lógica compleja en la UI
- Centralizar reglas de negocio
- Facilitar rendimiento y mantenibilidad

### 13.2 Reglas de negocio congeladas

#### Margen combinado

La métrica combinada oficial para mezclar operativas es:

```text
contribution_amount
```

Reglas:

- En Xiamen DIC = comisión
- En BSG = margen total

#### Retraso producción

```text
finish_date - etd_pi
```

- `etd_pi` = compromiso cliente
- `finish_date` = fin real producción fábrica

#### Retraso booking / logístico

```text
shipping_date - finish_date
```

Sirve para detectar clientes que presionan PI ETD pero retrasan el booking.

#### Negotiation Score

```text
40% gap master → quote
30% gap quote → order
20% revisiones
10% tiempo a pedido
```

#### Customer Business Profile

Clasificaciones finales:

- `STRATEGIC`
- `PROFITABLE`
- `NEGOTIATOR`
- `RISKY`
- `LOW_VALUE`

---

## 14. Cubo Operativo

Hecho principal:

```text
mv_fact_operacion_linea
```

Dimensiones operativas incluidas:

- Customer
- Factory
- Supplier
- Modelo
- Variante
- Season
- Operativa
- Fechas

Métricas clave:

- `qty_total`
- `sell_amount_real`
- `buy_amount_real`
- `margin_base_amount`
- `commission_amount`
- `margin_total_amount`
- `contribution_amount`
- `contribution_pct`

Dimensiones auxiliares:

- `dim_fecha`
- `dim_operativa`

---

## 15. Timeline Operativo

Vista base temporal:

```text
vw_fact_operacion_timeline
```

Añade:

- `booking_delay_days`
- `booking_delay_flag`
- `booking_on_time_flag`
- `has_booking_delay_basis`

Lectura temporal del negocio:

```text
PO_DATE → FINISH_DATE → SHIPPING_DATE
```

Compromiso cliente:

```text
ETD_PI
```

---

## 16. Vistas analíticas operativas

### 16.1 Rentabilidad

- `vw_margin_by_customer`
- `vw_margin_by_factory`
- `vw_margin_by_modelo`
- `vw_operativa_xiamen_vs_bsg`

### 16.2 Retrasos

- `vw_delay_by_factory`
- `vw_delay_by_customer`

### 16.3 Rankings operativos

- `vw_factory_risk_score`
- `vw_customer_profitability_profile`
- `vw_model_operational_profile`

### 16.4 Executive rankings

- `vw_exec_summary`
- `vw_exec_customer_ranking`
- `vw_exec_factory_ranking`
- `vw_exec_model_ranking`

---

## 17. Capa temporal y estacional

Vistas temporales implementadas:

- `vw_exec_summary_by_season`
- `vw_exec_summary_by_po_month`
- `vw_exec_summary_by_finish_month`
- `vw_exec_summary_by_etd_pi_month`
- `vw_exec_summary_by_shipping_month`
- `vw_customer_timeline_pressure`

Objetivo:

Permitir análisis por:

- Season
- Fecha pedido
- Fecha compromiso cliente
- Fecha fin producción
- Fecha shipping

---

## 18. Rankings logísticos y seasonal performance

### 18.1 Presión logística por cliente

Vista:

```text
vw_exec_customer_logistics_pressure_ranking
```

Detecta clientes que:

- presionan PI ETD
- pero retrasan bookings
- generan fricción entre `finish_date` y `shipping_date`

### 18.2 Performance por season

Vista:

```text
vw_exec_season_performance_ranking
```

Analiza por season:

- rentabilidad
- retrasos producción
- retrasos booking
- riesgo logístico

---

## 19. QC Analytics v1

### 19.1 Base QC

- `vw_qc_inspection_summary`
- `vw_qc_defect_summary`

### 19.2 Puente QC + Operación

Vista central:

```text
vw_qc_operacion_bridge
```

Relaciona inspecciones con:

- PO
- Customer
- Factory
- Season
- Modelo
- Rentabilidad
- Retrasos

### 19.3 Vistas QC de negocio

- `vw_qc_by_factory`
- `vw_qc_by_customer`
- `vw_qc_by_model`
- `vw_qc_risk_ranking`
- `vw_factory_quality_vs_delay`

Permite detectar:

- fábricas que llegan tarde y además fallan calidad
- modelos con defectos estructurales
- clientes con más exposición a incidencias QC

---

## 20. Executive KPI Dashboard

Vista principal:

```text
vw_exec_kpi_dashboard
```

Incluye en una sola fila:

- ventas totales
- coste total
- margen total
- % margen
- mix operativas Xiamen / BSG
- retraso producción
- retraso booking
- QC fail rate
- defect rate
- coverage de inspecciones
- operational risk score
- operational risk level

Es el panel principal de dirección.

---

## 21. Cubo Desarrollo (Price Intelligence)

Base principal:

```text
vw_dev_quote_fact
```

Fuentes:

- `cotizaciones`
- `modelos`
- `modelo_variantes`
- `modelo_precios`
- `mv_fact_operacion_linea`

Dimensiones disponibles:

- Customer (vía `modelos.customer`)
- Season (vía `modelo_variantes.season`)
- Style
- Color
- Factory
- Status
- Fecha de cotización

Métricas:

- `quote_buy_price`
- `quote_sell_price`
- `quote_margin_pct`
- `quote_margin_amount`
- `gap_vs_master_buy`
- `gap_vs_master_sell`
- `gap_vs_master_sell_pct`
- `revision_no_inferred`
- `revision_count_inferred`

### 21.1 Vistas del Cubo Desarrollo

- `vw_dev_price_evolution`
- `vw_dev_quote_vs_master`
- `vw_dev_model_price_dispersion`
- `vw_dev_quote_vs_order`
- `vw_dev_conversion_by_customer`
- `vw_dev_customer_price_pressure`
- `vw_dev_pricing_instability_ranking`
- `vw_dev_exec_summary`
- `vw_dev_exec_customer_ranking`

### 21.2 Negotiation Score

Vista:

```text
vw_dev_customer_negotiation_score
```

Clasificación:

- `AGGRESSIVE`
- `NORMAL`
- `EASY`

Sirve para detectar clientes que:

- presionan pricing vs master
- comprimen quote → order
- necesitan más revisiones
- cierran rápido tras negociar fuerte

---

## 22. Customer Business Matrix

Vista de inteligencia de negocio más alta del sistema:

```text
vw_customer_business_matrix
```

Cruza:

- Cubo Operativo
- Cubo Desarrollo
- QC Analytics
- Logística

Perfil generado por cliente:

- `STRATEGIC`
- `PROFITABLE`
- `NEGOTIATOR`
- `RISKY`
- `LOW_VALUE`

Scores incluidos:

- `customer_business_score`
- `customer_friction_score`

Uso principal:

- priorización comercial
- estrategia de crecimiento
- detección de clientes rentables pero problemáticos

---

## 23. Arquitectura visual del sistema

### 23.1 Vista general

```text
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
```

### 23.2 Lectura rápida para explicar el sistema

Production Tracker funciona en 5 capas:

1. **Datos origen**: pedidos, líneas, cotizaciones, modelos y QC  
2. **Hechos analíticos**: Cubo Operativo y Cubo Desarrollo  
3. **Analítica especializada**: producción, logística, calidad y pricing  
4. **Business Intelligence**: rankings, matrices y scores  
5. **UI / Dashboards**: explotación visual dentro de la app  

---

## 24. Estado Global

| Módulo | Estado |
|---|---|
| Importadores | ✔ |
| QC | ✔ |
| Master Modelos | ✔ |
| Snapshot precios | ✔ |
| UI Modelos | ✔ |
| Producción BSG | ✔ |
| Pricing definido | ✔ |
| Oferta Cliente (Price List) | ✔ |
| Cubo Operativo | ✔ |
| QC Analytics | ✔ |
| Cubo Desarrollo | ✔ |
| Executive KPIs | ✔ |
| Customer Business Matrix | ✔ |

---

## 25. Punto de corte

**Documento Maestro v6.9**

- Proyecto estable
- Capa analítica v1 cerrada
- Base sólida para calculadora, reporting, BI y dashboards dentro de la app
🔹 26. Analytics UI (v1 implementado)
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
26.3 Convención de filtros (URL)
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

Reglas:

Los filtros viven en la URL (search params)
Cada pantalla decide qué filtros usa
No existe estado global compartido
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
date range
26.5 Módulo Operaciones
Overview

Ruta:

/analytics/operaciones

Estructura:

Customers (principal)
Factories
Seasons
Logistics
Drill-downs
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

👉 Cada pantalla usa únicamente filtros soportados por su view

26.6 Módulo Quality
Overview

Ruta:

/analytics/quality

Bloques:

Customers
Factories
Styles
Drill-downs
/analytics/quality/customers
/analytics/quality/factories
/analytics/quality/models

Views utilizadas:

vw_qc_by_customer
vw_qc_by_factory
vw_qc_by_model
Decisión crítica

La dimensión modelo en QC se define como:

style

No se usa modelo para evitar inconsistencias con la base de datos.

26.7 Componentes base reutilizados
AnalyticsPageShell
AnalyticsSectionHeader
AnalyticsRankingTable
AnalyticsBarChart
26.8 Reglas UX consolidadas
❌ No filtros falsos
❌ No columnas inventadas
❌ No datasets duplicados
❌ No scatter charts sin contexto claro
✅ UI refleja el dato real
✅ Jerarquía clara (overview → drill-down)
✅ Navegación consistente entre módulos
✅ Lectura dual por pantalla (ranking + volumen)
26.9 Estado del módulo Analytics UI
Módulo	Estado
Executive	✔
Operaciones	✔
Quality	✔
Desarrollo	⏳ pendiente
Clientes (Business Matrix UI)	⏳ pendiente
26.10 Próximo bloque

Siguiente desarrollo:

Analytics → Desarrollo (Pricing / Negotiation / Quotes)

Objetivo:

explotar vw_dev_*
análisis de pricing
negociación por cliente
conversión quote → order