class SalesTransactionRepository {
  constructor(db) {
    this.db = db;
  }

  async create(transactionData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO sales_transactions (transactionNumber, date, totalAmount, itemCount, customerName)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          transactionData.transactionNumber,
          transactionData.date,
          transactionData.totalAmount,
          transactionData.itemCount,
          transactionData.customerName || null,
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

  async findAll() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM sales_transactions ORDER BY date DESC, createdAt DESC",
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

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM sales_transactions WHERE id = ?",
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  async findByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      // SQLite date comparison works with ISO strings, but we need to ensure proper format
      const sql = `
        SELECT * FROM sales_transactions 
        WHERE datetime(date) >= datetime(?) AND datetime(date) <= datetime(?)
        ORDER BY date DESC, createdAt DESC
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

  async getTodayTransactions() {
    return new Promise((resolve, reject) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sql = `
        SELECT * FROM sales_transactions 
        WHERE datetime(date) >= datetime(?) AND datetime(date) < datetime(?)
        ORDER BY date DESC, createdAt DESC
      `;
      this.db.all(sql, [today.toISOString(), tomorrow.toISOString()], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM sales_transactions WHERE id = ?",
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

  generateTransactionNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `SALE-${year}${month}${day}-${random}`;
  }
}

module.exports = SalesTransactionRepository;

