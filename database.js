// WilsonPlus Database Layer using SQL.js (Pure JavaScript SQLite)
// This file runs in the Electron main process
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class WilsonPlusDB {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.dbPath = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Get user data path for Electron app
        let userDataPath;
        try {
            if (app && app.isReady && app.isReady()) {
                userDataPath = app.getPath('userData');
            } else if (app) {
                userDataPath = app.getPath('userData');
            } else {
                userDataPath = path.join(__dirname, 'data');
            }
        } catch (error) {
            userDataPath = path.join(__dirname, 'data');
        }
        
        // Ensure data directory exists
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        
        this.dbPath = path.join(userDataPath, 'wilsonplus.db');
        
        // Initialize SQL.js
        try {
            this.SQL = await initSqlJs();
        } catch (error) {
            console.error('Error initializing SQL.js:', error);
            throw new Error('Failed to initialize database: ' + error.message);
        }
        
        // Load existing database or create new one
        if (fs.existsSync(this.dbPath)) {
            try {
                const buffer = fs.readFileSync(this.dbPath);
                this.db = new this.SQL.Database(buffer);
            } catch (error) {
                console.warn('Error loading existing database, creating new one:', error);
                this.db = new this.SQL.Database();
            }
        } else {
            this.db = new this.SQL.Database();
        }
        
        this.initializeDatabase();
        this.initialized = true;
    }

    async save() {
        if (!this.db) return;
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.dbPath, buffer);
    }

    initializeDatabase() {
        // Create items table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sku TEXT UNIQUE,
                category TEXT,
                stock REAL NOT NULL DEFAULT 0,
                minStock REAL NOT NULL DEFAULT 0,
                price REAL NOT NULL DEFAULT 0,
                cost REAL DEFAULT 0,
                description TEXT,
                brand TEXT,
                model TEXT,
                color TEXT,
                size TEXT,
                unit TEXT DEFAULT 'Each',
                location TEXT,
                supplier TEXT,
                reorderPoint REAL DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create sales table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                itemId INTEGER NOT NULL,
                itemName TEXT NOT NULL,
                quantity REAL NOT NULL,
                unitPrice REAL NOT NULL,
                total REAL NOT NULL,
                date DATETIME NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
            )
        `);

        // Create invoices table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoiceNumber TEXT UNIQUE NOT NULL,
                date DATETIME NOT NULL,
                items TEXT NOT NULL,
                subtotal REAL NOT NULL,
                tax REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create alerts table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                itemId INTEGER,
                itemName TEXT NOT NULL,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                isRead INTEGER DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for better query performance
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_sales_itemId ON sales(itemId)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_itemId ON alerts(itemId)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_isRead ON alerts(isRead)`);

        this.save();
    }

    // Item Management
    addItem(itemData) {
        const stmt = this.db.prepare(`
            INSERT INTO items (
                name, sku, category, stock, minStock, price, cost, description,
                brand, model, color, size, unit, location, supplier, reorderPoint
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.bind([
            itemData.name,
            itemData.sku || null,
            itemData.category || null,
            itemData.stock || 0,
            itemData.minStock || 0,
            itemData.price || 0,
            itemData.cost || 0,
            itemData.description || null,
            itemData.brand || null,
            itemData.model || null,
            itemData.color || null,
            itemData.size || null,
            itemData.unit || 'Each',
            itemData.location || null,
            itemData.supplier || null,
            itemData.reorderPoint || itemData.minStock || 0
        ]);
        
        stmt.step();
        stmt.free();
        
        const result = this.db.exec('SELECT last_insert_rowid() as id');
        const id = result[0].values[0][0];
        
        this.checkStockAlerts(id);
        this.save();
        return id;
    }

    updateItem(id, itemData) {
        const stmt = this.db.prepare(`
            UPDATE items SET
                name = ?, sku = ?, category = ?, stock = ?, minStock = ?,
                price = ?, cost = ?, description = ?, brand = ?, model = ?,
                color = ?, size = ?, unit = ?, location = ?, supplier = ?,
                reorderPoint = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.bind([
            itemData.name,
            itemData.sku || null,
            itemData.category || null,
            itemData.stock,
            itemData.minStock,
            itemData.price,
            itemData.cost || 0,
            itemData.description || null,
            itemData.brand || null,
            itemData.model || null,
            itemData.color || null,
            itemData.size || null,
            itemData.unit || 'Each',
            itemData.location || null,
            itemData.supplier || null,
            itemData.reorderPoint || itemData.minStock || 0,
            id
        ]);
        
        stmt.step();
        stmt.free();
        
        this.checkStockAlerts(id);
        this.save();
        return true;
    }

    deleteItem(id) {
        const stmt1 = this.db.prepare('DELETE FROM items WHERE id = ?');
        stmt1.bind([id]);
        stmt1.step();
        stmt1.free();
        
        const stmt2 = this.db.prepare('DELETE FROM sales WHERE itemId = ?');
        stmt2.bind([id]);
        stmt2.step();
        stmt2.free();
        
        const stmt3 = this.db.prepare('DELETE FROM alerts WHERE itemId = ?');
        stmt3.bind([id]);
        stmt3.step();
        stmt3.free();
        
        this.save();
        return true;
    }

    getItem(id) {
        const stmt = this.db.prepare('SELECT * FROM items WHERE id = ?');
        stmt.bind([id]);
        const result = stmt.getAsObject();
        stmt.free();
        
        if (!result || Object.keys(result).length === 0) {
            return null;
        }
        return result;
    }

    getAllItems() {
        const result = this.db.exec('SELECT * FROM items ORDER BY name');
        if (result.length === 0) return [];
        return this.rowsToArray(result[0]);
    }

    searchItems(query) {
        const searchTerm = `%${query}%`;
        const stmt = this.db.prepare('SELECT * FROM items WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? ORDER BY name');
        stmt.bind([searchTerm, searchTerm, searchTerm]);
        
        const items = [];
        while (stmt.step()) {
            items.push(stmt.getAsObject());
        }
        stmt.free();
        
        return items;
    }

    // Invoice Management
    addInvoice(invoiceData) {
        try {
            console.log('Database addInvoice called with:', {
                invoiceNumber: invoiceData.invoiceNumber,
                date: invoiceData.date,
                itemsCount: invoiceData.items ? invoiceData.items.length : 0,
                subtotal: invoiceData.subtotal,
                total: invoiceData.total
            });
            
            // Ensure date is a string
            const dateValue = typeof invoiceData.date === 'string' 
                ? invoiceData.date 
                : (invoiceData.date instanceof Date 
                    ? invoiceData.date.toISOString() 
                    : new Date().toISOString());
            
            // Ensure items is an array and stringify it
            const itemsJson = Array.isArray(invoiceData.items) 
                ? JSON.stringify(invoiceData.items) 
                : JSON.stringify([]);
            
            const stmt = this.db.prepare(`
                INSERT INTO invoices (invoiceNumber, date, items, subtotal, tax, total)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.bind([
                invoiceData.invoiceNumber || '',
                dateValue,
                itemsJson,
                invoiceData.subtotal || 0,
                invoiceData.tax || 0,
                invoiceData.total || 0
            ]);
            
            stmt.step();
            stmt.free();
            
            const result = this.db.exec('SELECT last_insert_rowid() as id');
            if (result.length === 0 || result[0].values.length === 0) {
                throw new Error('Failed to get inserted invoice ID');
            }
            
            const id = result[0].values[0][0];
            console.log('Invoice saved with ID:', id);
            this.save();
            return id;
        } catch (error) {
            console.error('Error in addInvoice:', error);
            throw error;
        }
    }

    getAllInvoices() {
        const result = this.db.exec('SELECT * FROM invoices ORDER BY date DESC');
        if (result.length === 0) return [];
        const invoices = this.rowsToArray(result[0]);
        return invoices.map(invoice => ({
            ...invoice,
            items: JSON.parse(invoice.items)
        }));
    }

    getInvoice(id) {
        const stmt = this.db.prepare('SELECT * FROM invoices WHERE id = ?');
        stmt.bind([id]);
        const invoice = stmt.getAsObject();
        stmt.free();
        
        if (!invoice || Object.keys(invoice).length === 0) {
            return null;
        }
        invoice.items = JSON.parse(invoice.items);
        return invoice;
    }

    deleteInvoice(id) {
        const stmt = this.db.prepare('DELETE FROM invoices WHERE id = ?');
        stmt.bind([id]);
        stmt.step();
        stmt.free();
        this.save();
        return true;
    }

    // Sales Management
    addSale(saleData) {
        // Add sale record
        const saleStmt = this.db.prepare(`
            INSERT INTO sales (itemId, itemName, quantity, unitPrice, total, date)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        saleStmt.bind([
            saleData.itemId,
            saleData.itemName,
            saleData.quantity,
            saleData.unitPrice,
            saleData.total,
            saleData.date
        ]);
        
        saleStmt.step();
        saleStmt.free();
        
        // Update item stock
        const itemStmt = this.db.prepare('SELECT stock FROM items WHERE id = ?');
        itemStmt.bind([saleData.itemId]);
        const itemResult = itemStmt.getAsObject();
        itemStmt.free();
        
        if (!itemResult || !itemResult.stock) {
            throw new Error('Item not found');
        }
        
        const currentStock = itemResult.stock;
        const newStock = currentStock - saleData.quantity;
        if (newStock < 0) {
            throw new Error('Insufficient stock');
        }
        
        const updateStmt = this.db.prepare('UPDATE items SET stock = ? WHERE id = ?');
        updateStmt.bind([newStock, saleData.itemId]);
        updateStmt.step();
        updateStmt.free();
        
        // Check for low stock alerts
        this.checkStockAlerts(saleData.itemId);
        this.save();
        return true;
    }

    getAllSales() {
        const result = this.db.exec('SELECT * FROM sales ORDER BY date DESC');
        if (result.length === 0) return [];
        return this.rowsToArray(result[0]);
    }

    getSalesByDateRange(startDate, endDate) {
        const stmt = this.db.prepare('SELECT * FROM sales WHERE date >= ? AND date <= ? ORDER BY date DESC');
        stmt.bind([startDate, endDate]);
        
        const sales = [];
        while (stmt.step()) {
            sales.push(stmt.getAsObject());
        }
        stmt.free();
        
        return sales;
    }

    getTodaySales() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return this.getSalesByDateRange(today.toISOString(), tomorrow.toISOString());
    }

    // Alert Management
    checkStockAlerts(itemId) {
        const item = this.getItem(itemId);
        if (!item) return;

        // Remove existing low stock alerts for this item
        const deleteStmt = this.db.prepare('DELETE FROM alerts WHERE itemId = ? AND type = ?');
        deleteStmt.bind([itemId, 'low_stock']);
        deleteStmt.step();
        deleteStmt.free();

        // Create new alert if stock is low
        if (item.stock <= item.minStock) {
            const stmt = this.db.prepare(`
                INSERT INTO alerts (itemId, itemName, type, message, isRead)
                VALUES (?, ?, ?, ?, 0)
            `);
            stmt.bind([
                itemId,
                item.name,
                'low_stock',
                `${item.name} is running low on stock (${item.stock} remaining)`
            ]);
            stmt.step();
            stmt.free();
        }
        this.save();
    }

    getAllAlerts() {
        const result = this.db.exec('SELECT * FROM alerts ORDER BY createdAt DESC');
        if (result.length === 0) return [];
        return this.rowsToArray(result[0]);
    }

    getUnreadAlerts() {
        const result = this.db.exec('SELECT * FROM alerts WHERE isRead = 0 ORDER BY createdAt DESC');
        if (result.length === 0) return [];
        return this.rowsToArray(result[0]);
    }

    markAlertAsRead(alertId) {
        const stmt = this.db.prepare('UPDATE alerts SET isRead = 1 WHERE id = ?');
        stmt.bind([alertId]);
        stmt.step();
        stmt.free();
        this.save();
        return true;
    }

    markAllAlertsAsRead() {
        const stmt = this.db.prepare('UPDATE alerts SET isRead = 1 WHERE isRead = 0');
        stmt.step();
        stmt.free();
        this.save();
        return true;
    }

    // Dashboard Statistics
    getDashboardStats() {
        const items = this.getAllItems();
        const sales = this.getTodaySales();
        const alerts = this.getUnreadAlerts();

        const totalItems = items.length;
        const lowStockItems = items.filter(item => item.stock <= item.minStock).length;
        const totalValue = items.reduce((sum, item) => sum + (item.stock * item.price), 0);
        const todaySales = sales.reduce((sum, sale) => sum + sale.total, 0);

        return {
            totalItems,
            lowStockItems,
            totalValue,
            todaySales,
            unreadAlerts: alerts.length
        };
    }

    // Data Export/Import
    exportData() {
        return {
            items: this.getAllItems(),
            sales: this.getAllSales(),
            invoices: this.getAllInvoices(),
            alerts: this.getAllAlerts(),
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
    }

    importData(data) {
        // Clear existing data
        this.db.run('DELETE FROM items');
        this.db.run('DELETE FROM sales');
        this.db.run('DELETE FROM invoices');
        this.db.run('DELETE FROM alerts');

        // Import items
        if (data.items && data.items.length > 0) {
            const stmt = this.db.prepare(`
                INSERT INTO items (
                    name, sku, category, stock, minStock, price, cost, description,
                    brand, model, color, size, unit, location, supplier, reorderPoint,
                    createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const item of data.items) {
                stmt.bind([
                    item.name,
                    item.sku || null,
                    item.category || null,
                    item.stock || 0,
                    item.minStock || 0,
                    item.price || 0,
                    item.cost || 0,
                    item.description || null,
                    item.brand || null,
                    item.model || null,
                    item.color || null,
                    item.size || null,
                    item.unit || 'Each',
                    item.location || null,
                    item.supplier || null,
                    item.reorderPoint || item.minStock || 0,
                    item.createdAt || new Date().toISOString(),
                    item.updatedAt || new Date().toISOString()
                ]);
                stmt.step();
                stmt.reset();
            }
            stmt.free();
        }

        // Import sales
        if (data.sales && data.sales.length > 0) {
            const stmt = this.db.prepare(`
                INSERT INTO sales (itemId, itemName, quantity, unitPrice, total, date, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const sale of data.sales) {
                stmt.bind([
                    sale.itemId,
                    sale.itemName,
                    sale.quantity,
                    sale.unitPrice,
                    sale.total,
                    sale.date,
                    sale.createdAt || new Date().toISOString()
                ]);
                stmt.step();
                stmt.reset();
            }
            stmt.free();
        }

        // Import invoices
        if (data.invoices && data.invoices.length > 0) {
            const stmt = this.db.prepare(`
                INSERT INTO invoices (invoiceNumber, date, items, subtotal, tax, total, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const invoice of data.invoices) {
                stmt.bind([
                    invoice.invoiceNumber,
                    invoice.date,
                    typeof invoice.items === 'string' ? invoice.items : JSON.stringify(invoice.items),
                    invoice.subtotal,
                    invoice.tax || 0,
                    invoice.total,
                    invoice.createdAt || new Date().toISOString()
                ]);
                stmt.step();
                stmt.reset();
            }
            stmt.free();
        }

        // Import alerts
        if (data.alerts && data.alerts.length > 0) {
            const stmt = this.db.prepare(`
                INSERT INTO alerts (itemId, itemName, type, message, isRead, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            for (const alert of data.alerts) {
                stmt.bind([
                    alert.itemId || null,
                    alert.itemName,
                    alert.type,
                    alert.message,
                    alert.isRead ? 1 : 0,
                    alert.createdAt || new Date().toISOString()
                ]);
                stmt.step();
                stmt.reset();
            }
            stmt.free();
        }

        this.save();
        return true;
    }

    // Utility Methods
    clearAllData() {
        this.db.run('DELETE FROM items');
        this.db.run('DELETE FROM sales');
        this.db.run('DELETE FROM invoices');
        this.db.run('DELETE FROM alerts');
        this.save();
        return true;
    }

    getDatabaseSize() {
        const itemsResult = this.db.exec('SELECT COUNT(*) as count FROM items');
        const salesResult = this.db.exec('SELECT COUNT(*) as count FROM sales');
        const invoicesResult = this.db.exec('SELECT COUNT(*) as count FROM invoices');
        const alertsResult = this.db.exec('SELECT COUNT(*) as count FROM alerts');
        
        return {
            items: itemsResult[0]?.values[0]?.[0] || 0,
            sales: salesResult[0]?.values[0]?.[0] || 0,
            invoices: invoicesResult[0]?.values[0]?.[0] || 0,
            alerts: alertsResult[0]?.values[0]?.[0] || 0
        };
    }

    // Helper methods to convert SQL.js results to objects
    rowToObject(result, index) {
        const row = {};
        result.columns.forEach((col, i) => {
            row[col] = result.values[index][i];
        });
        return row;
    }

    rowsToArray(result) {
        return result.values.map((_, index) => this.rowToObject(result, index));
    }

    // Close database connection
    close() {
        if (this.db) {
            this.save();
            this.db.close();
        }
    }
}

// Export singleton instance
let dbInstance = null;

async function getDatabase() {
    if (!dbInstance) {
        dbInstance = new WilsonPlusDB();
        await dbInstance.initialize();
    }
    return dbInstance;
}

module.exports = { WilsonPlusDB, getDatabase };
