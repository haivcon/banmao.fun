# Web3D QA Checklist

Checklist kiểm thử trước khi release trang Web3D.

## 1. Build và kiểm tra kỹ thuật

- [ ] `npx tsc --noEmit` chạy thành công.
- [ ] `npm run lint` không có lỗi chặn release.
- [ ] `npm run build` chạy thành công.
- [ ] Chạy production bằng `npm run start` và kiểm tra trang chính.
- [ ] Console browser không có error lặp liên tục.
- [ ] Không có request asset 404.

## 2. Thiết bị cần test

- [ ] Desktop/laptop mạnh, Chrome/Edge.
- [ ] Laptop phổ thông hoặc máy không có GPU rời.
- [ ] Android tầm trung.
- [ ] Android yếu hoặc giả lập throttling CPU.
- [ ] iPhone Safari.
- [ ] iPad/tablet.
- [ ] Màn hình nhỏ dưới 390px chiều ngang.
- [ ] Màn hình lớn 2K/4K.

## 3. Quality mode

- [ ] Auto chọn đúng Low trên thiết bị yếu/mobile thấp.
- [ ] Auto chọn Medium trên thiết bị trung bình.
- [ ] High chỉ nên dùng mượt trên desktop/laptop mạnh.
- [ ] Người dùng đổi Low/Medium/High được.
- [ ] Lựa chọn quality được lưu sau khi refresh.
- [ ] Low mode không render whale, black hole/particle nặng nếu cấu hình tắt.
- [ ] Medium không tải asset High-only.
- [ ] High vẫn không vượt DPR budget.

## 4. FPS và độ mượt

- [ ] Low mode mobile đạt khoảng 30 FPS ổn định.
- [ ] Medium đạt khoảng 45 FPS trên laptop/mobile khá.
- [ ] High đạt khoảng 60 FPS trên desktop tốt.
- [ ] Không tụt FPS mạnh sau 1–2 phút đứng yên.
- [ ] Chuyển tab rồi quay lại không bị animation nhảy mạnh.
- [ ] Scroll/touch không bị delay rõ rệt.
- [ ] Không nóng máy bất thường sau 5 phút trên mobile.

## 5. WebGL/fallback/accessibility

- [ ] WebGL khả dụng thì render Canvas bình thường.
- [ ] Khi WebGL lỗi, fallback 2D hiển thị được.
- [ ] Khi bật Reduce Motion, fallback/low-motion hoạt động.
- [ ] UI chính vẫn bấm được khi fallback.
- [ ] Không có hiệu ứng nhấp nháy gây khó chịu.
- [ ] Text/nút đủ lớn trên mobile.
- [ ] Safe-area iPhone không che control.

## 6. Asset/network

- [ ] Whale GLB không tải ở Low/Medium nếu bị tắt.
- [ ] `sprites.zip` GameFi không tải ở trang Web3D landing.
- [ ] Asset ảnh lớn được lazy-load đúng nơi cần.
- [ ] Không preload asset không hiển thị.
- [ ] Cache headers hợp lý trên production.
- [ ] Lighthouse không báo ảnh quá lớn nghiêm trọng ở viewport mobile.

## 7. Memory/GPU

- [ ] Memory không tăng liên tục sau 5 phút idle.
- [ ] Không tạo geometry/material liên tục theo frame.
- [ ] Không có WebGL context lost khi đổi quality nhiều lần.
- [ ] Resize màn hình không làm nhân đôi scene/object.
- [ ] Unmount/remount trang không để lại audio loop hoặc interval chạy nền.

## 8. Release gate

Chỉ release khi đạt các điều kiện tối thiểu:

- [ ] TypeScript pass.
- [ ] Production build pass.
- [ ] Low mode mobile không lag nặng.
- [ ] Fallback 2D hoạt động.
- [ ] Không có crash WebGL/iOS.
- [ ] Không có request asset nặng ngoài budget ở initial load.