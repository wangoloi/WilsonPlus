class InventoryBatchRepository {
  constructor(db) {
    this.db = db;
  }

  async create(batchData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO inventory_batches (
          itemId, invoiceId, invoiceNumber, itemName, category, quantity, availableQuantity, rate, total,
          quality, vehicleNumber, purchaseDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const quantity = batchData.quantity || 0;
      this.db.run(
        sql,
        [
          batchData.itemId || null,
          batchData.invoiceId || null,
          batchData.invoiceNumber || "",
          batchData.itemName || "",
          batchData.category || null,
          quantity,
          batchData.availableQuantity !== undefined ? batchData.availableQuantity : quantity,
          batchData.rate || 0,
          batchData.total || 0,
          batchData.quality || null,
          batchData.vehicleNumber || null,
          batchData.purchaseDate || new Date().toISOString(),
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async findAvailableByItemName(itemName) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM inventory_batches WHERE itemName = ? AND availableQuantity > 0 ORDER BY purchaseDate ASC",
        [itemName],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  async findAvailableByItemId(itemId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM inventory_batches WHERE itemId = ? AND availableQuantity > 0 ORDER BY purchaseDate ASC",
        [itemId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  async updateAvailableQuantity(id, newAvailableQuantity) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE inventory_batches SET availableQuantity = ? WHERE id = ?",
        [newAvailableQuantity, id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        }
      );
    });
  }

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM inventory_batches WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async findByItemId(itemId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM inventory_batches WHERE itemId = ? ORDER BY purchaseDate DESC",
        [itemId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  async findByInvoiceId(invoiceId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM inventory_batches WHERE invoiceId = ? ORDER BY purchaseDate DESC",
        [invoiceId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }
}

module.exports = InventoryBatchRepository;

