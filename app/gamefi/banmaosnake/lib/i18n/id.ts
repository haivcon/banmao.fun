import { SnakeStrings } from './types';

export const id: SnakeStrings = {
    // Menu
    title: 'banmao+Snake',
    subtitle: '🎮 Pemburu Token • X Layer GameFi',
    startBtn: 'MULAI',
    spaceHint: '(Spasi)',

    // Legend
    legendCoin: '+10 poin',
    legendXLayer: '+50 X Layer',
    legendObstacle: 'Hindari!',

    // HUD
    score: 'SKOR',
    best: 'TERBAIK',
    gas: 'ENERGI',
    time: 'WAKTU',
    pause: 'Jeda',
    resume: 'Lanjut',

    // Pause screen
    pauseTitle: 'JEDA',
    continueBtn: 'Lanjutkan',
    menuBtn: 'Menu',

    // Game over
    gameOverTitle: 'PERMAINAN BERAKHIR',
    scoreLabel: 'SKOR',
    claimBtn: 'KLAIM',
    playAgainBtn: 'Main Lagi',
    needMorePoints: 'Butuh {0} poin lagi (min {1})',

    // Claim states
    processing: 'Memproses...',
    claimSuccess: '🎉 Hadiah berhasil diklaim!',
    cancelledTx: 'Transaksi dibatalkan',

    // Errors
    errGas: '⛽ OKB tidak cukup untuk gas',
    errMinClaim: '📊 Di bawah minimum ({0})',
    errDailyLimit: '📅 Batas harian tercapai',
    errSystemLimit: '⏰ Sistem kelebihan beban',
    errSignature: '🔐 Tanda tangan tidak valid',
    errFailed: '❌ Transaksi gagal',

    // Stats panel
    statsTitle: 'STATISTIK',
    balance: 'Saldo',
    poolBalance: 'Pool hadiah',
    minClaim: 'Min klaim',
    systemLimit: 'Batas sistem/jam',
    systemLimitDesc: 'Perlindungan pool',
    playerLimit: 'Batas Anda/hari',
    playerLimitDesc: 'Anti-farming',
    maxPerGame: 'Maks/game',
    minDonation: 'Min donasi',

    // Wallet
    connectWallet: 'Hubungkan Dompet',
    connectToPlay: 'Hubungkan untuk bermain',

    // Pool low warning
    poolLowTitle: '⚠️ Pool Hampir Habis!',
    poolLowMsg: 'Pool hadiah telah mencapai batas. Kami butuh dukungan untuk menjaga game tetap berjalan.',
    donateBtn: 'Donasi $BANMAO',

    // Stats tooltips
    balanceTooltip: 'Saldo token $BANMAO di dompet Anda',
    poolTooltip: 'Total token di pool hadiah. Saat klaim, token ditransfer dari pool ini.',
    minClaimTooltip: 'Skor minimum untuk klaim hadiah. Di bawah batas ini tidak bisa tarik.',
    maxPerGameTooltip: 'Token maksimum per game. Kelebihan akan dibatasi.',
    minDonationTooltip: 'Donasi minimum untuk tampil di papan peringkat donatur.',
    claimFrequency: 'Frekuensi klaim',
    claimFrequencyTooltip: 'Klaim maksimum per pemain per jam.',
    claimCooldown: 'Waktu tunggu',
    claimCooldownTooltip: 'Waktu tunggu (detik) antara dua klaim berturut-turut.',
    systemLimitTooltip: 'Token maksimum SEMUA pemain bisa klaim per jam. Perlindungan pool.',
    playerLimitTooltip: 'Token maksimum ANDA bisa klaim per hari. Anti-farming dan distribusi adil.',

    // Community section
    communityTitle: '🌍 Dukungan Komunitas',
    communitySubtitle: 'Bantu $BANMAO menyebar ke seluruh dunia',
    communityDonateMsg: 'Kirim $BANMAO ke pool untuk mempertahankan hadiah pemain. Tidak ada yang bisa menarik kecuali dengan bermain dan mendapat poin.',
    communitySecurityTitle: 'Keamanan & Transparansi',
    communityFeature1: 'EIP-712 + Nonce: Perlindungan anti-pemalsuan & serangan ulang',
    communityFeature2: 'Batas Per Jam/Hari: Perlindungan pool dari bot',
    communityFeature3: 'Open Source: 100% kode terverifikasi transparan',
    // Security Technologies
    secTechTitle: '🛡️ Teknologi Keamanan Aktif',
    secTech1: '🔐 Tanda Tangan EIP-712: Bukti kriptografi untuk setiap klaim',
    secTech2: '🔑 HMAC Timestamp: Waktu game diautentikasi server',
    secTech3: '🧮 Checksum Skor: Verifikasi integritas skor SHA-256',
    secTech4: '⏱️ Sistem Sesi: Sesi game sekali pakai',
    secTech5: '🛡️ Anti-Bot: Analisis varian waktu gerakan (CoV)',
    secTech6: '🔒 Klaim Atomik: Perlindungan dari double-claim',
    secTech7: '📊 Rate Limiting: Sliding window per IP + per wallet',
    secTech8: '🧬 Device Fingerprint: Deteksi multi-wallet Sec-CH-UA',
    communityOpenSource: 'Kontrak terverifikasi di XLayer Explorer',
    communityDeveloper: 'Developed by ＤＯＲＥＭＯＮ',
    communityFeedback: 'Feedback & Laporan Bug via X',
    communityWhaleIncentive: '💎 Holder $BANMAO: Bantu kembangkan ekosistem GameFi kami! Setiap kontribusi langsung memberi hadiah ke pemain.',
    communityBenefit1: 'Pool tumbuh = Lebih banyak pemain',
    communityBenefit2: 'Komunitas kuat = Nilai token naik',
    communityBenefit3: '100% transparan - Hanya klaim game',
    communityContractLabel: 'Alamat Kontrak Pool',
    communityCopyAddress: 'Salin Alamat Lengkap',
    communityPoolInstructions: 'Kirim $BANMAO langsung ke Pool:',
    communityClickToView: '🔗 Klik untuk lihat di Explorer',
    communityAddressCopied: '✅ Alamat pool disalin! Kirim $BANMAO ke sini',
    communityCopyPool: 'Salin Alamat Pool',

    // Leaderboard
    leaderboardTitle: 'Papan Peringkat',
    leaderboardEmpty: 'Belum ada pemain',
    rank: 'Peringkat',
    yourRank: 'Peringkat Anda',

    // Profile
    profileTitle: '👤 Edit Profil',
    profileName: 'Nama Tampilan',
    profileAvatar: 'Pilih Avatar',
    profileTelegram: 'Telegram',
    profileTwitter: 'X (Twitter)',
    profileSave: 'Simpan',
    profileEdit: 'Edit Profil',

    // Profile edit limits
    editLimitReached: 'Batas edit tercapai',
    profileSaved: 'Profil disimpan!',
    editsRemaining: 'edit tersisa',
    profileLocked: '🔒 Profil Terkunci',
    profileLockWarning: '⚠️ Anda hanya bisa edit profil 3 kali. Setelah itu, profil akan terkunci permanen.',
    profileEditsUsed: 'edit digunakan',
    myProfileTitle: '👤 Profil Saya',
    viewProfile: 'Lihat',
    editProfileBtn: 'Edit',
    rankLabel: 'Peringkat',
    needClaimFirst: 'Main dan klaim hadiah dulu untuk membuat profil',
    tooManyRequests: 'Terlalu banyak permintaan. Silakan tunggu sebentar.',
    helpBtn: 'Panduan Game',
    settingsSubtitle: 'Sesuaikan pengalaman Anda',

    // Game stats labels
    statsTime: 'Waktu',
    statsCoins: 'Koin',
    statsMaxLength: 'Panjang Maks',

    // Donor leaderboard
    donorLeaderboard: 'Donatur',
    donateNow: 'Donate $banmao',
    donorBadge: 'Lencana Donatur',
    totalDonated: 'Total Donasi',
    donationCount: 'Jumlah Donasi',
    verifyDonation: 'Verifikasi Donasi Anda',

    // Donor profile
    donorProfileTitle: 'Profil Donatur',
    donorName: 'Nama',
    donorNotYet: 'Anda belum menjadi donatur. Donasi untuk mendapat lencana!',
    donorEditProfile: 'Edit Profil',
    donorNoName: 'Belum ada nama',
    donorDonor: 'Donor',
    donorTimes: 'kali',
    donorScrollMore: 'Gulir untuk melihat lebih',
    donorNoDonors: 'Belum ada donatur',
    donorBeFirst: 'Jadi yang pertama!',
    donorVerifying: 'Memverifikasi...',
    donorVerifyBtn: 'Verifikasi & Dapatkan Lencana',
    donorNetworkError: 'Error jaringan',
    verifyYourDonation: 'Verifikasi Donasi Anda',
    donateButton: 'Donasi $banmao',

    // Donate UI (in-game)
    donateToPool: 'Donasi $BANMAO ke Pool Game',
    donateBalanceLabel: 'Saldo',
    donateAmountPlaceholder: 'Jumlah',
    donateApproving: '⏳ Menyetujui...',
    donateSigning: '📝 Menandatangani...',
    donatePending: '⏳ Mendonasi...',
    donateDone: '✅ Selesai!',
    donateThankYou: '✅ Terima kasih atas donasi Anda! 🎉',
    donateConnectWallet: '🔗 Hubungkan dompet untuk donasi langsung',
    donateHideDonors: 'Sembunyikan Peringkat Donatur',
    donateTopDonors: 'Top Donatur',
    donatePoolLabel: 'Pool',
    donateDonatedLabel: 'Terdonasi',
    donateDonorsLabel: 'Donatur',
    donateOrSendDirectly: 'Atau kirim $BANMAO langsung:',

    // Donor edit modal
    donorSaveBtn: '💾 Simpan',
    donorSaving: '⏳ Menyimpan...',
    donorCancelBtn: 'Batal',
    donorNoAtPlaceholder: 'username (tanpa @)',
    gamefiViewExplorer: 'Lihat di Explorer',

    // Badge tier names
    badgeDiamond: 'Berlian',
    badgeGold: 'Emas',
    badgeSilver: 'Perak',
    badgeBronze: 'Perunggu',
    badgeSupporter: 'Pendukung',

    // Help modal
    helpFoodTypes: 'Jenis Makanan',
    helpCoinTitle: 'Koin (Token)',
    helpCoinDesc: '+10 poin | +15 gas',
    helpPowerTitle: 'Power-up (Petir)',
    helpPowerDesc: '+50 poin | +40 gas | Super Mode',
    helpObstacles: 'Rintangan',
    helpObstaclesDesc: 'Kotak merah muncul setiap 15 detik. Sentuh = Game Over (kecuali Super Mode).',
    helpGas: 'Sistem Gas',
    helpGasDesc: 'Gas berkurang saat bergerak. Gas = 0 → Game Over.',
    helpGasRefill: 'Kumpulkan makanan untuk mengisi:',
    helpCombo: 'Combo Bonus',
    helpComboDesc: 'Makan cepat untuk combo multiplier!',
    helpComboBonus: '+10% bonus per level combo',
    helpComboReset: '(reset setelah 2 detik).',
    helpSuperMode: 'Super Mode (5 detik)',
    helpSuperActivate: 'Aktif dengan makan ⚡:',
    helpSuperWall: 'Tembus dinding (keliling)',
    helpSuperObstacle: 'Abaikan rintangan (kebal)',
    helpSuperGlow: 'Border cyan bersinar di ular',
    helpControls: 'Tombol panah / WASD / D-pad sentuh',

    // Milestone notifications
    newHighScore: 'SKOR TERTINGGI BARU!',
    scoreMilestone: 'PENCAPAIAN SKOR!',
    comboBonus: 'BONUS KOMBO!',
    levelUp: 'NAIK LEVEL!',
    points: 'poin',

    // Player profile modal
    playerBestScore: 'Skor Tertinggi',
    playerTotal: 'Total',
    playerClaims: 'Klaim',
    playerLastActive: 'Terakhir Aktif',
    // Claim History Panel
    claimHistoryTitle: '📋 Riwayat Klaim',
    claimHistoryEmpty: 'Belum ada riwayat klaim',
    claimHistorySearchGuide: '🔍 Untuk mencari riwayat klaim, cari di Explorer',
    claimHistorySearchTip: '💡 Tips: Ketik "claimReward" untuk menemukan semua transaksi klaim',
    claimHistoryCopy: 'Salin',
    claimHistoryCopied: 'Tersalin!',
    claimHistorySearchExplorer: '🌐 Cari di Explorer',
};
