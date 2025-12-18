class SaleRepository {
  constructor(db) {
    this.db = db;
  }

  async create(saleData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO sales (transactionId, itemId, batchId, itemName, quantity, unitPrice, total, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          saleData.transactionId || null,
          saleData.itemId,
          saleData.batchId || null,
          saleData.itemName,
          saleData.quantity,
          saleData.unitPrice,
          saleData.total,
          saleData.date,
        ],
        async function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async findByTransactionId(transactionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM sales WHERE transactionId = ? ORDER BY createdAt ASC",
        [transactionId],
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

  async findAll() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM sales ORDER BY date DESC", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async findByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM sales 
        WHERE date >= ? AND date <= ? 
        ORDER BY date DESC
      `;
      this.db.all(sql, [startDate, endDate], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getTodaySales() {
    return new Promise((resolve, reject) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      this.findByDateRange(today.toISOString(), tomorrow.toISOString())
        .then(resolve)
        .catch(reject);
    });
  }

  async delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM sales WHERE id = ?",
        [id],
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

module.exports = SaleRepository;

