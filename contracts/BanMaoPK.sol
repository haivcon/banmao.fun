// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BanMao PK: Anti-Spam Edition (V11)
 * @notice New Feature: Min Challenge Deposit to prevent spam.
 */
contract BanMaoPK is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // --- CONFIGURATION ---
    IERC20 public immutable banMaoToken;
    address public treasuryAddress;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    uint256 public overtimeDuration = 1 hours; 
    uint256 public constant MIN_OVERTIME_DURATION = 5 minutes;

    // --- NEW: ANTI-SPAM CONFIG ---
    // Mức cọc tối thiểu để tạo Challenge. 
    // Mặc định: 100,000 * 10^18 (Giả sử token 18 decimals)
    // Bạn có thể chỉnh lại ngay sau khi deploy.
    uint256 public minChallengeDeposit = 100000 * 10**18; 

    // Tỷ lệ chia thưởng (Voter Friendly)
    uint256 public winnerShare = 10;
    uint256 public loserShare = 1;
    uint256 public votersShare = 85;
    uint256 public burnShare = 2;
    uint256 public treasuryShare = 2;

    struct Challenge {
        address host;       
        address target;     
        uint256 deposit;    
        uint256 duration;   
        bool isActive;      
    }

    struct Match {
        address player1;
        address player2;
        uint256 score1;
        uint256 score2;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        bool isRefunded;         
        uint256 overtimeCount;   
        uint256 totalPool;       
        uint256 totalVotes1;     
        uint256 totalVotes2;     
        mapping(address => uint256) userVotes1; 
        mapping(address => uint256) userVotes2;
        uint256 finalizedVotersShare;
    }

    mapping(uint256 => Challenge) public challenges;
    uint256 public currentChallengeId;

    mapping(uint256 => Match) public matches;
    uint256 public currentMatchId;

    mapping(uint256 => mapping(address => bool)) public hasClaimedReward;
    mapping(address => uint256) public pendingWinnings;

    // --- EVENTS ---
    event ChallengeCreated(uint256 indexed challengeId, address indexed host, address indexed target, uint256 deposit);
    event ChallengeAccepted(uint256 indexed challengeId, address indexed challenger, uint256 matchId);
    event ChallengeCancelled(uint256 indexed challengeId);
    event MatchCreated(uint256 indexed matchId, address indexed p1, address indexed p2, uint256 endTime);
    event Voted(uint256 indexed matchId, address indexed voter, address indexed candidate, uint256 amount);
    event MatchExtended(uint256 indexed matchId, uint256 newEndTime, uint256 currentScore);
    event MatchFinalized(uint256 indexed matchId, address winner, uint256 totalPool);
    event MatchRefunded(uint256 indexed matchId, address potentialWinner, uint256 totalPool);
    event MatchForceCancelled(uint256 indexed matchId);
    event RewardClaimed(uint256 indexed matchId, address indexed voter, uint256 amount);
    event RefundClaimed(uint256 indexed matchId, address indexed voter, uint256 amount);
    event WinningsWithdrawn(address indexed receiver, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    event SharesUpdated(uint256 winner, uint256 loser, uint256 voters, uint256 burn, uint256 treasury);

    constructor(address _token, address _treasury) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");
        banMaoToken = IERC20(_token);
        treasuryAddress = _treasury;
    }

    // ==========================================
    // 1. MODULE: CHALLENGE (UPDATED)
    // ==========================================

    /**
     * @notice Admin thay đổi mức cọc tối thiểu.
     */
    function setMinChallengeDeposit(uint256 _amount) external onlyOwner {
        minChallengeDeposit = _amount;
        emit ConfigUpdated("MinChallengeDeposit", _amount);
    }

    function createChallenge(uint256 _duration, uint256 _depositAmount, address _target) external nonReentrant {
        require(_duration > 0, "Invalid duration");
        
        // --- CHECK: SPAM PROTECTION ---
        require(_depositAmount >= minChallengeDeposit, "Deposit below minimum");
        
        require(_depositAmount > 0, "Must stake something"); // Redundant but safe
        require(_target != msg.sender, "Cannot target self");

        uint256 balanceBefore = banMaoToken.balanceOf(address(this));
        banMaoToken.safeTransferFrom(msg.sender, address(this), _depositAmount);
        uint256 actualDeposit = banMaoToken.balanceOf(address(this)) - balanceBefore;

        currentChallengeId++;
        challenges[currentChallengeId] = Challenge({
            host: msg.sender,
            target: _target,
            deposit: actualDeposit,
            duration: _duration,
            isActive: true
        });

        emit ChallengeCreated(currentChallengeId, msg.sender, _target, actualDeposit);
    }

    function acceptChallenge(uint256 _challengeId) external nonReentrant {
        Challenge storage c = challenges[_challengeId];
        require(c.isActive, "Not active");
        require(msg.sender != c.host, "Cannot fight self");
        if (c.target != address(0)) {
            require(msg.sender == c.target, "Not targeted opponent");
        }

        uint256 balanceBefore = banMaoToken.balanceOf(address(this));
        banMaoToken.safeTransferFrom(msg.sender, address(this), c.deposit); 
        uint256 actualDepositB = banMaoToken.balanceOf(address(this)) - balanceBefore;

        c.isActive = false;

        currentMatchId++;
        Match storage m = matches[currentMatchId];
        m.player1 = c.host;
        m.player2 = msg.sender;
        m.startTime = block.timestamp;
        m.endTime = block.timestamp + c.duration;

        m.totalPool = c.deposit + actualDepositB;
        m.score1 = c.deposit;
        m.totalVotes1 = c.deposit;
        m.userVotes1[c.host] = c.deposit;
        m.score2 = actualDepositB;
        m.totalVotes2 = actualDepositB;
        m.userVotes2[msg.sender] = actualDepositB;

        emit MatchCreated(currentMatchId, m.player1, m.player2, m.endTime);
        emit ChallengeAccepted(_challengeId, msg.sender, currentMatchId);
    }

    function cancelChallenge(uint256 _challengeId) external nonReentrant {
        Challenge storage c = challenges[_challengeId];
        require(msg.sender == c.host, "Not host");
        require(c.isActive, "Not active");

        c.isActive = false;
        banMaoToken.safeTransfer(msg.sender, c.deposit);
        emit ChallengeCancelled(_challengeId);
    }

    // ==========================================
    // 2. ADMIN & CONFIG
    // ==========================================

    function createMatch(address _p1, address _p2, uint256 _duration) external onlyOwner {
        currentMatchId++;
        Match storage m = matches[currentMatchId];
        m.player1 = _p1;
        m.player2 = _p2;
        m.startTime = block.timestamp;
        m.endTime = block.timestamp + _duration;
        emit MatchCreated(currentMatchId, _p1, _p2, m.endTime);
    }

    function forceCancelStaleMatch(uint256 _matchId) external onlyOwner {
        Match storage m = matches[_matchId];
        require(!m.finalized, "Already finalized");
        require(block.timestamp > m.endTime + 3 days, "Match not stale");

        m.finalized = true;
        m.isRefunded = true; 
        emit MatchForceCancelled(_matchId);
        emit MatchRefunded(_matchId, address(0), m.totalPool);
    }

    function setDistributionShares(uint256 _w, uint256 _l, uint256 _v, uint256 _b, uint256 _t) external onlyOwner {
        require(_w + _l + _v + _b + _t == 100, "Total must be 100%");
        winnerShare = _w; loserShare = _l; votersShare = _v; burnShare = _b; treasuryShare = _t;
        emit SharesUpdated(_w, _l, _v, _b, _t);
    }
    
    function setOvertimeDuration(uint256 _seconds) external onlyOwner {
        require(_seconds >= MIN_OVERTIME_DURATION, "Too short");
        overtimeDuration = _seconds;
        emit ConfigUpdated("OvertimeDuration", _seconds);
    }

    // ==========================================
    // 3. CORE GAMEPLAY
    // ==========================================
    
    function vote(uint256 _matchId, address _candidate, uint256 _amount) external nonReentrant {
        Match storage m = matches[_matchId];
        require(block.timestamp < m.endTime, "Match ended");
        require(!m.finalized, "Finalized");
        require(_candidate == m.player1 || _candidate == m.player2, "Invalid candidate");
        require(_amount > 0, "Zero amount");

        uint256 balanceBefore = banMaoToken.balanceOf(address(this));
        banMaoToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 actualAmount = banMaoToken.balanceOf(address(this)) - balanceBefore;

        m.totalPool += actualAmount;
        
        if (_candidate == m.player1) {
            m.userVotes1[msg.sender] += actualAmount;
            m.totalVotes1 += actualAmount;
            m.score1 += actualAmount; 
        } else {
            m.userVotes2[msg.sender] += actualAmount;
            m.totalVotes2 += actualAmount;
            m.score2 += actualAmount;
        }
        emit Voted(_matchId, msg.sender, _candidate, actualAmount);
    }

    // ==========================================
    // 4. FINALIZE (SNAPSHOT)
    // ==========================================

    function finalizeMatch(uint256 _matchId) external nonReentrant {
        Match storage m = matches[_matchId];
        require(block.timestamp >= m.endTime, "Ongoing");
        require(!m.finalized, "Finalized");

        uint256 total = m.totalPool;
        if (total == 0) {
            m.finalized = true;
            emit MatchFinalized(_matchId, address(0), 0);
            return;
        }
        if (m.score1 == 0 || m.score2 == 0) {
            m.finalized = true;
            m.isRefunded = true;
            address pW = (m.score1 > 0) ? m.player1 : m.player2;
            emit MatchRefunded(_matchId, pW, total);
            return;
        }
        if (m.score1 == m.score2) {
            m.endTime = block.timestamp + overtimeDuration;
            m.overtimeCount++;
            emit MatchExtended(_matchId, m.endTime, m.score1);
            return;
        }

        m.finalized = true;
        m.finalizedVotersShare = votersShare;

        address winner;
        address loser;
        if (m.score1 > m.score2) { winner = m.player1; loser = m.player2; } 
        else { winner = m.player2; loser = m.player1; }

        uint256 wR = (total * winnerShare) / 100;
        uint256 lR = (total * loserShare) / 100;
        uint256 tR = (total * treasuryShare) / 100;
        uint256 bR = (total * burnShare) / 100;
        
        uint256 winVotes = (winner == m.player1) ? m.totalVotes1 : m.totalVotes2;
        if (winVotes == 0) tR += (total * votersShare) / 100;

        if (wR > 0) pendingWinnings[winner] += wR;
        if (lR > 0) pendingWinnings[loser] += lR;
        if (tR > 0) pendingWinnings[treasuryAddress] += tR;
        if (bR > 0) banMaoToken.safeTransfer(BURN_ADDRESS, bR);

        emit MatchFinalized(_matchId, winner, total);
    }

    // ==========================================
    // 5. CLAIM & WITHDRAW
    // ==========================================

    function withdrawWinnings() external nonReentrant {
        uint256 amount = pendingWinnings[msg.sender];
        require(amount > 0, "No funds");
        pendingWinnings[msg.sender] = 0;
        banMaoToken.safeTransfer(msg.sender, amount);
        emit WinningsWithdrawn(msg.sender, amount);
    }

    function claimReward(uint256 _matchId) external nonReentrant {
        Match storage m = matches[_matchId];
        require(m.finalized, "Not finalized");
        require(!hasClaimedReward[_matchId][msg.sender], "Claimed");

        uint256 payout = 0;

        if (m.isRefunded) {
            uint256 myVote = m.userVotes1[msg.sender] + m.userVotes2[msg.sender];
            require(myVote > 0, "Nothing");
            payout = myVote;
            
            hasClaimedReward[_matchId][msg.sender] = true;
            banMaoToken.safeTransfer(msg.sender, payout);
            emit RefundClaimed(_matchId, msg.sender, payout);
            return;
        }

        address winner = (m.score1 > m.score2) ? m.player1 : m.player2;
        uint256 userVotes = (winner == m.player1) ? m.userVotes1[msg.sender] : m.userVotes2[msg.sender];
        uint256 winTotal = (winner == m.player1) ? m.totalVotes1 : m.totalVotes2;

        require(userVotes > 0, "No winning vote");
        require(winTotal > 0, "Err");

        payout = (userVotes * m.totalPool * m.finalizedVotersShare) / (winTotal * 100);
        require(payout > 0, "Small");

        hasClaimedReward[_matchId][msg.sender] = true;
        banMaoToken.safeTransfer(msg.sender, payout);
        emit RewardClaimed(_matchId, msg.sender, payout);
    }
    
    function recoverStuckToken(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(banMaoToken), "Cannot withdraw staking token");
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }
}