import { app, dialog } from 'electron';
import { join } from 'path';
import { createWriteStream, rmSync } from 'fs';
import { spawn } from 'child_process';
import * as https from 'https';

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) return downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
      if (response.statusCode !== 200) return reject(new Error(`Failed to download, status code: ${response.statusCode}`));
      const file = createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        rmSync(dest, { force: true });
        reject(err);
      });
    }).on('error', reject);
  });
}

export async function checkForUpdates() {
  if (!app.isPackaged) return;

  try {
    const response = await fetch('https://api.github.com/repos/thororen1234/MetaLinkExtras/releases/latest', {
      headers: { 'User-Agent': 'MetaLinkExtras-Updater' }
    });

    if (!response.ok) return;

    const data = await response.json();
    const latestVersion = data.tag_name.replace(/^v/, '');
    const currentVersion = app.getVersion();

    if (latestVersion !== currentVersion && data.assets && data.assets.length > 0) {
      const exeAsset = data.assets.find((a: any) => a.name.endsWith('.exe'));
      if (!exeAsset) return;

      const { response: btnIndex } = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version of MetaLinkExtras (${latestVersion}) is available.\nWould you like to download and install it now?`,
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
      });

      if (btnIndex === 0) {
        const tempPath = join(app.getPath('temp'), exeAsset.name);

        await downloadFile(exeAsset.browser_download_url, tempPath);

        spawn(tempPath, [], { detached: true, stdio: 'ignore' }).unref();
        app.quit();
      }
    }
  } catch (error) {
    console.error('[updater] Failed to check for updates:', error);
  }
}
