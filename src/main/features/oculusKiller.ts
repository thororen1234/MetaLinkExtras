import { existsSync, copyFileSync, rmSync } from 'fs';
import { join } from 'path';
import { app, dialog } from 'electron';

const BIN_DIRS = [
  'C:\\Program Files\\Meta\\Horizon\\Support\\oculus-dash\\dash\\bin',
  'C:\\Program Files\\Oculus\\Support\\oculus-dash\\dash\\bin'
];

function getActiveBinDir(): string | null {
  for (const dir of BIN_DIRS) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

function getDashPaths() {
  const dir = getActiveBinDir();
  if (!dir) return { exe: null, bak: null };
  return {
    exe: join(dir, 'OculusDash.exe'),
    bak: join(dir, 'OculusDash.exe.bak')
  };
}

function getReplacementPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources', 'OculusDash.exe');
  }
  return join(__dirname, '..', '..', '..', 'resources', 'OculusDash.exe');
}

export function isOculusInstalled(): boolean {
  return getActiveBinDir() !== null;
}

export function isOculusKillerInstalled(): boolean {
  const { bak } = getDashPaths();
  return bak ? existsSync(bak) : false;
}

import { spawn } from 'child_process';

export function relaunchAsAdmin() {
  const exePath = app.getPath('exe');
  const args = app.isPackaged ? [] : [app.getAppPath()];
  const psArgs = args.length > 0 ? `-ArgumentList '"${args[0]}"'` : '';
  
  const psCommand = `Start-Process -FilePath '${exePath}' ${psArgs} -Verb RunAs -WindowStyle Normal`;
  
  const child = spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCommand], {
    detached: true,
    stdio: 'ignore'
  });
  
  child.unref();
  app.quit();
}

export function installOculusKiller(): void {
  const replacementPath = getReplacementPath();
  const { exe, bak } = getDashPaths();

  if (!exe || !bak) {
    throw new Error('Oculus/Meta installation not found.');
  }

  if (!existsSync(replacementPath)) {
    throw new Error('Replacement exe not found. Run "pnpm build:dash" first.');
  }

  try {
    if (existsSync(exe) && !existsSync(bak)) {
      copyFileSync(exe, bak);
    }
    copyFileSync(replacementPath, exe);
    console.log('[oculusKiller] install succeeded');
  } catch (err: any) {
    console.error('[oculusKiller] install failed:', err);
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      throw new Error('REQUIRES_ADMIN');
    }
    throw err;
  }
}

export function uninstallOculusKiller(): void {
  const { exe, bak } = getDashPaths();
  if (!exe || !bak) return;

  try {
    if (existsSync(bak)) {
      copyFileSync(bak, exe);
      rmSync(bak, { force: true });
    }
    console.log('[oculusKiller] uninstall succeeded');
  } catch (err: any) {
    console.error('[oculusKiller] uninstall failed:', err);
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      throw new Error('REQUIRES_ADMIN');
    }
    throw err;
  }
}
