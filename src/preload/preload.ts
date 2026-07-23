import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
  getSettings: (): Promise<unknown> => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: boolean): Promise<unknown> => ipcRenderer.invoke('set-setting', key, value),
  setTextSetting: (key: string, value: string): Promise<unknown> => ipcRenderer.invoke('set-text-setting', key, value),
  close: (): void => { ipcRenderer.send('close-window'); },
  minimize: (): void => { ipcRenderer.send('minimize-window'); },
  relaunchAdmin: (): void => { ipcRenderer.send('relaunch-admin'); },
});
