# Production Tracker — Documento Maestro v7.2

Versión: 7.2  
Fecha: Julio 2026  
Estado:
* Producción activa
* Build estable
* Arquitectura consolidada
* Fase Operations First
* Gestión de precios y activación de temporadas definida
* Import China endurecido y validado
* Arquitectura operativa a nivel de línea consolidada
* Trazabilidad de modelo y variante activa

---

# 0. Filosofía del Sistema

## Operations First

Production Tracker es una plataforma operativa para la empresa.

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

## El Modelo como núcleo del negocio

El modelo es el activo principal de la empresa.

Sin modelo no existe variante, precio, cotización, PO, producción, QC ni desarrollo.

Production Tracker se estructura alrededor del modelo y de los procesos que ocurren sobre él.

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
* modelo_eventos

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

## lineas_pedido combina snapshot comercial y estado operativo

`lineas_pedido` conserva dos tipos de información diferentes.

### Snapshot comercial congelado

Los campos vinculados al precio y a la selección maestra son históricos.

Nunca deben recalcularse de forma destructiva una vez fijados:

* master_price_id_used
* buy_price_snapshot
* sell_price_snapshot
* currency_snapshot
* datos maestros asociados al snapshot

Únicamente pueden completarse snapshots cuando:

`master_price_id_used IS NULL`

Una vez asignado, el snapshot comercial queda congelado.

### Estado operativo mutable

Los campos de seguimiento diario sí pueden evolucionar y actualizarse mediante los flujos operativos autorizados:

* factory
* inspection
* booking
* closing
* shipping_date
* trial_upper
* trial_lasting
* lasting
* finish_date
* datos de muestras asociados

La actualización de estos campos no altera el snapshot comercial.

---

## Regla de no destrucción

Nunca:

* regenerar snapshots históricos
* sobrescribir precios históricos
* recalcular líneas cerradas de forma masiva
* usar coincidencias débiles para identificar una línea

Siempre:

* escribir por identificador seguro
* validar antes de actualizar
* generar reporte de cambios
* construir Analytics sobre hechos operativos reales

---

# 3. Propiedad de datos en PO y línea

## Cabecera PO — `pos`

La cabecera contiene únicamente información realmente común al pedido:

* PO
* PO Date
* Season
* Customer
* Supplier
* Currency

Otros valores mostrados en cabecera pueden ser derivados de las líneas.

---

## Línea de pedido — `lineas_pedido`

La línea es la unidad operativa real.

Puede variar por modelo, color, talla, categoría, canal o fábrica dentro del mismo PO.

Viven en la línea:

* modelo / style
* referencia
* color
* size
* category
* channel
* quantity
* factory
* PI de línea
* ETD PI de línea
* inspection
* booking
* closing
* shipping_date
* trial_upper
* trial_lasting
* lasting
* finish_date
* snapshots de precio
* muestras

---

## PI general en cabecera

La PI mostrada en cabecera no es fuente de verdad.

Se deriva de las PIs existentes en las líneas del PO y puede mostrar varios números cuando corresponda.

---

# 4. Ficha Cliente

## Pantalla Principal Operativa

Ruta:

`/ficha-cliente`

La Ficha Cliente es la pantalla operativa más importante del sistema.

Representa la evolución digital del Excel histórico.

---

## Fuente Principal

`vw_customer_campaign_board_v1`

---

## Agrupación Oficial

* customer
* season
* supplier
* etd_pi
* reference
* style
* color

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

# 5. N/N — No Need

Definición oficial:

`N/N = No Need`

Interpretación:

* no pendiente
* no bloqueado
* no genera alerta
* no penaliza indicadores

Representación visual:

* gris
* estado neutro

---

# 6. Alertas Operativas

## Fuente Principal

`vw_customer_daily_alerts`

Basada en:

`vw_customer_campaign_board_v1`

---

## Señales Oficiales

* CRITICAL
* WARNING
* MONITOR
* OK

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

# 7. Active Seasons

Las vistas operativas diarias deben trabajar sobre campañas activas.

Evitar ruido histórico.

Configuración prevista:

`production_active_seasons`

Todas las vistas operativas deberán respetar esta configuración.

---

# 8. Command Center

## Objetivo

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

# 9. Master Sync Pipeline

Ruta:

`/sistema/master-sync`

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

# 10. Gestión Oficial de Precios

## Fuente Única de Verdad

La única fuente de verdad para precios es:

`modelo_precios`

Nunca se editan precios directamente desde:

* lineas_pedido
* PO
* importadores
* Ficha Cliente

Los precios se editan desde la variante del modelo o desde flujos autorizados que promocionan a master.

---

## Permisos de Precio

ADMIN:

* puede modificar precios siempre

MANAGER:

* puede modificar precios siempre

DESARROLLO:

* puede modificar precios solo si la variante está INACTIVA

OPERATOR:

* nunca modifica precios

---

## Histórico de Precios

Los precios nunca se sobrescriben.

Cada cambio de precio crea un nuevo registro en `modelo_precios` con:

* variante_id
* season
* buy_price
* sell_price
* valid_from
* motivo
* usuario

Todo cambio debe generar auditoría en `modelo_eventos`.

---

## Refresh Price Snapshots

Al guardar un nuevo precio, el sistema debe refrescar los snapshots de precio de los POs operativos de la misma:

* variante
* season

No se ejecuta el Master Sync completo.

Se ejecuta una operación específica de refresco de snapshots de precio.

---

# 11. Activación de Temporada desde Nuevo PO

Producción puede activar una nueva temporada desde:

`/po/nuevo`

Si un modelo existe pero no tiene variantes en la season seleccionada, el sistema debe ofrecer:

Crear temporada desde una season anterior.

---

## Regla Operativa

Desde Nuevo PO, las variantes copiadas nacen con:

`status = ACTIVO`

porque existe intención real de producción.

Desde Desarrollo, las variantes pueden nacer como:

`status = INACTIVO`

porque todavía están en fase de desarrollo.

---

## Datos a Copiar

Al crear una temporada desde otra, el sistema copiará:

* variantes
* últimos precios vigentes
* imágenes
* componentes
* documentación aplicable

El usuario continuará creando el PO sin salir de la pantalla.

La operación debe generar un evento `SEASON_ACTIVATED` en `modelo_eventos`.

---

# 12. Variantes lógicas y representación visual

En base de datos, `modelo_variantes` mantiene una fila por combinación física:

* modelo
* season
* color
* reference

En interfaz, las variantes se agrupan visualmente por:

* color
* reference

Las temporadas viven visualmente dentro de esa variante lógica.

Esta agrupación es de presentación y no modifica el modelo de datos.

---

# 13. Trazabilidad y modelo_eventos

`modelo_eventos` es la memoria operativa del catálogo.

Debe registrar como mínimo:

* activación de temporadas
* creación de precios
* actualización de precios
* cambios relevantes de variante
* cambios de componentes
* subida o eliminación de imágenes
* otras acciones maestras relevantes

---

## Timeline de variante

Ruta:

`/desarrollo/variantes/[varianteId]`

Muestra eventos propios de la variante y de su contexto lógico cuando corresponda.

---

## Timeline de modelo

Ruta:

`/desarrollo/modelos/[id]`

Muestra la actividad global del modelo y de sus variantes.

---

## Campos indexables

Los eventos deben rellenar directamente:

* modelo_id
* variante_id
* season
* event_type
* source
* user_email
* created_at
* payload

El `payload` conserva el detalle, pero las consultas no deben depender exclusivamente del JSON.

---

# 14. Import China

## Objetivo

Actualizar de forma segura la operativa semanal recibida desde China.

Ruta API:

`/api/import-china`

---

## Unidad de actualización

Import China actualiza exclusivamente líneas de pedido identificadas de forma segura.

Escribe en `lineas_pedido`:

* factory
* inspection
* booking
* closing
* shipping_date
* trial_upper
* trial_lasting
* lasting
* finish_date

También actualiza las muestras asociadas cuando existan.

No utiliza la cabecera del PO como fuente de verdad para campos que pueden variar por línea.

---

## Validación previa obligatoria

Antes de escribir cualquier dato, el importador debe validar:

* UUID de línea existente
* coincidencia de PO
* coincidencia de season
* coincidencia de reference
* coincidencia de style
* coincidencia de color
* estructura de columnas reconocida
* ausencia de SCO UUID duplicados en el Excel

Si existe cualquier error de identidad:

* la importación queda bloqueada
* no se actualiza ninguna línea
* no se actualiza ninguna muestra
* se muestra un reporte detallado por fila

---

## Escritura segura

El UUID de `lineas_pedido.id` es la única clave autorizada para escribir.

Nunca se identifica una línea para actualización mediante:

* posición de fila
* PO + style + color sin UUID
* SCO Legacy
* coincidencias parciales
* orden del Excel

---

## Reporte de importación

El reporte debe incluir:

* estado
* POs encontrados
* líneas actualizadas
* muestras actualizadas
* avisos
* errores
* cambios realizados

Los errores bloqueantes deben ser visibles en la interfaz.

Los avisos no bloqueantes, como muestras inexistentes, deben quedar claramente diferenciados.

---

# 15. Identificación de líneas y SCO

## SCO App / UUID

El identificador interno real es:

`lineas_pedido.id`

Características:

* UUID único
* estable
* no depende del orden
* única clave de escritura

En Export China puede permanecer oculto en la columna A.

---

## SCO Legacy

El SCO Legacy es un identificador operativo para conciliación con Excel.

Se calcula concatenando:

* Supplier
* Season
* Customer
* PO
* Reference
* Style
* Color
* Size

No sustituye al UUID.

Su objetivo es permitir:

* BUSCARX / XLOOKUP
* conciliación con Excel histórico
* recuperación del UUID correcto
* independencia respecto al orden de filas

---

## Regla de conciliación

Flujo oficial:

1. descargar Export China desde el sistema
2. conservar UUID y SCO Legacy
3. recibir o preparar el Excel actualizado
4. calcular o usar el mismo SCO Legacy
5. recuperar el UUID mediante BUSCARX/XLOOKUP
6. pegar el UUID como valor
7. importar
8. revisar el reporte

---

# 16. Export China

Ruta API:

`/api/export-china`

Debe exportar:

* SCO UUID
* SCO Legacy
* campos de identidad de la línea
* factory
* fechas operativas de línea
* datos de muestras


El exportador debe leer los campos operativos desde `lineas_pedido`, no desde `pos`, salvo los datos realmente comunes de cabecera.

---

# 17. Import Spain

Import Spain se utiliza para cargas y volcados masivos.

Debe revisarse bajo la misma regla arquitectónica:

* datos comunes en `pos`
* datos variables por modelo/color/línea en `lineas_pedido`
* UUID como identificador interno
* snapshots comerciales protegidos
* validación previa antes de escrituras masivas

No debe asumir que factory, booking, closing, shipping_date o inspection son necesariamente comunes a todo el PO.

---

# 18. Estado Actual del Proyecto

## Estable

✅ Import China seguro y operativo

✅ Export China con SCO Legacy

✅ QC

✅ Modelos

✅ Variantes

✅ Pricing

✅ Activación de temporadas

✅ Timeline de modelo y variante

✅ Snapshot

✅ Situation Analytics

✅ Executive Analytics

✅ Business Matrix

✅ Analytics UI

✅ Build Producción

---

## En Consolidación

🟡 Import Spain bajo nueva arquitectura de línea

🟡 Ficha Cliente

🟡 Daily Alerts

🟡 Active Seasons

🟡 Command Center Operativo

🟡 Master Sync Pipeline

🟡 Auditoría de componentes e imágenes

---

# 19. Prioridades Actuales

1. Revisar Import Spain con arquitectura a nivel línea
2. Completar auditoría de componentes e imágenes
3. Validar vistas operativas tras mover factory y fechas a `lineas_pedido`
4. Revisar Export/Import China con nuevas temporadas
5. Integrar QC abierto en Ficha Cliente / Command Center
6. `vw_customer_daily_alerts`
7. Active Seasons
8. Hardening General

---

# 20. Normas de Desarrollo

Antes de cualquier cambio:

* verificar coherencia con este Documento Maestro
* explicar impacto arquitectónico
* indicar archivos afectados
* indicar SQL afectado
* justificar la capa correcta

Si faltan columnas:

consultar primero el esquema real.

Nunca inventar:

* tablas
* columnas
* relaciones
* rutas
* reglas de negocio

---

## Regla de archivos complejos

Cuando un cambio afecte a un archivo largo o complejo, se debe entregar el archivo completo corregido o implementado.

Evitar parches parciales que puedan romper el sistema.

---

## Regla de cierre de módulos

Antes de considerar un módulo cerrado:

* Arquitectura correcta
* Operativa validada
* Seguridad validada
* Trazabilidad disponible
* Build limpio
* Flujo probado
* Documento Maestro actualizado

---

# 21. Estado de Referencia

Build producción:

Pendiente de validación tras actualización del Documento Maestro.

Última validación prevista:

`npm run build`

Resultado esperado:

Compilación completa sin errores de TypeScript.

Esta versión sustituye a v7.1 como referencia principal del proyecto.
