# MDMA 022 · Variabilidad Investigable (Laboratorio Interactivo en Vivo)

Laboratorio didáctico autocontenido de razonamiento estadístico para **MDMA 022 · Metodología de la Enseñanza de los Datos y el Azar** (Magíster en Didáctica de la Matemática · UCSC).

## Características principales

1. **100 % Autocontenido con el marco conceptual del curso (Beamer):**
   - **Inicio:** Contrato didáctico, Ciclo **PPDAC** (*Wild & Pfannkuch, 1999*), **Estadística Cívica** y **Modelo de Toulmin** (*Dato → Afirmación → Garantía → Respaldo → Calificador modal → Reserva*).
   - **Etapa 1 · Explorar:** *Concepto 1 (Omnipresencia de la variabilidad)*, *Concepto 1b (Transnumeración: dato crudo → tabla → gráfico → estadísticos)* y *Concepto 2 (Visión local/puntual vs. visión global/distribucional, Bakker & Gravemeijer, 2004)*.
   - **Etapa 2 · Problematizar:** *Concepto 2b (Falacia ecológica y paradoja de agregación de Robinson, 1950)* y *Concepto 3 (4 fuentes de variabilidad: Fenómeno/Contexto, Composición/Agregación, Medición/Registro, Muestreo/Inferencia)*.
   - **Etapa 3 · Hipótesis:** *Concepto 3a (Anatomía de una hipótesis estadística: Mecanismo + Predicción + Refutación)* y *Concepto 3b (Ejemplos explícitos H1–H4 en los 4 planos + tabla de contraste empírico)*.
   - **Etapa 4 · Pregunta:** *Concepto 4 (De pregunta vaga a pregunta investigable, Arnold 2013)* y *Puente Curricular MINEDUC (7.º básico a 4.º medio + FG)*.
   - **Etapa 5 · Mediación:** *Concepto 5 (4 movimientos de mediación docente)* y *3 Mediaciones Modeladas completas (Caso I: Asistencia escolar, Caso II: Brecha de puntajes PAES/SIMCE, Caso III: Tiempo de traslado escolar)*.
   - **Etapa 6 · Cierre:** *Síntesis de los 5 cierres conceptuales del taller* + *Ticket de salida metacognitivo*.

2. **Sincronización en tiempo real en GitHub Pages:**
   - Funciona directamente en **GitHub Pages** (`https://echandia.github.io/...`) gracias al canal de sincronización en la nube integrado (`ntfy.sh` HTTPS + SSE) y soporte opcional para **Cloud Firestore** (`firebase-config.js`) o servidor local Node.js (`node server.js`).
   - El docente puede crear o abrir cualquier sala de 6 caracteres (o ver todas las salas unificadas en vivo), proyectar todas las etapas de todos los equipos, comparar dos equipos lado a lado, cargar archivos `.json` de respaldo y exportar la matriz completa a `.csv`.

## Publicación en GitHub Pages

1. Sube este repositorio a GitHub (por ejemplo, `https://github.com/echandia/mdma022-laboratorio`).
2. En **Settings → Pages**, selecciona **Deploy from a branch** → rama `main` → carpeta `/ (root)` (o **GitHub Actions**).
3. El laboratorio quedará publicado permanentemente en `https://echandia.github.io/mdma022-laboratorio/`.
