# 📘 Production Tracker – Documento Maestro (v4.0)
Versión consolidada para continuar el proyecto en una conversación limpia.

---

## 1. Objetivo General del Sistema
El **Production Tracker** es una plataforma interna multiusuario diseñada para gestionar:

- Purchase Orders (POs)
- Producción por líneas
- Muestras (CFM, Counter, Fitting, PPS, Testing, Shipping…)
- Importación y exportación de datos (CSV España / Excel China)
- Alertas automáticas
- Paneles visuales (Dashboard)
- Flujo de aprobación y seguimiento

---

## 2. Arquitectura Tecnológica
**Frontend**
- Next.js 14 (App Router)
- React + Hooks
- TypeScript
- TailwindCSS + shadcn/ui
- ExcelJS
- Papa Parse

**Backend**
- Supabase (PostgreSQL)
- API Routes Next.js
- Policies RLS
- Edge Functions (futuro)

---

## 3. Estructura Actual del Proyecto

src/
 ├─ app/
 │   ├─ page.tsx
 │   ├─ produccion/dashboard/page.tsx
 │   ├─ produccion/import/page.tsx
 │   ├─ api/
 │   │   ├─ import-china/route.ts
 │   │   ├─ export-china/route.ts
 │   │   ├─ generar-alertas/route.ts
 │   │   ├─ alertas/route.ts
 ├─ components/
 │   ├─ dashboard/
 │   │   ├─ DashboardHeader.tsx
 │   │   ├─ DashboardCards.tsx
 │   │   ├─ ExportChina.tsx
 │   │   ├─ ImportChina.tsx
 │   │   ├─ POsTable.tsx
 │   │   ├─ FiltersBox.tsx
 │   ├─ alertas/AlertasDashboard.tsx
 ├─ services/pos.ts
 └─ types/

---

## 4. Flujo de trabajo del usuario

### 4.1 Dashboard
Métricas + filtros + exportación + importación + alertas.

### 4.2 Importación CSV España
Proceso en 4 fases:
1. Upload  
2. Validate  
3. Preview  
4. Save  

### 4.3 Exportación China
Genera Excel con columnas específicas para China.

### 4.4 Importación China
Actualiza:
- Trials
- Lasting
- Finish
- Muestras
- Campos del PO
Incluye reporte completo (avisos, errores, cambios).

---

## 5. Estado del Importador China

Funcionalidades:
- Lee ExcelJS correctamente
- Identifica SCO
- Obtiene PO, ref, style, color para reportes
- Actualiza líneas
- Actualiza muestras existentes
- No crea nuevas muestras
- Actualiza PO
- Genera reporte descargable
- Maneja celdas bloqueadas
- Maneja errores SCO inexistente

---

## 6. Sistema de Alertas

### 6.1 Lógica
`/api/generar-alertas` crea:
- Alertas por fechas vencidas
- Producción crítica
- Muestras retrasadas
- Trials sin completar

### 6.2 Dashboard alertas
Vista independiente accesible desde menú.

---

## 7. Base de datos — Tabla muestras

id | linea_pedido_id | tipo_muestra | fecha_muestra | created_at

Tipos permitidos:
- CFMS
- COUNTERS
- FITTINGS
- PPS
- TESTINGS
- SHIPPINGS

---

## 8. Roadmap

### Fase 1 — UI/UX
- Menú lateral
- Paginación
- Vista PO detallada

### Fase 2 — Producción avanzada
- Fechas teóricas
- Alertas automáticas (cron)

### Fase 3 — Aprobaciones
- Flujos por usuario
- Track cambios

### Fase 4 — Roles y permisos
- Usuarios por zona
- Auditoría completa

---

## 9. Anexos

### 9.1 Contraseña Excel China
bsg2024

---

Fin del documento maestro.
