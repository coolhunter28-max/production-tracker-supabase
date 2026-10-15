# Seguridad P0 — consolidación previa a integración

Fecha: 2026-10-15 (Europe/Madrid)
Rama revisada: `security/p0-r2-delete-guards`
Commit revisado: `f60a9d509c8ace1ee0d54ae987f22271c2353c69`
Base: `main` en `607833b132a79091a94e995625137e10263c47a1`

## Alcance y límites

Revisión estática exhaustiva de las 16 entradas P0 de
`API_SERVICE_ROLE_AUDIT_2026-10-15.md`, sus 18 handlers HTTP, el control compartido,
la política QC y las pruebas añadidas en las fases 1 a 4. También se revisaron como
rutas relacionadas `POST /api/qc/upload`,
`POST /api/qc/defects/photos/upload` y
`POST /api/variantes/[varianteId]/componentes`.

No se conectó a producción, Supabase ni R2. No se ejecutó SQL. No se integró en
`main` ni se desplegó. Este informe no confirma el commit desplegado ni la existencia
de controles externos no versionados.

## Conclusión ejecutiva

- Las 16 entradas P0 originales, que representan 18 handlers, tienen ahora una
  comprobación de sesión, usuario activo y rol antes de parsear el body, consultar
  mediante el cliente administrativo o iniciar operaciones R2.
- No se encontró una mutación P0 original todavía anónima en el commit revisado.
- Las cargas QC permiten `OPERATOR` únicamente después de resolver el cliente
  canónico del PO. Las mutaciones restantes usan la política conservadora
  `ADMIN/MANAGER`.
- La rama dispone ahora de pruebas HTTP de los 23 handlers P0/relacionados con
  Supabase y R2 simulados, y las cargas de fotos QC validan tamaño, MIME y firma.
  Todavía falta un ensayo de despliegue/rollback. Las lecturas P1/P2 abiertas
  permanecen fuera de esta consolidación y siguen siendo bypass de RLS con
  `service_role`.

## Matriz final de cobertura P0

| # | Ruta y método | Política efectiva | Orden de control | Cobertura actual | Estado |
|---:|---|---|---|---|---|
| 1 | `DELETE /api/modelos/[id]/imagenes/[imageId]` | `ADMIN/MANAGER` | Guardia antes de Supabase, configuración y R2 | Estructural + política común | Cubierto |
| 2 | `DELETE /api/variantes/[varianteId]/imagenes/[imageId]` | `ADMIN/MANAGER` | Guardia antes de Supabase, configuración y R2 | Estructural + política común | Cubierto |
| 3 | `DELETE /api/qc/defects/photos/[id]` | `ADMIN/MANAGER` | Guardia antes de lectura administrativa y R2 | Estructural + política común | Cubierto |
| 4 | `PATCH /api/variantes/[varianteId]` | `ADMIN/MANAGER` | Guardia antes de body y Supabase | Estructural + política común | Cubierto |
| 5 | `DELETE /api/variantes/[varianteId]` | `ADMIN/MANAGER` | Guardia antes de Supabase y borrado | Estructural + política común | Cubierto |
| 6 | `PATCH /api/variantes/[varianteId]/componentes/[compId]` | `ADMIN/MANAGER` | Guardia antes de body y Supabase | Estructural + política común | Cubierto |
| 7 | `DELETE /api/variantes/[varianteId]/componentes/[compId]` | `ADMIN/MANAGER` | Guardia antes de Supabase y borrado | Estructural + política común | Cubierto |
| 8 | `POST /api/qc/import` | `ADMIN/MANAGER` | Guardia antes de multipart, Excel y Supabase | Estructural + política común | Cubierto |
| 9 | `POST /api/qc/defects/upload` | `ADMIN/MANAGER`; `OPERATOR` por cliente canónico | Rol antes de multipart; alcance antes de leer el fichero, R2 e insert | Estructural + política QC | Cubierto |
| 10 | `POST /api/modelos/[id]/imagenes/upload` | `ADMIN/MANAGER` | Guardia antes de entorno, multipart, Supabase y R2 | Estructural + política común | Cubierto |
| 11 | `POST /api/variantes/[varianteId]/imagenes/upload` | `ADMIN/MANAGER` | Guardia antes de entorno, multipart, Supabase y R2 | Estructural + política común | Cubierto |
| 12 | `POST /api/modelos` | `ADMIN/MANAGER` | Guardia antes de body y Supabase | Estructural + política común | Cubierto |
| 13 | `PATCH /api/modelos/[id]` | `ADMIN/MANAGER` | Guardia antes de body y Supabase | Estructural + política común | Cubierto |
| 14 | `POST /api/catalogos/import-feeder` | `ADMIN/MANAGER` | Guardia antes de multipart, Excel y Supabase | Estructural + política común | Cubierto |
| 15 | `POST /api/variantes/feeder` | `ADMIN/MANAGER` | Guardia antes de body y Supabase | Estructural + política común | Cubierto |
| 16 | `POST /api/cotizaciones` | `ADMIN/MANAGER`; autor desde sesión | Guardia antes de body y Supabase | Estructural + política común | Cubierto |
| 17 | `POST /api/cotizaciones/[id]/duplicate` | `ADMIN/MANAGER`; autor desde sesión | Guardia antes de body y Supabase | Estructural + política común | Cubierto |
| 18 | `PATCH /api/cotizaciones/[id]` | `ADMIN/MANAGER` | Guardia antes de body, update, promoción y evento | Estructural + política común | Cubierto |

La numeración 1–18 desglosa los métodos combinados de la matriz original; son 19
handlers porque la entrada de componentes contiene `PATCH` y `DELETE`. Las rutas
relacionadas revisadas también están protegidas:

- `POST /api/qc/upload`: rol antes de parsear; cliente canónico antes de lecturas
  operativas posteriores, mutaciones y R2.
- `POST /api/qc/defects/photos/upload`: misma política por cliente que la carga
  alternativa de fotos.
- `POST /api/variantes/[varianteId]/componentes`: `ADMIN/MANAGER` antes de lectura
  y escritura.

## Pendientes y riesgos

### Prioridad alta antes de despliegue

1. **Operaciones no atómicas.** Borrados y cargas combinan R2 y base de datos sin
   compensación. Las importaciones, el reemplazo QC y la promoción de cotización
   también pueden dejar estado parcial.
2. **Lecturas P1/P2 aún abiertas.** Varias rutas con `service_role` siguen devolviendo
   precios, clientes, pedidos, QC o metadatos sin auth local. No son parte de las 16
   mutaciones P0, pero impiden considerar cerrada la auditoría global.
3. **Multipart se materializa antes del alcance QC.** La sesión y el rol se validan
   antes de `formData()`, pero el `defect_id` está dentro del multipart; por ello un
   `OPERATOR` autenticado fuera de alcance puede consumir el coste de parseo antes
   del `403`. El fichero queda limitado a 15 MB una vez parseado, pero un límite de
   petición en proxy/plataforma sigue siendo recomendable.

### Política y compatibilidad a ratificar

1. `DEVELOPMENT` puede acceder al área de desarrollo según el tipo y helpers de la
   aplicación, pero las nuevas mutaciones solo admiten `ADMIN/MANAGER`; además, el
   constraint versionado no admite `DEVELOPMENT`. No se debe ampliar el rol sin una
   decisión funcional y migración separada.
2. `POST /api/qc/import` es exclusivo de `ADMIN/MANAGER`, mientras
   `POST /api/qc/upload` permite `OPERATOR` con alcance canónico. La diferencia es
   conservadora, pero debe documentarse como política de producto.
3. La carga de fotos QC permite al operador con alcance; su borrado permanece
   exclusivo de `ADMIN/MANAGER`. Es una separación de privilegios segura, aunque
   puede producir una regresión de flujo si negocio esperaba que el operador pudiera
   corregir una foto equivocada.
4. El `created_by` de cotizaciones ahora es el correo autenticado. Es una mejora de
   integridad deliberada, pero cambia el comportamiento de clientes que enviaban ese
   campo manualmente.

### Endurecimiento posterior

- Añadir rate limiting, límites comunes de body/filas/arrays, validación de MIME por
  contenido y nombres de objeto generados sin incorporar nombres de fichero crudos.
- Eliminar `select("*")` y claves R2 de respuestas que no las necesiten.
- Sustituir el cliente administrativo por sesión/RLS donde sea viable.
- Añadir auditoría de actor, acción, entidad y resultado en mutaciones críticas.

## Correcciones P0 finales aplicadas

Se aplicaron dos cambios acotados que no alteran las reglas de roles:

1. Pruebas que invocan los 23 handlers P0 y relacionados con Supabase, R2 y AWS
   simulados. Cada handler cubre `401` sin sesión, `403` para usuario inactivo,
   `403` por rol insuficiente y el paso positivo de un `ADMIN` activo. Los rechazos
   verifican cero lecturas de body y cero llamadas a Supabase/R2.
2. Las dos cargas de fotos QC aceptan únicamente JPEG, PNG y WebP de hasta 15 MB,
   política ya usada por las cargas de modelos/variantes. Validan además la firma
   binaria antes de R2, rechazan ficheros vacíos y generan extensiones desde el MIME
   validado en vez de reutilizar `file.name`.

La posible autorización de `DEVELOPMENT`, la capacidad de borrado para `OPERATOR` y
la unificación de los dos flujos de importación QC sí cambian reglas funcionales y
requieren confirmación explícita antes de editar código.

## Verificación local

- `npm run test:security`: **133/133** superadas. El runner muestra avisos de Node
  por la API experimental de mock de módulos y por la forma antigua `namedExports`
  exigida por los tipos instalados; no afectan al resultado.
- `npx tsc --noEmit`: **superado**.
- `npm run build`: **superado** con variables ficticias y acceso de red únicamente
  para descargar Inter desde Google Fonts.
- Aviso conservado: uso de una API Node.js de Supabase en Edge Runtime.
- No se usaron credenciales ni servicios de producción.

## Plan de integración y despliegue gradual

### Puerta 1 — completar evidencia en la rama

1. Hacer revisión independiente del diff `main...security/p0-r2-delete-guards`.
2. Registrar explícitamente la decisión sobre `DEVELOPMENT` y las asimetrías QC.

### Puerta 2 — ensayo aislado

1. Integrar en una rama de release, nunca directamente en producción.
2. Desplegar en staging con credenciales y buckets exclusivos de staging.
3. Ejecutar smoke tests negativos sobre las 18 mutaciones: sin sesión, inactivo,
   `VIEWER`, rol fuera de política y `OPERATOR` fuera de cliente.
4. Ejecutar smoke tests positivos con datos desechables: `ADMIN`, `MANAGER` y, solo
   en QC, `OPERATOR` asignado. Confirmar respuesta, fila y objeto esperados.
5. Probar fallos inducidos de BD y R2 para documentar objetos huérfanos y el
   procedimiento manual de reconciliación.

### Puerta 3 — despliegue gradual

1. Crear artefacto inmutable a partir del commit aprobado y registrar su SHA.
2. Desplegar primero a una fracción mínima o instancia canary si la plataforma lo
   permite.
3. Ejecutar inmediatamente smoke tests no destructivos de sesión/rol y un conjunto
   destructivo únicamente con datos sintéticos previamente identificados.
4. Observar errores `401/403/5xx`, latencia, memoria, llamadas R2 y fallos de
   importación durante una ventana acordada.
5. Ampliar el tráfico solo si no hay regresiones. Mantener las lecturas P1/P2 como
   riesgo abierto con un plan y plazo separados.

## Rollback

1. Conservar el artefacto y SHA de la versión anterior.
2. Ante aumento de `5xx`, bloqueo de roles válidos, corrupción parcial o fallos R2,
   revertir el tráfico al artefacto anterior; no hacer cambios SQL improvisados.
3. Detener mutaciones afectadas durante la reversión si existe riesgo de doble
   escritura.
4. Comparar objetos R2 y filas creadas/borradas durante la ventana mediante IDs de
   prueba y logs; reconciliar manualmente solo después de identificar el lado
   autoritativo.
5. Repetir los smoke tests negativos y positivos contra la versión restaurada y
   documentar el incidente antes de reintentar.

## Criterio de aprobación

La rama puede considerarse **lista para revisión de integración** desde el punto de
vista de pruebas P0 y límites de carga. La aprobación funcional de roles/asimetrías
QC y los smoke tests de staging siguen siendo puertas previas al despliegue. No debe
describirse producción como protegida hasta confirmar el SHA desplegado y completar
el despliegue autorizado.
