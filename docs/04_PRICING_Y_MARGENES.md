Pricing y Márgenes — POs + Master (v2 alineado)

Este documento define cómo se gestionan precios y márgenes en el sistema Production Tracker, diferenciando:

Operativa real en POs

Master de precios (modelo_precios)

Snapshots históricos

Cálculo de márgenes

Base para sistema de cubos e informes

1. Operativas actuales en POs

Existen dos operativas claramente diferenciadas, y el sistema debe soportarlas simultáneamente.

1.1 Xiamen DIC — Comisión pura (intermediación)

Rol del sistema:
Xiamen DIC actúa como intermediario, no como comprador.

Campos usados en lineas_pedido

price → precio de venta

amount → importe total de venta

⚠️ En esta operativa:

price NO es buy_price

selling_price puede coincidir o no existir

El margen no depende de diferencia compra/venta

Regla de negocio

Comisión fija: 10%

No existe coste real registrado en el sistema

Margen operativo
margen_xiamen = amount * 0.10
1.2 BSG — Compra / Venta (operativa completa)

Rol del sistema:
BSG actúa como comprador y vendedor, con margen comercial explícito.

Campos usados en lineas_pedido

price → buy_price (precio de compra)

amount → buy_amount (importe compra)

price_selling → precio de venta

amount_selling → importe venta

pi_bsg → referencia comercial

Margen base
margen_base = amount_selling - amount
Comisión adicional (si aplica)

Existe una regla opcional de comisión del 10% sobre compra:

comision_bsg = amount * 0.10
Margen total BSG
margen_bsg_total = (amount_selling - amount) + comision_bsg

⚠️ Esta comisión debe poder activarse/desactivarse por contexto
(cliente, supplier, season o regla futura).

2. Relación con Master de Precios (modelo_precios)
2.1 Qué guarda el Master

La tabla modelo_precios representa precios teóricos de referencia, no la operativa real.

Campos clave:

modelo_id

variante_id

season

currency (USD por defecto)

buy_price

sell_price

valid_from

2.2 Qué guarda el PO

El PO guarda el precio real aplicado, aunque:

venga del master

haya sido modificado manualmente

o no exista en el master

3. Snapshot de precios usados (clave del sistema)

Para garantizar trazabilidad histórica, cada línea de pedido guarda un snapshot inmutable del precio aplicado.

Campos de snapshot en lineas_pedido

master_buy_price_used

master_sell_price_used

master_currency_used

master_valid_from_used

master_price_id_used

master_price_source (autofill, manual, import)

Reglas

El snapshot se guarda en el momento de asignar el precio

Cambios futuros en el master NO afectan a líneas ya creadas

El snapshot es la base:

de márgenes históricos

de informes

de auditoría

4. Flujo operativo Master → Pedido

Usuario selecciona:

Modelo

Variante (season + color)

El sistema:

busca el precio vigente (valid_from <= today)

propone buy / sell según operativa

El usuario puede:

aceptar el precio sugerido

modificarlo manualmente

El sistema:

guarda el snapshot en lineas_pedido

marca la fuente (master_price_source)

5. Corrección de precios (regla crítica)
5.1 En Master

No se crean dos precios el mismo día

Para corregir un precio:

PATCH al registro existente con ese valid_from

Constraint activo:

unique (variante_id, valid_from)
5.2 En Pedidos

Las líneas pueden editarse si:

el proveedor corrige precios

hay errores humanos

El snapshot se actualiza conscientemente (no automático)

6. Base para Calculadora de Precios y Márgenes (futuro inmediato)

Este sistema permite construir una calculadora de precios que:

Parta del buy_price (master o manual)

Aplique:

margen deseado

comisión

redondeos

Genere:

selling_price sugerido

margen esperado

Permita guardar:

como nuevo precio master

o solo como simulación

7. Sistema de Cubos (visión analítica)

El pricing y los márgenes alimentan un sistema de cubos analíticos, no solo operativos.

Dimensiones posibles

Supplier

Customer

Factory

Season

Modelo / Variante

Operativa (Xiamen / BSG)

Fecha (PO / producción / envío)

Métricas

Ventas

Compras

Márgenes

Comisión

Demoras

Incidencias

Rentabilidad por fábrica / cliente / temporada

👉 Los snapshots hacen posible este sistema sin recalcular el pasado.

8. Estado actual

✔ Operativas Xiamen y BSG definidas y coexistiendo

✔ Snapshots implementados y en uso

✔ Master alineado con POs

✔ Base sólida para:

calculadora de márgenes

sistema de cubos

reporting avanzado