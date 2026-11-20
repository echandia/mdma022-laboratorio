# MDMA 022 · Clase 5 · Laboratorio en vivo

## 1. Enlace para los estudiantes (GitHub Pages)
Comparte este enlace al inicio de la sesión:

`https://echandia.github.io/mdma022-laboratorio/clase5/`

*(Si quieres usar una sala distinta a `CLASE5`, agrega `?sala=OTROCODIGO` al final del enlace).*

## 2. Cómo ver las respuestas en tiempo real
1. Abre el mismo enlace y entra a la pestaña **Muro en vivo** (`#muro`).
2. Apenas cada grupo elige su número (`Grupo 1`…`Grupo 10`) y empieza a escribir, sus respuestas aparecen **en tiempo real** en la vista **Por pregunta (en vivo)** y **Por grupo**, además de quedar registradas cuando pulsan **Publicar en el muro**.
3. Los **Tickets de salida** del Momento 7 se guardan de forma individual por estudiante.

## 3. Respaldo automático de respuestas en tu computador (opcional pero recomendado)
Durante la clase puedes dejar corriendo el grabador local en tu terminal:

```bash
cd "/Users/eugeniochandia/Library/CloudStorage/Dropbox/2026/UCSC/Segundo Semestre/MDM/Clase 5/MDMA022_Clase5_colaborativo"
node server.js
```

Mientras esté abierto:
- Escucha automáticamente la sala `CLASE5` en vivo (aunque los estudiantes entren por GitHub Pages).
- Guarda cada respuesta en tiempo real en **`datos_clase5.json`** y **`respuestas_clase5.csv`** (listo para Excel).
- También puedes abrir la vista docente local en `http://localhost:3457/#muro`.

Adicionalmente, desde la pestaña **Muro en vivo** del navegador siempre puedes pulsar **Exportar CSV (Excel)** o **Guardar respaldo JSON** en cualquier momento.
