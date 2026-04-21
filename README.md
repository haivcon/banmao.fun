# 🚀 Banmao.Fun - Collection Gallery Upgrade

## 📌 Update Overview
This update introduces a fully integrated **AI Prompt Viewer** for the Banmao Collection Gallery. It allows users to flawlessly view the original AI-generated prompts (in 6 localized languages) and access direct Gemini share links right from the image lightbox.

## ✨ Key Upgrades

🟢 **AI Prompt Metadata Integration**
- **Dynamic Content Fetching**: Built a highly efficient `/api/collection/prompts` Next.js server route that seamlessly queries Cloudinary's Search API to pair `prompt.txt` and `share_links.txt` metadata directly with their respective image folders.
- **Robust Cache Strategy**: Implemented intelligent cache busting (`force-dynamic` and timestamps) for both Server-Side and Client-Side rendering to bypass stale PWA Service Worker caching, guaranteeing users receive real-time Cloudinary updates.
- **Metadata Synchronization Script**: Engineered `sync_metadata.js` to batch upload local metadata arrays directly into matching Cloudinary namespaces (`Banmao_GroupX`), ensuring flawless 1:1 data cohesion.

🌐 **Premium Localized UI**
- **Sleek Lightbox Extension**: Augmented the primary image lightbox actions with a modern "✨ Prompt" button, elegantly styled using cohesive pink-gradient button tokens.
- **Glassmorphic Prompt Panel**: Designed a drop-down `.col-prompt-panel` featuring deep glassmorphism aesthetics, scrollable code-like prompt areas, and convenient 1-click "📋 Copy Prompt" action buttons.
- **Full 6-Language Localization**: Deeply integrated native translation keys for the entire Prompt Viewer workflow across English, Vietnamese, Chinese (`zh`), Korean (`ko`), Russian (`ru`), and Indonesian (`id`), providing a culturally inclusive web3 experience.

### 🛡 Core Tech Stack
- **Framework**: Next.js 14, React 18, TypeScript, Service Workers (PWA)
- **Data & Storage**: Cloudinary Search API, Node.js raw file fetching
- **Styling Pipeline**: Vanilla CSS Modules, Premium Glassmorphism, Responsive Interfaces
