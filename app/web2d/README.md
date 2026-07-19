# Gợi ý tách mã nguồn landing 2D khỏi web3d

Mục tiêu: phần landing 2D nên có thư mục, component, CSS, dữ liệu và helper riêng để sau này sửa giao diện 2D mà không phải đụng vào hệ 3D nặng.

## Cấu trúc hiện tại đã tách

```txt
app/
  page.tsx                  # Trang tổng: chọn 2D/3D, provider chung, Canvas 3D
  landing.css               # CSS nền/chung + control chọn chế độ
  web2d/
    Web2DLanding.tsx        # UI landing 2D
    locals.ts               # nội dung/i18n riêng cho 2D
    web2d.css               # style riêng cho 2D
    README.md               # tài liệu này
  web3d/
    ...                     # toàn bộ panel/effect/hook/config/layout 3D
```

## Hướng sắp xếp đề xuất

Khi landing 2D lớn hơn, nên tách tiếp như sau:

```txt
app/web2d/
  index.ts                  # export Web2DLanding và type public
  Web2DLanding.tsx          # component container, chỉ ghép section
  locals.ts                 # text/i18n chỉ dùng cho 2D
  web2d.css                 # CSS entry cho 2D hoặc import các CSS module
  components/
    Hero2D.tsx
    StatsStrip2D.tsx
    FeatureGrid2D.tsx
    TokenPanel2D.tsx
    CTASection2D.tsx
  hooks/
    useWeb2DStats.ts
  data/
    links.ts
    features.ts
  styles/
    hero.css
    panels.css
    responsive.css
```

## Quy tắc để dễ bảo trì

1. `app/page.tsx` chỉ nên làm nhiệm vụ điều phối:
   - đọc/lưu chế độ 2D/3D;
   - tải lại trang khi đổi chế độ;
   - chỉ render control hiệu năng khi đang ở 3D;
   - gắn provider chung nếu cần.

2. Không import trực tiếp file 3D vào `app/web2d/*`.
   - 2D chỉ nên dùng asset trong `public/branding`, `public/images`, `public/icons`.
   - Nếu cần dữ liệu chung, đặt vào `app/shared` hoặc `lib`.

3. CSS 2D và 3D nên tách rõ:
   - `app/web2d/web2d.css`: class bắt đầu bằng `.web2d-`.
   - `app/landing.css`: chỉ giữ layout chung, nút chọn 2D/3D, biến theme toàn trang.
   - CSS 3D nên để trong `app/web3d` nếu sau này tách được.

4. Text/i18n:
   - Landing 2D dùng `app/web2d/locals.ts`.
   - Landing 3D dùng `app/web3d/locals.ts`.
   - Tránh dùng chung một object dịch quá lớn vì sửa text 2D dễ ảnh hưởng 3D.

5. Nếu muốn tách mạnh hơn trong tương lai:
   - tạo route riêng `app/(landing2d)/page.tsx` hoặc `app/2d/page.tsx`;
   - tạo route riêng `app/(landing3d)/page.tsx` hoặc `app/3d/page.tsx`;
   - trang chính `/` chỉ redirect hoặc chọn mode dựa trên localStorage/cookie.