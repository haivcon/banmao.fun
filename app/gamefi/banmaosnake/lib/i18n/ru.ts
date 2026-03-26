import { SnakeStrings } from './types';

export const ru: SnakeStrings = {
    // Menu
    title: 'banmao+Snake',
    subtitle: '🎮 Охотник за токенами • X Layer GameFi',
    startBtn: 'СТАРТ',
    spaceHint: '(Пробел)',

    // Legend
    legendCoin: '+10 очков',
    legendXLayer: '+50 X Layer',
    legendObstacle: 'Избегай!',

    // HUD
    score: 'ОЧКИ',
    best: 'ЛУЧШИЙ',
    gas: 'ГАЗ',
    time: 'ВРЕМЯ',
    pause: 'Пауза',
    resume: 'Продолжить',

    // Pause screen
    pauseTitle: 'ПАУЗА',
    continueBtn: 'Продолжить',
    menuBtn: 'Меню',

    // Game over
    gameOverTitle: 'ИГРА ОКОНЧЕНА',
    scoreLabel: 'СЧЁТ',
    claimBtn: 'ЗАБРАТЬ',
    playAgainBtn: 'Играть снова',
    needMorePoints: 'Нужно ещё {0} очков (мин {1})',

    // Claim states
    processing: 'Обработка...',
    claimSuccess: '🎉 Награда получена!',
    cancelledTx: 'Транзакция отменена',

    // Errors
    errGas: '⛽ Недостаточно OKB для газа',
    errMinClaim: '📊 Ниже минимума ({0})',
    errDailyLimit: '📅 Дневной лимит достигнут',
    errSystemLimit: '⏰ Система перегружена',
    errSignature: '🔐 Неверная подпись',
    errFailed: '❌ Ошибка транзакции',

    // Stats panel
    statsTitle: 'СТАТИСТИКА',
    balance: 'Баланс',
    poolBalance: 'Призовой фонд',
    minClaim: 'Мин. вывод',
    systemLimit: 'Лимит системы/час',
    systemLimitDesc: 'Защита пула',
    playerLimit: 'Ваш лимит/день',
    playerLimitDesc: 'Анти-фарм',
    maxPerGame: 'Макс/игра',
    minDonation: 'Мин. донат',

    // Wallet
    connectWallet: 'Подключить кошелёк',
    connectToPlay: 'Подключитесь для игры',

    // Pool low warning
    poolLowTitle: '⚠️ Пул на исходе!',
    poolLowMsg: 'Призовой пул достиг лимита. Нужны спонсоры для поддержания игры.',
    donateBtn: 'Пожертвовать $BANMAO',

    // Stats tooltips
    balanceTooltip: 'Баланс токенов $BANMAO в вашем кошельке',
    poolTooltip: 'Общее количество токенов в призовом пуле. При получении награды токены переводятся из этого пула.',
    minClaimTooltip: 'Минимальный счёт для получения награды. Ниже этого порога вывод невозможен.',
    maxPerGameTooltip: 'Максимум токенов за одну игру. Превышение будет ограничено.',
    minDonationTooltip: 'Минимальный донат для попадания в таблицу спонсоров.',
    claimFrequency: 'Частота клейма',
    claimFrequencyTooltip: 'Максимум клеймов на игрока в час.',
    claimCooldown: 'Ожидание',
    claimCooldownTooltip: 'Время ожидания (секунды) между двумя клеймами.',
    systemLimitTooltip: 'Максимум токенов, которые ВСЕ игроки могут получить за час. Защита пула.',
    playerLimitTooltip: 'Максимум токенов, которые ВЫ можете получить за день. Защита от фарма.',

    // Community section
    communityTitle: '🌍 Поддержка сообщества',
    communitySubtitle: 'Помогите $BANMAO распространиться по всему миру',
    communityDonateMsg: 'Отправьте $BANMAO в пул для поддержки наград игрокам. Никто не может вывести токены, кроме как играя и зарабатывая очки.',
    communitySecurityTitle: 'Безопасность и прозрачность',
    communityFeature1: 'EIP-712 + Nonce: Защита от подделки и повторных атак',
    communityFeature2: 'Почасовой/дневной лимит: Защита пула от ботов',
    communityFeature3: 'Открытый код: 100% прозрачный верифицированный код',
    // Security Technologies
    secTechTitle: '🛡️ Активные технологии защиты',
    secTech1: '🔐 Подпись EIP-712: Криптографическое подтверждение каждого вывода',
    secTech2: '🔑 HMAC Временная метка: Серверная аутентификация времени игры',
    secTech3: '🧮 Контрольная сумма: Проверка целостности очков SHA-256',
    secTech4: '⏱️ Система сессий: Одноразовые игровые сессии',
    secTech5: '��️ Анти-бот: Анализ вариации таймингов движений',
    secTech6: '🔒 Атомарный вывод: Защита от двойного вывода',
    secTech7: '📊 Ограничение запросов: Скользящее окно по IP + кошельку',
    secTech8: '🧬 Отпечаток устройства: Sec-CH-UA обнаружение мульти-кошельков',
    communityOpenSource: 'Контракт верифицирован на XLayer Explorer',
    communityDeveloper: 'Developed by ＤＯＲＥＭＯＮ',
    communityFeedback: 'Отзывы и баг-репорты через X',
    communityWhaleIncentive: '💎 Держатели $BANMAO: Помогите развить нашу GameFi экосистему! Каждый вклад напрямую вознаграждает игроков.',
    communityBenefit1: 'Пул растёт = Больше игроков',
    communityBenefit2: 'Сильное сообщество = Рост токена',
    communityBenefit3: '100% прозрачность - только игровые выплаты',
    communityContractLabel: 'Адрес контракта пула',
    communityCopyAddress: 'Скопировать адрес',
    communityPoolInstructions: 'Отправьте $BANMAO напрямую в пул:',
    communityClickToView: '🔗 Посмотреть в Explorer',
    communityAddressCopied: '✅ Адрес пула скопирован! Отправьте $BANMAO сюда',
    communityCopyPool: 'Скопировать адрес пула',

    // Leaderboard
    leaderboardTitle: 'Рейтинг',
    leaderboardEmpty: 'Пока нет игроков',
    rank: 'Место',
    yourRank: 'Ваше место',

    // Profile
    profileTitle: '👤 Редактировать профиль',
    profileName: 'Отображаемое имя',
    profileAvatar: 'Выбрать аватар',
    profileTelegram: 'Telegram',
    profileTwitter: 'X (Twitter)',
    profileSave: 'Сохранить',
    profileEdit: 'Редактировать',

    // Profile edit limits
    editLimitReached: 'Лимит редактирования достигнут',
    profileSaved: 'Профиль сохранён!',
    editsRemaining: 'редактирований осталось',
    profileLocked: '🔒 Профиль заблокирован',
    profileLockWarning: '⚠️ Вы можете редактировать профиль только 3 раза. После этого профиль будет заблокирован навсегда.',
    profileEditsUsed: 'редактирований использовано',
    myProfileTitle: '👤 Мой профиль',
    viewProfile: 'Смотреть',
    editProfileBtn: 'Изменить',
    rankLabel: 'Место',
    needClaimFirst: 'Сначала сыграйте и получите награду для создания профиля',
    tooManyRequests: 'Слишком много запросов. Подождите немного.',
    helpBtn: 'Руководство',
    settingsSubtitle: 'Настройте свой опыт',

    // Game stats labels
    statsTime: 'Время',
    statsCoins: 'Монеты',
    statsMaxLength: 'Макс.длина',

    // Donor leaderboard
    donorLeaderboard: 'Спонсоры',
    donateNow: 'Donate $banmao',
    donorBadge: 'Значок спонсора',
    totalDonated: 'Всего пожертвовано',
    donationCount: 'Количество пожертвований',
    verifyDonation: 'Подтвердить пожертвование',

    // Donor profile
    donorProfileTitle: 'Профиль спонсора',
    donorName: 'Имя',
    donorNotYet: 'Вы ещё не спонсор. Пожертвуйте, чтобы получить значок!',
    donorEditProfile: 'Редактировать профиль',
    donorNoName: 'Имя не задано',
    donorDonor: 'Donor',
    donorTimes: 'раз',
    donorScrollMore: 'Прокрутите для просмотра',
    donorNoDonors: 'Пока нет спонсоров',
    donorBeFirst: 'Станьте первым!',
    donorVerifying: 'Проверка...',
    donorVerifyBtn: 'Проверить и получить значок',
    donorNetworkError: 'Ошибка сети',
    verifyYourDonation: 'Подтвердите ваше пожертвование',
    donateButton: 'Пожертвовать $banmao',

    // Donate UI (in-game)
    donateToPool: 'Пожертвовать $BANMAO в пул игры',
    donateBalanceLabel: 'Баланс',
    donateAmountPlaceholder: 'Сумма',
    donateApproving: '⏳ Одобрение...',
    donateSigning: '📝 Подпись...',
    donatePending: '⏳ Пожертвование...',
    donateDone: '✅ Готово!',
    donateThankYou: '✅ Спасибо за ваше пожертвование! 🎉',
    donateConnectWallet: '🔗 Подключите кошелёк для пожертвования',
    donateHideDonors: 'Скрыть рейтинг доноров',
    donateTopDonors: 'Топ доноров',
    donatePoolLabel: 'Пул',
    donateDonatedLabel: 'Пожертвовано',
    donateDonorsLabel: 'Доноры',
    donateOrSendDirectly: 'Или отправьте $BANMAO напрямую:',

    // Donor edit modal
    donorSaveBtn: '💾 Сохранить',
    donorSaving: '⏳ Сохранение...',
    donorCancelBtn: 'Отмена',
    donorNoAtPlaceholder: 'имя пользователя (без @)',
    gamefiViewExplorer: 'Смотреть в Explorer',

    // Badge tier names
    badgeDiamond: 'Алмаз',
    badgeGold: 'Золото',
    badgeSilver: 'Серебро',
    badgeBronze: 'Бронза',
    badgeSupporter: 'Спонсор',

    // Help modal
    helpFoodTypes: 'Виды Еды',
    helpCoinTitle: 'Монета (Токен)',
    helpCoinDesc: '+10 очков | +15 газа',
    helpPowerTitle: 'Усиление (Молния)',
    helpPowerDesc: '+50 очков | +40 газа | Супер режим',
    helpObstacles: 'Препятствия',
    helpObstaclesDesc: 'Красные квадраты появляются каждые 15 секунд. Касание = Конец игры (кроме Супер режима).',
    helpGas: 'Система Топлива',
    helpGasDesc: 'Газ уменьшается при движении. Газ = 0 → Конец игры.',
    helpGasRefill: 'Собирайте еду для заправки:',
    helpCombo: 'Комбо Бонус',
    helpComboDesc: 'Ешьте быстро для комбо множителя!',
    helpComboBonus: '+10% бонус за уровень комбо',
    helpComboReset: '(сброс через 2с).',
    helpSuperMode: 'Супер Режим (5 секунд)',
    helpSuperActivate: 'Активируется при поедании ⚡:',
    helpSuperWall: 'Проход сквозь стены (обход)',
    helpSuperObstacle: 'Игнор препятствий (бессмертие)',
    helpSuperGlow: 'Голубое свечение на змее',
    helpControls: 'Стрелки / WASD / Сенсорный D-pad',

    // Milestone notifications
    newHighScore: 'НОВЫЙ РЕКОРД!',
    scoreMilestone: 'ДОСТИЖЕНИЕ!',
    comboBonus: 'КОМБО БОНУС!',
    levelUp: 'НОВЫЙ УРОВЕНЬ!',
    points: 'очков',

    // Player profile modal
    playerBestScore: 'Лучший результат',
    playerTotal: 'Всего',
    playerClaims: 'Получено',
    playerLastActive: 'Последняя активность',
    // Claim History Panel
    claimHistoryTitle: '📋 История вывода',
    claimHistoryEmpty: 'История вывода пуста',
    claimHistorySearchGuide: '🔍 Для поиска истории вывода используйте Explorer',
    claimHistorySearchTip: '💡 Совет: Введите "claimReward" чтобы найти все транзакции вывода',
    claimHistoryCopy: 'Копировать',
    claimHistoryCopied: 'Скопировано!',
    claimHistorySearchExplorer: '🌐 Искать в Explorer',
};
