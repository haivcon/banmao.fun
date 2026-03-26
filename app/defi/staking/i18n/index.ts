'use client';

import { useState, useEffect, useCallback } from 'react';

export type Language = "en" | "vi" | "zh" | "ko" | "ru" | "id";

import { LandingTranslations, translations as globalTranslations } from '../../../web3d/locals';

export interface StakingTranslations extends LandingTranslations {

    tourWelcomeTitle: string;
    tourWelcomeDesc: string;
    tourConnectTitle: string;
    tourConnectDesc: string;
    tourTokenInfoTitle: string;
    tourTokenInfoDesc: string;
    tourStakeOrbTitle: string;
    tourStakeOrbDesc: string;
    tourSmallPanelTitle: string;
    tourSmallPanelDesc: string;
    tourExpandedPanelTitle: string;
    tourExpandedPanelDesc: string;
    tourClaimOrbTitle: string;
    tourClaimOrbDesc: string;
    tourCompoundOrbTitle: string;
    tourCompoundOrbDesc: string;
    tourLeaderboardTitle: string;
    tourLeaderboardDesc: string;
    tourSupportPoolTitle: string;
    tourSupportPoolDesc: string;
    tourEnergyCenterTitle: string;
    tourEnergyCenterDesc: string;
    tourOrbStatsTitle: string;
    tourOrbStatsDesc: string;
    tourStatsOrbTitle: string;
    tourUnstakeOrbTitle: string;
    tourUnstakeOrbDesc: string;

    // New keys
    lockFlexible: string;
    lock30Days: string;
    lock90Days: string;
    lock180Days: string;
    lock365Days: string;
    statsDaySymbol: string;
    statsSecSymbol: string;
    timeDaysShort: string;
    timeHoursShort: string;
    timeSecondsShort: string;
    sphereOnline: string;
    sphereOffline: string;
    statusUnlocked: string;
    statsRatePerSec: string;
    statsPending: string;
    statsMyStake: string;
    sphereRewardPool: string;
    panelClose: string;
    sphereTapToToggle: string;
    tapSphereHint: string;

    // Navigation
    tourSkip: string;
    tourBack: string;
    tourNext: string;
    tourComplete: string;
    tourDontShow: string;

    // Leaderboard Panel
    leaderboardTitle: string;
    tabAmount: string;
    tabLock: string;
    stakers: string;
    yourRank: string;
    loading: string;
    noStakers: string;
    stakerDetail: string;
    rank: string;
    totalStake: string;
    lockDuration: string;
    transactionHistory: string;
    noTransactions: string;
    viewOnExplorer: string;
    copy: string;
    copied: string;
    stakes: string;
    unstakes: string;
    claims: string;
    compounds: string;

    // Supporter Panel
    supportPoolTitle: string;
    rewardPool: string;
    supporters: string;
    topSupporters: string;
    noSupporters: string;
    addToPool: string;
    amountPlaceholder: string;
    send: string;
    supportDetail: string;
    total: string;
    contractNote: string;
    contractLink: string;

    // Profile
    editsUsed: string;
    editProfile: string;
    editYourProfile: string;
    selectAvatar: string;
    displayName: string;
    cancelBtn: string;
    saveProfile: string;
    editsRemaining: string;
    loadingBlockchain: string;
    viewOnExplorerDirect: string;

    // Common Buttons & Titles
    closeBtn: string;
    panelStake: string;
    panelUnstake: string;
    panelClaim: string;
    panelCompound: string;

    // StakePanel
    approveDesc: string;
    processing: string;
    balance: string;
    staked: string;
    stakeAmount: string;
    insufficientBalance: string;
    approveToken: string;
    stakingApprove: string;
    confirmStake: string;
    selectLockDuration: string;

    // UnstakePanel
    inGracePeriod: string;
    gracePeriodFree: string;
    lockRemaining: string;
    gracePeriodEnded: string;
    unlockAfter: string;
    unlocked: string;
    unstakeFree: string;
    unstakeWithPenalty: string;
    selectNewLock: string;
    cancel: string;
    confirm: string;
    stakedLabel: string;
    amountToUnstake: string;
    confirmUnstake: string;

    // ClaimPanel
    netReward: string;
    youWillReceive: string;
    gross: string;
    perDay: string;
    poolShare: string;
    avgMult: string;
    shares: string;
    yourStakes: string;
    rate: string;
    pool: string;
    fee: string;
    claimRewards: string;
    noRewards: string;
    package: string;
    amount: string;
    multiplier: string;
    reward: string;
    stakeDate: string;
    unlock: string;
    remaining: string;
    status: string;
    statusGrace: string;
    statusLocked: string;
    statusFree: string;

    // CompoundPanel
    pendingRewards: string;
    newStakeLock: string;
    compound: string;
    compoundDesc: string;

    // Reward Calculator
    estimatedEarnings: string;
    poolPercentNote: string;
    ratePerSecond: string;
    allRatePerSecond: string;
    yourRatePerSecond: string;
    yourRewardPerSecond: string;
    estimateAfterFee: string;
    perHour: string;
    perMonth: string;
    afterDays: string;
    estimateDisclaimer: string;
    dailyEarnings: string;
    hourlyEarnings: string;
    monthlyEarnings: string;
    remainingDays: string;
    principalLabel: string;
    estimatedInterest: string;
    totalReceive: string;

    // Claim History Panel
    claimHistoryTitle: string;
    claimHistoryContract: string;
    claimHistoryViewTx: string;
    claimHistoryNoRecords: string;
    claimHistoryAmount: string;
    claimHistoryTime: string;
    claimHistoryExplorerGuide: string;
    claimHistorySearchTip: string;
    claimHistorySearchExplorer: string;
    claimHistoryLoadError: string;
    claimHistoryShowingRecords: string;
    claimHistoryJustNow: string;
    claimHistoryMinutesAgo: string;
    claimHistoryHoursAgo: string;
    claimHistoryDaysAgo: string;

    // Explorer Guides
    leaderboardExplorerGuide: string;
    leaderboardSearchTip: string;
    donateExplorerGuide: string;
    donateSearchTip: string;
    searchOnExplorer: string;

    // Loading
    loadingData: string;
}

const translations: Record<Language, StakingTranslations> = {
    en: {
        ...globalTranslations.en,
        // Tour
        tourWelcomeTitle: "🎉 Welcome to Staking!",
        tourWelcomeDesc: "This tutorial will guide you through using BANMAO Staking Pool.\n\n✨ Stake tokens to earn rewards every second!\n💎 The longer you lock, the more you earn!\n\nClick \"Next\" to start.",
        tourConnectTitle: "🔗 Connect Wallet",
        tourConnectDesc: "Click here to connect with OKX Wallet or MetaMask.\n\nRequirements:\n• OKX X Layer Mainnet\n• Some $BANMAO tokens\n• A small amount of OKB for gas fees",
        tourTokenInfoTitle: "📊 Token Balance",
        tourTokenInfoDesc: "View your $BANMAO balance here.\n\nAfter staking, it will also show staked amount and pending rewards.",
        tourStakeOrbTitle: "🔒 Stake Orb",
        tourStakeOrbDesc: "Click to open the Stake panel.\nEnter the amount to stake and choose lock duration.",
        tourSmallPanelTitle: "📋 Mini Staking Panel",
        tourSmallPanelDesc: "This is the compact staking panel.\n\n• 🔒 Choose lock duration (7-365 days)\n• 💎 Longer lock = Higher APR (up to 200%!)\n• 📊 View all your active positions",
        tourExpandedPanelTitle: "📋 Staking Control Panel",
        tourExpandedPanelDesc: "The expanded panel shows:\n\n• All your stake positions\n• Pending rewards per position\n• Unlock countdown\n• APR details for each lock tier",
        tourClaimOrbTitle: "💰 Claim Rewards",
        tourClaimOrbDesc: "Click to open the Claim panel.\nCollect your accumulated rewards!",
        tourCompoundOrbTitle: "🔄 Compound",
        tourCompoundOrbDesc: "Click to open the Compound panel.\nAutomatically restake your rewards.",
        tourLeaderboardTitle: "🏆 Leaderboard",
        tourLeaderboardDesc: "View top stakers!\n\n• 📊 Sort by stake amount\n• ⏰ Or by lock duration\n• 🥇 Top 3 get special badges",
        tourSupportPoolTitle: "💜 Support Pool",
        tourSupportPoolDesc: "DONATE $BANMAO to Reward Pool!\n\n⚠️ IMPORTANT:\n• Tokens go DIRECTLY to Smart Contract\n• NO ONE can withdraw, pool only pays stakers per second\n\n💜 The staking contract only survives through community support. No matter how much, let's keep the $BANMAO flame burning together!\n\n🔗 Contract:\n0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172",
        tourEnergyCenterTitle: "⚡ Energy Center",
        tourEnergyCenterDesc: "Shows total BANMAO staked and pending rewards.\n\n🎉 Happy staking!",
        tourOrbStatsTitle: "📊 Orb Stats",
        tourOrbStatsDesc: "These floating orbs show:\n\n• ⚡ Total staked amount\n• 💰 Pending rewards\n• 📈 Current APR\n\nClick any orb to see details!",
        tourStatsOrbTitle: "📊 Stats Orb",
        tourUnstakeOrbTitle: "🔓 Unstake",
        tourUnstakeOrbDesc: "Click to open the Unstake panel.\nWithdraw your staked tokens!",

        // New keys EN
        lockFlexible: "Flexible",
        lock30Days: "30 Days",
        lock90Days: "90 Days",
        lock180Days: "180 Days",
        lock365Days: "365 Days",
        statsDaySymbol: "/day",
        statsSecSymbol: "/s",
        timeDaysShort: "d",
        timeHoursShort: "h",
        timeSecondsShort: "s",
        sphereOnline: "● ONLINE",
        sphereOffline: "● OFFLINE",
        statusUnlocked: "✅ Unlocked",
        statsRatePerSec: "RATE/SEC",
        statsPending: "PENDING",
        statsMyStake: "MY STAKE",
        sphereRewardPool: "REWARD POOL",
        panelClose: "Tap to Close",
        sphereTapToToggle: "Tap to Toggle",
        tapSphereHint: "Tap Sphere to Open Menu",
        tourSkip: "Skip",
        tourBack: "← Back",
        tourNext: "Next →",
        tourComplete: "✓ Complete",
        tourDontShow: "Don't show again",

        // Leaderboard
        leaderboardTitle: "🏆 Leaderboard",
        tabAmount: "💰 Amount",
        tabLock: "🔒 Duration",
        stakers: "stakers",
        yourRank: "You:",
        loading: "⏳ Loading...",
        noStakers: "No stakers yet",
        stakerDetail: "📊 Staker Details",
        rank: "🏆 Rank",
        totalStake: "💰 Total Stake",
        lockDuration: "🔒 Lock",
        transactionHistory: "📜 Transaction History",
        noTransactions: "No transactions (or not indexed)",
        viewOnExplorer: "View on Explorer",
        copy: "📋 Copy",
        copied: "✓ Copied",
        stakes: "🔒 Stakes:",
        unstakes: "🔓 Unstakes:",
        claims: "💰 Claims:",
        compounds: "🔄 Compounds:",

        // Supporter
        supportPoolTitle: "Support Pool",
        rewardPool: "Reward Pool",
        supporters: "Supporters",
        topSupporters: "🏆 Top Supporters",
        noSupporters: "No supporters yet",
        addToPool: "Add to Reward Pool:",
        amountPlaceholder: "Amount...",
        send: "💜 SEND",
        supportDetail: "💜 Support Details",
        total: "💰 Total:",
        contractNote: "⚠️ Tokens go directly to contract. No one can withdraw!",
        contractLink: "🔗 Contract",

        // Profile
        editsUsed: "edits used",
        editProfile: "Edit",
        editYourProfile: "Edit Your Profile",
        selectAvatar: "Select Avatar",
        displayName: "Display Name",
        cancelBtn: "Cancel",
        saveProfile: "Save",
        editsRemaining: "edits remaining",
        loadingBlockchain: "Loading from blockchain...",
        viewOnExplorerDirect: "View directly on Explorer",
        // Common Buttons & Titles
        closeBtn: "Close",
        panelStake: "Stake Panel",
        panelUnstake: "Unstake Panel",
        panelClaim: "Claim Panel",
        panelCompound: "Compound Panel",

        // StakePanel
        approveDesc: "Allow contract to stake your tokens",
        processing: "⏳ Processing...",
        balance: "💰 Balance",
        staked: "🔒 Staked",
        stakeAmount: "Stake Amount",
        insufficientBalance: "⚠️ Insufficient balance",
        approveToken: "Approve Token",
        stakingApprove: "Approve Stake",
        confirmStake: "Confirm Stake",
        selectLockDuration: "Select Lock Duration",

        // UnstakePanel
        inGracePeriod: "🎁 IN GRACE PERIOD",
        gracePeriodFree: "✅ Withdraw now - FREE!",
        lockRemaining: "remaining",
        gracePeriodEnded: "🔒 Grace period ended - lose",
        unlockAfter: "⏱️ Unlock after:",
        unlocked: "✅ Unlocked - Withdraw FREE!",
        unstakeFree: "WITHDRAW FREE",
        unstakeWithPenalty: "WITHDRAW (lose",
        selectNewLock: "Select new lock period:",
        cancel: "Cancel",
        confirm: "Confirm",
        stakedLabel: "Staked Amount",
        amountToUnstake: "Amount to Unstake",
        confirmUnstake: "Confirm Unstake",

        // ClaimPanel
        netReward: "Net Reward",
        youWillReceive: "You Will Receive",
        gross: "Gross",
        perDay: "day",
        poolShare: "Pool Share",
        avgMult: "Avg Mult.",
        shares: "Shares",
        yourStakes: "Your Stakes",
        rate: "Rate",
        pool: "Pool",
        fee: "Fee",
        claimRewards: "CLAIM REWARDS",
        noRewards: "No Rewards",
        package: "Package",
        amount: "Amount",
        multiplier: "Multiplier",
        reward: "Reward",
        stakeDate: "Stake Date",
        unlock: "Unlock",
        remaining: "Remaining",
        status: "Status",
        statusGrace: "🎁 Grace",
        statusLocked: "🔒 Locked",
        statusFree: "✅ Free",

        // CompoundPanel
        pendingRewards: "Pending Rewards:",
        newStakeLock: "New Stake Lock:",
        compound: "COMPOUND",
        compoundDesc: "Auto-restake rewards",

        // Reward Calculator
        estimatedEarnings: "📊 ESTIMATED EARNINGS",
        poolPercentNote: "% Pool (at claim)",
        ratePerSecond: "⚡ Rate/sec:",
        allRatePerSecond: "All Rate/sec",
        yourRatePerSecond: "You/sec",
        yourRewardPerSecond: "🎯 You receive/sec:",
        estimateAfterFee: "💰 Estimate (after 2% fee):",
        perHour: "• Per hour:",
        perMonth: "• Per month:",
        afterDays: "• After",
        estimateDisclaimer: "⚠️ Estimate based on current rate, may change over time",
        dailyEarnings: "💰 Daily earnings:",
        hourlyEarnings: "Hourly earnings",
        monthlyEarnings: "Monthly earnings",
        remainingDays: "📈 Remaining",
        principalLabel: "💰 Principal:",
        estimatedInterest: "📈 Est. interest",
        totalReceive: "💎 TOTAL RECEIVE:",

        // Claim History
        claimHistoryTitle: "Claim Reward History",
        claimHistoryContract: "Staking Contract",
        claimHistoryViewTx: "View TX",
        claimHistoryNoRecords: "No claim history yet",
        claimHistoryAmount: "Amount",
        claimHistoryTime: "Time",
        claimHistoryExplorerGuide: "To find older claim history, search on XLayer Explorer",
        claimHistorySearchTip: "Enter the keyword below in Explorer search to find all reward claim transactions:",
        claimHistorySearchExplorer: "Search on Explorer",
        claimHistoryLoadError: "Failed to load claim history",
        claimHistoryShowingRecords: "Showing {count} recent claims",
        claimHistoryJustNow: "Just now",
        claimHistoryMinutesAgo: "{n} min ago",
        claimHistoryHoursAgo: "{n} hour ago",
        claimHistoryDaysAgo: "{n} day ago",

        // Explorer Guides
        leaderboardExplorerGuide: "To find staking history, search on Explorer",
        leaderboardSearchTip: "💡 Tip: Enter \"stake\" (to stake) or \"unstakeById\" (to withdraw)",
        donateExplorerGuide: "To find donation history, search on Explorer",
        donateSearchTip: "💡 Tip: Enter \"donate\" to find all donation transactions",
        searchOnExplorer: "Search on Explorer",

        // Loading
        loadingData: "Loading data..."
    },
    vi: {
        ...globalTranslations.vi,
        // Tour
        tourWelcomeTitle: "🎉 Chào mừng đến Staking!",
        tourWelcomeDesc: "Hướng dẫn này sẽ giúp bạn sử dụng BANMAO Staking Pool.\n\n✨ Stake token để nhận thưởng mỗi giây!\n💎 Lock càng lâu, thưởng càng cao!\n\nNhấn \"Tiếp theo\" để bắt đầu.",
        tourConnectTitle: "🔗 Kết nối Wallet",
        tourConnectDesc: "Nhấn vào đây để kết nối ví OKX Wallet hoặc MetaMask.\n\nYêu cầu:\n• Mạng OKX X Layer Mainnet\n• Có $BANMAO trong ví\n• Một ít OKB cho phí gas",
        tourTokenInfoTitle: "📊 Số dư Token",
        tourTokenInfoDesc: "Xem số dư $BANMAO của bạn tại đây.\n\nSau khi stake, sẽ hiển thị thêm số đang stake và thưởng chờ nhận.",
        tourStakeOrbTitle: "🔒 Quả cầu Stake",
        tourStakeOrbDesc: "Nhấn để mở panel Stake.\nNhập số lượng stake và chọn thời gian lock.",
        tourSmallPanelTitle: "📋 Panel Staking Thu Gọn",
        tourSmallPanelDesc: "Đây là panel staking thu gọn.\n\n• 🔒 Chọn thời gian lock (7-365 ngày)\n• 💎 Lock lâu hơn = APR cao hơn (tới 200%!)\n• 📊 Xem tất cả vị thế của bạn",
        tourExpandedPanelTitle: "📋 Panel Điều Khiển Staking",
        tourExpandedPanelDesc: "Panel mở rộng hiển thị:\n\n• Tất cả vị thế stake của bạn\n• Thưởng chờ nhận mỗi vị thế\n• Đếm ngược thời gian mở khóa\n• Chi tiết APR cho từng mức lock",
        tourClaimOrbTitle: "💰 Nhận Thưởng",
        tourClaimOrbDesc: "Nhấn để mở panel Claim.\nNhận thưởng đã tích lũy của bạn!",
        tourCompoundOrbTitle: "🔄 Tái đầu tư",
        tourCompoundOrbDesc: "Nhấn để mở panel Compound.\nTự động stake lại rewards của bạn.",
        tourLeaderboardTitle: "🏆 Bảng Xếp Hạng",
        tourLeaderboardDesc: "Xem top người stake nhiều nhất!\n\n• 📊 Xếp theo số lượng stake\n• ⏰ Hoặc theo thời gian lock\n• 🥇 Top 3 có huy chương đặc biệt",
        tourSupportPoolTitle: "💜 Ủng Hộ Pool",
        tourSupportPoolDesc: "DONATE $BANMAO vào Reward Pool!\n\n⚠️ LƯU Ý QUAN TRỌNG:\n• Tiền được gửi THẲNG vào Smart Contract\n• KHÔNG AI có quyền rút, pool chỉ dùng trả thưởng theo giây cho người stake\n\n💜 Vì hợp đồng staking chỉ duy trì được khi có người ủng hộ vào pool thưởng, nên mong mọi người trong cộng đồng, dù ít hay nhiều thì hãy cùng nhau thắp sáng ngọn lửa $BANMAO này nhé!\n\n🔗 Contract:\n0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172",
        tourEnergyCenterTitle: "⚡ Trung tâm năng lượng",
        tourEnergyCenterDesc: "Hiển thị tổng số BANMAO đang stake và reward đang chờ nhận.\n\n🎉 Chúc bạn staking thành công!",
        tourOrbStatsTitle: "📊 Thống Kê Orb",
        tourOrbStatsDesc: "Các quả cầu lơ lửng hiển thị:\n\n• ⚡ Tổng số đang stake\n• 💰 Thưởng chờ nhận\n• 📈 APR hiện tại\n\nNhấn vào bất kỳ orb nào để xem chi tiết!",
        tourStatsOrbTitle: "📊 Orb Thống Kê",
        tourUnstakeOrbTitle: "🔓 Rút Stake",
        tourUnstakeOrbDesc: "Nhấn để mở panel Unstake.\nRút token đã stake của bạn!",

        // New keys VI
        lockFlexible: "Linh hoạt",
        lock30Days: "30 Ngày",
        lock90Days: "90 Ngày",
        lock180Days: "180 Ngày",
        lock365Days: "365 Ngày",
        statsDaySymbol: "/ngày",
        statsSecSymbol: "/giây",
        timeDaysShort: "n",
        timeHoursShort: "g",
        timeSecondsShort: " giây",
        sphereOnline: "● TRỰC TUYẾN",
        sphereOffline: "● NGOẠI TUYẾN",
        statusUnlocked: "✅ Đã mở khóa",
        statsRatePerSec: "TỐC ĐỘ/GIÂY",
        statsPending: "ĐANG CHỜ",
        statsMyStake: "STAKE CỦA TÔI",
        sphereRewardPool: "KHO THƯỞNG",
        panelClose: "Chạm để đóng",
        sphereTapToToggle: "Chạm để bật/tắt",
        tapSphereHint: "Chạm vào cầu để mở menu",
        tourSkip: "Bỏ qua",
        tourBack: "← Quay lại",
        tourNext: "Tiếp theo →",
        tourComplete: "✓ Hoàn thành",
        tourDontShow: "Không hiện lại",

        // Leaderboard
        leaderboardTitle: "🏆 Bảng Xếp Hạng",
        tabAmount: "💰 Số lượng",
        tabLock: "🔒 Thời gian",
        stakers: "người stake",
        yourRank: "Bạn:",
        loading: "⏳ Đang tải...",
        noStakers: "Chưa có ai stake",
        stakerDetail: "📊 Chi Tiết Người Stake",
        rank: "🏆 Hạng",
        totalStake: "💰 Tổng Stake",
        lockDuration: "🔒 Lock",
        transactionHistory: "📜 Lịch Sử Giao Dịch",
        noTransactions: "Chưa có giao dịch (hoặc chưa indexed)",
        viewOnExplorer: "Xem trên Explorer",
        copy: "📋 Sao chép",
        copied: "✓ Đã sao chép",
        stakes: "🔒 Stakes:",
        unstakes: "🔓 Unstakes:",
        claims: "💰 Claims:",
        compounds: "🔄 Compounds:",

        // Supporter
        supportPoolTitle: "Ủng Hộ Pool",
        rewardPool: "Reward Pool",
        supporters: "Người ủng hộ",
        topSupporters: "🏆 Top Supporters",
        noSupporters: "Chưa có ai ủng hộ",
        addToPool: "Thêm vào Reward Pool:",
        amountPlaceholder: "Số lượng...",
        send: "💜 GỬI",
        supportDetail: "💜 Chi Tiết Ủng Hộ",
        total: "💰 Tổng:",
        contractNote: "⚠️ Tiền gửi thẳng vào contract. Không ai có thể rút!",
        contractLink: "🔗 Contract",

        // Profile
        editsUsed: "lần chỉnh sửa",
        editProfile: "Sửa",
        editYourProfile: "Sửa Hồ Sơ",
        selectAvatar: "Chọn Avatar",
        displayName: "Tên hiển thị",
        cancelBtn: "Hủy",
        saveProfile: "Lưu",
        editsRemaining: "lần chỉnh sửa còn lại",
        loadingBlockchain: "Đang tải từ blockchain...",
        viewOnExplorerDirect: "Xem trực tiếp trên Explorer",
        // Common Buttons & Titles
        closeBtn: "Đóng",
        panelStake: "Panel Stake",
        panelUnstake: "Panel Unstake",
        panelClaim: "Panel Claim",
        panelCompound: "Panel Compound",

        // StakePanel
        approveDesc: "Cho phép hợp đồng stake token của bạn",
        processing: "⏳ Đang xử lý...",
        balance: "💰 Số dư",
        staked: "🔒 Đã stake",
        stakeAmount: "Số lượng stake",
        insufficientBalance: "⚠️ Số dư không đủ",
        approveToken: "Phê duyệt Token",
        stakingApprove: "Phê duyệt Stake",
        confirmStake: "Xác nhận Stake",
        selectLockDuration: "Chọn thời gian khóa",

        // UnstakePanel
        inGracePeriod: "🎁 ĐANG TRONG ÂN HẠN",
        gracePeriodFree: "✅ Rút ngay - MIỄN PHÍ!",
        lockRemaining: "còn lại",
        gracePeriodEnded: "🔒 Đã hết ân hạn - mất",
        unlockAfter: "⏱️ Hết khóa sau:",
        unlocked: "✅ Đã hết khóa - Rút MIỄN PHÍ!",
        unstakeFree: "RÚT MIỄN PHÍ",
        unstakeWithPenalty: "RÚT (mất",
        selectNewLock: "Chọn kỳ hạn mới:",
        cancel: "Hủy",
        confirm: "Xác nhận",
        stakedLabel: "Số lượng đã stake",
        amountToUnstake: "Số lượng muốn rút",
        confirmUnstake: "Xác nhận rút",

        // ClaimPanel
        netReward: "Thực nhận",
        youWillReceive: "Bạn sẽ nhận",
        gross: "Trước phí",
        perDay: "ngày",
        poolShare: "Tỷ lệ Pool",
        avgMult: "Hệ số TB",
        shares: "Shares",
        yourStakes: "Các gói stake",
        rate: "Rate",
        pool: "Pool",
        fee: "Phí",
        claimRewards: "NHẬN THƯỞNG",
        noRewards: "Không có thưởng",
        package: "Gói",
        amount: "Số lượng",
        multiplier: "Hệ số",
        reward: "Thưởng",
        stakeDate: "Ngày stake",
        unlock: "Mở khóa",
        remaining: "Còn lại",
        status: "Trạng thái",
        statusGrace: "🎁 Ân hạn",
        statusLocked: "🔒 Đang khóa",
        statusFree: "✅ Miễn phí",

        // CompoundPanel
        pendingRewards: "Thưởng chờ nhận:",
        newStakeLock: "Kỳ hạn mới:",
        compound: "TÁI ĐẦU TƯ",
        compoundDesc: "Tự động stake lại thưởng",

        // Reward Calculator
        estimatedEarnings: "📊 DỰ TÍNH THU NHẬP",
        poolPercentNote: "% Pool (tính lúc claim)",
        ratePerSecond: "⚡ Rate/giây:",
        allRatePerSecond: "All Rate/giây",
        yourRatePerSecond: "Bạn nhận/giây",
        yourRewardPerSecond: "🎯 Bạn nhận/giây:",
        estimateAfterFee: "💰 Ước tính (sau phí 2%):",
        perHour: "• Mỗi giờ:",
        perMonth: "• Mỗi tháng:",
        afterDays: "• Sau",
        estimateDisclaimer: "⚠️ Ước tính dựa trên tỷ lệ hiện tại, có thể thay đổi theo thời gian",
        dailyEarnings: "💰 Thu nhập/ngày:",
        hourlyEarnings: "Thu nhập/giờ",
        monthlyEarnings: "Thu nhập/tháng",
        remainingDays: "📈 Còn",
        principalLabel: "💰 Gốc:",
        estimatedInterest: "📈 Lãi ước tính",
        totalReceive: "💎 TỔNG NHẬN:",

        // Claim History
        claimHistoryTitle: "Lịch Sử Claim Thưởng",
        claimHistoryContract: "Hợp Đồng Staking",
        claimHistoryViewTx: "Xem TX",
        claimHistoryNoRecords: "Chưa có lịch sử claim",
        claimHistoryAmount: "Số lượng",
        claimHistoryTime: "Thời gian",
        claimHistoryExplorerGuide: "Để tìm lịch sử claim cũ hơn, tìm kiếm trên XLayer Explorer",
        claimHistorySearchTip: "Nhập từ khóa bên dưới vào ô tìm kiếm Explorer để tìm tất cả giao dịch nhận thưởng:",
        claimHistorySearchExplorer: "Tìm trên Explorer",
        claimHistoryLoadError: "Không thể tải lịch sử claim",
        claimHistoryShowingRecords: "Hiển thị {count} lần nhận gần đây",
        claimHistoryJustNow: "Vừa xong",
        claimHistoryMinutesAgo: "{n} phút trước",
        claimHistoryHoursAgo: "{n} giờ trước",
        claimHistoryDaysAgo: "{n} ngày trước",

        // Explorer Guides
        leaderboardExplorerGuide: "Để tìm lịch sử staking, tìm kiếm trên Explorer",
        leaderboardSearchTip: "💡 Mẹo: Nhập \"stake\" (nạp) hoặc \"unstakeById\" (rút)",
        donateExplorerGuide: "Để tìm lịch sử quyên góp, tìm kiếm trên Explorer",
        donateSearchTip: "💡 Mẹo: Nhập \"donate\" để tìm tất cả giao dịch quyên góp",
        searchOnExplorer: "Tìm kiếm trên Explorer",

        // Loading
        loadingData: "Đang tải dữ liệu..."
    },
    zh: {
        ...globalTranslations.zh,
        // Tour
        tourWelcomeTitle: "🎉 欢迎来到质押!",
        tourWelcomeDesc: "本教程将指导您使用 BANMAO 质押池。\n\n✨ 质押代币，每秒赚取奖励！\n💎 锁定时间越长，奖励越多！\n\n点击\"下一步\"开始。",
        tourConnectTitle: "🔗 连接钱包",
        tourConnectDesc: "点击此处连接 OKX 钱包或 MetaMask。\n\n要求：\n• OKX X Layer 主网\n• 持有 $BANMAO 代币\n• 少量 OKB 用于 Gas 费",
        tourTokenInfoTitle: "📊 代币余额",
        tourTokenInfoDesc: "在此查看您的 $BANMAO 余额。\n\n质押后，还会显示质押数量和待领奖励。",
        tourStakeOrbTitle: "🔒 质押球体",
        tourStakeOrbDesc: "点击打开质押面板。\n输入质押数量并选择锁定时间。",
        tourSmallPanelTitle: "📋 迷你质押面板",
        tourSmallPanelDesc: "这是紧凑型质押面板。\n\n• 🔒 选择锁定时间（7-365天）\n• 💎 锁定越长 = APR 越高（高达 200%！）\n• 📊 查看所有活跃仓位",
        tourExpandedPanelTitle: "📋 质押控制面板",
        tourExpandedPanelDesc: "扩展面板显示：\n\n• 您的所有质押仓位\n• 每个仓位的待领奖励\n• 解锁倒计时\n• 各锁定级别的 APR 详情",
        tourClaimOrbTitle: "💰 领取奖励",
        tourClaimOrbDesc: "点击打开领取面板。\n收集您累积的奖励！",
        tourCompoundOrbTitle: "🔄 复利",
        tourCompoundOrbDesc: "点击打开复利面板。\n自动重新质押您的奖励。",
        tourLeaderboardTitle: "🏆 排行榜",
        tourLeaderboardDesc: "查看顶级质押者！\n\n• 📊 按质押数量排序\n• ⏰ 或按锁定时间排序\n• 🥇 前3名获得特殊徽章",
        tourSupportPoolTitle: "💜 支持池",
        tourSupportPoolDesc: "将 $BANMAO 捐赠到奖励池！\n\n⚠️ 重要提示：\n• 代币直接进入智能合约\n• 任何人都无法提取，池只按秒向质押者支付\n\n💜 质押合约只有在社区支持下才能持续运行。无论多少，让我们一起点燃 $BANMAO 的火焰吧！\n\n🔗 合约：\n0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172",
        tourEnergyCenterTitle: "⚡ 能量中心",
        tourEnergyCenterDesc: "显示质押的 BANMAO 总量和待领奖励。\n\n🎉 祝您质押愉快！",
        tourOrbStatsTitle: "📊 球体统计",
        tourOrbStatsDesc: "这些浮动球体显示：\n\n• ⚡ 总质押数量\n• 💰 待领奖励\n• 📈 当前 APR\n\n点击任意球体查看详情！",
        tourStatsOrbTitle: "📊 统计球体",
        tourUnstakeOrbTitle: "🔓 解除质押",
        tourUnstakeOrbDesc: "点击打开解押面板。\n提取您的质押代币！",

        // New keys ZH
        lockFlexible: "活期",
        lock30Days: "30 天",
        lock90Days: "90 天",
        lock180Days: "180 天",
        lock365Days: "365 天",
        statsDaySymbol: "/天",
        statsSecSymbol: "/秒",
        timeDaysShort: "天",
        timeHoursShort: "时",
        timeSecondsShort: "秒",
        sphereOnline: "● 在线",
        sphereOffline: "● 离线",
        statusUnlocked: "✅ 已解锁",
        statsRatePerSec: "速率/秒",
        statsPending: "待领取",
        statsMyStake: "我的质押",
        sphereRewardPool: "奖励池",
        panelClose: "点击关闭",
        sphereTapToToggle: "点击切换",
        tapSphereHint: "点击球体打开菜单",
        tourSkip: "跳过",
        tourBack: "← 返回",
        tourNext: "下一步 →",
        tourComplete: "✓ 完成",
        tourDontShow: "不再显示",

        // Leaderboard
        leaderboardTitle: "🏆 排行榜",
        tabAmount: "💰 数量",
        tabLock: "🔒 时间",
        stakers: "质押者",
        yourRank: "您:",
        loading: "⏳ 加载中...",
        noStakers: "暂无质押者",
        stakerDetail: "📊 质押者详情",
        rank: "🏆 排名",
        totalStake: "💰 总质押",
        lockDuration: "🔒 锁定",
        transactionHistory: "📜 交易历史",
        noTransactions: "暂无交易（或未索引）",
        viewOnExplorer: "在浏览器中查看",
        copy: "📋 复制",
        copied: "✓ 已复制",
        stakes: "🔒 质押:",
        unstakes: "🔓 解押:",
        claims: "💰 领取:",
        compounds: "🔄 复利:",

        // Supporter
        supportPoolTitle: "支持池",
        rewardPool: "奖励池",
        supporters: "支持者",
        topSupporters: "🏆 顶级支持者",
        noSupporters: "暂无支持者",
        addToPool: "添加到奖励池：",
        amountPlaceholder: "数量...",
        send: "💜 发送",
        supportDetail: "💜 支持详情",
        total: "💰 总计:",
        contractNote: "⚠️ 代币直接进入合约。任何人都无法提取！",
        contractLink: "🔗 合约",

        // Profile
        editsUsed: "次编辑已用",
        editProfile: "编辑",
        editYourProfile: "编辑个人资料",
        selectAvatar: "选择头像",
        displayName: "显示名称",
        cancelBtn: "取消",
        saveProfile: "保存",
        editsRemaining: "次编辑剩余",
        loadingBlockchain: "正在从区块链加载...",
        viewOnExplorerDirect: "直接在浏览器查看",
        // Common Buttons & Titles
        closeBtn: "关闭",
        panelStake: "质押面板",
        panelUnstake: "解押面板",
        panelClaim: "领取面板",
        panelCompound: "复利面板",

        // StakePanel
        approveDesc: "允许合约质押您的代币",
        processing: "⏳ 处理中...",
        balance: "💰 余额",
        staked: "🔒 已质押",
        stakeAmount: "质押数量",
        insufficientBalance: "⚠️ 余额不足",
        approveToken: "批准代币",
        stakingApprove: "批准质押",
        confirmStake: "确认质押",
        selectLockDuration: "选择锁定时间",

        // UnstakePanel
        inGracePeriod: "🎁 宽限期内",
        gracePeriodFree: "✅ 立即提取 - 免费！",
        lockRemaining: "剩余",
        gracePeriodEnded: "🔒 宽限期已结束 - 损失",
        unlockAfter: "⏱️ 解锁后：",
        unlocked: "✅ 已解锁 - 免费提取！",
        unstakeFree: "免费提取",
        unstakeWithPenalty: "提取（损失",
        selectNewLock: "选择新锁定期：",
        cancel: "取消",
        confirm: "确认",
        stakedLabel: "已质押数量",
        amountToUnstake: "解押数量",
        confirmUnstake: "确认解押",

        // ClaimPanel
        netReward: "实际收益",
        youWillReceive: "您将收到",
        gross: "税前",
        perDay: "天",
        poolShare: "池份额",
        avgMult: "平均倍数",
        shares: "份额",
        yourStakes: "您的质押",
        rate: "费率",
        pool: "池",
        fee: "费用",
        claimRewards: "领取奖励",
        noRewards: "无奖励",
        package: "套餐",
        amount: "数量",
        multiplier: "倍数",
        reward: "奖励",
        stakeDate: "质押日期",
        unlock: "解锁",
        remaining: "剩余",
        status: "状态",
        statusGrace: "🎁 宽限",
        statusLocked: "🔒 锁定",
        statusFree: "✅ 自由",

        // CompoundPanel
        pendingRewards: "待领奖励：",
        newStakeLock: "新锁定期：",
        compound: "复利",
        compoundDesc: "自动重新质押奖励",

        // Reward Calculator
        estimatedEarnings: "📊 预计收益",
        poolPercentNote: "% 池份额 (领取时)",
        ratePerSecond: "⚡ 速率/秒:",
        allRatePerSecond: "总速率/秒",
        yourRatePerSecond: "你的速率/秒",
        yourRewardPerSecond: "🎯 您获得/秒:",
        estimateAfterFee: "💰 预计 (扣除2%费用后):",
        perHour: "• 每小时:",
        perMonth: "• 每月:",
        afterDays: "• 之后",
        estimateDisclaimer: "⚠️ 预估基于当前利率，可能随时间变化",
        dailyEarnings: "💰 每日收益:",
        hourlyEarnings: "每小时收益",
        monthlyEarnings: "每月收益",
        remainingDays: "📈 剩余",
        principalLabel: "💰 本金:",
        estimatedInterest: "📈 预计利息",
        totalReceive: "💎 总收入:",

        // Claim History
        claimHistoryTitle: "领取奖励历史",
        claimHistoryContract: "质押合约",
        claimHistoryViewTx: "查看交易",
        claimHistoryNoRecords: "暂无领取历史",
        claimHistoryAmount: "数量",
        claimHistoryTime: "时间",
        claimHistoryExplorerGuide: "查找更早的领取历史，请在 XLayer Explorer 中搜索",
        claimHistorySearchTip: "在 Explorer 搜索框中输入以下关键字，找到所有奖励领取交易：",
        claimHistorySearchExplorer: "在 Explorer 搜索",
        claimHistoryLoadError: "无法加载领取历史",
        claimHistoryShowingRecords: "显示 {count} 条最近记录",
        claimHistoryJustNow: "刚刚",
        claimHistoryMinutesAgo: "{n} 分钟前",
        claimHistoryHoursAgo: "{n} 小时前",
        claimHistoryDaysAgo: "{n} 天前",

        // Explorer Guides
        leaderboardExplorerGuide: "查找质押历史，请在Explorer中搜索",
        leaderboardSearchTip: "💡 提示：输入 \"stake\"（质押）或 \"unstakeById\"（取出）",
        donateExplorerGuide: "查找捐赠历史，请在Explorer中搜索",
        donateSearchTip: "💡 提示：输入 \"donate\" 查找所有捐赠交易",
        searchOnExplorer: "在Explorer上搜索",

        // Loading
        loadingData: "正在加载数据..."
    },
    ko: {
        ...globalTranslations.ko,
        // Tour
        tourWelcomeTitle: "🎉 스테이킹에 오신 것을 환영합니다!",
        tourWelcomeDesc: "이 튜토리얼이 BANMAO 스테이킹 풀 사용법을 안내합니다.\n\n✨ 토큰을 스테이킹하고 매초 보상을 받으세요!\n💎 잠금 기간이 길수록 더 많이 벌어요!\n\n\"다음\"을 클릭하여 시작하세요.",
        tourConnectTitle: "🔗 지갑 연결",
        tourConnectDesc: "여기를 클릭하여 OKX 지갑 또는 MetaMask를 연결하세요.\n\n요구 사항:\n• OKX X Layer 메인넷\n• $BANMAO 토큰 보유\n• 가스비를 위한 소량의 OKB",
        tourTokenInfoTitle: "📊 토큰 잔액",
        tourTokenInfoDesc: "여기에서 $BANMAO 잔액을 확인하세요.\n\n스테이킹 후 스테이킹 금액과 대기 중인 보상도 표시됩니다.",
        tourStakeOrbTitle: "🔒 스테이크 오브",
        tourStakeOrbDesc: "클릭하여 스테이크 패널을 엽니다.\n스테이킹할 금액을 입력하고 잠금 기간을 선택하세요.",
        tourSmallPanelTitle: "📋 미니 스테이킹 패널",
        tourSmallPanelDesc: "컴팩트한 스테이킹 패널입니다.\n\n• 🔒 잠금 기간 선택 (7-365일)\n• 💎 잠금 기간이 길수록 = 높은 APR (최대 200%!)\n• 📊 모든 활성 포지션 보기",
        tourExpandedPanelTitle: "📋 스테이킹 제어 패널",
        tourExpandedPanelDesc: "확장 패널 표시:\n\n• 모든 스테이크 포지션\n• 포지션별 대기 보상\n• 잠금 해제 카운트다운\n• 각 잠금 등급별 APR 세부 정보",
        tourClaimOrbTitle: "💰 보상 청구",
        tourClaimOrbDesc: "클릭하여 청구 패널을 엽니다.\n누적된 보상을 받으세요!",
        tourCompoundOrbTitle: "🔄 복리",
        tourCompoundOrbDesc: "클릭하여 복리 패널을 엽니다.\n보상을 자동으로 재스테이킹합니다.",
        tourLeaderboardTitle: "🏆 리더보드",
        tourLeaderboardDesc: "상위 스테이커를 확인하세요!\n\n• 📊 스테이킹 금액으로 정렬\n• ⏰ 또는 잠금 기간으로 정렬\n• 🥇 상위 3명에게 특별 배지 제공",
        tourSupportPoolTitle: "💜 지원 풀",
        tourSupportPoolDesc: "$BANMAO를 리워드 풀에 기부하세요!\n\n⚠️ 중요:\n• 토큰은 스마트 컨트랙트로 직접 전송\n• 아무도 출금 불가, 풀은 초당 스테이커에게만 지급\n\n💜 스테이킹 컨트랙트는 커뮤니티 지원으로만 유지됩니다. 적든 많든 함께 $BANMAO의 불꽃을 밝혀 주세요!\n\n🔗 컨트랙트:\n0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172",
        tourEnergyCenterTitle: "⚡ 에너지 센터",
        tourEnergyCenterDesc: "스테이킹된 총 BANMAO와 대기 보상을 표시합니다.\n\n🎉 스테이킹 즐기세요!",
        tourOrbStatsTitle: "📊 오브 통계",
        tourOrbStatsDesc: "떠 있는 오브 표시:\n\n• ⚡ 총 스테이킹 금액\n• 💰 대기 보상\n• 📈 현재 APR\n\n오브를 클릭하여 세부 정보 확인!",
        tourStatsOrbTitle: "📊 통계 오브",
        tourUnstakeOrbTitle: "🔓 언스테이크",
        tourUnstakeOrbDesc: "클릭하여 언스테이크 패널을 엽니다.\n스테이킹된 토큰을 출금하세요!",

        // New keys KO
        lockFlexible: "자유형",
        lock30Days: "30 일",
        lock90Days: "90 일",
        lock180Days: "180 일",
        lock365Days: "365 일",
        statsDaySymbol: "/일",
        statsSecSymbol: "/초",
        timeDaysShort: "일",
        timeHoursShort: "시간",
        timeSecondsShort: "초",
        sphereOnline: "● 온라인",
        sphereOffline: "● 오프라인",
        statusUnlocked: "✅ 잠금 해제됨",
        statsRatePerSec: "초당 보상",
        statsPending: "대기 중",
        statsMyStake: "내 스테이크",
        sphereRewardPool: "보상 풀",
        panelClose: "탭하여 닫기",
        sphereTapToToggle: "탭하여 전환",
        tapSphereHint: "메뉴를 열려면 구체를 탭하세요",
        tourSkip: "건너뛰기",
        tourBack: "← 뒤로",
        tourNext: "다음 →",
        tourComplete: "✓ 완료",
        tourDontShow: "다시 표시 안 함",

        // Leaderboard
        leaderboardTitle: "🏆 리더보드",
        tabAmount: "💰 금액",
        tabLock: "🔒 기간",
        stakers: "스테이커",
        yourRank: "당신:",
        loading: "⏳ 로딩 중...",
        noStakers: "아직 스테이커 없음",
        stakerDetail: "📊 스테이커 상세 정보",
        rank: "🏆 순위",
        totalStake: "💰 총 스테이크",
        lockDuration: "🔒 잠금",
        transactionHistory: "📜 거래 내역",
        noTransactions: "거래 없음 (또는 인덱싱되지 않음)",
        viewOnExplorer: "익스플로러에서 보기",
        copy: "📋 복사",
        copied: "✓ 복사됨",
        stakes: "🔒 스테이크:",
        unstakes: "🔓 언스테이크:",
        claims: "💰 청구:",
        compounds: "🔄 복리:",

        // Supporter
        supportPoolTitle: "지원 풀",
        rewardPool: "리워드 풀",
        supporters: "지원자",
        topSupporters: "🏆 상위 지원자",
        noSupporters: "아직 지원자 없음",
        addToPool: "리워드 풀에 추가:",
        amountPlaceholder: "금액...",
        send: "💜 보내기",
        supportDetail: "💜 지원 상세",
        total: "💰 총계:",
        contractNote: "⚠️ 토큰이 컨트랙트로 직접 전송됩니다. 아무도 출금 불가!",
        contractLink: "🔗 컨트랙트",

        // Profile
        editsUsed: "회 편집됨",
        editProfile: "편집",
        editYourProfile: "프로필 편집",
        selectAvatar: "아바타 선택",
        displayName: "표시 이름",
        cancelBtn: "취소",
        saveProfile: "저장",
        editsRemaining: "회 편집 가능",
        loadingBlockchain: "블록체인에서 로드 중...",
        viewOnExplorerDirect: "탐색기에서 직접 보기",
        // Common Buttons & Titles
        closeBtn: "닫기",
        panelStake: "스테이크 패널",
        panelUnstake: "언스테이크 패널",
        panelClaim: "청구 패널",
        panelCompound: "복리 패널",

        // StakePanel
        approveDesc: "컨트랙트가 토큰을 스테이킹하도록 허용",
        processing: "⏳ 처리 중...",
        balance: "💰 잔액",
        staked: "🔒 스테이킹됨",
        stakeAmount: "스테이킹 금액",
        insufficientBalance: "⚠️ 잔액 부족",
        approveToken: "토큰 승인",
        stakingApprove: "스테이크 승인",
        confirmStake: "스테이크 확인",
        selectLockDuration: "잠금 기간 선택",

        // UnstakePanel
        inGracePeriod: "🎁 유예 기간 중",
        gracePeriodFree: "✅ 지금 출금 - 무료!",
        lockRemaining: "남음",
        gracePeriodEnded: "🔒 유예 기간 종료 - 손실",
        unlockAfter: "⏱️ 잠금 해제 후:",
        unlocked: "✅ 잠금 해제 - 무료 출금!",
        unstakeFree: "무료 출금",
        unstakeWithPenalty: "출금 (손실",
        selectNewLock: "새 잠금 기간 선택:",
        cancel: "취소",
        confirm: "확인",
        stakedLabel: "스테이킹된 수량",
        amountToUnstake: "언스테이크 수량",
        confirmUnstake: "언스테이크 확인",

        // ClaimPanel
        netReward: "순 보상",
        youWillReceive: "받게 될 금액",
        gross: "총액",
        perDay: "일",
        poolShare: "풀 지분",
        avgMult: "평균 배수",
        shares: "지분",
        yourStakes: "내 스테이크",
        rate: "비율",
        pool: "풀",
        fee: "수수료",
        claimRewards: "보상 청구",
        noRewards: "보상 없음",
        package: "패키지",
        amount: "금액",
        multiplier: "배수",
        reward: "보상",
        stakeDate: "스테이킹 날짜",
        unlock: "잠금 해제",
        remaining: "남은 시간",
        status: "상태",
        statusGrace: "🎁 유예",
        statusLocked: "🔒 잠금",
        statusFree: "✅ 자유",

        // CompoundPanel
        pendingRewards: "대기 보상:",
        newStakeLock: "새 잠금 기간:",
        compound: "복리",
        compoundDesc: "자동 재스테이킹",

        // Reward Calculator
        estimatedEarnings: "📊 예상 수익",
        poolPercentNote: "% 풀 (청구 시)",
        ratePerSecond: "⚡ 속도/초:",
        allRatePerSecond: "총 속도/초",
        yourRatePerSecond: "당신의 속도/초",
        yourRewardPerSecond: "🎯 당신의 수익/초:",
        estimateAfterFee: "💰 예상 (2% 수수료 차감 후):",
        perHour: "• 시간당:",
        perMonth: "• 월간:",
        afterDays: "• 이후",
        estimateDisclaimer: "⚠️ 현재 이율 기준 예상치, 시간에 따라 변동 가능",
        dailyEarnings: "💰 일일 수익:",
        hourlyEarnings: "시간당 수익",
        monthlyEarnings: "월간 수익",
        remainingDays: "📈 남은",
        principalLabel: "💰 원금:",
        estimatedInterest: "📈 예상 이자",
        totalReceive: "💎 총 수령:",

        // Claim History
        claimHistoryTitle: "보상 청구 내역",
        claimHistoryContract: "스테이킹 계약",
        claimHistoryViewTx: "거래 보기",
        claimHistoryNoRecords: "청구 내역이 없습니다",
        claimHistoryAmount: "금액",
        claimHistoryTime: "시간",
        claimHistoryExplorerGuide: "이전 청구 내역을 찾으려면 XLayer Explorer에서 검색하세요",
        claimHistorySearchTip: "아래 키워드를 Explorer 검색창에 입력하여 모든 보상 청구 거래를 찾으세요:",
        claimHistorySearchExplorer: "Explorer에서 검색",
        claimHistoryLoadError: "청구 내역을 불러올 수 없습니다",
        claimHistoryShowingRecords: "최근 {count}건 표시",
        claimHistoryJustNow: "방금",
        claimHistoryMinutesAgo: "{n}분 전",
        claimHistoryHoursAgo: "{n}시간 전",
        claimHistoryDaysAgo: "{n}일 전",

        // Explorer Guides
        leaderboardExplorerGuide: "스테이킹 기록을 찾으려면 Explorer에서 검색하세요",
        leaderboardSearchTip: "💡 팁: \"stake\"(스테이킹) 또는 \"unstakeById\"(출금)을 입력",
        donateExplorerGuide: "기부 기록을 찾으려면 Explorer에서 검색하세요",
        donateSearchTip: "💡 팁: \"donate\"를 입력하여 모든 기부 거래 찾기",
        searchOnExplorer: "Explorer에서 검색",

        // Loading
        loadingData: "데이터 로딩 중..."
    },
    ru: {
        ...globalTranslations.ru,
        // Tour
        tourWelcomeTitle: "🎉 Добро пожаловать в Стейкинг!",
        tourWelcomeDesc: "Это руководство поможет вам использовать пул стейкинга BANMAO.\n\n✨ Ставьте токены и получайте награды каждую секунду!\n💎 Чем дольше блокировка, тем больше награда!\n\nНажмите \"Далее\" для начала.",
        tourConnectTitle: "🔗 Подключить кошелёк",
        tourConnectDesc: "Нажмите здесь для подключения OKX Wallet или MetaMask.\n\nТребования:\n• Сеть OKX X Layer Mainnet\n• Токены $BANMAO\n• Немного OKB для газа",
        tourTokenInfoTitle: "📊 Баланс токенов",
        tourTokenInfoDesc: "Просмотрите баланс $BANMAO здесь.\n\nПосле стейкинга также отображается застейканная сумма и ожидающие награды.",
        tourStakeOrbTitle: "🔒 Сфера стейкинга",
        tourStakeOrbDesc: "Нажмите для открытия панели стейкинга.\nВведите сумму и выберите период блокировки.",
        tourSmallPanelTitle: "📋 Мини панель стейкинга",
        tourSmallPanelDesc: "Компактная панель стейкинга.\n\n• 🔒 Выберите период блокировки (7-365 дней)\n• 💎 Дольше блокировка = Выше APR (до 200%!)\n• 📊 Просмотр всех позиций",
        tourExpandedPanelTitle: "📋 Панель управления стейкингом",
        tourExpandedPanelDesc: "Расширенная панель показывает:\n\n• Все ваши позиции стейкинга\n• Ожидающие награды по позициям\n• Обратный отсчёт разблокировки\n• Детали APR для каждого уровня",
        tourClaimOrbTitle: "💰 Получить награды",
        tourClaimOrbDesc: "Нажмите для открытия панели получения.\nЗаберите накопленные награды!",
        tourCompoundOrbTitle: "🔄 Реинвестирование",
        tourCompoundOrbDesc: "Нажмите для открытия панели реинвестирования.\nАвтоматически застейкайте награды снова.",
        tourLeaderboardTitle: "🏆 Таблица лидеров",
        tourLeaderboardDesc: "Смотрите топ стейкеров!\n\n• 📊 Сортировка по сумме стейка\n• ⏰ Или по времени блокировки\n• 🥇 Топ-3 получают особые значки",
        tourSupportPoolTitle: "💜 Поддержка пула",
        tourSupportPoolDesc: "Пожертвуйте $BANMAO в пул наград!\n\n⚠️ ВАЖНО:\n• Токены поступают НАПРЯМУЮ в смарт-контракт\n• НИКТО не может вывести, пул только платит стейкерам посекундно\n\n💜 Контракт стейкинга существует только благодаря поддержке сообщества. Неважно сколько — давайте вместе поддержим пламя $BANMAO!\n\n🔗 Контракт:\n0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172",
        tourEnergyCenterTitle: "⚡ Энергетический центр",
        tourEnergyCenterDesc: "Показывает общее количество застейканных BANMAO и ожидающие награды.\n\n🎉 Успешного стейкинга!",
        tourOrbStatsTitle: "📊 Статистика сфер",
        tourOrbStatsDesc: "Плавающие сферы показывают:\n\n• ⚡ Общая сумма стейка\n• 💰 Ожидающие награды\n• 📈 Текущий APR\n\nНажмите на любую сферу для подробностей!",
        tourStatsOrbTitle: "📊 Сфера статистики",
        tourUnstakeOrbTitle: "🔓 Анстейк",
        tourUnstakeOrbDesc: "Нажмите, чтобы открыть панель вывода.\nВыведите свои застейканные токены!",

        // New keys RU
        lockFlexible: "Гибкий",
        lock30Days: "30 Дней",
        lock90Days: "90 Дней",
        lock180Days: "180 Дней",
        lock365Days: "365 Дней",
        statsDaySymbol: "/день",
        statsSecSymbol: "/сек",
        timeDaysShort: "д",
        timeHoursShort: "ч",
        timeSecondsShort: "с",
        sphereOnline: "● ОНЛАЙН",
        sphereOffline: "● ОФФЛАЙН",
        statusUnlocked: "✅ Разблокировано",
        statsRatePerSec: "СТАВКА/СЕК",
        statsPending: "ОЖИДАЕТСЯ",
        statsMyStake: "МОЙ СТЕЙК",
        sphereRewardPool: "ПУЛ НАГРАД",
        panelClose: "Нажмите, чтобы закрыть",
        sphereTapToToggle: "Нажмите для переключения",
        tapSphereHint: "Нажмите на сферу для меню",
        tourSkip: "Пропустить",
        tourBack: "← Назад",
        tourNext: "Далее →",
        tourComplete: "✓ Готово",
        tourDontShow: "Больше не показывать",

        // Leaderboard
        leaderboardTitle: "🏆 Таблица лидеров",
        tabAmount: "💰 Сумма",
        tabLock: "🔒 Время",
        stakers: "стейкеров",
        yourRank: "Вы:",
        loading: "⏳ Загрузка...",
        noStakers: "Пока нет стейкеров",
        stakerDetail: "📊 Детали стейкера",
        rank: "🏆 Ранг",
        totalStake: "💰 Всего застейкано",
        lockDuration: "🔒 Блокировка",
        transactionHistory: "📜 История транзакций",
        noTransactions: "Нет транзакций (или не проиндексировано)",
        viewOnExplorer: "Смотреть в Explorer",
        copy: "📋 Копировать",
        copied: "✓ Скопировано",
        stakes: "🔒 Стейки:",
        unstakes: "🔓 Анстейки:",
        claims: "💰 Клеймы:",
        compounds: "🔄 Реинвест:",

        // Supporter
        supportPoolTitle: "Поддержка пула",
        rewardPool: "Пул наград",
        supporters: "Спонсоров",
        topSupporters: "🏆 Топ спонсоров",
        noSupporters: "Пока нет спонсоров",
        addToPool: "Добавить в пул наград:",
        amountPlaceholder: "Сумма...",
        send: "💜 ОТПРАВИТЬ",
        supportDetail: "💜 Детали поддержки",
        total: "💰 Всего:",
        contractNote: "⚠️ Токены поступают напрямую в контракт. Никто не может вывести!",
        contractLink: "🔗 Контракт",

        // Profile
        editsUsed: "изменений использовано",
        editProfile: "Редакт.",
        editYourProfile: "Редактировать профиль",
        selectAvatar: "Выбрать аватар",
        displayName: "Отображаемое имя",
        cancelBtn: "Отмена",
        saveProfile: "Сохранить",
        editsRemaining: "изменений осталось",
        loadingBlockchain: "Загрузка из блокчейна...",
        viewOnExplorerDirect: "Смотреть в обозревателе",
        // Common Buttons & Titles
        closeBtn: "Закрыть",
        panelStake: "Панель стейкинга",
        panelUnstake: "Панель вывода",
        panelClaim: "Панель клейма",
        panelCompound: "Панель реинвеста",

        // StakePanel
        approveDesc: "Разрешить контракту стейкать ваши токены",
        processing: "⏳ Обработка...",
        balance: "💰 Баланс",
        staked: "🔒 Застейкано",
        stakeAmount: "Сумма стейка",
        insufficientBalance: "⚠️ Недостаточно средств",
        approveToken: "Одобрить токен",
        stakingApprove: "Одобрить стейк",
        confirmStake: "Подтвердить стейк",
        selectLockDuration: "Выберите срок блокировки",

        // UnstakePanel
        inGracePeriod: "🎁 ЛЬГОТНЫЙ ПЕРИОД",
        gracePeriodFree: "✅ Вывести сейчас - БЕСПЛАТНО!",
        lockRemaining: "осталось",
        gracePeriodEnded: "🔒 Льготный период закончился - потеря",
        unlockAfter: "⏱️ Разблокировка через:",
        unlocked: "✅ Разблокировано - Бесплатный вывод!",
        unstakeFree: "БЕСПЛАТНЫЙ ВЫВОД",
        unstakeWithPenalty: "ВЫВОД (потеря",
        selectNewLock: "Выберите новый период блокировки:",
        cancel: "Отмена",
        confirm: "Подтвердить",
        stakedLabel: "Застейкано",
        amountToUnstake: "Сумма вывода",
        confirmUnstake: "Подтвердить вывод",

        // ClaimPanel
        netReward: "Чистая награда",
        youWillReceive: "Вы получите",
        gross: "Брутто",
        perDay: "день",
        poolShare: "Доля пула",
        avgMult: "Сред. множ.",
        shares: "Доли",
        yourStakes: "Ваши стейки",
        rate: "Ставка",
        pool: "Пул",
        fee: "Комиссия",
        claimRewards: "ПОЛУЧИТЬ НАГРАДЫ",
        noRewards: "Нет наград",
        package: "Пакет",
        amount: "Сумма",
        multiplier: "Множитель",
        reward: "Награда",
        stakeDate: "Дата стейка",
        unlock: "Разблокировка",
        remaining: "Осталось",
        status: "Статус",
        statusGrace: "🎁 Льготный",
        statusLocked: "🔒 Заблокировано",
        statusFree: "✅ Свободно",

        // CompoundPanel
        pendingRewards: "Ожидающие награды:",
        newStakeLock: "Новый период блокировки:",
        compound: "РЕИНВЕСТ",
        compoundDesc: "Автоматический рестейк наград",

        // Reward Calculator
        estimatedEarnings: "📊 РАСЧЁТ ДОХОДА",
        poolPercentNote: "% пула (при выводе)",
        ratePerSecond: "⚡ Ставка/сек:",
        allRatePerSecond: "Общая ставка/сек",
        yourRatePerSecond: "Ваша ставка/сек",
        yourRewardPerSecond: "🎯 Вы получаете/сек:",
        estimateAfterFee: "💰 Расчёт (после 2% комиссии):",
        perHour: "• В час:",
        perMonth: "• В месяц:",
        afterDays: "• Через",
        estimateDisclaimer: "⚠️ Расчёт на основе текущей ставки, может измениться со временем",
        dailyEarnings: "💰 Дневной доход:",
        hourlyEarnings: "Почасовой доход",
        monthlyEarnings: "Месячный доход",
        remainingDays: "📈 Осталось",
        principalLabel: "💰 Основная сумма:",
        estimatedInterest: "📈 Расч. проценты",
        totalReceive: "💎 ИТОГО:",

        // Claim History
        claimHistoryTitle: "История получения наград",
        claimHistoryContract: "Контракт стейкинга",
        claimHistoryViewTx: "Просмотр TX",
        claimHistoryNoRecords: "История получения отсутствует",
        claimHistoryAmount: "Сумма",
        claimHistoryTime: "Время",
        claimHistoryExplorerGuide: "Для поиска старой истории получения используйте XLayer Explorer",
        claimHistorySearchTip: "Введите ключевое слово ниже в поиск Explorer, чтобы найти все транзакции получения наград:",
        claimHistorySearchExplorer: "Поиск в Explorer",
        claimHistoryLoadError: "Не удалось загрузить историю получения",
        claimHistoryShowingRecords: "Показано {count} последних записей",
        claimHistoryJustNow: "Только что",
        claimHistoryMinutesAgo: "{n} мин. назад",
        claimHistoryHoursAgo: "{n} ч. назад",
        claimHistoryDaysAgo: "{n} дн. назад",

        // Explorer Guides
        leaderboardExplorerGuide: "Для поиска истории стейкинга используйте Explorer",
        leaderboardSearchTip: "💡 Совет: Введите \"stake\" (стейк) или \"unstakeById\" (вывод)",
        donateExplorerGuide: "Для поиска истории донатов используйте Explorer",
        donateSearchTip: "💡 Совет: Введите \"donate\" для поиска всех донатов",
        searchOnExplorer: "Поиск в Explorer",

        // Loading
        loadingData: "Загрузка данных..."
    },
    id: {
        ...globalTranslations.id,
        // Tour
        tourWelcomeTitle: "🎉 Selamat datang di Staking!",
        tourWelcomeDesc: "Tutorial ini akan memandu Anda menggunakan Pool Staking BANMAO.\n\n✨ Stake token untuk mendapat hadiah setiap detik!\n💎 Semakin lama lock, semakin banyak hadiah!\n\nKlik \"Berikutnya\" untuk mulai.",
        tourConnectTitle: "🔗 Hubungkan Dompet",
        tourConnectDesc: "Klik di sini untuk menghubungkan OKX Wallet atau MetaMask.\n\nPersyaratan:\n• Jaringan OKX X Layer Mainnet\n• Punya token $BANMAO\n• Sedikit OKB untuk gas",
        tourTokenInfoTitle: "📊 Saldo Token",
        tourTokenInfoDesc: "Lihat saldo $BANMAO Anda di sini.\n\nSetelah staking, juga menampilkan jumlah yang di-stake dan hadiah tertunda.",
        tourStakeOrbTitle: "🔒 Orb Stake",
        tourStakeOrbDesc: "Klik untuk membuka panel Stake.\nMasukkan jumlah stake dan pilih durasi lock.",
        tourSmallPanelTitle: "📋 Panel Staking Mini",
        tourSmallPanelDesc: "Ini adalah panel staking ringkas.\n\n• 🔒 Pilih durasi lock (7-365 hari)\n• 💎 Lock lebih lama = APR lebih tinggi (hingga 200%!)\n• 📊 Lihat semua posisi aktif",
        tourExpandedPanelTitle: "📋 Panel Kontrol Staking",
        tourExpandedPanelDesc: "Panel diperluas menampilkan:\n\n• Semua posisi stake Anda\n• Hadiah tertunda per posisi\n• Hitung mundur buka kunci\n• Detail APR untuk setiap tingkat lock",
        tourClaimOrbTitle: "💰 Klaim Hadiah",
        tourClaimOrbDesc: "Klik untuk membuka panel Klaim.\nKumpulkan hadiah yang telah terkumpul!",
        tourCompoundOrbTitle: "🔄 Compound",
        tourCompoundOrbDesc: "Klik untuk membuka panel Compound.\nOtomatis stake ulang hadiah Anda.",
        tourLeaderboardTitle: "🏆 Papan Peringkat",
        tourLeaderboardDesc: "Lihat top staker!\n\n• 📊 Urutkan berdasarkan jumlah stake\n• ⏰ Atau berdasarkan durasi lock\n• 🥇 Top 3 dapat lencana khusus",
        tourSupportPoolTitle: "💜 Dukung Pool",
        tourSupportPoolDesc: "DONASI $BANMAO ke Reward Pool!\n\n⚠️ PENTING:\n• Token masuk LANGSUNG ke Smart Contract\n• TIDAK ADA yang bisa menarik, pool hanya bayar staker per detik\n\n💜 Kontrak staking hanya bisa bertahan dengan dukungan komunitas. Berapapun, mari kita bersama menjaga api $BANMAO tetap menyala!\n\n🔗 Kontrak:\n0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172",
        tourEnergyCenterTitle: "⚡ Pusat Energi",
        tourEnergyCenterDesc: "Menampilkan total BANMAO yang di-stake dan hadiah tertunda.\n\n🎉 Selamat staking!",
        tourOrbStatsTitle: "📊 Statistik Orb",
        tourOrbStatsDesc: "Orb mengambang menampilkan:\n\n• ⚡ Total jumlah stake\n• 💰 Hadiah tertunda\n• 📈 APR saat ini\n\nKlik orb mana saja untuk detail!",
        tourStatsOrbTitle: "📊 Orb Statistik",
        tourUnstakeOrbTitle: "🔓 Unstake",
        tourUnstakeOrbDesc: "Klik untuk membuka panel Unstake.\nTarik token yang di-stake!",

        // New keys ID
        lockFlexible: "Fleksibel",
        lock30Days: "30 Hari",
        lock90Days: "90 Hari",
        lock180Days: "180 Hari",
        lock365Days: "365 Hari",
        statsDaySymbol: "/hari",
        statsSecSymbol: "/detik",
        timeDaysShort: "h",
        timeHoursShort: "j",
        timeSecondsShort: "d",
        sphereOnline: "● ONLINE",
        sphereOffline: "● OFFLINE",
        statusUnlocked: "✅ Terbuka",
        statsRatePerSec: "RATE/DETIK",
        statsPending: "PENDING",
        statsMyStake: "STAKE SAYA",
        sphereRewardPool: "KOLAM HADIAH",
        panelClose: "Ketuk untuk Menutup",
        sphereTapToToggle: "Ketuk untuk Beralih",
        tapSphereHint: "Ketuk Bola untuk Membuka Menu",
        tourSkip: "Lewati",
        tourBack: "← Kembali",
        tourNext: "Berikutnya →",
        tourComplete: "✓ Selesai",
        tourDontShow: "Jangan tampilkan lagi",

        // Leaderboard
        leaderboardTitle: "🏆 Papan Peringkat",
        tabAmount: "💰 Jumlah",
        tabLock: "🔒 Durasi",
        stakers: "staker",
        yourRank: "Anda:",
        loading: "⏳ Memuat...",
        noStakers: "Belum ada staker",
        stakerDetail: "📊 Detail Staker",
        rank: "🏆 Peringkat",
        totalStake: "💰 Total Stake",
        lockDuration: "🔒 Lock",
        transactionHistory: "📜 Riwayat Transaksi",
        noTransactions: "Tidak ada transaksi (atau belum terindeks)",
        viewOnExplorer: "Lihat di Explorer",
        copy: "📋 Salin",
        copied: "✓ Disalin",
        stakes: "🔒 Stake:",
        unstakes: "🔓 Unstake:",
        claims: "💰 Klaim:",
        compounds: "🔄 Compound:",

        // Supporter
        supportPoolTitle: "Dukung Pool",
        rewardPool: "Reward Pool",
        supporters: "Pendukung",
        topSupporters: "🏆 Top Pendukung",
        noSupporters: "Belum ada pendukung",
        addToPool: "Tambahkan ke Reward Pool:",
        amountPlaceholder: "Jumlah...",
        send: "💜 KIRIM",
        supportDetail: "💜 Detail Dukungan",
        total: "💰 Total:",
        contractNote: "⚠️ Token masuk langsung ke kontrak. Tidak ada yang bisa menarik!",
        contractLink: "🔗 Kontrak",

        // Profile
        editsUsed: "edit terpakai",
        editProfile: "Edit",
        editYourProfile: "Edit Profil Anda",
        selectAvatar: "Pilih Avatar",
        displayName: "Nama Tampilan",
        cancelBtn: "Batal",
        saveProfile: "Simpan",
        editsRemaining: "edit tersisa",
        loadingBlockchain: "Memuat dari blockchain...",
        viewOnExplorerDirect: "Lihat langsung di Explorer",
        // Common Buttons & Titles
        closeBtn: "Tutup",
        panelStake: "Panel Stake",
        panelUnstake: "Panel Unstake",
        panelClaim: "Panel Klaim",
        panelCompound: "Panel Compound",

        // StakePanel
        approveDesc: "Izinkan kontrak untuk stake token Anda",
        processing: "⏳ Memproses...",
        balance: "💰 Saldo",
        staked: "🔒 Di-stake",
        stakeAmount: "Jumlah Stake",
        insufficientBalance: "⚠️ Saldo tidak cukup",
        approveToken: "Setujui Token",
        stakingApprove: "Setujui Stake",
        confirmStake: "Konfirmasi Stake",
        selectLockDuration: "Pilih Durasi Kunci",

        // UnstakePanel
        inGracePeriod: "🎁 DALAM MASA TENGGANG",
        gracePeriodFree: "✅ Tarik sekarang - GRATIS!",
        lockRemaining: "tersisa",
        gracePeriodEnded: "🔒 Masa tenggang berakhir - kehilangan",
        unlockAfter: "⏱️ Buka kunci setelah:",
        unlocked: "✅ Terbuka - Tarik GRATIS!",
        unstakeFree: "TARIK GRATIS",
        unstakeWithPenalty: "TARIK (kehilangan",
        selectNewLock: "Pilih periode kunci baru:",
        cancel: "Batal",
        confirm: "Konfirmasi",
        stakedLabel: "Jumlah Di-stake",
        amountToUnstake: "Jumlah Unstake",
        confirmUnstake: "Konfirmasi Unstake",

        // ClaimPanel
        netReward: "Hadiah Bersih",
        youWillReceive: "Anda Akan Menerima",
        gross: "Kotor",
        perDay: "hari",
        poolShare: "Bagian Pool",
        avgMult: "Rata-rata",
        shares: "Bagian",
        yourStakes: "Stake Anda",
        rate: "Rate",
        pool: "Pool",
        fee: "Biaya",
        claimRewards: "KLAIM HADIAH",
        noRewards: "Tidak Ada Hadiah",
        package: "Paket",
        amount: "Jumlah",
        multiplier: "Pengali",
        reward: "Hadiah",
        stakeDate: "Tanggal Stake",
        unlock: "Buka Kunci",
        remaining: "Tersisa",
        status: "Status",
        statusGrace: "🎁 Tenggang",
        statusLocked: "🔒 Terkunci",
        statusFree: "✅ Bebas",

        // CompoundPanel
        pendingRewards: "Hadiah Tertunda:",
        newStakeLock: "Kunci Stake Baru:",
        compound: "COMPOUND",
        compoundDesc: "Otomatis re-stake hadiah",

        // Reward Calculator
        estimatedEarnings: "📊 PERKIRAAN PENGHASILAN",
        poolPercentNote: "% Pool (saat klaim)",
        ratePerSecond: "⚡ Rate/detik:",
        allRatePerSecond: "Semua Rate/detik",
        yourRatePerSecond: "Rate Anda/detik",
        yourRewardPerSecond: "🎯 Anda terima/detik:",
        estimateAfterFee: "💰 Perkiraan (setelah biaya 2%):",
        perHour: "• Per jam:",
        perMonth: "• Per bulan:",
        afterDays: "• Setelah",
        estimateDisclaimer: "⚠️ Perkiraan berdasarkan rate saat ini, dapat berubah seiring waktu",
        dailyEarnings: "💰 Penghasilan harian:",
        hourlyEarnings: "Penghasilan per jam",
        monthlyEarnings: "Penghasilan bulanan",
        remainingDays: "📈 Tersisa",
        principalLabel: "💰 Pokok:",
        estimatedInterest: "📈 Perkiraan bunga",
        totalReceive: "💎 TOTAL TERIMA:",

        // Claim History
        claimHistoryTitle: "Riwayat Klaim Hadiah",
        claimHistoryContract: "Kontrak Staking",
        claimHistoryViewTx: "Lihat TX",
        claimHistoryNoRecords: "Belum ada riwayat klaim",
        claimHistoryAmount: "Jumlah",
        claimHistoryTime: "Waktu",
        claimHistoryExplorerGuide: "Untuk mencari riwayat klaim lama, cari di XLayer Explorer",
        claimHistorySearchTip: "Masukkan kata kunci di bawah ke pencarian Explorer untuk mencari semua transaksi klaim hadiah:",
        claimHistorySearchExplorer: "Cari di Explorer",
        claimHistoryLoadError: "Gagal memuat riwayat klaim",
        claimHistoryShowingRecords: "Menampilkan {count} klaim terbaru",
        claimHistoryJustNow: "Baru saja",
        claimHistoryMinutesAgo: "{n} menit lalu",
        claimHistoryHoursAgo: "{n} jam lalu",
        claimHistoryDaysAgo: "{n} hari lalu",

        // Explorer Guides
        leaderboardExplorerGuide: "Untuk mencari riwayat staking, cari di Explorer",
        leaderboardSearchTip: "💡 Tips: Masukkan \"stake\" (deposit) atau \"unstakeById\" (tarik)",
        donateExplorerGuide: "Untuk mencari riwayat donasi, cari di Explorer",
        donateSearchTip: "💡 Tips: Masukkan \"donate\" untuk mencari semua transaksi donasi",
        searchOnExplorer: "Cari di Explorer",

        // Loading
        loadingData: "Memuat data..."
    }
};

// Get language from localStorage or browser
function getStoredLanguage(): Language {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('banmao_language');
    if (stored && ['en', 'vi', 'zh', 'ko', 'ru', 'id'].includes(stored)) {
        return stored as Language;
    }
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    return ['en', 'vi', 'zh', 'ko', 'ru', 'id'].includes(browserLang)
        ? browserLang as Language
        : 'en';
}

// Hook to use staking translations
export function useStakingTranslations() {
    const [lang, setLang] = useState<Language>('en');

    useEffect(() => {
        setLang(getStoredLanguage());

        // Listen for language changes
        const handleStorageChange = () => {
            setLang(getStoredLanguage());
        };
        window.addEventListener('storage', handleStorageChange);

        // Check periodically for language change (for same-tab changes)
        const interval = setInterval(() => {
            const current = getStoredLanguage();
            if (current !== lang) setLang(current);
        }, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [lang]);

    const t = useCallback((key: keyof StakingTranslations): string => {
        return translations[lang][key] || translations.en[key] || key;
    }, [lang]);

    const setLanguage = (l: Language) => {
        setLang(l);
        if (typeof window !== 'undefined') localStorage.setItem('banmao_language', l);
    };

    return { t, lang, setLanguage };
}

export { translations };
