import { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu } from 'electron';
import { join } from 'path';
import { loadSettings, saveSettings, AppSettings } from './settings';
import { runMetaTray } from './features/metaTray';
import {
  installOculusKiller,
  uninstallOculusKiller,
  isOculusKillerInstalled,
  isOculusInstalled,
} from './features/oculusKiller';
import { setLaunchWithWindows } from './features/startupEntry';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let settings = loadSettings();
const isHiddenStart = process.argv.includes('--hidden');

function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '..', '..', 'assets', 'icon.png');
}

function getRendererPath(): string {
  return join(__dirname, '..', 'renderer', 'index.html');
}

function getCurrentState() {
  return {
    ...settings,
    oculusKillerInstalled: isOculusKillerInstalled(),
    oculusInstalled: isOculusInstalled(),
  };
}

function createWindow(): void {
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 580,
    height: 550,
    minWidth: 580,
    minHeight: 550,
    resizable: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#a1a1aa',
      height: 44
    },
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: icon.isEmpty() ? undefined : icon,
    skipTaskbar: settings.runInTray,
    alwaysOnTop: true,
    type: settings.runInTray ? 'toolbar' : undefined,
  });

  mainWindow.loadFile(getRendererPath());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow(): void {
  if (!mainWindow) createWindow();

  const win = mainWindow!;

  if (settings.runInTray && tray) {
    const trayBounds = tray.getBounds();
    const winBounds = win.getBounds();

    const x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
    const y = Math.round(trayBounds.y - winBounds.height - 8);

    win.setPosition(x, y, false);
  } else {
    win.center();
  }

  win.show();
  win.focus();
}

function createTray(): void {
  const iconPath = getIconPath();
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) icon = nativeImage.createEmpty();
  if (!icon.isEmpty()) icon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('MetaLinkExtras');

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      showWindow();
    }
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => showWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit MetaLinkExtras',
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);
}

ipcMain.handle('get-settings', () => getCurrentState());

ipcMain.handle('set-setting', (_event, key: keyof AppSettings, value: boolean) => {
  try {
    if (key === 'oculusKiller') {
      if (value) {
        installOculusKiller();
      } else {
        uninstallOculusKiller();
      }
    }
  } catch (err: any) {
    if (err.message === 'REQUIRES_ADMIN') throw err;
    return getCurrentState();
  }

  if (key === 'launchWithWindows') {
    setLaunchWithWindows(value);
    if (value) {
      (settings as unknown as Record<string, boolean>)['runInTray'] = true;
      mainWindow?.setSkipTaskbar(true);
      if (!tray) createTray();
    }
  }

  if (key === 'runInTray') {
    if (value) {
      mainWindow?.setSkipTaskbar(true);
      if (!tray) createTray();
    } else {
      mainWindow?.setSkipTaskbar(false);
      if (tray) {
        tray.destroy();
        tray = null;
      }
    }
  }

  (settings as unknown as Record<string, boolean>)[key] = value;
  saveSettings(settings);

  return getCurrentState();
});

ipcMain.handle('set-text-setting', (_event, key: string, value: string) => {
  (settings as unknown as Record<string, unknown>)[key] = value;
  saveSettings(settings);
  return getCurrentState();
});

ipcMain.on('close-window', () => {
  if (settings.runInTray) {
    mainWindow?.hide();
  } else {
    app.quit();
  }
});
ipcMain.on('minimize-window', () => mainWindow?.minimize());

import { relaunchAsAdmin } from './features/oculusKiller';
ipcMain.on('relaunch-admin', () => relaunchAsAdmin());

app.setAppUserModelId('com.metalinkextras.app');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showWindow();
  });

  app.whenReady().then(() => {
    if (settings.runInTray) {
      createTray();
    }
    createWindow();

    if (settings.metaTray) {
      runMetaTray();
    }

    if (!isHiddenStart) {
      showWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (!settings.runInTray) {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    tray?.destroy();
  });
}
