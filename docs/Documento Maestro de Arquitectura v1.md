Documento Maestro de Arquitectura del Conocimiento

Este documento describe cómo Production Tracker comprende el negocio. Se apoya en los principios definidos por el Documento Maestro de Arquitectura y no modifica su arquitectura.

Introducción

Production Tracker Analytics constituye la capa de análisis de Production Tracker.

El ERP registra la realidad operativa de la empresa. Analytics ayuda a comprender esa realidad. Las personas toman las decisiones.

Analytics no sustituye al ERP ni al criterio profesional. Su responsabilidad consiste en proporcionar una comprensión coherente, contextual y trazable del negocio.

1. Principios Fundamentales

1.1 ERP como fuente de verdad

El ERP registra y conserva los hechos. Analytics nunca modifica esos hechos ni mantiene una realidad paralela.

1.2 Modelo de Conocimiento

El Modelo de Conocimiento define cómo deben comprenderse los hechos registrados por el ERP y qué significado puede expresarse sobre ellos.

No transforma los hechos.

Transforma la capacidad del sistema para comprenderlos.

1.3 Preguntas

Las preguntas no crean conocimiento.

Exploran el conocimiento definido por el Modelo de Conocimiento.

Toda funcionalidad analítica debe responder una pregunta real del negocio.

1.4 Representación

Las representaciones comunican conocimiento.

Nunca lo modifican.

1.5 Trazabilidad

Toda conclusión debe poder recorrerse hasta los hechos del ERP.

2. Arquitectura

ERP
↓
Hechos
↓
Modelo de Conocimiento
↓
Preguntas
↓
Respuestas
↓
Representaciones
↓
Personas

Responsabilidades

ERP

Registra hechos.

Modelo de Conocimiento

Define el significado común del negocio.

Preguntas

Seleccionan aquello que se desea comprender.

Respuestas

Aplican el Modelo de Conocimiento a una necesidad concreta.

Representaciones

Comunican las respuestas mediante tablas, indicadores, gráficos o cualquier otro formato.

3. Filosofía

Production Tracker Analytics no se organiza alrededor de gráficos.

Tampoco alrededor de indicadores.

Se construye sobre un Modelo de Conocimiento común y se organiza funcionalmente alrededor de preguntas de negocio.

El contexto forma parte del significado.

Un indicador aislado nunca constituye conocimiento suficiente.

4. Explorador Analítico

El Explorador Analítico permite explorar libremente el conocimiento disponible sin romper la arquitectura.

Toda navegación debe conservar la trazabilidad hasta el ERP.

5. Áreas de Conocimiento

Las áreas representan distintas perspectivas del mismo Modelo de Conocimiento.

Operaciones

Comercial

Producto

Producción

Calidad

Logística

Desarrollo

Ejecutivo

Comparten la misma interpretación y difieren únicamente en las preguntas que responden.

6. Garantías Arquitectónicas

El ERP es la única fuente de verdad.

Existe un único Modelo de Conocimiento.

Las preguntas exploran el conocimiento.

El contexto forma parte del significado.

La representación no modifica el conocimiento.

Todo conocimiento es trazable.

El negocio prevalece sobre la tecnología.

Analytics facilita decisiones, no las sustituye.

Declaración de Principios

Production Tracker Analytics existe para ayudar a comprender el negocio.

El ERP registra la realidad.

El Modelo de Conocimiento permite comprenderla.

Las preguntas la exploran.

Las representaciones la comunican.

Las personas deciden.