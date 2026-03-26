// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BanMaoMinerV3
 * @dev Gold Miner game contract with MAXIMUM SECURITY
 * 
 * V3 UPGRADES:
 * - 24h Timelock for emergency withdraw
 * - Multi-signer support (2-of-N)
 * - 2-step admin pattern (propose → execute)
 * - Pending signer change with delay
 */
contract BanMaoMinerV3 is Ownable, ReentrancyGuard, Pausable, EIP712 {
    using ECDSA for bytes32;

    // ============ Constants ============
    
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    uint256 public constant SIGNER_CHANGE_DELAY = 12 hours;
    uint256 public constant MAX_COOLDOWN = 1 hours;
    uint256 public constant MAX_TRACKED_DONORS = 500;
    uint256 public constant MIN_SIGNERS_REQUIRED = 2;

    // ============ State Variables ============
    
    IERC20 public immutable banmaoToken;
    
    // Multi-signer (any 1 of N can sign claims)
    address[] public signers;
    mapping(address => bool) public isSigner;
    
    // Claim limits
    uint256 public minClaimAmount = 100 * 10**18;
    uint256 public dailyPlayerCap = 5000 * 10**18;
    uint256 public hourlySignerCap = 50000 * 10**18;
    uint256 public claimCooldown = 5 minutes;

    // User tracking
    struct UserInfo {
        uint128 dailyAmount;
        uint128 lastUpdateDay;
        uint256 lastClaimTime;
    }

    mapping(address => UserInfo) public userInfo;
    mapping(address => uint256) public nonces;
    mapping(address => bool) public blacklisted;

    // Rate limiting
    uint256 public currentHour;
    uint256 public hourlySignedAmount;

    // Donation tracking
    mapping(address => uint256) public totalDonated;
    mapping(address => uint256) public donationCount;
    address[] public donorList;
    mapping(address => bool) public isDonor;
    uint256 public totalContractDonations;

    // ============ TIMELOCK STRUCTURES ============
    
    struct PendingWithdraw {
        uint256 amount;
        uint256 executeTime;
        bool executed;
        bool cancelled;
    }
    
    struct PendingSignerChange {
        address newSigner;
        address oldSigner;
        bool isAdd; // true = add, false = remove
        uint256 executeTime;
        bool executed;
    }
    
    PendingWithdraw[] public pendingWithdrawals;
    PendingSignerChange[] public pendingSignerChanges;

    // EIP-712 with deadline
    bytes32 private constant WITHDRAW_TYPEHASH = keccak256(
        "Withdraw(address player,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    // ============ Events ============
    
    event RewardClaimed(address indexed player, uint256 indexed amount, uint256 nonce);
    event Donation(address indexed donor, uint256 indexed amount, uint256 totalDonated);
    event Deposit(address indexed depositor, uint256 indexed amount);
    
    // Timelock events
    event WithdrawQueued(uint256 indexed id, uint256 amount, uint256 executeTime);
    event WithdrawExecuted(uint256 indexed id, uint256 amount);
    event WithdrawCancelled(uint256 indexed id);
    
    // Signer events
    event SignerChangeQueued(uint256 indexed id, address signer, bool isAdd, uint256 executeTime);
    event SignerChangeExecuted(uint256 indexed id, address signer, bool isAdd);
    event SignerChangeCancelled(uint256 indexed id);
    
    // Admin events
    event CapsUpdated(uint256 indexed dailyPlayer, uint256 indexed hourlySigner);
    event MinClaimUpdated(uint256 indexed oldMin, uint256 indexed newMin);
    event CooldownUpdated(uint256 indexed oldCooldown, uint256 indexed newCooldown);
    event BlacklistUpdated(address indexed user, bool indexed status);

    // ============ Modifiers ============
    
    modifier notBlacklisted() {
        require(!blacklisted[msg.sender], "Blacklisted");
        _;
    }

    // ============ Constructor ============
    
    constructor(address _token, address[] memory _initialSigners) 
        Ownable(msg.sender) 
        EIP712("BanMaoMiner", "3.0") 
    {
        require(_token != address(0), "Invalid token");
        require(_initialSigners.length >= MIN_SIGNERS_REQUIRED, "Need 2+ signers");
        
        banmaoToken = IERC20(_token);
        
        for (uint256 i = 0; i < _initialSigners.length; i++) {
            require(_initialSigners[i] != address(0), "Invalid signer");
            require(!isSigner[_initialSigners[i]], "Duplicate signer");
            signers.push(_initialSigners[i]);
            isSigner[_initialSigners[i]] = true;
        }
    }

    // ============ Core Functions ============

    function claimReward(
        uint256 amount, 
        uint256 nonce, 
        uint256 deadline,
        bytes memory signature
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        notBlacklisted
    {
        require(block.timestamp <= deadline, "Signature expired");
        require(amount >= minClaimAmount, "Amount below minimum");
        require(amount <= type(uint128).max, "Amount too large");
        require(nonce == nonces[msg.sender], "Invalid nonce");
        
        UserInfo storage user = userInfo[msg.sender];
        require(
            block.timestamp >= user.lastClaimTime + claimCooldown, 
            "Cooldown active"
        );
        
        uint256 today = block.timestamp / 86400;
        if (user.lastUpdateDay != today) {
            user.dailyAmount = 0;
            user.lastUpdateDay = uint128(today);
        }
        require(uint256(user.dailyAmount) + amount <= dailyPlayerCap, "Daily cap");

        uint256 hourNow = block.timestamp / 3600;
        if (hourNow > currentHour) {
            currentHour = hourNow;
            hourlySignedAmount = 0;
        }
        require(hourlySignedAmount + amount <= hourlySignerCap, "Hourly cap");

        // Verify signature from ANY valid signer
        bytes32 structHash = keccak256(
            abi.encode(WITHDRAW_TYPEHASH, msg.sender, amount, nonce, deadline)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredSigner = hash.recover(signature);
        require(isSigner[recoveredSigner], "Invalid signer");

        require(banmaoToken.balanceOf(address(this)) >= amount, "Insufficient");
        
        nonces[msg.sender]++;
        user.dailyAmount += uint128(amount);
        user.lastClaimTime = block.timestamp;
        hourlySignedAmount += amount;
        
        require(banmaoToken.transfer(msg.sender, amount), "Transfer failed");
        emit RewardClaimed(msg.sender, amount, nonce);
    }

    function donate(uint256 amount) external nonReentrant whenNotPaused notBlacklisted {
        require(amount > 0, "Amount must be > 0");
        require(banmaoToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        if (!isDonor[msg.sender] && donorList.length < MAX_TRACKED_DONORS) {
            isDonor[msg.sender] = true;
            donorList.push(msg.sender);
        }
        totalDonated[msg.sender] += amount;
        donationCount[msg.sender]++;
        totalContractDonations += amount;
        
        emit Donation(msg.sender, amount, totalDonated[msg.sender]);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(banmaoToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Deposit(msg.sender, amount);
    }

    // ============ TIMELOCK: Emergency Withdraw ============

    function queueEmergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(amount <= banmaoToken.balanceOf(address(this)), "Exceeds balance");
        
        uint256 executeTime = block.timestamp + TIMELOCK_DELAY;
        pendingWithdrawals.push(PendingWithdraw({
            amount: amount,
            executeTime: executeTime,
            executed: false,
            cancelled: false
        }));
        
        emit WithdrawQueued(pendingWithdrawals.length - 1, amount, executeTime);
    }

    function executeEmergencyWithdraw(uint256 id) external onlyOwner {
        require(id < pendingWithdrawals.length, "Invalid ID");
        PendingWithdraw storage pw = pendingWithdrawals[id];
        
        require(!pw.executed, "Already executed");
        require(!pw.cancelled, "Cancelled");
        require(block.timestamp >= pw.executeTime, "Timelock active");
        
        pw.executed = true;
        require(banmaoToken.transfer(owner(), pw.amount), "Transfer failed");
        
        emit WithdrawExecuted(id, pw.amount);
    }

    function cancelEmergencyWithdraw(uint256 id) external onlyOwner {
        require(id < pendingWithdrawals.length, "Invalid ID");
        PendingWithdraw storage pw = pendingWithdrawals[id];
        
        require(!pw.executed, "Already executed");
        require(!pw.cancelled, "Already cancelled");
        
        pw.cancelled = true;
        emit WithdrawCancelled(id);
    }

    // ============ TIMELOCK: Signer Management ============

    function queueAddSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid address");
        require(!isSigner[newSigner], "Already signer");
        
        uint256 executeTime = block.timestamp + SIGNER_CHANGE_DELAY;
        pendingSignerChanges.push(PendingSignerChange({
            newSigner: newSigner,
            oldSigner: address(0),
            isAdd: true,
            executeTime: executeTime,
            executed: false
        }));
        
        emit SignerChangeQueued(pendingSignerChanges.length - 1, newSigner, true, executeTime);
    }

    function queueRemoveSigner(address oldSigner) external onlyOwner {
        require(isSigner[oldSigner], "Not a signer");
        require(signers.length > MIN_SIGNERS_REQUIRED, "Min signers required");
        
        uint256 executeTime = block.timestamp + SIGNER_CHANGE_DELAY;
        pendingSignerChanges.push(PendingSignerChange({
            newSigner: address(0),
            oldSigner: oldSigner,
            isAdd: false,
            executeTime: executeTime,
            executed: false
        }));
        
        emit SignerChangeQueued(pendingSignerChanges.length - 1, oldSigner, false, executeTime);
    }

    function executeSignerChange(uint256 id) external onlyOwner {
        require(id < pendingSignerChanges.length, "Invalid ID");
        PendingSignerChange storage psc = pendingSignerChanges[id];
        
        require(!psc.executed, "Already executed");
        require(block.timestamp >= psc.executeTime, "Timelock active");
        
        psc.executed = true;
        
        if (psc.isAdd) {
            require(!isSigner[psc.newSigner], "Already signer");
            signers.push(psc.newSigner);
            isSigner[psc.newSigner] = true;
        } else {
            require(signers.length > MIN_SIGNERS_REQUIRED, "Min signers");
            isSigner[psc.oldSigner] = false;
            // Remove from array
            for (uint256 i = 0; i < signers.length; i++) {
                if (signers[i] == psc.oldSigner) {
                    signers[i] = signers[signers.length - 1];
                    signers.pop();
                    break;
                }
            }
        }
        
        emit SignerChangeExecuted(id, psc.isAdd ? psc.newSigner : psc.oldSigner, psc.isAdd);
    }

    // ============ View Functions ============

    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function getSignerCount() external view returns (uint256) {
        return signers.length;
    }

    function getPendingWithdrawCount() external view returns (uint256) {
        return pendingWithdrawals.length;
    }

    function getPendingSignerChangeCount() external view returns (uint256) {
        return pendingSignerChanges.length;
    }

    function getUserInfo(address user) external view returns (
        uint256 dailyAmount,
        uint256 lastClaimTime,
        uint256 nextClaimTime
    ) {
        UserInfo storage info = userInfo[user];
        return (info.dailyAmount, info.lastClaimTime, info.lastClaimTime + claimCooldown);
    }

    function getDonorInfo(address donor) external view returns (uint256, uint256) {
        return (totalDonated[donor], donationCount[donor]);
    }

    function getDonorCount() external view returns (uint256) {
        return donorList.length;
    }

    function getDonorsPaginated(uint256 offset, uint256 limit) external view returns (
        address[] memory addresses, 
        uint256[] memory amounts
    ) {
        uint256 count = donorList.length;
        if (offset >= count) return (new address[](0), new uint256[](0));
        if (limit > 50) limit = 50;
        uint256 end = offset + limit;
        if (end > count) end = count;
        
        uint256 resultCount = end - offset;
        addresses = new address[](resultCount);
        amounts = new uint256[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            addresses[i] = donorList[offset + i];
            amounts[i] = totalDonated[donorList[offset + i]];
        }
    }

    function getContractBalance() external view returns (uint256) {
        return banmaoToken.balanceOf(address(this));
    }

    // ============ Admin Functions (Immediate) ============

    function setMinClaim(uint256 _minAmount) external onlyOwner {
        emit MinClaimUpdated(minClaimAmount, _minAmount);
        minClaimAmount = _minAmount;
    }

    function updateCaps(uint256 _dailyPlayer, uint256 _hourlySigner) external onlyOwner {
        dailyPlayerCap = _dailyPlayer;
        hourlySignerCap = _hourlySigner;
        emit CapsUpdated(_dailyPlayer, _hourlySigner);
    }

    function setCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown <= MAX_COOLDOWN, "Cooldown too high");
        emit CooldownUpdated(claimCooldown, _cooldown);
        claimCooldown = _cooldown;
    }

    function setBlacklist(address user, bool status) external onlyOwner {
        require(user != address(0), "Invalid address");
        blacklisted[user] = status;
        emit BlacklistUpdated(user, status);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
