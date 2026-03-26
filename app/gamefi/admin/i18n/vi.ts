export const vi = {
    title: "Quản Trị GameFi",
    subtitle: "Trung tâm quản lý & Cấu hình các trò chơi",
    backToHub: "Về Trang Chủ",
    connectWallet: "Vui lòng kết nối ví để truy cập quyền quản trị",
    contractOwnerOnly: "🔒 Chỉ chủ sở hữu hợp đồng (Owner) mới có quyền truy cập khu vực này",
    loading: "Đang tải dữ liệu...",
    success: "Thao tác thành công!",
    error: "Đã xảy ra lỗi",
    save: "Lưu Cấu Hình",
    update: "Cập Nhật Ngay",
    processing: "Đang xử lý giao dịch...",
    current: "Giá trị hiện tại",
    default: "Mặc định hệ thống",
    enabled: "Đã bật",
    disabled: "Đã tắt",

    common: {
        backendConfig: "Cấu Hình Backend",
        smartContract: "Smart Contract (Dành Cho Owner)",
        contractParams: "Tham Số Smart Contract",
        adminView: "🛡️ Bạn đang đăng nhập với quyền Admin.",
        ownerView: "👑 Bạn là Chủ Sở Hữu (Owner) của hợp đồng.",
        viewOnly: "👁️ Chế độ Chỉ Xem (View Only).",
        cooldown: "Cài Đặt Thời Gian Chờ (Cooldown)",
        cooldownLabel: "Thời gian chờ (giây)",
        cooldownHint: "Thời gian bắt buộc phải đợi giữa 2 lần claim liên tiếp (Mặc định: 300s)"
    },

    tabs: {
        overview: "Tổng Quan & Chỉ Số",
        snake: "Cài Đặt Game Rắn",
        rps: 'Game Kéo Búa Bao',
        slots: 'Game Quay Số',
        miner: 'Game Đào Vàng',
        fomo: 'Game FOMO (Mới)',
        admins: 'Quản Lý Admin',
        logs: "Nhật Ký Hệ Thống",
        system: "Cấu Hình Chung",
        pk: "BanMaoPK"
    },

    overview: {
        title: "Bảng Thống Kê & Hiệu Suất",
        claimsToday: "Lượt Nhận Thưởng (24h)",
        thisHour: "Lượt Nhận Giờ Này",
        uniquePlayers: "Người Chơi (Active)",
        gameStatus: "Trạng Thái Hệ Thống",
        active: "🟢 Đang Hoạt Động",
        maintenance: "🔴 Đang Bảo Trì",
        hourlySigned: "Token Đã Ký (Giờ)",
        hourlyCap: "Giới Hạn Ký (Giờ)",
        totalAdmins: "Số Lượng Admin"
    },

    fomo: {
        title: "Cài Đặt Game FOMO",
        titleV11: "(V11)",
        desc: "Quản lý toàn bộ thông số của game BanMaoFomo (kiểu chơi FOMO3D).",
        status: {
            title: "Trạng Thái Game Hiện Tại",
            currentRound: "Vòng Chơi (#ID)",
            jackpotPool: "Quỹ Jackpot ($BANMAO)",
            timeRemaining: "Thời Gian Còn Lại",
            softDeadline: "Hạn Chót Mềm",
            hardDeadline: "Hạn Chót Cứng",
            totalAttacks: "Tổng Số Lượt Mua",
            currentLeader: "Người Dẫn Đầu",
            stakingAddr: "Địa Chỉ Staking",
            gameStatus: "Trạng Thái",
            isPaused: "⏸️ TẠM DỪNG",
            isActive: "▶️ ĐANG CHẠY",
            isEnded: "Đã Kết Thúc"
        },
        config: {
            title: "Cấu Hình Hiện Tại (V11)",
            attackCost: "Chi Phí Tấn Công",
            softDuration: "Thời Gian Soft",
            hardDuration: "Thời Gian Hard",
            timeDecreaseStep: "Bước Giảm Thời Gian",
            maxAttacksPerRound: "Tấn Công Tối Đa/Vòng",
            winnerPercent: "% Người Thắng",
            topAttackersPercent: "% Top Attackers",
            minAttacksForReward: "Tấn Công Tối Thiểu Để Nhận Thưởng",
            claimExpiration: "Hết Hạn Claim",
            refreshBtn: "🔄 Làm Mới Dữ Liệu"
        },
        schedule: {
            title: "Lên Lịch Thay Đổi Cấu Hình",
            note: "Lưu ý V11:",
            noteDesc: "Các thay đổi cấu hình được lên lịch và sẽ áp dụng từ vòng tiếp theo, không phải ngay lập tức.",
            attackCostLabel: "Chi Phí Tấn Công (BANMAO)",
            softDurationLabel: "Thời Gian Soft (giây)",
            hardDurationLabel: "Thời Gian Hard (giây)",
            decreaseStepLabel: "Bước Giảm (giây)",
            maxAttacksLabel: "Tấn Công Tối Đa/Vòng",
            minAttacksLabel: "Tấn Công Tối Thiểu Để Nhận Thưởng",
            winnerPercentLabel: "% Người Thắng (0-100)",
            topPercentLabel: "% Top Attackers (0-100)",
            topPercentHint: "Winner% + Top% phải bằng 100",
            claimExpirationLabel: "Hết Hạn Claim (giây)",
            submitBtn: "Lên Lịch Cấu Hình Cho Vòng Tiếp Theo"
        },
        pause: {
            title: "Điều Khiển Tạm Dừng",
            desc: "Tạm dừng hoặc tiếp tục game. Khi tạm dừng, không thể tấn công hoặc claim.",
            pauseBtn: "Tạm Dừng Game",
            pauseConfirm: "Thả Để Tạm Dừng",
            resumeBtn: "Tiếp Tục Game"
        },
        rescue: {
            title: "Phân Phối Dust",
            desc: "Gửi token dư thừa (không thuộc jackpot, seed hoặc vault) đến địa chỉ staking.",
            jackpotPool: "Quỹ Jackpot",
            seedFund: "Quỹ Hạt Giống",
            totalVault: "Tổng Vault",
            rescueBtn: "Phân Phối Dust Về Staking"
        },
        constants: {
            title: "Hằng Số V11 (Chỉ Đọc)",
            cooldownTime: "COOLDOWN_TIME",
            maxClaimBatch: "MAX_CLAIM_BATCH",
            maxTopAttackers: "MAX_TOP_ATTACKERS",
            precision: "PRECISION"
        }
    },


    snake: {
        title: "Cài Đặt Game Rắn Săn Mồi",
        desc: "Thiết lập các tham số On-chain. Các thay đổi sẽ tạo giao dịch trên Blockchain.",
        stats: {
            title: 'Bảng Theo Dõi Trực Tiếp',
            poolBalance: 'Quỹ Thưởng',
            totalDonated: 'Tổng Đã Donate',
            totalDonors: 'Nhà Tài Trợ',
            uniqueAddresses: 'địa chỉ',
            hourlyUsage: 'Mức Dùng Signer/Giờ',
            currentHourLabel: 'Giờ',
            currentConfig: 'Cấu Hình Đang Áp Dụng',
            minClaim: 'Tối Thiểu',
            maxPerGame: 'Tối Đa/Ván',
            dailyCap: 'Hạn Ngày',
            hourlyCap: 'Hạn Giờ',
            minDonation: 'Donate Tối Thiểu',
            signer: 'Signer',
            refreshBtn: 'Làm Mới Dữ Liệu'
        },
        paused: 'Hợp Đồng TẠM DỪNG',
        running: 'Hợp Đồng ĐANG CHẠY',
        pauseHint: 'Tạm dừng sẽ vô hiệu claimReward và donate',
        pauseBtn: '⏸ Tạm Dừng',
        unpauseBtn: '▶ Tiếp Tục',
        minClaim: {
            label: "Ngưỡng Rút Tối Thiểu ($BANMAO)",
            hint: "Số token tối thiểu để được phép claim. Mặc định: 100"
        },
        maxClaimPerGame: {
            label: "Token Tối Đa Mỗi Ván ($BANMAO)",
            hint: "Số token tối đa claim được trong một ván chơi. Mặc định: 2,000"
        },
        minDonation: {
            label: "Donate Tối Thiểu Để Lên Bảng ($BANMAO)",
            hint: "Số token donate tối thiểu để được hiển thị trong bảng nhà tài trợ. Mặc định: 10"
        },
        caps: {
            title: "Giới Hạn An Toàn (Rate Limiting)",
            desc: "Hệ thống bảo vệ chống lạm phát. Cần cập nhật cả 2 chỉ số cùng lúc.",
            dailyPlayer: "Giới Hạn Rút/Ví/Ngày ($BANMAO)",
            dailyHint: "Token tối đa một ví được nhận trong 24 giờ. Mặc định: 5,000",
            hourlySigner: "Giới Hạn Toàn Hệ Thống/Giờ",
            hourlyHint: "Token tối đa hệ thống phát ra trong 1 giờ. Mặc định: 50,000",
            updateBtn: "Cập Nhật Giới Hạn"
        },
        signer: {
            title: "Cấu Hình Ví Signer",
            desc: "Địa chỉ ví ký xác thực yêu cầu rút thưởng.",
            current: "Signer Hiện Tại",
            newAddress: "Địa Chỉ Signer Mới",
            updateBtn: "Cập Nhật Signer",
            hint: "⚠️ Sau khi đổi, phải cập nhật SIGNER_PRIVATE_KEY trong .env"
        },
        danger: {
            title: "Vùng Nguy Hiểm",
            desc: "Các hành động không thể hoàn tác!",
            currentOwner: "Chủ Sở Hữu Hiện Tại",
            transferInput: "Chuyển Quyền Sở Hữu",
            transferBtn: "Chuyển Quyền",
            hint: "🔴 SAU KHI CHUYỂN, BẠN MẤT QUYỀN QUẢN TRỊ!",
            emergencyTitle: "Rút Khẩn Cấp",
            emergencyTo: "Địa Chỉ Nhận",
            emergencyAmount: "Số Lượng ($BANMAO)",
            emergencyBtn: "🚨 Rút Ngay",
            emergencyHint: "Gửi $BANMAO từ hợp đồng đến địa chỉ chỉ định"
        },
        backend: {
            title: "Cấu Hình Backend",
            desc: "Tham số server-side, không tốn gas.",
            ratio: "Tỷ Lệ Quy Đổi (Điểm → Token)",
            ratioHint: "1 điểm = X token",
            ratioExample: "Ví dụ",
            points: "điểm",
            maxClaims: "Tần Suất Claim Tối Đa",
            maxClaimsHint: "Số lần claim tối đa mỗi người chơi mỗi giờ",
            maxClaimsExample: "Thực tế",
            claimsWord: "lần claim",
            cooldownWord: "chờ",
            possibleWord: "có thể",
            rateLimit: "Thời Gian Chờ Giữa Các Lần Claim (giây)",
            rateLimitHint: "Thời gian chờ tính bằng giây giữa 2 lần claim liên tiếp",
            rateLimitExample: "Người chơi phải chờ",
            betweenClaims: "giữa các lần claim"
        }
    },

    rps: {
        title: "Cài Đặt Game Kéo Búa Bao",
        desc: "Quản lý trò chơi PvP On-chain Kéo Búa Bao.",
        controls: "Bảng Điều Khiển RPS",
        info: "RPS là trò chơi đối kháng trực tiếp (PvP) hoàn toàn trên chuỗi. Các tham số như phí tham gia, tỷ lệ thắng được cố định hoặc quản lý trực tiếp qua Smart Contract.",
        placeholder: "Hiện tại module quản lý RPS chưa có cấu hình động. Vui lòng thao tác trực tiếp trên Etherscan nếu cần thay đổi logic cốt lõi."
    },

    slots: {
        title: 'Cài Đặt Game Quay Số (Slots)',
        desc: 'Quản lý máy quay may mắn: Tỷ lệ thắng, chi phí quay và cấu hình giải thưởng.',
        // ... giữ nguyên hoặc mở rộng nếu cần
    },

    miner: {
        title: 'Cài Đặt Game Đào Vàng (Miner)',
        desc: 'Quản lý hệ thống đào khoáng sản: Tỷ lệ quy đổi, giới hạn rút và bảo mật.',
        backend: {
            title: 'Cấu Hình Backend (Logic)',
            desc: 'Thiết lập các quy tắc kiểm tra gian lận và quy đổi điểm phía máy chủ.',
            ratio: 'Hệ Số Khó (Difficulty Ratio)',
            ratioHint: 'Mức độ khó để khai thác được vàng. Số càng cao = càng khó đào được token (nhận ít token hơn cho cùng lượng ' + 'vàng).',
            maxClaims: 'Giới Hạn Số Lần Nhận (Per Hour)',
            maxClaimsHint: 'Số yêu cầu claim tối đa cho phép trong một giờ.',
            rateLimit: 'Thời Gian Hồi Chiêu (Cooldown)',
            rateLimitHint: 'Thời gian (giây) phải chờ giữa các lần claim.'
        },
        caps: {
            title: 'Giới Hạn Bảo Mật (Safety Caps)',
            desc: 'Các giới hạn cứng để bảo vệ quỹ thưởng khỏi việc bị rút cạn (Drain Protection).',
            dailyPlayer: 'Giới Hạn Cá Nhân (Ngày)',
            hourlySigner: 'Giới Hạn Hệ Thống (Giờ)',
            dailyHint: 'Tổng số $BANMAO tối đa một người chơi được phép rút trong 24 giờ.',
            hourlyHint: 'Tổng số $BANMAO tối đa toàn bộ hệ thống được phép xuất ra trong 1 giờ.',
            updateBtn: 'Lưu Giới Hạn Mới'
        },
        minClaim: {
            label: 'Ngưỡng Rút Tối Thiểu',
            hint: 'Số lượng $BANMAO tối thiểu cần tích lũy mới được phép thực hiện lệnh rút.'
        },
        danger: {
            title: 'Chuyển Quyền Sở Hữu',
            currentOwner: 'Chủ Sở Hữu Hiện Tại',
            transferInput: 'Địa Chỉ Ví Mới',
            transferBtn: 'Xác Nhận Chuyển Quyền',
            hint: '⚠️ CẢNH BÁO: Bạn sẽ mất quyền kiểm soát hợp đồng Miner sau thao tác này.'
        },
        signer: {
            title: 'Cấu Hình Người Ký (Signer)',
            current: 'Ví Signer Hiện Tại',
            newAddress: 'Địa Chỉ Ví Signer Mới',
            updateBtn: 'Lưu Địa Chỉ Mới',
            hint: 'Signer là ví backend dùng để xác thực kết quả chơi game. Phải khớp với Private Key trên server.'
        }
    },

    admins: {
        title: "Quản Lý Đội Ngũ Admin",
        desc: "Phân quyền cho các ví phụ được phép truy cập Dashboard và sửa đổi cấu hình Backend.",
        addLabel: "Thêm Ví Admin Mới",
        addBtn: "Cấp Quyền Admin",
        currentList: "Danh Sách Admin Hiện Tại",
        noAdmins: "Chưa có admin phụ nào được thêm.",
        remove: "Xóa Quyền",
        you: "(Ví Của Bạn)",
        infoTitle: "ℹ️ Thông Tin Quan Trọng",
        infoDesc: "Các ví Admin trong danh sách này có quyền thay đổi cấu hình Backend (tỷ lệ, giới hạn...). Tuy nhiên, các thay đổi liên quan đến Smart Contract (On-chain) vẫn yêu cầu quyền Chủ Sở Hữu (Owner)."
    },

    logs: {
        title: "Nhật Ký Hoạt Động (Logs)",
        desc: "Lịch sử chi tiết các thay đổi cấu hình và tác vụ quan trọng của admin.",
        noLogs: "Chưa có dữ liệu nhật ký nào."
    },

    system: {
        title: "Cài Đặt Hệ Thống Toàn Cục",
        desc: "Quản lý trạng thái hoạt động chung của toàn bộ nền tảng GameFi.",
        maintenance: {
            title: "Chế Độ Bảo Trì (Maintenance Mode)",
            status: "Trạng Thái Hiện Tại",
            on: "🔴 ĐANG BẢO TRÌ (Game Đóng)",
            active: "🟢 ĐANG HOẠT ĐỘNG (Game Mở)",
            enable: "BẬT Chế Độ Bảo Trì",
            disable: "TẮT Chế Độ Bảo Trì",
            messageLabel: "Thông Báo Hiển Thị Cho User",
            messagePlaceholder: "Ví dụ: Hệ thống đang nâng cấp, vui lòng quay lại sau 15 phút...",
            warningTitle: "⚠️ Lưu Ý Quan Trọng",
            warningDesc: "Khi BẬT bảo trì: Người chơi sẽ không thể chơi game hoặc rút thưởng. Hãy sử dụng tính năng này khi bạn cần cập nhật contract hoặc sửa lỗi gấp."
        }
    },

    pk: {
        title: "Cài Đặt BanMaoPK",
        desc: "Quản lý Cấu hình Thử thách & Trận đấu BanMaoPK",
        config: {
            title: "Cấu Hình Hợp Đồng",
            minDeposit: "Cược Thử Thách Tối Thiểu ($BANMAO)",
            overtime: "Thời Gian Quá Hạn (giây)",
            shares: "Tỷ Lệ Phân Phối (Tổng phải bằng 100%)",
            updateBtn: "Cập Nhật Tỷ Lệ",
            setBtn: "Đặt",
            winner: "Thắng",
            loser: "Thua",
            voters: "Voter",
            burn: "Burn",
            treasury: "Quỹ"
        },
        matches: {
            title: "Quản Lý Trận Đấu",
            create: "Tạo Trận Đấu Admin",
            player1: "Người Chơi 1",
            player2: "Người Chơi 2",
            duration: "Thời Lượng (giờ)",
            createBtn: "Tạo Trận Đấu",
            forceCancel: "Hủy Trận Bị Kẹt (Force Cancel)",
            matchId: "Mã Trận Đấu (Match ID)",
            cancelBtn: "Hủy Trận Đấu",
            cancelHint: "Hoàn tiền cho tất cả người tham gia. Chỉ hoạt động với trận đấu cũ hơn 3 ngày."
        },
        recover: {
            title: "Cứu Hộ Token",
            desc: "Rút token ERC20 bị kẹt (trừ token BANMAO)",
            token: "Địa Chỉ Token",
            amount: "Số Lượng",
            recoverBtn: "Thu Hồi",
            warning: "Không thể rút token BANMAO (token dùng để staking)."
        },
        status: {
            currentMatchId: "ID Trận Hiện Tại",
            pendingWinnings: "Tiền Thắng Đang Chờ"
        }
    }
};
