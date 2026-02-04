# Arquitectura resumen

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres)
- Cloudflare R2 (S3 compatible) para imágenes (QC + Modelos/Variantes)

## Módulos principales (estado actual)
### 1) Master de Modelos ✅ (muy avanzado)
- modelos
- modelo_variantes (season + color; factory puede variar por season)
- modelo_componentes (base y/o por variante_id)
- modelo_precios (por variante_id, con valid_from)
- imágenes: modelo (main) + variante (galería por color)

### 2) POs / Producción (Xiamen Dic + BSG) ✅ (funcionando)
- En POs ya se guardan precios/importe.
- Operativa:
  - Xiamen Dic: comisión pura → Price + Amount
  - BSG: compra/venta → Price (buy), Amount (buy total), Selling Price, Selling Amount

### 3) QC ✅ (funcionando)
- Subida de fotos a Cloudflare R2 + registros en BD (tablas QC correspondientes)
- Reportes / defectos / fotos, etc.

## Próximo bloque
- Conectar Pedidos/POs manuales con el Master de Modelos:
  - selector modelo/variante
  - autofill datos (factory/otros)
  - pricing aplicado
