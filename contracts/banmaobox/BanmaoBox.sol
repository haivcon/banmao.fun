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
    IBanmaoBoxRenderer,
    IBanmaoBoxSVGRenderer
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
 * - The full metadata renderer is replaceable by the immutable renderer admin.
 *   It receives bounded read-only data and has no custody authority.
 * - There is no admin withdrawal path, proxy upgradeability, or early unlock.
 */
contract BanmaoBox is ERC721Enumerable, IERC4906, ReentrancyGuard {
    using ERC165Checker for address;
    using SafeERC20 for IERC20;


    uint8 private constant MAX_SUPPORTED_TOKEN_DECIMALS = 69;
    bytes4 private constant ERC4906_INTERFACE_ID = bytes4(0x49064906);
    uint256 public constant MAX_LOCK_DURATION = 100 * 365 days;
    uint256 public constant MAX_PAGE_SIZE = 100;
    uint256 public constant MAX_ASSETS_PER_BOX = 5;
    uint256 public constant MAX_BATCH_SIZE = 20;
    uint256 public constant BATCH_RELEASE_GAS_LIMIT = 500_000;
    uint256 public constant MAX_FAILURE_REASON_BYTES = 256;
    uint256 private constant BATCH_RELEASE_GAS_RESERVE = 100_000;

    IERC20 public immutable underlyingToken;
    IBanmaoBoxRenderer public renderer;
    address public immutable rendererAdmin;
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
        uint8 decimals;
        bytes16 symbol;
    }

    mapping(uint256 tokenId => BoxInfo info) public boxDetails;
    mapping(uint256 tokenId => BoxAsset[] assets) private _boxAssets;
    mapping(uint256 tokenId => bool opening) private _opening;
    mapping(address owner => mapping(address token => uint256 amount))
        public recoverableAbandoned;

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
    event BoxAssetAbandoned(
        uint256 indexed tokenId,
        address indexed token,
        address indexed owner,
        uint256 amount
    );
    event AbandonedAssetClaimed(
        address indexed owner,
        address indexed token,
        uint256 amount,
        uint256 amountReceived
    );
    event RendererUpdated(
        address indexed previousRenderer,
        address indexed newRenderer
    );

    error ZeroAddress();
    error ZeroAmount();
    error InvalidLockDuration();
    error InvalidBatchSize();
    error BatchLengthMismatch();
    error InvalidPageSize();
    error InvalidToken();
    error InvalidRenderer();
    error UnsupportedTokenBehavior();
    error CannotTransferToSelf();
    error UnsupportedTokenDecimals(uint8 decimals);
    error NotOwnerOrApproved();
    error NotTokenOwner();
    error AssetStateMismatch(
        address expectedToken,
        uint256 expectedAmount,
        address actualToken,
        uint256 actualAmount
    );
    error BoxStillLocked(uint256 unlockTime);
    error TimestampOverflow();
    error InvalidAssetCount();
    error PrimaryTokenRequired();
    error DuplicateToken(address token);
    error OnlySelf();
    error InvalidAssetIndex();
    error TransferWhileOpening(uint256 tokenId);
    error NotRendererAdmin();

    constructor(
        address tokenAddress,
        address rendererAddress,
        address rendererAdminAddress
    ) ERC721("BanmaoBox", "BMAO-BOX") {
        if (
            tokenAddress == address(0) ||
            rendererAdminAddress == address(0)
        ) revert ZeroAddress();
        if (tokenAddress.code.length == 0) revert InvalidToken();
        if (
            rendererAddress.code.length == 0 ||
            !rendererAddress.supportsERC165() ||
            !rendererAddress.supportsInterface(
                type(IBanmaoBoxRenderer).interfaceId
            ) ||
            !rendererAddress.supportsInterface(
                type(IBanmaoBoxSVGRenderer).interfaceId
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
        rendererAdmin = rendererAdminAddress;
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
        tokenId = _mintPrimaryBox(to, amount, unlockTimestamp);
    }

    /**
     * @notice Creates 1-20 primary-token boxes with one shared lock duration.
     * @param recipients Initial recipients in token-ID order.
     * @param amounts Amount locked in each box, in the token's smallest unit.
     * @param lockDurationSec Shared number of seconds until every box can open.
     * @return firstTokenId The first of the consecutively minted token IDs.
     * @dev Pulls the aggregate underlying amount once. Any failed transfer or
     *      ERC-721 receiver callback reverts the entire batch atomically.
     */
    function createBoxes(
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 lockDurationSec
    ) external nonReentrant returns (uint256 firstTokenId) {
        uint256 batchSize = recipients.length;
        if (batchSize == 0 || batchSize > MAX_BATCH_SIZE) {
            revert InvalidBatchSize();
        }
        if (amounts.length != batchSize) revert BatchLengthMismatch();

        uint256 unlockTimestamp = _validateCreation(
            recipients[0],
            lockDurationSec
        );
        uint256 totalAmount;
        for (uint256 i; i < batchSize; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            totalAmount += amounts[i];
        }

        _pullExact(underlyingToken, totalAmount);
        for (uint256 i; i < batchSize; ++i) {
            uint256 tokenId = _mintPrimaryBox(
                recipients[i],
                amounts[i],
                unlockTimestamp
            );
            if (i == 0) firstTokenId = tokenId;
        }
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
            uint8 decimals = _validateTokenMetadata(tokenAddress);
            for (uint256 j; j < i; ++j) {
                if (tokens[j] == tokenAddress) revert DuplicateToken(tokenAddress);
            }

            _pullExact(IERC20(tokenAddress), amount);
            _boxAssets[tokenId].push(
                BoxAsset({
                    token: tokenAddress,
                    amount: amount,
                    decimals: decimals,
                    symbol: _symbolBytes16(_readTokenSymbol(tokenAddress))
                })
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
        address currentOwner = _validateOpening(tokenId);
        _opening[tokenId] = true;

        uint256 released;
        uint256 primaryAmountReleased;
        uint256 i;
        while (i < _boxAssets[tokenId].length) {
            BoxAsset memory asset = _boxAssets[tokenId][i];
            (
                bool success,
                uint256 amountReceived,
                bytes memory reason
            ) = _tryReleaseAsset(asset, currentOwner);
            if (success) {
                _removeReleasedAsset(tokenId, i, asset, currentOwner, amountReceived);
                if (asset.token == address(underlyingToken)) {
                    primaryAmountReleased = amountReceived;
                }
                unchecked {
                    ++released;
                }
            } else {
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

        _opening[tokenId] = false;
        if (released == 0) return;
        _finishOpening(tokenId, currentOwner, primaryAmountReleased);
    }

    /**
     * @notice Releases one asset from an unlocked box without touching the rest.
     * @dev This is the recovery path when another basket asset is incompatible or
     *      deliberately consumes excessive gas. Asset order may change after a
     *      successful release because the array uses swap-and-pop removal.
     */
    function openAsset(uint256 tokenId, uint256 assetIndex) external nonReentrant {
        _openAsset(tokenId, assetIndex, address(0), 0, false);
    }

    /**
     * @notice Releases one asset only if the current index still matches the
     *         caller's expected token and amount.
     * @dev Prefer this overload in integrations. It prevents a stale index from
     *      selecting a different asset after another swap-and-pop removal.
     */
    function openAsset(
        uint256 tokenId,
        uint256 assetIndex,
        address expectedToken,
        uint256 expectedAmount
    ) external nonReentrant {
        _openAsset(tokenId, assetIndex, expectedToken, expectedAmount, true);
    }

    /**
     * @notice Detaches one asset from an NFT without attempting its transfer.
     * @dev Only the current NFT owner may abandon an asset, and only after unlock.
     *      ERC-721 approvals deliberately do not authorize this destructive action.
     *      The liability becomes a recoverable claim belonging to that owner rather
     *      than untracked surplus; use claimAbandonedAsset if the token recovers.
     */
    function abandonAsset(uint256 tokenId, uint256 assetIndex) external nonReentrant {
        _abandonAsset(tokenId, assetIndex, address(0), 0, false);
    }

    /**
     * @notice Owner-only abandonment guarded by the expected asset snapshot.
     * @dev Prefer this overload in integrations to prevent stale-index mistakes.
     */
    function abandonAsset(
        uint256 tokenId,
        uint256 assetIndex,
        address expectedToken,
        uint256 expectedAmount
    ) external nonReentrant {
        _abandonAsset(tokenId, assetIndex, expectedToken, expectedAmount, true);
    }

    function _openAsset(
        uint256 tokenId,
        uint256 assetIndex,
        address expectedToken,
        uint256 expectedAmount,
        bool checkExpected
    ) internal {
        address currentOwner = _validateOpening(tokenId);
        BoxAsset memory asset = _assetAt(tokenId, assetIndex);
        if (checkExpected) {
            _validateExpectedAsset(asset, expectedToken, expectedAmount);
        }

        _opening[tokenId] = true;
        uint256 amountReceived = _pushAvailable(
            IERC20(asset.token),
            currentOwner,
            asset.amount
        );
        _opening[tokenId] = false;

        _removeReleasedAsset(
            tokenId,
            assetIndex,
            asset,
            currentOwner,
            amountReceived
        );
        _finishOpening(
            tokenId,
            currentOwner,
            asset.token == address(underlyingToken) ? amountReceived : 0
        );
    }

    function _abandonAsset(
        uint256 tokenId,
        uint256 assetIndex,
        address expectedToken,
        uint256 expectedAmount,
        bool checkExpected
    ) internal {
        address currentOwner = _validateOwnerOpening(tokenId);
        BoxAsset memory asset = _assetAt(tokenId, assetIndex);
        if (checkExpected) {
            _validateExpectedAsset(asset, expectedToken, expectedAmount);
        }

        _removeBoxAsset(tokenId, assetIndex);
        if (asset.token == address(underlyingToken)) {
            totalTokensLocked -= asset.amount;
            boxDetails[tokenId].amount = 0;
        }
        recoverableAbandoned[currentOwner][asset.token] += asset.amount;
        emit BoxAssetAbandoned(
            tokenId,
            asset.token,
            currentOwner,
            asset.amount
        );
        _finishOpening(tokenId, currentOwner, 0);
    }

    /**
     * @notice Claims a payout previously detached from an NFT by its owner.
     * @dev This last-resort recovery path accepts an outbound transfer fee after
     *      requiring the collection balance to decrease by the full liability.
     *      The claim remains recorded if the transfer or either balance check fails.
     *      Only msg.sender's balance is claimable.
     */
    function claimAbandonedAsset(address token) external nonReentrant {
        uint256 amount = recoverableAbandoned[msg.sender][token];
        if (amount == 0) revert ZeroAmount();

        recoverableAbandoned[msg.sender][token] = 0;
        uint256 amountReceived = _pushAbandonedClaim(
            IERC20(token),
            msg.sender,
            amount
        );
        totalLockedByToken[token] -= amount;
        emit AbandonedAssetClaimed(
            msg.sender,
            token,
            amount,
            amountReceived
        );
    }

    /**
     * @notice Returns token balance not assigned to live boxes or recoverable claims.
     * @dev Direct ERC-20 transfers cannot be attributed safely to a sender. This
     *      view makes such surplus explicit without adding a permissioned sweep path.
     */
    function untrackedSurplus(address token) external view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 liability = totalLockedByToken[token];
        return balance > liability ? balance - liability : 0;
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

    function _validateOpening(uint256 tokenId) internal view returns (address owner) {
        owner = ownerOf(tokenId);
        if (!_isAuthorized(owner, msg.sender, tokenId)) {
            revert NotOwnerOrApproved();
        }
        _validateUnlocked(tokenId);
    }

    function _validateOwnerOpening(
        uint256 tokenId
    ) internal view returns (address owner) {
        owner = ownerOf(tokenId);
        if (msg.sender != owner) revert NotTokenOwner();
        _validateUnlocked(tokenId);
    }

    function _validateUnlocked(uint256 tokenId) internal view {
        uint256 unlockTime = uint256(boxDetails[tokenId].unlockTime);
        if (block.timestamp < unlockTime) revert BoxStillLocked(unlockTime);
    }

    function _assetAt(
        uint256 tokenId,
        uint256 assetIndex
    ) internal view returns (BoxAsset memory asset) {
        if (assetIndex >= _boxAssets[tokenId].length) revert InvalidAssetIndex();
        return _boxAssets[tokenId][assetIndex];
    }

    function _validateExpectedAsset(
        BoxAsset memory asset,
        address expectedToken,
        uint256 expectedAmount
    ) internal pure {
        if (asset.token != expectedToken || asset.amount != expectedAmount) {
            revert AssetStateMismatch(
                expectedToken,
                expectedAmount,
                asset.token,
                asset.amount
            );
        }
    }

    function _tryReleaseAsset(
        BoxAsset memory asset,
        address owner
    ) internal returns (bool success, uint256 amountReceived, bytes memory reason) {
        if (gasleft() <= BATCH_RELEASE_GAS_RESERVE) {
            return (false, 0, bytes("INSUFFICIENT_BATCH_GAS"));
        }

        uint256 callGas = gasleft() - BATCH_RELEASE_GAS_RESERVE;
        if (callGas > BATCH_RELEASE_GAS_LIMIT) callGas = BATCH_RELEASE_GAS_LIMIT;
        bytes memory payload = abi.encodeCall(
            this.releaseAsset,
            (asset.token, owner, asset.amount)
        );
        assembly ("memory-safe") {
            success := call(callGas, address(), 0, add(payload, 0x20), mload(payload), 0, 0)
            let returnSize := returndatasize()
            if and(success, lt(returnSize, 0x20)) {
                success := 0
            }
            if success {
                returndatacopy(0, 0, 0x20)
                amountReceived := mload(0)
            }
            if iszero(success) {
                let copySize := returnSize
                if gt(copySize, MAX_FAILURE_REASON_BYTES) {
                    copySize := MAX_FAILURE_REASON_BYTES
                }
                reason := mload(0x40)
                mstore(reason, copySize)
                returndatacopy(add(reason, 0x20), 0, copySize)
                mstore(
                    0x40,
                    and(add(add(reason, 0x3f), copySize), not(0x1f))
                )
            }
        }
    }

    function _removeReleasedAsset(
        uint256 tokenId,
        uint256 assetIndex,
        BoxAsset memory asset,
        address owner,
        uint256 amountReceived
    ) internal {
        _removeAssetLiability(tokenId, assetIndex, asset);
        emit BoxAssetReleased(
            tokenId,
            asset.token,
            owner,
            asset.amount,
            amountReceived
        );
    }

    function _removeAssetLiability(
        uint256 tokenId,
        uint256 assetIndex,
        BoxAsset memory asset
    ) internal {
        totalLockedByToken[asset.token] -= asset.amount;
        if (asset.token == address(underlyingToken)) {
            totalTokensLocked -= asset.amount;
            boxDetails[tokenId].amount = 0;
        }
        _removeBoxAsset(tokenId, assetIndex);
    }

    function _removeBoxAsset(uint256 tokenId, uint256 assetIndex) internal {
        uint256 last = _boxAssets[tokenId].length - 1;
        if (assetIndex != last) {
            _boxAssets[tokenId][assetIndex] = _boxAssets[tokenId][last];
        }
        _boxAssets[tokenId].pop();
    }

    function _finishOpening(
        uint256 tokenId,
        address owner,
        uint256 primaryAmountReleased
    ) internal {
        if (_boxAssets[tokenId].length == 0) {
            delete boxDetails[tokenId];
            emit BoxOpened(tokenId, owner, primaryAmountReleased);
            _burn(tokenId);
        } else {
            emit MetadataUpdate(tokenId);
        }
    }

    /**
     * @notice Emits an ERC-4906 refresh signal for a live box.
     * @dev Permissionless because this function changes no box state or funds.
     *      Marketplaces may use the event to refresh time-dependent metadata.
     */
    function refreshMetadata(uint256 tokenId) external {
        _requireOwned(tokenId);
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
     * @notice Replaces the full metadata renderer for this collection.
     * @dev The renderer controls tokenURI, SVG and attributes but receives only
     *      bounded calldata and has no custody authority. Emits ERC-4906.
     */
    function setRenderer(address newRenderer) external {
        if (msg.sender != rendererAdmin) revert NotRendererAdmin();
        if (
            newRenderer.code.length == 0 ||
            !newRenderer.supportsERC165() ||
            !newRenderer.supportsInterface(
                type(IBanmaoBoxRenderer).interfaceId
            ) ||
            !newRenderer.supportsInterface(
                type(IBanmaoBoxSVGRenderer).interfaceId
            )
        ) {
            revert InvalidRenderer();
        }

        address previousRenderer = address(renderer);
        renderer = IBanmaoBoxRenderer(newRenderer);
        emit RendererUpdated(previousRenderer, newRenderer);
        emit BatchMetadataUpdate(1, type(uint256).max);
    }

    /** Returns the complete token URI from the configured full renderer. */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        return renderer.tokenURI(tokenId, _renderData(tokenId));
    }

    /** Returns the raw SVG from the currently configured full renderer. */
    function renderSVG(
        uint256 tokenId
    ) external view returns (string memory) {
        _requireOwned(tokenId);
        return renderer.renderSVG(tokenId, _renderData(tokenId));
    }

    /** Returns attributes from the currently configured full renderer. */
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
        if (_opening[tokenId]) revert TransferWhileOpening(tokenId);
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

    function _mintPrimaryBox(
        address to,
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
        _boxAssets[tokenId].push(
            BoxAsset({
                token: address(underlyingToken),
                amount: amount,
                decimals: tokenDecimals,
                symbol: _symbolBytes16(tokenSymbol)
            })
        );
        totalTokensLocked += amount;
        totalLockedByToken[address(underlyingToken)] += amount;

        emit BoxCreated(tokenId, msg.sender, to, amount, unlockTimestamp);
        emit BoxAssetLocked(tokenId, address(underlyingToken), amount);
        _safeMint(to, tokenId);
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
            ownerBalanceAfter < ownerBalanceBefore ||
            ownerBalanceAfter - ownerBalanceBefore != amount
        ) revert UnsupportedTokenBehavior();
        return amount;
    }

    /**
     * @dev Last-resort payout for an abandoned claim. The collection must lose the
     *      full recorded liability, while the recipient may receive less because of
     *      an outbound token fee. A zero recipient increase is never accepted.
     */
    function _pushAbandonedClaim(
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
            ownerBalanceAfter <= ownerBalanceBefore
        ) revert UnsupportedTokenBehavior();
        return ownerBalanceAfter - ownerBalanceBefore;
    }

    function _validateTokenMetadata(
        address tokenAddress
    ) internal view returns (uint8 tokenMetadataDecimals) {
        try IERC20Metadata(tokenAddress).decimals() returns (uint8 decimals) {
            if (decimals > MAX_SUPPORTED_TOKEN_DECIMALS) {
                revert UnsupportedTokenDecimals(decimals);
            }
            return decimals;
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
        bytes memory renderAssets;
        for (uint256 i; i < assets.length; ++i) {
            BoxAsset storage asset = assets[i];
            renderAssets = abi.encodePacked(
                renderAssets,
                asset.token,
                asset.amount,
                asset.decimals,
                asset.symbol
            );
            if (asset.token == address(underlyingToken)) {
                primaryAmount = asset.amount;
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
                assetCount: uint8(assets.length),
                tokenSymbol: _symbolBytes16(tokenSymbol),
                renderAssets: renderAssets
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

    function _symbolBytes16(string memory value) internal pure returns (bytes16 result) {
        bytes memory raw = bytes(value);
        assembly ("memory-safe") {
            result := mload(add(raw, 0x20))
        }
    }
}