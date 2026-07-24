Production Tracker
Documento Maestro v8.0

Parte I

Arquitectura (Filosofía)

Capítulo 1 — Identidad del Proyecto
1. Propósito del documento

Este documento constituye la fuente de verdad arquitectónica de Production Tracker.

Su objetivo es preservar el conocimiento funcional y técnico del sistema para garantizar su evolución de forma coherente, independientemente del equipo de desarrollo, del tiempo transcurrido o del historial de conversaciones.

Toda decisión arquitectónica deberá ser compatible con este documento.

Si durante el desarrollo se descubre una solución mejor, primero deberá actualizarse este documento y posteriormente implementarse el cambio en el código.

Este documento no pretende describir únicamente cómo funciona Production Tracker, sino explicar por qué ha sido diseñado de esta manera.

2. ¿Qué es Production Tracker?

Production Tracker es un ERP interno diseñado específicamente para gestionar el ciclo completo de producción de una empresa del sector del calzado.

No es un ERP genérico.

No pretende adaptarse a cualquier empresa.

Su objetivo es representar con la mayor fidelidad posible la realidad operativa del negocio.

Toda decisión técnica está subordinada a este objetivo.

Cuando exista conflicto entre una solución técnicamente sofisticada y otra que represente mejor el funcionamiento real de la empresa, prevalecerá siempre la segunda.

3. Misión

Production Tracker existe para proporcionar una representación única, consistente y fiable del estado de la producción.

El sistema debe permitir que cualquier usuario conozca, en cualquier momento:

qué está ocurriendo;
dónde está ocurriendo;
por qué está ocurriendo;
qué requiere atención.

El sistema no existe para generar informes.

Los informes son una consecuencia de disponer de un modelo de datos correcto.

4. Visión

Production Tracker debe convertirse en la plataforma única desde la que se gestione toda la operación de la empresa.

Cada nuevo módulo deberá integrarse en un modelo común.

No deberán existir aplicaciones paralelas que mantengan información duplicada.

Toda evolución del sistema deberá reforzar esta visión.

5. Filosofía
Operations First

La prioridad absoluta del sistema es la operación diaria.

Las funcionalidades deben diseñarse pensando primero en quienes producen, compran, inspeccionan y gestionan pedidos.

Los cuadros de mando, estadísticas e indicadores nunca podrán condicionar el diseño del modelo operativo.

La operativa genera los datos.

Analytics los interpreta.

Nunca al revés.

El ERP se adapta al negocio

Production Tracker representa el funcionamiento de la empresa.

No intenta modificarlo para ajustarlo a un modelo informático.

Cuando se detecte una discrepancia entre el sistema y la realidad operativa, deberá revisarse primero el sistema.

Solo cuando el negocio confirme que el proceso debe cambiar, se modificará la operativa.

Simplicidad arquitectónica (Navaja de Ockham)

Cuando existan varias soluciones técnicamente válidas, se adoptará siempre la más sencilla que represente correctamente la realidad del negocio.

La complejidad debe estar justificada por una necesidad real.

La simplicidad no necesita justificación.

No se introducirán capas, procesos, servicios o modelos adicionales si el mismo resultado puede alcanzarse de forma más simple y mantenible.

Fuente única de verdad

Cada dato tendrá un único propietario dentro del sistema.

Ese dato podrá ser consumido por múltiples módulos, pero únicamente existirá un lugar responsable de su mantenimiento.

No se duplicarán datos para simplificar consultas.

No se recalcularán valores ya consolidados.

No existirán múltiples interpretaciones del mismo dato.

Evolución antes que revolución

Production Tracker evolucionará de forma incremental.

Las mejoras deberán construirse sobre la arquitectura existente siempre que esta siga siendo válida.

Las reescrituras completas solo estarán justificadas cuando la arquitectura actual impida representar correctamente el negocio.

La estabilidad del conocimiento acumulado tiene prioridad sobre los cambios tecnológicos.

6. Qué NO es Production Tracker

Production Tracker no es un ERP comercial.

No es un sistema genérico.

No es un Business Intelligence.

No es un Data Warehouse.

No es un CRM.

No es un gestor documental.

No pretende competir con soluciones estándar del mercado.

Es un sistema diseñado específicamente para resolver los problemas operativos de esta empresa.

7. Principios innegociables

Todas las decisiones futuras deberán respetar los siguientes principios:

La realidad del negocio tiene prioridad sobre la elegancia técnica.
La operativa tiene prioridad sobre la analítica.
Cada dato tiene un único propietario.
La simplicidad es la solución por defecto.
Las decisiones deben ser trazables y documentadas.
Ninguna mejora podrá romper la coherencia del modelo de datos.
Analytics interpreta la información; no modifica la operación.
El frontend representa la información; no implementa reglas de negocio.
La identidad de los registros nunca dependerá de su posición o contexto.
La documentación forma parte de la arquitectura del sistema.
8. Carta al futuro

Production Tracker no es únicamente un conjunto de tablas, pantallas o procesos.

Es la representación digital de la forma de trabajar de la empresa.

Cada decisión tomada durante su desarrollo persigue un único objetivo: que el sistema sea más fácil de entender, más sencillo de mantener y más fiel a la realidad del negocio.

Si en el futuro surge una solución aparentemente más sofisticada, deberá responder primero a una pregunta:

¿Hace que el sistema represente mejor el negocio o simplemente lo hace más complejo?

Si la respuesta es la segunda, esa solución no pertenece a Production Tracker.

La calidad de este ERP no se medirá por la cantidad de tecnología incorporada, sino por su capacidad para resolver problemas reales con la menor complejidad posible.

Capítulo 2 — Modelo de Dominio
2.1 Propósito del modelo

El modelo de dominio define cómo Production Tracker entiende el negocio.

No describe cómo están organizadas las tablas de la base de datos.

Describe la realidad que el ERP intenta representar.

Toda decisión técnica debe ser consecuencia de este modelo.

Nunca al contrario.

Si en algún momento la implementación entra en conflicto con el modelo de dominio, deberá revisarse la implementación.

El modelo de dominio constituye la referencia sobre la que se construyen:

la base de datos;
los importadores;
el frontend;
Analytics;
Executive;
cualquier futura evolución del sistema.
2.2 El negocio antes que el software

Production Tracker no modela documentos.

Modela actividad.

Un pedido no tiene valor por existir.

Tiene valor porque genera trabajo.

Ese trabajo produce fechas.

Las fechas producen riesgos.

Los riesgos requieren decisiones.

Por ello, el centro del sistema no son los documentos comerciales, sino la actividad operativa que generan.

2.3 El flujo natural del negocio

Production Tracker representa el negocio siguiendo su flujo real.

Cliente

↓

Campaña

↓

Modelo

↓

Pedido

↓

Línea de pedido

↓

Producción

↓

Inspecciones

↓

Expedición

↓

Entrega

Este flujo no es únicamente conceptual.

Determina toda la arquitectura del sistema.

2.4 Dos mundos diferentes

Uno de los errores más habituales en los ERP consiste en mezclar información comercial con información operativa.

Production Tracker separa ambos mundos de forma explícita.

Mundo comercial

Describe aquello que se acuerda con el cliente.

Ejemplos:

cliente
campaña
pedido
modelo
referencia
color
talla
cantidades
precios
descuentos
condiciones comerciales

Esta información cambia poco.

Debe permanecer estable.

En muchos casos queda congelada mediante snapshots.

Mundo operativo

Describe cómo se fabrica realmente el pedido.

Ejemplos:

fábrica
PI
fechas
muestras
inspecciones
incidencias
bookings
closings
ETD
producción
fabricación
seguimiento

Esta información cambia continuamente.

Es dinámica.

Representa el estado actual de la operación.

Regla arquitectónica

Nunca deben confundirse ambos mundos.

Los cambios operativos no modifican los acuerdos comerciales.

Los cambios comerciales no deben destruir el histórico operativo.

2.5 El pedido no es la unidad operativa

Esta es probablemente la decisión arquitectónica más importante del proyecto.

Históricamente muchos ERP consideran que el pedido es la unidad de trabajo.

Production Tracker no.

Un pedido únicamente agrupa información común.

La operación ocurre sobre cada una de sus líneas.

Cada línea puede:

producirse en una fábrica distinta;
tener fechas distintas;
disponer de PI diferente;
sufrir retrasos distintos;
inspeccionarse en momentos diferentes;
embarcarse en fechas distintas.

Por tanto:

La línea de pedido es la verdadera unidad operativa del sistema.

Toda evolución futura deberá respetar este principio.

2.6 El papel de la cabecera del pedido

La cabecera del pedido existe únicamente para almacenar información compartida por todas las líneas.

Su finalidad es evitar duplicidad de datos.

No representa el estado de producción.

No representa planificación.

No representa seguimiento.

No representa fabricación.

Toda información operativa pertenece a las líneas.

2.7 La línea de pedido

Cada línea representa una unidad independiente de seguimiento.

Sobre ella viven los datos que evolucionan durante la vida del pedido.

Entre otros:

fábrica
PI Number
PI BSG
Trial Upper
Trial Lasting
Lasting
Finish Date
Inspection
Booking
Closing
ETD
Shipping Date
muestras
incidencias
observaciones operativas

Toda la operativa del ERP gira alrededor de esta entidad.

2.8 Identidad

Toda entidad necesita una identidad estable.

Production Tracker distingue claramente entre:

Identidad técnica

UUID.

Es la única identidad válida para actualizar registros.

Nunca cambia.

Nunca depende del contenido.

Nunca depende del orden.

Nunca depende del Excel.

Identidad de negocio

Describe qué representa un registro.

Puede estar formada por:

cliente
campaña
PO
referencia
color
talla

Esta identidad sirve para comprender el negocio.

No sirve para escribir datos.

Identidad de integración

Durante las importaciones históricas se utiliza el SCO Legacy para localizar la línea correspondiente.

Su única finalidad es relacionar documentos externos con registros internos.

Nunca sustituye al UUID.

Nunca debe convertirse en la identidad principal del sistema.

2.9 Datos vivos y datos congelados

Production Tracker distingue dos tipos de información.

Datos vivos

Representan el presente.

Pueden modificarse.

Ejemplos:

fechas
fábrica
inspecciones
producción
bookings
muestras
Datos congelados

Representan una fotografía histórica.

No deben recalcularse.

Nunca deben modificarse automáticamente.

Los snapshots comerciales pertenecen a esta categoría.

2.10 Relaciones entre entidades

El sistema no entiende el negocio como una colección de tablas.

Lo entiende como una red de relaciones.

Cliente

↓

Campañas

↓

Modelos

↓

Pedidos

↓

Líneas

↓

Producción

↓

Incidencias

↓

Resultados

Cada entidad existe para dar contexto a la siguiente.

2.11 Qué representa realmente una línea

Una línea no representa únicamente un artículo.

Representa un compromiso de fabricación.

A partir de ella se derivan:

planificación;
seguimiento;
riesgos;
alertas;
decisiones;
análisis.

Por ello constituye la pieza central de todo el ERP.

2.12 Consecuencias arquitectónicas

Aceptar que la línea es la unidad operativa implica varias reglas obligatorias.

Regla 1

Nunca mover información operativa a la cabecera del pedido.

Regla 2

Nunca identificar una línea por su posición en un Excel.

Regla 3

Nunca utilizar el orden visual para actualizar registros.

Regla 4

Toda actualización debe realizarse utilizando la identidad estable del registro.

Regla 5

Analytics interpreta líneas.

No interpreta pedidos.

Los pedidos son agregaciones.

La realidad operativa vive en las líneas.

Regla 6

Executive resume el estado de la operación agregando información de las líneas.

Nunca al revés.

2.13 Principio de representación fiel

Production Tracker no simplifica el negocio ocultando complejidad.

La simplifica representándola correctamente.

Una arquitectura sencilla no consiste en tener menos entidades.

Consiste en que cada entidad tenga una única responsabilidad claramente definida.

Cuando cada concepto representa exactamente aquello que ocurre en la empresa, el sistema resulta más fácil de comprender, más sencillo de mantener y más robusto frente a la evolución del negocio.

Capítulo 3 — Arquitectura del Sistema
3.1 Propósito

La arquitectura de Production Tracker tiene un único objetivo:

Representar el negocio de la forma más sencilla, consistente y evolutiva posible.

Cada componente del sistema tiene una responsabilidad claramente definida.

Ningún componente debe asumir responsabilidades que pertenecen a otro.

La arquitectura se organiza por responsabilidades, no por tecnologías.

Las tecnologías pueden cambiar.

La arquitectura debe permanecer.

3.2 Principios arquitectónicos

Toda la arquitectura descansa sobre cinco principios fundamentales.

Separación de responsabilidades

Cada capa tiene una única misión.

Fuente única de verdad

Cada dato tiene un único propietario.

Sin duplicidad de lógica

Una regla de negocio solo puede existir en un lugar.

Sincronización automática

Las capas consumidoras nunca deben depender de acciones manuales.

Evolución incremental

La arquitectura debe permitir añadir nuevos módulos sin reescribir los existentes.

3.3 Visión general

Production Tracker se organiza en varias capas independientes.

                Usuarios
                    │
                    ▼
             Next.js Frontend
                    │
                    ▼
          API / Server Actions
                    │
                    ▼
          PostgreSQL (Supabase)
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
 Operativa              Analytics Sync
         │                     │
         └──────────┬──────────┘
                    ▼
            Analytics Layer
                    │
                    ▼
              Executive

Cada capa tiene una responsabilidad específica.

3.4 Infraestructura tecnológica

La tecnología utilizada responde a criterios de simplicidad, mantenibilidad y fiabilidad.

Frontend

Next.js 14 (App Router)

Responsabilidad:

interfaz de usuario;
navegación;
interacción;
representación de datos.

El frontend no implementa reglas de negocio.

Su misión es mostrar información y facilitar la interacción con el usuario.

Lenguaje

TypeScript

Toda la aplicación utiliza tipado estático para reducir errores y facilitar la evolución del código.

Estilos

TailwindCSS

Se utiliza para mantener una interfaz consistente y minimizar CSS personalizado.

Componentes

ShadCN UI

Proporciona una biblioteca de componentes reutilizables.

Los componentes representan información.

No contienen lógica de negocio.

Base de datos

Supabase PostgreSQL

Constituye el núcleo del sistema.

Es responsable de:

almacenar información;
garantizar integridad;
ejecutar reglas SQL;
mantener relaciones;
proporcionar consistencia.

Toda la información del ERP reside aquí.

Almacenamiento documental

Cloudflare R2

Responsabilidad:

documentos;
imágenes;
archivos Excel;
PDFs;
adjuntos.

Nunca almacena información de negocio.

Únicamente archivos asociados.

Control de versiones

GitHub

Todo el desarrollo del ERP se gestiona mediante Git.

GitHub constituye la fuente oficial del código.

Ningún cambio debe considerarse consolidado hasta quedar registrado en el repositorio.

El historial de Git forma parte de la trazabilidad del proyecto.

3.5 Arquitectura lógica

La arquitectura no se organiza por pantallas.

Se organiza por responsabilidades.

Capa de Persistencia

Responsable de almacenar la información.

Incluye:

tablas;
relaciones;
índices;
restricciones;
funciones SQL;
vistas.
Capa de Operación

Representa el funcionamiento diario del negocio.

Incluye:

pedidos;
líneas;
producción;
muestras;
inspecciones;
importaciones;
cronología.

Es la única capa autorizada para modificar la operación.

Capa de Sincronización

Su responsabilidad consiste en mantener actualizadas las estructuras derivadas.

Ejemplo:

Actualizar pedido

↓

Guardar datos

↓

syncAnalytics()

↓

Actualizar Analytics

Nunca modifica la operación.

Únicamente mantiene sincronizadas las capas consumidoras.

Capa Analítica

Consume información.

Nunca genera hechos nuevos.

Nunca modifica la base operativa.

Su función consiste en interpretar.

Capa de Presentación

Representa la información.

No toma decisiones.

No recalcula indicadores.

No interpreta reglas de negocio.

3.6 Flujo de escritura

Toda modificación sigue el mismo recorrido.

Usuario

↓

Frontend

↓

Server Action

↓

Base de datos

↓

Commit

↓

Sincronización

↓

Analytics

Nunca se actualizará Analytics directamente desde el navegador.

3.7 Flujo de lectura

La lectura sigue el camino inverso.

Base de datos

↓

Views

↓

Server Components

↓

Frontend

↓

Usuario

Siempre que sea posible, la información deberá llegar ya preparada desde la base de datos.

3.8 Responsabilidades
Frontend

Debe:

representar;
validar formularios;
facilitar navegación.

No debe:

recalcular negocio;
interpretar reglas;
mantener estados duplicados.
Base de datos

Debe:

mantener consistencia;
ejecutar reglas;
almacenar información.
Analytics

Debe:

resumir;
comparar;
interpretar.

Nunca escribir.

Executive

Debe responder únicamente a cuatro preguntas:

¿Qué ocurre?

¿Por qué ocurre?

¿Qué necesita atención?

¿Qué debería hacer ahora?

Nunca sustituye al usuario.

Le ayuda a decidir.

3.9 Evolución tecnológica

Las tecnologías concretas podrán evolucionar con el tiempo.

Por ejemplo:

una nueva versión de Next.js;
un cambio de proveedor de almacenamiento;
una evolución de Supabase.

Estos cambios no deberán alterar la arquitectura del sistema.

La arquitectura debe sobrevivir a la tecnología.

3.10 Reglas innegociables
Nunca escribir desde Analytics.
Nunca interpretar negocio desde React.
Nunca duplicar información para simplificar consultas.
Nunca romper la sincronización automática.
Nunca introducir complejidad si la arquitectura actual resuelve correctamente el problema.
Toda nueva funcionalidad deberá indicar claramente en qué capa reside y por qué.

Capítulo 4 — Principios de Desarrollo y Evolución
4.1 Propósito

Este capítulo define las normas que deben seguirse durante el desarrollo de Production Tracker.

No son recomendaciones.

Son reglas arquitectónicas.

Su objetivo es garantizar que el sistema pueda evolucionar durante años manteniendo la coherencia del modelo, la simplicidad de la solución y la estabilidad de la operación.

Toda modificación deberá ser compatible con estas normas.

4.2 La documentación forma parte del sistema

En Production Tracker, la documentación no es un elemento auxiliar.

Forma parte de la arquitectura.

Una decisión arquitectónica no se considera consolidada hasta quedar reflejada en el Documento Maestro o en el documento correspondiente.

Regla

Si una mejora modifica la arquitectura del sistema:

Se actualiza la documentación.
Se implementa el cambio.
Se verifica que ambos permanezcan sincronizados.

La documentación nunca debe ir por detrás del código.

4.3 El negocio es la autoridad

Ninguna decisión técnica podrá imponerse sobre la realidad operativa.

Cuando exista conflicto entre:

una solución técnicamente elegante;
una solución que represente mejor el funcionamiento de la empresa;

prevalecerá siempre la segunda.

Production Tracker modela la empresa.

La empresa no debe adaptarse al ERP.

4.4 La simplicidad como criterio de diseño

Production Tracker adopta explícitamente el principio de la Navaja de Ockham.

Cuando existan varias soluciones arquitectónicamente válidas:

Se elegirá siempre la más sencilla.

Siempre que represente correctamente el negocio.

Consecuencias

No se crearán:

servicios innecesarios;
procesos duplicados;
tablas redundantes;
cálculos repetidos;
capas artificiales;
automatismos sin una necesidad clara.

La complejidad debe aportar valor.

Nunca debe existir por motivos tecnológicos.

4.5 Una única responsabilidad

Cada componente del sistema tiene una única misión.

Ejemplos:

Frontend

Representar información.

Base de datos

Persistir información.

Analytics

Interpretar información.

Executive

Ayudar a decidir.

Cloudflare R2

Almacenar archivos.

GitHub

Gestionar la evolución del código.

Cuando un componente comienza a asumir responsabilidades ajenas, la arquitectura empieza a degradarse.

4.6 Una única fuente de verdad

Todo dato tiene un propietario.

Ejemplos:

Los datos comerciales pertenecen al modelo comercial.

Los datos operativos pertenecen a las líneas.

Analytics consume datos.

Nunca los genera.

Executive consume Analytics.

Nunca modifica la operación.

No se permiten:

duplicidades

copias innecesarias

estados paralelos

cálculos repetidos

4.7 El Frontend no piensa

Una de las reglas fundamentales del proyecto.

El frontend representa.

No interpreta.

No decide.

No recalcula.

No implementa reglas de negocio.

Toda lógica susceptible de ser reutilizada deberá residir fuera del frontend.

Esto garantiza:

consistencia

testabilidad

mantenimiento

evolución

4.8 SQL como motor del negocio

Siempre que una regla pertenezca al negocio y no a la interfaz:

Debe implementarse en la capa de datos.

Esto permite que:

Analytics

Executive

APIs

futuras aplicaciones

consuman exactamente las mismas reglas.

4.9 Evolución incremental

Production Tracker nunca debe reescribirse por completo.

Cada módulo debe poder evolucionar sin romper el resto del sistema.

Las migraciones deberán ser:

compatibles

progresivas

reversibles cuando sea posible

Las reescrituras completas son el último recurso.

4.10 Auditoría antes que parche

Cuando aparezca un problema existen dos posibilidades.

Resolver únicamente el síntoma.

O descubrir la causa arquitectónica.

Production Tracker adopta siempre la segunda estrategia.

Antes de añadir código deberá responderse:

¿Por qué ha ocurrido?

¿Existe una solución estructural?

¿Este problema puede volver a aparecer?

Si la respuesta es sí, deberá resolverse el problema arquitectónico.

No únicamente el caso concreto.

4.11 Reutilización antes que duplicación

Antes de crear:

una función

un componente

una vista

una consulta

una tabla

deberá comprobarse si ya existe una solución equivalente.

Duplicar código genera arquitecturas divergentes.

Reutilizar conocimiento fortalece el sistema.

4.12 Coherencia antes que velocidad

La rapidez de desarrollo nunca justificará una mala decisión arquitectónica.

Una implementación sencilla y coherente suele requerir menos tiempo de mantenimiento que una solución rápida pero inconsistente.

Production Tracker prioriza el coste total de propiedad sobre la velocidad inicial.

4.13 Git como memoria del proyecto

GitHub no es únicamente un repositorio.

Es la memoria técnica del ERP.

Toda modificación deberá quedar registrada mediante commits comprensibles.

El historial constituye parte de la documentación del proyecto.

Siempre que sea posible, los cambios deberán agruparse por funcionalidades completas y no por modificaciones inconexas.

4.14 El Documento Maestro como contrato

Este documento constituye el contrato arquitectónico del proyecto.

Todo nuevo desarrollo deberá responder tres preguntas antes de implementarse:

¿Representa mejor el negocio?
¿Respeta la arquitectura existente?
¿Aumenta o reduce la complejidad?

Si una funcionalidad no supera estas tres preguntas, deberá replantearse antes de escribirse una sola línea de código.

4.15 Decisiones arquitectónicas consolidadas

Las siguientes decisiones se consideran parte estable de Production Tracker y no deberán reabrirse salvo que exista una razón arquitectónica de peso:

El Documento Maestro es la fuente oficial de verdad para la arquitectura.
Toda decisión relevante debe documentarse antes de consolidarse en el código.
El ERP se adapta al negocio y no al contrario.
Se aplicará el principio de simplicidad (Navaja de Ockham) siempre que represente fielmente la realidad del negocio.
Cada componente tiene una única responsabilidad.
Cada dato tiene un único propietario.
El frontend representa información; no implementa reglas de negocio.
SQL y la capa de datos concentran la lógica reutilizable del negocio.
Las mejoras deben ser evolutivas y evitar reescrituras completas.
Los problemas deben resolverse desde su causa arquitectónica y no mediante parches.
GitHub constituye la memoria técnica y trazable del proyecto.

PARTE II — Módulos Operativos
Capítulo 5 — Gestión de Pedidos
5.1 Propósito

El módulo de Gestión de Pedidos constituye el núcleo operativo de Production Tracker.

Su responsabilidad es representar los compromisos comerciales adquiridos con los clientes y transformarlos en unidades de trabajo para la operación diaria.

No es un simple registro de pedidos.

Es el punto de partida de toda la cadena operativa:

producción;
planificación;
muestras;
inspecciones;
logística;
seguimiento;
Analytics.

Todos los módulos posteriores consumen información originada aquí.

5.2 Papel dentro del ERP

El pedido representa el acuerdo comercial.

La línea representa la ejecución operativa.

Esta distinción condiciona toda la arquitectura del sistema.

El módulo no existe para almacenar documentos.

Existe para iniciar el ciclo de vida de cada producto solicitado por el cliente.

5.3 Modelo conceptual

El modelo sigue la siguiente jerarquía.

Cliente
    ↓
Campaña
    ↓
Pedido (PO)
    ↓
Líneas
    ↓
Producción

Cada nivel aporta contexto al siguiente.

La operación nunca comienza en la cabecera.

Comienza en cada línea.

5.4 La cabecera del pedido

La cabecera agrupa información compartida.

Ejemplos:

cliente;
campaña;
moneda;
condiciones comerciales;
datos generales.

Su finalidad es evitar duplicidad.

La cabecera no representa el estado de fabricación.

5.5 La línea de pedido

La línea constituye la unidad operativa del sistema.

Cada línea representa un compromiso independiente de fabricación.

Puede evolucionar de forma completamente distinta al resto del pedido.

Esto implica que una línea puede:

cambiar de fábrica;
retrasarse;
adelantarse;
modificarse;
cancelarse;
inspeccionarse;
embarcarse.

Sin afectar necesariamente al resto.

Por este motivo todas las operaciones relevantes se realizan sobre la línea.

5.6 Separación entre información comercial y operativa

Uno de los principios fundamentales del módulo.

Información comercial:

cliente;
modelo;
referencia;
cantidades;
precios;
condiciones.

Información operativa:

fábrica;
PI;
fechas;
muestras;
inspecciones;
producción;
incidencias.

Ambos mundos evolucionan de forma diferente.

Nunca deben mezclarse.

5.7 Ciclo de vida de un pedido

Desde el punto de vista del ERP un pedido atraviesa distintas fases.

Creación

↓

Importación

↓

Validación

↓

Generación de líneas

↓

Seguimiento operativo

↓

Producción

↓

Inspecciones

↓

Expedición

↓

Histórico

Cada fase añade información.

Nunca destruye la anterior.

5.8 Operaciones permitidas

El módulo permite:

Crear pedidos.

Editar pedidos.

Editar líneas.

Eliminar pedidos cuando la operación lo permita.

Importar información.

Actualizar información operativa.

Sincronizar Analytics.

Generar snapshots.

5.9 Operaciones prohibidas

No está permitido:

Modificar snapshots históricos.

Actualizar registros utilizando posiciones del Excel.

Utilizar el orden visual como identidad.

Recalcular información comercial consolidada.

Mover información operativa a la cabecera.

Duplicar lógica de negocio en el frontend.

5.10 Relaciones con otros módulos

El módulo de pedidos alimenta directamente:

Import China.

Import Spain.

Timeline.

Producción.

QC.

Muestras.

Pricing.

Analytics.

Executive.

Ninguno de estos módulos sustituye al pedido.

Todos amplían la información generada aquí.

5.11 Filosofía del módulo

La gestión de pedidos no pretende responder únicamente:

"¿Qué ha comprado el cliente?"

Debe responder además:

"¿Qué tenemos que fabricar?"

"¿Qué está ocurriendo?"

"¿Dónde existe un riesgo?"

"¿Qué necesita atención?"

Esta diferencia convierte al pedido en el origen de toda la operativa del ERP.

5.12 Estado de consolidación

Arquitectura:

🟢 Consolidada

Modelo de líneas:

🟢 Consolidado

Snapshots:

🟢 Consolidados

Edición:

🟢 Consolidada

Eliminación:

🟢 Consolidada

Sincronización Analytics:

🟢 Consolidada

Base para módulos derivados:

🟢 Consolidada

5.13 Decisiones arquitectónicas consolidadas
La cabecera del pedido únicamente almacena información común.
La línea de pedido es la unidad operativa del sistema.
Toda información operativa reside en la línea.
Los datos comerciales y operativos evolucionan de forma independiente.
Toda actualización utiliza el UUID de la línea como identidad técnica.
Los snapshots comerciales permanecen inmutables una vez consolidados.
Los módulos posteriores consumen la información del pedido; no la reemplazan.

Capítulo 6 — Importación China
6.1 Propósito

El proceso de Importación China es el mecanismo oficial para actualizar la información operativa enviada por las fábricas.

Su objetivo no es crear pedidos.

Su objetivo es mantener sincronizada la realidad de la producción con el ERP.

La importación representa uno de los procesos más críticos del sistema, ya que modifica el estado operativo de miles de líneas de pedido.

Por este motivo debe priorizar siempre:

integridad;
trazabilidad;
consistencia;
seguridad.

La velocidad de importación nunca podrá comprometer estos principios.

6.2 Papel dentro del ERP

Import China pertenece al mundo operativo.

No modifica acuerdos comerciales.

No recalcula snapshots.

No altera el catálogo.

Actualiza exclusivamente información dinámica de las líneas de pedido.

Es el puente entre la operación realizada por las fábricas y la representación digital de esa operación dentro de Production Tracker.

6.3 Flujo general

El proceso completo sigue siempre la misma secuencia.

Recepción del Excel

↓

Lectura

↓

Validación

↓

Identificación

↓

Actualización

↓

Auditoría

↓

Sincronización Analytics

↓

Informe final

Cada fase debe completarse correctamente antes de iniciar la siguiente.

6.4 Principio de identidad

La actualización de una línea requiere una identidad estable.

Production Tracker distingue claramente tres conceptos.

Identidad técnica

UUID.

Es la única identidad válida para escribir datos.

Identidad de integración

SCO Legacy.

Se utiliza únicamente para localizar la línea correspondiente durante la importación.

No constituye la identidad permanente del sistema.

Identidad de negocio

Describe qué representa la línea.

Nunca debe utilizarse para escribir información.

Regla fundamental

Una vez localizada la línea mediante el SCO Legacy, toda modificación deberá realizarse utilizando exclusivamente el UUID.

6.5 El SCO Legacy

El SCO Legacy existe únicamente por razones de compatibilidad con documentos históricos.

Su composición oficial es:

Supplier
Season
Customer
PO
Reference
Style
Color
Size
Category
Channel

No representa una clave primaria del sistema.

No sustituye al UUID.

No deberá utilizarse fuera del proceso de integración.

6.6 Validación

La validación es bloqueante.

Production Tracker nunca actualizará parcialmente un fichero que presente errores críticos.

Antes de escribir información deben verificarse:

estructura;
columnas obligatorias;
coherencia;
identidad;
referencias.

Si existe un error que comprometa la consistencia de los datos, la importación completa deberá detenerse.

6.7 Actualización

Una vez superada la validación:

Cada línea localizada actualiza exclusivamente la información operativa correspondiente.

Entre otros:

fábrica;
PI Number;
PI BSG;
Trial Upper;
Trial Lasting;
Lasting;
Finish Date;
Inspection;
Booking;
Closing;
ETD;
Shipping Date;
observaciones operativas.

Los datos comerciales permanecen inalterados.

6.8 Atomicidad

Production Tracker considera la importación una operación única.

La escritura debe preservar la consistencia del sistema.

La importación nunca debe dejar la base de datos en un estado parcialmente actualizado por errores evitables.

6.9 Auditoría

Toda importación genera un resultado verificable.

El informe debe indicar claramente:

líneas procesadas;
líneas actualizadas;
líneas ignoradas;
errores encontrados;
advertencias;
tiempo de ejecución.

El objetivo de la auditoría no es únicamente informar.

Es permitir reconstruir cualquier importación realizada.

6.10 Sincronización

Una vez finalizada correctamente la actualización:

Se ejecuta automáticamente la sincronización de Analytics.

La sincronización pertenece al proceso de importación.

No requiere intervención manual.

No modifica la operación.

Únicamente actualiza la capa analítica.

6.11 Responsabilidades

Import China debe:

validar;
localizar;
actualizar;
auditar;
sincronizar.

Import China nunca debe:

recalcular negocio;
modificar snapshots;
crear lógica comercial;
interpretar Analytics.
6.12 Estado de consolidación

Arquitectura:

🟢 Consolidada

UUID:

🟢 Consolidado

SCO Legacy:

🟢 Consolidado

Validación bloqueante:

🟢 Consolidada

Actualización operativa:

🟢 Consolidada

Auditoría:

🟢 Consolidada

Sincronización Analytics:

🟢 Consolidada

6.13 Decisiones arquitectónicas consolidadas
El proceso actualiza únicamente información operativa.
La identidad técnica del sistema es el UUID.
El SCO Legacy existe únicamente como mecanismo de integración.
Ninguna actualización se realiza mediante posiciones del Excel.
La validación es bloqueante.
Analytics se sincroniza automáticamente al finalizar la importación.
Los snapshots comerciales nunca se modifican durante este proceso.
6.14 Antipatrones

Las siguientes prácticas se consideran incompatibles con la arquitectura del sistema:

Actualizar registros utilizando la fila del Excel.
Escribir información utilizando el SCO Legacy como identidad permanente.
Modificar datos comerciales durante la importación.
Ejecutar sincronizaciones manuales como parte del flujo normal.
Continuar una importación cuando existen errores críticos de validación.
Implementar excepciones específicas para un único fichero que rompan el comportamiento general del importador.

Capítulo 7 — Importación España
7.1 Propósito

El proceso de Importación España es el mecanismo oficial para incorporar de forma masiva información comercial procedente de sistemas externos, principalmente del Excel histórico utilizado durante la implantación de Production Tracker.

Su finalidad es facilitar la transición desde el modelo de trabajo basado en hojas de cálculo hacia un modelo completamente integrado dentro del ERP.

No constituye el flujo habitual de trabajo del sistema.

Es una herramienta de incorporación, regularización y actualización masiva cuando sea necesario.

7.2 Papel dentro del ERP

Import Spain pertenece al conjunto de herramientas de incorporación de datos.

Su responsabilidad es permitir la creación o actualización masiva de información cuando ésta todavía no existe dentro del ERP o cuando sea necesario realizar una carga extraordinaria.

Una vez implantado completamente Production Tracker, la operativa diaria se realizará directamente desde el sistema.

Los nuevos:

clientes;
modelos;
variantes;
pedidos;
líneas de pedido;

se crearán mediante los módulos propios del ERP.

Import Spain permanecerá como una herramienta de soporte, no como el canal habitual de trabajo.

7.3 Filosofía

Production Tracker tiene una única fuente operativa de información.

Esa fuente es el propio ERP.

Los documentos Excel utilizados durante la implantación representan una fuente externa temporal.

Import Spain existe para facilitar la incorporación de esa información al sistema, evitando trabajos manuales repetitivos y reduciendo errores de migración.

Su objetivo final es que el ERP deje de depender del Excel como herramienta operativa.

7.4 Flujo general
Recepción del fichero

↓

Lectura

↓

Validación

↓

Identificación

↓

Creación de registros nuevos

↓

Actualización de registros existentes

↓

Sincronización Analytics

↓

Informe final

El proceso sigue siempre un modelo incremental.

Nunca realiza eliminaciones automáticas.

7.5 Modelo incremental

Cada fichero representa únicamente la información que desea incorporarse o actualizarse.

Por tanto:

si un registro existe y aparece en el fichero, podrá actualizarse;
si un registro no existe y aparece en el fichero, podrá crearse;
si un registro no aparece en el fichero, permanecerá sin cambios.

La ausencia de un registro nunca implica su eliminación.

Este comportamiento protege la integridad del histórico y evita pérdidas de información por documentos incompletos.

7.6 Separación entre información comercial y operativa

Import Spain trabaja exclusivamente sobre la información cuya propiedad pertenece al ámbito comercial o estructural.

No modifica la información operativa generada durante la ejecución diaria del negocio.

La información operativa continúa siendo responsabilidad de los procesos específicos que la gestionan, especialmente Import China y los módulos operativos del ERP.

7.7 Integridad del histórico

Production Tracker preserva toda la información consolidada.

Las bajas o cancelaciones deberán realizarse mediante procesos explícitos definidos para ello.

Nunca como consecuencia indirecta de una importación masiva.

Import Spain incorpora información.

No elimina conocimiento del sistema.

7.8 Sincronización

Una vez finalizada correctamente la importación:

se consolidan las modificaciones realizadas;
se ejecuta automáticamente la sincronización de Analytics.

La sincronización forma parte del proceso y no requiere intervención del usuario.

7.9 Responsabilidades

Import Spain debe:

validar el documento recibido;
identificar registros existentes;
crear nuevos registros cuando corresponda;
actualizar información comercial autorizada;
preservar el histórico;
sincronizar Analytics;
generar un informe de resultados.

Import Spain nunca debe:

convertirse en el método habitual de creación de pedidos;
modificar información operativa;
cancelar automáticamente registros;
alterar snapshots consolidados;
modificar la identidad de las líneas.
7.10 Relación con otros módulos

Import Spain complementa al resto del ERP.

Alimenta principalmente:

Gestión de Pedidos;
Catálogo;
Pricing;
Analytics.

No sustituye la creación nativa de información dentro del sistema.

No reemplaza Import China.

Ambos procesos tienen responsabilidades completamente distintas.

7.11 Estado de consolidación

Arquitectura:

🟢 Consolidada

Modelo incremental:

🟢 Consolidado

Separación comercial / operativa:

🟢 Consolidada

Sincronización Analytics:

🟢 Consolidada

Evolución funcional:

🟡 En evolución

La arquitectura del módulo se considera estable.

Las futuras mejoras ampliarán funcionalidades sin modificar sus principios fundamentales.

7.12 Decisiones arquitectónicas consolidadas
Import Spain es una herramienta de incorporación masiva de información externa.
No constituye el flujo ordinario de creación de información del ERP.
La creación habitual de pedidos y líneas se realiza directamente en Production Tracker.
El proceso sigue un modelo incremental.
La ausencia de un registro nunca implica su eliminación.
La información comercial y la operativa pertenecen a ámbitos distintos.
Analytics se sincroniza automáticamente al finalizar la importación.
7.13 Antipatrones

Se consideran incompatibles con la arquitectura del sistema:

Utilizar Import Spain como mecanismo habitual para crear nuevos pedidos.
Mantener Excel como fuente operativa principal una vez implantado el ERP.
Sobrescribir información operativa mediante una importación comercial.
Cancelar registros porque no aparecen en el fichero.
Convertir el proceso en una sincronización destructiva.
Crear excepciones específicas para determinados documentos que rompan el comportamiento general del importador.
Duplicar lógica ya existente en Gestión de Pedidos o en otros módulos del ERP.

Capítulo 8 — Sincronización del Sistema
8.1 Propósito

La sincronización garantiza que todas las capas consumidoras del ERP reflejen el estado actual de la operación sin intervención manual.

Su objetivo no es modificar el negocio.

Su objetivo es mantener la coherencia entre las distintas representaciones del mismo.

La sincronización constituye un proceso transversal que forma parte de la arquitectura del sistema.

8.2 Filosofía

Production Tracker distingue claramente dos tipos de información.

Información fuente

Representa la realidad operativa.

Ejemplos:

pedidos;
líneas;
producción;
muestras.
Información derivada

Representa una interpretación o una vista de la información fuente.

Ejemplos:

Analytics;
Executive;
resúmenes;
comparativas;
indicadores.

La sincronización existe únicamente para actualizar la información derivada.

Nunca para modificar la información fuente.

8.3 Flujo general

Todo proceso que modifica información operativa sigue el mismo patrón.

Operación

↓

Persistencia

↓

Commit

↓

Sincronización

↓

Analytics

↓

Executive

Este flujo es único para todo el ERP.

8.4 Procesos que desencadenan sincronización

Actualmente:

creación de pedidos;
edición de pedidos;
eliminación de pedidos;
Import China;
Import Spain.

Cualquier nuevo proceso que modifique información utilizada por Analytics deberá integrarse en este flujo.

8.5 Responsabilidad de la sincronización

Debe:

actualizar estructuras derivadas;
mantener coherencia;
evitar información obsoleta;
ejecutarse automáticamente.

Nunca debe:

recalcular la operación;
modificar pedidos;
modificar líneas;
alterar snapshots.
8.6 Atomicidad

La sincronización forma parte de la operación lógica.

El usuario no necesita ejecutarla manualmente.

El sistema garantiza que la información derivada se actualice una vez finalizada correctamente la operación principal.

8.7 Rendimiento

La sincronización debe ejecutarse una única vez por operación.

Nunca dentro de bucles.

Nunca una vez por línea.

Nunca una vez por registro.

El patrón correcto es:

Actualizar N líneas

↓

Commit

↓

Una única sincronización

Esta decisión evita degradaciones de rendimiento conforme aumenta el volumen de información.

8.8 Escalabilidad

La arquitectura de sincronización debe permitir incorporar nuevas capas consumidoras sin modificar los procesos operativos.

Ejemplo futuro:

Operación

↓

Persistencia

↓

Commit

↓

Sync

↓

Analytics
↓
Executive
↓
Notificaciones
↓
IA
↓
API externa

Los módulos operativos seguirán siendo ajenos a estos consumidores.

8.9 Estado de consolidación

Arquitectura:

🟢 Consolidada

Sincronización automática:

🟢 Consolidada

Integración con Import China:

🟢 Consolidada

Integración con Import Spain:

🟢 Consolidada

Integración con Gestión de Pedidos:

🟢 Consolidada

Escalabilidad:

🟢 Consolidada

8.10 Decisiones arquitectónicas consolidadas
La sincronización es un proceso transversal del ERP.
Nunca modifica la información operativa.
Se ejecuta automáticamente tras operaciones que alteran datos relevantes.
Debe ejecutarse una única vez por operación.
La sincronización prepara información para capas consumidoras.
Los módulos operativos desconocen quién consume posteriormente esa información.
8.11 Antipatrones

Se consideran incompatibles con la arquitectura:

Ejecutar sincronizaciones manuales como parte del trabajo diario.
Ejecutar la sincronización dentro de un bucle de registros.
Hacer que Analytics dependa de acciones del usuario.
Permitir que la sincronización modifique datos operativos.
Duplicar procesos de sincronización para distintos módulos.
Acoplar los módulos operativos a consumidores específicos.

Capítulo 9 — Timeline Operativo
9.1 Propósito

El Timeline Operativo constituye la representación cronológica de la actividad de Production Tracker.

Su misión es mostrar la evolución temporal de cada línea de pedido y facilitar el seguimiento diario de la producción.

El Timeline no crea información.

No interpreta el negocio.

Representa visualmente los acontecimientos operativos ya existentes.

Su objetivo es responder una pregunta sencilla:

¿Qué está ocurriendo hoy y qué ocurrirá en los próximos días?

9.2 Papel dentro del ERP

El Timeline pertenece a la capa operativa.

Consume información procedente de:

Gestión de Pedidos.
Producción.
Muestras.
Import China.
Import Spain.

Nunca modifica dichos módulos.

Su función es ofrecer una visión cronológica unificada.

9.3 Filosofía

Production Tracker considera que la dimensión temporal es uno de los elementos más importantes de la operación.

La misma línea puede encontrarse:

adelantada;
en plazo;
retrasada;
bloqueada.

El Timeline no calcula estos estados.

Los representa utilizando la información ya existente.

9.4 Unidad de representación

La unidad representada por el Timeline es siempre la línea de pedido.

Nunca la cabecera.

Cada línea posee su propia evolución temporal.

Por ello:

una misma PO puede aparecer varias veces;
varias líneas pueden encontrarse en estados diferentes;
cada línea mantiene su propio calendario operativo.
9.5 Eventos representados

El Timeline puede representar cualquier fecha operativa relevante.

Entre otras:

Trial Upper.
Trial Lasting.
Lasting.
Finish Date.
Inspection.
Booking.
Closing.
ETD.
Shipping Date.

El sistema deberá permitir incorporar nuevos hitos sin modificar la arquitectura del módulo.

9.6 Flujo de información
Pedidos

↓

Líneas

↓

Fechas operativas

↓

Timeline

↓

Usuario

El Timeline consume fechas.

Nunca las genera.

9.7 Responsabilidades

El Timeline debe:

representar cronológicamente la operación;
facilitar la planificación diaria;
mostrar el estado temporal de las líneas;
permitir localizar rápidamente incidencias y retrasos.

El Timeline nunca debe:

modificar datos;
recalcular fechas;
decidir prioridades;
sustituir a Analytics.
9.8 Relación con Analytics

Ambos módulos trabajan sobre la misma información.

Pero tienen objetivos distintos.

Timeline responde:

¿Cuándo ocurre?

Analytics responde:

¿Qué significa?

Executive responde:

¿Qué debería hacer?

Esta separación evita mezclar representación, interpretación y decisión.

9.9 Escalabilidad

El Timeline deberá permitir incorporar nuevos tipos de eventos sin alterar su arquitectura.

Por ejemplo:

incidencias;
aprobaciones;
cambios de fábrica;
fotografías;
documentos;
inspecciones adicionales.

Todos ellos deberán integrarse como nuevos eventos temporales.

No como nuevas líneas de tiempo independientes.

9.10 Estado de consolidación

Arquitectura:

🟢 Consolidada

Representación temporal:

🟢 Consolidada

Modelo basado en líneas:

🟢 Consolidado

Evolución funcional:

🟡 En desarrollo

El modelo arquitectónico se considera estable.

Las futuras mejoras ampliarán capacidades sin modificar el propósito del módulo.

9.11 Decisiones arquitectónicas consolidadas
El Timeline representa información; no la crea.
La unidad representada es siempre la línea de pedido.
Todas las fechas operativas pertenecen a la línea.
El Timeline consume información de otros módulos.
Analytics y Timeline son complementarios.
La arquitectura permite incorporar nuevos eventos sin rediseñar el módulo.
9.12 Antipatrones

Se consideran incompatibles con la arquitectura:

Calcular fechas desde el Timeline.
Modificar información operativa desde el Timeline.
Representar únicamente la cabecera del pedido.
Duplicar información ya existente en otros módulos.
Convertir el Timeline en un módulo analítico.
Crear líneas de tiempo independientes para cada tipo de evento.

Capítulo 10 — Gestión de Muestras

¿Por qué?

Porque las muestras son el primer proceso operativo real del ciclo de producción.

Si dibujamos el flujo del negocio:

Pedido
      ↓
Importaciones
      ↓
Timeline
      ↓
Muestras
      ↓
Producción
      ↓
Inspección
      ↓
Embarque

Las muestras son el punto donde el pedido deja de ser un compromiso comercial y empieza a convertirse en un producto físico.

Eso las convierte en un módulo con identidad propia.

Production Tracker
Documento Maestro v8.0
Capítulo 10 — Gestión de Muestras
10.1 Propósito

El módulo de Gestión de Muestras controla el ciclo de desarrollo previo a la producción en serie.

Su finalidad es garantizar que el producto alcance el nivel de validación requerido antes del inicio de la fabricación.

Las muestras constituyen un proceso operativo.

No representan producción.

No representan inspección.

Representan la validación progresiva del producto.

10.2 Papel dentro del ERP

La Gestión de Muestras conecta el diseño comercial con la producción industrial.

Permite registrar el estado de desarrollo de cada línea de pedido y ofrecer visibilidad sobre un proceso que condiciona directamente las fechas de fabricación.

Es uno de los principales indicadores tempranos de riesgo operativo.

10.3 Filosofía

Production Tracker considera que una muestra no es únicamente un documento o un envío.

Es un hito operativo dentro del ciclo de vida de una línea de pedido.

Una misma línea puede requerir varias iteraciones de muestras antes de estar preparada para producción.

El sistema debe representar esta evolución sin perder el historial.

10.4 Unidad de trabajo

La unidad de gestión es siempre la línea de pedido.

Las muestras pertenecen a una línea concreta.

Nunca a la cabecera del pedido.

Esto permite que diferentes líneas de una misma PO evolucionen de forma independiente.

10.5 Flujo operativo
Pedido

↓

Línea

↓

Solicitud de muestra

↓

Envío

↓

Recepción

↓

Revisión

↓

Aprobación o nueva iteración

↓

Preparación para producción

Cada transición añade información al proceso.

Nunca sustituye el histórico anterior.

10.6 Relación con Producción

La Gestión de Muestras antecede a la producción.

Su resultado condiciona el inicio de determinadas actividades productivas.

No obstante, ambos módulos permanecen desacoplados.

La producción consume el resultado del proceso de muestras, pero no gestiona sus estados internos.

10.7 Responsabilidades

El módulo debe:

registrar el estado de las muestras;
mostrar su evolución;
conservar el historial;
identificar retrasos;
facilitar la planificación.

El módulo nunca debe:

modificar datos comerciales;
alterar fechas de producción;
sustituir el módulo de Producción;
interpretar resultados de negocio.
10.8 Relación con Timeline

Las muestras generan eventos temporales.

Por ello, el Timeline representa su evolución cronológica.

Sin embargo:

el Timeline muestra;
el módulo de Muestras gestiona.

Cada uno mantiene una responsabilidad claramente diferenciada.

10.9 Escalabilidad

El modelo debe permitir incorporar nuevos tipos de muestras o nuevas etapas de validación sin modificar la arquitectura general.

Por ejemplo:

Proto Sample.
Fit Sample.
Sales Sample.
Confirmation Sample.
Pre-Production Sample.

El ERP debe tratar estos casos como configuraciones del proceso y no como módulos independientes.

10.10 Gestión de no conformidades

Con una filosofía similar a esta:

Una muestra puede finalizar con distintos resultados operativos.

Por ejemplo:

Aprobada.
No conforme.
Rechazada.

Y documentar el comportamiento.

Muestra aprobada

El proceso continúa normalmente.

Muestra no conforme

La muestra presenta desviaciones menores.

Se permite continuar con la siguiente fase del proceso.

Las correcciones deberán verificarse en la siguiente muestra.

Muestra rechazada

La muestra presenta desviaciones incompatibles con la continuidad del proceso.

Será necesario realizar una nueva iteración de la misma fase antes de continuar.

10.11 Estado de consolidación

Modelo conceptual:

🟢 Consolidado

Unidad de trabajo:

🟢 Consolidada

Integración con Timeline:

🟢 Consolidada

Evolución funcional:

🟡 En desarrollo

El proceso seguirá creciendo, pero su arquitectura se considera estable.

10.12 Decisiones arquitectónicas consolidadas
Las muestras pertenecen a la línea de pedido.
Una línea puede tener múltiples iteraciones de muestras.
El historial nunca se pierde.
El módulo no inicia ni controla la producción.
Timeline representa el proceso; Muestras lo gestiona.
El diseño permite incorporar nuevos tipos de muestras sin rediseñar el sistema.
10.13 Antipatrones

Se consideran incompatibles con la arquitectura:

Asociar muestras a la cabecera del pedido.
Sobrescribir una iteración eliminando la anterior.
Mezclar estados de muestras con estados de producción.
Utilizar el módulo para almacenar documentos sin relación con el proceso.
Duplicar información ya existente en Timeline o Producción.
Crear un módulo independiente para cada tipo de muestra.

Capítulo 11 — Gestión de Producción
11.1 Propósito

El módulo de Producción permite realizar el seguimiento operativo del proceso de fabricación de cada línea de pedido.

Su finalidad es ofrecer una visión precisa del estado real de la producción y facilitar la toma de decisiones durante la ejecución de los pedidos.

Production Tracker no fabrica productos.

Gestiona información sobre el proceso de fabricación para mejorar el control operativo.

11.2 Papel dentro del ERP

La Producción constituye el núcleo operativo del sistema.

Es el punto donde convergen:

la información comercial;
las actualizaciones recibidas desde China;
las muestras;
la planificación temporal.

A partir de esta información, el ERP mantiene actualizado el estado operativo de cada línea de pedido.

11.3 Filosofía

Production Tracker no pretende describir únicamente qué debe fabricarse.

Su objetivo es conocer, en todo momento, qué está ocurriendo realmente con cada línea de pedido.

El módulo de Producción representa la ejecución del trabajo.

No sustituye la planificación.

No sustituye la logística.

No sustituye la inspección.

Coordina la información necesaria para comprender el estado de fabricación.

11.4 Unidad de trabajo

La unidad operativa continúa siendo la línea de pedido.

Cada línea posee su propio proceso de producción.

Por ello:

distintas líneas de una misma PO pueden encontrarse en fases diferentes;
pueden existir fechas distintas para una misma referencia;
la evolución de cada línea es completamente independiente.

La cabecera del pedido nunca representa el estado de producción.

11.5 Información gestionada

El módulo trabaja sobre la información operativa asociada a cada línea.

Entre otros datos:

fábrica;
PI;
fechas de producción;
Trial Upper;
Trial Lasting;
Lasting;
Finish Date;
incidencias;
bloqueos;
observaciones operativas.

El módulo organiza esta información.

No duplica datos existentes.

11.6 Flujo operativo
Pedido

↓

Línea de pedido

↓

Actualización operativa

↓

Estado de producción

↓

Timeline

↓

Analytics

↓

Executive

La Producción mantiene actualizado el estado operativo.

Los módulos posteriores consumen esa información.

11.7 Relación con Import China

Import China constituye el principal mecanismo de actualización recurrente del módulo.

La información recibida desde la oficina de China actualiza los datos operativos correspondientes a cada línea.

Producción consume dichas actualizaciones y las integra en el estado operativo del ERP.

11.8 Relación con Muestras

Las muestras representan la fase previa al inicio de la fabricación.

La Producción comienza cuando el proceso operativo permite avanzar hacia la fabricación.

Ambos módulos son complementarios.

Cada uno gestiona un momento diferente del ciclo de vida de la línea.

11.9 Relación con Timeline y Analytics

Producción genera el estado operativo.

Timeline representa cronológicamente ese estado.

Analytics interpreta sus implicaciones.

Executive establece prioridades de actuación.

Cada módulo mantiene una responsabilidad claramente diferenciada.

11.10 Responsabilidades

El módulo debe:

mantener actualizado el estado operativo;
registrar la evolución de la fabricación;
conservar la coherencia entre fechas y estados;
facilitar el seguimiento diario;
servir como base para el resto de módulos operativos.

El módulo nunca debe:

modificar información comercial;
recalcular Analytics;
sustituir la planificación logística;
duplicar información existente.
11.11 Estado de consolidación

Modelo arquitectónico:

🟢 Consolidado

Unidad operativa:

🟢 Consolidada

Integración con Import China:

🟢 Consolidada

Integración con Timeline:

🟢 Consolidada

Evolución funcional:

🟡 En desarrollo

La arquitectura del módulo se considera estable.

Las futuras mejoras ampliarán capacidades sin alterar su papel dentro del ERP.

11.12 Decisiones arquitectónicas consolidadas
La Producción trabaja siempre sobre líneas de pedido.
El estado de fabricación pertenece a la línea.
Import China constituye la principal fuente de actualización operativa.
Timeline representa la evolución temporal.
Analytics interpreta la información.
Executive prioriza la actuación.
La Producción nunca modifica información comercial.
11.13 Antipatrones

Se consideran incompatibles con la arquitectura:

Gestionar la producción desde la cabecera del pedido.
Duplicar información ya almacenada en las líneas.
Mezclar información comercial con información operativa.
Incorporar lógica analítica dentro del módulo.
Convertir Producción en un módulo documental.
Utilizar estados manuales cuando el sistema ya dispone de la información necesaria para describir la situación operativa.

Capítulo 12 — Gestión de Inspecciones
12.1 Propósito

El módulo de Gestión de Inspecciones permite registrar y realizar el seguimiento de los procesos de control de calidad asociados a cada línea de pedido.

Su finalidad es ofrecer visibilidad sobre el estado de las inspecciones y facilitar la coordinación entre producción, calidad y logística.

Las inspecciones forman parte del proceso operativo de una línea de pedido.

No constituyen un proceso independiente del resto del ciclo de fabricación.

12.2 Papel dentro del ERP

La Gestión de Inspecciones conecta la finalización de la fabricación con la preparación del envío.

Su función consiste en registrar la información necesaria para conocer el estado del proceso de control de calidad y su impacto sobre la planificación.

El módulo aporta información al estado operativo de la línea, pero no modifica la planificación comercial ni logística.

12.3 Filosofía

Production Tracker considera que una inspección no es únicamente una fecha.

Es un proceso operativo cuyo resultado condiciona la continuidad del ciclo de fabricación.

El ERP debe permitir conocer:

cuándo está prevista;
cuándo se realiza;
cuál es su situación dentro del proceso operativo.
12.4 Unidad de trabajo

La unidad gestionada es siempre la línea de pedido.

Cada línea mantiene su propio seguimiento de inspección dentro del ERP.

Sin embargo, la ejecución física de una inspección puede abarcar varias líneas cuando comparten las condiciones necesarias para ser inspeccionadas conjuntamente.

Esto ocurre, por ejemplo, cuando existen distintos pedidos que:

corresponden al mismo modelo;
comparten fábrica;
presentan fechas de producción y ETD iguales o muy próximas.

En estos casos, la oficina de China podrá planificar una única inspección para ese modelo y comunicar la misma fecha para todas las líneas afectadas.

Production Tracker deberá ser capaz de representar esta situación sin perder la individualidad de cada línea de pedido.

La inspección compartida constituye una decisión operativa del proceso de calidad.

La identidad y el seguimiento de cada línea permanecen independientes.
12.5 Flujo operativo
Producción

↓

Preparación para inspección

↓

Inspección

↓

Resultado

↓

Continuación del proceso logístico

El módulo registra la evolución del proceso.

No sustituye los procedimientos de calidad de la fábrica.

12.6 Relación con Producción

La Producción aporta el contexto necesario para iniciar el proceso de inspección.

La Gestión de Inspecciones no controla la fabricación.

Controla exclusivamente el seguimiento del proceso de verificación.

Ambos módulos permanecen desacoplados.

12.7 Relación con Logística

La información de inspección condiciona la planificación posterior.

No obstante, la logística mantiene la responsabilidad sobre:

Booking;
Closing;
ETD;
Shipping.

La inspección aporta información.

No gestiona el transporte.

12.8 Relación con Timeline y Analytics

Timeline representa cronológicamente las inspecciones.

Analytics interpreta el impacto que las inspecciones tienen sobre la operación.

Executive podrá utilizar esta información para establecer prioridades.

La responsabilidad de cada módulo permanece claramente diferenciada.

12.9 Responsabilidades

El módulo debe:

registrar la información relativa a las inspecciones;
facilitar el seguimiento del proceso de calidad;
mantener la trazabilidad del estado de inspección;
contribuir al estado operativo de la línea.

El módulo nunca debe:

modificar información comercial;
gestionar producción;
gestionar logística;
interpretar resultados analíticos.
12.10 Estado de consolidación

Modelo arquitectónico:

🟢 Consolidado

Unidad operativa:

🟢 Consolidada

Integración con Producción:

🟢 Consolidada

Integración con Timeline:

🟢 Consolidada

Evolución funcional:

🟡 En desarrollo

La arquitectura del módulo se considera estable.

12.11 Decisiones arquitectónicas consolidadas
La inspección pertenece a la línea de pedido.
El módulo gestiona el seguimiento del proceso de inspección.
Producción, Inspecciones y Logística mantienen responsabilidades independientes.
Timeline representa las inspecciones.
Analytics interpreta su impacto.
La información de inspección forma parte del estado operativo de la línea.
12.12 Antipatrones

Se consideran incompatibles con la arquitectura:

Gestionar inspecciones desde la cabecera del pedido.
Duplicar información de producción o logística.
Convertir el módulo en un sistema documental de calidad.
Mezclar responsabilidades de inspección y transporte.
Incorporar lógica analítica dentro del módulo.

Capítulo 13 — Gestión Logística
13.1 Propósito

El módulo de Gestión Logística controla el tramo final del ciclo operativo de una línea de pedido.

Su finalidad es realizar el seguimiento de la planificación y ejecución del embarque de la mercancía hasta su salida desde origen.

La logística constituye la última fase operativa antes de la entrega al cliente.

13.2 Papel dentro del ERP

La Gestión Logística recibe información procedente de los procesos anteriores:

Producción.
Inspecciones.
Oficina de China.

A partir de ella mantiene actualizado el estado logístico de cada línea de pedido.

Su misión consiste en ofrecer visibilidad sobre las fechas críticas del proceso de expedición.

13.3 Filosofía

Production Tracker considera la logística como un proceso continuo.

No como un conjunto de fechas independientes.

Booking, Closing, ETD y Shipping representan distintas etapas de un mismo proceso logístico.

El ERP debe permitir comprender el estado global de dicho proceso.

13.4 Unidad de trabajo

La unidad gestionada continúa siendo la línea de pedido.

Cada línea mantiene su propia planificación logística.

No obstante, la ejecución física de determinadas operaciones puede agrupar múltiples líneas de pedido.

Por ejemplo:

un mismo booking;
un mismo contenedor;
un mismo embarque.

Production Tracker registra el impacto sobre cada línea manteniendo su identidad operativa independiente.

13.5 Información gestionada

Entre otros elementos:

Booking.
Closing.
ETD.
Shipping Date.
Observaciones logísticas.
Incidencias de expedición.

La arquitectura deberá permitir incorporar nuevos datos logísticos sin modificar el modelo general del módulo.

13.6 Flujo operativo
Producción

↓

Inspección

↓

Booking

↓

Closing

↓

ETD

↓

Shipping

↓

Seguimiento posterior

Cada etapa añade información al estado logístico de la línea.

13.7 Relación con Import China

La actualización habitual de la información logística procede de la oficina de China mediante Import China.

El ERP integra dichas actualizaciones dentro del estado operativo de cada línea.

La responsabilidad sobre la actualización permanece claramente separada de la gestión del módulo.

13.8 Relación con Timeline y Analytics

Timeline representa la evolución temporal del proceso logístico.

Analytics interpreta el impacto operativo de posibles retrasos, adelantos o incidencias.

Executive prioriza las actuaciones necesarias.

Cada componente mantiene una responsabilidad específica.

13.9 Responsabilidades

El módulo debe:

mantener actualizado el estado logístico;
registrar las principales fechas del proceso de expedición;
facilitar el seguimiento diario;
aportar información al estado operativo global.

El módulo nunca debe:

modificar información comercial;
gestionar producción;
sustituir las funciones de transporte externo;
interpretar resultados analíticos.
13.10 Estado de consolidación

Modelo arquitectónico:

🟢 Consolidado

Unidad operativa:

🟢 Consolidada

Integración con Import China:

🟢 Consolidada

Integración con Timeline:

🟢 Consolidada

Evolución funcional:

🟡 En desarrollo

La arquitectura del módulo se considera estable.

13.11 Decisiones arquitectónicas consolidadas
La logística pertenece a la línea de pedido.
Booking, Closing, ETD y Shipping forman parte de un único proceso.
Las operaciones físicas pueden afectar simultáneamente a varias líneas.
El impacto siempre se registra sobre cada línea individual.
Timeline representa el proceso logístico.
Analytics interpreta sus consecuencias.
13.12 Antipatrones

Se consideran incompatibles con la arquitectura:

Gestionar Booking, Closing, ETD y Shipping como módulos independientes.
Duplicar información logística en otros módulos.
Asociar el estado logístico exclusivamente a la cabecera del pedido.
Mezclar responsabilidades de logística con producción o inspección.
Introducir lógica analítica dentro del módulo.

Capítulo 14 — Desarrollo y Catálogo de Producto
14.1 Propósito

El módulo de Desarrollo y Catálogo de Producto gestiona la fase previa a la producción y conserva el conocimiento necesario para convertir una propuesta de producto en un modelo preparado para su fabricación.

Su finalidad es acompañar la evolución del producto desde sus primeras fases de desarrollo hasta su activación en una campaña y su posterior utilización en pedidos de producción.

El módulo representa:

el producto;
su desarrollo;
sus variantes;
sus componentes;
sus muestras de desarrollo;
su evolución histórica.

No representa la ejecución de la producción en serie.

14.2 Papel dentro del ERP

Desarrollo constituye la fase anterior a Producción.

En este módulo nacen y evolucionan los modelos antes de convertirse en líneas de pedidos productivos.

El flujo general es:

Necesidad comercial

↓

Desarrollo del modelo

↓

Creación de variantes

↓

Muestras de desarrollo

↓

Cotización y precios

↓

Activación de campaña

↓

Pedido de producción

El módulo ya dispone de una base funcional, pero continuará ampliándose después de consolidar la fase actual del ERP de Producción.

14.3 El modelo como núcleo del producto

El modelo es el activo principal alrededor del cual se organizan:

variantes;
campañas;
precios;
componentes;
imágenes;
documentación;
muestras;
pedidos;
producción;
inspecciones.

Sin modelo no existe variante, precio, pedido ni proceso de producción.

Esta centralidad no implica que el modelo contenga toda la información operativa.

El modelo representa el producto.

Las líneas de pedido representan sus ejecuciones productivas.

14.4 Propiedad del modelo

Cada modelo pertenece a un único cliente.

Un modelo no se comparte entre distintos clientes.

Aunque dos clientes soliciten productos visualmente parecidos o técnicamente relacionados, cada modelo mantiene su propia identidad y pertenece al cliente para el que ha sido desarrollado.

Por tanto:

un modelo tiene un único cliente;
un cliente puede tener múltiples modelos;
los modelos de clientes diferentes permanecen separados;
la identidad de un modelo no debe deducirse únicamente de su apariencia, nombre o similitud técnica.
14.5 Elementos compartidos entre clientes

Aunque los modelos pertenecen exclusivamente a sus respectivos clientes, determinados elementos técnicos pueden reutilizarse entre modelos de distintos clientes.

Entre ellos:

hormas;
pisos.

Una misma horma o un mismo piso puede utilizarse en modelos pertenecientes a clientes diferentes.

Esto no convierte dichos modelos en un único producto ni altera su propiedad.

Cliente A → Modelo A ─┐
                      ├→ Horma compartida
Cliente B → Modelo B ─┘
Cliente A → Modelo C ─┐
                      ├→ Piso compartido
Cliente B → Modelo D ─┘

La reutilización técnica debe mantenerse separada de la identidad comercial del modelo.

14.6 Modelos y variantes

El modelo representa la identidad general del producto para un cliente.

Las variantes representan sus combinaciones concretas dentro de una campaña, incluyendo aquellos atributos necesarios para diferenciar físicamente el producto.

La arquitectura actual mantiene una variante por combinación física de:

modelo;
campaña;
color;
referencia.

La agrupación visual de variantes puede simplificar su presentación, pero no modifica su identidad real en el sistema.

14.7 Campañas y activación

Un modelo puede evolucionar a través de distintas campañas, siempre dentro del mismo cliente.

La incorporación de un modelo a una nueva campaña puede realizarse desde Desarrollo o durante la creación de un nuevo PO.

Cuando existe una intención real de producción, las variantes necesarias pueden activarse para la nueva campaña.

La activación puede reutilizar información aplicable de una campaña anterior, como:

variantes;
últimos precios vigentes;
imágenes;
componentes;
documentación aplicable.

Esta reutilización no debe modificar retrospectivamente las campañas anteriores.

14.8 Separación entre Desarrollo y Producción

Desarrollo y Producción trabajan sobre el mismo producto, pero tienen responsabilidades diferentes.

Desarrollo

Gestiona:

creación del modelo;
evolución técnica;
variantes;
muestras previas;
cotización;
precios;
componentes;
preparación para futuras campañas.
Producción

Gestiona:

pedidos confirmados;
líneas de pedido;
muestras de producción;
fabricación;
inspecciones;
logística.

El paso de Desarrollo a Producción debe ser explícito.

La existencia de un modelo desarrollado no implica automáticamente que exista un pedido de producción.

14.9 Muestras de desarrollo

El módulo de Desarrollo deberá ampliarse para gestionar fases de muestras anteriores a la producción.

Estas muestras pertenecen al proceso de creación y validación del producto, no al seguimiento de un pedido productivo.

El flujo podrá contener distintas fases e iteraciones de muestras.

Cada fase deberá conservar:

su identidad;
su estado;
sus rondas;
sus observaciones;
su resultado;
su trazabilidad.

Las fases concretas y sus reglas de negocio deberán documentarse antes de su implementación.

No deberán inventarse a partir de las muestras actuales de Producción.

14.10 No conformidades e iteraciones

Las muestras de Desarrollo seguirán el mismo principio general de validación contextual:

una incidencia grave puede provocar el rechazo de la muestra y una nueva ronda de la misma fase;
una incidencia leve puede registrarse como no conformidad y verificarse en una fase posterior cuando el proceso permita continuar.

Las excepciones permanecen dentro de la fase de muestra que las genera.

No se trasladan a un módulo genérico de incidencias.

14.11 POs de muestrarios comerciales

La evolución futura del módulo incluirá la gestión de POs asociados a muestrarios comerciales.

Estos pedidos no deben confundirse con los pedidos ordinarios de producción.

Aunque puedan compartir determinados conceptos, pertenecen al proceso de Desarrollo y responden a una finalidad diferente.

Su arquitectura deberá definirse expresamente antes de desarrollarla, incluyendo:

identidad;
ciclo de vida;
relación con modelos y variantes;
muestras asociadas;
información comercial;
información operativa;
reglas de importación.

Hasta disponer de dicha definición, no debe asumirse que funcionan igual que los POs de producción.

14.12 Importación China para Desarrollo

El módulo de Desarrollo dispondrá en el futuro de su propio proceso de intercambio con la oficina de China.

Este proceso será similar al Import China de Producción en aspectos técnicos reutilizables, como:

lectura del Excel;
validación previa;
generación de informes;
normalización de identidad;
seguridad de escritura;
procesamiento masivo.

Sin embargo, deberá mantenerse como un flujo independiente.

Import China Producción
        ≠
Import China Desarrollo

Ambos podrán compartir infraestructura y código común, pero no responsabilidades ni reglas de negocio.

El importador de Desarrollo deberá adaptarse específicamente a:

muestras de desarrollo;
POs de muestrarios;
fases previas a producción;
estados propios del proceso de desarrollo.

No deberá utilizarse el importador de Producción añadiendo excepciones internas para distinguir ambos contextos.

14.13 Reutilización técnica sin acoplamiento funcional

Production Tracker deberá reutilizar componentes técnicos cuando dos procesos compartan necesidades reales.

Por ejemplo:

lectura de Excel;
validación de columnas;
informes de importación;
normalización;
tratamiento de fechas;
gestión de errores.

Sin embargo, la reutilización técnica no debe mezclar dominios funcionales.

El principio aplicable es:

Compartir infraestructura, separar procesos de negocio.

Esto permite evitar código duplicado sin convertir Desarrollo y Producción en un único importador difícil de mantener.

14.14 Precios e histórico

Los precios pertenecen al conocimiento maestro del modelo y sus variantes.

La fuente oficial de precios permanece separada de las líneas de pedido.

Los cambios de precio deben conservar histórico y generar trazabilidad.

Los pedidos productivos utilizan snapshots comerciales para proteger el contexto histórico con el que fueron creados. El Documento Maestro actual establece que los precios no se editan directamente desde las líneas ni desde los importadores y que su histórico no debe sobrescribirse.

14.15 Trazabilidad

La evolución de modelos y variantes debe permanecer registrada.

La trazabilidad debe incluir, como mínimo:

activaciones de campaña;
creación y actualización de precios;
cambios relevantes de variantes;
cambios de componentes;
imágenes;
documentación;
acciones maestras significativas.

El timeline del modelo representa la evolución global del producto.

El timeline de variante representa su evolución concreta dentro del contexto correspondiente.

14.16 Responsabilidades

El módulo debe:

gestionar modelos pertenecientes a un cliente;
gestionar variantes y campañas;
conservar el conocimiento del producto;
gestionar la evolución previa a producción;
permitir reutilizar hormas y pisos entre modelos;
mantener precios e histórico;
preparar el producto para su activación productiva;
evolucionar hacia la gestión completa de muestras y muestrarios de Desarrollo.

El módulo nunca debe:

compartir un mismo modelo entre clientes;
confundir elementos técnicos compartidos con identidad de producto;
gestionar el seguimiento diario de la producción en serie;
modificar retrospectivamente pedidos ya consolidados;
mezclar Import China de Desarrollo con Import China de Producción;
asumir reglas futuras de Desarrollo sin documentarlas previamente.
14.17 Estado de consolidación

Núcleo de modelos y variantes:

🟢 Consolidado

Propiedad del modelo por cliente:

🟢 Consolidada

Gestión de campañas y activación:

🟢 Consolidada

Precios y trazabilidad:

🟢 Consolidada

Módulo completo de Desarrollo:

🟡 Parcialmente desarrollado

Nuevas fases de muestras:

⚪ Pendientes de definición e implementación

POs de muestrarios comerciales:

⚪ Pendientes de definición e implementación

Import China de Desarrollo:

⚪ Pendiente de diseño e implementación

La arquitectura existente constituye la base del módulo, pero el dominio de Desarrollo todavía no se considera cerrado.

14.18 Decisiones arquitectónicas consolidadas
Cada modelo pertenece a un único cliente.
Un modelo nunca se comparte entre clientes.
Las hormas y los pisos sí pueden reutilizarse entre modelos de distintos clientes.
El modelo representa el producto; la línea de pedido representa una ejecución productiva.
Desarrollo es la fase anterior a Producción.
Las muestras de Desarrollo y las muestras de Producción pertenecen a contextos distintos.
Los POs de muestrarios comerciales no deben tratarse automáticamente como POs productivos.
Desarrollo tendrá su propio proceso de Import China.
Los importadores de Desarrollo y Producción podrán compartir infraestructura técnica, pero permanecerán funcionalmente separados.
Las futuras reglas del módulo deberán incorporarse al Documento Maestro antes de implementarse.
14.19 Antipatrones

Se consideran incompatibles con la arquitectura:

Asociar un mismo modelo a varios clientes.
Duplicar hormas o pisos únicamente porque los utilizan clientes distintos.
Confundir la identidad del modelo con sus componentes compartidos.
Utilizar líneas de producción como catálogo de producto.
Tratar las muestras de Desarrollo como muestras productivas.
Gestionar POs de muestrarios con reglas productivas sin una definición previa.
Añadir condiciones especiales al Import China de Producción para procesar Desarrollo.
Copiar todo el código del importador de Producción sin extraer primero las capacidades técnicas reutilizables.
Diseñar ahora reglas detalladas del futuro módulo sin validar previamente el proceso real.

Capítulo 15 — Gestión Comercial y Precios
15.1 Propósito

El módulo de Gestión Comercial y Precios administra la información económica asociada a los modelos y sus variantes.

Su finalidad es garantizar que la información comercial:

tenga una única fuente de verdad;
conserve su evolución histórica;
pueda reutilizarse en nuevas campañas;
permanezca separada de la información operativa;
no altere retrospectivamente pedidos ya consolidados.

Los precios pertenecen al conocimiento comercial del producto.

No forman parte del seguimiento operativo de la producción.

15.2 Papel dentro del ERP

La Gestión Comercial constituye el punto de unión entre:

Desarrollo;
Catálogo;
Campañas;
Pedidos.

Desde este módulo se mantiene la información económica utilizada posteriormente durante la creación de líneas de pedido.

Los pedidos consumen esta información.

No son propietarios de ella.

15.3 Filosofía

Production Tracker separa tres ámbitos claramente diferenciados:

información técnica;
información comercial;
información operativa.

Cada uno evoluciona de forma independiente.

Los cambios comerciales nunca deben modificar la historia operativa ya consolidada.

Por este motivo, los pedidos conservan snapshots comerciales propios.

15.4 Fuente única de verdad

La única fuente maestra de precios es el catálogo comercial del producto.

Los pedidos únicamente consumen dichos precios.

Nunca deben convertirse en la fuente oficial de información económica.

Los importadores tampoco sustituyen esta responsabilidad.

Toda modificación deberá realizarse siguiendo el flujo autorizado del módulo.

15.5 Operativas comerciales

Production Tracker trabaja actualmente con dos operativas comerciales:

Operativa estándar (Xiamen).
Operativa BSG.

Ambas utilizan:

los mismos modelos;
las mismas variantes;
el mismo catálogo;
la misma arquitectura de pedidos.

La diferencia reside exclusivamente en la información comercial asociada a las líneas.

15.6 Operativa estándar (Xiamen)

En la operativa estándar, la línea utiliza la información económica habitual del pedido.

No incorpora información específica de BSG.

Los campos:

PI BSG;
Selling Price;
Selling Amount;

permanecen vacíos.

La línea mantiene únicamente la información económica propia de esta operativa.

15.7 Operativa BSG

En la operativa BSG, la línea incorpora información comercial adicional suministrada por la oficina de China.

Entre otros datos:

PI BSG;
Selling Price;
Selling Amount.

Estos campos forman parte de la información comercial específica de esta operativa.

Su finalidad es mantener separada la información económica correspondiente a la gestión comercial realizada mediante BSG.

La ausencia temporal de alguno de estos valores durante el proceso de actualización no implica necesariamente que la línea deje de pertenecer a esta operativa.

Import China podrá completar esta información cuando sea recibida desde China.

15.8 Identificación de la operativa

La operativa comercial constituye una decisión de negocio.

Actualmente, mientras el ERP no disponga de un módulo específico de Clientes que defina esta característica de forma explícita, la operativa se identifica mediante la información comercial existente en las líneas de pedido.

La presencia de información específica de BSG permite identificar dicha operativa.

Esta solución responde al estado actual del sistema.

No representa necesariamente el modelo definitivo del ERP.

La evolución futura de este aspecto arquitectónico se documentará en la Parte III.

15.9 Snapshots comerciales

Cuando una línea de pedido se crea, el ERP genera un snapshot comercial.

Este snapshot conserva el contexto económico utilizado en ese momento.

Una vez consolidado:

permanece inalterable;
no se recalcula automáticamente;
conserva el histórico de la operación.

La evolución futura del catálogo comercial no modifica retrospectivamente los pedidos existentes.

15.10 Histórico

Los precios nunca se sobrescriben.

Cada modificación genera un nuevo registro histórico.

El sistema conserva:

precio anterior;
nuevo precio;
fecha de vigencia;
usuario;
motivo del cambio.

La trazabilidad económica constituye una garantía permanente del ERP.

15.11 Relación con Desarrollo

Desarrollo mantiene la evolución comercial del producto.

Gestión Comercial mantiene la evolución económica.

Ambos módulos colaboran estrechamente, pero mantienen responsabilidades diferentes.

Desarrollo crea y prepara el producto.

Gestión Comercial administra la información económica asociada a dicho producto.

15.12 Relación con Gestión de Pedidos

Cuando se crea un pedido:

el sistema obtiene la información económica vigente;
genera el snapshot correspondiente;
conserva dicho contexto durante toda la vida del pedido.

Las modificaciones posteriores del catálogo comercial no alteran automáticamente los pedidos ya consolidados.

15.13 Relación con Import Spain

Import Spain podrá incorporar información comercial cuando exista un flujo autorizado para ello.

Sin embargo:

no sustituye la gestión de precios;
no modifica snapshots consolidados;
no sobrescribe el histórico económico.

Toda actualización deberá respetar las reglas del módulo.

15.14 Relación con Import China

Import China actualiza exclusivamente la información comercial específica comunicada por la oficina de China.

Entre otros datos:

PI BSG;
Selling Price;
Selling Amount.

Import China nunca modifica el catálogo maestro de precios.

Su responsabilidad consiste únicamente en incorporar información operativa y comercial correspondiente a la evolución semanal recibida desde China.

15.15 Responsabilidades

El módulo debe:

mantener el catálogo económico;
conservar el histórico de precios;
generar snapshots comerciales;
diferenciar las operativas comerciales;
mantener la trazabilidad económica;
proporcionar información comercial a los pedidos.

El módulo nunca debe:

utilizar los pedidos como fuente maestra de precios;
modificar snapshots históricos;
deducir reglas comerciales mediante inferencias no documentadas;
permitir modificaciones económicas fuera de los flujos autorizados.
15.16 Estado de consolidación

Arquitectura comercial:

🟢 Consolidada

Histórico de precios:

🟢 Consolidado

Snapshots comerciales:

🟢 Consolidados

Operativas comerciales:

🟢 Consolidadas

Evolución del módulo Clientes:

🟡 Pendiente

La arquitectura comercial actual se considera estable.

La futura incorporación del módulo de Clientes permitirá consolidar explícitamente la identificación de la operativa.

15.17 Decisiones arquitectónicas consolidadas
La información comercial pertenece al catálogo del producto.
Los pedidos consumen información comercial; no son propietarios de ella.
Toda línea conserva su snapshot comercial.
Los snapshots no se recalculan de forma destructiva.
Production Tracker diferencia operativa estándar y operativa BSG.
La información específica de BSG pertenece a la línea de pedido.
Import China actualiza dicha información cuando es recibida desde la oficina de China.
La identificación actual de la operativa responde al estado actual del ERP y podrá evolucionar cuando exista un módulo específico de Clientes.
Ningún importador sustituye al catálogo comercial como fuente oficial de precios.
15.18 Antipatrones

Se consideran incompatibles con la arquitectura:

Utilizar líneas de pedido como catálogo de precios.
Sobrescribir snapshots comerciales.
Modificar retrospectivamente pedidos históricos.
Deducir permanentemente reglas de negocio a partir de información circunstancial.
Utilizar el proveedor como criterio para identificar la operativa comercial.
Mezclar la información económica del catálogo con la información operativa de producción.
Convertir Import China o Import Spain en gestores del catálogo comercial.
Reflexión arquitectónica

La información comercial y la información operativa evolucionan a ritmos diferentes y responden a responsabilidades distintas.

El catálogo comercial describe el contexto económico vigente del producto.

Los pedidos conservan el contexto económico con el que fueron creados.

La arquitectura de Production Tracker protege ambas realidades mediante snapshots comerciales e histórico de precios, evitando que la evolución del negocio altere retrospectivamente la historia operativa.

La existencia de distintas operativas comerciales no modifica este principio. Representa únicamente diferentes formas de gestionar la información económica sobre una misma arquitectura de producto y de pedidos.

Capítulo 16 — Gestión Documental y Archivos
16.1 Propósito

El módulo de Gestión Documental permite almacenar, organizar y recuperar los documentos asociados a las distintas entidades de Production Tracker.

Su finalidad es garantizar que toda la documentación relevante permanezca accesible durante el ciclo de vida del producto y de los pedidos.

Los documentos complementan la información del ERP.

Nunca la sustituyen.

16.2 Papel dentro del ERP

La Gestión Documental es un servicio funcional transversal.

Puede asociar documentos a:

modelos;
variantes;
campañas;
pedidos;
líneas de pedido;
muestras;
inspecciones;
logística;
futuros módulos del sistema.

No pertenece exclusivamente a ninguno de ellos.

16.3 Filosofía

Production Tracker considera que el documento constituye una evidencia del proceso.

La información estructurada del ERP continúa siendo la fuente principal de conocimiento.

Los archivos aportan contexto, soporte o justificación.

Por tanto:

un documento nunca sustituye un dato estructurado;
un dato estructurado nunca necesita duplicarse dentro de un documento.
16.4 Unidad de asociación

Los documentos se vinculan a una entidad concreta del sistema.

Por ejemplo:

un modelo;
una variante;
una línea de pedido;
una muestra;
una inspección.

El documento pertenece al contexto donde se genera.

No debe almacenarse como un archivo aislado sin relación funcional.

16.5 Tipos de documentos

El sistema podrá gestionar, entre otros:

imágenes;
fichas técnicas;
documentos PDF;
hojas de especificaciones;
informes de inspección;
documentación logística;
fotografías;
archivos auxiliares.

La incorporación de nuevos tipos documentales no deberá modificar la arquitectura del módulo.

16.6 Almacenamiento

Production Tracker separa:

los metadatos del documento;
el archivo físico.

La base de datos almacena únicamente la información necesaria para identificar y relacionar el documento.

El archivo físico se almacena en el sistema de almacenamiento correspondiente.

Esta separación permite evolucionar la infraestructura sin alterar el modelo funcional.

16.7 Relación con otros módulos

Cada módulo mantiene la propiedad funcional de sus documentos.

Por ejemplo:

Desarrollo gestiona las imágenes del modelo.
Muestras gestiona la documentación de validación.
Inspecciones gestiona los informes de calidad.
Logística gestiona la documentación de expedición.

La Gestión Documental proporciona el mecanismo común de almacenamiento y recuperación.

No redefine las reglas de negocio de cada módulo.

16.8 Responsabilidades

El módulo debe:

almacenar documentos;
mantener sus relaciones;
conservar su trazabilidad;
facilitar su consulta;
permitir futuras ampliaciones.

El módulo nunca debe:

contener información estructurada que ya exista en la base de datos;
sustituir procesos del ERP;
convertirse en un gestor documental independiente del negocio.
16.9 Estado de consolidación

Arquitectura:

🟢 Consolidada

Separación metadatos / archivo:

🟢 Consolidada

Naturaleza transversal:

🟢 Consolidada

Evolución funcional:

🟡 En desarrollo

16.10 Decisiones arquitectónicas consolidadas
Los documentos complementan la información del ERP.
Cada documento pertenece a un contexto funcional.
Los archivos físicos permanecen separados de los metadatos.
Cada módulo mantiene la responsabilidad funcional de sus documentos.
La infraestructura de almacenamiento puede evolucionar sin modificar la arquitectura del ERP.
16.11 Antipatrones

Se consideran incompatibles con la arquitectura:

Utilizar documentos como sustitutos de datos estructurados.
Almacenar archivos sin relación con una entidad del ERP.
Duplicar información existente en la base de datos dentro de documentos.
Hacer depender la lógica de negocio del contenido de un PDF o una imagen.
Crear repositorios documentales independientes para cada módulo.
Reflexión arquitectónica

Este capítulo introduce otra idea que creo que merece acabar en la Parte III:

Los documentos son evidencias del negocio, no la fuente de verdad del negocio.

Es un principio muy útil porque evita una deriva muy común en muchos ERP: acabar guardando la información importante dentro de Excel, PDFs o imágenes, obligando a los usuarios a abrir documentos para conocer el estado real de una operación.

En Production Tracker debe ocurrir lo contrario. El ERP contiene la información estructurada que describe el negocio. Los documentos únicamente la complementan, la justifican o la ilustran.

PARTE III — GARANTÍAS ARQUITECTÓNICAS
Capítulo 17 — Principios Fundamentales

Define la filosofía que nunca debe cambiar.

17.1 Operations First

La operativa diaria constituye la prioridad del ERP.

Las funciones analíticas, ejecutivas o estadísticas nunca deben comprometer la eficiencia de los procesos operativos.

17.2 La línea de pedido es la unidad operativa

Toda la operativa gira alrededor de lineas_pedido.

Las cabeceras agrupan información común.

La actividad diaria pertenece a las líneas.

17.3 Cada dato tiene un único propietario funcional

Cada información del ERP pertenece exactamente a un módulo.

Ese módulo es el único autorizado para modificarla.

Otros módulos pueden:

consultar;
representar;
interpretar.

Nunca asumir su propiedad.

17.4 La información estructurada es la fuente de verdad

Los documentos, imágenes o archivos complementan la información.

Nunca la sustituyen.

17.5 Los procesos representan el negocio

La arquitectura debe adaptarse al funcionamiento real de la empresa.

Nunca debe obligar a modificar procesos únicamente para simplificar el software.

Capítulo 18 — Identidad e Integridad

Todo lo relacionado con la identidad de la información.

18.1 UUID como única identidad de escritura

Toda modificación sobre una línea debe realizarse utilizando exclusivamente lineas_pedido.id.

18.2 SCO Legacy

Explicación completa del SCO Legacy.

Uso exclusivamente para localizar registros.

Nunca como clave permanente.

18.3 Normalización de identidad

normalizeIdentity()

sameIdentity()

Como única forma autorizada de comparar identidades comerciales.

18.4 Integridad antes que sincronización

Ante cualquier duda:

el ERP conserva la información existente.

Nunca realiza escrituras ambiguas.

Capítulo 19 — Evolución del Modelo de Dominio

Este capítulo recogería todo lo que hemos descubierto hoy.

19.1 Los dominios evolucionan progresivamente

No es necesario que todos los dominios existan desde la primera versión.

Mientras un dominio no disponga de entidad propia podrán utilizarse mecanismos temporales documentados.

19.2 Las soluciones temporales deben tener evolución prevista

Una solución provisional nunca debe convertirse accidentalmente en permanente.

Toda solución transitoria deberá indicar cuál es su evolución arquitectónica prevista.

Aquí incluiríamos el ejemplo de la operativa comercial (BSG/Xiamen) y el futuro módulo de Clientes.

19.3 Compartir infraestructura no implica compartir procesos

Dos módulos pueden reutilizar:

tablas;
componentes;
importadores;
almacenamiento.

Sin pertenecer al mismo dominio funcional.

Ejemplo:

Import China Producción.

Import China Desarrollo.

Capítulo 20 — Gestión del Estado Operativo
20.1 El estado operativo es distribuido

Ningún módulo posee el estado completo.

Cada módulo aporta únicamente la parte que le corresponde.

20.2 Los procesos pueden ejecutarse agrupados

Una inspección.

Un embarque.

Un booking.

Pueden ejecutarse conjuntamente.

Los resultados siempre se registran sobre cada línea.

20.3 Las excepciones pertenecen al proceso

Las incidencias no constituyen un módulo independiente.

Cada proceso gestiona sus propias excepciones.

20.4 Los snapshots preservan el contexto histórico

Toda información histórica permanece congelada.

Nunca se recalcula destructivamente.

Capítulo 21 — Evolución del ERP

Este será el cierre del documento.

21.1 Evolución antes que revolución

Production Tracker evoluciona mediante pequeñas mejoras compatibles con la arquitectura existente.

21.2 Occam's Razor

Cuando existan varias soluciones arquitectónicamente válidas, deberá elegirse la más sencilla.

21.3 Coherencia antes que optimización

Nunca se aceptarán optimizaciones que comprometan la claridad del modelo de dominio.

21.4 Documento Maestro como fuente de verdad

Toda modificación arquitectónica deberá reflejarse primero en este documento.

Si existe contradicción entre la implementación y el Documento Maestro, deberá resolverse antes de continuar el desarrollo.

Reflexión arquitectónica

Creo que esta Parte III consigue algo que muy pocos proyectos tienen: separar claramente la arquitectura de la implementación.

La Parte II explica qué hace cada módulo y cuáles son sus responsabilidades.
La Parte III explica qué principios nunca deben romperse, aunque dentro de tres años cambien las tablas, la interfaz o incluso parte de la tecnología.

En otras palabras, la Parte II documenta el sistema tal y como existe hoy; la Parte III documenta el sistema tal y como debe seguir siendo mañana.

Y hay una última recomendación que sí haría: terminar el Documento Maestro con una frase que resuma toda su filosofía. Creo que esta encaja perfectamente con todo lo que hemos construido:

Production Tracker no se diseña alrededor de la tecnología, sino alrededor del negocio. La tecnología puede evolucionar; los principios arquitectónicos son los que garantizan que esa evolución mantenga la coherencia, la trazabilidad y la operativa del ERP.