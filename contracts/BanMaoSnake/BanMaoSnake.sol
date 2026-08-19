// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract BanMaoSnake is Ownable, ReentrancyGuard, Pausable, EIP712 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    IERC20 public immutable banmaoToken;
    address public signerAddress;

    // --- Custom Errors ---
    error InvalidAddress();
    error InvalidAmount();
    error AmountBelowMin();
    error AmountExceedsGameLimit();
    error InvalidNonce();
    error DailyCapExceeded();
    error HourlyCapExceeded();
    error InvalidSignature();
    error SignatureExpired(); // Lỗi khi chữ ký hết hạn

    // --- Cấu hình ---
    uint256 public minClaimAmount = 100 * 10**18;
    uint256 public dailyPlayerCap = 5000 * 10**18;
    uint256 public hourlySignerCap = 50000 * 10**18;
    uint256 public maxClaimPerGame = 2000 * 10**18;
    
    // Cấu hình Donation
    uint256 public minDonationForListing = 10 * 10**18;

    struct UserWithdrawal {
        uint128 dailyAmount;
        uint128 lastUpdateDay;
    }

    mapping(address => UserWithdrawal) public userWithdrawals;
    mapping(address => uint256) public nonces;

    uint256 public currentHour;
    uint256 public hourlySignedAmount;

    // TypeHash bao gồm cả 'deadline'
    bytes32 private constant WITHDRAW_TYPEHASH = keccak256("Withdraw(address player,uint256 amount,uint256 nonce,uint256 deadline)");

    // Donation tracking
    mapping(address => uint256) public donatedAmount;
    address[] public donors;
    mapping(address => bool) private isDonor;
    uint256 public totalDonatedAmount;

    event RewardClaimed(address indexed player, uint256 amount, uint256 nonce);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    event Donated(address indexed donor, uint256 amount);
    event DonorListed(address indexed donor);

    constructor(address _token, address _signer) 
        Ownable(msg.sender) 
        EIP712("BanMaoSnake", "1.0") 
    {
        if (_signer == address(0)) revert InvalidAddress();
        banmaoToken = IERC20(_token);
        signerAddress = _signer;
    }

    /**
     * @notice Hàm rút thưởng có deadline
     * @param deadline Thời gian (timestamp) mà chữ ký sẽ hết hạn. Backend cần set giá trị này.
     */
    function claimReward(uint256 amount, uint256 nonce, uint256 deadline, bytes memory signature) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        // 1. Kiểm tra hạn sử dụng chữ ký
        if (block.timestamp > deadline) revert SignatureExpired();

        if (amount < minClaimAmount) revert AmountBelowMin();
        if (amount > maxClaimPerGame) revert AmountExceedsGameLimit();
        if (nonce != nonces[msg.sender]) revert InvalidNonce();
        
        uint256 today = block.timestamp / 86400;
        UserWithdrawal storage uw = userWithdrawals[msg.sender];
        
        if (uw.lastUpdateDay != today) {
            uw.dailyAmount = 0;
            uw.lastUpdateDay = uint128(today);
        }
        
        if (uint256(uw.dailyAmount) + amount > dailyPlayerCap) revert DailyCapExceeded();

        uint256 hourNow = block.timestamp / 3600;
        if (hourNow > currentHour) {
            currentHour = hourNow;
            hourlySignedAmount = 0;
        }
        
        if (hourlySignedAmount + amount > hourlySignerCap) revert HourlyCapExceeded();

        // 2. Hash bao gồm deadline
        bytes32 structHash = keccak256(abi.encode(WITHDRAW_TYPEHASH, msg.sender, amount, nonce, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        
        if (hash.recover(signature) != signerAddress) revert InvalidSignature();

        nonces[msg.sender]++;
        uw.dailyAmount += uint128(amount);
        hourlySignedAmount += amount;
        
        banmaoToken.safeTransfer(msg.sender, amount);
        
        emit RewardClaimed(msg.sender, amount, nonce);
    }

    function donate(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        banmaoToken.safeTransferFrom(msg.sender, address(this), amount);

        donatedAmount[msg.sender] += amount;
        totalDonatedAmount += amount;

        if (!isDonor[msg.sender] && donatedAmount[msg.sender] >= minDonationForListing) {
            isDonor[msg.sender] = true;
            donors.push(msg.sender);
            emit DonorListed(msg.sender);
        }

        emit Donated(msg.sender, amount);
    }

    // ========== ADMIN FUNCTIONS ==========

    function setMinClaim(uint256 _minAmount) external onlyOwner { minClaimAmount = _minAmount; }
    
    function setSigner(address _newSigner) external onlyOwner { 
        if (_newSigner == address(0)) revert InvalidAddress();
        signerAddress = _newSigner; 
    }
    
    function updateCaps(uint256 _dailyPlayer, uint256 _hourlySigner) external onlyOwner {
        dailyPlayerCap = _dailyPlayer;
        hourlySignerCap = _hourlySigner;
    }

    function setMaxClaimPerGame(uint256 _maxClaim) external onlyOwner {
        if (_maxClaim == 0) revert InvalidAmount();
        maxClaimPerGame = _maxClaim;
    }

    function setMinDonationForListing(uint256 _minDonation) external onlyOwner {
        minDonationForListing = _minDonation;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // 🔒 CHỈ rút được banmaoToken (như phiên bản cũ)
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        banmaoToken.safeTransfer(to, amount);
        emit EmergencyWithdraw(to, amount);
    }

    // ========== VIEW FUNCTIONS ==========

    function getTotalDonors() external view returns (uint256) {
        return donors.length;
    }

    function getDonorsPage(uint256 offset, uint256 limit)
        external view
        returns (address[] memory addrs, uint256[] memory amounts)
    {
        uint256 total = donors.length;
        if (offset >= total) {
            return (new address[](0), new uint256[](0));
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        addrs = new address[](count);
        amounts = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            addrs[i] = donors[offset + i];
            amounts[i] = donatedAmount[donors[offset + i]];
        }
    }
}