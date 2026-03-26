export const id = {
    title: "Admin GameFi",
    subtitle: "Kelola Hub Game Anda",
    backToHub: "Kembali ke Hub",
    connectWallet: "Hubungkan dompet untuk akses admin",
    contractOwnerOnly: "🔒 Hanya Pemilik Kontrak",
    loading: "Memuat...",
    success: "Berhasil",
    error: "Kesalahan",
    save: "Simpan",
    update: "Perbarui",
    processing: "Memproses...",
    current: "Saat Ini",
    default: "Default",
    enabled: "Aktif",
    disabled: "Nonaktif",

    common: {
        backendConfig: "Konfigurasi Backend",
        smartContract: "Smart Contract (Owner)",
        contractParams: "Parameter Kontrak",
        adminView: "🛡️ Anda adalah Admin.",
        ownerView: "👑 Anda adalah Pemilik Kontrak.",
        viewOnly: "👁️ Mode Lihat Saja.",
        cooldown: "Cooldown Klaim",
        cooldownLabel: "Cooldown (detik)",
        cooldownHint: "Waktu tunggu antar klaim (default 300s)"
    },

    tabs: {
        overview: "Ringkasan",
        snake: "Game Ular",
        rps: 'Batu Gunting Kertas',
        slots: 'Slot',
        miner: 'Penambang Emas',
        fomo: 'Game FOMO',
        admins: 'Admin',
        logs: "Log",
        system: "Sistem",
        pk: "BanMaoPK"
    },

    fomo: {
        title: "Pengaturan Game FOMO",
        titleV11: "(V11)",
        desc: "Kelola parameter BanMaoFomo",
        status: {
            title: "Status Game",
            currentRound: "Ronde Saat Ini",
            jackpotPool: "Kolam Jackpot",
            timeRemaining: "Sisa Waktu",
            softDeadline: "Batas Lunak",
            hardDeadline: "Batas Keras",
            totalAttacks: "Total Serangan",
            currentLeader: "Pemimpin",
            stakingAddr: "Alamat Staking",
            gameStatus: "Status",
            isPaused: "⏸️ DIJEDA",
            isActive: "▶️ AKTIF",
            isEnded: "Berakhir"
        },
        config: {
            title: "Konfigurasi Aktif (V11)",
            attackCost: "Biaya Serangan",
            softDuration: "Durasi Lunak",
            hardDuration: "Durasi Keras",
            timeDecreaseStep: "Langkah Pengurangan Waktu",
            maxAttacksPerRound: "Maks Serangan/Ronde",
            winnerPercent: "Pemenang %",
            topAttackersPercent: "Top Attacker %",
            minAttacksForReward: "Min Serangan untuk Hadiah",
            claimExpiration: "Kedaluwarsa Klaim",
            refreshBtn: "Segarkan Data"
        },
        schedule: {
            title: "Jadwalkan Perubahan Config",
            note: "Catatan V11:",
            noteDesc: "Perubahan dijadwalkan dan berlaku dari ronde berikutnya.",
            attackCostLabel: "Biaya Serangan (BANMAO)",
            softDurationLabel: "Durasi Lunak (detik)",
            hardDurationLabel: "Durasi Keras (detik)",
            decreaseStepLabel: "Langkah Pengurangan (detik)",
            maxAttacksLabel: "Maks Serangan/Ronde",
            minAttacksLabel: "Min Serangan untuk Hadiah",
            winnerPercentLabel: "Pemenang % (0-100)",
            topPercentLabel: "Top Attacker % (0-100)",
            topPercentHint: "Pemenang% + Top% harus = 100",
            claimExpirationLabel: "Kedaluwarsa Klaim (detik)",
            submitBtn: "Jadwalkan untuk Ronde Berikutnya"
        },
        pause: {
            title: "Kontrol Jeda",
            desc: "Jeda atau lanjutkan game. Saat dijeda, tidak bisa serang atau klaim.",
            pauseBtn: "Jeda Game",
            pauseConfirm: "Lepas untuk Jeda",
            resumeBtn: "Lanjutkan Game"
        },
        rescue: {
            title: "Distribusi Debu",
            desc: "Kirim token berlebih ke alamat staking.",
            jackpotPool: "Kolam Jackpot",
            seedFund: "Dana Awal",
            totalVault: "Total Vault",
            rescueBtn: "Distribusi Debu ke Staking"
        },
        constants: {
            title: "Konstanta V11 (Baca Saja)",
            cooldownTime: "COOLDOWN_TIME",
            maxClaimBatch: "MAX_CLAIM_BATCH",
            maxTopAttackers: "MAX_TOP_ATTACKERS",
            precision: "PRECISION"
        }
    },


    overview: {
        title: "Grafik & Statistik",
        claimsToday: "Klaim Hari Ini",
        thisHour: "Jam Ini",
        uniquePlayers: "Pemain Unik",
        gameStatus: "Status Game",
        active: "Aktif",
        maintenance: "Pemeliharaan",
        hourlySigned: "Ditandatangani/Jam",
        hourlyCap: "Batas/Jam",
        totalAdmins: "Total Admin"
    },

    snake: {
        title: "Pengaturan Ular",
        desc: "Parameter on-chain",
        stats: {
            title: 'Dasbor Langsung',
            poolBalance: 'Saldo Pool',
            totalDonated: 'Total Donasi',
            totalDonors: 'Donatur',
            uniqueAddresses: 'alamat',
            hourlyUsage: 'Penggunaan Tanda Tangan/Jam',
            currentHourLabel: 'Jam',
            currentConfig: 'Konfigurasi Aktif',
            minClaim: 'Min Klaim',
            maxPerGame: 'Maks/Game',
            dailyCap: 'Batas Harian',
            hourlyCap: 'Batas Jam',
            minDonation: 'Min Donasi',
            signer: 'Penanda Tangan',
            refreshBtn: 'Segarkan Semua Data'
        },
        paused: 'Kontrak DIJEDA',
        running: 'Kontrak BERJALAN',
        pauseHint: 'Jeda menonaktifkan claimReward dan donate',
        pauseBtn: '⏸ Jeda',
        unpauseBtn: '▶ Lanjutkan',
        minClaim: {
            label: "Min Klaim ($BANMAO)",
            hint: "Token minimum untuk klaim. Default: 100"
        },
        maxClaimPerGame: {
            label: "Maks Klaim Per Game ($BANMAO)",
            hint: "Token maks per game. Default: 2,000"
        },
        minDonation: {
            label: "Min Donasi Untuk Papan ($BANMAO)",
            hint: "Donasi min tampil di papan peringkat. Default: 10"
        },
        caps: {
            title: "Batas Laju",
            desc: "Batasi jumlah klaim.",
            dailyPlayer: "Batas Pemain Harian",
            dailyHint: "Maks per dompet/hari. Default: 5,000",
            hourlySigner: "Batas Penanda Tangan/Jam",
            hourlyHint: "Maks sistem/jam. Default: 50,000",
            updateBtn: "Perbarui Batas"
        },
        signer: {
            title: "Pengaturan Penanda Tangan",
            desc: "Dompet untuk tanda tangan.",
            current: "Saat Ini",
            newAddress: "Alamat Baru",
            updateBtn: "Perbarui",
            hint: "⚠️ Perbarui SIGNER_PRIVATE_KEY di .env setelah ubah"
        },
        danger: {
            title: "Zona Bahaya",
            desc: "PERINGATAN: Tidak bisa dibatalkan!",
            currentOwner: "Pemilik Saat Ini",
            transferInput: "Transfer Kepemilikan",
            transferBtn: "Transfer",
            hint: "🔴 Anda kehilangan kontrol setelah transfer!",
            emergencyTitle: "Penarikan Darurat",
            emergencyTo: "Alamat Penerima",
            emergencyAmount: "Jumlah ($BANMAO)",
            emergencyBtn: "🚨 Tarik",
            emergencyHint: "Kirim $BANMAO dari kontrak ke alamat yang ditentukan"
        },
        backend: {
            title: "Pengaturan Backend",
            desc: "Parameter server",
            ratio: "Rasio Poin",
            ratioHint: "1 poin = X token",
            ratioExample: "Contoh",
            points: "poin",
            maxClaims: "Maks Klaim/Jam",
            maxClaimsHint: "Permintaan klaim maks per pemain per jam",
            maxClaimsExample: "Praktis",
            claimsWord: "klaim",
            cooldownWord: "tunggu",
            possibleWord: "mungkin",
            rateLimit: "Jeda Antar Klaim (detik)",
            rateLimitHint: "Waktu tunggu dalam detik antara dua klaim berturut-turut",
            rateLimitExample: "Pemain harus menunggu",
            betweenClaims: "antara klaim"
        }
    },

    rps: {
        title: "Pengaturan RPS",
        desc: "Batu Gunting Kertas On-chain",
        controls: "Kontrol Game",
        info: "RPS adalah PvP on-chain.",
        placeholder: "Integrasi kontrak RPS di sini."
    },

    slots: {
        title: 'Pengaturan Slot',
        desc: 'Kelola peluang dan biaya.',
    },
    miner: {
        title: 'Pengaturan Penambang',
        desc: 'Kelola penambangan.',
        backend: {
            title: 'Config Backend',
            desc: 'Aturan validasi.',
            ratio: 'Rasio Kesulitan',
            maxClaims: 'Maks Klaim/Jam',
            rateLimit: 'Batas Waktu (detik)'
        },
        caps: {
            title: 'Batas Global',
            desc: 'Keamanan kontrak.',
            dailyPlayer: 'Batas Harian',
            hourlySigner: 'Batas Jam',
            dailyHint: 'Maks per pemain',
            hourlyHint: 'Maks sistem',
            updateBtn: 'Perbarui'
        },
        minClaim: {
            label: 'Min Klaim',
            hint: 'Min BANMAO'
        },
        danger: {
            title: 'Bahaya',
            currentOwner: 'Pemilik',
            transferInput: 'Transfer Ke',
            transferBtn: 'Transfer',
            hint: 'PERINGATAN: Tak bisa dibatalkan.'
        },
        signer: {
            title: 'Manajemen Penanda Tangan',
            current: 'Saat Ini',
            newAddress: 'Baru',
            updateBtn: 'Perbarui',
            hint: 'Otorisasi request.'
        }
    },
    admins: {
        title: "Manajemen Admin",
        desc: "Dompet akses backend",
        addLabel: "Tambah Dompet",
        addBtn: "Tambah",
        currentList: "Admin Saat Ini",
        noAdmins: "Belum ada admin",
        remove: "Hapus",
        you: "(Anda)",
        infoTitle: "ℹ️ Info",
        infoDesc: "Admin dapat ubah config backend."
    },

    logs: {
        title: "Log Aktivitas",
        desc: "Tindakan terbaru",
        noLogs: "Tidak ada log"
    },

    system: {
        title: "Pengaturan Sistem",
        desc: "Konfigurasi global",
        maintenance: {
            title: "Mode Pemeliharaan",
            status: "Status",
            on: "🔴 AKTIF",
            active: "🟢 JALAN",
            enable: "Aktifkan",
            disable: "Matikan",
            messageLabel: "Pesan",
            messagePlaceholder: "Sedang pemeliharaan...",
            warningTitle: "⚠️ Peringatan",
            warningDesc: "Blokir semua klaim."
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
