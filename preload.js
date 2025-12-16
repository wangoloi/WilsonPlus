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
    
    // Database operations
    db: {
        addItem: (itemData) => ipcRenderer.invoke('db-addItem', itemData),
        updateItem: (id, itemData) => ipcRenderer.invoke('db-updateItem', id, itemData),
        deleteItem: (id) => ipcRenderer.invoke('db-deleteItem', id),
        getItem: (id) => ipcRenderer.invoke('db-getItem', id),
        getAllItems: () => ipcRenderer.invoke('db-getAllItems'),
        searchItems: (query) => ipcRenderer.invoke('db-searchItems', query),
        addInvoice: (invoiceData) => ipcRenderer.invoke('db-addInvoice', invoiceData),
        getAllInvoices: () => ipcRenderer.invoke('db-getAllInvoices'),
        getInvoice: (id) => ipcRenderer.invoke('db-getInvoice', id),
        deleteInvoice: (id) => ipcRenderer.invoke('db-deleteInvoice', id),
        addSale: (saleData) => ipcRenderer.invoke('db-addSale', saleData),
        getAllSales: () => ipcRenderer.invoke('db-getAllSales'),
        getSalesByDateRange: (startDate, endDate) => ipcRenderer.invoke('db-getSalesByDateRange', startDate, endDate),
        getTodaySales: () => ipcRenderer.invoke('db-getTodaySales'),
        getAllAlerts: () => ipcRenderer.invoke('db-getAllAlerts'),
        getUnreadAlerts: () => ipcRenderer.invoke('db-getUnreadAlerts'),
        markAlertAsRead: (alertId) => ipcRenderer.invoke('db-markAlertAsRead', alertId),
        markAllAlertsAsRead: () => ipcRenderer.invoke('db-markAllAlertsAsRead'),
        getDashboardStats: () => ipcRenderer.invoke('db-getDashboardStats'),
        exportData: () => ipcRenderer.invoke('db-exportData'),
        importData: (data) => ipcRenderer.invoke('db-importData', data),
        clearAllData: () => ipcRenderer.invoke('db-clearAllData'),
        getDatabaseSize: () => ipcRenderer.invoke('db-getDatabaseSize')
    },
    
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

