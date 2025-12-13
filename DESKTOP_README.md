# WilsonPlus Desktop Application

## 🖥️ Windows Desktop Version - Building Materials & Paints

WilsonPlus is now available as a native Windows desktop application specifically designed for building materials and paints inventory management! This version provides comprehensive functionality for construction businesses, paint stores, and building material suppliers.

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

## 🎯 Desktop Features

### ✅ Native Windows Integration
- **Desktop Shortcuts**: Install with desktop shortcut
- **Start Menu**: Appears in Windows Start Menu
- **File Associations**: Native file dialogs for import/export
- **System Tray**: Minimize to system tray (future feature)
- **Windows Notifications**: Native Windows notifications

### ✅ Enhanced User Experience
- **Keyboard Shortcuts**: Full keyboard navigation
- **Menu Bar**: Traditional Windows menu bar
- **Native Dialogs**: Windows-style file dialogs
- **Window Management**: Standard Windows window controls
- **Auto-updates**: Automatic app updates (future feature)

### ✅ Building Materials & Paints Features
- **Specialized Categories**: Lumber, Paints, Coatings, Concrete, Roofing, etc.
- **Detailed Specifications**: Brand, model, color, size, dimensions
- **Unit Management**: Linear feet, square feet, gallons, pounds, etc.
- **Location Tracking**: Warehouse, aisle, shelf organization
- **Complete inventory management** for construction materials and paints
- **Sales tracking** with automatic stock deduction
- **Low stock alerts** for critical materials
- **Data export/import** for backup and migration
- **Offline functionality** for job sites
- **Dashboard analytics** for business insights

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Material |
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
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── index.html           # App UI
├── app.js              # App logic
├── database.js         # Database layer
├── styles.css          # Styling
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
├── package.json        # Dependencies & build config
├── start.bat           # Windows startup script
├── build.bat           # Windows build script
└── assets/             # App icons and resources
```

## 🔧 Technical Details

### Electron Configuration
- **Main Process**: `main.js` - Handles app lifecycle and native APIs
- **Renderer Process**: Web app running in Chromium
- **Preload Script**: `preload.js` - Secure communication bridge
- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled for security

### Build Configuration
- **Target**: Windows x64
- **Installer**: NSIS installer with custom options
- **Portable**: Single executable file
- **Auto-updater**: Ready for future implementation

### Security Features
- Context isolation enabled
- Node integration disabled
- Secure IPC communication
- No remote module access
- Sandboxed renderer process

## 🎨 Customization

### App Icon
Replace `assets/icon.png` with your custom icon:
- Size: 512x512 pixels
- Format: PNG
- The build process will generate all required sizes

### Window Settings
Modify `main.js` to customize:
- Window size and minimum size
- Window title
- Menu structure
- Keyboard shortcuts

### Build Settings
Edit `package.json` build section to:
- Change app ID
- Modify installer options
- Add custom build scripts
- Configure auto-updater

## 🐛 Troubleshooting

### App Won't Start
1. Ensure Node.js is installed
2. Run `npm install` to install dependencies
3. Check console for error messages
4. Try running `npm run dev` for debug mode

### Build Fails
1. Ensure all dependencies are installed
2. Check Windows Defender isn't blocking
3. Run as administrator if needed
4. Clear `node_modules` and reinstall

### Import/Export Issues
1. Check file permissions
2. Ensure file isn't open in another app
3. Verify JSON file format
4. Try running as administrator

## 📊 Performance

### System Requirements
- **OS**: Windows 10 or later
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100MB for app, additional for data
- **CPU**: Any modern x64 processor

### Performance Optimizations
- Lazy loading of data
- Efficient IndexedDB operations
- Minimal memory footprint
- Fast startup time

## 🔄 Updates

### Manual Updates
1. Download new version
2. Run installer over existing installation
3. Data is preserved automatically

### Future Auto-Updates
- Built-in auto-updater ready
- Background download and install
- User notification system
- Rollback capability

## 📞 Support

### Getting Help
1. Check this README first
2. Look at console errors in dev mode
3. Check Windows Event Viewer
4. Contact support with error details

### Reporting Issues
Include:
- Windows version
- App version
- Error messages
- Steps to reproduce
- Console output (if available)


Enjoy managing your business inventory with WilsonPlus Desktop! 🏪💻
