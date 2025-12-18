const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");

class DatabaseSchema {
  constructor() {
    // Update database path for production builds
    if (process.env.NODE_ENV === "production" || (app && app.isPackaged)) {
      // Production build - database should be in AppData for write access
      const appDataPath = app.getPath("userData");
      this.dbPath = path.join(appDataPath, "wilsonplus.db");
    } else {
      this.dbPath = path.join(__dirname, "../../../../wilsonplus.db");
    }

    this.db = new sqlite3.Database(this.dbPath);
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Items table (Building Materials & Paints)
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
            quality TEXT,
            vehicleNumber TEXT,
            invoiceNumber TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Sales Transactions table - groups multiple sales into one transaction
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sales_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transactionNumber TEXT UNIQUE NOT NULL,
            date DATETIME NOT NULL,
            totalAmount REAL NOT NULL,
            itemCount INTEGER NOT NULL DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Sales table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transactionId INTEGER,
            itemId INTEGER NOT NULL,
            batchId INTEGER,
            itemName TEXT NOT NULL,
            quantity REAL NOT NULL,
            unitPrice REAL NOT NULL,
            total REAL NOT NULL,
            date DATETIME NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (transactionId) REFERENCES sales_transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (batchId) REFERENCES inventory_batches(id) ON DELETE SET NULL
          )
        `);

        // Invoices table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoiceNumber TEXT UNIQUE NOT NULL,
            date DATETIME NOT NULL,
            items TEXT NOT NULL,
            subtotal REAL NOT NULL,
            total REAL NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Alerts table
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

        // Inventory Batches table - tracks individual stock entries for same item at different prices
        this.db.run(`
          CREATE TABLE IF NOT EXISTS inventory_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            itemId INTEGER NOT NULL,
            invoiceId INTEGER,
            invoiceNumber TEXT NOT NULL,
            itemName TEXT NOT NULL,
            category TEXT,
            quantity REAL NOT NULL,
            availableQuantity REAL NOT NULL,
            rate REAL NOT NULL,
            total REAL NOT NULL,
            quality TEXT,
            vehicleNumber TEXT,
            purchaseDate DATETIME NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
          )
        `);

        // Create indexes for better query performance
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku)`);
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_sales_itemId ON sales(itemId)`
        );
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`);
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_sales_transactionId ON sales(transactionId)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_sales_transactions_date ON sales_transactions(date)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_alerts_itemId ON alerts(itemId)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_alerts_isRead ON alerts(isRead)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_inventory_batches_itemId ON inventory_batches(itemId)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_inventory_batches_itemName ON inventory_batches(itemName)`
        );
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_inventory_batches_purchaseDate ON inventory_batches(purchaseDate)`
        );

        // Users table for authentication
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create default admin user if no users exist
        this.db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
          if (!err && row && row.count === 0) {
            // Default password: admin (should be hashed in production)
            try {
              const bcrypt = require("bcryptjs");
              const hashedPassword = bcrypt.hashSync("admin", 10);
              this.db.run(
                "INSERT INTO users (username, password) VALUES (?, ?)",
                ["admin", hashedPassword],
                (err) => {
                  if (err) {
                    console.error("Error creating default user:", err);
                  } else {
                    console.log(
                      "Default admin user created (username: admin, password: admin)"
                    );
                  }
                }
              );
            } catch (bcryptError) {
              console.error(
                "Error hashing password for default user:",
                bcryptError
              );
            }
          }
        });

        resolve();
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseSchema;
