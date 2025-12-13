// WilsonPlus - Preload Script for Secure IPC Communication
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // Menu event listeners
    onMenuNewItem: (callback) => ipcRenderer.on('menu-new-item', callback),
    onMenuNewSale: (callback) => ipcRenderer.on('menu-new-sale', callback),
    onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
    onMenuImportData: (callback) => ipcRenderer.on('menu-import-data', callback),
    onMenuNavigate: (callback) => ipcRenderer.on('menu-navigate', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // Platform info
    platform: process.platform,
    isElectron: true
});

// Remove menu event listeners when the page is unloaded
window.addEventListener('beforeunload', () => {
    ipcRenderer.removeAllListeners('menu-new-item');
    ipcRenderer.removeAllListeners('menu-new-sale');
    ipcRenderer.removeAllListeners('menu-export-data');
    ipcRenderer.removeAllListeners('menu-import-data');
    ipcRenderer.removeAllListeners('menu-navigate');
});

