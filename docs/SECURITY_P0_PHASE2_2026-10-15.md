# Seguridad P0 — fase 2 (importaciones, copia masiva y sustitución QC)

## Alcance

Esta fase aplica el control compartido `requireApiAccess` a cinco endpoints de alto impacto:

- `POST /api/import-csv`: importación masiva España.
- `POST /api/import-china`: importación masiva China.
- `POST /api/catalogos/import-feeder`: importación masiva del catálogo feeder.
- `POST /api/variantes/feeder`: copia masiva de componentes y precios entre variantes.
- `POST /api/qc/import`: sustitución de una inspección y sus defectos desde Excel.

No incluye despliegues, conexiones o cambios en producción, operaciones R2 ni migraciones SQL.

## Cambios y decisiones

- Las cinco rutas exigen sesión, perfil activo y rol `ADMIN/MANAGER` antes de leer o parsear el cuerpo, consultar con `service_role` o escribir datos.
- Sin sesión se devuelve `401`; usuario inactivo o rol insuficiente recibe `403` mediante el helper común.
- Las importaciones España y China ya tenían una comprobación local equivalente, pero devolvían `403` también cuando no había sesión. Se migraron al control común para unificar semántica y evitar divergencias.
- La política conservadora es `ADMIN/MANAGER`, coherente con la matriz de auditoría y con las importaciones ya protegidas.
- No se autoriza `DEVELOPMENT`: el constraint versionado no lo admite y no existe una decisión aprobada para habilitarlo. `DESARROLLO` sigue siendo un área, no un rol.
- `POST /api/qc/upload` no se modificó. Su política `ADMIN/MANAGER/OPERATOR` con restricción por cliente tiene reglas funcionales específicas y no debe homogeneizarse sin una decisión separada.

## Pruebas y verificación

- Se añadieron comprobaciones estructurales para las cinco rutas: el helper común debe ejecutarse antes de `req.json()`, `req.formData()` y la primera operación Supabase del handler.
- Los casos del control común cubren ausencia de sesión, usuario inactivo, `VIEWER`, `DEVELOPMENT` no respaldado y autorización de `ADMIN/MANAGER`.
- `npm run test:security`: 13/13 pruebas superadas.
- `npx tsc --noEmit`: superado.
- `npm run build`: superado con credenciales ficticias y sin usar servicios de producción.
- El build conserva el aviso preexistente de uso de una API Node.js de Supabase en Edge Runtime.

## Riesgos y pendientes

- Las operaciones de importación y sustitución siguen sin ser transaccionales. Un fallo intermedio puede dejar datos parcialmente actualizados, especialmente en `qc/import` tras el upsert o el borrado de defectos.
- Los límites de tamaño, filas, elementos y frecuencia no son uniformes. Esta fase autoriza antes de parsear, pero no añade rate limiting ni validación de contenido por firma.
- `variantes/feeder` puede efectuar muchas inserciones secuenciales y trata cualquier error como duplicado; debe distinguir conflictos esperados de fallos reales y considerar una operación transaccional.
- `qc/import` no aplica alcance por cliente. La política `ADMIN/MANAGER` contiene el riesgo inmediato; habilitar `OPERATOR` requeriría validar el cliente del PO como hace `qc/upload`.
- Permanecen rutas P0 de maestros, variantes, componentes, uploads y cotizaciones pendientes según `API_SERVICE_ROLE_AUDIT_2026-10-15.md`.
- La validez del esquema y del commit desplegado no se verificó contra producción.

## Documentos Maestros

Conservar para una actualización posterior: adopción uniforme de `requireApiAccess`, autorización previa al parseo de cargas grandes, semántica `401/403`, política conservadora `ADMIN/MANAGER`, exclusión temporal de `DEVELOPMENT`, y deuda de transacciones, límites y autorización QC por cliente. No actualizar los Documentos Maestros hasta completar y aprobar la fase de contención.
