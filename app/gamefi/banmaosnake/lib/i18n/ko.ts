import { SnakeStrings } from './types';

export const ko: SnakeStrings = {
    // Menu
    title: 'banmao+Snake',
    subtitle: '🎮 토큰 헌터 스네이크 • X Layer GameFi',
    startBtn: '시작',
    spaceHint: '(스페이스)',

    // Legend
    legendCoin: '+10점',
    legendXLayer: '+50 X Layer',
    legendObstacle: '피하기!',

    // HUD
    score: '점수',
    best: '최고',
    gas: '가스',
    time: '시간',
    pause: '일시정지',
    resume: '재개',

    // Pause screen
    pauseTitle: '일시정지',
    continueBtn: '계속',
    menuBtn: '메뉴',

    // Game over
    gameOverTitle: '게임 오버',
    scoreLabel: '점수',
    claimBtn: '받기',
    playAgainBtn: '다시 플레이',
    needMorePoints: '{0}점 더 필요 (최소 {1})',

    // Claim states
    processing: '처리 중...',
    claimSuccess: '🎉 보상 수령 성공!',
    cancelledTx: '거래 취소됨',

    // Errors
    errGas: '⛽ OKB 부족',
    errMinClaim: '📊 최소 미달 ({0})',
    errDailyLimit: '📅 일일 한도 도달',
    errSystemLimit: '⏰ 시스템 과부하',
    errSignature: '🔐 서명 무효',
    errFailed: '❌ 거래 실패',

    // Stats panel
    statsTitle: '통계',
    balance: '잔액',
    poolBalance: '보상풀',
    minClaim: '최소 인출',
    systemLimit: '시스템 한도/시간',
    systemLimitDesc: '풀 보호',
    playerLimit: '내 한도/일',
    playerLimitDesc: '반파밍',
    maxPerGame: '게임당 최대',
    minDonation: '최소 기부',

    // Wallet
    connectWallet: '지갑 연결',
    connectToPlay: '연결하여 플레이',

    // Pool low warning
    poolLowTitle: '⚠️ 보상풀 부족!',
    poolLowMsg: '보상풀 잔액이 한도에 도달했습니다. 게임 운영을 위해 후원이 필요합니다.',
    donateBtn: '$BANMAO 기부',

    // Stats tooltips
    balanceTooltip: '지갑에 있는 $BANMAO 토큰 잔액',
    poolTooltip: '보상풀의 총 토큰 수량. 보상 수령 시 이 풀에서 토큰이 전송됩니다.',
    minClaimTooltip: '보상을 수령하기 위한 최소 점수. 이 기준 미달 시 인출 불가.',
    maxPerGameTooltip: '게임당 받을 수 있는 최대 토큰. 초과 시 제한됩니다.',
    minDonationTooltip: '기부자 리더보드에 표시되기 위한 최소 기부액.',
    claimFrequency: '클레임 빈도',
    claimFrequencyTooltip: '플레이어당 시간당 최대 클레임 횟수.',
    claimCooldown: '대기 시간',
    claimCooldownTooltip: '연속 클레임 사이 대기 시간(초).',
    systemLimitTooltip: '모든 플레이어가 시간당 수령 가능한 최대 토큰. 풀 보호용.',
    playerLimitTooltip: '하루에 수령 가능한 최대 토큰. 파밍 방지 및 공정한 분배 보장.',

    // Community section
    communityTitle: '🌍 커뮤니티 지원',
    communitySubtitle: '$BANMAO를 전 세계에 전파하세요',
    communityDonateMsg: '플레이어 보상을 유지하기 위해 풀에 $BANMAO를 보내세요. 게임을 하고 점수를 얻지 않으면 아무도 인출할 수 없습니다.',
    communitySecurityTitle: '보안 및 투명성',
    communityFeature1: 'EIP-712 + Nonce: 위조 및 재생 공격 방지',
    communityFeature2: '시간/일일 한도: 봇 및 해킹으로부터 풀 보호',
    communityFeature3: '오픈 소스: 100% 투명한 검증된 코드',
    // Security Technologies
    secTechTitle: '🛡️ 활성 보안 기술',
    secTech1: '🔐 EIP-712 서명: 모든 청구에 대한 암호학적 증명',
    secTech2: '🔑 HMAC 타임스탬프: 서버 인증 게임 타이밍',
    secTech3: '🧮 점수 체크섬: SHA-256 점수 무결성 검증',
    secTech4: '⏱️ 세션 시스템: 일회용 게임 세션',
    secTech5: '🛡️ 봇 방지: 이동 타이밍 분산 분석(CoV)',
    secTech6: '🔒 원자적 청구: 경쟁 조건 방지',
    secTech7: '📊 속도 제한: IP + 지갑별 슬라이딩 윈도우',
    secTech8: '🧬 디바이스 핑거프린트: Sec-CH-UA 다중 지갑 탐지',
    communityOpenSource: 'XLayer Explorer에서 계약 검증됨',
    communityDeveloper: 'Developed by ＤＯＲＥＭＯＮ',
    communityFeedback: 'X를 통해 피드백 및 버그 신고',
    communityWhaleIncentive: '💎 $BANMAO 홀더: GameFi 생태계 성장에 함께하세요! 모든 기여는 플레이어에게 직접 보상됩니다.',
    communityBenefit1: '풀 성장 = 더 많은 플레이어 유치',
    communityBenefit2: '강한 커뮤니티 = 토큰 가치 상승',
    communityBenefit3: '100% 투명 - 게임 클레임만 가능',
    communityContractLabel: '풀 계약 주소',
    communityCopyAddress: '전체 주소 복사',
    communityPoolInstructions: '$BANMAO를 풀에 직접 전송:',
    communityClickToView: '🔗 Explorer에서 보기',
    communityAddressCopied: '✅ 풀 주소 복사됨! 여기로 $BANMAO 전송',
    communityCopyPool: '풀 주소 복사',

    // Leaderboard
    leaderboardTitle: '리더보드',
    leaderboardEmpty: '아직 플레이어가 없습니다',
    rank: '순위',
    yourRank: '내 순위',

    // Profile
    profileTitle: '👤 프로필 수정',
    profileName: '표시 이름',
    profileAvatar: '아바타 선택',
    profileTelegram: '텔레그램',
    profileTwitter: 'X (트위터)',
    profileSave: '저장',
    profileEdit: '프로필 수정',

    // Profile edit limits
    editLimitReached: '수정 횟수 초과',
    profileSaved: '프로필 저장됨!',
    editsRemaining: '회 남음',
    profileLocked: '🔒 프로필 잠김',
    profileLockWarning: '⚠️ 프로필은 3번만 수정할 수 있습니다. 이후에는 영구적으로 잠깁니다.',
    profileEditsUsed: '회 사용',
    myProfileTitle: '👤 내 프로필',
    viewProfile: '보기',
    editProfileBtn: '수정',
    rankLabel: '순위',
    needClaimFirst: '프로필을 만들려면 먼저 플레이하고 보상을 받으세요',
    tooManyRequests: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
    helpBtn: '게임 가이드',
    settingsSubtitle: '경험을 사용자 지정하세요',

    // Game stats labels
    statsTime: '시간',
    statsCoins: '코인',
    statsMaxLength: '최대 길이',

    // Donor leaderboard
    donorLeaderboard: '후원자',
    donateNow: 'Donate $banmao',
    donorBadge: '후원자 배지',
    totalDonated: '총 기부',
    donationCount: '기부 횟수',
    verifyDonation: '기부 확인',

    // Donor profile
    donorProfileTitle: '후원자 프로필',
    donorName: '이름',
    donorNotYet: '아직 후원자가 아닙니다. 기부하여 배지를 받으세요!',
    donorEditProfile: '프로필 수정',
    donorNoName: '이름 없음',
    donorDonor: 'Donor',
    donorTimes: '회',
    donorScrollMore: '더 보려면 스크롤',
    donorNoDonors: '아직 후원자가 없습니다',
    donorBeFirst: '첫 번째가 되세요!',
    donorVerifying: '확인 중...',
    donorVerifyBtn: '확인 & 배지 받기',
    donorNetworkError: '네트워크 오류',
    verifyYourDonation: '기부 확인',
    donateButton: '기부 $banmao',

    // Donate UI (in-game)
    donateToPool: '$BANMAO 게임 풀에 기부',
    donateBalanceLabel: '잔액',
    donateAmountPlaceholder: '수량',
    donateApproving: '⏳ 승인 중...',
    donateSigning: '📝 서명 중...',
    donatePending: '⏳ 기부 중...',
    donateDone: '✅ 완료!',
    donateThankYou: '✅ 기부해 주셔서 감사합니다! 🎉',
    donateConnectWallet: '🔗 지갑 연결하여 직접 기부',
    donateHideDonors: '기부자 순위 숨기기',
    donateTopDonors: '상위 기부자',
    donatePoolLabel: '풀',
    donateDonatedLabel: '기부됨',
    donateDonorsLabel: '기부자',
    donateOrSendDirectly: '또는 $BANMAO 직접 전송:',

    // Donor edit modal
    donorSaveBtn: '💾 저장',
    donorSaving: '⏳ 저장 중...',
    donorCancelBtn: '취소',
    donorNoAtPlaceholder: '사용자 이름 (@없이)',
    gamefiViewExplorer: 'Explorer에서 보기',

    // Badge tier names
    badgeDiamond: '다이아몬드',
    badgeGold: '골드',
    badgeSilver: '실버',
    badgeBronze: '브론즈',
    badgeSupporter: '후원자',

    // Help modal
    helpFoodTypes: '음식 종류',
    helpCoinTitle: '코인 (토큰)',
    helpCoinDesc: '+10 점수 | +15 가스',
    helpPowerTitle: '파워업 (번개)',
    helpPowerDesc: '+50 점수 | +40 가스 | 슈퍼 모드',
    helpObstacles: '장애물',
    helpObstaclesDesc: '빨간 사각형이 15초마다 생성됩니다. 터치 = 게임 오버 (슈퍼 모드 제외).',
    helpGas: '가스 시스템',
    helpGasDesc: '이동하면 가스가 줄어듭니다. 가스 = 0 → 게임 오버.',
    helpGasRefill: '음식을 수집하여 충전:',
    helpCombo: '콤보 보너스',
    helpComboDesc: '빠르게 먹어서 콤보 배율을 얻으세요!',
    helpComboBonus: '콤보 레벨당 +10% 보너스',
    helpComboReset: '(2초 후 리셋).',
    helpSuperMode: '슈퍼 모드 (5초)',
    helpSuperActivate: '⚡ 파워업을 먹으면 활성화:',
    helpSuperWall: '벽 통과 (반대편으로 나옴)',
    helpSuperObstacle: '장애물 무시 (죽지 않음)',
    helpSuperGlow: '뱀에 청록색 발광 테두리',
    helpControls: '방향키 / WASD / 터치 D-pad로 이동',

    // Milestone notifications
    newHighScore: '신기록!',
    scoreMilestone: '점수 달성!',
    comboBonus: '콤보 보너스!',
    levelUp: '레벨 업!',
    points: '점',

    // Player profile modal
    playerBestScore: '최고 점수',
    playerTotal: '총합',
    playerClaims: '클레임',
    playerLastActive: '마지막 활동',
    // Claim History Panel
    claimHistoryTitle: '📋 청구 내역',
    claimHistoryEmpty: '청구 내역이 없습니다',
    claimHistorySearchGuide: '🔍 청구 내역을 찾으려면 Explorer에서 검색하세요',
    claimHistorySearchTip: '💡 팁: "claimReward"를 입력하여 모든 청구 거래를 찾으세요',
    claimHistoryCopy: '복사',
    claimHistoryCopied: '복사됨!',
    claimHistorySearchExplorer: '🌐 Explorer에서 검색',
};
