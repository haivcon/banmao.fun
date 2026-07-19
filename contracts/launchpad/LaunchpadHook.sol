// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@uniswap/v4-periphery/src/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager, SwapParams} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";

/// @notice Hook used exclusively by BanmaoLaunchpad graduated pools.
/// @dev Its CREATE2 address must have BEFORE_INITIALIZE, AFTER_INITIALIZE and
/// AFTER_SWAP flags. See foundry/README.md for the deployment procedure.
contract LaunchpadHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    address public immutable launchpad;
    mapping(PoolId => bool) public registeredPoolIds;
    mapping(PoolId => bool) public isGraduatedPool;
    mapping(PoolId => uint256) public poolVolume;

    event PoolPreRegistered(PoolId indexed poolId, uint256 timestamp);
    event PoolActivated(PoolId indexed poolId, uint256 timestamp);
    event SwapTracked(PoolId indexed poolId, uint256 swapAmount, uint256 timestamp);

    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "Only launchpad");
        _;
    }

    constructor(IPoolManager poolManager_, address launchpad_) BaseHook(poolManager_) {
        require(launchpad_ != address(0), "Invalid launchpad");
        launchpad = launchpad_;
    }

    function registerPoolId(PoolId poolId) external onlyLaunchpad {
        require(!registeredPoolIds[poolId], "Pool already registered");
        registeredPoolIds[poolId] = true;
        emit PoolPreRegistered(poolId, block.timestamp);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /// @dev Reject any attempt to initialize this hook with a pool that was not
    /// registered by the launchpad in the same migration transaction.
    function _beforeInitialize(address, PoolKey calldata key, uint160) internal override returns (bytes4) {
        require(registeredPoolIds[key.toId()], "Unregistered pool");
        return BaseHook.beforeInitialize.selector;
    }

    function _afterInitialize(address, PoolKey calldata key, uint160, int24) internal override returns (bytes4) {
        PoolId poolId = key.toId();
        require(registeredPoolIds[poolId], "Unregistered pool");
        isGraduatedPool[poolId] = true;
        emit PoolActivated(poolId, block.timestamp);
        return BaseHook.afterInitialize.selector;
    }

    function _afterSwap(address, PoolKey calldata key, SwapParams calldata params, BalanceDelta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        PoolId poolId = key.toId();
        if (isGraduatedPool[poolId]) {
            uint256 swapAmount = params.amountSpecified > 0
                ? uint256(params.amountSpecified)
                : uint256(-params.amountSpecified);
            poolVolume[poolId] += swapAmount;
            emit SwapTracked(poolId, swapAmount, block.timestamp);
        }
        return (BaseHook.afterSwap.selector, 0);
    }
}
