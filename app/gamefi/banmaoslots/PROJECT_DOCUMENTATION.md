# 📚 BANMAO SLOTS - Project Documentation

## Giới Thiệu

Đây là tài liệu chi tiết về dự án **Banmao Slots** - Slot Machine Game trên blockchain (X Layer / OKX). Tài liệu này giúp:
- Hiểu cấu trúc project
- Dễ dàng nâng cấp/sửa lỗi
- AI Assistant (Antigravity) có thể đọc hiểu nhanh

---

## 📁 Cấu Trúc Thư Mục

```
app/gamefi/banmaoslots/
├── page.tsx                 # Trang chính (196KB!) - Chứa tất cả logic game
├── layout.tsx               # Layout wrapper
├── globals.css              # CSS toàn cục (65KB) - Animations, theme
├── admin/                   # Admin panel
│   ├── page.tsx             # Trang admin
│   └── i18n.ts              # Translations cho admin
├── components/              # 38 components UI
├── hooks/                   # 4 custom hooks
├── lib/                     # Utilities & constants
└── icon/                    # App icons
```

---

## 🧩 COMPONENTS (38 files)

### Core Game UI
| File | Size | Mô tả |
|------|------|-------|
| `SlotMachineWindow.tsx` | 123KB | **CHÍNH** - UI máy slot, cuộn symbols, animations |
| `SlotMachineCabinet.tsx` | 11KB | Vỏ máy slot có glow effects |
| `SlotLever.tsx` | 15KB | Cần gạt máy slot |
| `BetBar.tsx` | 7KB | Thanh đặt cược |
| `SpinCountSelector.tsx` | 10KB | Chọn số lượng spin (1-10) |

### Result & Modal
| File | Size | Mô tả |
|------|------|-------|
| `ResultModal.tsx` | 27KB | Hiển thị kết quả win/lose |
| `MultiSpinResultsModal.tsx` | 38KB | Kết quả multi-spin (bảng lớn) |
| `MultiSpinResultsGrid.tsx` | 8KB | Grid hiển thị từng spin |
| `MiniSlotResult.tsx` | 7KB | Kết quả nhỏ inline |
| `SpinResultCard.tsx` | 13KB | Card hiển thị 1 spin |

### Pool Management
| File | Size | Mô tả |
|------|------|-------|
| `PoolSelector.tsx` | 14KB | Chọn pool để chơi |
| `CreatePoolModal.tsx` | 14KB | Tạo pool mới |
| `PoolManagementCard.tsx` | 38KB | Quản lý pool (deposit/withdraw) |
| `PoolProtectionPanel.tsx` | 25KB | Cài đặt bảo vệ pool |
| `PoolStatisticsChart.tsx` | 10KB | Biểu đồ thống kê pool |

### Profile & Leaderboard
| File | Size | Mô tả |
|------|------|-------|
| `SlotsProfileCard.tsx` | 37KB | Thẻ profile người chơi |
| `ProfileEditModal.tsx` | 14KB | Sửa profile |
| `PlayerProfileViewer.tsx` | 14KB | Xem profile người khác |
| `ViewPlayerPanel.tsx` | 41KB | Panel xem player chi tiết |
| `TopWinnersPanel.tsx` | 23KB | Bảng xếp hạng |

### House Dashboard
| File | Size | Mô tả |
|------|------|-------|
| `HouseDashboardPanel.tsx` | 44KB | Panel quản lý House (pool owners) |
| `StatusDashboard.tsx` | 5KB | Dashboard trạng thái contract |

### UI General
| File | Size | Mô tả |
|------|------|-------|
| `DraggablePanel.tsx` | 22KB | Panel có thể kéo di chuyển |
| `MacOSDock.tsx` | 21KB | Dock menu kiểu MacOS |
| `LogoHeader.tsx` | 14KB | Header với logo |
| `AnimatedBalanceWidget.tsx` | 12KB | Widget balance có animation |
| `SplashScreen.tsx` | 7KB | Màn hình loading đầu tiên |
| `OnboardingTour.tsx` | 23KB | Tour hướng dẫn new user |

### Fairness & Verification
| File | Size | Mô tả |
|------|------|-------|
| `VerifyModal.tsx` | 17KB | Modal xác minh kết quả |
| `FairnessAccordion.tsx` | 6KB | Accordion giải thích công bằng |
| `PayoutCalculator.tsx` | 65KB | Tính toán payout + RTP |

### Other
| File | Size | Mô tả |
|------|------|-------|
| `RainEffect.tsx` | 13KB | Effect mưa nền |
| `StreetView.tsx` | 10KB | Background đường phố |
| `JackpotDonorsPanel.tsx` | 9KB | Panel người donate jackpot |
| `DonorProfileSection.tsx` | 16KB | Section profile donor |
| `GamePlayModal.tsx` | 14KB | Modal hướng dẫn chơi |
| `InteractiveText.tsx` | 1KB | Text có hover effect |
| `PWAInstallBanner.tsx` | 0.5KB | Banner cài PWA |

---

## 🪝 HOOKS (4 files)

| File | Lines | Mô tả |
|------|-------|-------|
| `useSlotsGame.ts` | 780 | **CHÍNH** - Logic game: commit, reveal, spin, pools |
| `useHouseDashboard.ts` | 653 | Quản lý pool: deposit, withdraw, settings |
| `useSlotsProfile.ts` | 200 | Profile người chơi (stats, avatar) |
| `useSlotsWebSocket.ts` | 280 | WebSocket cho real-time events |

### useSlotsGame.ts - Chức năng
```typescript
- commitSpin() / commitMultiSpin()  // Bước 1: Commit seed
- revealSpin()                       // Bước 2: Reveal & get result
- pools[], selectedPool             // Danh sách pool
- spinResult, multiSpinResults      // Kết quả
- betAmount, spinCount              // Cược & số spin
- calculateMaxSafeBet()             // Tính bet an toàn
```

### useHouseDashboard.ts - Chức năng
```typescript
- createPool()              // Tạo pool mới
- depositToPool()           // Nạp tiền vào pool
- withdrawFromPool()        // Rút tiền
- updatePoolSettings()      // Cập nhật min/max bet
- updateProtectionSettings() // Cài đặt bảo vệ
- deactivatePool()          // Tắt pool
- closePool()               // Đóng vĩnh viễn
```

---

## 📚 LIB (Utilities)

| File | Mô tả |
|------|-------|
| `abis.ts` | Contract ABIs + Addresses + Constants (V2) |
| `confetti.ts` | Animation confetti khi win |
| `sounds.ts` | Sound effects (spin, win, jackpot) |
| `symbols.ts` | Symbol definitions (🐱🍌💎🌟🍀7️⃣) |
| `tiers.ts` | Pool tier system (BRONZE → PLATINUM) |
| `slotsProfiles.ts` | Profile storage (localStorage) |
| `slotsAvatars.ts` | Avatar options |
| `historyUtils.ts` | Utilities xử lý history |
| `houseI18n.ts` | Translations cho House Dashboard |

### i18n/ (8 files)
- `types.ts` - Type definitions cho translations
- `index.ts` - Export all languages
- `en.ts` - English
- `vi.ts` - Tiếng Việt
- `zh.ts` - 中文 (Chinese)
- `ko.ts` - 한국어 (Korean)
- `ru.ts` - Русский (Russian)
- `id.ts` - Bahasa Indonesia

---

## 📜 CONTRACTS (3 files)

| File | Mô tả |
|------|-------|
| `BanmaoSlotsMultiPoolV2.sol` | **ACTIVE** - Contract V2 với RTP 95% |
| `BanmaoSlotsMultiPool.sol` | V1 (deprecated) - RTP 108% |
| `banmaorps.sol` | Rock-Paper-Scissors game (khác) |
| `BanMaoSnake.sol` | Snake game (khác) |

### Contract V2 Key Features
- Commit-Reveal for provably fair
- Multi-pool system (anyone can create)
- Multi-spin (1-10 spins)
- Pool protection (dynamic max bet, streak protection)
- Rate limiting (10 spins/minute)
- Platform fee 2%
- RTP ~95%

---

## ⚠️ POTENTIAL ISSUES

### 1. Performance
- **page.tsx quá lớn** (196KB, ~3000 lines) → Nên tách thành multiple files
- **SlotMachineWindow.tsx** (123KB) → Cũng rất lớn, nên refactor

### 2. Code Quality
- Nhiều inline styles → Nên dùng CSS modules hoặc styled-components
- TypeScript `any` type ở nhiều chỗ → Cần define proper types
- Một số console.log còn sót → Cần clean up

### 3. UX Issues
- Panel quá nhiều (9+ panels) → Có thể confuse new users
- Mobile responsiveness chưa tối ưu cho panels
- Splash screen có thể lâu trên slow connection

### 4. Security
- Seed generation client-side → OK vì commit-reveal
- localStorage cho profile → OK nhưng có thể bị clear

---

## 💡 IMPROVEMENT SUGGESTIONS

### UI/UX
1. **Mobile-first redesign** cho SlotMachineWindow
2. **Lazy loading** cho components nặng
3. **Skeleton loading** thay vì loading spinner
4. **Sound toggle** persist to localStorage
5. **Tutorial mode** cải tiến với video

### Backend/Hooks
1. **React Query** để cache contract reads
2. **Optimistic updates** cho UX mượt hơn
3. **Error boundary** component
4. **WebSocket reconnection** logic

### Contract
1. **Gas optimization** cho batch operations
2. **Emergency pause** per-pool (not just global)
3. **Pool analytics** view functions

### Architecture
1. **Tách page.tsx** thành:
   - `containers/`
   - `context/`
   - `utils/`
2. **State management** (Zustand/Jotai) thay vì prop drilling
3. **Testing** với Jest/React Testing Library

---

## 📝 Quick Reference Commands

```bash
# Development
npm run dev

# Build
npm run build

# Contract compile (Hardhat)
npx hardhat compile

# Contract deploy
npx hardhat run scripts/deploy.ts --network xlayer
```

---

## 🔗 Key Addresses

| Name | Address |
|------|---------|
| Slots Contract (V2) | `0x9c64c18D792Eab435d1d921efaC978F6A62da2d2` |
| BANMAO Token | `0x16d91d1615fc55b76d5f92365bd60c069b46ef78` |
| Chain | X Layer (OKX) |

---

*Cập nhật: 2026-01-17*
