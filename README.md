# constela

una app de escritorio para usar gemini de manera nativa en windows.

// funciones

* interfaz con modo claro y oscuro
* menú lateral con historial de chats
* puedes renombrar y eliminar chats
* selector para cambiar entre los modelos de gemini
* formato para los bloques de código en las respuestas
* soporte para negrita, cursiva y subrayado
* analisis de imagenes y documentos (pdf, docx, pptx)

// compilacion 

necesitas tener node.js, python y una api key de google ai

1.  **clona el repo y entra a la carpeta:**

2.  **instala las dependencias de node:**
    ```bash
    npm install
    ```

3.  **prepara el backend de python:**
    * instala las librerias necesarias:
        ```bash
        pip install google-generativeai pyinstaller PyMuPDF python-docx python-pptx
        ```
    * pon tu API_KEY en backend.py

4.  **compila el backend:**
    ```bash
    pyinstaller --name GeminiBackend --onefile --noconsole backend/backend.py
    ```

5.  **mueve el ejecutable:**
    * crea una carpeta llamada `extraResources` en la raíz del proyecto.
    * mueve el archivo `GeminiBackend.exe` (que está en la carpeta `dist/`) a la carpeta `extraResources/`.

6.  **inicia la app en modo desarrollo:**
    ```bash
    npm start
    ```

// para crear el instalador

si quieres empaquetar la app, usa

```bash
npm run dist
```
