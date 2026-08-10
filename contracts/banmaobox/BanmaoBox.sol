// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {
    BanmaoBoxRenderData,
    IBanmaoBoxRenderer
} from "./BanmaoBoxRenderer.sol";

/**
 * @title BanmaoBox
 * @notice Wrap up to five ERC-20s in transferable, time-locked ERC-721 gifts.
 * @dev Each deployment is permanently bound to one primary underlying token.
 *      Every box contains that primary token and may contain four more assets.
 *      Once the lock expires, the owner or an approved operator can open it. The
 *      underlying is always paid to the current NFT owner, never to the operator.
 *
 * Security assumptions:
 * - The underlying is expected to be a fixed-balance, non-rebasing ERC-20.
 *   Deposits must increase this contract's balance by exactly the requested
 *   amount. Payout verifies both this contract's decrease and the owner's
 *   increase by exactly the recorded amount.
 * - Token metadata is snapshotted only for display and never affects custody.
 * - The configured renderer is immutable and must support IBanmaoBoxRenderer.
 * - There is no owner/admin withdrawal path, upgradeability, or early unlock.
 */
contract BanmaoBox is ERC721Enumerable, IERC4906, ReentrancyGuard {
    using ERC165Checker for address;
    using SafeERC20 for IERC20;

    uint8 private constant MAX_SUPPORTED_TOKEN_DECIMALS = 69;
    bytes4 private constant ERC4906_INTERFACE_ID = bytes4(0x49064906);
    uint256 public constant MAX_LOCK_DURATION = 10 * 365 days;
    uint256 public constant MAX_PAGE_SIZE = 100;
    uint256 public constant MAX_ASSETS_PER_BOX = 5;

    IERC20 public immutable underlyingToken;
    IBanmaoBoxRenderer public immutable renderer;
    uint8 public immutable tokenDecimals;
    string public tokenSymbol;

    uint256 private _nextTokenId;
    uint256 public totalTokensLocked;
    mapping(address token => uint256 amount) public totalLockedByToken;

    struct BoxInfo {
        uint256 amount;
        address creator;
        uint64 createdAt;
        uint64 unlockTime;
    }

    struct BoxAsset {
        address token;
        uint256 amount;
    }

    mapping(uint256 tokenId => BoxInfo info) public boxDetails;
    mapping(uint256 tokenId => BoxAsset[] assets) private _boxAssets;

    event BoxCreated(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed recipient,
        uint256 amount,
        uint256 unlockTime
    );

    event BoxOpened(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount
    );
    event MultiTokenBoxCreated(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed recipient,
        uint256 assetCount,
        uint256 unlockTime
    );
    event BoxAssetLocked(
        uint256 indexed tokenId,
        address indexed token,
        uint256 amount
    );
    event BoxAssetReleased(
        uint256 indexed tokenId,
        address indexed token,
        address indexed owner,
        uint256 amount,
        uint256 amountReceived
    );
    event BoxAssetReleaseFailed(
        uint256 indexed tokenId,
        address indexed token,
        address indexed owner,
        uint256 amount,
        bytes reason
    );

    error ZeroAddress();
    error ZeroAmount();
    error InvalidLockDuration();
    error InvalidPageSize();
    error InvalidToken();
    error InvalidRenderer();
    error UnsupportedTokenBehavior();
    error CannotTransferToSelf();
    error UnsupportedTokenDecimals(uint8 decimals);
    error NotOwnerOrApproved();
    error BoxStillLocked(uint256 unlockTime);
    error TimestampOverflow();
    error InvalidAssetCount();
    error PrimaryTokenRequired();
    error DuplicateToken(address token);
    error OnlySelf();
    error NoAssetReleased();

    constructor(
        address tokenAddress,
        address rendererAddress
    ) ERC721("BanmaoBox", "BMAO-BOX") {
        if (tokenAddress == address(0)) revert ZeroAddress();
        if (tokenAddress.code.length == 0) revert InvalidToken();
        if (
            rendererAddress.code.length == 0 ||
            !rendererAddress.supportsInterface(
                type(IBanmaoBoxRenderer).interfaceId
            )
        ) {
            revert InvalidRenderer();
        }

        uint8 decimals;
        try IERC20Metadata(tokenAddress).decimals() returns (uint8 value) {
            decimals = value;
        } catch {
            revert InvalidToken();
        }
        if (decimals > MAX_SUPPORTED_TOKEN_DECIMALS) {
            revert UnsupportedTokenDecimals(decimals);
        }

        underlyingToken = IERC20(tokenAddress);
        renderer = IBanmaoBoxRenderer(rendererAddress);
        tokenDecimals = decimals;
        tokenSymbol = _readTokenSymbol(tokenAddress);
    }

    /**
     * @notice Creates a transferable NFT box backed by the underlying token.
     * @param to Initial recipient of the box NFT.
     * @param amount Amount to lock, in the token's smallest unit.
     * @param lockDurationSec Number of seconds from now until the box can open.
     * @return tokenId The newly minted box ID.
     *
     * The caller must approve this contract for at least `amount` first.
     */
    function createBox(
        address to,
        uint256 amount,
        uint256 lockDurationSec
    ) external nonReentrant returns (uint256 tokenId) {
        uint256 unlockTimestamp = _validateCreation(to, lockDurationSec);
        if (amount == 0) revert ZeroAmount();

        _pullExact(underlyingToken, amount);
        tokenId = _recordBox(amount, unlockTimestamp);
        _boxAssets[tokenId].push(
            BoxAsset({token: address(underlyingToken), amount: amount})
        );

        emit BoxCreated(tokenId, msg.sender, to, amount, unlockTimestamp);
        emit BoxAssetLocked(tokenId, address(underlyingToken), amount);
        _safeMint(to, tokenId);
    }

    /**
     * @notice Creates one NFT backed by 2-5 distinct ERC-20 assets.
     * @dev The first asset must be this collection's immutable primary token.
     *      Every asset must increase the contract balance by exactly its amount.
     */
    function createMultiTokenBox(
        address to,
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint256 lockDurationSec
    ) external nonReentrant returns (uint256 tokenId) {
        uint256 assetCount = tokens.length;
        if (
            assetCount < 2 ||
            assetCount > MAX_ASSETS_PER_BOX ||
            amounts.length != assetCount
        ) revert InvalidAssetCount();
        if (tokens[0] != address(underlyingToken)) revert PrimaryTokenRequired();

        uint256 unlockTimestamp = _validateCreation(to, lockDurationSec);
        tokenId = ++_nextTokenId;

        for (uint256 i; i < assetCount; ++i) {
            address tokenAddress = tokens[i];
            uint256 amount = amounts[i];
            if (tokenAddress == address(0)) revert ZeroAddress();
            if (tokenAddress.code.length == 0) revert InvalidToken();
            if (amount == 0) revert ZeroAmount();
            _validateTokenMetadata(tokenAddress);
            for (uint256 j; j < i; ++j) {
                if (tokens[j] == tokenAddress) revert DuplicateToken(tokenAddress);
            }

            _pullExact(IERC20(tokenAddress), amount);
            _boxAssets[tokenId].push(
                BoxAsset({token: tokenAddress, amount: amount})
            );
            totalLockedByToken[tokenAddress] += amount;
            emit BoxAssetLocked(tokenId, tokenAddress, amount);
        }

        boxDetails[tokenId] = BoxInfo({
            amount: amounts[0],
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            unlockTime: uint64(unlockTimestamp)
        });
        totalTokensLocked += amounts[0];

        emit BoxCreated(tokenId, msg.sender, to, amounts[0], unlockTimestamp);
        emit MultiTokenBoxCreated(
            tokenId,
            msg.sender,
            to,
            assetCount,
            unlockTimestamp
        );
        _safeMint(to, tokenId);
    }

    /**
     * @notice Releases every currently transferable asset from an unlocked box.
     * @param tokenId ID of the box to open.
     * @dev Failed assets remain in the live NFT and can be retried later. Successful
     *      assets are never rolled back because another token is paused, blacklistable,
     *      fee-charging, or otherwise incompatible. The NFT burns only when empty.
     */
    function openBox(uint256 tokenId) external nonReentrant {
        address currentOwner = ownerOf(tokenId);
        if (!_isAuthorized(currentOwner, msg.sender, tokenId)) {
            revert NotOwnerOrApproved();
        }

        BoxInfo storage box = boxDetails[tokenId];
        if (block.timestamp < uint256(box.unlockTime)) {
            revert BoxStillLocked(box.unlockTime);
        }

        uint256 released;
        uint256 i;
        while (i < _boxAssets[tokenId].length) {
            BoxAsset memory asset = _boxAssets[tokenId][i];
            try this.releaseAsset(asset.token, currentOwner, asset.amount) returns (
                uint256 amountReceived
            ) {
                totalLockedByToken[asset.token] -= asset.amount;
                if (asset.token == address(underlyingToken)) {
                    totalTokensLocked -= asset.amount;
                }
                uint256 last = _boxAssets[tokenId].length - 1;
                if (i != last) _boxAssets[tokenId][i] = _boxAssets[tokenId][last];
                _boxAssets[tokenId].pop();
                emit BoxAssetReleased(
                    tokenId,
                    asset.token,
                    currentOwner,
                    asset.amount,
                    amountReceived
                );
                unchecked {
                    ++released;
                }
            } catch (bytes memory reason) {
                emit BoxAssetReleaseFailed(
                    tokenId,
                    asset.token,
                    currentOwner,
                    asset.amount,
                    reason
                );
                unchecked {
                    ++i;
                }
            }
        }

        if (released == 0) revert NoAssetReleased();
        if (_boxAssets[tokenId].length == 0) {
            uint256 primaryAmount = box.amount;
            delete boxDetails[tokenId];
            emit BoxOpened(tokenId, currentOwner, primaryAmount);
            _burn(tokenId);
        } else {
            emit MetadataUpdate(tokenId);
        }
    }

    /** @dev Isolated payout target. It may only be reached through `openBox`. */
    function releaseAsset(
        address token,
        address to,
        uint256 amount
    ) external returns (uint256 amountReceived) {
        if (msg.sender != address(this)) revert OnlySelf();
        return _pushAvailable(IERC20(token), to, amount);
    }

    /**
     * @notice Emits an ERC-4906 refresh signal for an unlocked, live box.
     * @dev Permissionless because this function changes no box state or funds.
     *      Marketplaces may use the event to refresh time-dependent metadata.
     */
    function refreshMetadata(uint256 tokenId) external {
        _requireOwned(tokenId);
        uint256 unlockTime = uint256(boxDetails[tokenId].unlockTime);
        if (block.timestamp < unlockTime) {
            revert BoxStillLocked(unlockTime);
        }
        emit MetadataUpdate(tokenId);
    }

    /**
     * @notice Returns true when a live box can be opened.
     */
    function canOpen(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) return false;

        BoxInfo memory box = boxDetails[tokenId];
        return
            _boxAssets[tokenId].length != 0 &&
            block.timestamp >= uint256(box.unlockTime);
    }

    /**
     * @notice Returns a bounded page of live box IDs owned by `owner`.
     * @param owner Address whose boxes are queried.
     * @param offset Zero-based index of the first box to return.
     * @param limit Maximum number of IDs to return; must be 1..MAX_PAGE_SIZE.
     * @dev Returns an empty array when `offset` is at or beyond the balance.
     */
    function getBoxesByOwner(
        address owner,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory tokenIds) {
        if (limit == 0 || limit > MAX_PAGE_SIZE) revert InvalidPageSize();

        uint256 count = balanceOf(owner);
        if (offset >= count) return new uint256[](0);

        uint256 remaining = count - offset;
        uint256 pageSize = remaining < limit ? remaining : limit;
        tokenIds = new uint256[](pageSize);

        for (uint256 i; i < pageSize; ++i) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, offset + i);
        }
    }

    /** Returns all assets backing a live box (maximum five). */
    function getBoxAssets(
        uint256 tokenId
    ) external view returns (BoxAsset[] memory) {
        _requireOwned(tokenId);
        return _boxAssets[tokenId];
    }

    /** Returns the number of assets backing a live box. */
    function boxAssetCount(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _boxAssets[tokenId].length;
    }

    /**
     * @notice Fully on-chain metadata with a dynamic SVG countdown.
     * @dev Marketplaces can cache tokenURI responses. The countdown reflects
     *      the block timestamp at the time their indexer refreshes metadata.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        return renderer.tokenURI(tokenId, _renderData(tokenId));
    }

    /**
     * @notice Returns the raw on-chain SVG for integrations and previews.
     */
    function renderSVG(
        uint256 tokenId
    ) external view returns (string memory) {
        _requireOwned(tokenId);
        return renderer.renderSVG(tokenId, _renderData(tokenId));
    }

    /**
     * @notice Returns the raw metadata attributes JSON array.
     */
    function renderAttributes(
        uint256 tokenId
    ) external view returns (string memory) {
        _requireOwned(tokenId);
        return renderer.renderAttributes(_renderData(tokenId));
    }

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, IERC165) returns (bool) {
        return
            interfaceId == ERC4906_INTERFACE_ID ||
            super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address previousOwner) {
        if (to == address(this)) revert CannotTransferToSelf();
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Backwards-compatible alias for integrations built for V1.
     */
    function banmaoToken() external view returns (IERC20) {
        return underlyingToken;
    }

    /**
     * @notice Backwards-compatible alias for integrations built for V1.
     */
    function banmaoTokenDecimals() external view returns (uint8) {
        return tokenDecimals;
    }

    /**
     * @notice Backwards-compatible alias for integrations built for V1.
     */
    function totalBanmaoLocked() external view returns (uint256) {
        return totalTokensLocked;
    }

    function _validateCreation(
        address to,
        uint256 lockDurationSec
    ) internal view returns (uint256 unlockTimestamp) {
        if (to == address(0)) revert ZeroAddress();
        if (lockDurationSec == 0 || lockDurationSec > MAX_LOCK_DURATION) {
            revert InvalidLockDuration();
        }
        if (block.timestamp > type(uint64).max - lockDurationSec) {
            revert TimestampOverflow();
        }
        return block.timestamp + lockDurationSec;
    }

    function _recordBox(
        uint256 amount,
        uint256 unlockTimestamp
    ) internal returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;
        boxDetails[tokenId] = BoxInfo({
            amount: amount,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            unlockTime: uint64(unlockTimestamp)
        });
        totalTokensLocked += amount;
        totalLockedByToken[address(underlyingToken)] += amount;
    }

    function _pullExact(IERC20 token, uint256 amount) internal {
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = token.balanceOf(address(this));
        if (balanceAfter < balanceBefore || balanceAfter - balanceBefore != amount) {
            revert UnsupportedTokenBehavior();
        }
    }

    function _pushAvailable(
        IERC20 token,
        address to,
        uint256 amount
    ) internal returns (uint256 amountReceived) {
        uint256 contractBalanceBefore = token.balanceOf(address(this));
        uint256 ownerBalanceBefore = token.balanceOf(to);
        token.safeTransfer(to, amount);
        uint256 contractBalanceAfter = token.balanceOf(address(this));
        uint256 ownerBalanceAfter = token.balanceOf(to);
        if (
            contractBalanceAfter > contractBalanceBefore ||
            contractBalanceBefore - contractBalanceAfter != amount ||
            ownerBalanceAfter < ownerBalanceBefore
        ) revert UnsupportedTokenBehavior();
        return ownerBalanceAfter - ownerBalanceBefore;
    }

    function _validateTokenMetadata(address tokenAddress) internal view {
        try IERC20Metadata(tokenAddress).decimals() returns (uint8 decimals) {
            if (decimals > MAX_SUPPORTED_TOKEN_DECIMALS) {
                revert UnsupportedTokenDecimals(decimals);
            }
        } catch (bytes memory reason) {
            if (reason.length == 0) revert InvalidToken();
            assembly ("memory-safe") {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }

    function _renderData(
        uint256 tokenId
    ) internal view returns (BanmaoBoxRenderData memory) {
        BoxInfo memory box = boxDetails[tokenId];
        uint256 primaryAmount;
        BoxAsset[] storage assets = _boxAssets[tokenId];
        for (uint256 i; i < assets.length; ++i) {
            if (assets[i].token == address(underlyingToken)) {
                primaryAmount = assets[i].amount;
                break;
            }
        }
        return
            BanmaoBoxRenderData({
                token: address(underlyingToken),
                creator: box.creator,
                amount: primaryAmount,
                timestamps: (uint128(box.createdAt) << 64) |
                    uint128(box.unlockTime),
                tokenDecimals: tokenDecimals,
                assetCount: uint8(_boxAssets[tokenId].length),
                tokenSymbol: tokenSymbol
            });
    }

    function _readTokenSymbol(
        address tokenAddress
    ) internal view returns (string memory) {
        try IERC20Metadata(tokenAddress).symbol() returns (string memory value) {
            bytes memory raw = bytes(value);
            if (raw.length == 0 || raw.length > 16) return "TOKEN";

            for (uint256 i; i < raw.length; ++i) {
                bytes1 char = raw[i];
                bool allowed =
                    (char >= 0x30 && char <= 0x39) ||
                    (char >= 0x41 && char <= 0x5A) ||
                    (char >= 0x61 && char <= 0x7A) ||
                    char == 0x20 ||
                    char == 0x2D ||
                    char == 0x2E ||
                    char == 0x5F;
                if (!allowed) return "TOKEN";
            }
            return value;
        } catch {
            return "TOKEN";
        }
    }
}