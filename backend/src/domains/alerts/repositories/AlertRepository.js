class AlertRepository {
  constructor(db) {
    this.db = db;
  }

  async create(alertData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO alerts (itemId, itemName, type, message, isRead)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          alertData.itemId || null,
          alertData.itemName,
          alertData.type,
          alertData.message,
          alertData.isRead || 0,
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
        "SELECT * FROM alerts ORDER BY createdAt DESC",
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

  async findUnread() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM alerts WHERE isRead = 0 ORDER BY createdAt DESC",
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

  async markAsRead(alertId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE alerts SET isRead = 1 WHERE id = ?",
        [alertId],
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

  async markAllAsRead() {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE alerts SET isRead = 1 WHERE isRead = 0",
        [],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  async deleteByItemId(itemId, type) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM alerts WHERE itemId = ? AND type = ?",
        [itemId, type],
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

  async delete(alertId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM alerts WHERE id = ?",
        [alertId],
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

  async deleteAll() {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM alerts",
        [],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }
}

module.exports = AlertRepository;

