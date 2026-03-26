// DeFi Admin i18n - Tiếng Việt
// Chú thích chi tiết cho tất cả chức năng quản trị hợp đồng staking

export const vi = {
    title: "Quản Trị Staking",
    subtitle: "Quản lý Hợp đồng Staking",
    backToHub: "Về DeFi Hub",
    connectWallet: "Kết nối ví để truy cập chức năng quản trị",
    contractOwnerOnly: "Chỉ chủ sở hữu hợp đồng mới có quyền truy cập",
    loading: "Đang tải...",
    success: "Thành công",
    error: "Lỗi",
    save: "Lưu",
    update: "Cập nhật",
    processing: "Đang xử lý...",
    current: "Hiện tại",
    default: "Mặc định",
    confirm: "Xác nhận",
    cancel: "Hủy",

    tabs: {
        overview: "Tổng quan",
        parameters: "Tham số",
        lockOptions: "Gói khóa",
        vipTiers: "Hạng VIP",
        funds: "Quỹ",
        system: "Hệ thống"
    },

    overview: {
        title: "Tổng Quan Hợp Đồng",
        desc: "Thống kê thời gian thực của hợp đồng staking",
        totalStaked: "Tổng Giá Trị Khóa (TVL)",
        totalStakedHint: "Tổng số token đang được stake bởi tất cả người dùng",
        totalShares: "Tổng Cổ Phần",
        totalSharesHint: "Tổng cổ phần của tất cả người dùng (số lượng × hệ số)",
        rewardPool: "Quỹ Thưởng",
        rewardPoolHint: "Token còn lại để phân phối phần thưởng",
        rewardRate: "Tốc Độ Thưởng",
        rewardRateHint: "Số token phân phối mỗi giây",
        devFees: "Phí Dev Tích Lũy",
        devFeesHint: "Phí đã thu, đang chờ rút",
        healthStatus: "Sức Khỏe Hợp Đồng",
        healthy: "✅ Bình thường",
        unhealthy: "⚠️ Cần kiểm tra",
        daysLeft: "Ngày Thưởng Còn Lại",
        daysLeftHint: "Số ngày ước tính cho đến khi hết quỹ thưởng",
        isPaused: "Trạng Thái",
        paused: "🔴 Đã tạm dừng",
        active: "🟢 Hoạt động"
    },

    parameters: {
        title: "Tham Số Staking",
        desc: "Cấu hình cài đặt staking chính (cần giao dịch blockchain)",

        rewardRate: {
            label: "Tốc Độ Thưởng (token/giây)",
            hint: "Số token phân phối làm phần thưởng mỗi giây cho tất cả stakers.",
            example: "📊 Ví dụ: 0.01 token/giây = 864 token/ngày = 25,920 token/tháng",
            recommend: "💡 Gợi ý: 0.005 - 0.05 tùy theo quỹ thưởng",
            impact: "⚠️ Ảnh hưởng: Cao hơn = hết quỹ nhanh hơn, thấp hơn = ít hấp dẫn người dùng",
            placeholder: "VD: 0.01"
        },
        minStake: {
            label: "Số Tiền Stake Tối Thiểu",
            hint: "Số token tối thiểu cần để stake. Ngăn spam và đảm bảo sự tham gia có ý nghĩa.",
            example: "📊 Ví dụ: 100 tokens = tối thiểu phải stake 100 tokens",
            recommend: "💡 Gợi ý: 1 - 100 tokens (tùy thuộc giá token)",
            impact: "⚠️ Ảnh hưởng: Cao quá = ít người tham gia được, thấp quá = nhiều dust stake",
            placeholder: "VD: 1"
        },
        maxStake: {
            label: "Stake Tối Đa Mỗi Ví",
            hint: "Giới hạn số lượng một ví có thể stake. Bảo vệ chống cá mập thao túng.",
            example: "📊 Ví dụ: 1,000,000 = mỗi ví tối đa stake 1 triệu token",
            recommend: "💡 Gợi ý: 5-10% tổng cung token",
            impact: "⚠️ Ảnh hưởng: Thấp quá = giới hạn người dùng lớn, cao quá = cá mập thao túng",
            placeholder: "VD: 1000000"
        },
        penalty: {
            label: "Phí Rút Sớm (phần vạn)",
            hint: "Phí phạt khi rút trước khi hết kỳ khóa. Tiền phạt vào quỹ thưởng.",
            example: "📊 Ví dụ: 1000 = 10% phí → Rút 10,000 tokens = mất 1,000 tokens phí",
            recommend: "💡 Gợi ý: 500-1500 (5%-15%)",
            impact: "⚠️ Ảnh hưởng: Cao quá = ít người dám stake, thấp quá = không khuyến khích khóa dài",
            conversion: "📐 Quy đổi: 100 = 1%, 500 = 5%, 1000 = 10%, 2500 = 25%, 5000 = 50% (max)",
            placeholder: "VD: 1000"
        },
        gracePeriod: {
            label: "Thời Gian Ân Hạn (giây)",
            hint: "Khoảng thời gian sau khi stake mà người dùng có thể rút không phí.",
            example: "📊 Ví dụ: 7200 = 2 giờ = người dùng có 2 giờ đổi ý không bị phạt",
            recommend: "💡 Gợi ý: 3600-7200 (1-2 giờ)",
            impact: "⚠️ Ảnh hưởng: Dài quá = người dùng lợi dụng, ngắn quá = không thân thiện",
            conversion: "📐 Quy đổi: 3600 = 1 giờ, 7200 = 2 giờ, 86400 = 1 ngày",
            placeholder: "VD: 7200"
        }
    },

    lockOptions: {
        title: "Cấu Hình Gói Khóa",
        desc: "Cấu hình kỳ hạn khóa và hệ số thưởng",

        optionId: "Mã Gói",
        days: "Số Ngày Khóa",
        daysHint: "Số ngày token bị khóa. 0 = linh hoạt (không khóa)",
        multiplier: "Hệ Số (phần vạn)",
        multiplierHint: "Hệ số cổ phần cho kỳ khóa này. 10000 = 1x, 12000 = 1.2x, 20000 = 2x",

        option0: "Linh hoạt (Không khóa)",
        option1: "Khóa 30 Ngày",
        option2: "Khóa 90 Ngày",
        option3: "Khóa 180 Ngày",

        updateBtn: "Cập Nhật Gói Khóa"
    },

    vipTiers: {
        title: "Cấu Hình Hạng VIP",
        desc: "Cấu hình các hạng VIP dựa trên số tiền stake",

        tierName: "Tên Hạng",
        tierNameHint: "Tên hiển thị cho hạng VIP này (VD: ĐỒNG, VÀNG, KIM CƯƠNG)",
        minAmount: "Số Tiền Tối Thiểu",
        minAmountHint: "Số stake tối thiểu cần để đạt hạng này",

        addTier: "Thêm Hạng",
        removeTier: "Xóa",
        updateBtn: "Lưu Tất Cả Hạng",

        warning: "⚠️ Thao tác này sẽ thay thế TẤT CẢ các hạng VIP hiện có!"
    },

    funds: {
        title: "Quản Lý Quỹ",
        desc: "Quản lý quỹ thưởng và phí tích lũy",

        donate: {
            label: "Thêm Vào Quỹ Thưởng",
            hint: "Nạp token vào quỹ thưởng để phân phối cho người stake",
            placeholder: "Số lượng muốn donate",
            btn: "Donate Token"
        },
        withdrawDev: {
            label: "Rút Phí Dev",
            hint: "Rút phí developer đã tích lũy về ví dev",
            current: "Phí Tích Lũy",
            btn: "Rút Phí Dev"
        },
        withdrawDust: {
            label: "Rút Token Dư",
            hint: "Rút bất kỳ token dư thừa không được tính (số dư hợp đồng - TVL - thưởng - phí dev)",
            current: "Token Dư Có Sẵn",
            btn: "Rút Token Dư"
        }
    },

    system: {
        title: "Điều Khiển Hệ Thống",
        desc: "Điều khiển khẩn cấp và quản lý hợp đồng",

        pause: {
            title: "Tạm Dừng Khẩn Cấp",
            desc: "Tạm dừng/tiếp tục hoạt động staking",
            status: "Trạng Thái Hiện Tại",
            pauseBtn: "🛑 Tạm Dừng Hợp Đồng",
            unpauseBtn: "▶️ Tiếp Tục Hoạt Động",
            warning: "⚠️ Tạm dừng sẽ chặn tất cả hoạt động stake/unstake/compound!"
        },

        ownership: {
            title: "Quyền Sở Hữu Hợp Đồng",
            currentOwner: "Chủ Sở Hữu Hiện Tại",
            transferHint: "⚠️ NGUY HIỂM: Chuyển quyền sở hữu là không thể hoàn tác!",
            transfer: "Chuyển Quyền Sở Hữu"
        },

        contractInfo: {
            title: "Thông Tin Hợp Đồng",
            address: "Địa Chỉ Hợp Đồng",
            token: "Token Staking",
            devWallet: "Ví Dev",
            devFee: "Phí Dev (%)"
        }
    }
};
