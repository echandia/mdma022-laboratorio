# MDMA 022 · Laboratorio colaborativo de variabilidad

## Qué contiene

- `index.html`: laboratorio original ampliado con una sala colaborativa, envío manual de avances y tablero de contraste.
- `live.js`: lógica de sesiones, equipos, publicación y vista docente.
- `firebase-config.js`: configuración del proyecto de Firebase (vacía en la entrega).
- `firestore.rules`: reglas de seguridad de la base de datos.

**Importante:** la demostración funciona localmente, pero **NO** sincroniza equipos. La sincronización real exige conectar un proyecto Firebase y publicar estos archivos en una web accesible mediante HTTPS. No se ha creado ni alojado un servidor por cuenta del usuario.

## Activar la colaboración real

1. En https://console.firebase.google.com/, crear un proyecto (puede utilizarse un proyecto ya existente). No introducir datos personales de estudiantes reales en las pruebas.
2. En la sección **Authentication**, activar el proveedor **Anónimo** (Sign-in method / Anonymous).
3. En **Firestore Database**, crear la base de datos y seleccionar la región adecuada. No dejar las reglas abiertas de prueba para la clase.
4. En Firestore > **Rules**, pegar el contenido de `firestore.rules` y pulsar **Publish**. Las reglas solo permiten al usuario anónimo crear/modificar su entrega y al creador de la sala cambiar el foco, seleccionar equipos o cerrar la sala.
5. En configuración del proyecto > **Your apps**, registrar una aplicación web y copiar sus parámetros `apiKey`, `authDomain`, `projectId`, `appId`. Pegarlos dentro de `firebase-config.js` siguiendo el ejemplo comentado. Esta configuración no es una contraseña, pero no debes incluir credenciales privadas de servicio.
6. Publicar los archivos `index.html`, `live.js`, `firebase-config.js` en un hosting estático HTTPS (Firebase Hosting, GitHub Pages o Netlify). Para Firebase Hosting, se puede usar la interfaz/CLI y seleccionar este directorio como carpeta pública. El archivo de reglas de Firestore se publica a través de la consola, no se copia como recurso web.
7. En Authentication > Settings > Authorized domains, registrar el dominio de alojamiento si hiciera falta para el flujo de autenticación.
8. Probar con dos navegadores distintos: crear sala como docente, ingresar con código como equipo, publicar un avance y comprobar que aparece en el tablero docente.

## Uso en clase por videollamada

1. **Docente:** abrir la aplicación en un navegador y elegir **Crear sala docente**. Compartir URL con código o dictar el código de seis caracteres.
2. **Equipos:** abrir el enlace e ingresar como equipo. Completar «Nombre o número de grupo» antes de publicar.
3. Tras cada fase (observaciones, hipótesis, pregunta, mediación), pulsar el botón **Publicar**. La edición local **no** se envía automáticamente, para permitir la revisión por el equipo antes de compartir.
4. **Docente:** cambiar a «Panel docente» y usar el «Tablero colectivo de razonamiento». Seleccionar dos equipos y proyectar el contraste de sus afirmaciones, predicciones, evidencias y preguntas.
5. El docente puede **publicar foco**, **cerrar o reabrir** la recepción de entregas y **exportar CSV**.
6. Los equipos mantienen las opciones anteriores de descargar su trabajo JSON o TXT.

## Límites y resguardos

- El ejemplo de asistencia comunal emplea **datos simulados**, no cifras oficiales.
- La sincronización requiere **Internet** y una configuración real de Firebase. El HTML por sí solo no puede ofrecer sincronización remota.
- Los equipos se identifican por un inicio de sesión **anónimo** generado por Firebase. Cada navegador/equipo tiene su propia identidad de escritura. Una vez borrados los datos del navegador, podría perderse esa identidad.
- Los participantes **sí pueden leer las respuestas de otros equipos** en la misma sala si conocen su código; se trata de un espacio compartido. Usa nombres de equipo, no datos personales de alumnado escolar. No publiques resultados sensibles.
- El creador solo puede gestionar la sala desde el navegador que mantiene su identidad anónima. Para recuperar control desde otro equipo hace falta un sistema de autenticación docente adicional, no incluido.
- El código de sala no es una contraseña. No lo publiques en espacios abiertos y crea una sala distinta para cada clase. La autenticación anónima protege la escritura de cada equipo, pero **no** equivale a una plataforma institucional con gestión avanzada de acceso.
- La aplicación no incorpora calificación algorítmica de las hipótesis: el juicio conceptual debe construirlo el grupo con apoyo docente.
- Si el hosting bloquea los scripts externos o Firebase no está configurado, utiliza **Probar demostración** (sin sincronización real).

## Ruta de 100 minutos

- 0–15: explorar variabilidad y publicar dos observaciones.
- 15–30: problematizar y discutir inferencias indebidas.
- 30–55: construir hipótesis rivales, predicciones y evidencias refutadoras; publicar.
- 55–75: precisar la pregunta estadística; publicar y contrastar equipos.
- 75–95: diseñar preguntas docentes y retroalimentaciones; publicar.
- 95–100: cierre y exportación final.
