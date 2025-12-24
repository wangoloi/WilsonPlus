class InvoiceRepository {
  constructor(db) {
    this.db = db;
  }

  async create(invoiceData) {
    return new Promise((resolve, reject) => {
      const itemsJson = Array.isArray(invoiceData.items)
        ? JSON.stringify(invoiceData.items)
        : JSON.stringify([]);

      const dateValue =
        typeof invoiceData.date === "string"
          ? invoiceData.date
          : invoiceData.date instanceof Date
            ? invoiceData.date.toISOString()
            : new Date().toISOString();

      const sql = `
        INSERT INTO invoices (invoiceNumber, date, items, subtotal, total)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          invoiceData.invoiceNumber || "",
          dateValue,
          itemsJson,
          invoiceData.subtotal || 0,
          invoiceData.total || 0,
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

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM invoices WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            row.items = JSON.parse(row.items);
          }
          resolve(row || null);
        }
      });
    });
  }

  async findAll() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM invoices ORDER BY date DESC", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const invoices = (rows || []).map((invoice) => ({
            ...invoice,
            items: JSON.parse(invoice.items),
          }));
          resolve(invoices);
        }
      });
    });
  }

  async update(id, invoiceData) {
    return new Promise((resolve, reject) => {
      const itemsJson = Array.isArray(invoiceData.items)
        ? JSON.stringify(invoiceData.items)
        : JSON.stringify([]);

      const dateValue =
        typeof invoiceData.date === "string"
          ? invoiceData.date
          : invoiceData.date instanceof Date
            ? invoiceData.date.toISOString()
            : new Date().toISOString();

      const sql = `
        UPDATE invoices 
        SET invoiceNumber = ?, date = ?, items = ?, subtotal = ?, total = ?
        WHERE id = ?
      `;

      this.db.run(
        sql,
        [
          invoiceData.invoiceNumber || "",
          dateValue,
          itemsJson,
          invoiceData.subtotal || 0,
          invoiceData.total || 0,
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
      this.db.run("DELETE FROM invoices WHERE id = ?", [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }
}

module.exports = InvoiceRepository;
