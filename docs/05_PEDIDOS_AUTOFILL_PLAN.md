# Plan: conectar Pedidos con Master (autofill)

## Objetivo
Cuando el usuario cree un pedido manual / línea:
- elige Modelo (style)
- elige Variante (season+color)
- el sistema autocompleta:
  - factory (de variante si existe)
  - composición (para consulta)
  - precio sugerido (modelo_precios vigente)

## Regla clave
- El PO/línea debe guardar el precio “aplicado”, no depender del master para histórico.

## Pasos de implementación
1) UI: selector modelo → selector variante (filtrado por modelo)
2) API: endpoint helper "precio vigente" por variante:
   - último modelo_precios por variante ordenado por valid_from desc
3) Guardar en PO:
   - Xiamen Dic: price + amount
   - BSG =(precio_compra * 10%)+ (selling_amount - amount)
4) Permitir override manual + registrar notes si es necesario
