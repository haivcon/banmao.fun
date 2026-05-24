const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'app/web3d/locals');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    if (file === 'index.ts') continue;
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/gamefiWorldCupName:\s*".*?"/g, 'gamefiWorldCupName: "BANMAO CUP"');
    fs.writeFileSync(fullPath, content, 'utf8');
}
console.log('Done replacing translations');
