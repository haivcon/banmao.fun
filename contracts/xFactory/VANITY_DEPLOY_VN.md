# Triển khai contract có đuôi đẹp qua xFactory

## Địa chỉ dùng lại

- Network: **X Layer mainnet, chain ID 196**, phí gas bằng OKB.
- Factory immutable: `0x3348ccD25887E8d5e82C098ff03647d8D94cc44d`.
- Owner lúc triển khai: `0x92809f2837f708163d375960063C8A3156fCeACb`.
- Thông số máy đọc được: `xlayer-mainnet.json` cạnh tài liệu này.
- Source đã verify trên OKX Explorer; verified không có nghĩa là audited.

Không deploy lại factory để tìm đuôi đẹp. Mine `userSalt` off-chain rồi gọi `deployCreate2` hoặc `deployCreate2AndCall` trên factory hiện có. Không dùng `deployCreate` để áp dụng salt đã mine.

## Công thức bắt buộc

```text
initCode = creationBytecode ++ ABI.encode(constructorArguments)
initCodeHash = keccak256(initCode)
effectiveSalt = keccak256(ABI.encode(actualCaller, userSalt))
address = last20bytes(keccak256(0xff ++ factory ++ effectiveSalt ++ initCodeHash))
```

- `actualCaller` là `msg.sender` trực tiếp gọi factory, không mặc định là owner. Nếu gọi qua Safe/multisig thì dùng địa chỉ Safe, không phải ví người ký.
- Dùng ABI encoding chuẩn cho `(address, bytes32)`, **không** dùng packed encoding ở bước effectiveSalt.
- Gửi **userSalt gốc** vào hàm deploy, không gửi effectiveSalt (factory tự hash).
- Constructor arguments là một phần của initcode. Thay compiler, optimizer, EVM target, metadata, library address, source hoặc arguments có thể đổi bytecode và làm kết quả mining cũ không còn đúng.
- `callData` initialization và native value không trực tiếp nằm trong công thức địa chỉ; vẫn phải cố định và kiểm tra chúng trước deploy.
- Chain ID không nằm trong công thức CREATE2 nhưng phải kiểm tra chain 196 trước gửi giao dịch.

## Quy trình cho lần triển khai tiếp theo

1. Chốt source, compiler/settings, library links và constructor arguments của contract con; tạo initcode hoàn chỉnh (không dùng runtime bytecode).
2. Xác định ví gọi trực tiếp. Kiểm tra `owner()` hoặc `operators(caller)`, `paused()`, chain ID và runtime hash của factory so với file JSON.
3. Chọn đuôi hexadecimal, ví dụ `8888`, `6666`, `abcd`. So sánh địa chỉ dạng lowercase để không nhầm checksum hoa/thường. Với đuôi n ký tự, trung bình cần khoảng `16^n` lần thử; không có bảo đảm thời gian hoàn thành.
4. Mine userSalt off-chain theo đúng công thức; không tốn gas cho các lần thử.
5. Lưu checkpoint gồm: chain ID, factory, actualCaller, suffix, userSalt, effectiveSalt, initCodeHash, địa chỉ dự đoán, initcode đầy đủ, compiler input/settings, constructor arguments, callData và constructor/initialization value. Nếu chưa tìm xong, lưu cả counter tiếp theo để tiếp tục tìm.
6. Đối chiếu kết quả với `predictCreate2Address(actualCaller, userSalt, initCodeHash)`. Kiểm tra `hasCode(predicted)`; không có code chưa bảo đảm deploy được vì còn nonce collision. Simulate giao dịch bằng đúng caller/value trước khi gửi.
7. Gọi `deployCreate2(userSalt, initCode)` nếu constructor hoàn tất setup. Nếu cần initialize, dùng `deployCreate2AndCall(userSalt, initCode, constructorValue, callData)` trong cùng giao dịch, tránh cửa sổ contract chưa được initialize. `callData` phải khác rỗng, `msg.value = constructorValue + initializationValue`.
8. Lưu transaction hash trước khi chờ xác nhận. Khi RPC lỗi, kiểm tra hash/receipt trước khi thử lại. Sau xác nhận, đối chiếu event `Deployed`, địa chỉ, runtime code, owner và trạng thái contract con; verify source riêng cho contract con.

## Cảnh báo ownership contract con

Constructor và initializer nhìn thấy **factory** là `msg.sender`. Truyền owner/admin/treasury của contract con tường minh. Không dùng constructor tự gán owner = msg.sender nếu không có cơ chế setup phù hợp: quyền có thể bị kẹt tại factory vì factory không có arbitrary-call escape hatch.

Không gửi tiền trước vào địa chỉ dự đoán chỉ vì tìm được đuôi đẹp. Factory không audit bytecode, không bảo đảm initialization đúng về nghiệp vụ và không thể cứu tài sản trong contract con.

## Các hàm tra cứu hữu ích

```text
computeEffectiveSalt(address deployer, bytes32 userSalt) -> bytes32
computeInitCodeHash(bytes initCode) -> bytes32
predictCreate2Address(address deployer, bytes32 userSalt, bytes32 initCodeHash) -> address
hasCode(address target) -> bool
getCodeHash(address target) -> bytes32
deployedBy(address target) -> bool
owner() -> address
operators(address caller) -> bool
paused() -> bool
```

`deployedBy` chỉ ghi nhận nguồn triển khai lịch sử, không chứng nhận contract còn sống hoặc an toàn. Không lưu private key trong checkpoint/tài liệu; dùng cơ chế ký và môi trường bí mật riêng.
