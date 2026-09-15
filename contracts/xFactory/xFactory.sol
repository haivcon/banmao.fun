// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @notice Permissioned, non-upgradeable deployment utility.
/// @dev Child constructors and initialization see the factory as msg.sender.
contract xFactory is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;
    error Unauthorized();
    error InvalidAddress();
    error InvalidValue();
    error EmptyInitCode();
    error DeploymentFailed();
    error EmptyRuntime();
    error InitializationFailed(bytes reason);
    error NativeTransferFailed();
    error RenounceDisabled();

    error EmptyCallData();
    error InitCodeTooLarge();
    uint256 public constant MAX_INIT_CODE_SIZE = 49152;

    EnumerableSet.AddressSet private _operatorSet;
    mapping(address => bool) public operators;
    /// @notice Historical deployment provenance, not a guarantee of live or safe code.
    mapping(address => bool) public deployedBy;
    event OperatorUpdated(address indexed operator, bool allowed);
    event Deployed(address indexed caller, address indexed deployed, bool deterministic, bytes32 effectiveSalt, bytes32 initCodeHash, uint256 value);
    event Initialized(address indexed deployed, bytes32 callDataHash, uint256 value);
    event Recovered(address indexed token, address indexed recipient, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}
    modifier onlyDeployer() {
        if (msg.sender != owner() && !operators[msg.sender]) revert Unauthorized();
        _;
    }
    function setOperator(address operator, bool allowed) external onlyOwner {
        _setOperator(operator, allowed);
    }
    function batchSetOperator(address[] calldata ops, bool[] calldata flags) external onlyOwner {
        if (ops.length != flags.length) revert InvalidValue();
        for (uint256 i; i < ops.length; ++i) _setOperator(ops[i], flags[i]);
    }
    function operatorCount() external view returns (uint256) { return _operatorSet.length(); }
    /// @dev Ordering can change after removal. Read all indices at the same block.
    function operatorAt(uint256 index) external view returns (address) { return _operatorSet.at(index); }
    function _setOperator(address operator, bool allowed) private {
        if (operator == address(0) || operator == address(this)) revert InvalidAddress();
        operators[operator] = allowed;
        if (allowed) _operatorSet.add(operator);
        else _operatorSet.remove(operator);
        emit OperatorUpdated(operator, allowed);
    }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    function renounceOwnership() public view override onlyOwner { revert RenounceDisabled(); }

    /// @dev Vanity tools must use this salt and the actual calling wallet.
    function computeEffectiveSalt(address deployer, bytes32 userSalt) public pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
    function computeInitCodeHash(bytes calldata initCode) external pure returns (bytes32) {
        return keccak256(initCode);
    }
    function predictCreate2Address(address deployer, bytes32 userSalt, bytes32 initCodeHash) external view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), computeEffectiveSalt(deployer, userSalt), initCodeHash)))));
    }
    /// @dev No code does not guarantee deployability: nonce collisions exist.
    function hasCode(address target) external view returns (bool) { return target.code.length != 0; }
    function getCodeHash(address target) external view returns (bytes32) { return target.codehash; }

    function deployCreate(bytes calldata initCode) external payable onlyDeployer whenNotPaused nonReentrant returns (address) {
        return _deploy(initCode, msg.value, false, bytes32(0));
    }
    function deployCreate2(bytes32 userSalt, bytes calldata initCode) external payable onlyDeployer whenNotPaused nonReentrant returns (address) {
        return _deploy(initCode, msg.value, true, computeEffectiveSalt(msg.sender, userSalt));
    }
    function deployCreateAndCall(bytes calldata initCode, uint256 constructorValue, bytes calldata callData) external payable onlyDeployer whenNotPaused nonReentrant returns (address deployed) {
        if (constructorValue > msg.value) revert InvalidValue();
        deployed = _deploy(initCode, constructorValue, false, bytes32(0));
        _initialize(deployed, callData, msg.value - constructorValue);
    }
    function deployCreate2AndCall(bytes32 userSalt, bytes calldata initCode, uint256 constructorValue, bytes calldata callData) external payable onlyDeployer whenNotPaused nonReentrant returns (address deployed) {
        if (constructorValue > msg.value) revert InvalidValue();
        deployed = _deploy(initCode, constructorValue, true, computeEffectiveSalt(msg.sender, userSalt));
        _initialize(deployed, callData, msg.value - constructorValue);
    }
    function _deploy(bytes memory initCode, uint256 value, bool deterministic, bytes32 salt) private returns (address deployed) {
        if (initCode.length == 0) revert EmptyInitCode();
        if (initCode.length > MAX_INIT_CODE_SIZE) revert InitCodeTooLarge();
        if (deterministic) {
            assembly ("memory-safe") { deployed := create2(value, add(initCode, 32), mload(initCode), salt) }
        } else {
            assembly ("memory-safe") { deployed := create(value, add(initCode, 32), mload(initCode)) }
        }
        if (deployed == address(0)) revert DeploymentFailed();
        if (deployed.code.length == 0) revert EmptyRuntime();
        deployedBy[deployed] = true;
        emit Deployed(msg.sender, deployed, deterministic, salt, keccak256(initCode), value);
    }
    // No receive/fallback. Recovery also works while paused.
    function recoverNative(address payable recipient, uint256 amount) external onlyOwner nonReentrant {
        if (recipient == address(0) || recipient == address(this)) revert InvalidAddress();
        if (amount == 0) revert InvalidValue();
        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
        emit Recovered(address(0), recipient, amount);
    }
    function recoverERC20(IERC20 token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (recipient == address(0) || recipient == address(this)) revert InvalidAddress();
        if (address(token) == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidValue();
        token.safeTransfer(recipient, amount);
        emit Recovered(address(token), recipient, amount);
    }
    function _initialize(address deployed, bytes calldata callData, uint256 value) private {
        if (callData.length == 0) revert EmptyCallData();
        (bool ok, bytes memory reason) = deployed.call{value: value}(callData);
        if (!ok) revert InitializationFailed(reason);
        if (deployed.code.length == 0) revert EmptyRuntime();
        emit Initialized(deployed, keccak256(callData), value);
    }
}
