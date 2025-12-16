@echo off
echo Building WilsonPlus Desktop Application...
echo.
echo Installing dependencies...
npm install
echo.
echo Building Windows executable...
echo This may take a few minutes...
echo.
npm run build-win
echo.
echo Build complete! Check the 'dist' folder for the installer.
echo.
pause

