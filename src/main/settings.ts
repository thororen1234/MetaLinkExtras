import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

export interface AppSettings {
  metaTray: boolean;
  oculusKiller: boolean;
  launchWithWindows: boolean;
  oculusKillerLaunchApp: string;
  runInTray: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  metaTray: true,
  oculusKiller: false,
  launchWithWindows: false,
  oculusKillerLaunchApp: '',
  runInTray: true,
};

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): AppSettings {
  try {
    const path = getSettingsPath();
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      if (loaded.launchWithWindows) {
        loaded.runInTray = true;
      }
      return loaded;
    }
  } catch { }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  try {
    const path = getSettingsPath();
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[settings] Failed to save:', err);
  }
}
