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

        // Inventory management - Add new item button
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.openItemModal();
        });
        
        // Invoice management - New invoice button
        document.getElementById('newInvoiceBtn').addEventListener('click', () => {
            this.openInvoiceModal();
        });
        
        // Item form submission
        document.getElementById('itemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveItem();
        });

        const invoiceForm = document.getElementById('invoiceForm');
        if (invoiceForm) {
            invoiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Invoice form submitted');
                this.saveInvoice();
            });
        } else {
            console.error('Invoice form not found during initialization!');
        }
        
        // Also add click handler directly to save button as backup
        const saveBtn = document.getElementById('saveInvoiceBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Save Invoice button clicked directly');
                console.log('Button disabled?', saveBtn.disabled);
                console.log('Current invoice items:', this.currentInvoice.items.length);
                
                if (saveBtn.disabled) {
                    console.warn('Save button is disabled!');
                    this.showToast('Please add at least one item to the invoice before saving', 'warning');
                    return;
                }
                
                const form = document.getElementById('invoiceForm');
                if (form && form.checkValidity()) {
                    console.log('Form is valid, calling saveInvoice()');
                    this.saveInvoice();
                } else {
                    console.warn('Form validation failed');
                    if (form) {
                        form.reportValidity();
                    }
                }
            });
        } else {
            console.error('Save invoice button not found during initialization!');
        }

        // Invoice item management
        document.getElementById('addItemToInvoice').addEventListener('click', () => {
            this.addItemToInvoice();
        });

        // Auto-calculate item total - trigger on input, change, and keyup events
        const itemQuantity = document.getElementById('itemQuantity');
        const itemUnitPrice = document.getElementById('itemUnitPrice');
        const itemTotal = document.getElementById('itemTotal');
        
        // Make itemTotal read-only
        itemTotal.readOnly = true;
        
        // Add multiple event listeners for better responsiveness
        ['input', 'change', 'keyup'].forEach(eventType => {
            itemQuantity.addEventListener(eventType, () => {
                this.calculateItemTotal();
            });
            
            itemUnitPrice.addEventListener(eventType, () => {
                this.calculateItemTotal();
            });
        });
        
        // Also calculate on paste events
        itemQuantity.addEventListener('paste', () => {
            setTimeout(() => this.calculateItemTotal(), 10);
        });
        
        itemUnitPrice.addEventListener('paste', () => {
            setTimeout(() => this.calculateItemTotal(), 10);
        });

        // Sales management - Multiple approaches to ensure it works
        const newSaleBtn = document.getElementById('newSaleBtn');
        if (newSaleBtn) {
            // Remove any existing listeners first
            const newBtn = newSaleBtn.cloneNode(true);
            newSaleBtn.parentNode.replaceChild(newBtn, newSaleBtn);
            
            // Add click listener
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('New Sale button clicked - Event listener triggered');
                this.openSaleModal();
            });
            
            // Also add as onclick attribute as backup
            newBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('New Sale button clicked - Onclick handler triggered');
                this.openSaleModal();
            };
            
            console.log('New Sale button event listener attached successfully');
        } else {
            console.error('New Sale button not found during initialization');
            // Try again after a short delay in case DOM isn't ready
            setTimeout(() => {
                const retryBtn = document.getElementById('newSaleBtn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('New Sale button clicked - Retry handler');
                        this.openSaleModal();
                    });
                    retryBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openSaleModal();
                    };
                    console.log('New Sale button event listener attached on retry');
                }
            }, 100);
        }
        
        // Also use event delegation as a fallback
        document.addEventListener('click', (e) => {
            if (e.target && (e.target.id === 'newSaleBtn' || e.target.closest('#newSaleBtn'))) {
                e.preventDefault();
                e.stopPropagation();
                console.log('New Sale button clicked - Event delegation handler');
                this.openSaleModal();
            }
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
                // Ensure sales table is visible
                const salesTable = document.getElementById('salesTableBody');
                if (salesTable && salesTable.innerHTML.trim() === '') {
                    this.loadSales();
                }
                break;
            case 'invoices':
                this.loadInvoices();
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
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No items in inventory</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => {
            // Extract invoice details from description
            const description = item.description || '';
            const invoiceMatch = description.match(/Invoice:\s*([^\|]+)/i);
            const invoiceNo = invoiceMatch ? invoiceMatch[1].trim() : '-';
            
            const qualityMatch = description.match(/Quality:\s*([^\|]+)/i);
            const quality = qualityMatch ? qualityMatch[1].trim() : '-';
            
            const dateMatch = description.match(/Date:\s*([^\|]+)/i);
            const date = dateMatch ? dateMatch[1].trim() : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-');
            
            return `
            <tr>
                <td>${date}</td>
                <td><strong>${invoiceNo}</strong></td>
                <td>${item.stock || 0}</td>
                <td>UGX ${item.price ? item.price.toLocaleString() : '0'}</td>
                <td>${quality}</td>
                <td>${item.category || '-'}</td>
            </tr>
        `;
        }).join('');
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
        
        title.textContent = 'GOODS REGISTRATION FORM';
        
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('invoiceDate').value = today;
        
        // Generate invoice number
        document.getElementById('invoiceNumber').value = 'INV-' + Date.now();
        
        // Clear all fields
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        document.getElementById('itemUnitPrice').value = '';
        document.getElementById('itemTotal').value = '0';
        document.getElementById('vehicleNumber').value = '';
        document.getElementById('itemQuality').value = '';
        document.getElementById('itemCategory').value = '';
        
        // Handle system date checkbox
        const useSystemDate = document.getElementById('useSystemDate');
        const dateInput = document.getElementById('invoiceDate');
        
        useSystemDate.addEventListener('change', function() {
            if (this.checked) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        });
        
        modal.style.display = 'block';
        
        // Calculate total if values are already present
        setTimeout(() => this.calculateItemTotal(), 100);
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
        document.getElementById('itemTotal').value = '0';
        document.getElementById('itemTotal').dataset.rawValue = '0';
        // Keep vehicle number, quality, and category for next item (user might want same values)
        // Or clear them if you prefer:
        // document.getElementById('vehicleNumber').value = '';
        // document.getElementById('itemQuality').value = '';
        // document.getElementById('itemCategory').value = '';
    }

    calculateItemTotal() {
        const quantityInput = document.getElementById('itemQuantity');
        const unitPriceInput = document.getElementById('itemUnitPrice');
        const totalInput = document.getElementById('itemTotal');
        
        // Parse values, removing any commas or formatting
        const quantity = parseFloat(quantityInput.value.replace(/,/g, '')) || 0;
        const unitPrice = parseFloat(unitPriceInput.value.replace(/,/g, '')) || 0;
        const total = quantity * unitPrice;
        
        // Display formatted value and store raw value
        if (total > 0) {
            totalInput.value = total.toLocaleString('en-US');
            totalInput.dataset.rawValue = total;
        } else {
            totalInput.value = '0';
            totalInput.dataset.rawValue = 0;
        }
    }

    addItemToInvoice() {
        const name = document.getElementById('itemName').value.trim();
        const quantity = parseFloat(document.getElementById('itemQuantity').value);
        const unitPrice = parseFloat(document.getElementById('itemUnitPrice').value);
        const vehicleNumber = document.getElementById('vehicleNumber').value.trim();
        const quality = document.getElementById('itemQuality').value;
        const category = document.getElementById('itemCategory').value;
        const totalInput = document.getElementById('itemTotal');
        // Get the raw value from data attribute, or calculate it
        const total = parseFloat(totalInput.dataset.rawValue) || (quantity * unitPrice);

        if (!name || !quantity || !unitPrice || !category) {
            this.showToast('Please fill in all required fields (Descriptions, Quantity, Rate, and Category)', 'warning');
            return;
        }

        if (total <= 0) {
            this.showToast('Item total must be greater than 0', 'warning');
            return;
        }

        const item = {
            id: Date.now(),
            name: name,
            quantity: quantity,
            unitPrice: unitPrice,
            total: total,
            vehicleNumber: vehicleNumber || null,
            quality: quality || null,
            category: category
        };

        this.currentInvoice.items.push(item);
        this.updateInvoiceTotals();
        this.updateInvoiceDisplay();
        this.clearItemForm();
        
        // Show items section
        document.getElementById('invoiceItemsSection').style.display = 'block';
        
        // Show success message with item count
        const itemCount = this.currentInvoice.items.length;
        this.showToast(`Item added! Invoice now has ${itemCount} item${itemCount > 1 ? 's' : ''}.`, 'success');
        
        // Scroll to items list to show the added item
        const itemsList = document.getElementById('invoiceItemsList');
        if (itemsList) {
            itemsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
        const itemCountBadge = document.getElementById('invoiceItemCount');

        if (!saveBtn) {
            console.error('Save invoice button not found!');
            return;
        }

        if (this.currentInvoice.items.length === 0) {
            itemsList.innerHTML = '<p class="no-items">No items added yet. Add items using the form above.</p>';
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
            if (itemCountBadge) {
                itemCountBadge.textContent = '0 items';
                itemCountBadge.style.display = 'none';
            }
        } else {
            itemsList.innerHTML = this.currentInvoice.items.map((item, index) => `
                <div class="invoice-item" data-item-id="${item.id}" style="display: flex; align-items: center; padding: 10px; margin-bottom: 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div class="invoice-item-number" style="width: 30px; text-align: center; font-weight: bold; color: #2563eb;">${index + 1}</div>
                    <div class="invoice-item-info" style="flex: 1; margin-left: 15px;">
                        <div class="invoice-item-name" style="font-weight: 600; margin-bottom: 5px;">${item.name}</div>
                        <div class="invoice-item-details" style="font-size: 0.9em; color: #64748b;">
                            <span>Qty: ${item.quantity}</span>
                            <span style="margin: 0 8px;">×</span>
                            <span>Rate: UGX ${item.unitPrice.toLocaleString()}</span>
                            ${item.quality ? `<span style="margin-left: 10px;">| Quality: ${item.quality}</span>` : ''}
                            ${item.category ? `<span style="margin-left: 10px;">| Category: ${item.category}</span>` : ''}
                        </div>
                    </div>
                    <div class="invoice-item-total" style="margin: 0 15px; font-weight: 600; color: #059669;">
                        UGX ${item.total.toLocaleString()}
                    </div>
                    <div class="invoice-item-actions">
                        <button class="btn btn-sm btn-danger" onclick="app.removeItemFromInvoice(${item.id})" title="Remove Item" style="padding: 5px 10px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
            console.log('Save button enabled, items count:', this.currentInvoice.items.length);
            
            if (itemCountBadge) {
                itemCountBadge.textContent = `${this.currentInvoice.items.length} item${this.currentInvoice.items.length > 1 ? 's' : ''}`;
                itemCountBadge.style.display = 'inline-block';
            }
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
        console.log('saveInvoice() called');
        console.log('Current invoice items:', this.currentInvoice.items);
        
        try {
            const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
            const invoiceDate = document.getElementById('invoiceDate').value;

            console.log('Invoice number:', invoiceNumber);
            console.log('Invoice date:', invoiceDate);

            if (!invoiceNumber || !invoiceDate) {
                console.warn('Missing invoice number or date');
                this.showToast('Please fill in invoice number and date', 'warning');
                return;
            }

            if (this.currentInvoice.items.length === 0) {
                console.warn('No items in invoice');
                this.showToast('Please add at least one item to the invoice', 'warning');
                return;
            }

            // Check if database is available
            if (!db) {
                console.error('Database not initialized');
                this.showToast('Database not available. Please restart the application.', 'error');
                return;
            }
            
            console.log('Database available, proceeding with save...');

            // Save invoice to database
            // Convert date to ISO string for database storage
            const invoiceDateObj = invoiceDate ? new Date(invoiceDate) : new Date();
            const invoiceData = {
                invoiceNumber: invoiceNumber,
                date: invoiceDateObj.toISOString(), // Convert to ISO string for SQL.js
                items: this.currentInvoice.items,
                subtotal: this.currentInvoice.subtotal,
                tax: this.currentInvoice.tax || 0,
                total: this.currentInvoice.total,
                createdAt: new Date().toISOString()
            };

            console.log('Saving invoice data:', {
                invoiceNumber: invoiceData.invoiceNumber,
                date: invoiceData.date,
                itemsCount: invoiceData.items.length,
                subtotal: invoiceData.subtotal,
                total: invoiceData.total
            });
            
            try {
                console.log('Calling db.addInvoice...');
                const result = await db.addInvoice(invoiceData);
                console.log('Invoice save result:', result);
                
                if (!result) {
                    throw new Error('No result returned from database');
                }
                
                if (result === undefined || result === null) {
                    throw new Error('Database returned undefined result');
                }
                
                // Add items from invoice to inventory
                console.log('Adding invoice items to inventory...');
                await this.addInvoiceItemsToInventory(invoiceData.items, invoiceDateObj);
                
                const itemCount = this.currentInvoice.items.length;
                this.showToast(`Invoice ${invoiceNumber} saved successfully with ${itemCount} item${itemCount > 1 ? 's' : ''}! Items added to inventory.`, 'success');
                
                // Reset invoice after successful save
                this.resetInvoice();
                this.closeModals();
                
                // Reload all relevant data in parallel for better performance
                await Promise.all([
                    this.loadInventory(),  // Refresh inventory with new items from invoice
                    this.loadDashboard(), // Refresh dashboard stats
                    this.loadAlerts()     // Check for new low stock alerts
                ]);
                
                // Load invoices if on that tab
                if (this.currentTab === 'invoices') {
                    await this.loadInvoices();
                }
            } catch (dbError) {
                console.error('Database error details:', {
                    message: dbError.message,
                    name: dbError.name,
                    stack: dbError.stack
                });
                throw dbError;
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            console.error('Error stack:', error.stack);
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            this.showToast(`Error saving invoice: ${error.message || 'Unknown error'}`, 'error');
        }
    }

    openItemModal(itemId = null) {
        this.editingItemId = itemId;
        const modal = document.getElementById('itemFormModal');
        const title = document.getElementById('itemFormModalTitle');
        
        title.textContent = 'GOODS REGISTRATION FORM';
        
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('itemFormDate');
        dateInput.value = today;
        
        // Generate invoice number
        document.getElementById('itemFormInvoiceNo').value = 'INV-' + Date.now();
        
        // Clear all fields
        document.getElementById('itemFormDescriptions').value = '';
        document.getElementById('itemFormQuantity').value = '0';
        document.getElementById('itemFormRate').value = '0';
        document.getElementById('itemFormTotalAmount').value = '0';
        document.getElementById('itemFormTotalAmount').dataset.rawValue = '0';
        document.getElementById('itemFormVehicleNo').value = '';
        document.getElementById('itemFormQuality').value = '';
        document.getElementById('itemFormCategory').value = '';
        
        // Handle system date checkbox
        const useSystemDate = document.getElementById('itemFormUseSystemDate');
        const dateContainer = document.getElementById('itemFormDateContainer');
        useSystemDate.checked = true;
        
        // Set today's date initially and hide manual date input
        dateInput.value = today;
        dateContainer.style.display = 'none';
        
        // Remove existing listeners to avoid duplicates
        const newUseSystemDate = useSystemDate.cloneNode(true);
        useSystemDate.parentNode.replaceChild(newUseSystemDate, useSystemDate);
        
        newUseSystemDate.addEventListener('change', function() {
            if (this.checked) {
                // Use system date - hide manual date input and set to today
                dateInput.value = new Date().toISOString().split('T')[0];
                dateContainer.style.display = 'none';
            } else {
                // Manual date entry - show date input field
                dateContainer.style.display = 'flex';
                dateContainer.style.flexDirection = 'column';
                dateContainer.style.gap = '5px';
                // Keep current date value or set to today if empty
                if (!dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
                // Focus on date input
                setTimeout(() => dateInput.focus(), 100);
            }
        });
        
        // Auto-calculate total when quantity or rate changes
        const quantityInput = document.getElementById('itemFormQuantity');
        const rateInput = document.getElementById('itemFormRate');
        const totalInput = document.getElementById('itemFormTotalAmount');
        
        // Remove existing listeners
        const newQuantityInput = quantityInput.cloneNode(true);
        const newRateInput = rateInput.cloneNode(true);
        quantityInput.parentNode.replaceChild(newQuantityInput, quantityInput);
        rateInput.parentNode.replaceChild(newRateInput, rateInput);
        
        const calculateTotal = () => {
            const quantity = parseFloat(newQuantityInput.value.replace(/,/g, '')) || 0;
            const rate = parseFloat(newRateInput.value.replace(/,/g, '')) || 0;
            const total = quantity * rate;
            
            if (total > 0) {
                totalInput.value = total.toLocaleString('en-US');
                totalInput.dataset.rawValue = total;
            } else {
                totalInput.value = '0';
                totalInput.dataset.rawValue = 0;
            }
        };
        
        ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
            newQuantityInput.addEventListener(eventType, calculateTotal);
            newRateInput.addEventListener(eventType, calculateTotal);
        });
        
        // If editing, load item data
        if (itemId) {
            this.loadItemForEdit(itemId);
        }
        
        modal.style.display = 'block';
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('itemFormDescriptions').focus();
        }, 100);
    }

    async editItem(itemId) {
        this.openItemModal(itemId);
    }
    
    async saveItem() {
        try {
            const invoiceNo = document.getElementById('itemFormInvoiceNo').value.trim();
            const descriptions = document.getElementById('itemFormDescriptions').value.trim();
            const quantity = parseFloat(document.getElementById('itemFormQuantity').value) || 0;
            const rate = parseFloat(document.getElementById('itemFormRate').value) || 0;
            const vehicleNo = document.getElementById('itemFormVehicleNo').value.trim();
            const quality = document.getElementById('itemFormQuality').value.trim();
            const category = document.getElementById('itemFormCategory').value.trim();
            const totalAmount = parseFloat(document.getElementById('itemFormTotalAmount').dataset.rawValue) || (quantity * rate);
            const date = document.getElementById('itemFormDate').value;

            if (!invoiceNo || !descriptions || !quantity || !rate || !category) {
                this.showToast('Please fill in all required fields (Invoice No, Descriptions, Quantity, Rate, and Category)', 'warning');
                return;
            }

            if (!db) {
                this.showToast('Database not available. Please restart the application.', 'error');
                return;
            }

            // Prepare item data for inventory
            const itemData = {
                name: descriptions,
                sku: null,
                category: category,
                stock: quantity,
                minStock: 0,
                price: rate,
                cost: rate * 0.8, // Estimate cost as 80% of rate
                description: `Invoice: ${invoiceNo}${vehicleNo ? ` | Vehicle: ${vehicleNo}` : ''}${quality ? ` | Quality: ${quality}` : ''} | Date: ${new Date(date).toLocaleDateString()}`,
                brand: null,
                size: null,
                unit: 'Each',
                location: null,
                supplier: null
            };

            console.log('Saving item to inventory:', itemData);

            // Check if item already exists by name
            const existingItems = await db.searchItems(descriptions);
            let existingItem = existingItems.find(item => 
                item.name.toLowerCase() === descriptions.toLowerCase()
            );

            if (existingItem) {
                // Update existing item - add to stock
                const newStock = existingItem.stock + quantity;
                await db.updateItem(existingItem.id, {
                    name: existingItem.name,
                    sku: existingItem.sku,
                    category: category || existingItem.category,
                    stock: newStock,
                    minStock: existingItem.minStock,
                    price: rate, // Update price to latest rate
                    cost: existingItem.cost,
                    description: existingItem.description + ` | Invoice: ${invoiceNo}${quality ? ` | Quality: ${quality}` : ''}`,
                    brand: existingItem.brand,
                    size: existingItem.size,
                    unit: existingItem.unit,
                    location: existingItem.location,
                    supplier: existingItem.supplier
                });
                this.showToast(`Item updated in inventory! Stock increased to ${newStock}`, 'success');
            } else {
                // Add new item to inventory
                const id = await db.addItem(itemData);
                console.log('Item saved to inventory with ID:', id);
                this.showToast('Goods registered successfully and added to inventory!', 'success');
            }

            // Also save as invoice
            const invoiceData = {
                invoiceNumber: invoiceNo,
                date: new Date(date).toISOString(),
                items: [{
                    id: Date.now(),
                    name: descriptions,
                    quantity: quantity,
                    unitPrice: rate,
                    total: totalAmount,
                    vehicleNumber: vehicleNo || null,
                    quality: quality || null,
                    category: category
                }],
                subtotal: totalAmount,
                tax: 0,
                total: totalAmount,
                createdAt: new Date().toISOString()
            };

            await db.addInvoice(invoiceData);
            console.log('Invoice also saved');

            this.closeModals();
            
            // Reload all relevant data in parallel
            await Promise.all([
                this.loadInventory(),  // Refresh inventory with new/updated items
                this.loadDashboard(), // Refresh dashboard stats
                this.loadAlerts()     // Check for new alerts
            ]);
            
            // Load invoices if on that tab
            if (this.currentTab === 'invoices') {
                await this.loadInvoices();
            }
        } catch (error) {
            console.error('Error saving item:', error);
            this.showToast(`Error saving item: ${error.message}`, 'error');
        }
    }
    
    async loadItemForEdit(itemId) {
        try {
            const item = await db.getItem(itemId);
            if (item) {
                // Load into the new Goods Registration Form
                document.getElementById('itemFormDescriptions').value = item.name || '';
                document.getElementById('itemFormQuantity').value = item.stock || 0;
                document.getElementById('itemFormRate').value = item.price || 0;
                document.getElementById('itemFormCategory').value = item.category || '';
                
                // Calculate total
                const quantity = parseFloat(item.stock) || 0;
                const rate = parseFloat(item.price) || 0;
                const total = quantity * rate;
                const totalInput = document.getElementById('itemFormTotalAmount');
                totalInput.value = total.toLocaleString('en-US');
                totalInput.dataset.rawValue = total;
                
                // Extract quality and vehicle from description if available
                if (item.description) {
                    const qualityMatch = item.description.match(/Quality:\s*([^\|]+)/i);
                    if (qualityMatch) {
                        document.getElementById('itemFormQuality').value = qualityMatch[1].trim();
                    }
                    const vehicleMatch = item.description.match(/Vehicle:\s*([^\|]+)/i);
                    if (vehicleMatch) {
                        document.getElementById('itemFormVehicleNo').value = vehicleMatch[1].trim();
                    }
                    const invoiceMatch = item.description.match(/Invoice:\s*([^\|]+)/i);
                    if (invoiceMatch) {
                        document.getElementById('itemFormInvoiceNo').value = invoiceMatch[1].trim();
                    }
                }
                
                // Trigger total calculation
                const quantityInput = document.getElementById('itemFormQuantity');
                const rateInput = document.getElementById('itemFormRate');
                quantityInput.dispatchEvent(new Event('input'));
                rateInput.dispatchEvent(new Event('input'));
            }
        } catch (error) {
            console.error('Error loading item for edit:', error);
            this.showToast('Error loading item', 'error');
        }
    }

    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            try {
                await db.deleteItem(itemId);
                this.showToast('Item deleted successfully!', 'success');
                
                // Reload all relevant data
                await Promise.all([
                    this.loadInventory(),
                    this.loadDashboard(),
                    this.loadAlerts()  // Refresh alerts as item is deleted
                ]);
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
        if (!tbody) {
            console.error('Sales table body not found');
            return;
        }
        
        if (!sales || sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data" style="text-align: center; padding: 2rem; color: #6b7280;">No sales recorded yet. Click "New Sale" to make your first sale.</td></tr>';
            return;
        }

        // Sort sales by date (newest first)
        const sortedSales = [...sales].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });

        tbody.innerHTML = sortedSales.map(sale => {
            const saleDate = new Date(sale.date);
            const formattedDate = saleDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            return `
            <tr>
                <td>${formattedDate}</td>
                <td>
                    <strong>${sale.itemName || 'Unknown Item'}</strong>
                    <br><small style="color: #6b7280;">Unit Price: UGX ${(sale.unitPrice || 0).toLocaleString()}</small>
                </td>
                <td>${sale.quantity || 0}</td>
                <td><strong>UGX ${(sale.total || 0).toLocaleString()}</strong></td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.viewSaleDetails(${sale.id})" title="View Sale Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
        
        console.log(`Displayed ${sortedSales.length} sales in the table`);
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
            console.log('=== openSaleModal() called ===');
            
            // Show modal first, even if there are errors
            const modal = document.getElementById('saleModal');
            if (!modal) {
                console.error('Sale modal element not found');
                this.showToast('Sale modal not found. Please refresh the page.', 'error');
                return;
            }
            
            // Show modal immediately with high z-index
            modal.style.display = 'block';
            modal.style.zIndex = '10000';
            console.log('Sale modal displayed with z-index:', modal.style.zIndex);
            
            // Check if database is available
            if (!db) {
                console.error('Database not initialized');
                this.showToast('Database not available. Please restart the application.', 'error');
                return;
            }
            
            // Get all items from inventory
            console.log('Fetching items from inventory...');
            let items = [];
            try {
                items = await db.getAllItems();
                console.log('Items retrieved:', items.length);
            } catch (dbError) {
                console.error('Error fetching items:', dbError);
                this.showToast('Error loading items from inventory', 'error');
                return;
            }
            
            const select = document.getElementById('saleItem');
            if (!select) {
                console.error('Sale item select element not found');
                this.showToast('Sale form not found. Please refresh the page.', 'error');
                return;
            }
            
            // Clear and reset dropdown
            select.innerHTML = '<option value="">Choose an item from inventory...</option>';
            
            // Filter items that have stock > 0 and sort by name
            const availableItems = items
                .filter(item => {
                    const stock = parseFloat(item.stock) || 0;
                    return stock > 0;
                })
                .sort((a, b) => a.name.localeCompare(b.name));
            
            console.log('Available items with stock:', availableItems.length);
            
            if (availableItems.length === 0) {
                if (items.length === 0) {
                    this.showToast('No items in inventory. Please add items first using "Add New Invoice" in the Materials tab.', 'warning');
                    select.innerHTML = '<option value="">No items in inventory - Add items first</option>';
                } else {
                    this.showToast('No items with available stock. All items are out of stock.', 'warning');
                    select.innerHTML = '<option value="">No items with stock available</option>';
                }
                // Disable form fields if no items
                document.getElementById('saleQuantity').disabled = true;
                document.getElementById('salePrice').value = '';
                document.getElementById('saleTotal').value = '';
                return;
            }
            
            // Enable form fields
            document.getElementById('saleQuantity').disabled = false;
            
            // Populate dropdown with available items
            availableItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                const stock = parseFloat(item.stock) || 0;
                const price = parseFloat(item.price) || 0;
                option.textContent = `${item.name}${item.category ? ` (${item.category})` : ''} - Stock: ${stock} - Price: UGX ${price.toLocaleString()}`;
                option.dataset.price = price;
                option.dataset.stock = stock;
                select.appendChild(option);
            });
            
            console.log('Items added to dropdown:', availableItems.length);
            
            // Reset form fields
            document.getElementById('saleQuantity').value = '';
            document.getElementById('saleQuantity').removeAttribute('data-max-stock');
            document.getElementById('saleQuantity').max = '';
            document.getElementById('saleQuantity').placeholder = 'Enter quantity';
            document.getElementById('salePrice').value = '';
            document.getElementById('saleTotal').value = '';
            
            // Focus on item selection
            select.focus();
        } catch (error) {
            console.error('Error opening sale modal:', error);
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            this.showToast(`Error opening sale modal: ${error.message}`, 'error');
            // Still try to show modal
            const modal = document.getElementById('saleModal');
            if (modal) {
                modal.style.display = 'block';
            }
        }
    }

    updateSalePrice() {
        const selectedOption = document.getElementById('saleItem').selectedOptions[0];
        if (selectedOption) {
            const price = parseFloat(selectedOption.dataset.price) || 0;
            const stock = parseFloat(selectedOption.dataset.stock) || 0;
            document.getElementById('salePrice').value = price;
            
            // Set max quantity to available stock
            const quantityInput = document.getElementById('saleQuantity');
            quantityInput.max = stock;
            quantityInput.setAttribute('data-max-stock', stock);
            
            // Show stock info
            if (stock > 0) {
                quantityInput.placeholder = `Max: ${stock}`;
            } else {
                quantityInput.placeholder = 'Out of stock';
            }
            
            this.updateSaleTotal();
        }
    }

    updateSaleTotal() {
        const quantity = parseFloat(document.getElementById('saleQuantity').value) || 0;
        const price = parseFloat(document.getElementById('salePrice').value) || 0;
        const total = quantity * price;
        const totalInput = document.getElementById('saleTotal');
        totalInput.value = total > 0 ? total.toLocaleString() : '';
        
        // Check stock availability
        const quantityInput = document.getElementById('saleQuantity');
        const maxStock = parseFloat(quantityInput.getAttribute('data-max-stock')) || 0;
        
        if (quantity > maxStock) {
            totalInput.style.borderColor = '#ef4444';
            this.showToast(`Only ${maxStock} items available in stock`, 'warning');
        } else {
            totalInput.style.borderColor = '';
        }
    }

    async processSale() {
        try {
            const itemId = parseInt(document.getElementById('saleItem').value);
            const quantity = parseFloat(document.getElementById('saleQuantity').value);
            const unitPrice = parseFloat(document.getElementById('salePrice').value);
            const totalStr = document.getElementById('saleTotal').value.replace(/,/g, '');
            const total = parseFloat(totalStr);

            if (!itemId) {
                this.showToast('Please select an item from inventory', 'warning');
                document.getElementById('saleItem').focus();
                return;
            }

            if (!quantity || quantity <= 0) {
                this.showToast('Please enter a valid quantity', 'warning');
                document.getElementById('saleQuantity').focus();
                return;
            }

            // Get current item from inventory to check stock
            const item = await db.getItem(itemId);
            if (!item) {
                this.showToast('Item not found in inventory', 'error');
                return;
            }

            // Double-check stock availability before processing
            if (item.stock < quantity) {
                this.showToast(`Insufficient stock. Only ${item.stock} items available in inventory`, 'error');
                // Refresh the sale modal to update stock info
                await this.openSaleModal();
                return;
            }

            // Prepare sale data with ISO string date
            const saleData = {
                itemId: itemId,
                itemName: item.name,
                quantity: quantity,
                unitPrice: unitPrice,
                total: total || (quantity * unitPrice),
                date: new Date().toISOString()
            };

            console.log('Processing sale:', saleData);
            console.log('Current stock before sale:', item.stock);

            // Process the sale - this will automatically reduce inventory stock in database.js
            await db.addSale(saleData);
            
            // Get updated item to confirm stock reduction
            const updatedItem = await db.getItem(itemId);
            console.log('Stock after sale:', updatedItem.stock);
            
            const newStock = updatedItem.stock;
            this.showToast(`Sale completed! ${quantity} ${item.name} sold. Stock reduced from ${item.stock} to ${newStock}.`, 'success');
            
            // Close modal and refresh all data
            this.closeModals();
            
            // Refresh all relevant data
            await Promise.all([
                this.loadInventory(),  // Refresh inventory to show updated stock
                this.loadSales(),     // Refresh sales list
                this.loadDashboard(), // Refresh dashboard stats
                this.loadAlerts()     // Refresh alerts (may have new low stock alerts)
            ]);
            
            // If on Materials tab, ensure it's refreshed
            if (this.currentTab === 'inventory') {
                await this.loadInventory();
            }
        } catch (error) {
            console.error('Error processing sale:', error);
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            
            if (error.message.includes('Insufficient stock')) {
                this.showToast('Insufficient stock in inventory. Please check available quantity.', 'error');
                // Refresh sale modal to show current stock
                await this.openSaleModal();
            } else {
                this.showToast(`Error processing sale: ${error.message}`, 'error');
            }
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
                            
                            // Reload all data after import
                            await Promise.all([
                                this.loadDashboard(),
                                this.loadInventory(),
                                this.loadSales(),
                                this.loadInvoices(),
                                this.loadAlerts()
                            ]);
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
                            
                            // Reload all data after import
                            await Promise.all([
                                this.loadDashboard(),
                                this.loadInventory(),
                                this.loadSales(),
                                this.loadInvoices(),
                                this.loadAlerts()
                            ]);
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

    // Add invoice items to inventory
    async addInvoiceItemsToInventory(invoiceItems, invoiceDate) {
        try {
            for (const invoiceItem of invoiceItems) {
                // Check if item already exists in inventory by name
                const existingItems = await db.searchItems(invoiceItem.name);
                let existingItem = existingItems.find(item => 
                    item.name.toLowerCase() === invoiceItem.name.toLowerCase()
                );
                
                if (existingItem) {
                    // Update existing item - add to stock
                    const newStock = existingItem.stock + invoiceItem.quantity;
                    await db.updateItem(existingItem.id, {
                        name: existingItem.name,
                        sku: existingItem.sku,
                        category: invoiceItem.category || existingItem.category, // Use category from invoice
                        stock: newStock,
                        minStock: existingItem.minStock,
                        price: invoiceItem.unitPrice, // Update price to latest from invoice
                        cost: existingItem.cost,
                        description: existingItem.description + (invoiceItem.quality ? ` | Quality: ${invoiceItem.quality}` : ''),
                        brand: existingItem.brand,
                        size: existingItem.size,
                        unit: existingItem.unit,
                        location: existingItem.location,
                        supplier: existingItem.supplier
                    });
                    console.log(`Updated inventory item: ${invoiceItem.name}, new stock: ${newStock}`);
                } else {
                    // Create new inventory item from invoice item
                    const newItem = {
                        name: invoiceItem.name,
                        sku: null,
                        category: invoiceItem.category || 'Other', // Use category from invoice
                        stock: invoiceItem.quantity,
                        minStock: 0,
                        price: invoiceItem.unitPrice,
                        cost: invoiceItem.unitPrice * 0.8, // Estimate cost as 80% of price
                        description: `Added from invoice on ${invoiceDate.toLocaleDateString()}${invoiceItem.quality ? ` | Quality: ${invoiceItem.quality}` : ''}${invoiceItem.vehicleNumber ? ` | Vehicle: ${invoiceItem.vehicleNumber}` : ''}`,
                        brand: null,
                        size: null,
                        unit: 'Each',
                        location: null,
                        supplier: null
                    };
                    
                    const itemId = await db.addItem(newItem);
                    console.log(`Added new inventory item: ${invoiceItem.name} with ID: ${itemId}`);
                }
            }
        } catch (error) {
            console.error('Error adding invoice items to inventory:', error);
            throw new Error(`Failed to add items to inventory: ${error.message}`);
        }
    }
    
    // Load and display invoices
    async loadInvoices() {
        try {
            const invoices = await db.getAllInvoices();
            this.displayInvoices(invoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
            this.showToast('Error loading invoices', 'error');
        }
    }
    
    displayInvoices(invoices) {
        const tbody = document.getElementById('invoicesTableBody');
        if (!tbody) {
            console.error('Invoices table body not found');
            return;
        }
        
        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No invoices found</td></tr>';
            return;
        }

        tbody.innerHTML = invoices.map(invoice => {
            const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
            return `
            <tr style="cursor: pointer;" ondblclick="app.viewInvoiceDetails(${invoice.id})" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor=''">
                <td><strong>${invoice.invoiceNumber}</strong></td>
                <td>${new Date(invoice.date).toLocaleDateString()}</td>
                <td>${items ? items.length : 0} items</td>
                <td>UGX ${invoice.subtotal.toLocaleString()}</td>
                <td>UGX ${invoice.tax.toLocaleString()}</td>
                <td><strong>UGX ${invoice.total.toLocaleString()}</strong></td>
                <td class="actions">
                    <button class="btn btn-sm btn-primary" onclick="app.viewInvoiceDetails(${invoice.id})" title="View Invoice">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); app.deleteInvoice(${invoice.id})" title="Delete Invoice">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    }
    
    async viewInvoiceDetails(invoiceId) {
        try {
            const invoice = await db.getInvoice(invoiceId);
            if (!invoice) {
                this.showToast('Invoice not found', 'error');
                return;
            }
            
            // Parse items if it's a string
            const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
            
            // Create detailed invoice form view
            let itemsHtml = '';
            if (items && items.length > 0) {
                itemsHtml = items.map((item, index) => `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.name || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${item.quantity || 0}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">UGX ${(item.unitPrice || 0).toLocaleString()}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.quality || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.category || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;"><strong>UGX ${(item.total || 0).toLocaleString()}</strong></td>
                    </tr>
                `).join('');
            }
            
            const invoiceDate = new Date(invoice.date);
            const formattedDate = invoiceDate.toLocaleDateString();
            
            const invoiceDetails = `
                <div style="padding: 20px;">
                    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">INVOICE DETAILS</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <p style="margin: 5px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                                <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${formattedDate}</p>
                            </div>
                            <div>
                                <p style="margin: 5px 0; font-size: 14px;"><strong>Items Count:</strong> ${items ? items.length : 0}</p>
                                <p style="margin: 5px 0; font-size: 14px;"><strong>Created:</strong> ${new Date(invoice.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 0; color: #1e40af;">Items List</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border: 1px solid #e5e7eb;">
                            <thead>
                                <tr style="background-color: #f3f4f6;">
                                    <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">#</th>
                                    <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Descriptions</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Quantity</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Rate</th>
                                    <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Quality</th>
                                    <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Category</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml || '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #6b7280;">No items</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="font-size: 1.1em; font-weight: 500;">Subtotal:</span>
                            <span style="font-size: 1.1em; font-weight: 600;">UGX ${invoice.subtotal.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="font-size: 1.1em; font-weight: 500;">Tax (0%):</span>
                            <span style="font-size: 1.1em; font-weight: 600;">UGX ${invoice.tax.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #e5e7eb; margin-top: 15px;">
                            <span style="font-size: 1.3em; font-weight: 700; color: #1e40af;">Grand Total:</span>
                            <span style="font-size: 1.3em; font-weight: 700; color: #059669;">UGX ${invoice.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Create a modal to show invoice details
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.id = 'invoiceDetailsModal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
                        <h3 style="margin: 0; color: #1e40af;">Invoice: ${invoice.invoiceNumber}</h3>
                        <button class="modal-close" onclick="document.getElementById('invoiceDetailsModal').remove()" style="background: #ef4444; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center;">&times;</button>
                    </div>
                    ${invoiceDetails}
                    <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="document.getElementById('invoiceDetailsModal').remove()" style="padding: 10px 25px; border-radius: 6px; background: #6b7280; color: white; border: none; cursor: pointer; font-weight: 500;">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Close on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        } catch (error) {
            console.error('Error viewing invoice:', error);
            this.showToast('Error loading invoice details', 'error');
        }
    }
    
    async viewInvoice(invoiceId) {
        // Alias for backward compatibility
        await this.viewInvoiceDetails(invoiceId);
    }
    
    async deleteInvoice(invoiceId) {
        if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            try {
                await db.deleteInvoice(invoiceId);
                this.showToast('Invoice deleted successfully!', 'success');
                await this.loadInvoices();
                await this.loadDashboard();
            } catch (error) {
                console.error('Error deleting invoice:', error);
                this.showToast('Error deleting invoice', 'error');
            }
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

