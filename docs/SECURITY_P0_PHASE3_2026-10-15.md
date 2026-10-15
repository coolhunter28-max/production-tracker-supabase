# Seguridad P0 — fase 3 (maestros, componentes, imágenes y cotizaciones)

## Alcance

Esta fase aplica el control compartido `requireApiAccess` a doce handlers de mutación:

- `POST /api/modelos`: creación de modelo y primera variante.
- `PATCH /api/modelos/[id]`: modificación de modelo.
- `PATCH/DELETE /api/variantes/[varianteId]`: modificación o borrado en cascada de variante.
- `POST /api/variantes/[varianteId]/componentes`: creación de componente.
- `PATCH/DELETE /api/variantes/[varianteId]/componentes/[compId]`: modificación o borrado de componente.
- `POST /api/modelos/[id]/imagenes/upload`: carga R2 y cambio de imagen principal del modelo.
- `POST /api/variantes/[varianteId]/imagenes/upload`: carga R2 y posible cambio de imagen principal de variante.
- `POST /api/cotizaciones`: creación de cotización.
- `POST /api/cotizaciones/[cotizacionId]/duplicate`: duplicación de cotización.
- `PATCH /api/cotizaciones/[cotizacionId]`: modificación y promoción opcional a precio maestro.

No incluye despliegues, integración en `main`, conexiones o cambios en producción, operaciones contra R2, migraciones SQL ni cambios en `qc/upload`.

## Cambios y decisiones

- Los doce handlers exigen sesión válida, perfil activo y rol `ADMIN/MANAGER` antes de parsear el cuerpo, consultar con `service_role`, validar secretos R2 o iniciar efectos secundarios.
- Sin sesión se devuelve `401`; usuario inactivo o rol insuficiente recibe `403` mediante el helper común.
- La política coincide con el acceso actual al área `/desarrollo`, limitada a `ADMIN/MANAGER`; no se elimina un permiso funcional expuesto por la interfaz.
- `created_by` de las cotizaciones nuevas y duplicadas se deriva del correo de la sesión autorizada. Ya no se acepta la identidad enviada en el cuerpo ni se hereda la del registro original.
- El `PATCH` de cotizaciones autoriza al inicio. Se elimina la ventana en la que una actualización podía ejecutarse antes de comprobar identidad y rol.
- La promoción a precio maestro conserva el comportamiento funcional para `ADMIN/MANAGER`. No se habilita `DEVELOPMENT` y no se trata `DESARROLLO` como rol.
- Las lecturas P1/P2 no se ampliaron al aplicar estos cambios. Protegerlas requiere definir alcance por cliente y área, y queda fuera de esta fase P0.

## Pruebas y verificación

- Se añadieron comprobaciones estructurales por método para los doce handlers. Cada una exige que `requireApiAccess` aparezca antes de `req.json()`, `req.formData()`, la primera operación Supabase, `assertEnv()` y `getR2Client()` cuando correspondan.
- Las pruebas comunes cubren ausencia de sesión (`401`), usuario inactivo (`403`), rol insuficiente (`403`), autorización positiva de `ADMIN/MANAGER` y rechazo de `DEVELOPMENT`.
- Se añadieron regresiones para confirmar que el autor de una cotización nueva o duplicada procede de la sesión y que la promoción no contiene autorización para `DESARROLLO` o `DEVELOPMENT`.
- `npm run test:security`: 28/28 pruebas superadas.
- `npx tsc --noEmit`: superado.
- `npm run build`: superado con credenciales ficticias. El build conserva el aviso preexistente de uso de una API Node.js de Supabase en Edge Runtime.
- El primer intento de build quedó bloqueado por la red aislada al descargar Inter desde Google Fonts; se repitió con acceso de red y terminó correctamente. No se usaron credenciales ni servicios de producción.

## Riesgos y pendientes

- `POST /api/qc/defects/upload` sigue siendo P0: carga R2 y escribe en BD sin autorización local. Debe alinearse con la política por cliente de `qc/defects/photos/upload`; no se modificó porque habilitar `OPERATOR` exige preservar ese alcance funcional.
- `POST /api/qc/upload` permanece intacto. Ya aplica `ADMIN/MANAGER/OPERATOR` con restricción por cliente y no debe homogeneizarse sin una decisión específica.
- La actualización de una cotización y su promoción a precio maestro no forman una transacción única. Si falla la promoción, los cambios previos de la cotización pueden permanecer.
- Las cargas R2 y sus escrituras de BD no son atómicas; un fallo parcial puede dejar objetos huérfanos o referencias incompletas.
- El borrado de variantes confía en cascadas de BD y no se ha verificado contra el catálogo vivo.
- Siguen pendientes las rutas de lectura P1/P2 de modelos, variantes, componentes, precios y cotizaciones, que requieren una política explícita de visibilidad por cliente/área.
- La validez del esquema y el commit realmente desplegado no se verificó contra producción.

## Documentos Maestros

Conservar para una actualización posterior: autorización uniforme antes de cualquier parseo o efecto privilegiado, política conservadora `ADMIN/MANAGER`, autor de cotización derivado de sesión, exclusión de `DEVELOPMENT/DESARROLLO`, y deuda de transacciones, compensación R2/BD y alcance por cliente. No actualizar los Documentos Maestros hasta completar y aprobar la contención restante.
