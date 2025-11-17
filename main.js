const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;

const CHAT_HISTORY_DIR = path.join(app.getPath('userData'), 'ChatHistory');
if (!fs.existsSync(CHAT_HISTORY_DIR)) {
    fs.mkdirSync(CHAT_HISTORY_DIR);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
    },
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.setMenu(null);

  ipcMain.once('renderer-ready', (event, settings) => {
    console.log("renderer listo. iniciando GeminiBackend.exe...");

    const model = settings.model || 'gemini-2.5-flash';
    
    const backendScript = path.join(__dirname, 'backend', 'backend.py');

    console.log(`iniciando backend script: ${backendScript}`);
    
    pythonProcess = spawn('./.venv/bin/python', [backendScript, model]);

    pythonProcess.stdout.setEncoding('utf8');

    pythonProcess.on('error', (err) => {
      console.error('error: backend - ', err);
      if (mainWindow) {
        mainWindow.webContents.send('gemini-response', JSON.stringify({ error: `fallo al iniciar el backend: ${err.message}` }));
      }
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`el proceso del backend ha terminado. codigo: ${code}`);
      if (code !== 0 && mainWindow) { 
        mainWindow.webContents.send('gemini-response', JSON.stringify({ error: `el backend termino inesperadamente (codigo: ${code}).` }));
      }
    });

    pythonProcess.stdout.on('data', (data) => {
      const messages = data.split('\n');
      
      messages.forEach(message => {
        if (!message.trim()) return;
        try {
          const parsed = JSON.parse(message);
          if (parsed.status && parsed.status === 'ready') {
            if (mainWindow) mainWindow.webContents.send('backend-status', 'ready');
          } else {
            if (mainWindow) mainWindow.webContents.send('gemini-response', message);
          }
        } catch (e) {
          console.log(`informacion python: ${message}`);
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`error: backend - ${data}`);
    });
  });

  mainWindow.on('closed', () => {
    if (pythonProcess) pythonProcess.kill();
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

ipcMain.on('user-prompt', (event, data) => { 
    if (pythonProcess) { 
        const request = { 
            action: 'send_message', 
            prompt: data.prompt, 
            filePath: data.filePath, 
            instructions: data.instructions,
            temperature: data.temperature,
            maxOutputTokens: data.maxOutputTokens
        };
        pythonProcess.stdin.write(JSON.stringify(request) + '\n'); 
    }
});

ipcMain.on('start-new-chat', (event, data) => { 
    if (pythonProcess) { 
        const request = { 
            action: 'reset', 
            instructions: data ? data.instructions : null,
            temperature: data ? data.temperature : null,
            maxOutputTokens: data ? data.maxOutputTokens : null
        }; 
        pythonProcess.stdin.write(JSON.stringify(request) + '\n'); 
    }
});
ipcMain.on('restart-with-settings', () => { dialog.showMessageBox(mainWindow, { type: 'info', title: 'Cambio de Modelo', message: 'Para aplicar el cambio de modelo, la aplicación se reiniciará.', buttons: ['OK'] }).then(() => { app.relaunch(); app.quit(); }); });
ipcMain.on('load-svg', (event, filename) => { const filepath = path.join(__dirname, 'assets', filename); try { event.returnValue = fs.readFileSync(filepath, 'utf-8'); } catch (err) { console.error(`Error al leer SVG: ${filename}`, err); event.returnValue = null; }});
ipcMain.on('get-chat-history', (event) => { try { const files = fs.readdirSync(CHAT_HISTORY_DIR).filter(f => f.endsWith('.json')); files.sort((a, b) => fs.statSync(path.join(CHAT_HISTORY_DIR, b)).mtime.getTime() - fs.statSync(path.join(CHAT_HISTORY_DIR, a)).mtime.getTime()); event.returnValue = files.map(file => { let title = file.replace('.json', '').replace('chat_', ''); const lastUnderscoreIndex = title.lastIndexOf('_'); if (lastUnderscoreIndex > -1) { const potentialTimestamp = title.substring(lastUnderscoreIndex + 1); if (!isNaN(potentialTimestamp) && potentialTimestamp.length > 5) { title = title.substring(0, lastUnderscoreIndex); }} title = title.replace(/_/g, ' '); if (!title.trim()) { title = "Nuevo Chat"; } return { id: file, title: title.trim() }; }); } catch (e) { event.returnValue = []; }});
ipcMain.on('save-chat', (event, { id, history }) => { const filename = id || `chat_${Date.now()}.json`; try { fs.writeFileSync(path.join(CHAT_HISTORY_DIR, filename), JSON.stringify(history, null, 2)); event.returnValue = filename; } catch (e) { event.returnValue = id; }});
ipcMain.on('load-chat', (event, id) => { const filepath = path.join(CHAT_HISTORY_DIR, id); try { if (fs.existsSync(filepath)) { event.returnValue = JSON.parse(fs.readFileSync(filepath, 'utf-8')); } else { event.returnValue = null; }} catch (e) { event.returnValue = null; }});

ipcMain.handle('delete-chat', (event, chatId) => { 
  if (!chatId || typeof chatId !== 'string') {
    return { success: false, error: 'ID de chat inválido.' };
  }
  const filePath = path.join(CHAT_HISTORY_DIR, chatId);

  if (path.dirname(filePath) !== CHAT_HISTORY_DIR) {
    return { success: false, error: 'Ruta de archivo no permitida.' };
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Chat eliminado: ${chatId}`);
      return { success: true };
    }
    return { success: false, error: 'El archivo no existe.' };
  } catch (err) {
    console.error(`Error al eliminar el chat ${chatId}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('rename-chat', (event, { oldId, newTitle }) => {
  if (!oldId || !newTitle) {
    return { success: false, error: 'Faltan datos para renombrar.' };
  }

  const safeTitle = newTitle.trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  const newId = `chat_${safeTitle}_${Date.now()}.json`;
  const oldPath = path.join(CHAT_HISTORY_DIR, oldId);
  const newPath = path.join(CHAT_HISTORY_DIR, newId);

  if (path.dirname(oldPath) !== CHAT_HISTORY_DIR) {
    return { success: false, error: 'Ruta de archivo no permitida.' };
  }

  try {
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`Chat renombrado de ${oldId} a ${newId}`);
      return { success: true, newId: newId };
    }
    return { success: false, error: 'El archivo no existe.' };
  } catch (err) {
    console.error(`Error al renombrar el chat ${oldId}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.on('load-history-context', (event, data) => {
  if (pythonProcess) {
    const request = { 
      action: 'load_history', 
      history: data.history,
      instructions: data.instructions,
      temperature: data.temperature,
      maxOutputTokens: data.maxOutputTokens
    };
    pythonProcess.stdin.write(JSON.stringify(request) + '\n');
  }
});

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      { name: 'Documents', extensions: ['pdf', 'docx', 'pptx'] },
      { name: 'All Files', extensions: ['*'] },
    ]
  });
  if (!canceled) {
    return filePaths[0];
  }
});

ipcMain.handle('dialog:saveInstructions', async (event, instructions) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar Instrucciones del Agente',
    defaultPath: 'agent-instructions.txt',
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, instructions, 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Error al guardar las instrucciones:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('dialog:loadInstructions', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Cargar Instrucciones del Agente',
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!canceled && filePaths.length > 0) {
    try {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      return content;
    } catch (err) {
      console.error('Error al cargar las instrucciones:', err);
      return null;
    }
  }
  return null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});