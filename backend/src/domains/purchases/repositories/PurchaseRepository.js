class PurchaseRepository {
  constructor(db) {
    this.db = db;
  }

  async create(purchaseData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO purchases (
          invoiceId, invoiceNumber, itemName, category, quantity, availableQuantity, rate, total,
          quality, vehicleNumber, purchaseDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const quantity = purchaseData.quantity || 0;
      this.db.run(
        sql,
        [
          purchaseData.invoiceId || null,
          purchaseData.invoiceNumber || "",
          purchaseData.itemName || "",
          purchaseData.category || null,
          quantity,
          purchaseData.availableQuantity !== undefined ? purchaseData.availableQuantity : quantity,
          purchaseData.rate || 0,
          purchaseData.total || 0,
          purchaseData.quality || null,
          purchaseData.vehicleNumber || null,
          purchaseData.purchaseDate || new Date().toISOString(),
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

  async findAll(limit = null, offset = null) {
    return new Promise((resolve, reject) => {
      let sql = "SELECT * FROM purchases ORDER BY purchaseDate DESC, createdAt DESC";
      const params = [];
      
      if (limit !== null) {
        sql += " LIMIT ?";
        params.push(limit);
        if (offset !== null) {
          sql += " OFFSET ?";
          params.push(offset);
        }
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async count() {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT COUNT(*) as count FROM purchases", (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.count : 0);
        }
      });
    });
  }

  async findByItemName(itemName, limit = null, offset = null) {
    return new Promise((resolve, reject) => {
      let sql = "SELECT * FROM purchases WHERE itemName = ? ORDER BY purchaseDate DESC, createdAt DESC";
      const params = [itemName];
      
      if (limit !== null) {
        sql += " LIMIT ?";
        params.push(limit);
        if (offset !== null) {
          sql += " OFFSET ?";
          params.push(offset);
        }
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async findByInvoiceId(invoiceId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM purchases WHERE invoiceId = ? ORDER BY purchaseDate DESC",
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

  async search(query, limit = null, offset = null) {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;
      let sql = `
        SELECT * FROM purchases 
        WHERE itemName LIKE ? OR invoiceNumber LIKE ? OR category LIKE ?
        ORDER BY purchaseDate DESC, createdAt DESC
      `;
      const params = [searchTerm, searchTerm, searchTerm];
      
      if (limit !== null) {
        sql += " LIMIT ?";
        params.push(limit);
        if (offset !== null) {
          sql += " OFFSET ?";
          params.push(offset);
        }
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async findAvailableByItemName(itemName) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM purchases WHERE itemName = ? AND availableQuantity > 0 ORDER BY purchaseDate ASC",
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

  async updateAvailableQuantity(id, newAvailableQuantity) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE purchases SET availableQuantity = ? WHERE id = ?",
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
      this.db.get("SELECT * FROM purchases WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }
}

module.exports = PurchaseRepository;

