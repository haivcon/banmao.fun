// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;


import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BanmaoKingTraits, IBanmaoKingRenderer} from "../IBanmaoKingRenderer.sol";

/// @notice Immutable-config ERC-721 for fully on-chain Hybrid Compose artwork.
/// @dev The seed is public and deterministic; it is not a claim of unbiasable randomness.
/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
contract BanmaoKingNFT is ERC721, ERC2981, IERC4906, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ERC165Checker for address;

    error ZeroAddress();
    error InvalidSupply();
    error InvalidRenderer(address renderer);
    error InvalidPaymentConfiguration();
    error UnsupportedPaymentToken(address token);
    error IncorrectNativePayment(uint256 expected, uint256 actual);
    error NativeTransferFailed();
    error InexactERC20Payment(uint256 expected, uint256 actual);
    error SoldOut();
    error InvalidQuantity();
    error EmptyRecipients();
    error ExceedsMaxSupply();

    uint256 public constant MAX_BATCH_SIZE = 50;

    event KingMinted(
        address indexed payer,
        address indexed to,
        uint256 indexed tokenId,
        address paymentToken,
        uint256 price,
        uint32 packedTraits
    );

    IBanmaoKingRenderer public immutable renderer;
    address payable public immutable treasury;
    uint256 public immutable maxSupply;
    bytes32 public immutable collectionSeed;

    // Each four-layer combination can be issued only once in this collection.
    uint256 public constant TOTAL_COMBINATIONS = 15 * 21 * 25 * 17;
    // Sparse Fisher-Yates pool; zero means the slot still contains its own index.
    mapping(uint256 slot => uint256 valuePlusOne) private _traitPool;
    uint256 public totalSupply;
    mapping(address paymentToken => uint256 price) public mintPrice;
    mapping(address paymentToken => bool accepted) public isPaymentToken;
    mapping(uint256 tokenId => uint32 packedTraits) private _tokenTraits;

    constructor(
        address renderer_,
        address payable treasury_,
        uint256 maxSupply_,
        uint256 nativePrice_,
        address[] memory paymentTokens_,
        uint256[] memory paymentPrices_,
        address royaltyReceiver_,
        uint96 royaltyFeeNumerator_,
        bytes32 collectionSeed_
    ) ERC721("Banmao King", "banmao-KING") {
        if (treasury_ == address(0) || royaltyReceiver_ == address(0)) revert ZeroAddress();
        if (maxSupply_ == 0 || maxSupply_ > TOTAL_COMBINATIONS) revert InvalidSupply();
        if (!renderer_.supportsInterface(type(IBanmaoKingRenderer).interfaceId)) revert InvalidRenderer(renderer_);
        if (paymentTokens_.length != paymentPrices_.length || (nativePrice_ == 0 && paymentTokens_.length == 0)) {
            revert InvalidPaymentConfiguration();
        }

        renderer = IBanmaoKingRenderer(renderer_);
        treasury = treasury_;
        maxSupply = maxSupply_;
        collectionSeed = collectionSeed_;
        // Zero disables native minting; it never enables free minting.
        isPaymentToken[address(0)] = nativePrice_ > 0;
        mintPrice[address(0)] = nativePrice_;

        for (uint256 i; i < paymentTokens_.length; ++i) {
            address token = paymentTokens_[i];
            uint256 price = paymentPrices_[i];
            if (token == address(0) || token.code.length == 0 || price == 0 || isPaymentToken[token]) {
                revert InvalidPaymentConfiguration();
            }
            isPaymentToken[token] = true;
            mintPrice[token] = price;
        }
        _setDefaultRoyalty(royaltyReceiver_, royaltyFeeNumerator_);
    }

    function mint(address to, address paymentToken) external payable nonReentrant returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (!isPaymentToken[paymentToken]) revert UnsupportedPaymentToken(paymentToken);
        if (totalSupply == maxSupply) revert SoldOut();

        uint256 price = mintPrice[paymentToken];
        tokenId = totalSupply + 1;
        uint32 packed = _deriveTraits(tokenId);
        totalSupply = tokenId;
        _tokenTraits[tokenId] = packed;

        _processPayment(paymentToken, price);

        _safeMint(to, tokenId);
        emit KingMinted(msg.sender, to, tokenId, paymentToken, price, packed);
        emit MetadataUpdate(tokenId);
    }

    /// @notice Mint quantity NFTs to one recipient; the caller pays for all tokens.
    function mintBatch(address to, address paymentToken, uint256 quantity)
        external payable nonReentrant returns (uint256 firstTokenId)
    {
        if (to == address(0)) revert ZeroAddress();
        _validateBatch(paymentToken, quantity);
        firstTokenId = totalSupply + 1;
        _processPayment(paymentToken, mintPrice[paymentToken] * quantity);
        for (uint256 i; i < quantity; ++i) _mintOne(to, paymentToken);
        emit BatchMinted(msg.sender, paymentToken, firstTokenId, quantity, mintPrice[paymentToken] * quantity);
    }

    /// @notice Mint one NFT per entry. Repeat addresses to give a wallet multiple NFTs.
    /// @dev Atomic: any invalid recipient, payment or receiver callback reverts the entire batch.
    function mintBatchMulti(address[] calldata recipients, address paymentToken)
        external payable nonReentrant returns (uint256 firstTokenId)
    {
        uint256 quantity = recipients.length;
        if (quantity == 0) revert EmptyRecipients();
        _validateBatch(paymentToken, quantity);
        for (uint256 i; i < quantity; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
        }
        firstTokenId = totalSupply + 1;
        _processPayment(paymentToken, mintPrice[paymentToken] * quantity);
        for (uint256 i; i < quantity; ++i) _mintOne(recipients[i], paymentToken);
        emit BatchMinted(msg.sender, paymentToken, firstTokenId, quantity, mintPrice[paymentToken] * quantity);
    }

    event BatchMinted(address indexed payer, address indexed paymentToken, uint256 firstTokenId, uint256 quantity, uint256 totalPaid);
    error InvalidRecipients();

    /// @notice Mint a positive quantity per recipient, paid entirely by the caller.
    /// @dev Duplicate recipients are allowed. Any failure rolls back the entire batch.
    function mintBatchTo(address[] calldata recipients, uint256[] calldata quantities, address paymentToken)
        external payable nonReentrant returns (uint256 firstTokenId)
    {
        if (recipients.length == 0) revert EmptyRecipients();
        if (recipients.length != quantities.length || recipients.length > MAX_BATCH_SIZE) revert InvalidRecipients();
        uint256 quantity;
        for (uint256 i; i < recipients.length; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (quantities[i] == 0 || quantities[i] > MAX_BATCH_SIZE - quantity) revert InvalidQuantity();
            quantity += quantities[i];
        }
        _validateBatch(paymentToken, quantity);
        firstTokenId = totalSupply + 1;
        uint256 totalPaid = mintPrice[paymentToken] * quantity;
        _processPayment(paymentToken, totalPaid);
        for (uint256 i; i < recipients.length; ++i) {
            for (uint256 j; j < quantities[i]; ++j) _mintOne(recipients[i], paymentToken);
        }
        emit BatchMinted(msg.sender, paymentToken, firstTokenId, quantity, totalPaid);
    }

    function _validateBatch(address paymentToken, uint256 quantity) private view {
        if (quantity == 0 || quantity > MAX_BATCH_SIZE) revert InvalidQuantity();
        if (!isPaymentToken[paymentToken]) revert UnsupportedPaymentToken(paymentToken);
        if (totalSupply == maxSupply) revert SoldOut();
        if (quantity > maxSupply - totalSupply) revert ExceedsMaxSupply();
    }

    function _mintOne(address to, address paymentToken) private {
        uint256 tokenId = totalSupply + 1;
        uint32 packed = _deriveTraits(tokenId);
        totalSupply = tokenId;
        _tokenTraits[tokenId] = packed;
        _safeMint(to, tokenId);
        emit KingMinted(msg.sender, to, tokenId, paymentToken, mintPrice[paymentToken], packed);
        emit MetadataUpdate(tokenId);
    }

    function _processPayment(address paymentToken, uint256 price) private {
        if (paymentToken == address(0)) {
            if (msg.value != price) revert IncorrectNativePayment(price, msg.value);
            (bool sent,) = treasury.call{value: price}("");
            if (!sent) revert NativeTransferFailed();
        } else {
            if (msg.value != 0) revert IncorrectNativePayment(0, msg.value);
            IERC20 token = IERC20(paymentToken);
            uint256 beforeBalance = token.balanceOf(treasury);
            token.safeTransferFrom(msg.sender, treasury, price);
            uint256 afterBalance = token.balanceOf(treasury);
            uint256 received = afterBalance >= beforeBalance ? afterBalance - beforeBalance : 0;
            if (received != price) revert InexactERC20Payment(price, received);
        }

    }

    /// @notice Emits an ERC-4906 refresh signal for an existing token.
    /// @dev Permissionless; changes no metadata, ownership or funds.
    ///      Marketplaces may use the event to retry a cached metadata fetch.
    function refreshMetadata(uint256 tokenId) external {
        _requireOwned(tokenId);
        emit MetadataUpdate(tokenId);
    }

    function traits(uint256 tokenId) public view returns (BanmaoKingTraits memory) {
        _requireOwned(tokenId);
        return _unpackTraits(_tokenTraits[tokenId]);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return renderer.tokenURI(tokenId, _unpackTraits(_tokenTraits[tokenId]));
    }

    function renderSVG(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return renderer.renderSVG(tokenId, _unpackTraits(_tokenTraits[tokenId]));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981, IERC165) returns (bool) {
        return interfaceId == 0x49064906 || super.supportsInterface(interfaceId);
    }

    function _deriveTraits(uint256 tokenId) private returns (uint32) {
        // Draw without replacement in O(1), including the final mint. Public,
        // deterministic entropy: this prevents duplicates, not trait sniping.
        uint256 remaining = TOTAL_COMBINATIONS - totalSupply;
        uint256 slot = uint256(keccak256(abi.encodePacked(collectionSeed, tokenId))) % remaining;
        uint256 stored = _traitPool[slot];
        uint256 combination = stored == 0 ? slot : stored - 1;
        uint256 last = remaining - 1;
        if (slot != last) {
            uint256 lastStored = _traitPool[last];
            _traitPool[slot] = lastStored == 0 ? last + 1 : lastStored;
        }
        delete _traitPool[last];

        uint32 packed = uint32(combination % 15);
        combination /= 15;
        packed |= uint32(combination % 21) << 8;
        combination /= 21;
        uint32 accessory = uint32(combination % 25) + 1;
        packed |= accessory << 16;
        combination /= 25;
        return packed | (uint32(combination) << 24);
    }

    function _unpackTraits(uint32 packed) private pure returns (BanmaoKingTraits memory) {
        return BanmaoKingTraits({
            body: uint8(packed),
            expression: uint8(packed >> 8),
            accessory: uint8(packed >> 16),
            background: uint8(packed >> 24)
        });
    }
}
