# Seguridad (fase desarrollo)

## Estado actual
- Proyecto en local
- Un único usuario (Antonio)
- Se usan Service Role Keys en endpoints para poder iterar rápido

## Decisión consciente
- Se prioriza velocidad y flexibilidad (crear/borrar tablas, etc.)

## Checklist para “fase publicada”
- Activar Auth
- Revisar RLS tabla por tabla
- Separar keys:
  - service role sólo en server routes
  - nada en cliente
- Roles por usuario y permisos por módulo
