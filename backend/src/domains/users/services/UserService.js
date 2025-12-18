const bcrypt = require("bcryptjs");

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async validateLogin(username, password) {
    try {
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
        return { success: false, error: "Invalid username or password" };
      }

      const isValid = bcrypt.compareSync(password, user.password);
      if (!isValid) {
        return { success: false, error: "Invalid username or password" };
      }

      return { success: true, data: { id: user.id, username: user.username } };
    } catch (error) {
      console.error("Error validating login:", error);
      return { success: false, error: "Login validation failed" };
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const isValid = await this.userRepository.validatePassword(
        userId,
        currentPassword
      );
      if (!isValid) {
        return { success: false, error: "Current password is incorrect" };
      }

      await this.userRepository.updatePassword(userId, newPassword);
      return { success: true };
    } catch (error) {
      console.error("Error changing password:", error);
      return { success: false, error: error.message };
    }
  }

  async changeUsername(userId, newUsername) {
    try {
      // Check if username already exists
      const existingUser = await this.userRepository.findByUsername(newUsername);
      if (existingUser && existingUser.id !== userId) {
        return { success: false, error: "Username already exists" };
      }

      await this.userRepository.updateUsername(userId, newUsername);
      return { success: true, data: { username: newUsername } };
    } catch (error) {
      console.error("Error changing username:", error);
      return { success: false, error: error.message };
    }
  }

  async getUserById(id) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      return { success: true, data: userWithoutPassword };
    } catch (error) {
      console.error("Error getting user:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = UserService;

