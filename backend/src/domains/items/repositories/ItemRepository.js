class ItemRepository {
  constructor(db) {
    this.db = db;
  }

  async create(itemData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO items (
          name, sku, category, stock, minStock, price, cost, description,
          brand, model, color, size, unit, location, supplier, reorderPoint,
          quality, vehicleNumber, invoiceNumber
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
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
          itemData.unit || "Each",
          itemData.location || null,
          itemData.supplier || null,
          itemData.reorderPoint || itemData.minStock || 0,
          itemData.quality || null,
          itemData.vehicleNumber || null,
          itemData.invoiceNumber || null,
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

  async update(id, itemData) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE items SET
          name = ?, sku = ?, category = ?, stock = ?, minStock = ?,
          price = ?, cost = ?, description = ?, brand = ?, model = ?,
          color = ?, size = ?, unit = ?, location = ?, supplier = ?,
          reorderPoint = ?, quality = ?, vehicleNumber = ?, invoiceNumber = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      this.db.run(
        sql,
        [
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
          itemData.unit || "Each",
          itemData.location || null,
          itemData.supplier || null,
          itemData.reorderPoint || itemData.minStock || 0,
          itemData.quality || null,
          itemData.vehicleNumber || null,
          itemData.invoiceNumber || null,
          id,
        ],
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

  async delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM items WHERE id = ?", [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM items WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async findAll() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM items ORDER BY name", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async search(query) {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;
      const sql = `
        SELECT * FROM items 
        WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? 
        ORDER BY name
      `;
      this.db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async findByName(name) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM items WHERE name = ?", [name], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getUniqueNames() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT DISTINCT name FROM items ORDER BY name", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => row.name));
        }
      });
    });
  }

  async updateStock(id, newStock) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE items SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [newStock, id],
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
}

module.exports = ItemRepository;

