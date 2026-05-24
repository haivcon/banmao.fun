// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WorldCupYieldWars (Multi-Season Edition)
 * @notice Features:
 * - Full Multi-Season support with isolated states per season.
 * - Early Bird multiplier (max 48x) for early stakers.
 * - O(1) 50% Principal Slashing via principalIndex algorithm.
 * - Separation of Principal and Yield (Yield can be claimed separately).
 * - Patched Reward Debt bug (MasterChef Infinite Money Glitch).
 * - 100% dust cleaning when user unstakes max amount.
 */
contract WorldCupYieldWars is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Config ============
    IERC20 public stakingToken;
    uint256 public constant ABSOLUTE_MAX_TEAMS = 64;
    
    bool public isMainnet;
    uint256 public stakeFee = 200;   // 2% in basis points
    uint256 public unstakeFee = 200; // 2% in basis points
    uint256 public minStakeAmount = 1 ether; 
    uint256 constant BP = 10000;
    uint256 constant PRECISION = 1e18; 
    uint256 public constant maxBonusHours = 48; 

    // Admin reward pool (Global, spans across all seasons)
    uint256 public rewardPool; 

    // ============ Season State ============
    uint256 public currentSeasonId = 1;

    struct SeasonInfo {
        uint256 maxTeams;
        uint256 tournamentStartTime;
        uint256 totalStakedAll;         // Total PRINCIPAL tokens locked in this season
        uint256 totalUnclaimedRewards;  // Total rewards users have WON but NOT YET CLAIMED in this season
        uint256 lockedMatchCount;
        uint256 championTeamId;
        bool tournamentStarted;
        bool tournamentEnded;
    }
    mapping(uint256 => SeasonInfo) public seasonInfo;

    // ============ Team Pools ============
    struct TeamPool {
        uint256 totalPrincipal;
        uint256 totalWeight;
        uint256 accRewardPerWeight;
        uint256 principalIndex;
        uint8   status; // 0=Active, 1=Champion, 2=Eliminated
        bool    locked;
    }

    struct TeamMetadata {
        string name;
        string code;
        string groupName;
        string color;
        string colorSecondary;
    }

    // seasonId => teamId => TeamPool
    mapping(uint256 => mapping(uint256 => TeamPool)) public teamPools;
    // seasonId => teamId => TeamMetadata
    mapping(uint256 => mapping(uint256 => TeamMetadata)) private teamMetadata;
    
    // ============ User Stakes ============
    struct UserStake {
        uint256 principalBase;
        uint256 weight;
        uint256 rewardDebt;
        uint256 pendingRewards;
    }
    // seasonId => user => teamId => UserStake
    mapping(uint256 => mapping(address => mapping(uint256 => UserStake))) public userStakes;

    // ============ Match System ============
    struct Match {
        uint256 seasonId; // Associates match with a specific season
        uint256 teamA;
        uint256 teamB;
        uint256 lockTime;
        uint256 winningTeam;
        bool    isLocked;
        bool    isResolved;
        bool    isDraw;
        bool    isElimination;
        uint256 slashedAmount;
        uint256 feeBonus;
    }
    mapping(uint256 => Match) public matches;
    mapping(uint256 => uint256[]) private seasonMatchIds;
    uint256 public matchCount; // Grows infinitely to prevent ID collision

    // ============ Events ============
    event Staked(address indexed user, uint256 indexed seasonId, uint256 indexed teamId, uint256 netAmount, uint256 multiplier);
    event Unstaked(address indexed user, uint256 indexed seasonId, uint256 indexed teamId, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed seasonId, uint256 indexed teamId, uint256 reward);
    event MatchLocked(uint256 indexed matchId, uint256 indexed seasonId, uint256 teamA, uint256 teamB);
    event MatchResolved(uint256 indexed matchId, uint256 indexed seasonId, uint256 winningTeam, uint256 losingTeam, uint256 slashedAmount, uint256 feeBonus);
    event MatchDrawn(uint256 indexed matchId, uint256 indexed seasonId);
    event TeamMetadataUpdated(uint256 indexed seasonId, uint256 indexed teamId, string name, string code, string groupName, string color, string colorSecondary);
    event FeesUpdated(uint256 stakeFee, uint256 unstakeFee);
    event MinStakeUpdated(uint256 minStakeAmount);
    event SeasonConfigured(uint256 indexed seasonId, uint256 maxTeams, uint256 tournamentStartTime);
    event TournamentStarted(uint256 indexed seasonId);
    event ChampionDeclared(uint256 indexed seasonId, uint256 indexed teamId);
    event RewardPoolWithdrawn(address indexed to, uint256 amount);

    // ============ Constructor ============
    constructor(
        address _token,
        uint256 _maxTeams,
        bool _isMainnet,
        uint256 _tournamentStartTime
    ) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        require(_maxTeams > 1 && _maxTeams <= ABSOLUTE_MAX_TEAMS, "Invalid count");
        
        stakingToken = IERC20(_token);
        isMainnet = _isMainnet;

        _initSeason(currentSeasonId, _maxTeams, _tournamentStartTime);
    }

    function _initSeason(uint256 _seasonId, uint256 _maxTeams, uint256 _startTime) internal {
        SeasonInfo storage season = seasonInfo[_seasonId];
        season.maxTeams = _maxTeams;
        season.tournamentStartTime = _startTime;
        
        for (uint256 i = 0; i < _maxTeams; i++) {
            teamPools[_seasonId][i].principalIndex = PRECISION; // 1.0 multiplier
        }
        emit SeasonConfigured(_seasonId, _maxTeams, _startTime);
    }

    modifier validTeam(uint256 _seasonId, uint256 _teamId) { 
        require(_teamId < seasonInfo[_seasonId].maxTeams, "Invalid team"); 
        _; 
    }
    modifier teamNotLocked(uint256 _seasonId, uint256 _teamId) { 
        require(!teamPools[_seasonId][_teamId].locked, "Team locked"); 
        _; 
    }
    modifier teamActive(uint256 _seasonId, uint256 _teamId) { 
        require(teamPools[_seasonId][_teamId].status <= 1, "Eliminated"); 
        _; 
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Users always stake in the CURRENT season.
     */
    function stake(uint256 teamId, uint256 amount)
        external whenNotPaused nonReentrant
    {
        uint256 sId = currentSeasonId;
        _validateStakeTarget(sId, teamId);
        require(amount > 0, "Zero amount");
        SeasonInfo storage season = seasonInfo[sId];
        require(season.tournamentStarted && !season.tournamentEnded, "Tournament not active");

        uint256 net = _collectStakeAmount(amount);
        uint256 multiplier = _stakeMultiplier(season.tournamentStartTime);
        _increaseUserStake(sId, teamId, msg.sender, net, multiplier);

        season.totalStakedAll += net;
        emit Staked(msg.sender, sId, teamId, net, multiplier);
    }

    function _validateStakeTarget(uint256 seasonId, uint256 teamId) internal view validTeam(seasonId, teamId) teamActive(seasonId, teamId) teamNotLocked(seasonId, teamId) {}

    function _collectStakeAmount(uint256 amount) internal returns (uint256 net) {
        uint256 balanceBefore = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = stakingToken.balanceOf(address(this)) - balanceBefore;
        require(received >= minStakeAmount, "Below min stake");
        uint256 fee = (received * stakeFee) / BP;
        net = received - fee;
        if (fee > 0) rewardPool += fee;
    }

    function _stakeMultiplier(uint256 tournamentStartTime) internal view returns (uint256 multiplier) {
        multiplier = PRECISION;
        if (block.timestamp < tournamentStartTime) {
            uint256 hoursEarly = (tournamentStartTime - block.timestamp) / 1 hours;
            if (hoursEarly > maxBonusHours) hoursEarly = maxBonusHours;
            if (hoursEarly == 0) hoursEarly = 1;
            multiplier = hoursEarly * PRECISION;
        }
    }

    function _increaseUserStake(uint256 seasonId, uint256 teamId, address account, uint256 net, uint256 multiplier) internal {
        TeamPool storage pool = teamPools[seasonId][teamId];
        UserStake storage user = userStakes[seasonId][account][teamId];
        _settleRewards(user, pool);
        uint256 principalBaseAdded = (net * PRECISION) / pool.principalIndex;
        uint256 weightAdded = (net * multiplier) / PRECISION;
        user.principalBase += principalBaseAdded;
        user.weight += weightAdded;
        pool.totalPrincipal += net;
        pool.totalWeight += weightAdded;
        user.rewardDebt = (user.weight * pool.accRewardPerWeight) / PRECISION;
    }

    /**
     * @notice Users can unstake from ANY season by providing the seasonId.
     */
    function unstake(uint256 seasonId, uint256 teamId, uint256 amount)
        external whenNotPaused nonReentrant 
        validTeam(seasonId, teamId) 
        teamNotLocked(seasonId, teamId)
    {
        TeamPool storage pool = teamPools[seasonId][teamId];
        UserStake storage user = userStakes[seasonId][msg.sender][teamId];
        SeasonInfo storage season = seasonInfo[seasonId];

        uint256 currentPrincipal = (user.principalBase * pool.principalIndex) / PRECISION;
        require(currentPrincipal >= amount && amount > 0, "Insufficient principal");

        _settleRewards(user, pool);

        uint256 baseToBurn;
        uint256 weightToBurn;
        
        if (amount == currentPrincipal) {
            baseToBurn = user.principalBase;
            weightToBurn = user.weight;
        } else {
            baseToBurn = (amount * PRECISION) / pool.principalIndex;
            weightToBurn = (user.weight * amount) / currentPrincipal;
        }

        user.principalBase -= baseToBurn;
        user.weight -= weightToBurn;
        pool.totalPrincipal -= amount;
        pool.totalWeight -= weightToBurn;
        season.totalStakedAll -= amount;

        user.rewardDebt = (user.weight * pool.accRewardPerWeight) / PRECISION;

        uint256 payout = amount;
        if (pool.status == 0 && !season.tournamentEnded) { // Active teams pay fee only while the season is open
            uint256 fee = (amount * unstakeFee) / BP;
            payout -= fee;
            rewardPool += fee;
        }

        stakingToken.safeTransfer(msg.sender, payout);
        emit Unstaked(msg.sender, seasonId, teamId, payout);
    }

    /**
     * @notice Claim rewards from a specific season.
     */
    function claimRewards(uint256 seasonId, uint256 teamId) external nonReentrant {
        TeamPool storage pool = teamPools[seasonId][teamId];
        UserStake storage user = userStakes[seasonId][msg.sender][teamId];
        SeasonInfo storage season = seasonInfo[seasonId];

        _settleRewards(user, pool);
        
        uint256 claimable = user.pendingRewards;
        require(claimable > 0, "No rewards");

        user.pendingRewards = 0;
        season.totalUnclaimedRewards -= claimable;

        stakingToken.safeTransfer(msg.sender, claimable);
        emit RewardClaimed(msg.sender, seasonId, teamId, claimable);
    }

    function _settleRewards(UserStake storage user, TeamPool storage pool) internal {
        if (user.weight > 0) {
            uint256 pending = (user.weight * pool.accRewardPerWeight) / PRECISION - user.rewardDebt;
            if (pending > 0) {
                user.pendingRewards += pending;
            }
            user.rewardDebt = (user.weight * pool.accRewardPerWeight) / PRECISION;
        }
    }

    // ============ MATCH SYSTEM (ADMIN) ============

    function lockMatch(uint256 teamA, uint256 teamB, bool isElimination)
        external
        onlyOwner
        whenNotPaused
        validTeam(currentSeasonId, teamA)
        validTeam(currentSeasonId, teamB)
    {
        uint256 sId = currentSeasonId;
        SeasonInfo storage season = seasonInfo[sId];
        
        require(season.tournamentStarted && !season.tournamentEnded, "Tournament not active");
        require(teamA != teamB, "Same team");
        require(!teamPools[sId][teamA].locked && !teamPools[sId][teamB].locked, "Already locked");
        require(teamPools[sId][teamA].status == 0 && teamPools[sId][teamB].status == 0, "Not active");

        uint256 matchId = matchCount++;
        seasonMatchIds[sId].push(matchId);
        teamPools[sId][teamA].locked = true;
        teamPools[sId][teamB].locked = true;
        season.lockedMatchCount += 1;

        matches[matchId] = Match({
            seasonId: sId,
            teamA: teamA, teamB: teamB,
            lockTime: block.timestamp, winningTeam: 0,
            isLocked: true, isResolved: false, isDraw: false,
            isElimination: isElimination, slashedAmount: 0, feeBonus: 0
        });

        emit MatchLocked(matchId, sId, teamA, teamB);
    }

    function resolveMatch(uint256 matchId, uint256 winningTeamId) external onlyOwner whenNotPaused {
        Match storage m = matches[matchId];
        uint256 sId = m.seasonId;
        SeasonInfo storage season = seasonInfo[sId];

        require(m.isLocked && !m.isResolved, "Invalid match state");
        require(winningTeamId == m.teamA || winningTeamId == m.teamB, "Invalid winner");

        uint256 losingTeam = (winningTeamId == m.teamA) ? m.teamB : m.teamA;
        TeamPool storage winPool = teamPools[sId][winningTeamId];
        TeamPool storage losePool = teamPools[sId][losingTeam];

        uint256 slashedAmount = losePool.totalPrincipal / 2;
        losePool.totalPrincipal -= slashedAmount;
        losePool.principalIndex = losePool.principalIndex / 2;
        season.totalStakedAll -= slashedAmount; 

        uint256 feeBonus = rewardPool / 4; 
        if (feeBonus > 0) rewardPool -= feeBonus;

        uint256 totalReward = slashedAmount + feeBonus;

        if (winPool.totalWeight > 0) {
            winPool.accRewardPerWeight += (totalReward * PRECISION) / winPool.totalWeight;
            season.totalUnclaimedRewards += totalReward;
        } else {
            rewardPool += totalReward;
        }

        m.winningTeam = winningTeamId;
        m.isResolved = true;
        m.slashedAmount = slashedAmount;
        m.feeBonus = feeBonus;

        winPool.locked = false;
        losePool.locked = false;
        season.lockedMatchCount -= 1;

        if (m.isElimination) losePool.status = 2; // Eliminated
        emit MatchResolved(matchId, sId, winningTeamId, losingTeam, slashedAmount, feeBonus);
    }

    function resolveDraw(uint256 matchId) external onlyOwner whenNotPaused {
        Match storage m = matches[matchId];
        uint256 sId = m.seasonId;
        SeasonInfo storage season = seasonInfo[sId];

        require(m.isLocked && !m.isResolved, "Invalid state");

        m.isResolved = true;
        m.isDraw = true;

        teamPools[sId][m.teamA].locked = false;
        teamPools[sId][m.teamB].locked = false;
        season.lockedMatchCount -= 1;

        emit MatchDrawn(matchId, sId);
    }

    // ============ ADMIN UTILS ============

    function startTournament() external onlyOwner {
        require(!seasonInfo[currentSeasonId].tournamentStarted, "Already started");
        seasonInfo[currentSeasonId].tournamentStarted = true;
        emit TournamentStarted(currentSeasonId);
    }
    
    function declareChampion(uint256 teamId) external onlyOwner validTeam(currentSeasonId, teamId) {
        SeasonInfo storage season = seasonInfo[currentSeasonId];
        require(season.tournamentStarted && !season.tournamentEnded, "Not active");
        require(season.lockedMatchCount == 0, "Unresolved matches");
        
        teamPools[currentSeasonId][teamId].status = 1;
        season.championTeamId = teamId;
        season.tournamentEnded = true;
        emit ChampionDeclared(currentSeasonId, teamId);
    }

    /**
     * @notice Rollover to the next season seamlessly. 
     * No need to wait for old users to withdraw.
     */
    function configureNextSeason(uint256 newMaxTeams, uint256 newTournamentStartTime) external onlyOwner {
        require(newMaxTeams > 1 && newMaxTeams <= ABSOLUTE_MAX_TEAMS, "Invalid count");
        SeasonInfo storage currentSeason = seasonInfo[currentSeasonId];
        require(!currentSeason.tournamentStarted || currentSeason.tournamentEnded, "Current season active");
        require(currentSeason.lockedMatchCount == 0, "Locked matches remain");

        currentSeasonId += 1;
        _initSeason(currentSeasonId, newMaxTeams, newTournamentStartTime);
    }

    function withdrawRewardPool(address to, uint256 amount) external onlyOwner {
        require(amount <= rewardPool, "Exceeds pool");
        rewardPool -= amount;
        stakingToken.safeTransfer(to, amount);
        emit RewardPoolWithdrawn(to, amount);
    }

    /**
     * @notice Rescues stuck tokens or sweeps dust safely.
     * Iterates through seasons to ensure no user funds are touched.
     */
    function recoverERC20(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(stakingToken)) {
            uint256 realBalance = stakingToken.balanceOf(address(this));
            uint256 lockedBalance = rewardPool;
            
            // Sum up liabilities across all seasons
            for (uint256 i = 1; i <= currentSeasonId; i++) {
                lockedBalance += seasonInfo[i].totalStakedAll;
                lockedBalance += seasonInfo[i].totalUnclaimedRewards;
            }
            
            require(realBalance - lockedBalance >= amount, "Cannot sweep locked funds");
        }
        IERC20(token).safeTransfer(to, amount);
    }

    // ============ ADMIN CONFIG ============

    function setFees(uint256 _stakeFee, uint256 _unstakeFee) external onlyOwner {
        require(_stakeFee <= 500 && _unstakeFee <= 500, "Max 5%");
        stakeFee = _stakeFee;
        unstakeFee = _unstakeFee;
        emit FeesUpdated(_stakeFee, _unstakeFee);
    }

    function setMinStakeAmount(uint256 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
        emit MinStakeUpdated(_minStakeAmount);
    }

    function setTournamentStartTime(uint256 newTournamentStartTime) external onlyOwner {
        SeasonInfo storage season = seasonInfo[currentSeasonId];
        require(!season.tournamentStarted, "Already started");
        season.tournamentStartTime = newTournamentStartTime;
    }

    function setMaxTeams(uint256 newMaxTeams) external onlyOwner {
        SeasonInfo storage season = seasonInfo[currentSeasonId];
        require(!season.tournamentStarted, "Already started");
        require(newMaxTeams > 1 && newMaxTeams <= ABSOLUTE_MAX_TEAMS, "Invalid count");
        require(newMaxTeams >= season.maxTeams, "Cannot shrink");
        for (uint256 i = season.maxTeams; i < newMaxTeams; i++) {
            teamPools[currentSeasonId][i].principalIndex = PRECISION;
        }
        season.maxTeams = newMaxTeams;
    }

    function setTeamMetadata(
        uint256 teamId,
        string calldata name,
        string calldata code,
        string calldata groupName,
        string calldata color,
        string calldata colorSecondary
    ) external onlyOwner validTeam(currentSeasonId, teamId) {
        require(!seasonInfo[currentSeasonId].tournamentStarted, "Season started");
        _setTeamMetadata(currentSeasonId, teamId, name, code, groupName, color, colorSecondary);
    }

    function setTeamMetadataForSeason(
        uint256 seasonId,
        uint256 teamId,
        string calldata name,
        string calldata code,
        string calldata groupName,
        string calldata color,
        string calldata colorSecondary
    ) external onlyOwner validTeam(seasonId, teamId) {
        require(!seasonInfo[seasonId].tournamentStarted, "Season started");
        _setTeamMetadata(seasonId, teamId, name, code, groupName, color, colorSecondary);
    }

    function setTeamMetadataBatch(
        uint256[] calldata teamIds,
        string[] calldata names,
        string[] calldata codes,
        string[] calldata groupNames,
        string[] calldata colors,
        string[] calldata colorSecondaries
    ) external onlyOwner {
        require(!seasonInfo[currentSeasonId].tournamentStarted, "Season started");
        uint256 len = teamIds.length;
        require(
            len == names.length &&
            len == codes.length &&
            len == groupNames.length &&
            len == colors.length &&
            len == colorSecondaries.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < len; i++) {
            require(teamIds[i] < seasonInfo[currentSeasonId].maxTeams, "Invalid team");
            _setTeamMetadata(currentSeasonId, teamIds[i], names[i], codes[i], groupNames[i], colors[i], colorSecondaries[i]);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _setTeamMetadata(
        uint256 seasonId,
        uint256 teamId,
        string calldata name,
        string calldata code,
        string calldata groupName,
        string calldata color,
        string calldata colorSecondary
    ) internal {
        require(bytes(name).length > 0 && bytes(name).length <= 40, "Bad name");
        require(bytes(code).length > 0 && bytes(code).length <= 8, "Bad code");
        require(bytes(groupName).length <= 16, "Bad group");
        require(bytes(color).length <= 16 && bytes(colorSecondary).length <= 16, "Bad color");

        teamMetadata[seasonId][teamId] = TeamMetadata(name, code, groupName, color, colorSecondary);
        emit TeamMetadataUpdated(seasonId, teamId, name, code, groupName, color, colorSecondary);
    }

    // ============ SEASON-AWARE READ HELPERS ============

    function getCurrentSeasonInfo() external view returns (
        uint256 maxTeams,
        uint256 tournamentStartTime,
        uint256 totalStakedAll,
        uint256 totalUnclaimedRewards,
        uint256 lockedMatchCount,
        uint256 championTeamId,
        bool tournamentStarted,
        bool tournamentEnded
    ) {
        return getSeasonInfo(currentSeasonId);
    }

    function getSeasonInfo(uint256 seasonId) public view returns (
        uint256 maxTeams,
        uint256 tournamentStartTime,
        uint256 totalStakedAll,
        uint256 totalUnclaimedRewards,
        uint256 lockedMatchCount,
        uint256 championTeamId,
        bool tournamentStarted,
        bool tournamentEnded
    ) {
        SeasonInfo memory season = seasonInfo[seasonId];
        return (
            season.maxTeams,
            season.tournamentStartTime,
            season.totalStakedAll,
            season.totalUnclaimedRewards,
            season.lockedMatchCount,
            season.championTeamId,
            season.tournamentStarted,
            season.tournamentEnded
        );
    }

    function getTeamPool(uint256 seasonId, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        uint256 totalPrincipal,
        uint256 totalWeight,
        uint256 accRewardPerWeight,
        uint256 principalIndex,
        uint8 status,
        bool locked
    ) {
        TeamPool memory pool = teamPools[seasonId][teamId];
        return (pool.totalPrincipal, pool.totalWeight, pool.accRewardPerWeight, pool.principalIndex, pool.status, pool.locked);
    }

    function getAllTeamStats(uint256 seasonId) external view returns (
        uint256[] memory totalPrincipalArr,
        uint256[] memory totalWeightArr,
        uint256[] memory accRewardPerWeightArr,
        uint256[] memory principalIndexArr,
        uint8[] memory statusArr,
        bool[] memory lockedArr
    ) {
        uint256 count = seasonInfo[seasonId].maxTeams;
        totalPrincipalArr = new uint256[](count);
        totalWeightArr = new uint256[](count);
        accRewardPerWeightArr = new uint256[](count);
        principalIndexArr = new uint256[](count);
        statusArr = new uint8[](count);
        lockedArr = new bool[](count);
        for (uint256 i = 0; i < count; i++) {
            TeamPool memory pool = teamPools[seasonId][i];
            totalPrincipalArr[i] = pool.totalPrincipal;
            totalWeightArr[i] = pool.totalWeight;
            accRewardPerWeightArr[i] = pool.accRewardPerWeight;
            principalIndexArr[i] = pool.principalIndex;
            statusArr[i] = pool.status;
            lockedArr[i] = pool.locked;
        }
    }

    function getTeamMetadata(uint256 seasonId, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        string memory name,
        string memory code,
        string memory groupName,
        string memory color,
        string memory colorSecondary
    ) {
        TeamMetadata memory metadata = teamMetadata[seasonId][teamId];
        return (metadata.name, metadata.code, metadata.groupName, metadata.color, metadata.colorSecondary);
    }

    function getAllTeamMetadata(uint256 seasonId) external view returns (
        string[] memory names,
        string[] memory codes,
        string[] memory groupNames,
        string[] memory colors,
        string[] memory colorSecondaries
    ) {
        uint256 count = seasonInfo[seasonId].maxTeams;
        names = new string[](count);
        codes = new string[](count);
        groupNames = new string[](count);
        colors = new string[](count);
        colorSecondaries = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            TeamMetadata memory metadata = teamMetadata[seasonId][i];
            names[i] = metadata.name;
            codes[i] = metadata.code;
            groupNames[i] = metadata.groupName;
            colors[i] = metadata.color;
            colorSecondaries[i] = metadata.colorSecondary;
        }
    }

    function getUserInfo(uint256 seasonId, address account, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        uint256 principal,
        uint256 weight,
        uint256 pendingRewards
    ) {
        UserStake memory user = userStakes[seasonId][account][teamId];
        TeamPool memory pool = teamPools[seasonId][teamId];
        principal = (user.principalBase * pool.principalIndex) / PRECISION;
        weight = user.weight;
        pendingRewards = user.pendingRewards;
        if (user.weight > 0) {
            pendingRewards += (user.weight * pool.accRewardPerWeight) / PRECISION - user.rewardDebt;
        }
    }

    function getMatch(uint256 matchId) external view returns (
        uint256 seasonId,
        uint256 teamA,
        uint256 teamB,
        uint256 winningTeam,
        bool isLocked,
        bool isResolved,
        bool isElimination,
        bool isDraw,
        uint256 slashedAmount,
        uint256 feeBonus
    ) {
        Match memory m = matches[matchId];
        return (m.seasonId, m.teamA, m.teamB, m.winningTeam, m.isLocked, m.isResolved, m.isElimination, m.isDraw, m.slashedAmount, m.feeBonus);
    }

    function getSeasonMatchIds(uint256 seasonId) external view returns (uint256[] memory ids) {
        return seasonMatchIds[seasonId];
    }

    function getMatchRewardBreakdown(uint256 matchId) external view returns (
        uint256 seasonId,
        uint256 teamA,
        uint256 teamB,
        uint256 winningTeam,
        uint256 losingTeam,
        bool isResolved,
        bool isDraw,
        uint256 slashedAmount,
        uint256 feeBonus,
        uint256 totalReward,
        uint256 winningPoolWeight,
        bool rewardToWinners
    ) {
        Match memory m = matches[matchId];
        losingTeam = (!m.isResolved || m.isDraw) ? 0 : (m.winningTeam == m.teamA ? m.teamB : m.teamA);
        uint256 poolWeight = m.isResolved && !m.isDraw ? teamPools[m.seasonId][m.winningTeam].totalWeight : 0;
        uint256 reward = m.slashedAmount + m.feeBonus;
        return (
            m.seasonId,
            m.teamA,
            m.teamB,
            m.winningTeam,
            losingTeam,
            m.isResolved,
            m.isDraw,
            m.slashedAmount,
            m.feeBonus,
            reward,
            poolWeight,
            m.isResolved && !m.isDraw && poolWeight > 0
        );
    }

    function previewStake(uint256 amount) external view returns (uint256 fee, uint256 netAmount) {
        fee = (amount * stakeFee) / BP;
        netAmount = amount - fee;
    }

    function previewUnstake(uint256 seasonId, uint256 teamId, address account, uint256 amount) external view validTeam(seasonId, teamId) returns (
        uint256 currentPrincipal,
        uint256 fee,
        uint256 payout,
        bool validAmount
    ) {
        UserStake memory user = userStakes[seasonId][account][teamId];
        TeamPool memory pool = teamPools[seasonId][teamId];
        currentPrincipal = (user.principalBase * pool.principalIndex) / PRECISION;
        validAmount = amount > 0 && amount <= currentPrincipal;
        fee = pool.status == 0 && !seasonInfo[seasonId].tournamentEnded ? (amount * unstakeFee) / BP : 0;
        payout = amount > fee ? amount - fee : 0;
    }

    function getUserRewardShare(uint256 seasonId, address account, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        uint256 userWeight,
        uint256 poolWeight,
        uint256 shareBp
    ) {
        UserStake memory user = userStakes[seasonId][account][teamId];
        poolWeight = teamPools[seasonId][teamId].totalWeight;
        userWeight = user.weight;
        shareBp = poolWeight > 0 ? (userWeight * BP) / poolWeight : 0;
    }
}
