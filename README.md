# Production Tracker RP

Sistema de gestión (RP) para el control de pedidos, alertas, inspecciones y muestras en un entorno de producción.

---

## 1. Objetivo del Proyecto
El proyecto tiene como finalidad centralizar en una sola aplicación:
- Pedidos de compra (POs).
- Alertas de producción, muestras y ETD.
- Inspecciones y reports de calidad.
- Edición y visualización de datos clave en un **dashboard**.

---

## 2. Tecnologías Utilizadas
- **Next.js 14** → framework frontend.
- **Supabase** → backend como servicio, con base de datos Postgres y autenticación.
- **Excel + VBA (fase intermedia)** → macros utilizadas para importar inspecciones antes de migrar el módulo a RP.

---

## 3. Módulos del Sistema
### 3.1. Módulo Alertas
- Dashboard con todas las alertas vivas (muestras, producción, ETD).
- Funcionalidades: filtros, búsqueda, fechas coloreadas, botón **Descartar**.
- Estado: ✅ Funcional.

### 3.2. Módulo POs
- Vista para **editar** y **ver** pedidos de compra.
- Se pueden gestionar: cabecera, líneas y muestras.
- Estado: ✅ Funcional.

### 3.3. Módulo Inspecciones
**Etapa actual (Excel + VBA):**
- Macro para importar reportes a la tabla master.
- Campo Inspector incorporado.
- Estado: en pruebas finales.

**Etapa futura (RP con Next.js + Supabase):**
- Formulario web para cargar inspecciones.
- Registro directo en Supabase (`inspections`).
- Dashboard de reportes vinculado a POs.

---

## 4. Base de Datos (Supabase)
### Tabla: `pos`
| Columna       | Tipo       | Descripción                |
|---------------|-----------|----------------------------|
| id            | uuid      | Identificador único        |
| po            | text      | Número de PO               |
| customer      | text      | Cliente                    |
| supplier      | text      | Proveedor                  |
| factory       | text      | Fábrica                    |
| channel       | text      | Canal                      |
| po_date       | date      | Fecha de pedido            |
| etd_pi        | date      | Fecha estimada PI          |
| booking       | date      | Fecha de booking           |
| closing       | date      | Fecha de closing           |
| shipping_date | date      | Fecha de envío             |
| created_at    | timestamp | Creación                   |
| updated_at    | timestamp | Última actualización       |

### Tabla: `lineas_pedido`
| Columna        | Tipo       | Descripción                |
|----------------|-----------|----------------------------|
| id             | uuid      | Identificador único        |
| po_id          | uuid      | FK → pos.id                |
| reference      | text      | Referencia                 |
| style          | text      | Estilo                     |
| color          | text      | Color                      |
| size_run       | text      | Tallaje                    |
| qty            | int       | Cantidad                   |
| price          | numeric   | Precio unitario            |
| amount         | numeric   | Importe total              |
| category       | text      | Categoría                  |
| trial_upper    | date      | Trial upper                |
| trial_lasting  | date      | Trial lasting              |
| lasting        | date      | Lasting                    |
| finish_date    | date      | Fecha finalización         |
| inspection     | date      | Fecha inspección           |
| estado_inspeccion | text   | Estado de la inspección    |
| created_at     | timestamp | Creación                   |
| updated_at     | timestamp | Última actualización       |

### Tabla: `muestras`
| Columna       | Tipo       | Descripción                |
|---------------|-----------|----------------------------|
| id            | uuid      | Identificador único        |
| linea_pedido_id | uuid    | FK → lineas_pedido.id      |
| tipo_muestra  | text      | Tipo (PPS, Counter, etc.)  |
| round         | int       | Ronda de muestra           |
| fecha_muestra | date      | Fecha                      |
| estado_muestra| text      | Estado                     |
| notas         | text      | Observaciones              |
| created_at    | timestamp | Creación                   |
| updated_at    | timestamp | Última actualización       |

### Tabla: `alertas`
| Columna       | Tipo       | Descripción                |
|---------------|-----------|----------------------------|
| id            | uuid      | Identificador único        |
| tipo          | text      | Tipo de alerta             |
| subtipo       | text      | Subtipo de alerta          |
| mensaje       | text      | Descripción                |
| fecha         | date      | Fecha de alerta            |
| fecha_limite  | date      | Fecha límite               |
| es_estimada   | bool      | Si la fecha es estimada    |
| po_id         | uuid      | FK → pos.id                |
| linea_id      | uuid      | FK → lineas_pedido.id      |
| muestra_id    | uuid      | FK → muestras.id           |
| leida         | bool      | Estado (descartada o no)   |
| created_at    | timestamp | Creación                   |
| updated_at    | timestamp | Última actualización       |

---

## 5. Flujo de Usuario
1. El usuario crea un **PO**.
2. Añade **líneas de pedido**.
3. Se generan automáticamente las **alertas**.
4. El inspector introduce los datos de inspección.
5. El dashboard centraliza y muestra todo en tiempo real.

---

## 6. Problemas Detectados y Soluciones
- **Chrome consume >5GB RAM** con historiales largos.  
  → Solución: trabajar con módulos separados y usar **git** para versiones.  
- **Riesgo de romper pantallas al modificar encabezados.**  
  → Solución: trabajar con **branches** en git antes de integrar cambios.

---

## 7. Pendientes / Roadmap
- [ ] Ajustar encabezados de `trials` y `lasting` en editor de POs.
- [ ] Migrar módulo inspecciones de Excel a RP.
- [ ] Documentar nuevas tablas Supabase.
- [ ] Optimizar filtros de dashboards.
- [ ] Reportes avanzados.

---

## 8. Seguridad / Dependencias
- **xlsx** presenta vulnerabilidades conocidas:
  - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
  - ReDoS (GHSA-5pgg-2g8v-p4x9)
- Estado: **no existe fix oficial disponible**.
- Mitigación: uso limitado a importaciones internas → riesgo bajo.
- Acción futura: actualizar a la última versión en cuanto esté disponible:
  ```bash
  npm install xlsx@latest
  ```

---

## 9. Cómo Ejecutar el Proyecto
```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Compilación producción
npm run build
npm start
```

---

## 10. Cómo Hacer Backup en Git
```bash
# Inicializar git (solo la primera vez)
git init
git branch -M main
git remote add origin https://github.com/coolhunter28-max/production-tracker-supabase.git

# Guardar cambios
git add .
git commit -m "Backup estable del proyecto"

# Subir al repositorio
git push -u origin main
```

---

📌 **Notas finales**  
Este README se irá actualizando a medida que avancemos con la migración del módulo de inspecciones y la optimización de dashboards.
## Documentación interna

- [Documento maestro del Production Tracker](./docs/production-tracker-documento-maestro.md)
