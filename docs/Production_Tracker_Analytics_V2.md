# Production Tracker Analytics V2

## Filosofía, principios y evolución de la capa de decisión de Production Tracker

---

# Fuente de Verdad

Este documento constituye la referencia funcional para el diseño y evolución de Analytics dentro de Production Tracker.

Todas las decisiones relacionadas con:

- Executive Dashboard
- Analytics
- Business Intelligence
- Dashboards
- Indicadores
- Informes
- Experiencia de usuario
- Cuadros de mando

deberán ser coherentes con los principios definidos en este documento.

Si durante la evolución del producto se identifica una solución funcional mejor que la documentada, este documento deberá actualizarse antes de implementar el cambio.

Analytics V2 no pretende congelar el producto.

Pretende garantizar una evolución coherente.

---

# Historial del documento

## v1.0

Creación del documento.

Contenido inicial:

- Filosofía
- Principios
- Modelo de negocio
- Alcance
- Carta al futuro

---

# Prólogo

Production Tracker nació para resolver una necesidad muy concreta:

Gestionar de forma sencilla y eficiente la actividad comercial y operativa de una empresa especializada en el desarrollo y producción de calzado.

Con la evolución del proyecto, el ERP ha dejado de ser únicamente un sistema de gestión.

Se ha convertido en el lugar donde se concentra el conocimiento operativo de la empresa.

Analytics V2 representa la siguiente evolución natural.

Su objetivo no consiste en mostrar más información.

Su objetivo consiste en ayudar a comprender mejor el negocio.

Cada pantalla debe responder una pregunta.

Cada dato debe aportar contexto.

Cada indicador debe facilitar una decisión.

La simplicidad no representa una limitación.

Representa una decisión de diseño.

Analytics no pretende construir el dashboard con mayor número de gráficos.

Pretende construir la herramienta que permita comprender el negocio con el menor esfuerzo posible.

---

# Carta al futuro

Si estás leyendo este documento dentro de varios años significa que Production Tracker ha seguido evolucionando.

Eso será una buena noticia.

Este documento no intenta conservar decisiones para siempre.

Intenta conservar la forma de pensar que permitió construir el ERP.

Si algún día una decisión aquí documentada deja de representar la realidad del negocio deberá modificarse.

La documentación nunca debe convertirse en un obstáculo para la evolución.

Debe convertirse en la herramienta que permita evolucionar sin perder coherencia.

Production Tracker no pretende imponer una forma de trabajar.

Pretende representar fielmente la forma de trabajar de la empresa.

Si algún día ambas dejan de coincidir, deberá evolucionar el ERP.

Nunca la empresa.

---

# Capítulo 1

# Identidad

## ¿Qué es Analytics?

Analytics constituye la capa de interpretación del negocio dentro de Production Tracker.

Mientras el ERP registra la actividad comercial y operativa de la empresa, Analytics transforma esa información en conocimiento útil para facilitar la toma de decisiones.

No pretende mostrar toda la información disponible.

Pretende mostrar únicamente aquella que aporta valor en cada momento.

Analytics no sustituye la experiencia de las personas.

La complementa.

No sustituye la operativa.

La hace más comprensible.

No sustituye el conocimiento.

Lo organiza.

---

## ¿Qué NO es Analytics?

Analytics no pretende convertirse en:

- un ERP financiero;
- un programa de contabilidad;
- un software financiero;
- una herramienta genérica de Business Intelligence;
- una colección de KPIs;
- una colección de gráficos.

Production Tracker analiza exclusivamente la información comercial y operativa gestionada por el ERP.

La información financiera estructural (tesorería, impuestos, costes generales, balances, flujo de caja, etc.) pertenece a otros sistemas especializados.

Analytics debe respetar siempre ese límite.

---

# Capítulo 2

# Principio Fundamental

## El ERP debe adaptarse al negocio

Este constituye el principio más importante de Production Tracker.

Durante décadas, la mayoría de los ERP han obligado a las empresas a adaptar su forma de trabajar a las limitaciones del software.

Production Tracker adopta la filosofía opuesta.

La empresa define la forma de trabajar.

El ERP debe aprender a representarla.

Esto no significa implementar cualquier petición.

Significa que toda evolución deberá justificarse desde una necesidad real del negocio y nunca únicamente desde limitaciones técnicas, históricas o heredadas.

Cuando exista un conflicto entre la realidad operativa y el diseño del sistema, la primera pregunta nunca será:

> ¿Cómo puede adaptarse la empresa al ERP?

La pregunta correcta será:

> ¿Cómo debe evolucionar el ERP para representar mejor el negocio?

Este principio deberá guiar toda evolución futura del proyecto.

---

# Capítulo 3

# Principios de Analytics

## 1. Una pantalla responde una pregunta.

Cada pantalla deberá tener un objetivo claramente definido.

Cuando una pantalla responda demasiadas preguntas dejará de ser útil.

---

## 2. Una decisión vale más que un KPI.

Analytics no existe para mostrar indicadores.

Existe para facilitar decisiones.

Todo indicador deberá justificar el valor que aporta.

---

## 3. El contexto siempre es más importante que el dato.

Los datos aislados generan interpretaciones erróneas.

Todo indicador deberá presentarse acompañado del contexto necesario para comprenderlo.

---

## 4. La simplicidad constituye un objetivo.

Reducir complejidad representa una mejora del producto.

La incorporación de nuevas funcionalidades nunca deberá aumentar innecesariamente la carga cognitiva del usuario.

---

## 5. La comparación debe seguir la lógica del negocio.

Production Tracker compara campañas utilizando temporadas hermanas.

Las comparativas por año natural constituyen un análisis complementario.

Nunca sustituirán a la comparación natural del negocio.

---

## 6. El conocimiento del negocio prevalece sobre las convenciones del software.

Production Tracker deberá representar cómo trabaja realmente la empresa.

Nunca cómo otros ERP consideran que debería trabajar.

---

# Capítulo 4

# Cómo entiende Production Tracker el negocio

Production Tracker interpreta la empresa desde la perspectiva de su actividad diaria.

El cliente constituye el centro de la relación comercial.

Los pedidos representan el compromiso comercial.

La línea de pedido constituye la unidad operativa del ERP.

Los modelos representan el hilo conductor que conecta desarrollo, producción, calidad y actividad comercial.

Aunque los modelos pertenezcan a los clientes, constituyen el elemento alrededor del cual gira gran parte del conocimiento operativo de la empresa.

La migración hacia una arquitectura basada en `lineas_pedido` no respondió únicamente a una mejora técnica.

Representó la adaptación del ERP a la realidad operativa del negocio.

---

## Las dos operativas

Production Tracker gestiona dos modelos de negocio claramente diferenciados.

### Operativa BSG

BSG desarrolla una actividad basada en compra y venta.

Resulta relevante analizar:

- ventas;
- compras;
- margen comercial;
- evolución comercial;
- crecimiento.

---

### Operativa Xiamen DIC

Xiamen DIC desarrolla una actividad basada en comisión.

Por ello sus indicadores deben interpretarse desde una perspectiva diferente.

Ambas operativas son complementarias.

Analytics deberá reflejar siempre esa diferencia.

---

# Capítulo 5

# Filosofía de evolución

Analytics constituye un documento vivo.

Las decisiones aquí recogidas representan el mejor conocimiento disponible en el momento de su redacción.

Cuando la experiencia demuestre que una solución mejor aporta mayor valor, este documento deberá actualizarse antes de modificar el producto.

La estabilidad no consiste en impedir cambios.

La estabilidad consiste en mantener la coherencia mientras el sistema evoluciona.

Capítulo 6
Executive V2
Misión

Executive constituye la puerta de entrada al conocimiento de la empresa.

No pretende mostrar toda la información disponible.

Pretende responder, en menos de un minuto, a la primera pregunta que se hace un director cuando abre Production Tracker.

¿Cómo está la empresa y dónde debo poner hoy mi atención?

Toda la información presentada en Executive deberá contribuir a responder esa pregunta.

Si un dato no ayuda a comprender la situación o no conduce a una decisión, probablemente pertenece a otro módulo.

Filosofía

Executive no es un dashboard.

Executive es una conversación con el negocio.

La información deberá aparecer siguiendo el mismo proceso mental que seguiría un director experimentado.

Primero comprender.

Después decidir.

Finalmente profundizar.

Nunca al revés.

Flujo de lectura

Executive deberá construirse siguiendo siempre el mismo orden.

1. Situación

¿Cómo está hoy la empresa?

Una visión inmediata del estado general.

2. Cambios

¿Qué ha cambiado respecto a la temporada hermana?

Executive no analiza únicamente el presente.

Analiza la evolución.

Toda variación deberá presentarse siempre con contexto.

3. Atención

¿Qué requiere una decisión?

Executive no pretende señalar todo.

Pretende señalar únicamente aquello que merece atención.

La prioridad constituye un recurso limitado.

4. Explorar

Una vez comprendida la situación, el usuario podrá profundizar.

Executive nunca intentará resolver todas las preguntas.

Cada módulo especializado deberá desarrollar el detalle correspondiente.

Principio de claridad

La mejor pantalla no es la que muestra más información.

Es la que consigue que el usuario comprenda antes la situación.

Si un usuario necesita varios minutos para entender Executive, el problema probablemente no sea el usuario.

Será el diseño de la información.

Executive no sustituye al resto del ERP

Executive resume.

No gestiona.

No planifica.

No ejecuta.

Cuando una decisión requiera detalle, Executive deberá conducir al módulo correspondiente.

Qué no debe contener Executive

Executive no deberá convertirse en:

una colección de KPIs;
un informe financiero;
una pantalla con múltiples rankings;
una herramienta de Business Intelligence genérica;
una acumulación de gráficos.

Su objetivo consiste en facilitar decisiones.

No impresionar mediante información.

Principio de profundidad progresiva

Toda información deberá seguir este patrón:

Comprender

↓

Decidir

↓

Profundizar

Nunca:

Datos

↓

Más datos

↓

Más datos

↓

Intentar comprender
El criterio definitivo

Antes de incorporar cualquier tarjeta, gráfico o indicador deberá responderse una única pregunta:

¿Ayuda realmente a comprender mejor la empresa o simplemente añade más información?

Si únicamente añade información, probablemente no deba formar parte de Executive.

---

# Lecciones aprendidas

## Lección 1

La unidad operativa real del ERP no era el pedido.

Era la línea de pedido.

---

## Lección 2

El software debe adaptarse al negocio.

Nunca al contrario.

---

## Lección 3

Un dashboard puede contener mucha información y seguir siendo poco útil.

La jerarquía de la información resulta tan importante como la propia información.

---

## Lección 4

La información únicamente tiene valor cuando ayuda a tomar una decisión.

---

## Lección 5

Una funcionalidad puede darse por finalizada cuando cumple correctamente su objetivo.

La perfección no debe impedir la evolución del producto.

---
## Calendario comercial y comparativas

La actividad de Production Tracker no se organiza naturalmente por años
calendario.

Dentro de un mismo año natural conviven habitualmente varias campañas en
momentos diferentes de su ciclo comercial y productivo.

Por ejemplo, durante 2026 pueden coexistir:

- pedidos de SS26 recibidos durante 2025 que todavía están en producción;
- pedidos de FW26 recibidos desde finales de 2025;
- nuevos pedidos de SS27;
- primeras entradas de FW27 al final del año.

Por este motivo, una comparación entre años naturales puede resultar útil para
conocer el volumen total de actividad registrado durante cada ejercicio, pero
no representa necesariamente la evolución comercial real de las campañas.

La comparación principal de Production Tracker deberá realizarse entre
temporadas hermanas:

- SS contra SS del año anterior;
- FW contra FW del año anterior.

Ejemplos:

- SS27 frente a SS26;
- FW26 frente a FW25.

Las comparativas por año natural deberán mantenerse como una opción
complementaria para análisis globales, pero nunca sustituirán a la comparación
por temporadas hermanas en Executive ni en los informes comerciales de
campaña.

El orden cronológico de las temporadas y su relación comercial son conceptos
diferentes y deberán modelarse de forma explícita dentro del sistema.

Jerarquía de la información
No toda la información merece el mismo nivel de visibilidad.

Cada módulo debe mostrar únicamente la información adecuada para el nivel de decisión al que está dirigido.

Executive:
    interpreta.

Command Center:
    prioriza el trabajo diario.

Ficha Cliente:
    gestiona el detalle.

Línea de pedido:
    ejecuta la operación.

    La misión de Executive no es mostrar más información. Es reducir la información hasta que solo permanezca aquello que puede cambiar una decisión.
    
    Principio 12 — Escalada de la información
La información debe escalar en profundidad a medida que el usuario la necesita.

Executive
↓
interpreta.

Command Center
↓
prioriza.

Ficha Cliente
↓
analiza.

Línea de pedido
↓
ejecuta.

Principio 13 — El contexto puede romperse por una excepción

Algo así:

El contexto de análisis determina qué información se muestra por defecto.

Sin embargo, una incidencia crítica nunca debe ocultarse por quedar fuera del contexto comercial activo.

La criticidad tiene prioridad sobre el contexto temporal.

# Visión

Production Tracker no pretende convertirse en el ERP con más funcionalidades.

Pretende convertirse en el ERP que mejor represente la inteligencia operativa de la empresa.

Su misión consiste en preservar, organizar y transmitir ese conocimiento para facilitar mejores decisiones hoy y permitir construir mejores herramientas mañana.

El código podrá cambiar.

La tecnología podrá cambiar.

La empresa podrá evolucionar.

La filosofía deberá permanecer.
