# Hướng Dẫn Dành Cho Admin: Quản Lý Giải Đấu 48 Quốc Gia (World Cup 2026 Format)

Chào mừng bạn đến với tài liệu hướng dẫn vận hành hệ thống **World Cup Yield Wars**. Tài liệu này mô phỏng kịch bản bạn phải tổ chức và quản lý một giải đấu khổng lồ với **48 quốc gia** tham dự (thể thức chính thức của World Cup 2026) thông qua các lệnh Smart Contract.

---

## 1. Tổng Quan Thể Thức 48 Đội

Tại giải đấu 48 đội, cấu trúc số lượng trận đấu sẽ khổng lồ hơn rất nhiều so với 32 đội truyền thống:
- **Vòng Bảng (Group Stage):** 12 bảng đấu (từ Bảng A đến Bảng L), mỗi bảng 4 đội. Tổng cộng có **72 trận đấu**.
- **Vòng Loại Trực Tiếp (Knockout Stage):** 
  - Vòng 32 đội (Round of 32): 16 trận.
  - Vòng 16 đội (Round of 16): 8 trận.
  - Tứ kết (Quarter-finals): 4 trận.
  - Bán kết (Semi-finals): 2 trận.
  - Tranh hạng 3: 1 trận.
  - Chung kết: 1 trận.
- **Tổng cộng toàn giải:** **104 trận đấu**.

---

## 2. Nguyên Tắc Cốt Lõi Của "Yield Wars"

Trước khi quản lý, bạn cần nắm rõ 2 quy tắc sinh tử của Smart Contract `WorldCupYieldWars.sol`:

1. **KHÔNG CÓ KẾT QUẢ HÒA:** GameFi Yield Wars hoạt động dựa trên việc "chém" (slash) 50% tiền của đội thua để thưởng cho đội thắng. Do đó, hàm `resolveMatch()` **bắt buộc phải có một đội thắng**. Nếu ngoài đời trận đấu hòa, Admin phải có bộ quy tắc Tie-breaker (Ví dụ: tính theo Penalty, thẻ phạt, hoặc tung đồng xu) để xác định người chiến thắng trong Game.
2. **Cờ `isElimination`:** Tham số này rất quan trọng khi khóa trận (`lockMatch`).
   - Nếu `false`: Đội thua chỉ bị mất 50% tiền, vẫn tiếp tục ở lại giải (Dùng cho Vòng Bảng).
   - Nếu `true`: Đội thua mất 50% tiền và bị GẠCH TÊN khỏi game (`status = 2` - Eliminated), không thể nhận thêm tiền cược mới (Dùng cho Vòng Knockout).

---

## 3. Các Bước Thao Tác Chi Tiết Cho Admin

Dưới đây là vòng đời của một mùa giải mà bạn phải thực hiện thông qua Admin Dashboard (hoặc gọi trực tiếp Contract).

### Bước 1: Khởi tạo dữ liệu (Trước khi giải bắt đầu)
- **Hành động:** Sử dụng hàm `addTeamsBatch()` để thêm toàn bộ 48 đội vào Smart Contract.
- **Dữ liệu cần chuẩn bị:** Danh sách 48 mảng bao gồm Tên (Ví dụ: `Vietnam`), Mã (Ví dụ: `VN`), Bảng đấu (`Group A`), và Màu sắc giao diện.
- **Lưu ý:** Smart Contract hỗ trợ tối đa 64 đội (biến `ABSOLUTE_MAX_TEAMS = 64`), nên việc thêm 48 đội là hoàn toàn hợp lệ. Bạn nên add theo từng đợt (ví dụ 12 đội một lần) để tránh lỗi Out-Of-Gas trên mạng blockchain.

### Bước 2: Mở cửa cho người chơi Stake (Bắt đầu mùa giải)
- **Hành động:** Gọi hàm `startTournament()`.
- **Cơ chế:** Kể từ thời điểm này, người chơi có thể nạp tiền ($BANMAO) để cược vào 48 quốc gia. Cơ chế Early Bird (Staker sớm được lợi nhiều hơn) sẽ bắt đầu đếm ngược.

### Bước 3: Quản lý Vòng Bảng (72 trận đấu)
Trong Vòng Bảng, các đội sẽ đá vòng tròn. Đội thua chỉ mất điểm (và bị slash 50%), nhưng chưa bị loại khỏi giải.
- **Trước mỗi trận đấu:**
  - Gọi hàm `lockMatch(teamA, teamB, isElimination = false)`.
  - Lúc này, Pool của 2 đội sẽ bị khóa (`locked = true`). Người chơi không thể Stake thêm hoặc Unstake khỏi 2 đội này.
- **Sau khi trận đấu kết thúc:**
  - Gọi hàm `resolveMatch(matchId, winningTeamId, feeBonusAmount)`.
  - **Trường hợp Hòa ngoài đời thực:** Bạn phải tự quyết định đội thắng (Ví dụ: Đội nào đá luân lưu thắng, hoặc đội nào ít thẻ vàng hơn) để truyền vào `winningTeamId`.
  - Sau lệnh này, 50% tiền của đội thua bị chém và chia cho những người cược đội thắng. Pool của 2 đội được mở khóa (`locked = false`).

### Bước 4: Quản lý Vòng Loại Trực Tiếp (Knockout Stage - 32 trận)
Kể từ Vòng 32 đội, đội nào thua sẽ phải xách vali về nước.
- **Trước mỗi trận đấu:**
  - Gọi hàm `lockMatch(teamA, teamB, isElimination = true)`.
  - **Lưu ý cực kỳ quan trọng:** Phải truyền tham số `isElimination = true` ở giai đoạn này.
- **Sau khi trận đấu kết thúc:**
  - Gọi hàm `resolveMatch(matchId, winningTeamId, feeBonusAmount)`.
  - Đội thua sẽ bị đổi trạng thái thành `Eliminated` (`status = 2`). Người chơi lỡ cược vào đội thua sẽ không bao giờ có thể Unstake hoặc nhận thưởng được nữa (Pool đã chết).

### Bước 5: Chung Kết & Kết Thúc Mùa Giải
- Trận Chung Kết cũng được quản lý như một trận Knockout bình thường (`isElimination = true`).
- Sau khi trận Chung Kết kết thúc và đã `resolveMatch`, bạn sẽ biết Đội Vô Địch (Champion).
- **Hành động:** Gọi hàm `resolveSeason(championTeamId)`.
- **Hiệu ứng:** 
  - Toàn bộ giải đấu chính thức đóng lại (`tournamentEnded = true`).
  - Quỹ thưởng khổng lồ tích lũy từ thu phí (`rewardPool`) sẽ được đổ toàn bộ cho những người chơi sống sót và cược đúng vào Đội Vô Địch.
  - Người chơi cược đội vô địch có thể Claim phần thưởng khổng lồ cuối cùng.

---

## 4. Lời Khuyên Quản Trị Hệ Thống (Ops Tips)

1. **Xử lý Fee Bonus (Bơm quỹ):** Trong quá trình `resolveMatch`, hàm có tham số `feeBonusAmount`. Nếu Admin thấy Pool phần thưởng của nền tảng đang quá nhiều, bạn có thể bơm một phần phí (Fee) vào trực tiếp cho đội thắng của trận đấu đó để kích thích người chơi cược mạnh hơn ở các trận sau.
2. **Kỷ luật thời gian:** Hãy `lockMatch` ít nhất 15-30 phút trước khi trận bóng thực tế lăn bóng để tránh tình trạng "cược gian lận" (người chơi xem tỷ số rồi mới nhảy vào Stake).
3. **Mùa giải mới:** Sau khi kết thúc mùa, bạn có thể gọi `startNewSeason()` để thiết lập lại toàn bộ dữ liệu, chuẩn bị cho một giải đấu khác mà không cần deploy lại Smart Contract mới!

Chúc bạn quản trị hệ thống World Cup Yield Wars thành công!
