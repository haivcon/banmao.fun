# Hướng Dẫn Cấu Trúc Mã Nguồn (Codebase Guide) - Banmao Fun V2

Tài liệu này cung cấp cái nhìn chi tiết về cấu trúc thư mục và chức năng của các tệp tin trong dự án **Banmao Fun V2**. Dự án được xây dựng dựa trên Next.js (App Router), tích hợp Web3 và giao diện 3D.

---

## 1. Thư Mục Gốc (Root Directory)

| Thư mục/Tệp tin | Chức năng |
| :--- | :--- |
| `app/` | Thư mục quan trọng nhất, chứa toàn bộ trang (pages), API routes, và logic ứng dụng theo cấu trúc App Router của Next.js. |
| `components/` | Chứa các thành phần React dùng chung (Shared Components) như `PWAInstallBanner`, `OfflineIndicator`. |
| `lib/` | Các thư viện tiện ích dùng chung cho toàn bộ app (i18n, db, offline utils). |
| `public/` | Chứa tài nguyên tĩnh: Hình ảnh, biểu tượng, phông chữ, và cấu hình PWA. |
| `scripts/` | Các script hỗ trợ (ví dụ: tạo icon PWA). |
| `BanmaoRPS_ABI.json` | ABI của Smart Contract game Rock-Paper-Scissors. |
| `next.config.mjs` | Cấu hình Next.js. |
| `package.json` | Quản lý dependencies và scripts. |
| `.env.local` | Biến môi trường (cần bảo mật). |

---

## 2. Chi Tiết Thư Mục `app/`

### a. `app/gamefi/` (Trung Tâm Game)
Chứa các trò chơi chính của nền tảng.
- **`banmaorps/` (Rock Paper Scissors)**:
    - `page.tsx`: Giao diện chính của game Oẳn Tù Tì.
    - `components/`: UI riêng cho RPS.
    - `hooks/`: Logic game (`useRoomState`, `useAutoPlay`).
    - `lib/`: Xử lý logic thắng thua, i18n riêng.
- **`banmaosnake/` (Snake Game)**:
    - `page.tsx`: Giao diện chính của game Rắn Săn Mồi.
    - `components/`: UI riêng cho Snake.
    - `hooks/`: Logic điều khiển rắn.
    - `banmaosnake.sol`: Smart contact của game Snake (tham khảo).

### b. `app/web3d/` (Giao Diện 3D & Hiệu Ứng)
Quản lý không gian 3D trên trang chủ và nền tảng.
- **`components/`**: Các object 3D.
- **`effects/`**: Hiệu ứng hình ảnh (VFX).
- **`audio/`**: Quản lý âm thanh 3D.
- **`panel/`**: Các bảng điều khiển 3D nổi.
- **`controls/`**: Điều khiển camera.

### c. `app/api/` (Backend Routes)
Các API endpoints xử lý logic phía server.
- `donors/`: API lấy danh sách người ủng hộ.
- `okx/`: Tích hợp ví/sàn OKX.
- `price/`: API lấy giá token.
- `snake-leaderboard/`: Bảng xếp hạng game rắn.
- `telegram/`: Tích hợp bot Telegram.

### d. Các tệp chính trong `app/`
- **`page.tsx`**: Trang Landing Page (chứa logic 3D intro).
- **`layout.tsx`**: Root Layout (Providers, Global CSS).
- **`gamefi/page.tsx`**: Trang hub danh sách các game (nếu có).

---

## 3. Thư Mục `components/` & `lib/` (Modules Dùng Chung)

Khác với `app/*/components` (dùng riêng cho từng page/game), thư mục gốc `components/` chứa các thành phần global:
- `PWAInstallBanner.tsx`: Banner nhắc cài đặt ứng dụng.
- `OfflineIndicator.tsx`: Thông báo khi mất mạng.
- `SplashScreen.tsx`: Màn hình chờ khi mở app.

Thư mục `lib/` chứa logic tái sử dụng:
- `db.ts`: Xử lý cơ sở dữ liệu (nếu có dùng local DB/IndexedDB).
- `landingI18n.ts`: Đa ngôn ngữ cho landing page.
- `offlineUtils.ts`, `registerSW.ts`: Hỗ trợ tính năng Offline/PWA.

---

## 4. Ghi Chú Bảo Trì

- **Logic Game**: Mỗi game nằm biệt lập trong `app/gamefi/[tên_game]`. Khi sửa lỗi game nào, chỉ cần tập trung vào thư mục đó.
- **Hiệu Năng**: Các file `page.tsx` hiện tại khá lớn (>50KB, thậm chí >150KB). Cần cân nhắc tách nhỏ component để dễ quản lý.
- **API**: Khi thêm tính năng backend, tạo thư mục mới trong `app/api/`.

---
*Tài liệu được cập nhật tự động & chính xác hóa theo cấu trúc thực tế ngày 31/12/2025.*
