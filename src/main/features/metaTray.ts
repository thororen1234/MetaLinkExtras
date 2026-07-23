import { exec } from 'child_process';

export function runMetaTray(): void {
    const deadline = Date.now() + 30_000;
    let killSent = false;

    const poll = () => {
        if (Date.now() > deadline || killSent) return;

        exec('tasklist /FI "IMAGENAME eq OculusClient.exe" /V /FO CSV', (err, stdout) => {
            if (err) {
                setTimeout(poll, 1000);
                return;
            }

            const lines = stdout.split('\n');
            const hasVisibleWindow = lines.some(line => {
                const lower = line.toLowerCase();
                return lower.includes('oculusclient.exe') && !lower.includes(',"n/a"');
            });

            if (hasVisibleWindow) {
                exec('taskkill /IM OculusClient.exe', () => {
                    killSent = true;
                });
            } else {
                setTimeout(poll, 1000);
            }
        });
    };

    poll();
}
