class CustomerRepository {
  constructor(db) {
    this.db = db;
  }

  async create(name) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO customer_names (name) VALUES (?)`;
      this.db.run(sql, [name], function (err) {
        if (err) {
          // If duplicate, just return the existing ID
          if (err.message.includes("UNIQUE constraint")) {
            this.db.get(
              "SELECT id FROM customer_names WHERE name = ?",
              [name],
              (err, row) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(row ? row.id : null);
                }
              }
            );
          } else {
            reject(err);
          }
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getAll() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT name FROM customer_names ORDER BY name",
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map((row) => row.name));
          }
        }
      );
    });
  }

  async findByName(name) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM customer_names WHERE name = ?",
        [name],
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
}

module.exports = CustomerRepository;

