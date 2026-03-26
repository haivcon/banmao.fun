// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BanMao Fomo V11: Ultimate Fixed Edition
 * @notice Fixed: Compiler Version & Memory Copy Error
 */
contract BanMaoFomoV11 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable banMaoToken;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // =================================
    // 1. OPTIMIZED STRUCTS (Struct Packing)
    // =================================
    
    struct Round {
        uint40 softDeadline;  
        uint40 hardDeadline;  
        bool ended;           
        address lastAttacker; 
        
        uint256 totalAttacks;
        uint256 accRewardPerAttack; 
    }

    struct GameConfig {
        uint256 attackCost;
        uint256 softDuration;        
        uint256 initialHardDuration; 
        uint256 timeDecreaseStep;    
        uint256 maxAttacksPerRound;  
        uint256 winnerPercent;       
        uint256 topAttackersPercent; 
        uint256 minAttacksForReward; 
        uint256 claimExpirationTime; 
    }

    GameConfig public activeConfig;  
    GameConfig public nextConfig;    

    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_CLAIM_BATCH = 50;
    uint256 public constant COOLDOWN_TIME = 5 seconds;
    uint256 public constant MAX_TOP_ATTACKERS = 10;

    address public stakingAddress; 
    
    uint256 public currentRound;
    uint256 public jackpotPool;          
    uint256 public seedFundNextRound;    
    uint256 public totalVaultBalance;    
    bool public paused;

    mapping(address => uint256) public totalLifetimeAttacks;
    uint256[4] public tierThresholds = [1000, 10000, 50000, 100000]; 
    uint256[4] public tierCooldownReduction = [5, 10, 15, 20]; 

    struct TopAttacker {
        address addr;
        uint256 attacks;
    }

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => uint256)) public userAttacks;
    mapping(uint256 => mapping(address => uint256)) public rewardDebt;
    mapping(address => uint256) public personalVault; 
    mapping(address => uint256) public lastAttackTimestamp; 
    
    mapping(uint256 => TopAttacker[MAX_TOP_ATTACKERS]) public topAttackers;
    mapping(uint256 => uint256) public topAttackersCount; 

    // Theo dõi lịch sử chơi để hỗ trợ Smart Settle (Chống ngủ đông)
    mapping(address => uint256[]) private _userParticipatedRounds;

    // Events
    event RoundStarted(uint256 indexed roundId, uint256 jackpotStart, uint256 hardDeadline);
    event AttackPerformed(uint256 indexed roundId, address indexed player, uint256 count, uint256 jackpot, uint256 newHardDeadline);
    event RoundFinalized(uint256 indexed roundId, address indexed winner, uint256 amount, string winType);
    event Claimed(address indexed user, uint256 amount);
    event DistributedToStaking(uint256 amount);
    event ConfigScheduled(uint256 roundEffective);
    event WinnerPrizePaid(address indexed user, uint256 amount, bool fullPrize);
    event TopAttackerRewarded(uint256 indexed roundId, address indexed user, uint256 rank, uint256 amount);
    event PrizeRolledOver(uint256 indexed roundId, uint256 amount, string reason);
    event TierThresholdsUpdated(uint256[4] thresholds);
    event TierCooldownReductionUpdated(uint256[4] reductions);

    modifier whenNotPaused() {
        require(!paused, "Game paused");
        _;
    }

    constructor(address _token, address _stakingAddress) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        banMaoToken = IERC20(_token);
        stakingAddress = _stakingAddress;

        activeConfig = GameConfig({
            // LƯU Ý: Nếu dùng USDT/USDC (6 số 0), sửa thành 2000 * 1e6
            attackCost: 2000 * 1e18, 
            softDuration: 6 hours,
            initialHardDuration: 120 hours,
            timeDecreaseStep: 6000 seconds,
            maxAttacksPerRound: 1000000,
            winnerPercent: 75,      
            topAttackersPercent: 25,
            minAttacksForReward: 10,
            claimExpirationTime: 2 hours 
        });
        nextConfig = activeConfig;
        _startNewRound();
    }

    // ================= SMART SETTLE =================

    function settleGame() external nonReentrant whenNotPaused {
        Round storage r = rounds[currentRound];
        GameConfig memory cfg = activeConfig;
        
        // 1. Kiểm tra và kết thúc Round nếu cần
        if (!r.ended) {
            bool shouldEnd = false;
            string memory reason = "";

            if (block.timestamp >= r.hardDeadline) {
                shouldEnd = true;
                if (block.timestamp > r.hardDeadline + cfg.claimExpirationTime) {
                    reason = "TIMEOUT";
                } else {
                    reason = "HARD_WIN";
                }
            } else if (block.timestamp >= r.softDeadline) {
                shouldEnd = true;
                 if (block.timestamp > r.softDeadline + cfg.claimExpirationTime) {
                    reason = "TIMEOUT";
                } else {
                    reason = "SOFT_WIN";
                }
            }

            if (shouldEnd) {
                _finalizeRound(reason);
            }
        }

        // 2. CLAIM ALL HISTORY
        uint256[] memory participating = _userParticipatedRounds[msg.sender];
        uint256 len = participating.length;

        for (uint256 i = 0; i < len; i++) {
            uint256 rid = participating[i];
            if (rid <= currentRound) {
                _updateVaultAndClean(msg.sender, rid);
            }
        }

        // 3. CLEANUP
        delete _userParticipatedRounds[msg.sender];
        
        if (userAttacks[currentRound][msg.sender] > 0) {
            _userParticipatedRounds[msg.sender].push(currentRound);
        }

        // 4. TRANSFER
        uint256 amount = personalVault[msg.sender];
        if (amount > 0) {
            personalVault[msg.sender] = 0;
            totalVaultBalance -= amount;
            banMaoToken.safeTransfer(msg.sender, amount);
            emit Claimed(msg.sender, amount);
        }
    }

    // ================= CORE LOGIC =================

    function attack(uint256 _count) external nonReentrant whenNotPaused {
        require(_count >= 1 && _count <= 10, "Count 1-10");
        
        Round storage r = rounds[currentRound];
        GameConfig memory cfg = activeConfig;
        
        // Timeout Checks
        if (block.timestamp >= r.hardDeadline && !r.ended) {
            if (block.timestamp > r.hardDeadline + cfg.claimExpirationTime) {
                _finalizeRound("TIMEOUT");
            } else {
                _finalizeRound("HARD_WIN");
            }
            return; 
        }

        if (block.timestamp >= r.softDeadline && !r.ended) { 
             if (block.timestamp > r.softDeadline + cfg.claimExpirationTime) {
                _finalizeRound("TIMEOUT");
            } else {
                _finalizeRound("SOFT_WIN");
            }
            return; 
        }
        
        require(!r.ended, "Round ended");
        
        // Validation & Payment
        uint256 effectiveCooldown = _getEffectiveCooldown(msg.sender);
        require(block.timestamp >= lastAttackTimestamp[msg.sender] + effectiveCooldown, "Cooldown active");
        require(userAttacks[currentRound][msg.sender] + _count <= cfg.maxAttacksPerRound, "Limit reached");

        uint256 totalCost = cfg.attackCost * _count;
        uint256 balBefore = banMaoToken.balanceOf(address(this));
        banMaoToken.safeTransferFrom(msg.sender, address(this), totalCost);
        uint256 received = banMaoToken.balanceOf(address(this)) - balBefore;
        require(received > 0, "No tokens received");
        
        // Logic
        _distributeFunds(r, received);
        _updateVaultAndClean(msg.sender, currentRound);
        
        // TRACKING
        if (userAttacks[currentRound][msg.sender] == 0) {
            _userParticipatedRounds[msg.sender].push(currentRound);
        }

        userAttacks[currentRound][msg.sender] += _count;
        rewardDebt[currentRound][msg.sender] = (userAttacks[currentRound][msg.sender] * r.accRewardPerAttack) / PRECISION;
        
        lastAttackTimestamp[msg.sender] = block.timestamp;
        totalLifetimeAttacks[msg.sender] += _count;

        r.totalAttacks += _count;
        r.lastAttacker = msg.sender;

        // Update Timers
        r.softDeadline = uint40(block.timestamp + cfg.softDuration);
        uint256 timeReduction = cfg.timeDecreaseStep * _count;
        if (r.hardDeadline > block.timestamp + timeReduction) {
            r.hardDeadline -= uint40(timeReduction);
        } else {
            r.hardDeadline = uint40(block.timestamp); 
        }

        _updateTopAttackers(currentRound, msg.sender);

        if (r.hardDeadline <= block.timestamp) {
             _finalizeRound("HARD_WIN");
        } else {
            emit AttackPerformed(currentRound, msg.sender, _count, jackpotPool, r.hardDeadline);
        }
    }

    // ================= OPTIMIZED VAULT UPDATE =================

    function _updateVaultAndClean(address _user, uint256 _rid) internal {
        Round storage r = rounds[_rid];
        uint256 uAttacks = userAttacks[_rid][_user];
        
        if (uAttacks > 0) {
            uint256 pending = (uAttacks * r.accRewardPerAttack / PRECISION) - rewardDebt[_rid][_user];
            if (pending > 0) {
                personalVault[_user] += pending;
                totalVaultBalance += pending;
            }
            
            rewardDebt[_rid][_user] = (uAttacks * r.accRewardPerAttack / PRECISION);

            if (r.ended) {
                delete userAttacks[_rid][_user];
                delete rewardDebt[_rid][_user];
            }
        }
    }

    // ================= INTERNAL HELPERS =================

    function _distributeFunds(Round storage r, uint256 _amount) internal {
        uint256 toBurn = (_amount * 1) / 100;
        uint256 toStaking = (_amount * 2) / 100;
        uint256 toSeed = (_amount * 5) / 100;
        uint256 toDivs = (_amount * 17) / 100;
        
        if (toBurn > 0) try banMaoToken.transfer(BURN_ADDRESS, toBurn) {} catch {} 
        if (toStaking > 0) {
            bool sent = false;
            if (stakingAddress != address(0)) {
                try banMaoToken.transfer(stakingAddress, toStaking) returns (bool success) { sent = success; } catch { sent = false; }
            }
            if (!sent) jackpotPool += toStaking; 
            else emit DistributedToStaking(toStaking);
        }

        seedFundNextRound += toSeed;

        if (r.totalAttacks > 0) {
            r.accRewardPerAttack += (toDivs * PRECISION) / r.totalAttacks;
        } else {
            jackpotPool += toDivs; 
        }

        uint256 allocated = toBurn + toStaking + toSeed + toDivs;
        if (_amount > allocated) {
            jackpotPool += (_amount - allocated);
        }
    }

    function _finalizeRound(string memory _winType) internal {
        Round storage r = rounds[currentRound];
        if (r.ended) return; 
        r.ended = true;

        if (keccak256(bytes(_winType)) == keccak256(bytes("TIMEOUT"))) {
            seedFundNextRound += jackpotPool;
            emit PrizeRolledOver(currentRound, jackpotPool, "Claim Timeout");
            emit RoundFinalized(currentRound, address(0), 0, "TIMEOUT");
            jackpotPool = 0;
        } 
        else if (r.lastAttacker != address(0)) {
            if (keccak256(bytes(_winType)) == keccak256(bytes("HARD_WIN"))) {
                uint256 nextRoundShare = (jackpotPool * 30) / 100;
                seedFundNextRound += nextRoundShare;
                jackpotPool -= nextRoundShare;
            }
            _distributeTieredRewards(currentRound, r.lastAttacker, _winType);
        }
        _startNewRound();
    }
    
    function _startNewRound() internal {
        currentRound++;
        activeConfig = nextConfig;
        jackpotPool += seedFundNextRound;
        seedFundNextRound = 0;
        rounds[currentRound].softDeadline = uint40(block.timestamp + activeConfig.softDuration);
        rounds[currentRound].hardDeadline = uint40(block.timestamp + activeConfig.initialHardDuration);
        emit RoundStarted(currentRound, jackpotPool, rounds[currentRound].hardDeadline);
    }
    
    function _distributeTieredRewards(uint256 _roundId, address _winner, string memory _winType) internal {
        uint256 pool = jackpotPool;
        GameConfig memory cfg = activeConfig;
        uint256 forfeited = 0;

        uint256 winnerAmount = (pool * cfg.winnerPercent) / 100;
        if (userAttacks[_roundId][_winner] >= cfg.minAttacksForReward) {
            personalVault[_winner] += winnerAmount;
            totalVaultBalance += winnerAmount;
            emit WinnerPrizePaid(_winner, winnerAmount, true);
        } else {
            uint256 partialPrize = winnerAmount / 2;
            personalVault[_winner] += partialPrize;
            totalVaultBalance += partialPrize;
            forfeited += (winnerAmount - partialPrize);
            emit WinnerPrizePaid(_winner, partialPrize, false);
        }

        uint256 topAmount = (pool * cfg.topAttackersPercent) / 100;
        forfeited += _distributeTopRewards(_roundId, topAmount, cfg.minAttacksForReward);

        emit RoundFinalized(_roundId, _winner, pool, _winType);
        seedFundNextRound += forfeited; 
        jackpotPool = 0;
    }

    function _distributeTopRewards(uint256 _roundId, uint256 _amount, uint256 _minAttacks) internal returns (uint256) {
        uint256 count = topAttackersCount[_roundId];
        if (count == 0) return _amount;
        uint256 totalQualified = 0;
        TopAttacker[MAX_TOP_ATTACKERS] memory list = topAttackers[_roundId];

        for (uint256 i = 0; i < count; i++) {
            if (list[i].attacks >= _minAttacks) totalQualified += list[i].attacks;
        }

        if (totalQualified == 0) return _amount; 
        uint256 distributed = 0;
        for (uint256 i = 0; i < count; i++) {
            if (list[i].attacks >= _minAttacks) {
                uint256 share = (_amount * list[i].attacks) / totalQualified;
                personalVault[list[i].addr] += share;
                totalVaultBalance += share;
                distributed += share;
                emit TopAttackerRewarded(_roundId, list[i].addr, i + 1, share);
            }
        }
        return _amount - distributed;
    }
    
    function _updateTopAttackers(uint256 _roundId, address _user) internal {
        uint256 userCount = userAttacks[_roundId][_user];
        uint256 currentLen = topAttackersCount[_roundId];
        TopAttacker[MAX_TOP_ATTACKERS] memory leaderboard = topAttackers[_roundId];
        int256 index = -1;
        for(uint256 i = 0; i < currentLen; i++) {
            if(leaderboard[i].addr == _user) { index = int256(i); leaderboard[i].attacks = userCount; break; }
        }
        if(index == -1) {
            if(currentLen < MAX_TOP_ATTACKERS) { leaderboard[currentLen] = TopAttacker(_user, userCount); topAttackersCount[_roundId]++; currentLen++; } 
            else if(userCount > leaderboard[MAX_TOP_ATTACKERS - 1].attacks) { leaderboard[MAX_TOP_ATTACKERS - 1] = TopAttacker(_user, userCount); }
        }
        
        // FIX: Bubble Sort
        for (uint256 i = 0; i < currentLen; i++) {
            for (uint256 j = i + 1; j < currentLen; j++) {
                if (leaderboard[j].attacks > leaderboard[i].attacks) { TopAttacker memory temp = leaderboard[i]; leaderboard[i] = leaderboard[j]; leaderboard[j] = temp; }
            }
        }
        
        // FIX: Manual copy to storage (No more UnimplementedFeatureError)
        for (uint256 k = 0; k < MAX_TOP_ATTACKERS; k++) {
            topAttackers[_roundId][k] = leaderboard[k];
        }
    }
    
    // ================= ADMIN & VIEWS =================

    function scheduleConfigChange(GameConfig memory _newConfig) external onlyOwner {
        require(_newConfig.attackCost >= 1e15, "Cost too low");
        require(_newConfig.winnerPercent + _newConfig.topAttackersPercent == 100, "Must sum 100");
        nextConfig = _newConfig;
        emit ConfigScheduled(currentRound + 1);
    }
    
    function distributeDust() external onlyOwner nonReentrant {
        uint256 locked = jackpotPool + seedFundNextRound + totalVaultBalance;
        uint256 bal = banMaoToken.balanceOf(address(this));
        if (bal > locked) {
            uint256 dust = bal - locked;
            if (stakingAddress != address(0)) { try banMaoToken.transfer(stakingAddress, dust) { emit DistributedToStaking(dust); } catch {} }
        }
    }
    function setPaused(bool _s) external onlyOwner { paused = _s; }
    
    // ================= VIP TIER ADMIN =================
    
    function setTierThresholds(uint256[4] memory _thresholds) external onlyOwner {
        require(_thresholds[0] < _thresholds[1], "Invalid order: 0 < 1");
        require(_thresholds[1] < _thresholds[2], "Invalid order: 1 < 2");
        require(_thresholds[2] < _thresholds[3], "Invalid order: 2 < 3");
        tierThresholds = _thresholds;
        emit TierThresholdsUpdated(_thresholds);
    }
    
    function setTierCooldownReduction(uint256[4] memory _reductions) external onlyOwner {
        require(_reductions[0] <= 100 && _reductions[1] <= 100, "Max 100%");
        require(_reductions[2] <= 100 && _reductions[3] <= 100, "Max 100%");
        tierCooldownReduction = _reductions;
        emit TierCooldownReductionUpdated(_reductions);
    }
    
    function getTierThresholds() external view returns (uint256[4] memory) {
        return tierThresholds;
    }
    
    function getTierCooldownReduction() external view returns (uint256[4] memory) {
        return tierCooldownReduction;
    }
    
    function getUserStats(address _user) external view returns (uint256 attacks, uint256 vault, uint256 cooldown, uint8 tier) {
        attacks = userAttacks[currentRound][_user];
        vault = personalVault[_user];
        cooldown = lastAttackTimestamp[_user] + _getEffectiveCooldown(_user);
        tier = getPlayerTier(_user);
    }
    function getPlayerTier(address _user) public view returns (uint8) {
        uint256 attacks = totalLifetimeAttacks[_user];
        if (attacks >= tierThresholds[3]) return 4;
        if (attacks >= tierThresholds[2]) return 3;
        if (attacks >= tierThresholds[1]) return 2;
        if (attacks >= tierThresholds[0]) return 1;
        return 0;
    }
    function _getEffectiveCooldown(address _user) internal view returns (uint256) {
        uint8 tier = getPlayerTier(_user);
        if (tier == 0) return COOLDOWN_TIME;
        uint256 index = tier > 4 ? 3 : tier - 1;
        return COOLDOWN_TIME - (COOLDOWN_TIME * tierCooldownReduction[index] / 100);
    }
    function getTopAttackers(uint256 _roundId) external view returns (TopAttacker[MAX_TOP_ATTACKERS] memory) { return topAttackers[_roundId]; }
}