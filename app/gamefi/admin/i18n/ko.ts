export const ko = {
    title: "GameFi 관리자",
    subtitle: "게임 허브 관리",
    backToHub: "허브로 돌아가기",
    connectWallet: "관리 기능에 액세스하려면 지갑을 연결하세요",
    contractOwnerOnly: "🔒 계약 소유자만 액세스 가능",
    loading: "로딩 중...",
    success: "성공",
    error: "오류",
    save: "저장",
    update: "업데이트",
    processing: "처리 중...",
    current: "현재 값",
    default: "기본값",
    enabled: "활성화됨",
    disabled: "비활성화됨",

    common: {
        backendConfig: "백엔드 구성",
        smartContract: "스마트 계약 (소유자 전용)",
        contractParams: "계약 매개변수",
        adminView: "🛡️ 당신은 관리자입니다.",
        ownerView: "👑 당신은 계약 소유자입니다.",
        viewOnly: "👁️ 보기 전용 모드.",
        cooldown: "청구 쿨타임",
        cooldownLabel: "대기 시간 (초)",
        cooldownHint: "청구 사이의 시간 (기본 300초)"
    },

    tabs: {
        overview: "개요",
        snake: "스네이크 게임",
        rps: '가위바위보',
        slots: '슬롯머신',
        miner: '골드 마이너',
        fomo: 'FOMO 게임',
        admins: '관리자',
        logs: "로그",
        system: "시스템",
        pk: "BanMaoPK"
    },

    fomo: {
        title: "FOMO 게임 설정",
        titleV11: "(V11)",
        desc: "BanMaoFomo 게임 매개변수 관리",
        status: {
            title: "게임 상태",
            currentRound: "현재 라운드",
            jackpotPool: "잭팟 풀",
            timeRemaining: "남은 시간",
            softDeadline: "소프트 마감",
            hardDeadline: "하드 마감",
            totalAttacks: "총 공격 수",
            currentLeader: "리더",
            stakingAddr: "스테이킹 주소",
            gameStatus: "상태",
            isPaused: "⏸️ 일시 중지",
            isActive: "▶️ 활성",
            isEnded: "종료됨"
        },
        config: {
            title: "활성 구성 (V11)",
            attackCost: "공격 비용",
            softDuration: "소프트 지속 시간",
            hardDuration: "하드 지속 시간",
            timeDecreaseStep: "시간 감소 단계",
            maxAttacksPerRound: "라운드당 최대 공격",
            winnerPercent: "승자 %",
            topAttackersPercent: "상위 공격자 %",
            minAttacksForReward: "보상 최소 공격 수",
            claimExpiration: "청구 만료 시간",
            refreshBtn: "데이터 새로고침"
        },
        schedule: {
            title: "구성 변경 예약",
            note: "V11 참고:",
            noteDesc: "구성 변경은 예약되어 다음 라운드부터 적용됩니다.",
            attackCostLabel: "공격 비용 (BANMAO)",
            softDurationLabel: "소프트 지속 시간 (초)",
            hardDurationLabel: "하드 지속 시간 (초)",
            decreaseStepLabel: "감소 단계 (초)",
            maxAttacksLabel: "라운드당 최대 공격",
            minAttacksLabel: "보상 최소 공격 수",
            winnerPercentLabel: "승자 % (0-100)",
            topPercentLabel: "상위 공격자 % (0-100)",
            topPercentHint: "승자% + 상위% = 100이어야 함",
            claimExpirationLabel: "청구 만료 시간 (초)",
            submitBtn: "다음 라운드 예약"
        },
        pause: {
            title: "일시 중지 제어",
            desc: "게임을 일시 중지하거나 재개합니다. 중지 시 공격 또는 청구 불가.",
            pauseBtn: "게임 일시 중지",
            pauseConfirm: "중지하려면 놓으세요",
            resumeBtn: "게임 재개"
        },
        rescue: {
            title: "더스트 배포",
            desc: "초과 토큰을 스테이킹 주소로 전송합니다.",
            jackpotPool: "잭팟 풀",
            seedFund: "시드 펀드",
            totalVault: "총 금고",
            rescueBtn: "스테이킹으로 더스트 배포"
        },
        constants: {
            title: "V11 상수 (읽기 전용)",
            cooldownTime: "COOLDOWN_TIME",
            maxClaimBatch: "MAX_CLAIM_BATCH",
            maxTopAttackers: "MAX_TOP_ATTACKERS",
            precision: "PRECISION"
        }
    },


    overview: {
        title: "그래프 및 통계",
        claimsToday: "오늘 청구",
        thisHour: "이번 시간",
        uniquePlayers: "고유 플레이어",
        gameStatus: "게임 상태",
        active: "활성",
        maintenance: "점검 중",
        hourlySigned: "시간당 서명",
        hourlyCap: "시간당 한도",
        totalAdmins: "총 관리자"
    },

    snake: {
        title: "스네이크 설정",
        desc: "온체인 매개변수 (트랜잭션 필요)",
        stats: {
            title: '실시간 대시보드',
            poolBalance: '풀 잔액',
            totalDonated: '총 기부',
            totalDonors: '기부자',
            uniqueAddresses: '주소',
            hourlyUsage: '시간당 서명 사용량',
            currentHourLabel: '시간',
            currentConfig: '현재 설정',
            minClaim: '최소 청구',
            maxPerGame: '게임당 최대',
            dailyCap: '일일 한도',
            hourlyCap: '시간당 한도',
            minDonation: '최소 기부',
            signer: '서명자',
            refreshBtn: '모든 데이터 새로고침'
        },
        paused: '계약 일시 중지됨',
        running: '계약 실행 중',
        pauseHint: '일시 중지하면 claimReward와 donate가 비활성화됩니다',
        pauseBtn: '⏸ 일시 중지',
        unpauseBtn: '▶ 재개',
        minClaim: {
            label: "최소 청구 금액 ($BANMAO)",
            hint: "청구에 필요한 최소 토큰. 기본값: 100"
        },
        maxClaimPerGame: {
            label: "게임당 최대 청구 ($BANMAO)",
            hint: "한 게임에서 청구 가능한 최대 토큰. 기본값: 2,000"
        },
        minDonation: {
            label: "리더보드 최소 기부 ($BANMAO)",
            hint: "기부자 리더보드에 표시되는 최소 기부. 기본값: 10"
        },
        caps: {
            title: "속도 제한",
            desc: "청구할 수 있는 토큰 수 제한.",
            dailyPlayer: "일일 플레이어 한도",
            dailyHint: "지갑당 하루 최대. 기본값: 5,000",
            hourlySigner: "시간당 서명자 한도",
            hourlyHint: "시스템 시간당 최대. 기본값: 50,000",
            updateBtn: "한도 업데이트"
        },
        signer: {
            title: "서명자 설정",
            desc: "보상 서명에 사용되는 지갑.",
            current: "현재 서명자",
            newAddress: "새 서명자 주소",
            updateBtn: "서명자 업데이트",
            hint: "⚠️ 변경 후 .env의 SIGNER_PRIVATE_KEY를 업데이트하세요"
        },
        danger: {
            title: "위험 구역",
            desc: "경고: 이 작업은 되돌릴 수 없습니다!",
            currentOwner: "현재 소유자",
            transferInput: "소유권 이전",
            transferBtn: "이전",
            hint: "🔴 이전 후 제어권을 상실합니다!",
            emergencyTitle: "긴급 인출",
            emergencyTo: "수신 주소",
            emergencyAmount: "금액 ($BANMAO)",
            emergencyBtn: "🚨 인출",
            emergencyHint: "계약에서 지정된 주소로 $BANMAO 전송"
        },
        backend: {
            title: "백엔드 설정",
            desc: "서버 측 매개변수",
            ratio: "비율",
            ratioHint: "1 포인트 = X 토큰",
            ratioExample: "예시",
            points: "포인트",
            maxClaims: "시간당 최대 청구",
            maxClaimsHint: "플레이어당 시간당 최대 청구 요청 수",
            maxClaimsExample: "실제",
            claimsWord: "청구",
            cooldownWord: "대기",
            possibleWord: "가능",
            rateLimit: "청구 간 대기 시간 (초)",
            rateLimitHint: "두 번의 연속 청구 사이의 대기 시간 (초)",
            rateLimitExample: "플레이어가 대기해야 함",
            betweenClaims: "청구 사이"
        }
    },

    rps: {
        title: "RPS 설정",
        desc: "가위바위보 온체인",
        controls: "게임 제어",
        info: "RPS는 완전한 온체인 PvP입니다.",
        placeholder: "여기에 RPS 계약 통합 추가."
    },

    slots: {
        title: '슬롯 설정',
        desc: '승률, 비용 관리.',
    },
    miner: {
        title: '광부 설정',
        desc: '채굴률, 한도 관리.',
        backend: {
            title: '백엔드 구성',
            desc: '검증 규칙.',
            ratio: '난이도 비율',
            maxClaims: '시간당 최대 청구',
            rateLimit: '제한 창 (초)'
        },
        caps: {
            title: '글로벌 한도',
            desc: '배수 방지.',
            dailyPlayer: '일일 한도',
            hourlySigner: '시간당 한도',
            dailyHint: '플레이어당 일일 최대',
            hourlyHint: '시스템 시간당 최대',
            updateBtn: '업데이트'
        },
        minClaim: {
            label: '최소 청구',
            hint: '최소 BANMAO'
        },
        danger: {
            title: '위험',
            currentOwner: '소유자',
            transferInput: '이전 대상',
            transferBtn: '이전',
            hint: '경고: 취소 불가.'
        },
        signer: {
            title: '서명자 관리',
            current: '현재',
            newAddress: '새 주소',
            updateBtn: '업데이트',
            hint: '요청 승인.'
        }
    },
    admins: {
        title: "관리자 관리",
        desc: "백엔드 액세스 지갑 관리",
        addLabel: "지갑 추가",
        addBtn: "추가",
        currentList: "현재 관리자",
        noAdmins: "관리자 없음",
        remove: "제거",
        you: "(나)",
        infoTitle: "ℹ️ 정보",
        infoDesc: "관리자는 백엔드 설정을 수정할 수 있습니다."
    },

    logs: {
        title: "활동 로그",
        desc: "최근 작업",
        noLogs: "로그 없음"
    },

    system: {
        title: "시스템 설정",
        desc: "글로벌 구성",
        maintenance: {
            title: "점검 모드",
            status: "상태",
            on: "🔴 점검 중",
            active: "🟢 활성",
            enable: "활성화",
            disable: "비활성화",
            messageLabel: "메시지",
            messagePlaceholder: "서버 점검 중...",
            warningTitle: "⚠️ 경고",
            warningDesc: "모든 청구를 차단합니다."
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
