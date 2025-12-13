// WilsonPlus Database Layer using Dexie (IndexedDB wrapper)
class WilsonPlusDB {
    constructor() {
        this.db = new Dexie('WilsonPlusDB');
        this.initializeDatabase();
    }

    initializeDatabase() {
        this.db.version(1).stores({
            items: '++id, name, sku, category, stock, minStock, price, cost, description, brand, model, color, size, unit, location, createdAt, updatedAt',
            sales: '++id, itemId, itemName, quantity, unitPrice, total, date, createdAt',
            invoices: '++id, invoiceNumber, date, items, subtotal, tax, total, createdAt',
            alerts: '++id, itemId, itemName, type, message, isRead, createdAt'
        });

        // Upgrade to version 2 with building material fields
        this.db.version(2).stores({
            items: '++id, name, sku, category, stock, minStock, price, cost, description, brand, model, color, size, unit, location, supplier, reorderPoint, createdAt, updatedAt',
            sales: '++id, itemId, itemName, quantity, unitPrice, total, date, createdAt',
            invoices: '++id, invoiceNumber, date, items, subtotal, tax, total, createdAt',
            alerts: '++id, itemId, itemName, type, message, isRead, createdAt'
        }).upgrade(trans => {
            // Migrate existing data to new schema
            return trans.items.toCollection().modify(item => {
                // Add default values for new fields
                item.brand = item.brand || '';
                item.model = item.model || '';
                item.color = item.color || '';
                item.size = item.size || '';
                item.unit = item.unit || 'Each';
                item.location = item.location || '';
                item.supplier = item.supplier || '';
                item.reorderPoint = item.reorderPoint || item.minStock || 0;
            });
        });

        // Add hooks for automatic timestamps
        this.db.items.hook('creating', function (primKey, obj, trans) {
            obj.createdAt = new Date();
            obj.updatedAt = new Date();
        });

        this.db.items.hook('updating', function (modifications, primKey, obj, trans) {
            modifications.updatedAt = new Date();
        });

        this.db.sales.hook('creating', function (primKey, obj, trans) {
            obj.createdAt = new Date();
        });

        this.db.alerts.hook('creating', function (primKey, obj, trans) {
            obj.createdAt = new Date();
        });
    }

    // Item Management
    async addItem(itemData) {
        try {
            const id = await this.db.items.add(itemData);
            await this.checkStockAlerts(id);
            return id;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }

    async updateItem(id, itemData) {
        try {
            await this.db.items.update(id, itemData);
            await this.checkStockAlerts(id);
            return true;
        } catch (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    }

    async deleteItem(id) {
        try {
            await this.db.items.delete(id);
            // Also delete related sales and alerts
            await this.db.sales.where('itemId').equals(id).delete();
            await this.db.alerts.where('itemId').equals(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }

    async getItem(id) {
        try {
            return await this.db.items.get(id);
        } catch (error) {
            console.error('Error getting item:', error);
            throw error;
        }
    }

    async getAllItems() {
        try {
            return await this.db.items.orderBy('name').toArray();
        } catch (error) {
            console.error('Error getting all items:', error);
            throw error;
        }
    }

    async searchItems(query) {
        try {
            const items = await this.db.items
                .where('name')
                .startsWithIgnoreCase(query)
                .or('sku')
                .startsWithIgnoreCase(query)
                .or('category')
                .startsWithIgnoreCase(query)
                .toArray();
            return items;
        } catch (error) {
            console.error('Error searching items:', error);
            throw error;
        }
    }

    // Invoice Management
    async addInvoice(invoiceData) {
        try {
            const id = await this.db.invoices.add(invoiceData);
            return id;
        } catch (error) {
            console.error('Error adding invoice:', error);
            throw error;
        }
    }

    async getAllInvoices() {
        try {
            return await this.db.invoices.orderBy('date').reverse().toArray();
        } catch (error) {
            console.error('Error getting all invoices:', error);
            throw error;
        }
    }

    async getInvoice(id) {
        try {
            return await this.db.invoices.get(id);
        } catch (error) {
            console.error('Error getting invoice:', error);
            throw error;
        }
    }

    async deleteInvoice(id) {
        try {
            await this.db.invoices.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            throw error;
        }
    }

    // Sales Management
    async addSale(saleData) {
        try {
            const transaction = await this.db.transaction('rw', [this.db.items, this.db.sales, this.db.alerts], async () => {
                // Add sale record
                const saleId = await this.db.sales.add(saleData);
                
                // Update item stock
                const item = await this.db.items.get(saleData.itemId);
                if (item) {
                    const newStock = item.stock - saleData.quantity;
                    if (newStock < 0) {
                        throw new Error('Insufficient stock');
                    }
                    await this.db.items.update(saleData.itemId, { stock: newStock });
                    
                    // Check for low stock alerts
                    await this.checkStockAlerts(saleData.itemId);
                }
                
                return saleId;
            });
            return transaction;
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    }

    async getAllSales() {
        try {
            return await this.db.sales.orderBy('date').reverse().toArray();
        } catch (error) {
            console.error('Error getting all sales:', error);
            throw error;
        }
    }

    async getSalesByDateRange(startDate, endDate) {
        try {
            return await this.db.sales
                .where('date')
                .between(startDate, endDate, true, true)
                .reverse()
                .toArray();
        } catch (error) {
            console.error('Error getting sales by date range:', error);
            throw error;
        }
    }

    async getTodaySales() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            return await this.getSalesByDateRange(today, tomorrow);
        } catch (error) {
            console.error('Error getting today sales:', error);
            throw error;
        }
    }

    // Alert Management
    async checkStockAlerts(itemId) {
        try {
            const item = await this.db.items.get(itemId);
            if (!item) return;

            // Remove existing low stock alerts for this item
            await this.db.alerts.where('itemId').equals(itemId).and(alert => alert.type === 'low_stock').delete();

            // Create new alert if stock is low
            if (item.stock <= item.minStock) {
                await this.db.alerts.add({
                    itemId: itemId,
                    itemName: item.name,
                    type: 'low_stock',
                    message: `${item.name} is running low on stock (${item.stock} remaining)`,
                    isRead: false
                });
            }
        } catch (error) {
            console.error('Error checking stock alerts:', error);
        }
    }

    async getAllAlerts() {
        try {
            return await this.db.alerts.orderBy('createdAt').reverse().toArray();
        } catch (error) {
            console.error('Error getting all alerts:', error);
            throw error;
        }
    }

    async getUnreadAlerts() {
        try {
            return await this.db.alerts.where('isRead').equals(false).toArray();
        } catch (error) {
            console.error('Error getting unread alerts:', error);
            throw error;
        }
    }

    async markAlertAsRead(alertId) {
        try {
            await this.db.alerts.update(alertId, { isRead: true });
            return true;
        } catch (error) {
            console.error('Error marking alert as read:', error);
            throw error;
        }
    }

    async markAllAlertsAsRead() {
        try {
            await this.db.alerts.where('isRead').equals(false).modify({ isRead: true });
            return true;
        } catch (error) {
            console.error('Error marking all alerts as read:', error);
            throw error;
        }
    }

    // Dashboard Statistics
    async getDashboardStats() {
        try {
            const [items, sales, alerts] = await Promise.all([
                this.getAllItems(),
                this.getTodaySales(),
                this.getUnreadAlerts()
            ]);

            const totalItems = items.length;
            const lowStockItems = items.filter(item => item.stock <= item.minStock).length;
            const totalValue = items.reduce((sum, item) => sum + (item.stock * item.price), 0);
            const todaySales = sales.reduce((sum, sale) => sum + sale.total, 0);

            return {
                totalItems,
                lowStockItems,
                totalValue,
                todaySales,
                unreadAlerts: alerts.length
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            throw error;
        }
    }

    // Data Export/Import
    async exportData() {
        try {
            const [items, sales, invoices, alerts] = await Promise.all([
                this.getAllItems(),
                this.getAllSales(),
                this.getAllInvoices(),
                this.getAllAlerts()
            ]);

            return {
                items,
                sales,
                invoices,
                alerts,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    async importData(data) {
        try {
            await this.db.transaction('rw', [this.db.items, this.db.sales, this.db.invoices, this.db.alerts], async () => {
                // Clear existing data
                await this.db.items.clear();
                await this.db.sales.clear();
                await this.db.invoices.clear();
                await this.db.alerts.clear();

                // Import new data
                if (data.items && data.items.length > 0) {
                    await this.db.items.bulkAdd(data.items);
                }
                if (data.sales && data.sales.length > 0) {
                    await this.db.sales.bulkAdd(data.sales);
                }
                if (data.invoices && data.invoices.length > 0) {
                    await this.db.invoices.bulkAdd(data.invoices);
                }
                if (data.alerts && data.alerts.length > 0) {
                    await this.db.alerts.bulkAdd(data.alerts);
                }
            });
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    // Utility Methods
    async clearAllData() {
        try {
            await this.db.transaction('rw', [this.db.items, this.db.sales, this.db.invoices, this.db.alerts], async () => {
                await this.db.items.clear();
                await this.db.sales.clear();
                await this.db.invoices.clear();
                await this.db.alerts.clear();
            });
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            throw error;
        }
    }

    async getDatabaseSize() {
        try {
            const [itemsCount, salesCount, invoicesCount, alertsCount] = await Promise.all([
                this.db.items.count(),
                this.db.sales.count(),
                this.db.invoices.count(),
                this.db.alerts.count()
            ]);
            return {
                items: itemsCount,
                sales: salesCount,
                invoices: invoicesCount,
                alerts: alertsCount
            };
        } catch (error) {
            console.error('Error getting database size:', error);
            throw error;
        }
    }
}

// Initialize database instance
const db = new WilsonPlusDB();
