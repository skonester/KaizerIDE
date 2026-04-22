# Building KaizerIDE

## Prerequisites
- Node.js installed
- All dependencies installed (`npm install`)

## Build Commands

### Build for Windows (64-bit)
```bash
npm run build:win
```
This creates a 64-bit Windows installer in the `release` folder.

### Build for Windows (32-bit)
```bash
npm run build:win32
```
This creates a 32-bit Windows installer.

### Build for Both Architectures
```bash
npm run build:all
```
This creates both 32-bit and 64-bit installers.

## Output

After building, you'll find:
- **Installer**: `release/KaizerIDE Setup X.X.X.exe` - Full installer with NSIS
- **Unpacked**: `release/win-unpacked/` - Portable version (no install needed)

## Installation Options

The installer will:
- Allow you to choose installation directory
- Create desktop shortcut
- Create start menu shortcut
- Support uninstallation via Windows Settings

## Icon

To add a custom icon:
1. Create or download a `.ico` file (256x256 recommended)
2. Save it as `build/icon.ico`
3. Rebuild the app

## Troubleshooting

If build fails:
1. Delete `node_modules` and `dist` folders
2. Run `npm install` again
3. Run `npm run build:win` again

## File Size

The final installer will be approximately 150-200 MB due to:
- Electron runtime
- Chromium engine
- Node.js runtime
- Your app code
