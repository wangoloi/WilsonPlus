// WilsonPlus Database Client - Renderer Process
// This wraps the IPC calls to the main process database
class WilsonPlusDBClient {
    constructor() {
        // Wait for electronAPI to be available
        if (!window.electronAPI) {
            console.warn('electronAPI not available yet, will retry on first use');
            this.api = null;
            return;
        }
        
        if (!window.electronAPI.db) {
            console.error('Database API not available in electronAPI');
            throw new Error('Database API not available. Make sure you are running in Electron.');
        }
        
        this.api = window.electronAPI.db;
        console.log('Database client initialized successfully');
    }
    
    // Ensure API is available before making calls
    ensureAPI() {
        if (!this.api) {
            if (!window.electronAPI || !window.electronAPI.db) {
                throw new Error('Database API not available. Make sure you are running in Electron and the app is fully loaded.');
            }
            this.api = window.electronAPI.db;
        }
    }

    // Item Management
    async addItem(itemData) {
        this.ensureAPI();
        console.log('Adding item:', itemData);
        const result = await this.api.addItem(itemData);
        console.log('Add item result:', result);
        if (!result.success) {
            throw new Error(result.error || 'Error adding item');
        }
        return result.id;
    }

    async updateItem(id, itemData) {
        this.ensureAPI();
        const result = await this.api.updateItem(id, itemData);
        if (!result.success) {
            throw new Error(result.error || 'Error updating item');
        }
        return true;
    }

    async deleteItem(id) {
        this.ensureAPI();
        const result = await this.api.deleteItem(id);
        if (!result.success) {
            throw new Error(result.error || 'Error deleting item');
        }
        return true;
    }

    async getItem(id) {
        this.ensureAPI();
        const result = await this.api.getItem(id);
        if (!result.success) {
            throw new Error(result.error || 'Error getting item');
        }
        return result.data;
    }

    async getAllItems() {
        this.ensureAPI();
        const result = await this.api.getAllItems();
        if (!result.success) {
            throw new Error(result.error || 'Error getting all items');
        }
        return result.data;
    }

    async searchItems(query) {
        this.ensureAPI();
        const result = await this.api.searchItems(query);
        if (!result.success) {
            throw new Error(result.error || 'Error searching items');
        }
        return result.data;
    }

    // Invoice Management
    async addInvoice(invoiceData) {
        this.ensureAPI();
        console.log('Database client: Adding invoice:', {
            invoiceNumber: invoiceData.invoiceNumber,
            itemsCount: invoiceData.items ? invoiceData.items.length : 0,
            total: invoiceData.total
        });
        
        try {
            const result = await this.api.addInvoice(invoiceData);
            console.log('Database client: Add invoice result:', result);
            
            if (!result) {
                throw new Error('No response from database API');
            }
            
            if (!result.success) {
                const errorMsg = result.error || 'Error adding invoice';
                console.error('Database error:', errorMsg);
                throw new Error(errorMsg);
            }
            
            console.log('Invoice saved successfully with ID:', result.id);
            return result.id;
        } catch (error) {
            console.error('Database client error in addInvoice:', error);
            throw error;
        }
    }

    async getAllInvoices() {
        this.ensureAPI();
        const result = await this.api.getAllInvoices();
        if (!result.success) {
            throw new Error(result.error || 'Error getting all invoices');
        }
        return result.data;
    }

    async getInvoice(id) {
        this.ensureAPI();
        const result = await this.api.getInvoice(id);
        if (!result.success) {
            throw new Error(result.error || 'Error getting invoice');
        }
        return result.data;
    }

    async deleteInvoice(id) {
        this.ensureAPI();
        const result = await this.api.deleteInvoice(id);
        if (!result.success) {
            throw new Error(result.error || 'Error deleting invoice');
        }
        return true;
    }

    // Sales Management
    async addSale(saleData) {
        this.ensureAPI();
        const result = await this.api.addSale(saleData);
        if (!result.success) {
            throw new Error(result.error || 'Error adding sale');
        }
        return true;
    }

    async getAllSales() {
        this.ensureAPI();
        const result = await this.api.getAllSales();
        if (!result.success) {
            throw new Error(result.error || 'Error getting all sales');
        }
        return result.data;
    }

    async getSalesByDateRange(startDate, endDate) {
        this.ensureAPI();
        const result = await this.api.getSalesByDateRange(startDate, endDate);
        if (!result.success) {
            throw new Error(result.error || 'Error getting sales by date range');
        }
        return result.data;
    }

    async getTodaySales() {
        this.ensureAPI();
        const result = await this.api.getTodaySales();
        if (!result.success) {
            throw new Error(result.error || 'Error getting today sales');
        }
        return result.data;
    }

    // Alert Management
    async getAllAlerts() {
        this.ensureAPI();
        const result = await this.api.getAllAlerts();
        if (!result.success) {
            throw new Error(result.error || 'Error getting all alerts');
        }
        return result.data;
    }

    async getUnreadAlerts() {
        this.ensureAPI();
        const result = await this.api.getUnreadAlerts();
        if (!result.success) {
            throw new Error(result.error || 'Error getting unread alerts');
        }
        return result.data;
    }

    async markAlertAsRead(alertId) {
        this.ensureAPI();
        const result = await this.api.markAlertAsRead(alertId);
        if (!result.success) {
            throw new Error(result.error || 'Error marking alert as read');
        }
        return true;
    }

    async markAllAlertsAsRead() {
        this.ensureAPI();
        const result = await this.api.markAllAlertsAsRead();
        if (!result.success) {
            throw new Error(result.error || 'Error marking all alerts as read');
        }
        return true;
    }

    // Dashboard Statistics
    async getDashboardStats() {
        this.ensureAPI();
        const result = await this.api.getDashboardStats();
        if (!result.success) {
            throw new Error(result.error || 'Error getting dashboard stats');
        }
        return result.data;
    }

    // Data Export/Import
    async exportData() {
        this.ensureAPI();
        const result = await this.api.exportData();
        if (!result.success) {
            throw new Error(result.error || 'Error exporting data');
        }
        return result.data;
    }

    async importData(data) {
        this.ensureAPI();
        const result = await this.api.importData(data);
        if (!result.success) {
            throw new Error(result.error || 'Error importing data');
        }
        return true;
    }

    // Utility Methods
    async clearAllData() {
        this.ensureAPI();
        const result = await this.api.clearAllData();
        if (!result.success) {
            throw new Error(result.error || 'Error clearing all data');
        }
        return true;
    }

    async getDatabaseSize() {
        this.ensureAPI();
        const result = await this.api.getDatabaseSize();
        if (!result.success) {
            throw new Error(result.error || 'Error getting database size');
        }
        return result.data;
    }
}

// Initialize database client instance
let db;
try {
    db = new WilsonPlusDBClient();
    console.log('Database client created');
} catch (error) {
    console.error('Failed to create database client:', error);
    // Create a placeholder that will retry on first use
    db = {
        ensureAPI: function() {
            if (!window.electronAPI || !window.electronAPI.db) {
                throw new Error('Database API not available. Please restart the application.');
            }
            if (!this.api) {
                this.api = window.electronAPI.db;
            }
        }
    };
    // Copy methods from WilsonPlusDBClient prototype
    Object.setPrototypeOf(db, WilsonPlusDBClient.prototype);
    db.api = null;
}

