import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { fork } from "child_process";

let electronWindow = null;
let startTimestamp = null;
let backendProcess = null;

function startBackendServer() {
    const backendServerPath = path.join(import.meta.dirname, "../backend/server.js");
    if (fs.existsSync(backendServerPath)) {
        try {
            backendProcess = fork(backendServerPath, [], {
                stdio: 'inherit',
                env: { ...process.env, PORT: process.env.PORT || '3000' }
            });
            backendProcess.on('error', (err) => {
                console.warn('Backend process notice:', err.message);
            });
        } catch (e) {
            console.warn('Could not auto-start backend server:', e.message);
        }
    }
}

function stopBackendServer() {
    if (backendProcess && !backendProcess.killed) {
        try {
            backendProcess.kill();
        } catch (e) {
            console.warn('Error stopping backend process:', e.message);
        }
    }
}

function createWindow() {
    electronWindow = new BrowserWindow({
        height: 1000,
        width: 1000,
        webPreferences: {
            devTools: true,
            preload: path.join(import.meta.dirname, 'preload.js')
        }
    });

    electronWindow.loadURL('http://localhost:5173');
}

//feature : Screen Preview Capture
async function takeScreenShot() {
    const sources = await desktopCapturer.getSources({ types: ['window'],
       thumbnailSize: { width: 800, height: 600 } }); 

     if (!sources.length) return ;
     const primaryScreen= sources[0];
     const pngBuffer = primaryScreen.thumbnailSize.toPNG();
     const filePath=path.joinn(SCREEN_SNAP_DIR, `screen-${Date.now()}.png`);
     fs.writeFileSync(filePath, pngBuffer);
    }
    










ipcMain.handle('start-timer', () => {
    startTimestamp = Date.now();

    // Send Timer Tick every 1s
    setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('timer', (Date.now() - startTimestamp) / 1000);
        }
    }, 1000);

    // Capture user's camera snap every 5s
    setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('camera-shot');
        }
    }, 5000);
});

ipcMain.handle('store-camera-snap-image-on-disk', (_event, data) => {
    const snapDir = path.join(import.meta.dirname, "user-camera-snap");
    if (!fs.existsSync(snapDir)) {
        fs.mkdirSync(snapDir, { recursive: true });
    }
    const filePath = path.join(snapDir, `${Date.now()}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));
});

ipcMain.on("show-rules", () => {
    if (electronWindow && !electronWindow.isDestroyed()) {
        dialog.showMessageBox(electronWindow, {
            type: "info",
            title: "Athena Exam Rules",
            message: "Exam Rules",
            detail:
                "1. Stay on the exam screen.\n" +
                "2. Camera must remain enabled.\n" +
                "3. Do not leave the exam.\n" +
                "4. Do not use external assistance.\n" +
                "5. Click Exit Exam when finished."
        });
    }
});

app.whenReady().then(() => {
    startBackendServer();
    createWindow();
});

app.on("will-quit", () => {
    stopBackendServer();
});

app.on("window-all-closed", () => {
    stopBackendServer();
    if (process.platform !== "darwin") {
        app.quit();
    }
});

