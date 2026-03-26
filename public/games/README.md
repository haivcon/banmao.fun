# GameFi Hub Public Assets

Cấu trúc thư mục assets cho các game trong GameFi Hub.

## 📁 Cấu trúc thư mục

```
public/
├── games/                    # Assets của từng game
│   ├── rps/                  # Rock Paper Scissors game
│   │   ├── preview.mp4       # Video preview cho GameFi hub card
│   │   ├── logo.jpg          # Logo chính của game
│   │   ├── rock.png          # Hình đá (in-game asset)
│   │   ├── paper.png         # Hình giấy (in-game asset)
│   │   ├── scissors.png      # Hình kéo (in-game asset)
│   │   └── rps-icon-*.png    # PWA icons các kích thước
│   │
│   ├── snake/                # Snake game
│   │   ├── preview.mp4       # Video preview cho GameFi hub card
│   │   └── snake-icon-*.png  # PWA icons các kích thước
│   │
│   └── slots/                # Slots game
│       ├── preview.mp4       # Video preview (slots-preview.mp4)
│       ├── slots-icon.jpg    # Logo/icon chính
│       └── slots-icon-*.png  # PWA icons các kích thước
│
├── icons/                    # Icon chung (gamefi hub, main app)
│   ├── gamefi-icon-*.png     # GameFi Hub PWA icons
│   └── icon-*.png            # Main app icons
│
└── manifest-*.json           # PWA manifest files
```

## 🎮 Sử dụng trong code

### Video Preview (GameFi Hub cards)
```typescript
// Trong app/gamefi/page.tsx - games array
{
    id: "banmaorps",
    videoPreview: "/games/rps/preview.mp4",
    // ...
}
```

### Game Assets (in-game)
```typescript
// Rock Paper Scissors game
<img src="/games/rps/rock.png" />
<img src="/games/rps/paper.png" />
<img src="/games/rps/scissors.png" />
```

### PWA Icons
```json
// manifest-rps.json
{
    "icons": [
        { "src": "/games/rps/rps-icon-192x192.png", "sizes": "192x192" }
    ]
}
```

## ✏️ Cập nhật khi thêm game mới

1. Tạo thư mục: `public/games/<game-id>/`
2. Thêm các file:
   - `preview.mp4` - Video preview (10-30s, loop)
   - `logo.jpg/png` - Logo chính
   - `<game>-icon-*.png` - PWA icons (72, 96, 128, 144, 152, 192, 384, 512)
3. Cập nhật `app/gamefi/page.tsx` - games array
4. Tạo `manifest-<game>.json` nếu cần PWA riêng

## 📋 Checklist khi thay đổi assets

- [ ] Update paths trong `app/gamefi/page.tsx`
- [ ] Update paths trong manifest files
- [ ] Update GameCard component nếu cần
- [ ] Test trên local: `npm run dev`
- [ ] Clear browser cache khi test

---
Last updated: 2026-01-16
