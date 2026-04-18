const fs = require('fs');
const path = require('path');

const updates = [
  {
    file: 'app/gamefi/banmaorps/layout.tsx',
    title: '$banmao+RPS',
    desc: 'Play Rock-Paper-Scissors and collect $BANMAO tokens on XLayer',
    image: '/games/rps/rps-icon-512x512.png'
  }
];

updates.forEach(up => {
  const fp = path.join(__dirname, up.file);
  if (!fs.existsSync(fp)) {
      console.log('Skipping not found:', up.file);
      return;
  }
  let content = fs.readFileSync(fp, 'utf8');
  if (content.includes('openGraph: {')) {
      console.log('Skipping already has openGraph:', up.file);
      return;
  }
  
  const regex = /export\s+const\s+metadata:\s*Metadata\s*=\s*{([\s\S]*?)};/;
  const match = content.match(regex);
  if (match) {
    const inner = match[1];
    
    const ogBlock = `    openGraph: {
        title: "${up.title}",
        description: "${up.desc}",
        images: ["${up.image}"],
    },
    twitter: {
        card: "summary_large_image",
        title: "${up.title}",
        description: "${up.desc}",
        images: ["${up.image}"],
    },
`;
    const newMetadata = `export const metadata: Metadata = {${inner}${inner.trim().endsWith(',') ? '' : ','}\n${ogBlock}};\n`;
    content = content.replace(regex, newMetadata);
    fs.writeFileSync(fp, content);
    console.log('Updated:', up.file);
  }
});
