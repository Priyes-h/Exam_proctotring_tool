import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  desktopCapturer,
  session,} from "electron";
import path from "path";
import fs from "fs";
import { fork } from "child_process";

let electronWindow = null;
let startTimestamp = null;
let timerInterval = null;
let snapshotInterval = null;





const SCREEN_SNAP_DIR = path.join(
  app.getPath("userData"),
  "user-screen-snap"
);
const CAMERA_SNAP_DIR = path.join(app.getPath("userData"), "user-camera-snap");


let backendProcess = null;




function startBackendServer() {
  const backendServerPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "server.js")
    : path.join(import.meta.dirname, "../backend/server.js");

  console.log("Packaged:", app.isPackaged);
  console.log("Backend path:", backendServerPath);
  console.log("Backend exists:", fs.existsSync(backendServerPath));

  if (!fs.existsSync(backendServerPath)) {
    console.error("Backend file not found:", backendServerPath);
    return;
  }

  try {
    backendProcess = fork(backendServerPath, [], {
      stdio: "inherit",
env: {
  ...process.env,
  PORT: process.env.PORT || "3000",
  NODE_ENV: app.isPackaged ? "production" : "development",
  ATHENA_DATA_DIR: path.join(
    app.getPath("userData"),
    "backend-data"
  ),
  GROQ_API_KEY: process.env.GROQ_API_KEY,
},
    });

    backendProcess.on("error", (err) => {
      console.error("Backend startup error:", err);
    });

    backendProcess.on("exit", (code, signal) => {
      console.log("Backend exited:", { code, signal });
      backendProcess = null;
    });
  } catch (error) {
    console.error("Could not start backend:", error);
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

   if (app.isPackaged) {
  electronWindow.loadFile(
    path.join(app.getAppPath(), "dist", "index.html")
  );
} else {
  electronWindow.loadURL("http://localhost:5173");
}
}

//feature : Screen Preview Capture

async function takeScreenShot() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1280, height: 720 }
    });

    if (!sources.length) {
      return { success: false, error: "No screen source found" };
    }

    const pngBuffer = sources[0].thumbnail.toPNG();

    fs.mkdirSync(SCREEN_SNAP_DIR, { recursive: true });

    const filePath = path.join(
      SCREEN_SNAP_DIR,
      `screen-${Date.now()}.png`
    );

    fs.writeFileSync(filePath, pngBuffer);

    return { success: true, filename: path.basename(filePath) };
  } catch (error) {
    console.error("Screen snapshot failed:", error);
    return { success: false, error: error.message };
  }
}


ipcMain.handle("capture-user-screen", async () => {
  const result = await takeScreenShot();

  if (result.success) {
    console.log(
      "Screenshot saved at:",
      path.join(SCREEN_SNAP_DIR, result.filename)
    );
  } else {
    console.error("Screenshot failed:", result.error);
  }

  return result;
});


ipcMain.handle("start-timer", () => {
  if (timerInterval) clearInterval(timerInterval);
  if (snapshotInterval) clearInterval(snapshotInterval);

  startTimestamp = Date.now();

  timerInterval = setInterval(() => {
    if (electronWindow && !electronWindow.isDestroyed()) {
      electronWindow.webContents.send(
        "timer",
        (Date.now() - startTimestamp) / 1000
      );
    }
  }, 1000);

  snapshotInterval = setInterval(() => {
    if (electronWindow && !electronWindow.isDestroyed()) {
      electronWindow.webContents.send("camera-shot");
      electronWindow.webContents.send("screen-shot");
    }
  }, 5000);

  return { success: true };
});



ipcMain.handle("store-camera-snap-image-on-disk", async (_event, data) => {
  try {
const snapDir = path.join(
  app.getPath("userData"),
  "user-camera-snap"
);

    fs.mkdirSync(snapDir, { recursive: true });

    const filePath = path.join(snapDir, `${Date.now()}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));

    return { success: true, filename: path.basename(filePath) };
  } catch (error) {
    console.error("Failed to save camera snapshot:", error);
    return { success: false, error: error.message };
  }
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
  session.defaultSession.setDisplayMediaRequestHandler(
    async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen", "window"],
          thumbnailSize: { width: 800, height: 600 },
        });

        // Don't silently share a screen if none is available.
        if (sources.length === 0) {
          callback({});
          return;
        }

        // Temporary test: share the first available screen/window.
        // Replace this with a source-selection dialog for production.
        callback({ video: sources[0] });
      } catch (error) {
        console.error("Electron screen capture error:", error);
        callback({});
      }
    }
  );

  fs.mkdirSync(SCREEN_SNAP_DIR, { recursive: true });
 if (!app.isPackaged) {
  dotenv.config({
    path: path.join(import.meta.dirname, "../backend/.env"),
  });
}
  startBackendServer();
  createWindow();
});

app.on("will-quit", () => {
  if (timerInterval) clearInterval(timerInterval);
  if (snapshotInterval) clearInterval(snapshotInterval);
  stopBackendServer();
});

app.on("window-all-closed", () => {
    stopBackendServer();
    if (process.platform !== "darwin") {
        app.quit();
    }
});

