# Production Tracker — Documento Maestro v7.0

## Estado

Versión: 7.0

Fecha: Junio 2026

Estado del proyecto:

* Producción activa
* Build estable
* Arquitectura consolidada
* Fase Operations First

---

# 0. Filosofía del Sistema

## Operations First

Production Tracker es un sistema operativo de producción.

La prioridad principal del sistema no es generar dashboards, rankings o KPIs.

La prioridad principal es:

* seguimiento diario
* coordinación producción
* control de muestras
* control de inspecciones
* control de fechas críticas
* detección de bloqueos
* resolución de incidencias

Toda nueva funcionalidad debe evaluarse primero desde la perspectiva operativa.

---

## Fuente de Verdad Operativa

El sistema nace del Excel histórico utilizado por el equipo de producción.

El objetivo no es replicar visualmente el Excel.

El objetivo es digitalizar su lógica operativa y mejorarla.

Cuando exista discrepancia entre una vista analítica y el flujo operativo real:

1. analizar primero el proceso operativo
2. validar la lógica de negocio
3. después ajustar Analytics

Nunca al revés.

---

# 1. Principios Arquitectónicos

El sistema se organiza en cuatro capas.

## Fact Layer

Tablas operativas reales.

Ejemplos:

* pos
* lineas_pedido
* muestras
* qc_inspections
* alertas

Representan hechos.

No contienen lógica analítica compleja.

---

## Analytics Layer

Views y Materialized Views.

Aquí vive la lógica de negocio.

Ejemplos:

* vw_customer_campaign_board_v1
* vw_customer_daily_alerts
* vw_exec_summary_v2
* vw_exec_customer_ranking

Toda regla de negocio debe residir aquí.

---

## BI Layer

Señales derivadas.

Ejemplos:

* CRITICAL
* WARNING
* MONITOR
* OK

Su objetivo es priorizar trabajo.

No sustituir operaciones.

---

## Frontend

El frontend representa datos.

No recalcula negocio.

No replica SQL.

No inventa reglas.

---

# 2. Regla Máxima de Integridad

## lineas_pedido es histórico

lineas_pedido representa snapshots históricos.

Por tanto:

Nunca:

* recalcular
* sobrescribir
* regenerar
* modificar snapshots históricos

Siempre:

* construir encima mediante views
* construir mediante materialized views
* construir mediante analytics

---

## Snapshot Inicial

Únicamente pueden completarse snapshots cuando:

master_price_id_used IS NULL

Una vez asignado:

el snapshot queda congelado.

---

# 3. Ficha Cliente

## Pantalla Principal Operativa

Ruta:

/ficha-cliente

La Ficha Cliente es la pantalla operativa más importante del sistema.

Representa la evolución digital del Excel histórico.

---

## Fuente Principal

vw_customer_campaign_board_v1

---

## Agrupación Oficial

customer

season

supplier

etd_pi

reference

style

color

---

## Objetivo

Responder diariamente:

* qué está pendiente
* qué está bloqueado
* qué muestra falta
* qué inspección falta
* qué booking falta
* qué closing falta
* qué shipping está en riesgo
* qué ETD requiere atención

---

# 4. N/N — No Need

Definición oficial:

N/N = No Need

Interpretación:

* no pendiente
* no bloqueado
* no genera alerta
* no penaliza indicadores

Representación visual:

* gris
* estado neutro

---

# 5. Alertas Operativas

## Fuente Principal

vw_customer_daily_alerts

Basada en:

vw_customer_campaign_board_v1

---

## Señales Oficiales

CRITICAL

WARNING

MONITOR

OK

---

## Prioridades

### CRITICAL

* muestra rechazada
* shipping vencido
* inspection crítica
* bloqueo operativo real

### WARNING

* muestra pendiente
* inspection pendiente
* booking pendiente
* closing pendiente

### MONITOR

* ETD próxima
* seguimiento preventivo

### OK

* sin acción requerida

---

# 6. Active Seasons

Las vistas operativas diarias deben trabajar sobre campañas activas.

Evitar ruido histórico.

Configuración prevista:

production_active_seasons

Todas las vistas operativas deberán respetar esta configuración.

---

# 7. Command Center

## Nuevo Objetivo

Responder:

¿Qué tengo que mirar hoy?

No:

¿Qué dashboard quiero consultar?

---

## Prioridades

* alertas críticas
* clientes bloqueados
* ETDs próximas
* muestras rechazadas
* inspections pendientes
* bookings pendientes
* closings pendientes

---

# 8. Master Sync Pipeline

Ruta:

/sistema/master-sync

Pipeline oficial:

1. modelos
2. variantes
3. precios
4. backfill
5. snapshot
6. validación

Objetivo:

garantizar integridad completa entre catálogo y producción.

---

# 9. Estado Actual del Proyecto

## Estable

✅ Importadores

✅ QC

✅ Modelos

✅ Variantes

✅ Pricing

✅ Snapshot

✅ Situation Analytics

✅ Executive Analytics

✅ Business Matrix

✅ Analytics UI

✅ Build Producción

---

## En Consolidación

🟡 Ficha Cliente

🟡 Daily Alerts

🟡 Active Seasons

🟡 Command Center Operativo

🟡 Master Sync Pipeline

---

# 10. Prioridades Actuales

Orden oficial de trabajo:

1. Ficha Cliente v1 definitiva

2. vw_customer_daily_alerts

3. Active Seasons

4. Command Center Operativo

5. Snapshot Pendiente

6. Master Sync Pipeline

7. Hardening General

---

# 11. Normas de Desarrollo

Antes de cualquier cambio:

* explicar impacto arquitectónico
* indicar archivos afectados
* indicar SQL afectado
* justificar capa correcta

Si faltan columnas:

consultar primero el esquema real.

Nunca inventar:

* tablas
* columnas
* relaciones
* rutas

---

# 12. Estado de Referencia

Build producción:

OK

Última validación:

npm run build

Resultado:

Compilación completa sin errores de TypeScript.

Esta versión sustituye a v6.x como referencia principal del proyecto.
