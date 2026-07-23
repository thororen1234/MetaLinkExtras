interface AppState {
  metaTray: boolean;
  oculusKiller: boolean;
  launchWithWindows: boolean;
  oculusKillerLaunchApp: string;
  oculusKillerInstalled: boolean;
  oculusInstalled: boolean;
  runInTray: boolean;
  killSteamVrOnOculusExit: boolean;
}

interface Window {
  api: {
    getSettings: () => Promise<AppState>;
    setSetting: (key: string, value: boolean) => Promise<AppState>;
    setTextSetting: (key: string, value: string) => Promise<AppState>;
    close: () => void;
    minimize: () => void;
    relaunchAdmin: () => void;
  };
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function checkbox(id: string): HTMLInputElement {
  return el<HTMLInputElement>(id);
}

function applyState(state: AppState): void {
  checkbox('check-metaTray').checked = state.metaTray;
  checkbox('check-runInTray').checked = state.runInTray;
  checkbox('check-killSteamVrOnOculusExit').checked = state.killSteamVrOnOculusExit;

  checkbox('check-oculusKiller').checked = state.oculusKiller;

  const okCard = el('card-oculusKiller');

  if (!state.oculusInstalled) {
    okCard.classList.add('card-disabled');
    checkbox('check-oculusKiller').disabled = true;
  } else {
    okCard.classList.remove('card-disabled');
    checkbox('check-oculusKiller').disabled = false;
  }

  const killSteamVrCard = el('card-killSteamVrOnOculusExit');
  const killSteamVrDesc = el('desc-killSteamVrOnOculusExit');
  if (!state.oculusKiller || !state.oculusInstalled) {
    killSteamVrCard.classList.add('card-disabled');
    checkbox('check-killSteamVrOnOculusExit').disabled = true;
    checkbox('check-killSteamVrOnOculusExit').checked = false;
    if (killSteamVrDesc) killSteamVrDesc.textContent = 'Requires Kill Oculus Dash to be enabled';
  } else {
    killSteamVrCard.classList.remove('card-disabled');
    checkbox('check-killSteamVrOnOculusExit').disabled = false;
    if (killSteamVrDesc) killSteamVrDesc.textContent = 'Automatically exit SteamVR when Oculus Link is closed';
  }

  checkbox('check-launchWithWindows').checked = state.launchWithWindows;

  const runInTrayCard = el('card-runInTray');
  const runInTrayDesc = el('desc-runInTray');
  if (state.launchWithWindows) {
    runInTrayCard.classList.add('card-disabled');
    checkbox('check-runInTray').disabled = true;
    if (runInTrayDesc) runInTrayDesc.textContent = 'Required when Launch with Windows is enabled';
  } else {
    runInTrayCard.classList.remove('card-disabled');
    checkbox('check-runInTray').disabled = false;
    if (runInTrayDesc) runInTrayDesc.textContent = 'Keep MetaLinkExtras running quietly in your taskbar corner';
  }

  const launchInput = el<HTMLInputElement>('input-oculusKillerLaunchApp');
  launchInput.value = state.oculusKillerLaunchApp;
  launchInput.disabled = !state.oculusKiller || !state.oculusInstalled;
}

async function onToggle(key: string, value: boolean): Promise<void> {
  const toggleLabel = el(`check-${key}`)?.closest('.toggle');
  toggleLabel?.classList.add('loading');

  try {
    const newState = await window.api.setSetting(key, value);
    applyState(newState);
  } catch (err: any) {
    console.error('[renderer] setSetting error:', err);
    const check = checkbox(`check-${key}`);
    if (check) check.checked = !value;

    if (err.message && err.message.includes('REQUIRES_ADMIN')) {
      const modal = el('modal-admin');
      modal.classList.remove('hidden');

      el('btn-relaunch-admin').onclick = () => window.api.relaunchAdmin();
      el('btn-cancel-admin').onclick = () => modal.classList.add('hidden');
    }
  } finally {
    toggleLabel?.classList.remove('loading');
  }
}

async function init(): Promise<void> {
  const toggleKeys: string[] = ['metaTray', 'oculusKiller', 'launchWithWindows', 'runInTray', 'killSteamVrOnOculusExit'];
  for (const key of toggleKeys) {
    const check = checkbox(`check-${key}`);
    check.addEventListener('change', () => onToggle(key, check.checked));
  }

  let launchDebounce: ReturnType<typeof setTimeout> | null = null;
  const launchInput = el<HTMLInputElement>('input-oculusKillerLaunchApp');
  launchInput.addEventListener('input', () => {
    if (launchDebounce) clearTimeout(launchDebounce);
    launchDebounce = setTimeout(async () => {
      const newState = await window.api.setTextSetting('oculusKillerLaunchApp', launchInput.value.trim());
      applyState(newState);
    }, 500);
  });

  try {
    const state = await window.api.getSettings();
    applyState(state);
  } catch (err) {
    console.error('[renderer] getSettings error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
