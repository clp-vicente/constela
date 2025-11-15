# constela

Una app de escritorio para usar Gemini de manera nativa.

// funciones

* Interfaz con modo claro y oscuro
* Menú lateral con historial de chats
* Puedes renombrar y eliminar chats
* Selector para cambiar entre los modelos de Gemini
* Formato para los bloques de código en las respuestas
* Soporte para negrita, cursiva y subrayado
* Análisis de imágenes y documentos (pdf, docx, pptx)

// Compilación

Necesitas tener Node.js, Python y una API key de Google AI.

1.  **Clona el repo e instala dependencias de Node.js:**
    ```bash
    # Clona el repositorio y entra en la carpeta
    git clone https://github.com/tu_usuario/constela.git
    cd constela
    # Instala las dependencias
    npm install
    ```

2.  **Prepara el backend de Python:**
    *   Instala las librerías necesarias:
        ```bash
        pip install google-generativeai pyinstaller PyMuPDF python-docx python-pptx
        ```
    *   **Importante:** Abre el archivo `backend/backend.py` y reemplaza el valor de la variable `API_KEY` con tu propia API key de Google AI.

3.  **Compila el backend (específico para tu sistema operativo):**

    ### Para Windows
    ```bash
    pyinstaller --name GeminiBackend --onefile --noconsole backend/backend.py
    ```
    *   Crea una carpeta llamada `extraResources` en la raíz del proyecto.
    *   Mueve el archivo `GeminiBackend.exe` (que está en la carpeta `dist/`) a la carpeta `extraResources/`.

    ### Para Linux
    ```bash
    pyinstaller --name GeminiBackend --onefile --noconsole backend/backend.py
    ```
    *   Crea una carpeta llamada `extraResources` en la raíz del proyecto.
    *   Mueve el ejecutable `GeminiBackend` (que está en la carpeta `dist/`) a la carpeta `extraResources/`.

4.  **Inicia la app en modo desarrollo:**
    ```bash
    npm start
    ```

// Para crear el instalador

Si quieres empaquetar la app para distribución, usa:

```bash
npm run dist
```
Esto generará un instalador para Windows (`.exe`) o un paquete para Linux (ej. `.AppImage`) en la carpeta `dist/`.
