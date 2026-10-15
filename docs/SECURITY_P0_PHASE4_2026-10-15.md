# Seguridad P0 — fase 4 (alcance QC por cliente canónico)

## Alcance

Esta fase protege y unifica la autorización de las cargas QC en:

- `POST /api/qc/upload`.
- `POST /api/qc/defects/upload`.
- `POST /api/qc/defects/photos/upload`.

No incluye despliegues, integración en `main`, conexiones o cambios en producción,
operaciones reales contra R2, migraciones SQL ni modificación de datos históricos.

## Política confirmada

- `ADMIN/MANAGER` tienen acceso global, incluidas inspecciones heredadas sin PO.
- `OPERATOR` solo puede actuar cuando el cliente canónico de `pos.customer`
  coincide con uno de sus clientes activos en `user_customer_assignments`.
- La comparación normaliza mayúsculas/minúsculas, espacios iniciales/finales y
  secuencias de espacios. No usa coincidencia aproximada, alias ni eliminación de
  signos.
- Para `OPERATOR` se deniega el acceso si falta la relación con el PO, el PO no
  existe, el cliente canónico está vacío o `qc_inspections.customer` contiene un
  cliente distinto del canónico tras normalización.
- `VIEWER`, roles no permitidos, usuarios inactivos y peticiones sin sesión se
  rechazan mediante el control compartido de API.

## Implementación

- La política pura de comparación y alcance reside en `src/lib/qc-access-policy.ts`.
- La resolución servidor de `defecto -> inspección -> PO -> cliente` reside en
  `src/lib/qc-access.ts` y se comparte entre ambas rutas de imágenes de defectos.
- Las tres rutas ejecutan el control de sesión y rol antes de parsear el formulario.
- Las rutas de imágenes resuelven el alcance del defecto antes de leer el contenido
  del archivo, subir a R2 o insertar `qc_defect_photos`.
- La carga de Excel mantiene la lectura necesaria para identificar el PO, pero
  comprueba el alcance antes del upsert de inspección, el reemplazo de defectos y
  cualquier carga R2.

## Pruebas y verificación

- Pruebas positivas para `ADMIN/MANAGER` sobre inspecciones heredadas y para
  `OPERATOR` asignado al cliente canónico.
- Pruebas negativas para operador fuera de alcance, ausencia de cliente canónico,
  discrepancia de clientes y `VIEWER`.
- Regresiones estructurales que exigen autorización previa al parseo y comprobación
  de alcance previa a R2 y a las mutaciones de base de datos.
- `npm run test:security`: 39/39 pruebas superadas.
- `npx tsc --noEmit`: superado.
- `npm run build`: superado con credenciales ficticias. Conserva el aviso
  preexistente de Supabase sobre una API Node.js en Edge Runtime.
- Los primeros intentos quedaron bloqueados por residuos de `.next` y por la red
  aislada al descargar Inter. Se eliminó únicamente el artefacto local `.next` y
  se repitió el build con acceso de red; no se usaron credenciales ni servicios de
  producción.

## Deuda técnica registrada

`qc_inspections.customer` se alimenta actualmente desde el Excel, mientras que la
autorización canónica se basa en `pos.customer`. Esta fase no corrige datos
históricos ni cambia el proceso de importación. La reconciliación y normalización
de clientes debe analizarse como una intervención separada para evitar reasignar
inspecciones o alterar su significado histórico.

Las operaciones R2 y base de datos siguen sin ser atómicas. Un fallo parcial puede
dejar objetos huérfanos; la compensación o transacción correspondiente permanece
como mejora posterior.
