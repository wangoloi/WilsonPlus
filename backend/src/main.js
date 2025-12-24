const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  screen,
  Menu,
} = require("electron");
const path = require("path");
const { readFileSync, writeFileSync, existsSync } = require("fs");

// Try to load dotenv, but don't fail if it's not available
try {
  require("dotenv").config();
} catch (error) {
  console.log("dotenv not available, using default environment variables");
}

// Import database schema and repositories
const DatabaseSchema = require("./infrastructure/database/schema");
const ItemRepository = require("./domains/items/repositories/ItemRepository");
const InvoiceRepository = require("./domains/invoices/repositories/InvoiceRepository");
const SaleRepository = require("./domains/sales/repositories/SaleRepository");
const SalesTransactionRepository = require("./domains/sales/repositories/SalesTransactionRepository");
const AlertRepository = require("./domains/alerts/repositories/AlertRepository");
const InventoryBatchRepository = require("./domains/inventory_batches/repositories/InventoryBatchRepository");
const UserRepository = require("./domains/users/repositories/UserRepository");
const QualityRepository = require("./domains/quality/repositories/QualityRepository");
const CustomerRepository = require("./domains/customers/repositories/CustomerRepository");

// Import services
const ItemService = require("./domains/items/services/ItemService");
const UserService = require("./domains/users/services/UserService");
const QualityService = require("./domains/quality/services/QualityService");
const CustomerService = require("./domains/customers/services/CustomerService");

// Removed: Old NyumbaTrack helper function (not needed for inventory management)

// Global variables
let mainWindow;
let db;
let itemRepository,
  invoiceRepository,
  saleRepository,
  salesTransactionRepository,
  alertRepository,
  inventoryBatchRepository,
  userRepository,
  qualityRepository,
  customerRepository;
let itemService, userService, qualityService, customerService;

// Window state management
const windowStateFile = path.join(__dirname, "window-state.json");

function saveWindowState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    const isFullScreen = mainWindow.isFullScreen();

    const windowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
      isFullScreen,
    };

    try {
      writeFileSync(windowStateFile, JSON.stringify(windowState, null, 2));
    } catch (error) {
      console.error("Failed to save window state:", error);
    }
  }
}

function loadWindowState() {
  try {
    if (existsSync(windowStateFile)) {
      const data = readFileSync(windowStateFile, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load window state:", error);
  }
  return null;
}

// Initialize database and repositories
async function initializeDatabase() {
  try {
    console.log("🔧 Starting database initialization...");

    const schema = new DatabaseSchema();
    console.log("🔧 DatabaseSchema created");

    await schema.initializeDatabase();
    console.log("🔧 Database schema initialized");

    // await schema.seedDefaultData(); // REMOVED: This method no longer exists

    db = schema.db;
    console.log("🔧 Database connection established");

    // Initialize repositories
    console.log("🔧 Initializing repositories...");
    itemRepository = new ItemRepository(db);
    invoiceRepository = new InvoiceRepository(db);
    saleRepository = new SaleRepository(db);
    salesTransactionRepository = new SalesTransactionRepository(db);
    alertRepository = new AlertRepository(db);
    inventoryBatchRepository = new InventoryBatchRepository(db);
    userRepository = new UserRepository(db);
    qualityRepository = new QualityRepository(db);
    customerRepository = new CustomerRepository(db);
    console.log("🔧 All repositories initialized");

    // Initialize services
    console.log("🔧 Initializing services...");
    itemService = new ItemService(itemRepository, alertRepository);
    userService = new UserService(userRepository);
    qualityService = new QualityService(qualityRepository);
    customerService = new CustomerService(customerRepository);
    console.log("🔧 All services initialized");

    // Set up IPC handlers AFTER repositories are initialized
    console.log("🔧 Setting up IPC handlers...");
    setupIPCHandlers();
    console.log("🔧 IPC handlers set up successfully");

    console.log("✅ Database and services initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error; // Re-throw to see the error in the main process
  }
}

// Function to set up all IPC handlers
function setupIPCHandlers() {
  // Item Management IPC handlers
  ipcMain.handle("db-addItem", async (event, itemData) => {
    try {
      const itemId = await itemService.createItem(itemData);
      return { success: true, data: { id: itemId } };
    } catch (error) {
      console.error("Error adding item:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-updateItem", async (event, id, itemData) => {
    try {
      const updated = await itemService.updateItem(id, itemData);
      return { success: true, data: { updated } };
    } catch (error) {
      console.error("Error updating item:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-deleteItem", async (event, id) => {
    try {
      const deleted = await itemService.deleteItem(id);
      return { success: true, data: { deleted } };
    } catch (error) {
      console.error("Error deleting item:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-getItem", async (event, id) => {
    try {
      const item = await itemService.getItem(id);
      return { success: true, data: item };
    } catch (error) {
      console.error("Error getting item:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-getAllItems", async () => {
    try {
      const items = await itemService.getAllItems();
      return { success: true, data: items };
    } catch (error) {
      console.error("Error getting all items:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-searchItems", async (event, query) => {
    try {
      const items = await itemService.searchItems(query);
      return { success: true, data: items };
    } catch (error) {
      console.error("Error searching items:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-getUniqueItemNames", async () => {
    try {
      const names = await itemService.getUniqueItemNames();
      return { success: true, data: names };
    } catch (error) {
      console.error("Error getting unique item names:", error);
      return { success: false, error: error.message };
    }
  });

  // Quality Management IPC handlers
  ipcMain.handle("db-getAllQualities", async () => {
    try {
      const qualities = await qualityService.getAllQualities();
      return { success: true, data: qualities };
    } catch (error) {
      console.error("Error getting all qualities:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-addQuality", async (event, name) => {
    try {
      const qualityId = await qualityService.addQuality(name);
      return { success: true, data: { id: qualityId } };
    } catch (error) {
      console.error("Error adding quality:", error);
      return { success: false, error: error.message };
    }
  });

  // Customer Management IPC handlers
  ipcMain.handle("db-getAllCustomers", async () => {
    try {
      const customers = await customerService.getAllCustomers();
      return { success: true, data: customers };
    } catch (error) {
      console.error("Error getting all customers:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-addCustomer", async (event, name) => {
    try {
      const customerId = await customerService.addCustomer(name);
      return { success: true, data: { id: customerId } };
    } catch (error) {
      console.error("Error adding customer:", error);
      return { success: false, error: error.message };
    }
  });

  // Invoice Management IPC handlers
  ipcMain.handle("db-addInvoice", async (event, invoiceData) => {
    try {
      // Remove tax from invoice data if present
      const { tax, ...invoiceDataWithoutTax } = invoiceData;
      invoiceDataWithoutTax.subtotal =
        invoiceData.subtotal || invoiceData.total || 0;
      invoiceDataWithoutTax.total =
        invoiceData.total || invoiceData.subtotal || 0;

      const invoiceId = await invoiceRepository.create(invoiceDataWithoutTax);
      const purchaseDate = invoiceData.date || new Date().toISOString();

      // Add items from invoice to inventory (create or update existing items by name)
      // AND create purchase records for tracking individual purchases
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        for (const item of invoiceData.items) {
          // Update inventory
          await itemService.createOrUpdateItemByName({
            name: item.name || item.description,
            category: item.category,
            stock: item.quantity || 0,
            price: item.rate || item.unitPrice || 0,
            cost: item.rate || item.unitPrice || 0,
            quality: item.quality,
            invoiceNumber: invoiceData.invoiceNumber,
            vehicleNumber: invoiceData.vehicleNumber,
            minStock: 0,
          });

          // Get the item ID after creating/updating
          const actualItem = await itemService.getItemByName(
            item.name || item.description
          );

          // Create inventory batch record (with availableQuantity = quantity initially)
          const itemQuantity = item.quantity || 0;
          await inventoryBatchRepository.create({
            itemId: actualItem ? actualItem.id : null,
            invoiceId: invoiceId,
            invoiceNumber: invoiceData.invoiceNumber,
            itemName: item.name || item.description,
            category: item.category,
            quantity: itemQuantity,
            availableQuantity: itemQuantity, // Initially all quantity is available
            rate: item.rate || item.unitPrice || 0,
            total:
              item.total || itemQuantity * (item.rate || item.unitPrice || 0),
            quality: item.quality,
            vehicleNumber: invoiceData.vehicleNumber,
            purchaseDate: purchaseDate,
          });
        }
      }

      return { success: true, data: { id: invoiceId } };
    } catch (error) {
      console.error("Error adding invoice:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-getAllInvoices", async () => {
    try {
      const invoices = await invoiceRepository.findAll();
      return { success: true, data: invoices };
    } catch (error) {
      console.error("Error getting all invoices:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-getInvoice", async (event, id) => {
    try {
      const invoice = await invoiceRepository.findById(id);
      if (invoice) {
        // Get inventory batches for this invoice to show vehicle numbers
        const batches = await inventoryBatchRepository.findByInvoiceId(id);
        invoice.batches = batches || [];
      }
      return { success: true, data: invoice };
    } catch (error) {
      console.error("Error getting invoice:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-canEditInvoice", async (event, id) => {
    try {
      // Get all batches for this invoice
      const batches = await inventoryBatchRepository.findByInvoiceId(id);
      if (!batches || batches.length === 0) {
        return { success: true, canEdit: true };
      }

      const batchIds = batches.map((b) => b.id);
      const hasSales = await saleRepository.hasSalesForBatches(batchIds);

      return { success: true, canEdit: !hasSales };
    } catch (error) {
      console.error("Error checking if invoice can be edited:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-updateInvoice", async (event, id, invoiceData) => {
    try {
      // Check if invoice can be edited
      const batches = await inventoryBatchRepository.findByInvoiceId(id);
      if (batches && batches.length > 0) {
        const batchIds = batches.map((b) => b.id);
        const hasSales = await saleRepository.hasSalesForBatches(batchIds);
        if (hasSales) {
          return {
            success: false,
            error: "Cannot edit invoice: Some batches from this invoice have been sold",
          };
        }
      }

      // Get old invoice data to calculate stock changes
      const oldInvoice = await invoiceRepository.findById(id);
      if (!oldInvoice) {
        return { success: false, error: "Invoice not found" };
      }

      const oldBatches = await inventoryBatchRepository.findByInvoiceId(id);
      const purchaseDate = invoiceData.date || new Date().toISOString();

      // Update invoice
      await invoiceRepository.update(id, invoiceData);

      // Update inventory batches and items
      // First, revert old stock changes
      for (const oldBatch of oldBatches || []) {
        if (oldBatch.itemId) {
          const item = await itemService.getItem(oldBatch.itemId);
          if (item) {
            // Revert the stock that was added from this batch
            const newStock = item.stock - oldBatch.quantity;
            await itemService.updateStock(oldBatch.itemId, newStock);
          }
        }
      }

      // Delete old batches (they will be recreated with new data)
      for (const oldBatch of oldBatches || []) {
        await inventoryBatchRepository.delete(oldBatch.id);
      }

      // Create new batches and update items
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        for (const item of invoiceData.items) {
          // Update inventory
          await itemService.createOrUpdateItemByName({
            name: item.name || item.description,
            category: item.category,
            stock: item.quantity || 0,
            price: item.rate || item.unitPrice || 0,
            cost: item.rate || item.unitPrice || 0,
            quality: item.quality,
            invoiceNumber: invoiceData.invoiceNumber,
            vehicleNumber: invoiceData.vehicleNumber,
            minStock: 0,
          });

          // Get the item ID after creating/updating
          const actualItem = await itemService.getItemByName(
            item.name || item.description
          );

          // Create inventory batch record
          const itemQuantity = item.quantity || 0;
          await inventoryBatchRepository.create({
            itemId: actualItem ? actualItem.id : null,
            invoiceId: id,
            invoiceNumber: invoiceData.invoiceNumber,
            itemName: item.name || item.description,
            category: item.category,
            quantity: itemQuantity,
            availableQuantity: itemQuantity,
            rate: item.rate || item.unitPrice || 0,
            total:
              item.total || itemQuantity * (item.rate || item.unitPrice || 0),
            quality: item.quality,
            vehicleNumber: invoiceData.vehicleNumber,
            purchaseDate: purchaseDate,
          });
        }
      }

      return { success: true, data: { id } };
    } catch (error) {
      console.error("Error updating invoice:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-deleteInvoice", async (event, id) => {
    try {
      // Check if invoice can be deleted
      const batches = await inventoryBatchRepository.findByInvoiceId(id);
      if (batches && batches.length > 0) {
        const batchIds = batches.map((b) => b.id);
        const hasSales = await saleRepository.hasSalesForBatches(batchIds);
        if (hasSales) {
          return {
            success: false,
            error: "Cannot delete invoice: Some batches from this invoice have been sold",
          };
        }
      }

      // Revert inventory changes before deleting
      if (batches && batches.length > 0) {
        for (const batch of batches) {
          if (batch.itemId) {
            const item = await itemService.getItem(batch.itemId);
            if (item) {
              // Revert the stock that was added from this batch
              const newStock = item.stock - batch.quantity;
              await itemService.updateStock(batch.itemId, newStock);
            }
          }
        }
      }

      // Delete invoice (cascade will delete batches)
      const deleted = await invoiceRepository.delete(id);
      return { success: true, data: { deleted } };
    } catch (error) {
      console.error("Error deleting invoice:", error);
      return { success: false, error: error.message };
    }
  });

  // Sales Management IPC handlers
  ipcMain.handle(
    "db-addSalesTransaction",
    async (event, salesDataArray, customTransactionNumber = null, customerName = null) => {
      try {
        if (!salesDataArray || salesDataArray.length === 0) {
          return { success: false, error: "No sales data provided" };
        }

        // Calculate total amount and item count
        const totalAmount = salesDataArray.reduce(
          (sum, sale) => sum + (sale.total || 0),
          0
        );
        const itemCount = salesDataArray.length;

        // Use custom transaction number or generate one
        const transactionNumber =
          customTransactionNumber ||
          salesTransactionRepository.generateTransactionNumber();
        const transactionDate =
          salesDataArray[0].date || new Date().toISOString();

        // Create transaction
        const transactionId = await salesTransactionRepository.create({
          transactionNumber,
          date: transactionDate,
          totalAmount,
          itemCount,
          customerName: customerName || null,
        });

        // Create each sale and update inventory
        const saleResults = [];
        for (const saleData of salesDataArray) {
          // Check batch availability
          if (saleData.batchId) {
            const batch = await inventoryBatchRepository.findById(
              saleData.batchId
            );
            if (!batch) {
              throw new Error(`Batch not found for item: ${saleData.itemName}`);
            }

            if (batch.availableQuantity < saleData.quantity) {
              throw new Error(
                `Insufficient stock in batch for ${saleData.itemName}. Available: ${batch.availableQuantity}, Requested: ${saleData.quantity}`
              );
            }

            // Create sale with transactionId
            const saleId = await saleRepository.create({
              ...saleData,
              transactionId,
            });

            // Update batch available quantity
            const newAvailableQuantity =
              batch.availableQuantity - saleData.quantity;
            await inventoryBatchRepository.updateAvailableQuantity(
              saleData.batchId,
              newAvailableQuantity
            );

            // Update item stock
            const item = await itemService.getItem(saleData.itemId);
            if (item) {
              const newStock = item.stock - saleData.quantity;
              await itemService.updateStock(saleData.itemId, newStock);
            }

            saleResults.push({ success: true, saleId });
          } else {
            // Legacy: sell from aggregated stock
            const item = await itemService.getItem(saleData.itemId);
            if (!item) {
              throw new Error(`Item not found: ${saleData.itemName}`);
            }

            if (item.stock < saleData.quantity) {
              throw new Error(
                `Insufficient stock for ${saleData.itemName}. Available: ${item.stock}, Requested: ${saleData.quantity}`
              );
            }

            // Create sale
            const saleId = await saleRepository.create({
              ...saleData,
              transactionId,
            });

            // Update stock
            const newStock = item.stock - saleData.quantity;
            await itemService.updateStock(saleData.itemId, newStock);

            saleResults.push({ success: true, saleId });
          }
        }

        return {
          success: true,
          data: {
            transactionId,
            transactionNumber,
            saleCount: saleResults.length,
          },
        };
      } catch (error) {
        console.error("Error adding sales transaction:", error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("db-addSale", async (event, saleData) => {
    // Legacy handler - creates a single-item transaction
    // Reuse the transaction handler logic
    return await ipcMain.handle("db-addSalesTransaction", event, [saleData]);
  });

  ipcMain.handle("db-getAllSalesTransactions", async () => {
    try {
      const transactions = await salesTransactionRepository.findAll();
      return { success: true, data: transactions };
    } catch (error) {
      console.error("Error getting all sales transactions:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "db-getSalesTransactionDetails",
    async (event, transactionId) => {
      try {
        const transaction =
          await salesTransactionRepository.findById(transactionId);
        if (!transaction) {
          return { success: false, error: "Transaction not found" };
        }

        const sales = await saleRepository.findByTransactionId(transactionId);
        
        // Enrich sales with batch information for profit calculation
        const enrichedSales = await Promise.all(
          sales.map(async (sale) => {
            let costPrice = 0;
            if (sale.batchId) {
              const batch = await inventoryBatchRepository.findById(sale.batchId);
              if (batch) {
                costPrice = batch.rate || 0;
              }
            }
            const profit = (sale.unitPrice - costPrice) * sale.quantity;
            return {
              ...sale,
              costPrice,
              profit,
            };
          })
        );

        return {
          success: true,
          data: {
            transaction,
            sales: enrichedSales,
          },
        };
      } catch (error) {
        console.error("Error getting transaction details:", error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("db-getAllSales", async () => {
    try {
      const sales = await saleRepository.findAll();
      return { success: true, data: sales };
    } catch (error) {
      console.error("Error getting all sales:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "db-getSalesByDateRange",
    async (event, startDate, endDate) => {
      try {
        // Use salesTransactionRepository to filter transactions by date range
        const transactions = await salesTransactionRepository.findByDateRange(
          startDate,
          endDate
        );
        return { success: true, data: transactions };
      } catch (error) {
        console.error("Error getting sales by date range:", error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("db-getTodaySales", async () => {
    try {
      // Return today's transactions instead of individual sales
      const transactions = await salesTransactionRepository.getTodayTransactions();
      return { success: true, data: transactions };
    } catch (error) {
      console.error("Error getting today sales:", error);
      return { success: false, error: error.message };
    }
  });

  // Delete sales transaction and reverse inventory changes
  ipcMain.handle("db-deleteSalesTransaction", async (event, transactionId) => {
    try {
      // Get the transaction first
      const transaction = await salesTransactionRepository.findById(transactionId);
      if (!transaction) {
        return { success: false, error: "Transaction not found" };
      }

      // Get all sales for this transaction
      const sales = await saleRepository.findByTransactionId(transactionId);

      // Reverse inventory changes for each sale
      for (const sale of sales) {
        if (sale.batchId) {
          // Get the batch and restore available quantity
          const batch = await inventoryBatchRepository.findById(sale.batchId);
          if (batch) {
            const newAvailableQuantity = batch.availableQuantity + sale.quantity;
            await inventoryBatchRepository.updateAvailableQuantity(
              sale.batchId,
              newAvailableQuantity
            );
          }
        }

        // Restore item stock
        if (sale.itemId) {
          const item = await itemService.getItem(sale.itemId);
          if (item) {
            const newStock = item.stock + sale.quantity;
            await itemService.updateStock(sale.itemId, newStock);
          }
        }
      }

      // Delete all sales records (CASCADE should handle this, but we'll do it explicitly)
      for (const sale of sales) {
        await saleRepository.delete(sale.id);
      }

      // Delete the transaction
      const deleted = await salesTransactionRepository.delete(transactionId);

      if (deleted) {
        return { success: true, message: "Transaction deleted successfully" };
      } else {
        return { success: false, error: "Failed to delete transaction" };
      }
    } catch (error) {
      console.error("Error deleting sales transaction:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-getAvailableBatches", async (event, itemId) => {
    try {
      const batches =
        await inventoryBatchRepository.findAvailableByItemId(itemId);
      return { success: true, data: batches };
    } catch (error) {
      console.error("Error getting available batches:", error);
      return { success: false, error: error.message };
    }
  });

  // Alert Management IPC handlers
  ipcMain.handle("db-getAllAlerts", async () => {
    try {
      const alerts = await alertRepository.findAll();
      return { success: true, data: alerts };
    } catch (error) {
      console.error("Error getting all alerts:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-getUnreadAlerts", async () => {
    try {
      const alerts = await alertRepository.findUnread();
      return { success: true, data: alerts };
    } catch (error) {
      console.error("Error getting unread alerts:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-markAlertAsRead", async (event, alertId) => {
    try {
      const updated = await alertRepository.markAsRead(alertId);
      return { success: true, data: { updated } };
    } catch (error) {
      console.error("Error marking alert as read:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-markAllAlertsAsRead", async () => {
    try {
      const count = await alertRepository.markAllAsRead();
      return { success: true, data: { count } };
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-deleteAlert", async (event, alertId) => {
    try {
      const deleted = await alertRepository.delete(alertId);
      return { success: true, data: { deleted } };
    } catch (error) {
      console.error("Error deleting alert:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db-deleteAllAlerts", async () => {
    try {
      const count = await alertRepository.deleteAll();
      return { success: true, data: { count } };
    } catch (error) {
      console.error("Error deleting all alerts:", error);
      return { success: false, error: error.message };
    }
  });

  // Dashboard Statistics
  ipcMain.handle("db-getDashboardStats", async () => {
    try {
      const stats = await itemService.getDashboardStats();
      // Get today's transactions and sum their totalAmount
      const todayTransactions = await salesTransactionRepository.getTodayTransactions();
      const todaySalesTotal = todayTransactions.reduce(
        (sum, transaction) => sum + (transaction.totalAmount || 0),
        0
      );

      return {
        success: true,
        data: {
          ...stats,
          todaySales: todaySalesTotal,
        },
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return { success: false, error: error.message };
    }
  });

  // File operations for export/import
  ipcMain.handle("show-save-dialog", async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error showing save dialog:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("show-open-dialog", async (event, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error showing open dialog:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("write-file", async (event, filePath, data) => {
    try {
      const fs = require("fs");
      fs.writeFileSync(filePath, data);
      return { success: true };
    } catch (error) {
      console.error("Error writing file:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("read-file", async (event, filePath) => {
    try {
      const fs = require("fs");
      const data = fs.readFileSync(filePath, "utf8");
      return { success: true, data };
    } catch (error) {
      console.error("Error reading file:", error);
      return { success: false, error: error.message };
    }
  });

  // Initialize default user profile if none exists
  ipcMain.handle("initialize-profile", async () => {
    try {
      // Check if any users exist, if not create default admin
      const users = await userRepository.findAll();
      if (!users || users.length === 0) {
        const bcrypt = require("bcryptjs");
        const hashedPassword = bcrypt.hashSync("admin", 10);
        await userRepository.create({
          username: "admin",
          password: hashedPassword,
          role: "admin",
        });
        console.log(
          "✅ Default admin user created (username: admin, password: admin)"
        );
      }
      return { success: true };
    } catch (error) {
      console.error("❌ Error in initialize-profile IPC handler:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("validate-login", async (event, username, password) => {
    try {
      return await userService.validateLogin(username, password);
    } catch (error) {
      console.error("Login validation error:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "change-password",
    async (event, userId, currentPassword, newPassword) => {
      try {
        return await userService.changePassword(
          userId,
          currentPassword,
          newPassword
        );
      } catch (error) {
        console.error("Error changing password:", error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("change-username", async (event, userId, newUsername) => {
    try {
      return await userService.changeUsername(userId, newUsername);
    } catch (error) {
      console.error("Error changing username:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-user", async (event, userId) => {
    try {
      return await userService.getUserById(userId);
    } catch (error) {
      console.error("Error getting user:", error);
      return { success: false, error: error.message };
    }
  });

  // Removed: Old NyumbaTrack IPC handlers for authRepository, emailService, and non-existent userService methods

  // Removed: Old NyumbaTrack IPC handlers for roomService, assignmentRepository, paymentRepository, and dashboard statistics
  // All handlers that reference non-existent services have been removed
}

// Update the database path for production builds
const getDatabasePath = () => {
  if (app.isPackaged) {
    // Production build - check if it's Forge or Electron Builder
    if (process.resourcesPath.includes("dist-electron-builder")) {
      // Electron Builder - database is in app.asar/backend/data
      return path.join(
        process.resourcesPath,
        "app.asar",
        "backend",
        "data",
        "wilsonplus.db"
      );
    } else if (process.resourcesPath.includes("out")) {
      // Forge build - database is in app.asar/backend/data
      return path.join(
        process.resourcesPath,
        "app.asar",
        "backend",
        "data",
        "wilsonplus.db"
      );
    } else {
      // Default - database is in app.asar/backend/data
      return path.join(
        process.resourcesPath,
        "app.asar",
        "backend",
        "data",
        "wilsonplus.db"
      );
    }
  } else {
    // Development - database is in backend/data relative to project root
    return path.join(__dirname, "data", "wilsonplus.db");
  }
};

const getIconPath = () => {
  if (app.isPackaged) {
    // Production build - check if it's Forge or Electron Builder
    if (process.resourcesPath.includes("dist-electron-builder")) {
      // Electron Builder - icon is in app.asar/frontend/build/assets
      return path.join(
        process.resourcesPath,
        "app.asar",
        "frontend",
        "build",
        "assets",
        "icons",
        "wilsonPlus_Logo.ico"
      );
    } else if (process.resourcesPath.includes("out")) {
      // Forge build - icon is in app.asar/frontend/build/assets
      return path.join(
        process.resourcesPath,
        "app.asar",
        "frontend",
        "build",
        "assets",
        "icon",
        "wilsonPlus_Logo.ico"
      );
    } else {
      // Default - icon is in app.asar/frontend/build/assets
      return path.join(
        process.resourcesPath,
        "app.asar",
        "frontend",
        "build",
        "assets",
        "icons",
        "wilsonPlus_Logo.ico"
      );
    }
  } else {
    // Development - icon is in frontend assets
    return path.join(
      __dirname,
      "../../frontend/src/assets/icons/wilsonPlus_Logo.ico"
    );
  }
};

// Update preload path for production builds
const getPreloadPath = () => {
  if (app.isPackaged) {
    // Production build - check if it's Forge or Electron Builder
    if (process.resourcesPath.includes("out")) {
      // Forge build - preload is in app.asar/frontend/build
      return path.join(
        process.resourcesPath,
        "app.asar",
        "frontend",
        "build",
        "preload.js"
      );
    } else {
      // Electron Builder - preload is in resources/app.asar/frontend/build
      return path.join(
        process.resourcesPath,
        "app.asar",
        "frontend",
        "build",
        "preload.js"
      );
    }
  } else {
    // Development - preload is in frontend src
    return path.join(__dirname, "../../frontend/src/preload.js");
  }
};

const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Load previous window state or use defaults
  const savedState = loadWindowState();
  const isFirstRun = !savedState;

  let windowOptions = {
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: getPreloadPath(), // Use the updated preload path
      webSecurity: false,
    },
    icon: getIconPath(), // Use the updated icon path
    show: false,
    titleBarStyle: "default",
    autoHideMenuBar: true,
  };

  if (isFirstRun) {
    // First run - maximize window
    windowOptions.width = width;
    windowOptions.height = height;
    windowOptions.x = 0;
    windowOptions.y = 0;
  } else {
    // Restore previous state
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
    windowOptions.width = savedState.width;
    windowOptions.height = savedState.height;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Disable native menu bar
  Menu.setApplicationMenu(null);

  // Load the frontend based on environment
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    console.log("🔧 Loading development server...");
    mainWindow.loadURL("http://localhost:3000").catch(() => {
      // Fallback to built files if dev server is not running
      console.log("⚠️ Dev server not available, loading built files...");
      mainWindow.loadFile(
        path.join(__dirname, "../../frontend/build/index.html")
      );
    });

    // Enable hot reload in development
    mainWindow.webContents.on("did-fail-load", () => {
      setTimeout(() => {
        mainWindow.loadURL("http://localhost:3000").catch(() => {
          mainWindow.loadFile(
            path.join(__dirname, "../../frontend/build/index.html")
          );
        });
      }, 1000);
    });

    // Open dev tools in development
    mainWindow.webContents.openDevTools();
  } else {
    console.log("📦 Loading production build...");
    // Check if it's Forge or Electron Builder
    if (process.resourcesPath.includes("out")) {
      // Forge build - load from app.asar/frontend/build
      mainWindow.loadFile(
        path.join(
          process.resourcesPath,
          "app.asar",
          "frontend",
          "build",
          "index.html"
        )
      );
    } else {
      // Electron Builder - load from resources/app.asar/frontend/build
      mainWindow.loadFile(
        path.join(
          process.resourcesPath,
          "app.asar",
          "frontend",
          "build",
          "index.html"
        )
      );
    }
  }

  // mainWindow.webContents.openDevTools();

  mainWindow.once("ready-to-show", () => {
    if (isFirstRun) {
      mainWindow.maximize();
    } else if (savedState) {
      if (savedState.isMaximized) {
        mainWindow.maximize();
      }
      if (savedState.isFullScreen) {
        mainWindow.setFullScreen(true);
      }
    }
    mainWindow.show();
  });

  // Save window state when it changes
  mainWindow.on("resize", saveWindowState);
  mainWindow.on("move", saveWindowState);
  mainWindow.on("maximize", saveWindowState);
  mainWindow.on("unmaximize", saveWindowState);
  mainWindow.on("enter-full-screen", saveWindowState);
  mainWindow.on("leave-full-screen", saveWindowState);

  mainWindow.on("closed", () => {
    saveWindowState();
    mainWindow = null;
  });

  // Handle app closing
  mainWindow.on("close", (event) => {
    saveWindowState();
  });
};

// App event handlers
app.whenReady().then(async () => {
  await initializeDatabase();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) db.close();
    app.quit();
  }
});

// IPC handler to open PDF files
ipcMain.handle("open-pdf", async (event, pdfPath) => {
  try {
    const { shell } = require("electron");
    await shell.openPath(pdfPath);
    return { success: true };
  } catch (error) {
    console.error("Error opening PDF:", error);
    return { success: false, error: error.message };
  }
});

module.exports = { app, createWindow };
