import { app } from 'electron';

const APP_NAME = 'MetaLinkExtras';

export function setLaunchWithWindows(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    name: APP_NAME,
    args: ['--hidden'],
  });
}

export function getLaunchWithWindows(): boolean {
  return app.getLoginItemSettings({ args: ['--hidden'] }).openAtLogin;
}
