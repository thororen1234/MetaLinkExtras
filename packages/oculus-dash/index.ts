import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawn, execSync } from 'child_process';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPids(imageName: string): number[] {
  try {
    const out = execSync(`tasklist /FI "IMAGENAME eq ${imageName}" /FO CSV /NH`, {
      encoding: 'utf-8',
      windowsHide: true,
    });
    return out
      .split('\n')
      .filter(line => line.toLowerCase().includes(imageName.toLowerCase()))
      .map(line => {
        const cols = line.split(',');
        return parseInt((cols[1] ?? '').replace(/"/g, '').trim(), 10);
      })
      .filter(pid => !isNaN(pid) && pid > 0);
  } catch {
    return [];
  }
}

function killPid(pid: number): void {
  try {
    execSync(`taskkill /PID ${pid} /F`, { windowsHide: true });
  } catch { }
}

function killByPrefix(prefix: string): void {
  try {
    const out = execSync('tasklist /FO CSV /NH', {
      encoding: 'utf-8',
      windowsHide: true,
    });
    for (const line of out.split('\n')) {
      const cols = line.split(',');
      const name = (cols[0] ?? '').replace(/"/g, '').trim();
      if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
        const pid = parseInt((cols[1] ?? '').replace(/"/g, '').trim(), 10);
        if (!isNaN(pid) && pid > 0) killPid(pid);
      }
    }
  } catch { }
}

async function main(): Promise<void> {
  const localAppData = process.env.LOCALAPPDATA ?? '';
  const openVrPath = join(localAppData, 'openvr', 'openvrpaths.vrpath');

  if (!existsSync(openVrPath)) process.exit(0);

  let config: { runtime?: string[] };
  try {
    config = JSON.parse(readFileSync(openVrPath, 'utf-8')) as { runtime?: string[] };
  } catch {
    process.exit(0);
  }

  const runtime = config?.runtime?.[0];
  if (!runtime) process.exit(0);

  const vrStartupPath = join(runtime, 'bin', 'win64', 'vrstartup.exe');
  if (!existsSync(vrStartupPath)) process.exit(0);

  spawn(vrStartupPath, [], {
    detached: false,
    stdio: 'ignore',
    windowsHide: false,
  });

  let vrMonitorPids: number[] = [];
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    await sleep(1_000);
    vrMonitorPids = getPids('vrmonitor.exe');
    if (vrMonitorPids.length > 0) break;
  }

  if (vrMonitorPids.length === 0) process.exit(0);

  let killSteamVrOnOculusExit = true;
  const appData = process.env.APPDATA ?? '';
  const settingsPath = join(appData, 'MetaLinkExtras', 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const s = JSON.parse(readFileSync(settingsPath, 'utf-8')) as { oculusKillerLaunchApp?: string, killSteamVrOnOculusExit?: boolean };
      if (s.killSteamVrOnOculusExit !== undefined) {
        killSteamVrOnOculusExit = s.killSteamVrOnOculusExit;
      }
      const launchApp = s.oculusKillerLaunchApp?.trim();
      if (launchApp) {
        if (/^\d+$/.test(launchApp)) {
          spawn('cmd.exe', ['/c', `start "" "steam://rungameid/${launchApp}"`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
        } else {
          spawn(launchApp, [], { detached: true, stdio: 'ignore' }).unref();
        }
      }
    } catch { }
  }

  const initialOculusClientPids = new Set(getPids('OculusClient.exe'));

  while (true) {
    await sleep(1_000);

    const currentVrMonitor = getPids('vrmonitor.exe');
    const currentOculusClient = getPids('OculusClient.exe');

    if (
      initialOculusClientPids.size > 0 &&
      currentOculusClient.every(pid => !initialOculusClientPids.has(pid))
    ) {
      if (killSteamVrOnOculusExit) {
        for (const pid of currentVrMonitor) killPid(pid);
      }
      break;
    }

    if (currentVrMonitor.length === 0) break;
  }
  killByPrefix('OVRServer');

  process.exit(0);
}

main().catch(() => process.exit(0));
