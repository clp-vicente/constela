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
  startNewChat: () => ipcRenderer.send('start-new-chat'),
  loadHistoryContext: (history) => ipcRenderer.send('load-history-context', history),
  
  restartWithSettings: () => ipcRenderer.send('restart-with-settings'),
  getChatHistory: () => ipcRenderer.sendSync('get-chat-history'),
  saveChat: (chat) => ipcRenderer.sendSync('save-chat', chat),
  loadChat: (id) => ipcRenderer.sendSync('load-chat', id),
  deleteChat: (id) => ipcRenderer.send('delete-chat', id),
  renameChat: (data) => ipcRenderer.send('rename-chat', data),
  
  loadSVG: (filename) => ipcRenderer.sendSync('load-svg', filename),
});