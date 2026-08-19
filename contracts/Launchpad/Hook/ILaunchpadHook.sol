// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title ILaunchpadHook
 * @notice Interface for the LaunchpadHook contract.
 *         Used by BanmaoLaunchpad to register graduated pool IDs.
 *
 * @dev The actual LaunchpadHook implementation (BaseHook) must be compiled
 *      within the Foundry v4-template project. See LaunchpadHook.sol for details.
 */
interface ILaunchpadHook {
    function isGraduatedPool(bytes32 poolId) external view returns (bool);
    function poolVolume(bytes32 poolId) external view returns (uint256);
    function registerPoolId(bytes32 poolId) external;
}
