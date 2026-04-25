const fs = require('fs');
const path = require('path');

function ensureDir (dir) {
    fs.mkdirSync(dir, {recursive: true});
}

function copyDir (src, dest) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, {withFileTypes: true});
    entries.forEach((ent) => {
        const from = path.join(src, ent.name);
        const to = path.join(dest, ent.name);
        if (ent.isDirectory()) {
            copyDir(from, to);
        } else if (ent.isFile()) {
            ensureDir(path.dirname(to));
            fs.copyFileSync(from, to);
        }
    });
}

function main () {
    const root = path.resolve(__dirname, '..');
    const publicDir = path.resolve(root, 'public');
    const distDir = path.resolve(root, 'dist');

    if (!fs.existsSync(publicDir)) {
        console.error('[copy-public] public/ not found');
        process.exit(1);
    }

    copyDir(publicDir, distDir);
    console.log('[copy-public] copied public/ -> dist/');
}

main();

