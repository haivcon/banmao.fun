export const zh = {
    title: "GameFi 管理后台",
    subtitle: "管理您的游戏中心",
    backToHub: "返回大厅",
    connectWallet: "请连接钱包以访问管理功能",
    contractOwnerOnly: "🔒 仅限合约拥有者访问",
    loading: "加载中...",
    success: "操作成功",
    error: "错误",
    save: "保存",
    update: "更新",
    processing: "处理中...",
    current: "当前值",
    default: "默认",
    enabled: "已启用",
    disabled: "已禁用",

    common: {
        backendConfig: "后端配置",
        smartContract: "智能合约 (仅限拥有者)",
        contractParams: "智能合约参数",
        adminView: "🛡️ 您是管理员。",
        ownerView: "👑 您是合约拥有者。",
        viewOnly: "👁️ 仅查看模式。",
        cooldown: "领取冷却",
        cooldownLabel: "冷却时间 (秒)",
        cooldownHint: "领取之间的等待时间 (默认 300秒)"
    },

    tabs: {
        overview: "概览",
        snake: "贪吃蛇",
        rps: '石头剪刀布',
        slots: '老虎机',
        miner: '黄金矿工',
        fomo: 'FOMO 游戏',
        admins: '管理员',
        logs: "日志",
        system: "系统",
        pk: "BanMaoPK"
    },

    fomo: {
        title: "FOMO 游戏设置",
        titleV11: "(V11)",
        desc: "管理 BanMaoFomo 游戏参数",
        status: {
            title: "游戏状态",
            currentRound: "当前轮次",
            jackpotPool: "奖池",
            timeRemaining: "剩余时间",
            softDeadline: "软截止时间",
            hardDeadline: "硬截止时间",
            totalAttacks: "总攻击数",
            currentLeader: "领先者",
            stakingAddr: "质押地址",
            gameStatus: "状态",
            isPaused: "⏸️ 已暂停",
            isActive: "▶️ 运行中",
            isEnded: "已结束"
        },
        config: {
            title: "当前配置 (V11)",
            attackCost: "攻击成本",
            softDuration: "软持续时间",
            hardDuration: "硬持续时间",
            timeDecreaseStep: "时间减少步长",
            maxAttacksPerRound: "每轮最大攻击数",
            winnerPercent: "胜者 %",
            topAttackersPercent: "Top攻击者 %",
            minAttacksForReward: "获奖最小攻击数",
            claimExpiration: "领取到期时间",
            refreshBtn: "刷新数据"
        },
        schedule: {
            title: "计划配置更改",
            note: "V11 提示:",
            noteDesc: "配置更改将被计划并从下一轮开始应用，不是立即生效。",
            attackCostLabel: "攻击成本 (BANMAO)",
            softDurationLabel: "软持续时间 (秒)",
            hardDurationLabel: "硬持续时间 (秒)",
            decreaseStepLabel: "减少步长 (秒)",
            maxAttacksLabel: "每轮最大攻击数",
            minAttacksLabel: "获奖最小攻击数",
            winnerPercentLabel: "胜者 % (0-100)",
            topPercentLabel: "Top攻击者 % (0-100)",
            topPercentHint: "胜者% + Top% 必须等于 100",
            claimExpirationLabel: "领取到期时间 (秒)",
            submitBtn: "为下一轮计划配置"
        },
        pause: {
            title: "暂停控制",
            desc: "暂停或恢复游戏。暂停时，无法攻击或领取。",
            pauseBtn: "暂停游戏",
            pauseConfirm: "释放以暂停",
            resumeBtn: "恢复游戏"
        },
        rescue: {
            title: "分发粉尘",
            desc: "将多余代币（不属于奖池、种子基金或金库）发送到质押地址。",
            jackpotPool: "奖池",
            seedFund: "种子基金",
            totalVault: "总金库",
            rescueBtn: "分发粉尘到质押"
        },
        constants: {
            title: "V11 常量 (只读)",
            cooldownTime: "COOLDOWN_TIME",
            maxClaimBatch: "MAX_CLAIM_BATCH",
            maxTopAttackers: "MAX_TOP_ATTACKERS",
            precision: "PRECISION"
        }
    },


    overview: {
        title: "图表与统计",
        claimsToday: "今日领取",
        thisHour: "本小时",
        uniquePlayers: "独立玩家",
        gameStatus: "游戏状态",
        active: "运行中",
        maintenance: "维护中",
        hourlySigned: "每小时签名",
        hourlyCap: "每小时上限",
        totalAdmins: "管理员总数"
    },

    snake: {
        title: "贪吃蛇设置",
        desc: "链上参数 (需要交易)",
        stats: {
            title: '实时仪表盘',
            poolBalance: '奖池余额',
            totalDonated: '总捐赠',
            totalDonors: '捐赠者',
            uniqueAddresses: '地址',
            hourlyUsage: '每小时签名用量',
            currentHourLabel: '小时',
            currentConfig: '当前配置',
            minClaim: '最小领取',
            maxPerGame: '每局最大',
            dailyCap: '每日上限',
            hourlyCap: '每小时上限',
            minDonation: '最小捐赠',
            signer: '签名者',
            refreshBtn: '刷新所有数据'
        },
        paused: '合约已暂停',
        running: '合约运行中',
        pauseHint: '暂停将禁用 claimReward 和 donate',
        pauseBtn: '⏸ 暂停',
        unpauseBtn: '▶ 恢复',
        minClaim: {
            label: "最小领取金额 ($BANMAO)",
            hint: "领取所需的最小代币数。默认：100"
        },
        maxClaimPerGame: {
            label: "每局最大领取 ($BANMAO)",
            hint: "单局游戏可领取的最大代币数。默认：2,000"
        },
        minDonation: {
            label: "最小上榜捐赠 ($BANMAO)",
            hint: "出现在捐赠排行榜的最小捐赠额。默认：10"
        },
        caps: {
            title: "速率限制",
            desc: "限制可领取的代币数量。",
            dailyPlayer: "每日玩家上限 ($BANMAO)",
            dailyHint: "每个钱包每天最大领取量。默认：5,000",
            hourlySigner: "每小时签名上限 ($BANMAO)",
            hourlyHint: "系统每小时最大签名量。默认：50,000",
            updateBtn: "更新上限"
        },
        signer: {
            title: "签名者设置",
            desc: "用于签名领取奖励的钱包地址。",
            current: "当前签名者",
            newAddress: "新签名者地址",
            updateBtn: "更新签名者",
            hint: "⚠️ 更改后，请更新 .env 中的 SIGNER_PRIVATE_KEY"
        },
        danger: {
            title: "危险区域",
            desc: "警告：这些操作不可逆！",
            currentOwner: "当前拥有者",
            transferInput: "转移所有权",
            transferBtn: "转移",
            hint: "🔴 转移后，您将失去合约控制权！",
            emergencyTitle: "紧急提取",
            emergencyTo: "接收地址",
            emergencyAmount: "数量 ($BANMAO)",
            emergencyBtn: "🚨 提取",
            emergencyHint: "从合约发送 $BANMAO 到指定地址"
        },
        backend: {
            title: "后端设置",
            desc: "服务器端参数",
            ratio: "积分兑换比率",
            ratioHint: "1 积分 = X 代币",
            ratioExample: "示例",
            points: "积分",
            maxClaims: "每小时最大领取次数",
            maxClaimsHint: "每位玩家每小时最大领取请求数",
            maxClaimsExample: "实际",
            claimsWord: "次领取",
            cooldownWord: "冷却",
            possibleWord: "可能",
            rateLimit: "领取冷却时间 (秒)",
            rateLimitHint: "两次连续领取之间的等待时间（秒）",
            rateLimitExample: "玩家需等待",
            betweenClaims: "才能再次领取"
        }
    },

    rps: {
        title: "RPS 游戏设置",
        desc: "石头剪刀布链上游戏",
        controls: "游戏控制",
        info: "RPS 是完全链上的 PvP 游戏。",
        placeholder: "在此添加 RPS 合约集成。"
    },

    slots: {
        title: '老虎机设置',
        desc: '管理老虎机胜率、成本和视觉效果。',
    },
    miner: {
        title: '黄金矿工设置',
        desc: '管理挖掘率、上限和冷却。',
        backend: {
            title: '后端配置',
            desc: '配置服务器端验证规则。',
            ratio: '难度系数',
            maxClaims: '每小时领取上限',
            rateLimit: '速率限制窗口 (秒)'
        },
        caps: {
            title: '全局限制',
            desc: '防止合约耗尽的安全上限。',
            dailyPlayer: '每日玩家上限 (BANMAO)',
            hourlySigner: '每小时全局上限 (BANMAO)',
            dailyHint: '单玩家每日最大领取量',
            hourlyHint: '签名者每小时最大授权量',
            updateBtn: '更新上限'
        },
        minClaim: {
            label: '最小领取金额',
            hint: '领取奖励所需的最小 BANMAO'
        },
        danger: {
            title: '危险区域',
            currentOwner: '当前拥有者',
            transferInput: '转移所有权给',
            transferBtn: '转移所有权',
            hint: '警告：此操作无法撤销。'
        },
        signer: {
            title: '签名者管理',
            current: '当前签名者',
            newAddress: '新签名者地址',
            updateBtn: '更新签名者',
            hint: '签名者授权所有清理请求。'
        }
    },
    admins: {
        title: "管理员管理",
        desc: "管理可访问后端配置的钱包地址",
        addLabel: "添加管理员钱包",
        addBtn: "添加管理员",
        currentList: "当前管理员",
        noAdmins: "暂无管理员",
        remove: "移除",
        you: "(您)",
        infoTitle: "ℹ️ 关于管理员钱包",
        infoDesc: "管理员钱包可以修改后端配置。只有合约拥有者可以添加/移除管理员。"
    },

    logs: {
        title: "活动日志",
        desc: "最近的管理员操作和系统事件",
        noLogs: "暂无活动日志"
    },

    system: {
        title: "系统设置",
        desc: "全局系统配置",
        maintenance: {
            title: "维护模式",
            status: "状态",
            on: "🔴 维护中",
            active: "🟢 运行中",
            enable: "启用维护",
            disable: "禁用维护",
            messageLabel: "维护消息",
            messagePlaceholder: "服务器正在维护中...",
            warningTitle: "⚠️ 警告",
            warningDesc: "启用维护模式将阻止所有领取请求。"
        }
    },

    pk: {
        title: "BanMaoPK Settings",
        desc: "Manage BanMaoPK Challenge & Match Configuration",
        config: {
            title: "Contract Configuration",
            minDeposit: "Min Challenge Deposit ($BANMAO)",
            overtime: "Overtime Duration (seconds)",
            shares: "Distribution Shares (must sum to 100%)",
            updateBtn: "Update Shares",
            setBtn: "Set",
            winner: "Winner",
            loser: "Loser",
            voters: "Voters",
            burn: "Burn",
            treasury: "Treasury"
        },
        matches: {
            title: "Match Management",
            create: "Create Admin Match",
            player1: "Player 1",
            player2: "Player 2",
            duration: "Duration (hours)",
            createBtn: "Create Match",
            forceCancel: "Force Cancel Stale Match",
            matchId: "Match ID",
            cancelBtn: "Cancel Match",
            cancelHint: "Refunds all participants. Only for matches older than 3 days."
        },
        recover: {
            title: "Recover Tokens",
            desc: "Recover stuck ERC20 tokens (excluding BANMAO)",
            token: "Token Address",
            amount: "Amount",
            recoverBtn: "Recover",
            warning: "Cannot recover BANMAO (staking token)."
        },
        status: {
            currentMatchId: "Current Match ID",
            pendingWinnings: "My Pending Winnings"
        }
    }
};
