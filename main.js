// WilsonPlus - Main Electron Process
const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('./database');

// Keep a global reference of the window object
let mainWindow;
let isDev = process.argv.includes('--dev');
let db = null;

// Initialize database - will be called when app is ready
async function initializeDatabase() {
    if (!db) {
        db = await getDatabase();
        console.log('Database initialized successfully');
    }
    return db;
}

// Enable live reload for development
if (isDev) {
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
            hardResetMethod: 'exit'
        });
    } catch (err) {
        console.log('electron-reload not available in production');
    }
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        // icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'WilsonPlus - Building Materials & Paints Inventory',
        show: false, // Don't show until ready
        titleBarStyle: 'default'
    });

    // Load the app
    mainWindow.loadFile('index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus on the window
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Prevent navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });
}

// App event handlers
app.whenReady().then(async () => {
    // Initialize database first
    await initializeDatabase();
    createWindow();
    createMenu();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Close database connection before quitting
        if (db) {
            db.close();
        }
        app.quit();
    }
});

// Close database on app quit
app.on('before-quit', () => {
    if (db) {
        db.close();
    }
});

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Invoice',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-item');
                    }
                },
                {
                    label: 'New Sale',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-sale');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export Data',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export-data');
                    }
                },
                {
                    label: 'Import Data',
                    accelerator: 'CmdOrCtrl+I',
                    click: () => {
                        mainWindow.webContents.send('menu-import-data');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Navigation',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => {
                        mainWindow.webContents.send('menu-navigate', 'dashboard');
                    }
                },
                {
                    label: 'Materials',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => {
                        mainWindow.webContents.send('menu-navigate', 'inventory');
                    }
                },
                {
                    label: 'Sales',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => {
                        mainWindow.webContents.send('menu-navigate', 'sales');
                    }
                },
                {
                    label: 'Alerts',
                    accelerator: 'CmdOrCtrl+4',
                    click: () => {
                        mainWindow.webContents.send('menu-navigate', 'alerts');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About WilsonPlus',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About WilsonPlus',
                            message: 'WilsonPlus - Building Materials & Paints Inventory',
                            detail: 'Version 1.0.0\n\nA comprehensive offline building materials and paints inventory management application.\n\nBuilt with Electron and modern web technologies.',
                            buttons: ['OK']
                        });
                    }
                },
                {
                    label: 'Keyboard Shortcuts',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Keyboard Shortcuts',
                            message: 'WilsonPlus Keyboard Shortcuts',
                            detail: 'Ctrl+N - New Invoice\nCtrl+Shift+N - New Sale\nCtrl+E - Export Data\nCtrl+I - Import Data\nCtrl+1 - Dashboard\nCtrl+2 - Materials\nCtrl+3 - Sales\nCtrl+4 - Alerts\nCtrl+Q - Exit',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers for file operations
ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        fs.writeFileSync(filePath, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Database IPC handlers - all handlers ensure database is initialized
ipcMain.handle('db-addItem', async (event, itemData) => {
    try {
        const database = await initializeDatabase();
        const id = database.addItem(itemData);
        return { success: true, id };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-updateItem', async (event, id, itemData) => {
    try {
        const database = await initializeDatabase();
        database.updateItem(id, itemData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-deleteItem', async (event, id) => {
    try {
        const database = await initializeDatabase();
        database.deleteItem(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getItem', async (event, id) => {
    try {
        const database = await initializeDatabase();
        const item = database.getItem(id);
        return { success: true, data: item };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getAllItems', async (event) => {
    try {
        const database = await initializeDatabase();
        const items = database.getAllItems();
        return { success: true, data: items };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-searchItems', async (event, query) => {
    try {
        const database = await initializeDatabase();
        const items = database.searchItems(query);
        return { success: true, data: items };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-addInvoice', async (event, invoiceData) => {
    try {
        const database = await initializeDatabase();
        const id = database.addInvoice(invoiceData);
        return { success: true, id };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getAllInvoices', async (event) => {
    try {
        const database = await initializeDatabase();
        const invoices = database.getAllInvoices();
        return { success: true, data: invoices };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getInvoice', async (event, id) => {
    try {
        const database = await initializeDatabase();
        const invoice = database.getInvoice(id);
        return { success: true, data: invoice };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-deleteInvoice', async (event, id) => {
    try {
        const database = await initializeDatabase();
        database.deleteInvoice(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-addSale', async (event, saleData) => {
    try {
        const database = await initializeDatabase();
        database.addSale(saleData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getAllSales', async (event) => {
    try {
        const database = await initializeDatabase();
        const sales = database.getAllSales();
        return { success: true, data: sales };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getSalesByDateRange', async (event, startDate, endDate) => {
    try {
        const database = await initializeDatabase();
        const sales = database.getSalesByDateRange(startDate, endDate);
        return { success: true, data: sales };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getTodaySales', async (event) => {
    try {
        const database = await initializeDatabase();
        const sales = database.getTodaySales();
        return { success: true, data: sales };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getAllAlerts', async (event) => {
    try {
        const database = await initializeDatabase();
        const alerts = database.getAllAlerts();
        return { success: true, data: alerts };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getUnreadAlerts', async (event) => {
    try {
        const database = await initializeDatabase();
        const alerts = database.getUnreadAlerts();
        return { success: true, data: alerts };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-markAlertAsRead', async (event, alertId) => {
    try {
        const database = await initializeDatabase();
        database.markAlertAsRead(alertId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-markAllAlertsAsRead', async (event) => {
    try {
        const database = await initializeDatabase();
        database.markAllAlertsAsRead();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getDashboardStats', async (event) => {
    try {
        const database = await initializeDatabase();
        const stats = database.getDashboardStats();
        return { success: true, data: stats };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-exportData', async (event) => {
    try {
        const database = await initializeDatabase();
        const data = database.exportData();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-importData', async (event, data) => {
    try {
        const database = await initializeDatabase();
        database.importData(data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-clearAllData', async (event) => {
    try {
        const database = await initializeDatabase();
        database.clearAllData();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-getDatabaseSize', async (event) => {
    try {
        const database = await initializeDatabase();
        const size = database.getDatabaseSize();
        return { success: true, data: size };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle app protocol for deep linking (optional)
app.setAsDefaultProtocolClient('wilsonplus');

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
        // In development, ignore certificate errors
        event.preventDefault();
        callback(true);
    } else {
        // In production, use default behavior
        callback(false);
    }
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
