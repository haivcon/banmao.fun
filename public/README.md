# 📁 Cấu trúc thư mục Public

Thư mục assets được tổ chức chuyên nghiệp để dễ dàng quản lý và bảo trì.

## 📋 Cấu trúc tổng quan

```
public/
├── branding/                 # Logo và hình ảnh thương hiệu
│   ├── banmao_logo.png       # Logo chính Banmao
│   ├── gamefi-logo.jpg       # Logo GameFi Hub
│   ├── animated-icon.gif     # Icon động (splash screen)
│   └── banmao-hero.jpg       # Hero image
│
├── games/                    # Assets từng game (xem games/README.md)
│   ├── rps/                  # Rock Paper Scissors
│   ├── snake/                # Snake game
│   └── slots/                # Slots game
│
├── pwa/                      # PWA icons theo ứng dụng
│   ├── main/                 # Main app icons (icon-*.png)
│   └── gamefi/               # GameFi Hub icons (gamefi-icon-*.png)
│
├── ui/                       # UI components assets
│   └── dock/                 # macOS-style dock icons
│       ├── dock-apps.png
│       ├── dock-profile.png
│       ├── dock-trophy.png
│       ├── dock-history.png
│       ├── dock-payout.png
│       ├── dock-verify.png
│       └── dock-house.png
│
├── flags/                    # Cờ quốc gia (i18n)
├── fonts/                    # Custom fonts
│
├── manifest*.json            # PWA manifest files
└── sw*.js                    # Service worker files
```

## 🔗 Đường dẫn tham khảo

| Loại | Đường dẫn cũ | Đường dẫn mới |
|------|--------------|---------------|
| Main PWA icons | `/icons/icon-*.png` | `/pwa/main/icon-*.png` |
| GameFi icons | `/icons/gamefi-icon-*.png` | `/pwa/gamefi/gamefi-icon-*.png` |
| RPS game assets | `/rps-logo.jpg`, `/rps/*` | `/games/rps/*` |
| Snake icons | `/icons/snake-icon-*.png` | `/games/snake/snake-icon-*.png` |
| Slots assets | `/icons/banmaoslots/*` | `/games/slots/*` |
| Dock icons | `/dock/*` | `/ui/dock/*` |
| Branding | `/banmao_logo.png` | `/branding/banmao_logo.png` |

## 📝 Ghi chú khi cập nhật

### Thêm game mới
1. Tạo folder: `public/games/<game-id>/`
2. Thêm: `preview.mp4`, `logo.jpg`, `<game>-icon-*.png`
3. Update `app/gamefi/page.tsx` games array
4. Xem chi tiết: `public/games/README.md`

### Thêm PWA icons
1. Đặt vào folder phù hợp trong `/pwa/`
2. Update manifest tương ứng
3. Update layout.tsx metadata

### Files không nên di chuyển
- `manifest*.json` - PWA yêu cầu ở root
- `sw*.js` - Service workers phải ở root
- `favicon.ico` - Browser yêu cầu ở root

---
Last updated: 2026-01-16
