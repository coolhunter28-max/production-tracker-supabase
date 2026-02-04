# Pricing y márgenes (POs + Master)

## Operativas actuales en POs
### Xiamen Dic (comisión pura)
- Campos existentes en PO/linea:
  - price (venta)
  - amount (total)
- Comisión: 10% fijo (regla de negocio)

### BSG (compra/venta)
- Campos existentes en PO/linea:
  - price = buy_price (compra)
  - amount = buy_amount (total compra)
  - selling_price
  - selling_amount

## Relación con Master de Modelos (modelo_precios)
- modelo_precios guarda buy_price / sell_price por variante (y temporada) con valid_from.
- El PO guarda el precio real aplicado (operativa real).
- Objetivo al conectar Master → Pedidos:
  - “sugerir” precio desde master
  - permitir override manual
  - guardar siempre lo aplicado en PO/linea

## Márgenes (definiciones)
### Xiamen Dic
- margen_operativo = amount * 0.10

### BSG
- margen_bsg = (selling_amount - amount) + (amount * 0.10?) el 10% va sobre compra]

## Requisito importante
- Poder corregir precio el mismo día:
  - En master: PATCH al registro existente (no crear otro mismo valid_from)
  - En PO: editar línea/PO si hay cambios del proveedor
