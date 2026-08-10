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
 * @notice Wrap one ERC-20 in transferable, time-locked ERC-721 gift boxes.
 * @dev Each deployment is permanently bound to one underlying token. Once the
 *      lock expires, the owner or an ERC-721 approved operator can open it. The
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

    IERC20 public immutable underlyingToken;
    IBanmaoBoxRenderer public immutable renderer;
    uint8 public immutable tokenDecimals;
    string public tokenSymbol;

    uint256 private _nextTokenId;
    uint256 public totalTokensLocked;

    struct BoxInfo {
        uint256 amount;
        uint64 createdAt;
        uint64 unlockTime;
    }

    mapping(uint256 tokenId => BoxInfo info) public boxDetails;

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
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (
            lockDurationSec == 0 || lockDurationSec > MAX_LOCK_DURATION
        ) {
            revert InvalidLockDuration();
        }
        if (block.timestamp > type(uint64).max - lockDurationSec) {
            revert TimestampOverflow();
        }
        uint256 unlockTimestamp = block.timestamp + lockDurationSec;

        // Reject immediate transfer discrepancies so each new NFT is backed.
        uint256 balanceBefore = underlyingToken.balanceOf(address(this));
        underlyingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = underlyingToken.balanceOf(address(this));
        if (
            balanceAfter < balanceBefore ||
            balanceAfter - balanceBefore != amount
        ) {
            revert UnsupportedTokenBehavior();
        }

        tokenId = ++_nextTokenId;
        boxDetails[tokenId] = BoxInfo({
            amount: amount,
            createdAt: uint64(block.timestamp),
            unlockTime: uint64(unlockTimestamp)
        });
        totalTokensLocked += amount;

        // Emit before _safeMint because a contract recipient invokes the
        // external onERC721Received hook during _safeMint.
        emit BoxCreated(
            tokenId,
            msg.sender,
            to,
            amount,
            unlockTimestamp
        );

        _safeMint(to, tokenId);
    }

    /**
     * @notice Opens an unlocked box and pays its current NFT owner.
     * @param tokenId ID of the box to open.
     * @dev The owner, token-approved account, or approved-for-all operator may
     *      submit this transaction. The underlying always goes to `currentOwner`.
     */
    function openBox(uint256 tokenId) external nonReentrant {
        address currentOwner = ownerOf(tokenId);
        if (!_isAuthorized(currentOwner, msg.sender, tokenId)) {
            revert NotOwnerOrApproved();
        }

        BoxInfo memory box = boxDetails[tokenId];
        if (block.timestamp < uint256(box.unlockTime)) {
            revert BoxStillLocked(box.unlockTime);
        }

        uint256 amountToClaim = box.amount;

        // Effects: remove every box storage slot and update backing accounting.
        delete boxDetails[tokenId];
        totalTokensLocked -= amountToClaim;

        // Emit before interactions. Any later revert rolls this event back too.
        emit BoxOpened(tokenId, currentOwner, amountToClaim);

        _burn(tokenId);

        uint256 contractBalanceBefore = underlyingToken.balanceOf(address(this));
        uint256 ownerBalanceBefore = underlyingToken.balanceOf(currentOwner);
        underlyingToken.safeTransfer(currentOwner, amountToClaim);
        uint256 contractBalanceAfter = underlyingToken.balanceOf(address(this));
        uint256 ownerBalanceAfter = underlyingToken.balanceOf(currentOwner);
        if (
            contractBalanceBefore - contractBalanceAfter != amountToClaim ||
            ownerBalanceAfter < ownerBalanceBefore ||
            ownerBalanceAfter - ownerBalanceBefore != amountToClaim
        ) {
            revert UnsupportedTokenBehavior();
        }
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
            box.amount != 0 &&
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

    function _renderData(
        uint256 tokenId
    ) internal view returns (BanmaoBoxRenderData memory) {
        BoxInfo memory box = boxDetails[tokenId];
        return
            BanmaoBoxRenderData({
                token: address(underlyingToken),
                amount: box.amount,
                createdAt: box.createdAt,
                unlockTime: box.unlockTime,
                tokenDecimals: tokenDecimals,
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