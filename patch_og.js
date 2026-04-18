const fs = require('fs');
const path = require('path');

const updates = [
  {
    file: 'app/gamefi/banmaoslots/layout.tsx',
    title: '$banmao+slots',
    desc: 'Spin the reels and win $BANMAO tokens on XLayer',
    image: '/games/slots/slots-icon.jpg'
  },
  {
    file: 'app/gamefi/banmaofomo/layout.tsx',
    title: '$banmao+fomo',
    desc: 'Compete in the ultimate FOMO game on XLayer',
    image: '/games/fomo/fomo-icon.jpg'
  },
  {
    file: 'app/defi/layout.tsx',
    title: 'DeFi Hub | BANMAO',
    desc: 'Explore DeFi services on BANMAO ecosystem. Staking, pools, and more on XLayer.',
    image: '/icons/icon_stats.png'
  },
  {
    file: 'app/defi/staking/layout.tsx',
    title: 'Staking | BANMAO',
    desc: 'Stake your $BANMAO tokens and earn rewards.',
    image: '/icons/icon_stake.png'
  },
  {
    file: 'app/defi/burn/layout.tsx',
    title: 'Burn Portal | BANMAO',
    desc: 'Burn XBot Node Keys to receive $BANMAO Airdrop Points.',
    image: '/images/burn-3d/burn-torch.png'
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
  
  // Find the end of the metadata block
  // This is a simple regex that looks for `export const metadata: Metadata = { ... };` and injects before the close bracket.
  const regex = /export\s+const\s+metadata:\s*Metadata\s*=\s*{([\s\S]*?)};/;
  const match = content.match(regex);
  if (match) {
    const inner = match[1];
    if (inner.includes('openGraph')) return;
    
    // Check if inner ends with comma, if not we add one implicitly by just placing our block
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
    // We add the block right before the closing brace of metadata
    const newMetadata = `export const metadata: Metadata = {${inner}${inner.trim().endsWith(',') ? '' : ','}\n${ogBlock}};\n`;
    content = content.replace(regex, newMetadata);
    fs.writeFileSync(fp, content);
    console.log('Updated:', up.file);
  }
});

// Airdrop needs a layout created or appended.
const airdropLayoutFile = path.join(__dirname, 'app/defi/airdrop/layout.tsx');
if (!fs.existsSync(airdropLayoutFile)) {
    const defaultLayout = `import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Airdrop | BANMAO",
    description: "Participate in the BANMAO ecosystem airdrop events.",
    openGraph: {
        title: "Airdrop | BANMAO",
        description: "Participate in the BANMAO ecosystem airdrop events.",
        images: ["/images/burn-3d/airdrop-gift.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "Airdrop | BANMAO",
        description: "Participate in the BANMAO ecosystem airdrop events.",
        images: ["/images/burn-3d/airdrop-gift.png"],
    }
};

export default function AirdropLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
`;
    fs.writeFileSync(airdropLayoutFile, defaultLayout);
    console.log('Created Airdrop layout');
}
