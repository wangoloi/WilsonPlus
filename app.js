// WilsonPlus Main Application Logic
class WilsonPlusApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.editingItemId = null;
        this.currentInvoice = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupElectronIntegration();
        await this.registerServiceWorker();
        await this.loadDashboard();
        this.showTab('dashboard');
        this.showToast('WilsonPlus loaded successfully!', 'success');
    }

    setupElectronIntegration() {
        // Check if running in Electron
        if (window.electronAPI) {
            console.log('Running in Electron desktop app');
            
            // Setup menu event listeners
            window.electronAPI.onMenuNewItem(() => {
                this.openItemModal();
            });
            
            window.electronAPI.onMenuNewSale(() => {
                this.openSaleModal();
            });
            
            window.electronAPI.onMenuExportData(() => {
                this.exportData();
            });
            
            window.electronAPI.onMenuImportData(() => {
                this.importData();
            });
            
            window.electronAPI.onMenuNavigate((event, tabName) => {
                this.showTab(tabName);
            });
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully:', registration);
                
                // Listen for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('App update available! Refresh to update.', 'info');
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.showTab(tab);
            });
        });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });

        // Invoice management
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.openInvoiceModal();
        });

        document.getElementById('invoiceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInvoice();
        });

        // Invoice item management
        document.getElementById('addItemToInvoice').addEventListener('click', () => {
            this.addItemToInvoice();
        });

        // Auto-calculate item total
        document.getElementById('itemQuantity').addEventListener('input', () => {
            this.calculateItemTotal();
        });

        document.getElementById('itemUnitPrice').addEventListener('input', () => {
            this.calculateItemTotal();
        });

        // Sales management
        document.getElementById('newSaleBtn').addEventListener('click', () => {
            this.openSaleModal();
        });

        document.getElementById('saleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processSale();
        });

        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchItems();
        });

        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchItems();
            }
        });

        // Sales filtering
        document.getElementById('filterSalesBtn').addEventListener('click', () => {
            this.filterSales();
        });

        // Data management
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            this.importData();
        });

        document.getElementById('markAllReadBtn').addEventListener('click', () => {
            this.markAllAlertsAsRead();
        });

        // Sale form interactions
        document.getElementById('saleItem').addEventListener('change', () => {
            this.updateSalePrice();
        });

        document.getElementById('saleQuantity').addEventListener('input', () => {
            this.updateSaleTotal();
        });

        // Toast close
        document.getElementById('toastClose').addEventListener('click', () => {
            this.hideToast();
        });
    }

    showTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'sales':
                this.loadSales();
                break;
            case 'alerts':
                this.loadAlerts();
                break;
        }
    }

    async loadDashboard() {
        try {
            const stats = await db.getDashboardStats();
            
            document.getElementById('totalItems').textContent = stats.totalItems;
            document.getElementById('lowStockItems').textContent = stats.lowStockItems;
            document.getElementById('totalValue').textContent = `UGX ${stats.totalValue.toLocaleString()}`;
            document.getElementById('todaySales').textContent = `UGX ${stats.todaySales.toLocaleString()}`;

            // Load recent sales
            const recentSales = await db.getTodaySales();
            this.displayRecentSales(recentSales.slice(0, 5));

            // Load low stock alerts
            const lowStockAlerts = await db.getUnreadAlerts();
            this.displayLowStockAlerts(lowStockAlerts.slice(0, 5));

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showToast('Error loading dashboard data', 'error');
        }
    }

    displayRecentSales(sales) {
        const container = document.getElementById('recentSales');
        if (sales.length === 0) {
            container.innerHTML = '<p class="no-data">No sales today</p>';
            return;
        }

        container.innerHTML = sales.map(sale => `
            <div class="recent-item">
                <div class="item-info">
                    <strong>${sale.itemName}</strong>
                    <span>Qty: ${sale.quantity}</span>
                </div>
                <div class="item-value">UGX ${sale.total.toLocaleString()}</div>
            </div>
        `).join('');
    }

    displayLowStockAlerts(alerts) {
        const container = document.getElementById('lowStockAlerts');
        if (alerts.length === 0) {
            container.innerHTML = '<p class="no-data">No low stock alerts</p>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${alert.message}</span>
            </div>
        `).join('');
    }

    async loadInventory() {
        try {
            const items = await db.getAllItems();
            this.displayInventory(items);
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showToast('Error loading inventory', 'error');
        }
    }

    displayInventory(items) {
        const tbody = document.getElementById('inventoryTableBody');
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="no-data">No items in inventory</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr class="${item.stock <= item.minStock ? 'low-stock' : ''}">
                <td>
                    <div class="item-name">
                        <strong>${item.name}</strong>
                        ${item.brand ? `<br><small class="brand">${item.brand}</small>` : ''}
                    </div>
                </td>
                <td>${item.sku}</td>
                <td>
                    <span class="category-badge category-${item.category?.toLowerCase().replace(/\s+/g, '-')}">
                        ${item.category}
                    </span>
                </td>
                <td>${item.brand || '-'}</td>
                <td>
                    <div class="size-unit">
                        ${item.size ? `<span class="size">${item.size}</span>` : ''}
                        ${item.unit ? `<br><small class="unit">${item.unit}</small>` : ''}
                    </div>
                </td>
                <td class="stock-cell">
                    <span class="stock-value">${item.stock}</span>
                    ${item.stock <= item.minStock ? '<i class="fas fa-exclamation-triangle warning"></i>' : ''}
                </td>
                <td>${item.minStock}</td>
                <td>UGX ${item.price.toLocaleString()}</td>
                <td>
                    <span class="location" title="${item.location || 'No location set'}">
                        ${item.location || '-'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-primary" onclick="app.editItem(${item.id})" title="Edit Item">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteItem(${item.id})" title="Delete Item">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async searchItems() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            this.loadInventory();
            return;
        }

        try {
            const items = await db.searchItems(query);
            this.displayInventory(items);
        } catch (error) {
            console.error('Error searching items:', error);
            this.showToast('Error searching items', 'error');
        }
    }

    openInvoiceModal() {
        this.resetInvoice();
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('itemModalTitle');
        
        title.textContent = 'New Invoice';
        
        // Set today's date
        document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
        
        // Generate invoice number
        document.getElementById('invoiceNumber').value = 'INV-' + Date.now();
        
        modal.style.display = 'block';
    }

    resetInvoice() {
        this.currentInvoice = {
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0
        };
        this.updateInvoiceDisplay();
        this.clearItemForm();
    }

    clearItemForm() {
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        document.getElementById('itemUnitPrice').value = '';
        document.getElementById('itemTotal').value = '';
    }

    calculateItemTotal() {
        const quantity = parseFloat(document.getElementById('itemQuantity').value) || 0;
        const unitPrice = parseFloat(document.getElementById('itemUnitPrice').value) || 0;
        const total = quantity * unitPrice;
        document.getElementById('itemTotal').value = total.toLocaleString();
    }

    addItemToInvoice() {
        const name = document.getElementById('itemName').value.trim();
        const quantity = parseFloat(document.getElementById('itemQuantity').value);
        const unitPrice = parseFloat(document.getElementById('itemUnitPrice').value);
        const total = parseFloat(document.getElementById('itemTotal').value);

        if (!name || !quantity || !unitPrice) {
            this.showToast('Please fill in all required fields', 'warning');
            return;
        }

        const item = {
            id: Date.now(),
            name: name,
            quantity: quantity,
            unitPrice: unitPrice,
            total: total
        };

        this.currentInvoice.items.push(item);
        this.updateInvoiceTotals();
        this.updateInvoiceDisplay();
        this.clearItemForm();
        this.showToast('Item added to invoice', 'success');
    }

    removeItemFromInvoice(itemId) {
        this.currentInvoice.items = this.currentInvoice.items.filter(item => item.id !== itemId);
        this.updateInvoiceTotals();
        this.updateInvoiceDisplay();
        this.showToast('Item removed from invoice', 'info');
    }

    updateInvoiceTotals() {
        this.currentInvoice.subtotal = this.currentInvoice.items.reduce((sum, item) => sum + item.total, 0);
        this.currentInvoice.tax = 0; // No tax for now
        this.currentInvoice.total = this.currentInvoice.subtotal + this.currentInvoice.tax;
    }

    updateInvoiceDisplay() {
        const itemsList = document.getElementById('invoiceItemsList');
        const saveBtn = document.getElementById('saveInvoiceBtn');

        if (this.currentInvoice.items.length === 0) {
            itemsList.innerHTML = '<p class="no-items">No items added yet</p>';
            saveBtn.disabled = true;
        } else {
            itemsList.innerHTML = this.currentInvoice.items.map(item => `
                <div class="invoice-item">
                    <div class="invoice-item-info">
                        <div class="invoice-item-name">${item.name}</div>
                        <div class="invoice-item-details">
                            Qty: ${item.quantity} × UGX ${item.unitPrice.toLocaleString()}
                        </div>
                    </div>
                    <div class="invoice-item-total">UGX ${item.total.toLocaleString()}</div>
                    <div class="invoice-item-actions">
                        <button class="btn btn-sm btn-danger" onclick="app.removeItemFromInvoice(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            saveBtn.disabled = false;
        }

        // Update totals
        document.getElementById('invoiceSubtotal').textContent = `UGX ${this.currentInvoice.subtotal.toLocaleString()}`;
        document.getElementById('invoiceTax').textContent = `UGX ${this.currentInvoice.tax.toLocaleString()}`;
        document.getElementById('invoiceGrandTotal').textContent = `UGX ${this.currentInvoice.total.toLocaleString()}`;
    }

    async loadItemForEdit(itemId) {
        try {
            const item = await db.getItem(itemId);
            if (item) {
                document.getElementById('itemName').value = item.name;
                document.getElementById('itemSku').value = item.sku;
                document.getElementById('itemCategory').value = item.category;
                document.getElementById('itemStock').value = item.stock;
                document.getElementById('itemMinStock').value = item.minStock;
                document.getElementById('itemPrice').value = item.price;
                document.getElementById('itemCost').value = item.cost || '';
                document.getElementById('itemDescription').value = item.description || '';
                
                // Building material specific fields
                document.getElementById('itemBrand').value = item.brand || '';
                document.getElementById('itemModel').value = item.model || '';
                document.getElementById('itemColor').value = item.color || '';
                document.getElementById('itemSize').value = item.size || '';
                document.getElementById('itemUnit').value = item.unit || '';
                document.getElementById('itemLocation').value = item.location || '';
            }
        } catch (error) {
            console.error('Error loading item for edit:', error);
            this.showToast('Error loading item', 'error');
        }
    }

    async saveInvoice() {
        try {
            const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
            const invoiceDate = document.getElementById('invoiceDate').value;

            if (!invoiceNumber || !invoiceDate) {
                this.showToast('Please fill in invoice number and date', 'warning');
                return;
            }

            if (this.currentInvoice.items.length === 0) {
                this.showToast('Please add at least one item to the invoice', 'warning');
                return;
            }

            // Save invoice to database
            const invoiceData = {
                invoiceNumber: invoiceNumber,
                date: new Date(invoiceDate),
                items: this.currentInvoice.items,
                subtotal: this.currentInvoice.subtotal,
                tax: this.currentInvoice.tax,
                total: this.currentInvoice.total,
                createdAt: new Date()
            };

            await db.addInvoice(invoiceData);
            this.showToast('Invoice saved successfully!', 'success');
            this.closeModals();
            this.loadInventory();
            this.loadDashboard();
        } catch (error) {
            console.error('Error saving invoice:', error);
            this.showToast('Error saving invoice', 'error');
        }
    }

    async editItem(itemId) {
        this.openItemModal(itemId);
    }

    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            try {
                await db.deleteItem(itemId);
                this.showToast('Item deleted successfully!', 'success');
                this.loadInventory();
                this.loadDashboard();
            } catch (error) {
                console.error('Error deleting item:', error);
                this.showToast('Error deleting item', 'error');
            }
        }
    }

    async loadSales() {
        try {
            const sales = await db.getAllSales();
            this.displaySales(sales);
        } catch (error) {
            console.error('Error loading sales:', error);
            this.showToast('Error loading sales', 'error');
        }
    }

    displaySales(sales) {
        const tbody = document.getElementById('salesTableBody');
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No sales recorded</td></tr>';
            return;
        }

        tbody.innerHTML = sales.map(sale => `
            <tr>
                <td>${new Date(sale.date).toLocaleDateString()}</td>
                <td>${sale.itemName}</td>
                <td>${sale.quantity}</td>
                <td>UGX ${sale.total.toLocaleString()}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.viewSaleDetails(${sale.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async filterSales() {
        const fromDate = document.getElementById('dateFrom').value;
        const toDate = document.getElementById('dateTo').value;

        if (!fromDate || !toDate) {
            this.showToast('Please select both start and end dates', 'warning');
            return;
        }

        try {
            const sales = await db.getSalesByDateRange(new Date(fromDate), new Date(toDate));
            this.displaySales(sales);
        } catch (error) {
            console.error('Error filtering sales:', error);
            this.showToast('Error filtering sales', 'error');
        }
    }

    async openSaleModal() {
        try {
            const items = await db.getAllItems();
            const saleItemSelect = document.getElementById('saleItem');
            
            saleItemSelect.innerHTML = '<option value="">Choose an item...</option>';
            items.forEach(item => {
                if (item.stock > 0) {
                    saleItemSelect.innerHTML += `<option value="${item.id}" data-price="${item.price}">${item.name} (Stock: ${item.stock})</option>`;
                }
            });

            document.getElementById('saleForm').reset();
            document.getElementById('saleModal').style.display = 'block';
        } catch (error) {
            console.error('Error opening sale modal:', error);
            this.showToast('Error opening sale modal', 'error');
        }
    }

    updateSalePrice() {
        const selectedOption = document.getElementById('saleItem').selectedOptions[0];
        if (selectedOption) {
            const price = selectedOption.dataset.price;
            document.getElementById('salePrice').value = price;
            this.updateSaleTotal();
        }
    }

    updateSaleTotal() {
        const quantity = parseFloat(document.getElementById('saleQuantity').value) || 0;
        const price = parseFloat(document.getElementById('salePrice').value) || 0;
        const total = quantity * price;
        document.getElementById('saleTotal').value = total.toLocaleString();
    }

    async processSale() {
        try {
            const itemId = parseInt(document.getElementById('saleItem').value);
            const quantity = parseInt(document.getElementById('saleQuantity').value);
            const unitPrice = parseFloat(document.getElementById('salePrice').value);
            const total = parseFloat(document.getElementById('saleTotal').value);

            const item = await db.getItem(itemId);
            if (!item) {
                this.showToast('Item not found', 'error');
                return;
            }

            if (item.stock < quantity) {
                this.showToast('Insufficient stock available', 'error');
                return;
            }

            const saleData = {
                itemId: itemId,
                itemName: item.name,
                quantity: quantity,
                unitPrice: unitPrice,
                total: total,
                date: new Date()
            };

            await db.addSale(saleData);
            this.showToast('Sale completed successfully!', 'success');
            this.closeModals();
            this.loadSales();
            this.loadDashboard();
        } catch (error) {
            console.error('Error processing sale:', error);
            this.showToast('Error processing sale', 'error');
        }
    }

    async loadAlerts() {
        try {
            const alerts = await db.getAllAlerts();
            this.displayAlerts(alerts);
        } catch (error) {
            console.error('Error loading alerts:', error);
            this.showToast('Error loading alerts', 'error');
        }
    }

    displayAlerts(alerts) {
        const container = document.getElementById('alertsList');
        if (alerts.length === 0) {
            container.innerHTML = '<p class="no-data">No alerts</p>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-card ${alert.isRead ? 'read' : 'unread'}">
                <div class="alert-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="alert-content">
                    <h4>${alert.itemName}</h4>
                    <p>${alert.message}</p>
                    <small>${new Date(alert.createdAt).toLocaleString()}</small>
                </div>
                <div class="alert-actions">
                    ${!alert.isRead ? `<button class="btn btn-sm btn-primary" onclick="app.markAlertAsRead(${alert.id})">Mark Read</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    async markAlertAsRead(alertId) {
        try {
            await db.markAlertAsRead(alertId);
            this.loadAlerts();
            this.loadDashboard();
        } catch (error) {
            console.error('Error marking alert as read:', error);
            this.showToast('Error marking alert as read', 'error');
        }
    }

    async markAllAlertsAsRead() {
        try {
            await db.markAllAlertsAsRead();
            this.showToast('All alerts marked as read', 'success');
            this.loadAlerts();
            this.loadDashboard();
        } catch (error) {
            console.error('Error marking all alerts as read:', error);
            this.showToast('Error marking all alerts as read', 'error');
        }
    }

    async exportData() {
        try {
            const data = await db.exportData();
            const jsonData = JSON.stringify(data, null, 2);
            
            if (window.electronAPI) {
                // Electron desktop app - use native file dialog
                const result = await window.electronAPI.showSaveDialog({
                    title: 'Export WilsonPlus Data',
                    defaultPath: `wilsonplus-backup-${new Date().toISOString().split('T')[0]}.json`,
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
                
                if (!result.canceled && result.filePath) {
                    const writeResult = await window.electronAPI.writeFile(result.filePath, jsonData);
                    if (writeResult.success) {
                        this.showToast('Data exported successfully!', 'success');
                    } else {
                        this.showToast('Error writing file: ' + writeResult.error, 'error');
                    }
                }
            } else {
                // Browser - use download
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `wilsonplus-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showToast('Data exported successfully!', 'success');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showToast('Error exporting data', 'error');
        }
    }

    async importData() {
        try {
            if (window.electronAPI) {
                // Electron desktop app - use native file dialog
                const result = await window.electronAPI.showOpenDialog({
                    title: 'Import WilsonPlus Data',
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });
                
                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const readResult = await window.electronAPI.readFile(filePath);
                    
                    if (readResult.success) {
                        const data = JSON.parse(readResult.data);
                        
                        if (confirm('This will replace all existing data. Are you sure?')) {
                            await db.importData(data);
                            this.showToast('Data imported successfully!', 'success');
                            this.loadDashboard();
                            this.loadInventory();
                            this.loadSales();
                            this.loadAlerts();
                        }
                    } else {
                        this.showToast('Error reading file: ' + readResult.error, 'error');
                    }
                }
            } else {
                // Browser - use file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        
                        if (confirm('This will replace all existing data. Are you sure?')) {
                            await db.importData(data);
                            this.showToast('Data imported successfully!', 'success');
                            this.loadDashboard();
                            this.loadInventory();
                            this.loadSales();
                            this.loadAlerts();
                        }
                    } catch (error) {
                        console.error('Error importing data:', error);
                        this.showToast('Error importing data', 'error');
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('Error importing data:', error);
            this.showToast('Error importing data', 'error');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.editingItemId = null;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            this.hideToast();
        }, 5000);
    }

    hideToast() {
        document.getElementById('toast').style.display = 'none';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WilsonPlusApp();
});
