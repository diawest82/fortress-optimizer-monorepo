// Fortress Token Optimizer - Electron Main Process

import { app, BrowserWindow, ipcMain, Menu, Tray } from 'electron';
import Store from 'electron-store';
import axios from 'axios';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const store = new Store();

let mainWindow: BrowserWindow;
let tray: Tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
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

// Tray icon
function createTray() {
  const icon = path.join(__dirname, '../assets/tray-icon.png');
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

// IPC handlers
ipcMain.handle('optimize', async (_, prompt: string) => {
  const apiKey = store.get('api_key') as string;
  const level = (store.get('optimization_level') as string) || 'balanced';

  try {
    const response = await axios.post(
      'https://api.fortress-optimizer.com/api/optimize',
      {
        prompt,
        level,
        provider: 'openai',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Optimization failed: ${error}`);
  }
});

ipcMain.handle('get-usage', async () => {
  const apiKey = store.get('api_key') as string;

  try {
    const response = await axios.get(
      'https://api.fortress-optimizer.com/api/usage',
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch usage: ${error}`);
  }
});

ipcMain.handle('save-settings', (_, settings) => {
  Object.entries(settings).forEach(([key, value]) => {
    store.set(key, value);
  });
});

ipcMain.handle('get-settings', () => {
  return store.store;
});
