# 📘 Production Tracker — Documento Maestro v5.0  
**Proyecto completo, actualizado y listo para continuar en conversación limpia**

---

# 1. Objetivo del sistema  
El Production Tracker es una plataforma interna para gestionar **pedidos (POs)**, **producción**, **muestras**, **alertas automatizadas**, **importación/exportación de datos**, y **seguimiento por fábricas**, totalmente integrada con **Supabase** y **Next.js 14**.

Busca reemplazar los excels operativos de España y China mediante un sistema:

- multiusuario  
- con control de validación y dependencias  
- con automatización de fechas y alertas  
- con histórico y trazabilidad  

---

# 2. Arquitectura Tecnológica

## 2.1 Frontend  
**Next.js 14 App Router**  
- React Server Components + Client Components  
- TailwindCSS  
- ShadCN UI  
- ExcelJS (exportación/importación)  

## 2.2 Backend  
**API Routes con Next.js**, ejecutadas como serverless functions.

## 2.3 Base de Datos  
**Supabase (PostgreSQL)** con:
- Row Level Security
- Policies personalizadas
- Relaciones: pos → lineas_pedido → muestras

---

# 3. Estructura del Proyecto (src/)

```
src/
 ├─ app/
 │   ├─ produccion/
 │   │   ├─ dashboard/         ← Dashboard General
 │   │   │   └─ page.tsx
 │   │   ├─ import/            ← Importador CSV España
 │   │   └─ po/[id]/           ← Vista Detalle del PO (pendiente)
 │   ├─ api/
 │   │   ├─ import-china/
 │   │   │   └─ route.ts
 │   │   ├─ export-china/
 │   │   │   └─ route.ts
 │   │   ├─ alertas/
 │   │   │   └─ route.ts
 │   │   ├─ generar-alertas/
 │   │   │   └─ route.ts
 │   │   └─ pos/
 │   │       └─ route.ts
 │   └─ page.tsx
 ├─ components/
 │   ├─ dashboard/
 │   │   ├─ DashboardHeader.tsx
 │   │   ├─ DashboardCards.tsx
 │   │   ├─ POsTable.tsx
 │   │   ├─ ExportChina.tsx
 │   │   ├─ ImportChina.tsx
 │   │   └─ FiltersBox.tsx
 │   └─ alertas/
 │       └─ AlertasDashboard.tsx
 ├─ services/
 │   └─ pos.ts
 └─ types/
     └─ index.ts
```

---

# 4. Modelo de Base de Datos Completo

## 4.1 Tabla **pos**  
Representa un pedido principal:

```
id (uuid) PK
po (text)
customer (text)
supplier (text)
factory (text)
season (text)
inspection (date)
booking (date)
closing (date)
shipping_date (date)
created_at (timestamp)
updated_at (timestamp)
```

---

## 4.2 Tabla **lineas_pedido**  
Representa cada SKU o referencia del PO.

```
id (uuid) PK
po_id (uuid) FK → pos.id
reference (text)
style (text)
color (text)
qty (integer)
sco (text) ← ID único usado por China
trial_upper (date)
trial_lasting (date)
lasting (date)
finish_date (date)
created_at
updated_at
```

---

## 4.3 Tabla **muestras**

```
id (uuid)
linea_pedido_id (uuid) FK
tipo_muestra (enum: CFMS, COUNTERS, FITTINGS, PPS, TESTINGS, SHIPPINGS)
fecha_muestra (date)
created_at
updated_at
```

Notas:
- Las muestras **solo se crean en el importador CSV España**.
- China **no puede crear muestras**, solo actualizar.

---

# 5. Módulo Importador CSV España (Fase 3 completado)

## Flujo de 4 pasos (UI)
1. **Upload**  
2. **Validate**  
3. **Preview**  
4. **Confirm Save**

### Comportamiento clave:
✔ Detección de nuevos POs  
✔ Detección de líneas nuevas  
✔ Actualización de líneas existentes  
✔ Conversión de formatos EU (1.234,56)  
✔ Fechas normalizadas a YYYY-MM-DD  
✔ Creación automática de muestras base (6 tipos)  
✔ Validación estricta antes de grabar  

---

# 6. Módulo Importador China (Completado y estable)

## 6.1 Funciones principales
✔ Lee Excel (worksheet "China")  
✔ Extrae SCO → identifica línea exacta  
✔ Extrae PO, Ref, Style, Color para reporte  
✔ Actualiza:  
- trials  
- lasting  
- finish_date  
- fechas de muestras  
- campos del PO (booking, inspection, closing, shipping_date)  

✔ Genera un reporte completo con:
- Resumen  
- Errores  
- Avisos  
- Cambios detectados  

✔ Ignora líneas inexistentes de forma segura  
✔ No crea muestras nuevas  

---

# 7. Exportador China (v2 estable)

✔ Selección por temporadas  
✔ Exporta todas las líneas del PO  
✔ Exporta color correctamente  
✔ Funciona para 1 o múltiples temporadas  
✔ Incluye columnas exigidas por oficina de China  
✔ Archivo bloqueado salvo celdas editables  

---

# 8. Sistema de Alertas (Módulo operativo)

## Tipos de alertas implementadas:
- Fechas vencidas  
- Muestras retrasadas  
- Trials retrasados  
- Fabricación fuera de plazo  
- Falta de datos obligatorios  

## Lógica:
- Corre en `/api/generar-alertas`
- Crea registros en BD
- Dashboard específico en `/produccion/alertas`
- Contador sincronizado  
- Compatible con multicliente  

---

# 9. Dashboard General (Refactorización completada)

La pantalla `/produccion/dashboard` ahora tiene:

### ✔ Estructura limpia y modular:
- `<DashboardHeader />`
- `<DashboardCards />`
- `<ExportChina />`
- `<ImportChina />`
- `<FiltersBox />`
- `<POsTable />`

### ✔ Código dividido en componentes reutilizables  
### ✔ Más mantenible y escalable  

---

# 10. Estado Actual del Proyecto

| Módulo | Estado |
|--------|--------|
| Importador CSV España | ✔ COMPLETO |
| Importador China | ✔ COMPLETO |
| Exportador China | ✔ COMPLETO |
| Sistema de alertas | ✔ COMPLETO |
| Dashboard Producción | ✔ Refactorizado |
| Vista “Alertas” independiente | ✔ Completa |
| Refactor de componentes | ✔ En curso (80% hecho) |
| Vista Detalle PO | ❌ Pendiente |
| Fechas teóricas v2 | ❌ Pendiente |
| Sistema multiusuario | ❌ Pendiente |

---

# 11. PRÓXIMOS PASOS (Roadmap real v5.0)

## 🔵 **1. Vista Detalle del PO (Siguiente paso recomendado)**
Debe incluir:

### Cabecera del PO  
- PO, customer, supplier, factory, season  
- Fechas reales vs teóricas  

### Tabla de líneas  
- reference  
- style  
- color  
- qty  
- estado (por fechas)  

### Muestras  
- 6 fases con colores de estado  
- fechas reales  
- fechas teóricas (cuando se implementen)  

### Alertas asociadas  
- Lista filtrada solo para ese PO  

### Historial de cambios  
- proveniente del importador China y CSV  

### Acciones  
- editar línea  
- marcar muestra como recibida  
- re-generar alertas del PO  

---

## 🟣 **2. Fechas teóricas v2**
Basadas en:

- fecha_booking → +7 días = finish estimate  
- fecha de trial_upper → +X días  
- fecha_shipment → -Y días  

Se usará para:

- colorear retrasos  
- predecir carga  
- generar alertas inteligentes  

---

## 🟢 **3. Refactor Final del Dashboard (parte ligera pendiente)**
Mover:

- lógica de alertas → componente dedicado  
- lógica de cargas → servicio `/services/pos.ts`  
- separar búsqueda por texto  

---

## 🔴 **4. Multiusuario**
Configuración recomendada:

- Supabase Auth  
- Roles: admin / manager / China / viewer  
- Restricción por cliente

---

# 12. Apéndice A — APIs Documentadas

## `/api/import-china`  
POST → sube Excel → procesa → devuelve reporte.

## `/api/export-china`  
GET → genera Excel filtrado por temporadas.

## `/api/alertas`  
GET → lista alertas.  
POST → crear alerta manual (opcional futuro).

## `/api/generar-alertas`  
POST → ejecuta algoritmo completo.

## `/api/pos`  
GET → devuelve todos los POs con líneas y muestras.

---

# 13. Apéndice B — Servicios

### `/services/pos.ts`
Carga todos los POs, con joins necesarios para el dashboard.

---

# 14. Apéndice C — Tipos (TypeScript)

### PO
```
id
po
customer
supplier
factory
season
lines: LineaPedido[]
```

### LineaPedido
```
id
reference
style
color
qty
muestras: Muestra[]
```

### Muestra
```
id
tipo_muestra
fecha_muestra
```

---

# 15. FIN DEL DOCUMENTO  
Versión **v5.0**  
Actualizado siguiendo el estado real del proyecto tras refactorizaciones.


