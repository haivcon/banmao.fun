export const ru = {
    title: "GameFi Админ",
    subtitle: "Управление вашим игровым центром",
    backToHub: "Назад в Хаб",
    connectWallet: "Подключите кошелек для доступа",
    contractOwnerOnly: "🔒 Доступ только для владельца контракта",
    loading: "Загрузка...",
    success: "Успех",
    error: "Ошибка",
    save: "Сохранить",
    update: "Обновить",
    processing: "Обработка...",
    current: "Текущее",
    default: "По умолчанию",
    enabled: "Включено",
    disabled: "Отключено",

    common: {
        backendConfig: "Конфигурация бэкенда",
        smartContract: "Смарт-контракт (Владелец)",
        contractParams: "Параметры контракта",
        adminView: "🛡️ Вы администратор.",
        ownerView: "👑 Вы владелец контракта.",
        viewOnly: "👁️ Режим просмотра.",
        cooldown: "Перезарядка (Cooldown)",
        cooldownLabel: "Время ожидания (сек)",
        cooldownHint: "Время между клеймами (по умолч. 300с)"
    },

    tabs: {
        overview: "Обзор",
        snake: "Змейка",
        rps: 'Камень Ножницы Бумага',
        slots: 'Слоты',
        miner: 'Золотоискатель',
        fomo: 'FOMO Игра',
        admins: 'Админы',
        logs: "Логи",
        system: "Система",
        pk: "BanMaoPK"
    },

    fomo: {
        title: "Настройки FOMO",
        titleV11: "(V11)",
        desc: "Управление параметрами игры BanMaoFomo",
        status: {
            title: "Статус игры",
            currentRound: "Текущий раунд",
            jackpotPool: "Джекпот Пул",
            timeRemaining: "Осталось времени",
            softDeadline: "Мягкий дедлайн",
            hardDeadline: "Жесткий дедлайн",
            totalAttacks: "Всего атак",
            currentLeader: "Лидер",
            stakingAddr: "Адрес стейкинга",
            gameStatus: "Статус",
            isPaused: "⏸️ ПАУЗА",
            isActive: "▶️ АКТИВНО",
            isEnded: "Завершено"
        },
        config: {
            title: "Текущая конфигурация (V11)",
            attackCost: "Стоимость атаки",
            softDuration: "Мягкая длит.",
            hardDuration: "Жесткая длит.",
            timeDecreaseStep: "Шаг уменьшения времени",
            maxAttacksPerRound: "Макс. атак/раунд",
            winnerPercent: "Победитель %",
            topAttackersPercent: "Топ атакующих %",
            minAttacksForReward: "Мин. атак для награды",
            claimExpiration: "Время истечения клейма",
            refreshBtn: "Обновить данные"
        },
        schedule: {
            title: "Запланировать изменения",
            note: "Заметка V11:",
            noteDesc: "Изменения конфигурации запланированы и применятся со следующего раунда.",
            attackCostLabel: "Стоимость атаки (BANMAO)",
            softDurationLabel: "Мягкая длительность (сек)",
            hardDurationLabel: "Жесткая длительность (сек)",
            decreaseStepLabel: "Шаг уменьшения (сек)",
            maxAttacksLabel: "Макс. атак/раунд",
            minAttacksLabel: "Мин. атак для награды",
            winnerPercentLabel: "Победитель % (0-100)",
            topPercentLabel: "Топ атакующих % (0-100)",
            topPercentHint: "Победитель% + Топ% должны = 100",
            claimExpirationLabel: "Истечение клейма (сек)",
            submitBtn: "Запланировать для след. раунда"
        },
        pause: {
            title: "Управление паузой",
            desc: "Пауза или возобновление игры. При паузе нельзя атаковать или требовать.",
            pauseBtn: "Приостановить игру",
            pauseConfirm: "Отпустите для паузы",
            resumeBtn: "Возобновить игру"
        },
        rescue: {
            title: "Распределить пыль",
            desc: "Отправить лишние токены на адрес стейкинга.",
            jackpotPool: "Джекпот Пул",
            seedFund: "Сид фонд",
            totalVault: "Всего в хранилище",
            rescueBtn: "Распределить пыль в стейкинг"
        },
        constants: {
            title: "Константы V11 (Только чтение)",
            cooldownTime: "COOLDOWN_TIME",
            maxClaimBatch: "MAX_CLAIM_BATCH",
            maxTopAttackers: "MAX_TOP_ATTACKERS",
            precision: "PRECISION"
        }
    },


    overview: {
        title: "Графики и Статистика",
        claimsToday: "Клеймы сегодня",
        thisHour: "В этот час",
        uniquePlayers: "Уникальные игроки",
        gameStatus: "Статус системы",
        active: "Активно",
        maintenance: "Техработы",
        hourlySigned: "Подписано за час",
        hourlyCap: "Лимит в час",
        totalAdmins: "Всего админов"
    },

    snake: {
        title: "Настройки Змейки",
        desc: "Параметры он-чейн",
        stats: {
            title: 'Панель Мониторинга',
            poolBalance: 'Баланс Пула',
            totalDonated: 'Всего Донатов',
            totalDonors: 'Доноры',
            uniqueAddresses: 'адресов',
            hourlyUsage: 'Часовое Использование',
            currentHourLabel: 'Час',
            currentConfig: 'Текущая Конфигурация',
            minClaim: 'Мин. Клейм',
            maxPerGame: 'Макс/Игра',
            dailyCap: 'Дневной Лимит',
            hourlyCap: 'Часовой Лимит',
            minDonation: 'Мин. Донат',
            signer: 'Подписант',
            refreshBtn: 'Обновить Все'
        },
        paused: 'Контракт ПРИОСТАНОВЛЕН',
        running: 'Контракт РАБОТАЕТ',
        pauseHint: 'Пауза отключает claimReward и donate',
        pauseBtn: '⏸ Пауза',
        unpauseBtn: '▶ Возобновить',
        minClaim: {
            label: "Мин. сумма клейма ($BANMAO)",
            hint: "Минимум токенов для вывода. По умолч.: 100"
        },
        maxClaimPerGame: {
            label: "Макс. клейм за игру ($BANMAO)",
            hint: "Максимум токенов за одну игру. По умолч.: 2,000"
        },
        minDonation: {
            label: "Мин. донат для таблицы ($BANMAO)",
            hint: "Минимальный донат для попадания в таблицу. По умолч.: 10"
        },
        caps: {
            title: "Лимиты",
            desc: "Ограничение вывода токенов.",
            dailyPlayer: "Дневной лимит игрока",
            dailyHint: "Макс. на кошелек в день. По умолч.: 5,000",
            hourlySigner: "Часовой лимит системы",
            hourlyHint: "Макс. подписей в час. По умолч.: 50,000",
            updateBtn: "Обновить лимиты"
        },
        signer: {
            title: "Настройки Подписанта",
            desc: "Кошелек для подписи транзакций.",
            current: "Текущий",
            newAddress: "Новый адрес",
            updateBtn: "Обновить",
            hint: "⚠️ Обновите SIGNER_PRIVATE_KEY в .env после смены"
        },
        danger: {
            title: "Опасная зона",
            desc: "ВНИМАНИЕ: Действия необратимы!",
            currentOwner: "Текущий владелец",
            transferInput: "Передать права",
            transferBtn: "Передать",
            hint: "🔴 ВЫ ПОТЕРЯЕТЕ КОНТРОЛЬ ПОСЛЕ ПЕРЕДАЧИ!",
            emergencyTitle: "Экстренный Вывод",
            emergencyTo: "Адрес Получателя",
            emergencyAmount: "Сумма ($BANMAO)",
            emergencyBtn: "🚨 Вывести",
            emergencyHint: "Отправить $BANMAO из контракта на указанный адрес"
        },
        backend: {
            title: "Настройки Бэкенда",
            desc: "Серверные параметры",
            ratio: "Коэфф. очков к токенам",
            ratioHint: "1 очко = X токенов",
            ratioExample: "Пример",
            points: "очков",
            maxClaims: "Макс. клеймов в час",
            maxClaimsHint: "Макс. запросов на клейм в час на игрока",
            maxClaimsExample: "На практике",
            claimsWord: "клеймов",
            cooldownWord: "ожидание",
            possibleWord: "возможно",
            rateLimit: "Ожидание между клеймами (сек)",
            rateLimitHint: "Время ожидания в секундах между двумя клеймами",
            rateLimitExample: "Игрок должен ждать",
            betweenClaims: "между клеймами"
        }
    },

    rps: {
        title: "Настройки RPS",
        desc: "Камень Ножницы Бумага",
        controls: "Управление RPS",
        info: "Полностью он-чейн PvP игра.",
        placeholder: "Интеграция контракта RPS."
    },

    slots: {
        title: 'Настройки Слотов',
        desc: 'Шансы, стоимость и визуал.',
    },
    miner: {
        title: 'Настройки Майнера',
        desc: 'Майнинг рейт, лимиты, кулдаун.',
        backend: {
            title: 'Конфиг Бэкенда',
            desc: 'Правила валидации.',
            ratio: 'Сложность',
            maxClaims: 'Макс. клеймов в час',
            rateLimit: 'Окно лимита (сек)'
        },
        caps: {
            title: 'Глобальные лимиты',
            desc: 'Защита от слива.',
            dailyPlayer: 'Дневной лимит игрока',
            hourlySigner: 'Часовой лимит системы',
            dailyHint: 'Макс. вывод на игрока в день',
            hourlyHint: 'Макс. вывод системы в час',
            updateBtn: 'Обновить'
        },
        minClaim: {
            label: 'Мин. сумма клейма',
            hint: 'Мин. BANMAO для вывода'
        },
        danger: {
            title: 'Опасная зона',
            currentOwner: 'Владелец',
            transferInput: 'Новый владелец',
            transferBtn: 'Передать права',
            hint: 'ВНИМАНИЕ: Необратимо.'
        },
        signer: {
            title: 'Управление Подписантом',
            current: 'Текущий',
            newAddress: 'Новый адрес',
            updateBtn: 'Обновить',
            hint: 'Авторизует запросы.'
        }
    },
    admins: {
        title: "Управление Админами",
        desc: "Кошельки с доступом к бэкенду",
        addLabel: "Добавить кошелек",
        addBtn: "Добавить",
        currentList: "Список админов",
        noAdmins: "Нет админов",
        remove: "Удалить",
        you: "(Вы)",
        infoTitle: "ℹ️ Об админах",
        infoDesc: "Админы могут менять конфиг бэкенда. Только владелец добавляет админов."
    },

    logs: {
        title: "Логи активности",
        desc: "Действия админов",
        noLogs: "Нет логов"
    },

    system: {
        title: "Системные настройки",
        desc: "Глобальная конфигурация",
        maintenance: {
            title: "Режим техобслуживания",
            status: "Статус",
            on: "🔴 ВКЛЮЧЕНО",
            active: "🟢 Активно",
            enable: "Включить",
            disable: "Выключить",
            messageLabel: "Сообщение",
            messagePlaceholder: "Технические работы...",
            warningTitle: "⚠️ Внимание",
            warningDesc: "Блокирует все клеймы."
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
