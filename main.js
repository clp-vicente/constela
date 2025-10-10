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

  ipcMain.once('renderer-ready', (event, settings) => {
    console.log("renderer listo. iniciando GeminiBackend.exe...");

    const model = settings.model || 'gemini-2.5-flash';
    
    const backendExecutable = app.isPackaged
      ? path.join(process.resourcesPath, 'GeminiBackend.exe')
      : path.join(__dirname, 'extraResources', 'GeminiBackend.exe');

    console.log(`iniciando backend ejecutable: ${backendExecutable}`);
    
    pythonProcess = spawn(backendExecutable, [model]);

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

ipcMain.on('user-prompt', (event, prompt) => { if (pythonProcess) { const request = { prompt: prompt }; pythonProcess.stdin.write(JSON.stringify(request) + '\n'); }});
ipcMain.on('start-new-chat', () => { if (pythonProcess) { const request = { action: 'reset' }; pythonProcess.stdin.write(JSON.stringify(request) + '\n'); }});
ipcMain.on('restart-with-settings', () => { dialog.showMessageBox(mainWindow, { type: 'info', title: 'Cambio de Modelo', message: 'Para aplicar el cambio de modelo, la aplicación se reiniciará.', buttons: ['OK'] }).then(() => { app.relaunch(); app.quit(); }); });
ipcMain.on('load-svg', (event, filename) => { const filepath = path.join(__dirname, 'assets', filename); try { event.returnValue = fs.readFileSync(filepath, 'utf-8'); } catch (err) { console.error(`Error al leer SVG: ${filename}`, err); event.returnValue = null; }});
ipcMain.on('get-chat-history', (event) => { try { const files = fs.readdirSync(CHAT_HISTORY_DIR).filter(f => f.endsWith('.json')); files.sort((a, b) => fs.statSync(path.join(CHAT_HISTORY_DIR, b)).mtime.getTime() - fs.statSync(path.join(CHAT_HISTORY_DIR, a)).mtime.getTime()); event.returnValue = files.map(file => { let title = file.replace('.json', '').replace('chat_', ''); const lastUnderscoreIndex = title.lastIndexOf('_'); if (lastUnderscoreIndex > -1) { const potentialTimestamp = title.substring(lastUnderscoreIndex + 1); if (!isNaN(potentialTimestamp) && potentialTimestamp.length > 5) { title = title.substring(0, lastUnderscoreIndex); }} title = title.replace(/_/g, ' '); if (!title.trim()) { title = "Nuevo Chat"; } return { id: file, title: title.trim() }; }); } catch (e) { event.returnValue = []; }});
ipcMain.on('save-chat', (event, { id, history }) => { const filename = id || `chat_${Date.now()}.json`; try { fs.writeFileSync(path.join(CHAT_HISTORY_DIR, filename), JSON.stringify(history, null, 2)); event.returnValue = filename; } catch (e) { event.returnValue = id; }});
ipcMain.on('load-chat', (event, id) => { const filepath = path.join(CHAT_HISTORY_DIR, id); try { if (fs.existsSync(filepath)) { event.returnValue = JSON.parse(fs.readFileSync(filepath, 'utf-8')); } else { event.returnValue = null; }} catch (e) { event.returnValue = null; }});
ipcMain.on('delete-chat', (event, chatId) => { if (!chatId || typeof chatId !== 'string') return; const filePath = path.join(CHAT_HISTORY_DIR, chatId); if (path.dirname(filePath) !== CHAT_HISTORY_DIR) { return; } try { if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }} catch (err) { console.error(err); }});
ipcMain.on('rename-chat', (event, { oldId, newTitle }) => { if (!oldId || !newTitle) return; const safeTitle = newTitle.trim().replace(/\s+/g, '_').replace(/[^\w-]/g, ''); const newId = `chat_${safeTitle}_${Date.now()}.json`; const oldPath = path.join(CHAT_HISTORY_DIR, oldId); const newPath = path.join(CHAT_HISTORY_DIR, newId); if (path.dirname(oldPath) !== CHAT_HISTORY_DIR) { return; } try { if (fs.existsSync(oldPath)) { fs.renameSync(oldPath, newPath); }} catch (err) { console.error(err); }});

ipcMain.on('load-history-context', (event, history) => {
  if (pythonProcess) {
    const request = { action: 'load_history', history: history };
    pythonProcess.stdin.write(JSON.stringify(request) + '\n');
  }
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