// Preload script — exposes a safe IPC bridge to the renderer process.
// Runs in a sandboxed context with contextIsolation enabled.

import { contextBridge, ipcRenderer } from 'electron';

export interface FortressAPI {
  optimize: (args: {
    prompt: string;
    level: 'conservative' | 'balanced' | 'aggressive';
    provider: string;
  }) => Promise<any>;
  getUsage: () => Promise<any>;
  saveSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
  getSettings: () => Promise<{
    api_key: string;
    provider: string;
    optimization_level: string;
  }>;
}

contextBridge.exposeInMainWorld('fortressAPI', {
  optimize: (args: {
    prompt: string;
    level: 'conservative' | 'balanced' | 'aggressive';
    provider: string;
  }) => ipcRenderer.invoke('optimize', args),

  getUsage: () => ipcRenderer.invoke('get-usage'),

  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('save-settings', settings),

  getSettings: () => ipcRenderer.invoke('get-settings'),
} satisfies FortressAPI);
