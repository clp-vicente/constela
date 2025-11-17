const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onResponse: (callback) => {
    ipcRenderer.removeAllListeners('gemini-response');
    ipcRenderer.on('gemini-response', (_event, value) => callback(value));
  },
  onBackendStatus: (callback) => {
    ipcRenderer.removeAllListeners('backend-status');
    ipcRenderer.on('backend-status', (_event, value) => callback(value));
  },
  
  sendPrompt: (prompt) => ipcRenderer.send('user-prompt', prompt),
  sendRendererReady: (settings) => ipcRenderer.send('renderer-ready', settings),
  startNewChat: (data) => ipcRenderer.send('start-new-chat', data),
  loadHistoryContext: (data) => ipcRenderer.send('load-history-context', data),

  dialogOpenFile: () => ipcRenderer.invoke('dialog:openFile'),
  dialogSaveInstructions: (instructions) => ipcRenderer.invoke('dialog:saveInstructions', instructions),
  dialogLoadInstructions: () => ipcRenderer.invoke('dialog:loadInstructions'),

  restartWithSettings: () => ipcRenderer.send('restart-with-settings'),
  getChatHistory: () => ipcRenderer.sendSync('get-chat-history'),
  saveChat: (chat) => ipcRenderer.sendSync('save-chat', chat),
  loadChat: (id) => ipcRenderer.sendSync('load-chat', id),
  deleteChat: (id) => ipcRenderer.invoke('delete-chat', id),
  renameChat: (data) => ipcRenderer.invoke('rename-chat', data),
  
  loadSVG: (filename) => ipcRenderer.sendSync('load-svg', filename),
});