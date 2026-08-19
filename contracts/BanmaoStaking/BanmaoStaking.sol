// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BanmaoStaking V30 - Security Hardened
 * @author Gemini Thought Partner
 * @dev Multi-stake tracking with individual entries. Features:
 * - Track each stake separately with unique IDs
 * - Individual lock periods per stake
 * - Unstake by ID or partial amount
 * - VIP tiers, auto-relock, compound rewards
 */
contract BanmaoStaking is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant PRECISION = 1e18;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_PENALTY_LIMIT = 5000; // Max 50% penalty
    uint256 public constant MAX_STAKES_PER_USER = 20; // Limit for gas optimization

    // ============ Data Structures ============
    
    /// @notice Individual stake entry
    struct StakeEntry {
        uint256 amount;          // Principal for this stake
        uint256 shares;          // Shares for this stake  
        uint64 lockEndTime;      // Lock end timestamp
        uint64 startTime;        // When stake was created
        uint8 lockOptionId;      // Lock option used (0-3)
        bool active;             // Is stake active
    }

    /// @notice Aggregate user data for gas-efficient operations
    struct UserSummary {
        uint256 totalAmount;     // Sum of all stake amounts
        uint256 totalShares;     // Sum of all stake shares
        uint256 rewardDebt;      // Accumulated reward debt
        uint32 stakeCount;       // Number of active stakes
        uint32 nextStakeId;      // Auto-increment ID
        uint64 lastStakeBlock;   // Flash-stake protection
    }

    struct LockOption {
        uint256 daysLocked;
        uint256 multiplierBP;    // 10000 = 1x
    }

    struct VIPTier {
        string name;
        uint256 minAmount;
    }

    // ============ System State ============
    IERC20 public immutable stakingToken;
    address public devWallet;
    uint256 public devFee = 200; // 2% default
    uint256 public accumulatedDevFees;

    uint256 public accRewardPerShare;
    uint256 public lastUpdateTimestamp;
    uint256 public rewardRatePerSecond;

    uint256 public totalShares;
    uint256 public totalStaked;
    uint256 public rewardBucket;

    // Governance parameters
    uint256 public maxStakePerWallet;
    uint256 public minStakeAmount;
    uint256 public earlyUnstakePenalty;
    uint256 public gracePeriodDuration = 2 hours;

    // User data
    mapping(address => UserSummary) public userSummary;
    mapping(address => mapping(uint256 => StakeEntry)) public userStakes;
    mapping(address => uint256[]) private userStakeIds; // Active stake IDs

    LockOption[] public lockOptions;
    VIPTier[] public vipTiers;

    // Leaderboard tracking
    address[] public allStakers;
    mapping(address => bool) public isStaker;

    // Donation tracking for supporter leaderboard
    address[] public allDonators;
    mapping(address => bool) public isDonator;
    mapping(address => uint256) public donationAmount;

    // ============ Events ============
    event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 shares, uint256 lockDays);
    event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 penalty);
    event PartialUnstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 remaining, uint256 penalty);
    event Compounded(address indexed user, uint256 amount, uint256 newStakeId);
    event RewardClaimed(address indexed user, uint256 amount);
    event Relocked(address indexed user, uint256 indexed stakeId, uint256 newLockEndTime);
    event Donated(address indexed donor, uint256 amount);

    // ============ Constructor ============
    constructor(address _token, address _dev, uint256 _maxStake) Ownable(msg.sender) {
        require(_token != address(0) && _dev != address(0), "Invalid addresses");
        stakingToken = IERC20(_token);
        devWallet = _dev;
        maxStakePerWallet = _maxStake;
        minStakeAmount = 1 * PRECISION;
        earlyUnstakePenalty = 1000; // 10%
        lastUpdateTimestamp = block.timestamp;

        // Default lock options
        lockOptions.push(LockOption(0, 10000));   // Flexible 1x
        lockOptions.push(LockOption(30, 12000));  // 30 days 1.2x
        lockOptions.push(LockOption(90, 15000));  // 90 days 1.5x
        lockOptions.push(LockOption(180, 20000)); // 180 days 2x

        // Default VIP tiers
        vipTiers.push(VIPTier("BRONZE", 0));
        vipTiers.push(VIPTier("GOLD", 10000 * PRECISION));
        vipTiers.push(VIPTier("DIAMOND", 50000 * PRECISION));
    }

    // ============ Core Logic ============

    function updatePool() public {
        if (block.timestamp <= lastUpdateTimestamp) return;
        if (totalShares == 0 || rewardRatePerSecond == 0 || rewardBucket == 0) {
            lastUpdateTimestamp = block.timestamp;
            return;
        }
        uint256 duration = block.timestamp - lastUpdateTimestamp;
        uint256 reward = duration * rewardRatePerSecond;
        if (reward > rewardBucket) reward = rewardBucket;
        
        accRewardPerShare += (reward * PRECISION) / totalShares;
        lastUpdateTimestamp = block.timestamp;
    }

    /// @notice Stake tokens with a specific lock option
    /// @param amount Amount of tokens to stake
    /// @param lockOptionId Lock option (0=flexible, 1=30d, 2=90d, 3=180d)
    function stake(uint256 amount, uint256 lockOptionId) external nonReentrant whenNotPaused {
        require(amount >= minStakeAmount, "Below min stake");
        require(lockOptionId < lockOptions.length, "Invalid lock option");
        
        UserSummary storage summary = userSummary[msg.sender];
        require(summary.stakeCount < MAX_STAKES_PER_USER, "Max stakes reached");
        require(summary.totalAmount + amount <= maxStakePerWallet, "Whale limit");

        updatePool();
        
        // Claim pending rewards first
        if (summary.totalShares > 0) {
            uint256 pending = (summary.totalShares * accRewardPerShare / PRECISION) - summary.rewardDebt;
            if (pending > 0) _processRewardInternal(msg.sender, pending);
        }

        // Transfer tokens
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Create new stake entry
        uint256 stakeId = summary.nextStakeId;
        LockOption memory lockOpt = lockOptions[lockOptionId];
        uint256 shares = (amount * lockOpt.multiplierBP) / BASIS_POINTS;
        uint64 lockEnd = uint64(block.timestamp + (lockOpt.daysLocked * 1 days));

        userStakes[msg.sender][stakeId] = StakeEntry({
            amount: amount,
            shares: shares,
            lockEndTime: lockEnd,
            startTime: uint64(block.timestamp),
            lockOptionId: uint8(lockOptionId),
            active: true
        });

        userStakeIds[msg.sender].push(stakeId);

        // Update summary
        summary.totalAmount += amount;
        summary.totalShares += shares;
        summary.stakeCount++;
        summary.nextStakeId++;
        summary.lastStakeBlock = uint64(block.number);
        summary.rewardDebt = (summary.totalShares * accRewardPerShare) / PRECISION;

        // Update global
        totalStaked += amount;
        totalShares += shares;

        // Track staker for leaderboard (only add once)
        if (!isStaker[msg.sender]) {
            allStakers.push(msg.sender);
            isStaker[msg.sender] = true;
        }

        emit Staked(msg.sender, stakeId, amount, shares, lockOpt.daysLocked);
    }

    /// @notice Unstake a specific stake entry completely
    /// @param stakeId The ID of the stake to unstake
    function unstakeById(uint256 stakeId) external nonReentrant {
        StakeEntry storage entry = userStakes[msg.sender][stakeId];
        require(entry.active, "Stake not active");
        
        UserSummary storage summary = userSummary[msg.sender];
        require(block.number > summary.lastStakeBlock, "Flash-stake protection");

        updatePool();
        
        // Claim pending rewards
        uint256 pending = (summary.totalShares * accRewardPerShare / PRECISION) - summary.rewardDebt;
        if (pending > 0) _processRewardInternal(msg.sender, pending);

        uint256 amount = entry.amount;
        uint256 shares = entry.shares;
        
        // Calculate penalty
        uint256 penalty = _calculatePenalty(entry, amount);

        // Update entry
        entry.active = false;
        entry.amount = 0;
        entry.shares = 0;

        // Remove from active IDs
        _removeStakeId(msg.sender, stakeId);

        // Update summary
        summary.totalAmount -= amount;
        summary.totalShares -= shares;
        summary.stakeCount--;
        summary.rewardDebt = summary.totalAmount == 0 ? 0 : (summary.totalShares * accRewardPerShare) / PRECISION;

        // Update global
        totalStaked -= amount;
        totalShares -= shares;

        // Add penalty to reward pool
        if (penalty > 0) {
            rewardBucket += penalty;
        }

        // Transfer
        stakingToken.safeTransfer(msg.sender, amount - penalty);
        emit Unstaked(msg.sender, stakeId, amount, penalty);
    }

    /// @notice Unstake partial amount from a specific stake
    /// @param stakeId The ID of the stake
    /// @param amount Amount to unstake
    function unstakePartial(uint256 stakeId, uint256 amount) external nonReentrant {
        StakeEntry storage entry = userStakes[msg.sender][stakeId];
        require(entry.active, "Stake not active");
        require(amount > 0 && amount <= entry.amount, "Invalid amount");

        UserSummary storage summary = userSummary[msg.sender];
        require(block.number > summary.lastStakeBlock, "Flash-stake protection");

        updatePool();

        // Claim pending rewards
        uint256 pending = (summary.totalShares * accRewardPerShare / PRECISION) - summary.rewardDebt;
        if (pending > 0) _processRewardInternal(msg.sender, pending);

        // Calculate proportional shares to remove
        uint256 sharesToRemove;
        if (amount == entry.amount) {
            sharesToRemove = entry.shares;
        } else {
            sharesToRemove = (entry.shares * amount) / entry.amount;
            require(sharesToRemove > 0, "Amount too small");
        }

        // Calculate penalty
        uint256 penalty = _calculatePenalty(entry, amount);

        // Update entry
        entry.amount -= amount;
        entry.shares -= sharesToRemove;

        // If fully unstaked, deactivate
        if (entry.amount == 0) {
            entry.active = false;
            _removeStakeId(msg.sender, stakeId);
            summary.stakeCount--;
        }

        // Update summary
        summary.totalAmount -= amount;
        summary.totalShares -= sharesToRemove;
        summary.rewardDebt = summary.totalAmount == 0 ? 0 : (summary.totalShares * accRewardPerShare) / PRECISION;

        // Update global
        totalStaked -= amount;
        totalShares -= sharesToRemove;

        // Add penalty to reward pool
        if (penalty > 0) {
            rewardBucket += penalty;
        }

        // Transfer
        stakingToken.safeTransfer(msg.sender, amount - penalty);
        emit PartialUnstaked(msg.sender, stakeId, amount, entry.amount, penalty);
    }

    /// @notice Compound rewards into a new stake entry
    function autoCompound() external nonReentrant whenNotPaused {
        UserSummary storage summary = userSummary[msg.sender];
        require(summary.totalAmount > 0, "No stake");
        require(summary.stakeCount < MAX_STAKES_PER_USER, "Max stakes reached");

        updatePool();

        uint256 pending = (summary.totalShares * accRewardPerShare / PRECISION) - summary.rewardDebt;
        require(pending > 0, "No rewards");

        uint256 fee = (pending * devFee) / BASIS_POINTS;
        uint256 netReward = pending - fee;
        accumulatedDevFees += fee;
        rewardBucket -= pending;

        require(summary.totalAmount + netReward <= maxStakePerWallet, "Whale limit");

        // Create new flexible stake entry for compounded rewards
        uint256 stakeId = summary.nextStakeId;
        uint256 shares = netReward; // 1x multiplier for compound (flexible)

        userStakes[msg.sender][stakeId] = StakeEntry({
            amount: netReward,
            shares: shares,
            lockEndTime: 0, // Flexible - no lock
            startTime: uint64(block.timestamp),
            lockOptionId: 0, // Flexible
            active: true
        });

        userStakeIds[msg.sender].push(stakeId);

        // Update summary
        summary.totalAmount += netReward;
        summary.totalShares += shares;
        summary.stakeCount++;
        summary.nextStakeId++;
        summary.rewardDebt = (summary.totalShares * accRewardPerShare) / PRECISION;

        // Update global
        totalStaked += netReward;
        totalShares += shares;

        emit Compounded(msg.sender, netReward, stakeId);
    }

    /// @notice Claim pending rewards
    function claimReward() external nonReentrant {
        UserSummary storage summary = userSummary[msg.sender];
        updatePool();

        uint256 pending = (summary.totalShares * accRewardPerShare / PRECISION) - summary.rewardDebt;
        require(pending > 0, "No rewards");

        _processRewardInternal(msg.sender, pending);
        summary.rewardDebt = (summary.totalShares * accRewardPerShare) / PRECISION;
    }

    /// @notice Relock an unlocked stake to a new (higher or same multiplier) lock option
    /// @dev Security measures:
    /// - Stake must be already UNLOCKED (past lockEndTime) - prevents early downgrade
    /// - New lock option multiplier must be >= current multiplier - prevents gaming
    /// - Properly recalculates shares to prevent inflation
    /// - Updates rewardDebt correctly
    /// @param stakeId The stake ID to relock
    /// @param newLockOptionId New lock option (must have >= multiplier)
    function relock(uint256 stakeId, uint256 newLockOptionId) external nonReentrant whenNotPaused {
        StakeEntry storage entry = userStakes[msg.sender][stakeId];
        require(entry.active, "Stake not active");
        require(entry.amount > 0, "No stake amount");
        require(newLockOptionId < lockOptions.length, "Invalid lock option");
        
        // Security: Must be past lockEndTime (unlocked) to relock
        // This prevents users from "downgrading" lock before it expires
        require(block.timestamp >= entry.lockEndTime, "Stake still locked");
        
        LockOption memory currentLock = lockOptions[entry.lockOptionId];
        LockOption memory newLock = lockOptions[newLockOptionId];
        
        // Security: Can only upgrade or keep same multiplier (prevent gaming)
        require(newLock.multiplierBP >= currentLock.multiplierBP, "Cannot downgrade multiplier");
        
        updatePool();
        
        UserSummary storage summary = userSummary[msg.sender];
        
        // Claim pending rewards first
        uint256 pending = (summary.totalShares * accRewardPerShare / PRECISION) - summary.rewardDebt;
        if (pending > 0) {
            _processRewardInternal(msg.sender, pending);
        }
        
        // Calculate old and new shares
        uint256 oldShares = entry.shares;
        uint256 newShares = (entry.amount * newLock.multiplierBP) / BASIS_POINTS;
        
        // Update stake entry
        entry.shares = newShares;
        entry.lockOptionId = uint8(newLockOptionId);
        entry.lockEndTime = uint64(block.timestamp + (newLock.daysLocked * 1 days));
        entry.startTime = uint64(block.timestamp); // Reset start time for new grace period
        
        // Update user summary - adjust shares difference
        summary.totalShares = summary.totalShares - oldShares + newShares;
        summary.rewardDebt = (summary.totalShares * accRewardPerShare) / PRECISION;
        
        // Update global shares
        totalShares = totalShares - oldShares + newShares;
        
        emit Relocked(msg.sender, stakeId, entry.lockEndTime);
    }

    // ============ View Functions ============

    /// @notice Get all active stake IDs for a user
    function getUserStakeIds(address user) external view returns (uint256[] memory) {
        return userStakeIds[user];
    }

    /// @notice Get stake entry details
    function getStakeEntry(address user, uint256 stakeId) external view returns (
        uint256 amount,
        uint256 shares,
        uint64 lockEndTime,
        uint64 startTime,
        uint8 lockOptionId,
        bool active,
        bool isLocked,
        bool inGracePeriod,
        uint256 estimatedPenalty
    ) {
        StakeEntry storage entry = userStakes[user][stakeId];
        amount = entry.amount;
        shares = entry.shares;
        lockEndTime = entry.lockEndTime;
        startTime = entry.startTime;
        lockOptionId = entry.lockOptionId;
        active = entry.active;
        
        // Grace period is at the BEGINNING - from startTime to startTime + gracePeriodDuration
        inGracePeriod = block.timestamp >= entry.startTime && 
                        block.timestamp <= entry.startTime + gracePeriodDuration;
        // Locked = after grace period but before lockEnd
        isLocked = block.timestamp > entry.startTime + gracePeriodDuration && 
                   block.timestamp < entry.lockEndTime;
        estimatedPenalty = _calculatePenalty(entry, entry.amount);
    }

    /// @notice Get user's pending rewards
    function pendingRewards(address user) external view returns (uint256) {
        UserSummary storage summary = userSummary[user];
        if (summary.totalShares == 0) return 0;

        uint256 tempAccRewardPerShare = accRewardPerShare;
        if (block.timestamp > lastUpdateTimestamp && totalShares > 0 && rewardRatePerSecond > 0) {
            uint256 duration = block.timestamp - lastUpdateTimestamp;
            uint256 reward = duration * rewardRatePerSecond;
            if (reward > rewardBucket) reward = rewardBucket;
            tempAccRewardPerShare += (reward * PRECISION) / totalShares;
        }

        return (summary.totalShares * tempAccRewardPerShare / PRECISION) - summary.rewardDebt;
    }

    /// @notice Get VIP tier for user
    function getVIPTier(address user) public view returns (string memory tier) {
        uint256 amount = userSummary[user].totalAmount;
        tier = "NONE";
        uint256 highestMin = 0;
        for (uint256 i = 0; i < vipTiers.length; i++) {
            if (amount >= vipTiers[i].minAmount && vipTiers[i].minAmount >= highestMin) {
                tier = vipTiers[i].name;
                highestMin = vipTiers[i].minAmount;
            }
        }
    }

    /// @notice Global health check
    function getGlobalHealthCheck() external view returns (
        uint256 rewardsLeft, 
        uint256 daysLeft, 
        bool isHealthy, 
        uint256 dust
    ) {
        uint256 contractBalance = stakingToken.balanceOf(address(this));
        uint256 totalDebt = totalStaked + rewardBucket + accumulatedDevFees;
        rewardsLeft = rewardBucket;
        daysLeft = (rewardRatePerSecond > 0) ? (rewardBucket / rewardRatePerSecond) / 1 days : 0;
        isHealthy = contractBalance >= totalDebt;
        dust = (contractBalance > totalDebt) ? contractBalance - totalDebt : 0;
    }

    // ============ Internal Functions ============

    function _calculatePenalty(StakeEntry storage entry, uint256 amount) internal view returns (uint256) {
        // Grace period is at the BEGINNING - from startTime to startTime + gracePeriodDuration
        bool inGracePeriod = block.timestamp >= entry.startTime && 
                             block.timestamp <= entry.startTime + gracePeriodDuration;
        
        // After lockEndTime = always free
        if (block.timestamp >= entry.lockEndTime) {
            return 0;
        }
        
        // In grace period = free
        if (inGracePeriod) {
            return 0;
        }
        
        // After grace period but before lockEnd = penalty
        return (amount * earlyUnstakePenalty) / BASIS_POINTS;
    }

    function _removeStakeId(address user, uint256 stakeId) internal {
        uint256[] storage ids = userStakeIds[user];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == stakeId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                break;
            }
        }
    }

    function _processRewardInternal(address to, uint256 amount) internal {
        // Security fix: Check rewardBucket has sufficient funds to prevent underflow
        require(rewardBucket >= amount, "Insufficient reward bucket");
        
        uint256 fee = (amount * devFee) / BASIS_POINTS;
        uint256 netReward = amount - fee;
        accumulatedDevFees += fee;
        rewardBucket -= amount;
        stakingToken.safeTransfer(to, netReward);
        emit RewardClaimed(to, netReward);
    }

    // ============ Admin Functions ============

    function setRewardRate(uint256 _rate) external onlyOwner {
        updatePool();
        rewardRatePerSecond = _rate;
    }

    function setEarlyUnstakePenalty(uint256 _penalty) external onlyOwner {
        require(_penalty <= MAX_PENALTY_LIMIT, "Max 50%");
        earlyUnstakePenalty = _penalty;
    }

    function setMaxStakeLimit(uint256 _limit) external onlyOwner {
        maxStakePerWallet = _limit;
    }

    function setMinStakeAmount(uint256 _amount) external onlyOwner {
        minStakeAmount = _amount;
    }

    function setGracePeriod(uint256 _duration) external onlyOwner {
        require(_duration <= 7 days, "Too long");
        gracePeriodDuration = _duration;
    }

    function updateLockOption(uint256 _id, uint256 _days, uint256 _multiplier) external onlyOwner {
        require(_id < lockOptions.length, "Invalid ID");
        lockOptions[_id].daysLocked = _days;
        lockOptions[_id].multiplierBP = _multiplier;
    }

    function setVIPTiers(string[] calldata names, uint256[] calldata minAmounts) external onlyOwner {
        require(names.length == minAmounts.length, "Mismatch");
        delete vipTiers;
        for (uint256 i = 0; i < names.length; i++) {
            vipTiers.push(VIPTier(names[i], minAmounts[i]));
        }
    }

    function setDevFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Max 10%");
        devFee = _fee;
    }

    function setDevWallet(address _dev) external onlyOwner {
        require(_dev != address(0), "Invalid");
        devWallet = _dev;
    }

    // Security fix: Added nonReentrant to prevent reentrancy attacks via malicious token callbacks
    function donate(uint256 amount) external nonReentrant {
        uint256 balanceBefore = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 actualAmount = stakingToken.balanceOf(address(this)) - balanceBefore;
        rewardBucket += actualAmount;

        // Track donation for supporter leaderboard
        donationAmount[msg.sender] += actualAmount;
        if (!isDonator[msg.sender]) {
            allDonators.push(msg.sender);
            isDonator[msg.sender] = true;
        }

        emit Donated(msg.sender, actualAmount);
    }

    // Security fix: Added nonReentrant to prevent reentrancy attacks
    function withdrawDevFees() external nonReentrant {
        require(msg.sender == devWallet, "Only dev");
        uint256 amount = accumulatedDevFees;
        accumulatedDevFees = 0;
        stakingToken.safeTransfer(devWallet, amount);
    }

    function withdrawDust() external onlyOwner {
        uint256 contractBalance = stakingToken.balanceOf(address(this));
        uint256 totalDebt = totalStaked + rewardBucket + accumulatedDevFees;
        if (contractBalance > totalDebt) {
            stakingToken.safeTransfer(msg.sender, contractBalance - totalDebt);
        }
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ Leaderboard Functions ============
    
    /// @notice Get total number of stakers
    function getTotalStakers() external view returns (uint256) {
        return allStakers.length;
    }

    /// @notice Get all stakers data for leaderboard (frontend will sort)
    /// @param offset Starting index
    /// @param limit Maximum number of stakers to return
    function getStakersPage(uint256 offset, uint256 limit) external view returns (
        address[] memory stakers,
        uint256[] memory amounts,
        uint8[] memory maxLockOptionIds
    ) {
        uint256 count = allStakers.length;
        if (offset >= count) {
            return (new address[](0), new uint256[](0), new uint8[](0));
        }
        uint256 end = offset + limit;
        if (end > count) end = count;
        uint256 resultLen = end - offset;
        
        stakers = new address[](resultLen);
        amounts = new uint256[](resultLen);
        maxLockOptionIds = new uint8[](resultLen);
        
        for (uint256 i = 0; i < resultLen; i++) {
            address staker = allStakers[offset + i];
            stakers[i] = staker;
            amounts[i] = userSummary[staker].totalAmount;
            
            // Find max lock option
            uint8 maxLockId = 0;
            uint256[] storage ids = userStakeIds[staker];
            for (uint256 j = 0; j < ids.length; j++) {
                uint8 lockId = userStakes[staker][ids[j]].lockOptionId;
                if (lockId > maxLockId) maxLockId = lockId;
            }
            maxLockOptionIds[i] = maxLockId;
        }
    }

    /// @notice Get total number of donators
    function getTotalDonators() external view returns (uint256) {
        return allDonators.length;
    }

    /// @notice Get donators data for leaderboard (frontend will sort)
    /// @param offset Starting index
    /// @param limit Maximum number of donators to return
    function getDonatorsPage(uint256 offset, uint256 limit) external view returns (
        address[] memory donators,
        uint256[] memory amounts
    ) {
        uint256 count = allDonators.length;
        if (offset >= count) {
            return (new address[](0), new uint256[](0));
        }
        uint256 end = offset + limit;
        if (end > count) end = count;
        uint256 resultLen = end - offset;
        
        donators = new address[](resultLen);
        amounts = new uint256[](resultLen);
        
        for (uint256 i = 0; i < resultLen; i++) {
            address donor = allDonators[offset + i];
            donators[i] = donor;
            amounts[i] = donationAmount[donor];
        }
    }
}