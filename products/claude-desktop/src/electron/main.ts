// Fortress Token Optimizer - Electron Main Process

import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import Store from 'electron-store';
import axios from 'axios';
import path from 'path';

const API_BASE = 'https://api.fortress-optimizer.com';
const isDev = process.env.NODE_ENV === 'development';
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Tray icon
function createTray() {
  try {
    const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    // If icon file doesn't exist, create a simple 16x16 empty icon
    const trayIcon = icon.isEmpty()
      ? nativeImage.createEmpty()
      : icon.resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);
    tray.setToolTip('Fortress Token Optimizer');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Fortress Optimizer', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow?.show());
  } catch {
    // Tray creation can fail in some environments; non-critical
    console.warn('Could not create system tray icon');
  }
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function getAuthHeaders(): Record<string, string> {
  const apiKey = store.get('api_key') as string;
  if (!apiKey) {
    throw new Error('API key not configured. Open Settings to add your key.');
  }
  return { Authorization: `Bearer ${apiKey}` };
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

interface OptimizeArgs {
  prompt: string;
  level: 'conservative' | 'balanced' | 'aggressive';
  provider: string;
}

ipcMain.handle('optimize', async (_event, args: OptimizeArgs) => {
  const { prompt, level, provider } = args;

  try {
    const response = await axios.post(
      `${API_BASE}/api/optimize`,
      { prompt, level, provider },
      {
        headers: getAuthHeaders(),
        timeout: 15000,
      }
    );

    // The backend returns:
    // {
    //   request_id, status,
    //   optimization: { optimized_prompt, technique },
    //   tokens: { original, optimized, savings, savings_percentage }
    // }
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || String(error);
    throw new Error(`Optimization failed: ${msg}`);
  }
});

ipcMain.handle('get-usage', async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/usage`, {
      headers: getAuthHeaders(),
      timeout: 5000,
    });

    // Backend returns:
    // {
    //   tier, tokens_optimized, tokens_saved,
    //   requests, tokens_limit, tokens_remaining,
    //   rate_limit, reset_date
    // }
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || String(error);
    throw new Error(`Failed to fetch usage: ${msg}`);
  }
});

ipcMain.handle('save-settings', (_event, settings: Record<string, unknown>) => {
  Object.entries(settings).forEach(([key, value]) => {
    store.set(key, value);
  });
  return { success: true };
});

ipcMain.handle('get-settings', () => {
  return {
    api_key: (store.get('api_key') as string) || '',
    provider: (store.get('provider') as string) || 'openai',
    optimization_level: (store.get('optimization_level') as string) || 'balanced',
  };
});

export { createWindow, API_BASE };
