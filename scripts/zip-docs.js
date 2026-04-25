const fs = require('fs');
const path = require('path');
const {zip} = require('zip-a-folder');

async function main () {
    const root = path.resolve(__dirname, '..');
    const docsDir = path.resolve(root, 'dist');
    const outZip = path.resolve(root, 'dist.zip');

    if (!fs.existsSync(docsDir)) {
        console.error('[zip-docs] dist/ not found. Run "npm run build" first.');
        process.exit(1);
    }

    await zip(docsDir, outZip);
    console.log('[zip-docs] created:', outZip);
}

main().catch((e) => {
    console.error('[zip-docs] failed:', e);
    process.exit(1);
});

