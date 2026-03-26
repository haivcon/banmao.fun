# 🐱 Banmao.fun

**Banmao.fun** is a Web3 GameFi & DeFi entertainment platform built around the Banmao (斑猫) cat character. Play on-chain games, stake tokens, burn & donate, and explore the Banmao NFT collection — all in one place.

🌐 **Live:** [banmao.fun](https://banmao.fun)

---

## ✨ Features

### 🎮 GameFi Hub
Six fully on-chain mini-games with smart contract logic:

| Game | Description |
|------|-------------|
| **BanmaoRPS** | Rock-Paper-Scissors PvP betting |
| **BanmaoSlots** | Multi-pool slot machine with donor system |
| **BanmaoSnake** | Classic snake game with on-chain scoring |
| **BanmaoFOMO** | FOMO-style countdown game |
| **BanmaoPK** | PvP battle arena |
| **BanmaoMiner** | Mining/idle reward game |

### 💰 DeFi
- **Staking** — Stake $BANMAO tokens with flexible APY
- **Burn & Donate** — Deflationary burn mechanism with community donations

### 🖼️ Collection
- NFT gallery with lightbox viewer
- Multi-language support (EN, VI, ZH, KO, RU, ID)
- Download & share functionality
- Background removal tool (powered by `@imgly/background-removal`)

### 🌐 Web3D
- Interactive 3D scenes using Three.js / React Three Fiber
- Custom audio, controls, effects, and theme system

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Web3 | wagmi 2, viem, ethers 5, RainbowKit |
| 3D | Three.js, @react-three/fiber, @react-three/drei |
| State | Zustand |
| Database | Turso (LibSQL) |
| Media | Cloudinary |
| Messaging | XMTP, Push Protocol |
| Deploy | Vercel |

---

## 📁 Project Structure

```
banmao-fun-full/
├── app/
│   ├── page.tsx              # Landing page
│   ├── gamefi/               # GameFi hub & 6 games
│   ├── defi/                 # Staking & burn modules
│   ├── collection/           # NFT collection gallery
│   ├── web3d/                # 3D interactive components
│   ├── api/                  # API routes
│   └── contexts/             # React context providers
├── components/               # Shared UI components
├── contracts/                # Solidity smart contracts
├── lib/                      # Utilities & helpers
├── public/                   # Static assets, PWA manifests, game sprites
├── scripts/                  # Admin & indexer scripts
└── data/                     # Static data files
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm

### Installation

```bash
git clone https://github.com/haivcon/banmao.fun.git
cd banmao.fun
npm install
```

### Environment Variables

Create `.env.local` from the template:

```env
# Database
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Web3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## 📜 Smart Contracts

All contracts are in the `contracts/` directory:

| Contract | Purpose |
|----------|---------|
| `BanmaoHub.sol` | Central hub registry |
| `banmaorps.sol` | Rock-Paper-Scissors game |
| `BanmaoSlotsMultiPoolV2.sol` | Slot machine (V2) |
| `BanMaoSnake.sol` | Snake game scoring |
| `BanMaoFomo.sol` | FOMO countdown game |
| `BanMaoPK.sol` | PvP battle |
| `BanMaoMiner.sol` | Mining rewards |
| `BanmaoStaking.sol` | Token staking |

---

## 🌍 Internationalization

Supported languages: **English, Tiếng Việt, 中文, 한국어, Русский, Bahasa Indonesia**

---

## 📝 License

This project is private and proprietary.

---

<p align="center">
  Built with ❤️ by the Banmao team
</p>
