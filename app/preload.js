// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("athena", {
    registerListenerForTimerTickFromMain: (callback) => {
        const fn = (_event, message) => {
            callback(message);
        };

        ipcRenderer.on('timer', fn);

        return () => {
            ipcRenderer.removeListener('timer', fn);
        };
    },registerListenerForScreenSnapFromMain: (callback) => {
  const fn = () => callback();
  ipcRenderer.on("screen-shot", fn);

  return () => {
    ipcRenderer.removeListener("screen-shot", fn);
  };
},
    startTimerOnMain: () => {
        try {
            return ipcRenderer.invoke('start-timer');
        } catch {
            throw new Error("Failed to start timer on main");
        }
    },

    // Functions related to capturing camera snaps of user
    registerListenerForCameraSnapFromMain: (callback) => {
        ipcRenderer.on('camera-shot', callback);

        return () => {
            ipcRenderer.removeListener('camera-shot', callback);
        };
    },

    storeCameraSnapImageOnDisk: (data) => {
        ipcRenderer.invoke('store-camera-snap-image-on-disk', data);
    },

    // Functions related to showing Contest Rules in a new Dialog
    showRules: () => {
        ipcRenderer.send("show-rules");
    },
    
    // Capture a screenshot of the user's screen
    captureUserScreen: () => {
        return ipcRenderer.invoke("capture-user-screen");
    },

});
