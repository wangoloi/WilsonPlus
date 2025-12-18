const bcrypt = require("bcryptjs");

class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
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

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async create(userData) {
    return new Promise((resolve, reject) => {
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      const sql = `
        INSERT INTO users (username, password)
        VALUES (?, ?)
      `;
      this.db.run(sql, [userData.username, hashedPassword], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async updatePassword(id, newPassword) {
    return new Promise((resolve, reject) => {
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      this.db.run(
        "UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [hashedPassword, id],
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

  async updateUsername(id, newUsername) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE users SET username = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [newUsername, id],
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

  async validatePassword(userId, password) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT password FROM users WHERE id = ?",
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(false);
          } else {
            resolve(bcrypt.compareSync(password, row.password));
          }
        }
      );
    });
  }
}

module.exports = UserRepository;

