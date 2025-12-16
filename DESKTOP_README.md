# WilsonPlus Desktop Application

## 🖥️ Windows Desktop Version - Building Materials & Paints Inventory Management

WilsonPlus is a comprehensive native Windows desktop application designed for building materials and paints inventory management! This version provides complete functionality for construction businesses, paint stores, and building material suppliers with offline capabilities and professional features.

## 🚀 Quick Start

### Option 1: Run from Source
1. **Double-click `start.bat`** - This will install dependencies and launch the app
2. The desktop application will open in a new window
3. Start managing your inventory immediately!

### Option 2: Build Windows Installer
1. **Double-click `build.bat`** - This will create a Windows installer
2. Check the `dist` folder for the installer file
3. Run the installer to install WilsonPlus on your system

## 📦 Installation Methods

### Method 1: Portable Version
- Run `npm run build-win-portable`
- Get `WilsonPlus-Portable.exe` in the `dist` folder
- No installation required - just run the executable

### Method 2: Full Installer
- Run `npm run build-win`
- Get `WilsonPlus Setup.exe` in the `dist` folder
- Install with desktop and start menu shortcuts

## 🎯 Core Features

### ✅ Dashboard
- **Real-time Statistics**: Total items, low stock alerts, inventory value, today's sales
- **Recent Sales**: View today's sales at a glance
- **Low Stock Alerts**: Quick overview of items needing attention
- **Visual Analytics**: Comprehensive business insights

### ✅ Materials (Inventory Management)
- **Goods Registration Form**: Professional invoice-style form for adding new materials
  - Invoice number tracking
  - Vehicle number recording
  - Quality and category management (editable dropdowns)
  - Quantity, rate, and total amount calculation
  - Date selection (system date or manual entry)
  - Automatic inventory item creation
- **Inventory Display**: View all materials with:
  - Date, Invoice No, Quantity, Rate, Quality, Category
  - Search functionality
  - Edit and delete capabilities
- **Stock Management**: Automatic stock tracking and updates

### ✅ Sales Management
- **New Sale**: Create sales directly from inventory items
  - Select items from available inventory
  - Automatic price and stock display
  - Real-time total calculation
  - Stock validation (prevents overselling)
- **Sales Records**: View all sales with:
  - Date, Items, Quantity, Total
  - Date range filtering
  - Detailed sale information
- **Automatic Stock Reduction**: Inventory stock automatically decreases when sales are made
- **Low Stock Alerts**: Automatic alerts when items run low

### ✅ Invoices/Receipts
- **Invoice Management**: Complete invoice tracking system
  - View all invoices with details
  - Double-click to view full invoice details
  - Invoice number, date, items, subtotal, tax, total
  - Multiple items per invoice support
- **Invoice Details**: View complete invoice information including:
  - All items in the invoice
  - Individual item details
  - Total calculations
  - Invoice metadata

### ✅ Alerts
- **Low Stock Alerts**: Automatic notifications for items below minimum stock
- **Alert Management**: Mark alerts as read, view all alerts
- **Real-time Updates**: Alerts update automatically as stock changes

## 🔄 Complete Data Flow

### Invoice → Inventory → Sales
1. **Add New Invoice**: Use "Add New Invoice" button in Materials tab
   - Fill out Goods Registration Form
   - Items are automatically added to inventory
   - Invoice is saved to the system
2. **View Inventory**: All items from invoices appear in Materials tab
   - Stock levels are tracked
   - Items can be searched and managed
3. **Make Sales**: Use "New Sale" button in Sales tab
   - Select items from inventory
   - Stock automatically reduces
   - Sales are recorded
4. **View Sales**: All sales appear in Sales tab
   - Filter by date range
   - View detailed sale information

## 🎯 Desktop Features

### ✅ Native Windows Integration
- **Desktop Shortcuts**: Install with desktop shortcut
- **Start Menu**: Appears in Windows Start Menu
- **File Associations**: Native file dialogs for import/export
- **Windows Notifications**: Native Windows notifications
- **Secure IPC**: Secure inter-process communication

### ✅ Enhanced User Experience
- **Keyboard Shortcuts**: Full keyboard navigation
- **Menu Bar**: Traditional Windows menu bar
- **Native Dialogs**: Windows-style file dialogs
- **Window Management**: Standard Windows window controls
- **Responsive Design**: Modern, clean interface

### ✅ Database Technology
- **SQLite Database**: Using sql.js (pure JavaScript SQLite)
- **No Native Dependencies**: Works on any Windows system
- **Offline First**: All data stored locally
- **Data Persistence**: Automatic saving to local database file
- **Export/Import**: Full data backup and restore capabilities

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Invoice (Goods Registration) |
| `Ctrl+Shift+N` | New Sale |
| `Ctrl+E` | Export Data |
| `Ctrl+I` | Import Data |
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Materials |
| `Ctrl+3` | Sales |
| `Ctrl+4` | Alerts |
| `Ctrl+Q` | Exit Application |

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Run with developer tools
npm run dev

# Build Windows installer
npm run build-win

# Build portable version
npm run build-win-portable

# Build all platforms
npm run build
```

## 📁 File Structure

```
WilsonPlus/
├── main.js              # Electron main process & IPC handlers
├── preload.js           # Secure IPC bridge
├── database.js          # SQLite database layer (sql.js)
├── database-client.js   # Database client wrapper
├── index.html           # App UI structure
├── app.js              # Main application logic
├── styles.css          # Application styling
├── package.json        # Dependencies & build config
├── start.bat           # Windows startup script
├── build.bat           # Windows build script
└── assets/             # App icons and resources
```

## 🔧 Technical Details

### Electron Configuration
- **Main Process**: `main.js` - Handles app lifecycle, database initialization, and native APIs
- **Renderer Process**: Web app running in Chromium
- **Preload Script**: `preload.js` - Secure communication bridge
- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled for security

### Database Architecture
- **Technology**: SQLite using sql.js (pure JavaScript)
- **Location**: User data directory (Windows AppData)
- **Tables**: items, sales, invoices, alerts
- **Features**: 
  - Automatic schema creation
  - Transaction support
  - Data persistence
  - Export/Import functionality

### Build Configuration
- **Target**: Windows x64
- **Installer**: NSIS installer with custom options
- **Portable**: Single executable file
- **Dependencies**: sql.js (no native compilation required)

### Security Features
- Context isolation enabled
- Node integration disabled
- Secure IPC communication
- No remote module access
- Sandboxed renderer process
- Local data storage only

## 📊 Key Functionality

### Goods Registration Form
- Professional invoice-style interface
- Fields: Invoice No, Vehicle No, Descriptions, Quantity, Rate, Quality, Category, Total Amount
- Date selection with system date option
- Automatic total calculation
- Editable quality and category dropdowns (custom values supported)
- Items automatically added to inventory upon save

### Inventory Management
- View all materials from invoices
- Display: Date, Invoice No, Quantity, Rate, Quality, Category
- Search functionality
- Edit and delete items
- Stock tracking

### Sales Processing
- Select items from inventory dropdown
- Automatic price and stock display
- Real-time total calculation
- Stock validation
- Automatic inventory reduction
- Low stock alert generation

### Invoice Management
- Multiple items per invoice
- Automatic invoice numbering
- Complete invoice details view
- Invoice deletion
- Invoice-to-inventory integration

## 🐛 Troubleshooting

### App Won't Start
1. Ensure Node.js is installed (v16 or later)
2. Run `npm install` to install dependencies
3. Check console for error messages (F12 in app)
4. Try running `npm run dev` for debug mode
5. Verify database file permissions

### Database Issues
1. Database file location: `%APPDATA%\WilsonPlus\wilsonplus.db`
2. Check file permissions
3. Verify sql.js is properly installed
4. Try deleting database file to reset (backup first!)

### Button Not Working
1. Check browser console (F12) for errors
2. Verify JavaScript is enabled
3. Try refreshing the page (Ctrl+R)
4. Check if modal elements exist in HTML

### Import/Export Issues
1. Check file permissions
2. Ensure file isn't open in another app
3. Verify JSON file format
4. Try running as administrator
5. Check file path length (Windows limit)

### Sales Not Reducing Stock
1. Verify items have stock > 0
2. Check database connection
3. Review console for errors
4. Ensure `addSale` function is called correctly

## 📊 Performance

### System Requirements
- **OS**: Windows 10 or later
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100MB for app, additional for data
- **CPU**: Any modern x64 processor
- **Node.js**: v16 or later (for development)

### Performance Optimizations
- Efficient SQLite queries
- Lazy loading of data
- Minimal memory footprint
- Fast startup time
- Optimized database operations

## 🔄 Data Management

### Export Data
- Export all data to JSON format
- Includes: items, sales, invoices, alerts
- Preserves all relationships
- Timestamp included

### Import Data
- Import from JSON backup
- Replaces all existing data
- Validation included
- Automatic refresh after import

### Database Location
- Windows: `%APPDATA%\WilsonPlus\wilsonplus.db`
- Automatically created on first run
- Backed up with export feature

## 📞 Support

### Getting Help
1. Check this README first
2. Open browser console (F12) for errors
3. Check Windows Event Viewer
4. Review database file for corruption
5. Contact support with error details

### Reporting Issues
Include:
- Windows version
- App version (from package.json)
- Error messages (from console)
- Steps to reproduce
- Console output (F12)
- Database file location

### Common Issues

**"New Sale" button not working:**
- Check console for errors
- Verify items exist in inventory
- Ensure items have stock > 0
- Try refreshing the page

**Items not appearing in inventory:**
- Verify invoice was saved successfully
- Check Materials tab is loaded
- Review console for database errors
- Ensure items have valid data

**Sales not reducing stock:**
- Verify sale was completed successfully
- Check database connection
- Review console for errors
- Ensure stock > 0 before sale

## 🎉 Success!

Your WilsonPlus desktop application is ready! It provides comprehensive inventory management functionality with the convenience and integration of a native Windows application.

**Key Benefits:**
- ✅ No browser required
- ✅ Native Windows integration
- ✅ Offline functionality
- ✅ Professional appearance
- ✅ SQLite database (reliable and fast)
- ✅ Complete invoice management
- ✅ Automatic stock tracking
- ✅ Sales integration
- ✅ Low stock alerts
- ✅ Data export/import
- ✅ Easy installation

**Complete Workflow:**
1. Add invoices using Goods Registration Form
2. Items automatically added to inventory
3. Make sales from inventory items
4. Stock automatically reduces
5. View all data in organized tabs
6. Export/import data as needed

Enjoy managing your business inventory with WilsonPlus Desktop! 🏪💻
