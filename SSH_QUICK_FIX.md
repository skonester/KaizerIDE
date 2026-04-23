# SSH Remote Development - Quick Fix

## Issue
`window.electron.getRemoteFileTree is not a function`

## Cause
The preload.js file was updated to expose the SSH/remote methods, but Electron needs to be restarted for the changes to take effect.

## Solution

**Restart the Electron app:**

1. Close the current KaizerIDE window
2. Stop the dev server (Ctrl+C in terminal)
3. Restart with: `npm run dev` or `.\start-dev.bat`
4. Try connecting to SSH again

## What's Already Implemented

✅ SSH connection handler in electron/main.js
✅ SFTP client initialization
✅ Remote file tree builder
✅ Remote file read/write handlers
✅ Preload.js exposes all remote methods:
   - connectSSH
   - disconnectSSH
   - getSSHStatus
   - getRemoteFileTree
   - readRemoteFile
   - writeRemoteFile

✅ FileExplorer supports remote mode
✅ RemoteConnectionModal with SSH form
✅ Terminal panel has SSH button

## After Restart

1. Click SSH button in terminal panel
2. Enter connection details:
   - Host: 89.168.72.94
   - Port: 22
   - Username: ubuntu
   - Password: (your password)
3. Click Connect
4. After connection, click "Browse Remote"
5. Enter remote path (e.g., `/home/ubuntu`)
6. Browse remote files in the file explorer

## Testing

After restart, open DevTools console and verify:

```javascript
console.log(window.electron.getRemoteFileTree); // Should show function
console.log(window.electron.connectSSH); // Should show function
```

If these show `undefined`, the preload.js changes didn't load properly.
