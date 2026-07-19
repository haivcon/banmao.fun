# Web3D Performance Budget

Mục tiêu: trang Web3D phải chạy mượt trên desktop, laptop, tablet và mobile, ưu tiên không giật/lag hơn là giữ mọi hiệu ứng nặng.

## 1. Mục tiêu FPS

| Chế độ | Thiết bị mục tiêu | FPS mục tiêu | Ghi chú |
|---|---|---:|---|
| Low | Mobile yếu, máy RAM thấp, Reduce Motion | 30 FPS ổn định | Tắt hầu hết hiệu ứng nặng |
| Medium | Mobile khá, laptop phổ thông | 45 FPS ổn định | Giữ hiệu ứng chính, giảm particle |
| High | Desktop/laptop GPU tốt | 60 FPS | Bật đầy đủ hơn nhưng vẫn giới hạn DPR |

## 2. Ngân sách render theo quality mode

| Hạng mục | Low | Medium | High |
|---|---:|---:|---:|
| DPR | 0.75–1 | 1–1.25 | 1–1.5 |
| Stars | 350 | 900 | 1800 |
| Floating particles | 4 | 12 | 32 |
| Glowing orbs | 2 | 5 | 10 |
| Sparkles primary | 0 | 25 | 80 |
| Sparkles secondary | 0 | 15 | 50 |
| Token coin segments | 32 | 48 | 64 |
| Token coin ridges | 24 | 36 | 48 |
| Dynamic lights tối đa | 1 | 2 | 3 |
| Initial asset budget | <= 2 MB | <= 4 MB | <= 8 MB |
| Texture size tối đa | 1024px | 1536px | 2048px |

Nguồn cấu hình runtime: `app/web3d/config/performanceConfig.ts`.

## 3. Quy tắc bắt buộc khi thêm hiệu ứng Web3D

- Không tạo geometry/material mới trong mỗi frame.
- Không `setState` liên tục trong `useFrame`; ưu tiên ref hoặc mutate object Three.js trực tiếp.
- Clamp `delta` để tránh animation nhảy mạnh khi quay lại tab.
- Component nặng phải lazy-load hoặc chỉ render theo quality flag.
- Mobile/Low mode không được tải model/texture nặng nếu không render.
- Particle/object lặp lại phải dùng instancing khi phù hợp.
- Dynamic light phải có giới hạn theo `maxDynamicLights`.
- Tôn trọng `prefers-reduced-motion`; nếu bật thì ưu tiên fallback 2D.

## 4. Asset budget

Các asset nặng đã phát hiện:

| Asset | Kích thước | Hành động khuyến nghị |
|---|---:|---|
| `public/gamefi/banmaofomo/sprites.zip` | ~17.27 MB | Không preload ở trang Web3D; chỉ tải khi vào game cần dùng |
| `public/models/banmao-whale.glb` | ~7.16 MB | Chỉ bật High mode; nên nén Draco/Meshopt hoặc tạo LOD thấp |
| Nhiều sprite PNG GameFi | 0.5–1.25 MB/file | Convert WebP/AVIF, lazy-load theo game |
| `public/ui/dock/*.png` | 0.57–1.17 MB/file | Convert WebP, resize đúng kích thước hiển thị |
| `public/images/burn-3d/*.png` | 0.56–1.14 MB/file | Convert WebP, lazy-load |

## 5. Điều kiện pass release

- Low mode trên Android tầm trung/yếu đạt khoảng 30 FPS ổn định.
- Không crash WebGL trên Safari/iOS.
- Fallback 2D hoạt động khi WebGL lỗi hoặc Reduce Motion bật.
- Không tăng memory liên tục sau 5 phút idle.
- Production build thành công.
- Không có lỗi TypeScript.
- Không có lỗi lint chặn build trong khu vực Web3D/page chính.