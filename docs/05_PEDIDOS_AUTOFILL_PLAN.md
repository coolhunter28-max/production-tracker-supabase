Plan: Conectar Pedidos con Master (Autofill) — v1 validado
1. Objetivo

Cuando el usuario cree o edite un PO / línea de pedido manualmente:

Selecciona Modelo (style)

Selecciona Variante (season + color)

El sistema autocompleta automáticamente:

Factory (prioridad: variante → modelo → PO)

Datos de referencia (solo lectura)

Precio sugerido vigente desde el Master

👉 El usuario siempre puede modificar lo sugerido.

2. Regla clave (no negociable)

El PO / línea guarda el precio aplicado, no depende del master para el histórico.

Esto se cumple mediante:

Campos propios en lineas_pedido

Snapshot explícito del precio usado (master_*_used)

El master solo sugiere, nunca reescribe el pasado.

3. Flujo funcional esperado (UI)
3.1 Selección encadenada

Selector Modelo

Basado en modelos.style

Selector Variante

Filtrado por modelo_id

Identificada por season + color

3.2 Autofill al seleccionar variante

Al seleccionar variante:

Factory → modelo_variantes.factory (si existe)

Precio → precio vigente en modelo_precios

Moneda → USD (regla actual)

Se prepara snapshot (aún no guardado)

4. API necesaria (helper)
Endpoint lógico
GET /api/modelos/{variante_id}/precio-vigente
Lógica

Filtrar modelo_precios por variante_id

valid_from <= today

Ordenar valid_from DESC

Devolver 1 único registro

Este endpoint no crea nada, solo consulta.

5. Guardado en PO / línea (según operativa)
5.1 Xiamen DIC (intermediación)

En lineas_pedido:

price = precio de venta

amount = total venta

Snapshot:

master_sell_price_used

master_price_id_used

master_price_source = autofill | manual

Margen:

No se guarda

Se calcula en reporting: amount * 0.10

5.2 BSG (compra / venta)

En lineas_pedido:

price = buy_price

amount = buy_amount

price_selling

amount_selling

pi_bsg

Snapshot:

master_buy_price_used

master_sell_price_used

master_price_id_used

master_price_source = autofill | manual

Margen:

No se guarda

Se calcula dinámicamente (ver doc de pricing)

6. Override manual (obligatorio)

El sistema debe permitir:

Cambiar precios sugeridos

Cambiar importes

Corregir errores humanos

Buenas prácticas:

Si se modifica un precio sugerido:

master_price_source = manual

Opcional: notes en línea

7. Estado actual vs plan
Punto	Estado
Selectores Modelo / Variante	✔ Hecho
Autofill precio vigente	✔ Hecho
Snapshot en líneas	✔ Hecho
Override manual	✔ Hecho
Márgenes calculables	✔ Hecho
Base para cubos	✔ Hecho

👉 Este plan ya no es teórico: está implementado en esencia.

8. Encaje con siguientes bloques

Este plan es el puente entre:

Documento de pricing y márgenes

Calculadora de precios

Sistema de cubos / reporting

No hay que rehacer nada del master antes de seguir.
Lo que toca ahora es explotar lo que ya existe.