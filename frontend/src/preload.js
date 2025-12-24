const { contextBridge, ipcRenderer } = require("electron");

// Also expose some Node.js APIs that might be needed
contextBridge.exposeInMainWorld("nodeAPI", {
  platform: process.platform,
  versions: process.versions,
});

// Expose app information
contextBridge.exposeInMainWorld("appInfo", {
  name: "WilsonPlus",
  version: "1.0.0",
  description: "Building Materials & Paints Inventory Management System",
  author: "WilsonPlus",
});

// Expose database operations for inventory management
contextBridge.exposeInMainWorld("electronAPI", {
  // Item Management
  addItem: (itemData) => ipcRenderer.invoke("db-addItem", itemData),
  updateItem: (id, itemData) => ipcRenderer.invoke("db-updateItem", id, itemData),
  deleteItem: (id) => ipcRenderer.invoke("db-deleteItem", id),
  getItem: (id) => ipcRenderer.invoke("db-getItem", id),
  getAllItems: () => ipcRenderer.invoke("db-getAllItems"),
  searchItems: (query) => ipcRenderer.invoke("db-searchItems", query),
  getUniqueItemNames: () => ipcRenderer.invoke("db-getUniqueItemNames"),
  
  // Quality Management
  getAllQualities: () => ipcRenderer.invoke("db-getAllQualities"),
  addQuality: (name) => ipcRenderer.invoke("db-addQuality", name),
  
  // Customer Management
  getAllCustomers: () => ipcRenderer.invoke("db-getAllCustomers"),
  addCustomer: (name) => ipcRenderer.invoke("db-addCustomer", name),
  
  // Invoice Management
  addInvoice: (invoiceData) => ipcRenderer.invoke("db-addInvoice", invoiceData),
  getAllInvoices: () => ipcRenderer.invoke("db-getAllInvoices"),
  getInvoice: (id) => ipcRenderer.invoke("db-getInvoice", id),
  deleteInvoice: (id) => ipcRenderer.invoke("db-deleteInvoice", id),
  
  // Inventory Batch Management
  getAvailableBatches: (itemId) => ipcRenderer.invoke("db-getAvailableBatches", itemId),
  
  // Sales Management
  addSale: (saleData) => ipcRenderer.invoke("db-addSale", saleData),
  addSalesTransaction: (salesDataArray, transactionNumber, customerName) => ipcRenderer.invoke("db-addSalesTransaction", salesDataArray, transactionNumber, customerName),
  getAllSales: () => ipcRenderer.invoke("db-getAllSales"),
  getAllSalesTransactions: () => ipcRenderer.invoke("db-getAllSalesTransactions"),
  getSalesTransactionDetails: (transactionId) => ipcRenderer.invoke("db-getSalesTransactionDetails", transactionId),
  getSalesByDateRange: (startDate, endDate) => ipcRenderer.invoke("db-getSalesByDateRange", startDate, endDate),
  getTodaySales: () => ipcRenderer.invoke("db-getTodaySales"),
  deleteSalesTransaction: (transactionId) => ipcRenderer.invoke("db-deleteSalesTransaction", transactionId),
  
  // Alert Management
  getAllAlerts: () => ipcRenderer.invoke("db-getAllAlerts"),
  getUnreadAlerts: () => ipcRenderer.invoke("db-getUnreadAlerts"),
  markAlertAsRead: (alertId) => ipcRenderer.invoke("db-markAlertAsRead", alertId),
  markAllAlertsAsRead: () => ipcRenderer.invoke("db-markAllAlertsAsRead"),
  deleteAlert: (alertId) => ipcRenderer.invoke("db-deleteAlert", alertId),
  deleteAllAlerts: () => ipcRenderer.invoke("db-deleteAllAlerts"),
  
  // File Operations
  openPDF: (pdfPath) => ipcRenderer.invoke("open-pdf", pdfPath),
  
  // User/Auth Operations
  validateLogin: (username, password) => ipcRenderer.invoke("validate-login", username, password),
  changePassword: (userId, currentPassword, newPassword) => ipcRenderer.invoke("change-password", userId, currentPassword, newPassword),
  changeUsername: (userId, newUsername) => ipcRenderer.invoke("change-username", userId, newUsername),
  getUser: (userId) => ipcRenderer.invoke("get-user", userId),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke("db-getDashboardStats"),
  
  // File Operations
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  writeFile: (filePath, data) => ipcRenderer.invoke("write-file", filePath, data),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
});
