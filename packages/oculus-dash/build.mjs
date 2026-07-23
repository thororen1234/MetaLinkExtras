import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as ResEdit from 'resedit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const exePath = path.join(__dirname, '..', '..', 'resources', 'OculusDash.exe');

execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit', cwd: __dirname });

if (!fs.existsSync(path.dirname(exePath))) fs.mkdirSync(path.dirname(exePath), { recursive: true });
fs.copyFileSync(process.execPath, exePath);

const exeData = fs.readFileSync(exePath);
const exe = ResEdit.NtExecutable.from(exeData, { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);

if (exe.newHeader && exe.newHeader.optionalHeader) {
    if (exe.newHeader.optionalHeader.subsystem === 3) {
        exe.newHeader.optionalHeader.subsystem = 2;
    }
}

const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const vi = viList[0] || ResEdit.Resource.VersionInfo.createEmpty();
vi.setStringValues(
    { lang: 1033, codepage: 1200 },
    {
        FileVersion: '1.0.0.0',
        ProductVersion: '1.0.0.0',
        FileDescription: 'Typescript port of OculusKiller',
        ProductName: 'OculusDash',
        CompanyName: 'MetaLinkExtras',
        LegalCopyright: 'Copyright (c) 2026',
        OriginalFilename: 'OculusDash.exe'
    }
);
vi.outputToResourceEntries(res.entries);

const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.ico');
if (fs.existsSync(iconPath)) {
    const iconData = fs.readFileSync(iconPath);
    const iconFile = ResEdit.Data.IconFile.from(iconData);
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        1033,
        iconFile.icons.map(item => item.data)
    );
} else {
    console.warn(`Icon not found at ${iconPath}`);
}

res.outputResource(exe);
const newBinary = exe.generate();
fs.writeFileSync(exePath, Buffer.from(newBinary));

try {
    execSync(`npx postject "${exePath}" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
        stdio: 'inherit',
        cwd: __dirname
    });
    console.log('SEA Build successful!');
} catch (err) {
    console.error('postject injection failed.');
    process.exit(1);
}
