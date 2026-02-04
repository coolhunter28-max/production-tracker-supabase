# Endpoints API

## Modelos
- GET /api/modelos
- POST /api/modelos
- GET /api/modelos/[id]
- PATCH /api/modelos/[id]

## Variantes
- GET /api/modelos/[id]/variantes
- POST /api/modelos/[id]/variantes
- GET /api/variantes/[varianteId]
- PATCH /api/variantes/[varianteId]
- DELETE /api/variantes/[varianteId]

## Componentes (por variante)
- GET /api/variantes/[varianteId]/componentes
- POST /api/variantes/[varianteId]/componentes
- PATCH /api/variantes/[varianteId]/componentes/[compId]
- DELETE /api/variantes/[varianteId]/componentes/[compId]

## Precios (por variante)
- GET /api/variantes/[varianteId]/precios
- POST /api/variantes/[varianteId]/precios
- PATCH /api/variantes/[varianteId]/precios/[precioId]
- DELETE /api/variantes/[varianteId]/precios/[precioId]

## Imágenes
- Modelos:
  - GET /api/modelos/[id]/imagenes
  - POST /api/modelos/[id]/imagenes/upload
  - DELETE /api/modelos/[id]/imagenes/[imageId]
- Variantes (si ya está implementado o planificado):
  - GET /api/variantes/[varianteId]/imagenes
  - POST /api/variantes/[varianteId]/imagenes/upload
  - DELETE /api/variantes/[varianteId]/imagenes/[imageId]
