# Seguridad P0 — fase 1 (borrados R2)

## Alcance

Esta fase protege tres endpoints destructivos identificados como P0:

- `DELETE /api/modelos/[id]/imagenes/[imageId]`
- `DELETE /api/variantes/[varianteId]/imagenes/[imageId]`
- `DELETE /api/qc/defects/photos/[id]`

No incluye despliegues, cambios de producción, migraciones SQL ni conexión al catálogo vivo.

## Decisiones

- Se añadió un control compartido que exige sesión, perfil activo y rol permitido antes de cualquier lectura con `service_role`, validación de entorno R2 o borrado.
- Sin sesión se devuelve `401`; usuario inactivo o rol insuficiente recibe `403`.
- La política inicial de estos tres borrados es `ADMIN/MANAGER`.
- El esquema versionado (`user_profiles_role_check`) admite `ADMIN`, `MANAGER`, `OPERATOR` y `VIEWER`, pero el tipo de aplicación también declara `DEVELOPMENT`. No se autoriza `DEVELOPMENT` en esta fase porque el esquema versionado no permite asignarlo. Resolverlo requiere una decisión de negocio y, si se aprueba, una migración separada. `DESARROLLO` es un nombre de área, no un rol válido.

## Pruebas

- Casos negativos del control común: sin sesión, usuario inactivo, `VIEWER` y `DEVELOPMENT` no respaldado por el esquema.
- Regresión positiva: `ADMIN` y `MANAGER` autorizados.
- Comprobación estructural de los tres handlers: el control compartido aparece antes de operaciones Supabase administrativas, acceso R2 y validación de secretos R2.

Resultados locales:

- `npm run test:security`: 8/8 pruebas superadas.
- `npx tsc --noEmit`: superado.
- `npm run build`: superado con variables de entorno ficticias; no se utilizaron credenciales ni servicios de producción.
- El build mantiene un aviso preexistente de uso de una API Node.js de Supabase en Edge Runtime.
- `npm ci` informó de 61 vulnerabilidades en el árbol de dependencias (2 bajas, 8 moderadas, 50 altas y 1 crítica). No se ejecutó `npm audit fix` porque supondría cambios de dependencias fuera del alcance y debe revisarse por separado.

## Riesgos restantes

- Quedan trece rutas P0 y todas las P1/P2 del informe pendientes.
- Los borrados R2 + BD siguen sin ser atómicos: si R2 se borra y la BD falla, puede quedar una referencia rota.
- No se ha confirmado el constraint ni el commit realmente desplegado; solo se ha usado el esquema versionado local.
- Las políticas de alcance por modelo/cliente y la posible participación futura de `DEVELOPMENT` requieren decisión funcional explícita.

## Documentos Maestros

Conservar para la actualización futura: patrón `requireApiAccess`, semántica `401/403`, política conservadora `ADMIN/MANAGER`, discrepancia de rol y deuda de compensación R2/BD. No actualizar los Documentos Maestros hasta completar y aprobar la fase de contención.
