const ItemRepository = require("../repositories/ItemRepository");
const AlertRepository = require("../../alerts/repositories/AlertRepository");

class ItemService {
  constructor(itemRepository, alertRepository) {
    this.itemRepository = itemRepository;
    this.alertRepository = alertRepository;
  }

  async createItem(itemData) {
    const itemId = await this.itemRepository.create(itemData);
    await this.checkStockAlerts(itemId);
    return itemId;
  }

  async updateItem(id, itemData) {
    const updated = await this.itemRepository.update(id, itemData);
    if (updated) {
      await this.checkStockAlerts(id);
    }
    return updated;
  }

  async deleteItem(id) {
    return await this.itemRepository.delete(id);
  }

  async getItem(id) {
    return await this.itemRepository.findById(id);
  }

  async getAllItems() {
    return await this.itemRepository.findAll();
  }

  async searchItems(query) {
    return await this.itemRepository.search(query);
  }

  async getItemByName(name) {
    return await this.itemRepository.findByName(name);
  }

  async getUniqueItemNames() {
    return await this.itemRepository.getUniqueNames();
  }

  async createOrUpdateItemByName(itemData) {
    const existingItem = await this.itemRepository.findByName(itemData.name);
    if (existingItem) {
      // Update existing item: add to stock, update price to latest
      const newStock = (existingItem.stock || 0) + (itemData.stock || 0);
      await this.itemRepository.update(existingItem.id, {
        ...existingItem,
        stock: newStock,
        price: itemData.price || existingItem.price,
        cost: itemData.cost || existingItem.cost,
        category: itemData.category || existingItem.category,
        quality: itemData.quality || existingItem.quality,
        invoiceNumber: itemData.invoiceNumber || existingItem.invoiceNumber,
        vehicleNumber: itemData.vehicleNumber || existingItem.vehicleNumber,
      });
      return existingItem.id;
    } else {
      // Create new item
      return await this.itemRepository.create(itemData);
    }
  }

  async updateStock(id, newStock) {
    const updated = await this.itemRepository.updateStock(id, newStock);
    if (updated) {
      await this.checkStockAlerts(id);
    }
    return updated;
  }

  async checkStockAlerts(itemId) {
    const item = await this.itemRepository.findById(itemId);
    if (!item) return;

    // Remove existing low stock alerts for this item
    await this.alertRepository.deleteByItemId(itemId, "low_stock");

    // Create new alert if stock is less than 3
    if (item.stock < 3) {
      await this.alertRepository.create({
        itemId: itemId,
        itemName: item.name,
        type: "low_stock",
        message: `${item.name} is running low on stock (${item.stock} remaining)`,
        isRead: 0,
      });
    }
  }

  async getDashboardStats() {
    const items = await this.itemRepository.findAll();
    
    const totalItems = items.length;
    const lowStockItems = items.filter(
      (item) => item.stock <= item.minStock
    ).length;
    const totalValue = items.reduce(
      (sum, item) => sum + item.stock * item.price,
      0
    );

    return {
      totalItems,
      lowStockItems,
      totalValue,
    };
  }
}

module.exports = ItemService;

