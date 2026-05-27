
// x.com/haivcon

// File: @openzeppelin/contracts/token/ERC20/IERC20.sol
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File: @openzeppelin/contracts/interfaces/IERC20.sol


// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

pragma solidity >=0.4.16;


// File: @openzeppelin/contracts/utils/introspection/IERC165.sol


// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// File: @openzeppelin/contracts/interfaces/IERC165.sol


// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

pragma solidity >=0.4.16;


// File: @openzeppelin/contracts/interfaces/IERC1363.sol


// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

pragma solidity >=0.6.2;



/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// File: @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol


// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;



/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// File: @openzeppelin/contracts/utils/Context.sol


// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// File: @openzeppelin/contracts/access/Ownable.sol


// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;


/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File: @openzeppelin/contracts/utils/Pausable.sol


// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;


/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// File: @openzeppelin/contracts/utils/StorageSlot.sol


// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

pragma solidity ^0.8.20;

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// File: @openzeppelin/contracts/utils/ReentrancyGuard.sol


// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;


/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// File: WorldCupYieldWars.sol


pragma solidity ^0.8.20;






/**
 * @title WorldCupYieldWars (Multi-Season Edition - Production Ready)
 * @notice Features:
 * - Full Multi-Season support with isolated states per season.
 * - Early Bird multiplier calculated per SECOND to prevent cliff effects.
 * - O(1) 50% Principal Slashing via principalIndex algorithm.
 * - O(1) Global accounting to prevent Out-Of-Gas in recoverERC20.
 * - Admin-controlled feeBonus injections for fair Tokenomics with sanity checks.
 * - Precise anti-dust mechanics with up to 1e15 wei resolution limit.
 * - Trustless Unstake (No Pausable restriction on withdrawals).
 * - Auto-fee-waiver timeout (prevents stuck fees if admin goes offline).
 */
contract WorldCupYieldWars is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Config ============
    IERC20 public stakingToken;
    uint256 public constant ABSOLUTE_MAX_TEAMS = 64;
    
    uint256 public stakeFee = 200;   // 2% in basis points
    uint256 public unstakeFee = 200; // 2% in basis points
    uint256 public minStakeAmount = 1 ether; 
    uint256 constant BP = 10000;
    uint256 constant PRECISION = 1e18; 
    uint256 public constant maxBonusHours = 48; 
    uint256 public constant MAX_DUST_CLEAR_PER_SEASON = 1e15;

    // Admin reward pool (Global, spans across all seasons)
    uint256 public rewardPool; 

    // O(1) Global Tracking to prevent Out-Of-Gas in loops
    uint256 public globalTotalStaked;
    uint256 public globalTotalUnclaimedRewards;

    // ============ Season State ============
    uint256 public currentSeasonId = 1;

    struct SeasonInfo {
        uint256 maxTeams;
        uint256 tournamentStartTime;
        uint256 tournamentEndTime;      
        uint256 totalStakedAll;         
        uint256 totalUnclaimedRewards;  
        uint256 lockedMatchCount;
        uint256 championTeamId;
        bool tournamentStarted;
        bool tournamentEnded;
    }
    mapping(uint256 => SeasonInfo) public seasonInfo;
    mapping(uint256 => uint256) public dustClearedBySeason;

    // ============ Team Pools ============
    struct TeamPool {
        uint256 totalPrincipal;
        uint256 totalWeight;
        uint256 accRewardPerWeight;
        uint256 principalIndex;
        uint8   status; // 0=Active, 1=Champion, 2=Eliminated
        bool    locked;
    }

    struct TeamMetadata {
        string name;
        string code;
        string groupName;
        string color;
        string colorSecondary;
    }

    mapping(uint256 => mapping(uint256 => TeamPool)) public teamPools;
    mapping(uint256 => mapping(uint256 => TeamMetadata)) private teamMetadata;
    
    // ============ User Stakes ============
    struct UserStake {
        uint256 principalBase;
        uint256 weight;
        uint256 rewardDebt;
        uint256 pendingRewards;
    }
    mapping(uint256 => mapping(address => mapping(uint256 => UserStake))) public userStakes;

    // ============ Match System ============
    struct Match {
        uint256 seasonId;
        uint256 teamA;
        uint256 teamB;
        uint256 lockTime;
        uint256 winningTeam;
        bool    isLocked;
        bool    isResolved;
        bool    isDraw;
        bool    isElimination;
        uint256 slashedAmount;
        uint256 feeBonus;
    }
    mapping(uint256 => Match) public matches;
    mapping(uint256 => uint256[]) private seasonMatchIds;
    uint256 public matchCount;

    // ============ Events ============
    event Staked(address indexed user, uint256 indexed seasonId, uint256 indexed teamId, uint256 netAmount, uint256 multiplier);
    event Unstaked(address indexed user, uint256 indexed seasonId, uint256 indexed teamId, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed seasonId, uint256 indexed teamId, uint256 reward);
    event MatchLocked(uint256 indexed matchId, uint256 indexed seasonId, uint256 teamA, uint256 teamB);
    event MatchResolved(uint256 indexed matchId, uint256 indexed seasonId, uint256 winningTeam, uint256 losingTeam, uint256 slashedAmount, uint256 feeBonus);
    event MatchDrawn(uint256 indexed matchId, uint256 indexed seasonId);
    event TeamMetadataUpdated(uint256 indexed seasonId, uint256 indexed teamId, string name, string code, string groupName, string color, string colorSecondary);
    event FeesUpdated(uint256 stakeFee, uint256 unstakeFee);
    event MinStakeUpdated(uint256 minStakeAmount);
    event SeasonConfigured(uint256 indexed seasonId, uint256 maxTeams, uint256 tournamentStartTime, uint256 tournamentEndTime);
    event TournamentStarted(uint256 indexed seasonId);
    event ChampionDeclared(uint256 indexed seasonId, uint256 indexed teamId);
    event RewardPoolWithdrawn(address indexed to, uint256 amount);
    event DustDiscrepancyResolved(uint256 indexed seasonId, uint256 amountCleared);

    // ============ Constructor ============
    constructor(
        address _token,
        uint256 _maxTeams,
        uint256 _tournamentStartTime,
        uint256 _tournamentDuration 
    ) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        require(_maxTeams > 1 && _maxTeams <= ABSOLUTE_MAX_TEAMS, "Invalid count");
        
        stakingToken = IERC20(_token);

        _initSeason(currentSeasonId, _maxTeams, _tournamentStartTime, _tournamentStartTime + _tournamentDuration);
    }

    function _initSeason(uint256 _seasonId, uint256 _maxTeams, uint256 _startTime, uint256 _endTime) internal {
        SeasonInfo storage season = seasonInfo[_seasonId];
        season.maxTeams = _maxTeams;
        season.tournamentStartTime = _startTime;
        season.tournamentEndTime = _endTime;
        
        for (uint256 i = 0; i < _maxTeams; i++) {
            teamPools[_seasonId][i].principalIndex = PRECISION; 
        }
        emit SeasonConfigured(_seasonId, _maxTeams, _startTime, _endTime);
    }

    modifier validTeam(uint256 _seasonId, uint256 _teamId) { 
        require(_teamId < seasonInfo[_seasonId].maxTeams, "Invalid team"); 
        _; 
    }
    modifier teamNotLocked(uint256 _seasonId, uint256 _teamId) { 
        require(!teamPools[_seasonId][_teamId].locked, "Team locked"); 
        _; 
    }
    modifier teamActive(uint256 _seasonId, uint256 _teamId) { 
        require(teamPools[_seasonId][_teamId].status <= 1, "Eliminated"); 
        _; 
    }

    // ============ CORE FUNCTIONS ============

    function stake(uint256 teamId, uint256 amount)
        external whenNotPaused nonReentrant
    {
        uint256 sId = currentSeasonId;
        _validateStakeTarget(sId, teamId);
        require(amount > 0, "Zero amount");
        SeasonInfo storage season = seasonInfo[sId];
        require(season.tournamentStarted && !season.tournamentEnded, "Tournament not active");
        require(block.timestamp <= season.tournamentEndTime, "Tournament expired");

        uint256 net = _collectStakeAmount(amount);
        uint256 multiplier = _stakeMultiplier(season.tournamentStartTime);
        _increaseUserStake(sId, teamId, msg.sender, net, multiplier);

        season.totalStakedAll += net;
        globalTotalStaked += net; 
        emit Staked(msg.sender, sId, teamId, net, multiplier);
    }

    function _validateStakeTarget(uint256 seasonId, uint256 teamId) internal view validTeam(seasonId, teamId) teamActive(seasonId, teamId) teamNotLocked(seasonId, teamId) {}

    function _collectStakeAmount(uint256 amount) internal returns (uint256 net) {
        uint256 balanceBefore = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = stakingToken.balanceOf(address(this)) - balanceBefore;
        require(received >= minStakeAmount, "Below min stake");
        uint256 fee = (received * stakeFee) / BP;
        net = received - fee;
        if (fee > 0) rewardPool += fee;
    }

    function _stakeMultiplier(uint256 tournamentStartTime) internal view returns (uint256 multiplier) {
        multiplier = PRECISION;
        if (block.timestamp < tournamentStartTime) {
            uint256 secondsEarly = tournamentStartTime - block.timestamp;
            uint256 maxSeconds = maxBonusHours * 3600;
            
            if (secondsEarly > maxSeconds) secondsEarly = maxSeconds;
            if (secondsEarly < 3600) secondsEarly = 3600; 
            
            multiplier = (secondsEarly * PRECISION) / 3600;
        }
    }

    function _increaseUserStake(uint256 seasonId, uint256 teamId, address account, uint256 net, uint256 multiplier) internal {
        TeamPool storage pool = teamPools[seasonId][teamId];
        UserStake storage user = userStakes[seasonId][account][teamId];
        _settleRewards(user, pool);
        
        uint256 principalBaseAdded = (net * PRECISION) / pool.principalIndex;
        uint256 weightAdded = (net * multiplier) / PRECISION;
        
        user.principalBase += principalBaseAdded;
        user.weight += weightAdded;
        pool.totalPrincipal += net;
        pool.totalWeight += weightAdded;
        user.rewardDebt = (user.weight * pool.accRewardPerWeight) / PRECISION;
    }

    function unstake(uint256 seasonId, uint256 teamId, uint256 amount)
        external nonReentrant 
        validTeam(seasonId, teamId)
    {
        TeamPool storage pool = teamPools[seasonId][teamId];
        UserStake storage user = userStakes[seasonId][msg.sender][teamId];
        SeasonInfo storage season = seasonInfo[seasonId];
        require(!pool.locked || block.timestamp > season.tournamentEndTime, "Team locked");

        uint256 currentPrincipal = (user.principalBase * pool.principalIndex) / PRECISION;
        require(currentPrincipal >= amount && amount > 0, "Insufficient principal");

        _settleRewards(user, pool);

        uint256 baseToBurn;
        uint256 weightToBurn;
        
        if (amount == currentPrincipal) {
            baseToBurn = user.principalBase;
            weightToBurn = user.weight;
        } else {
            baseToBurn = (amount * PRECISION) / pool.principalIndex;
            weightToBurn = (user.weight * amount) / currentPrincipal;
        }

        user.principalBase -= baseToBurn;
        user.weight -= weightToBurn;
        pool.totalPrincipal -= amount;
        pool.totalWeight -= weightToBurn;
        
        season.totalStakedAll -= amount;
        globalTotalStaked -= amount; 

        user.rewardDebt = (user.weight * pool.accRewardPerWeight) / PRECISION;

        uint256 payout = amount;
        
        bool isSeasonActive = !season.tournamentEnded && block.timestamp <= season.tournamentEndTime;
        
        if (pool.status == 0 && isSeasonActive) { 
            uint256 fee = (amount * unstakeFee) / BP;
            payout -= fee;
            rewardPool += fee;
        }

        stakingToken.safeTransfer(msg.sender, payout);
        emit Unstaked(msg.sender, seasonId, teamId, payout);
    }

    function claimRewards(uint256 seasonId, uint256 teamId) external nonReentrant {
        TeamPool storage pool = teamPools[seasonId][teamId];
        UserStake storage user = userStakes[seasonId][msg.sender][teamId];
        SeasonInfo storage season = seasonInfo[seasonId];

        _settleRewards(user, pool);
        
        uint256 claimable = user.pendingRewards;
        require(claimable > 0, "No rewards");

        user.pendingRewards = 0;
        
        season.totalUnclaimedRewards -= claimable;
        globalTotalUnclaimedRewards -= claimable; 

        stakingToken.safeTransfer(msg.sender, claimable);
        emit RewardClaimed(msg.sender, seasonId, teamId, claimable);
    }

    function _settleRewards(UserStake storage user, TeamPool storage pool) internal {
        if (user.weight > 0) {
            uint256 pending = (user.weight * pool.accRewardPerWeight) / PRECISION - user.rewardDebt;
            if (pending > 0) {
                user.pendingRewards += pending;
            }
            user.rewardDebt = (user.weight * pool.accRewardPerWeight) / PRECISION;
        }
    }

    // ============ MATCH SYSTEM (ADMIN) ============

    function lockMatch(uint256 teamA, uint256 teamB, bool isElimination)
        external onlyOwner whenNotPaused
        validTeam(currentSeasonId, teamA) validTeam(currentSeasonId, teamB)
    {
        uint256 sId = currentSeasonId;
        SeasonInfo storage season = seasonInfo[sId];
        
        require(season.tournamentStarted && !season.tournamentEnded, "Tournament not active");
        require(block.timestamp <= season.tournamentEndTime, "Tournament expired");
        require(teamA != teamB, "Same team");
        require(!teamPools[sId][teamA].locked && !teamPools[sId][teamB].locked, "Already locked");
        require(teamPools[sId][teamA].status == 0 && teamPools[sId][teamB].status == 0, "Not active");

        uint256 matchId = matchCount++;
        seasonMatchIds[sId].push(matchId);
        teamPools[sId][teamA].locked = true;
        teamPools[sId][teamB].locked = true;
        season.lockedMatchCount += 1;

        matches[matchId] = Match({
            seasonId: sId, teamA: teamA, teamB: teamB,
            lockTime: block.timestamp, winningTeam: 0,
            isLocked: true, isResolved: false, isDraw: false,
            isElimination: isElimination, slashedAmount: 0, feeBonus: 0
        });

        emit MatchLocked(matchId, sId, teamA, teamB);
    }

    function resolveMatch(uint256 matchId, uint256 winningTeamId, uint256 feeBonusAmount) external onlyOwner whenNotPaused {
        Match storage m = matches[matchId];
        uint256 sId = m.seasonId;
        SeasonInfo storage season = seasonInfo[sId];

        require(m.isLocked && !m.isResolved, "Invalid match state");
        require(block.timestamp <= season.tournamentEndTime, "Tournament expired");
        require(winningTeamId == m.teamA || winningTeamId == m.teamB, "Invalid winner");
        require(feeBonusAmount <= rewardPool / 2, "Bonus too large"); // Sanity check to prevent fat-finger error

        uint256 losingTeam = (winningTeamId == m.teamA) ? m.teamB : m.teamA;
        TeamPool storage winPool = teamPools[sId][winningTeamId];
        TeamPool storage losePool = teamPools[sId][losingTeam];

        uint256 slashedAmount = _slashLosingPool(season, losePool);
        uint256 actualFeeBonus = _consumeFeeBonus(feeBonusAmount);
        _distributeMatchReward(season, winPool, slashedAmount + actualFeeBonus);

        m.winningTeam = winningTeamId;
        m.isResolved = true;
        m.slashedAmount = slashedAmount;
        m.feeBonus = actualFeeBonus;

        winPool.locked = false;
        losePool.locked = false;
        season.lockedMatchCount -= 1;

        if (m.isElimination) losePool.status = 2; 
        emit MatchResolved(matchId, sId, winningTeamId, losingTeam, slashedAmount, actualFeeBonus);
    }

    function _slashLosingPool(SeasonInfo storage season, TeamPool storage losePool) internal returns (uint256 slashedAmount) {
        uint256 originalPrincipal = losePool.totalPrincipal;
        slashedAmount = originalPrincipal / 2;
        uint256 dustPrincipal = originalPrincipal % 2;

        losePool.totalPrincipal = slashedAmount;
        losePool.principalIndex = losePool.principalIndex / 2;

        uint256 removedFromStake = slashedAmount + dustPrincipal;
        season.totalStakedAll -= removedFromStake;
        globalTotalStaked -= removedFromStake;

        if (dustPrincipal > 0) rewardPool += dustPrincipal;
    }

    function _consumeFeeBonus(uint256 feeBonusAmount) internal returns (uint256) {
        if (feeBonusAmount > 0) rewardPool -= feeBonusAmount;
        return feeBonusAmount;
    }

    function _distributeMatchReward(SeasonInfo storage season, TeamPool storage winPool, uint256 totalReward) internal {
        if (totalReward == 0) return;

        if (winPool.totalWeight == 0) {
            rewardPool += totalReward;
            return;
        }

        uint256 addedAccReward = (totalReward * PRECISION) / winPool.totalWeight;
        winPool.accRewardPerWeight += addedAccReward;

        uint256 actualRewardAdded = (addedAccReward * winPool.totalWeight) / PRECISION;
        season.totalUnclaimedRewards += actualRewardAdded;
        globalTotalUnclaimedRewards += actualRewardAdded;

        uint256 rewardDust = totalReward - actualRewardAdded;
        if (rewardDust > 0) rewardPool += rewardDust;
    }

    function resolveDraw(uint256 matchId) external onlyOwner whenNotPaused {
        Match storage m = matches[matchId];
        uint256 sId = m.seasonId;
        SeasonInfo storage season = seasonInfo[sId];

        require(m.isLocked && !m.isResolved, "Invalid state");

        m.isResolved = true;
        m.isDraw = true;

        teamPools[sId][m.teamA].locked = false;
        teamPools[sId][m.teamB].locked = false;
        season.lockedMatchCount -= 1;

        emit MatchDrawn(matchId, sId);
    }

    // ============ ADMIN UTILS ============

    function startTournament() external onlyOwner {
        require(!seasonInfo[currentSeasonId].tournamentStarted, "Already started");
        SeasonInfo storage season = seasonInfo[currentSeasonId];
        require(block.timestamp <= season.tournamentEndTime, "Tournament expired");
        season.tournamentStarted = true;
        emit TournamentStarted(currentSeasonId);
    }
    
    function declareChampion(uint256 teamId) external onlyOwner validTeam(currentSeasonId, teamId) {
        SeasonInfo storage season = seasonInfo[currentSeasonId];
        require(season.tournamentStarted && !season.tournamentEnded, "Not active");
        require(season.lockedMatchCount == 0, "Unresolved matches");
        
        teamPools[currentSeasonId][teamId].status = 1;
        season.championTeamId = teamId;
        season.tournamentEnded = true;
        emit ChampionDeclared(currentSeasonId, teamId);
    }

    function configureNextSeason(uint256 newMaxTeams, uint256 newTournamentStartTime, uint256 newTournamentDuration) external onlyOwner {
        require(newMaxTeams > 1 && newMaxTeams <= ABSOLUTE_MAX_TEAMS, "Invalid count");
        SeasonInfo storage currentSeason = seasonInfo[currentSeasonId];
        require(!currentSeason.tournamentStarted || currentSeason.tournamentEnded, "Current season active");
        require(currentSeason.lockedMatchCount == 0, "Locked matches remain");

        currentSeasonId += 1;
        _initSeason(currentSeasonId, newMaxTeams, newTournamentStartTime, newTournamentStartTime + newTournamentDuration);
    }

    function withdrawRewardPool(address to, uint256 amount) external onlyOwner {
        require(amount <= rewardPool, "Exceeds pool");
        rewardPool -= amount;
        stakingToken.safeTransfer(to, amount);
        emit RewardPoolWithdrawn(to, amount);
    }

    function resolveDustDiscrepancy(uint256 seasonId, uint256 amountToClear) external onlyOwner {
        require(amountToClear > 0, "Zero amount");
        SeasonInfo storage season = seasonInfo[seasonId];
        require(season.tournamentEnded || block.timestamp > season.tournamentEndTime, "Season not closed");
        require(season.totalUnclaimedRewards >= amountToClear, "Season underflow");
        require(globalTotalUnclaimedRewards >= amountToClear, "Global underflow");
        require(dustClearedBySeason[seasonId] + amountToClear <= MAX_DUST_CLEAR_PER_SEASON, "Exceeds dust limit");

        season.totalUnclaimedRewards -= amountToClear;
        globalTotalUnclaimedRewards -= amountToClear;
        dustClearedBySeason[seasonId] += amountToClear;
        emit DustDiscrepancyResolved(seasonId, amountToClear);
    }

    function recoverERC20(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(stakingToken)) {
            uint256 realBalance = stakingToken.balanceOf(address(this));
            uint256 lockedBalance = rewardPool + globalTotalStaked + globalTotalUnclaimedRewards;
            
            require(realBalance > lockedBalance, "No sweepable funds exist");
            uint256 sweepable = realBalance - lockedBalance;
            require(amount <= sweepable, "Cannot sweep user locked funds");
        }
        IERC20(token).safeTransfer(to, amount);
    }

    // ============ ADMIN CONFIG ============

    function setFees(uint256 _stakeFee, uint256 _unstakeFee) external onlyOwner {
        require(_stakeFee <= 500 && _unstakeFee <= 500, "Max 5%");
        stakeFee = _stakeFee;
        unstakeFee = _unstakeFee;
        emit FeesUpdated(_stakeFee, _unstakeFee);
    }

    function setMinStakeAmount(uint256 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
        emit MinStakeUpdated(_minStakeAmount);
    }

    function setTournamentTimes(uint256 newTournamentStartTime, uint256 newTournamentEndTime) external onlyOwner {
        SeasonInfo storage season = seasonInfo[currentSeasonId];
        require(!season.tournamentStarted, "Already started");
        require(newTournamentEndTime > newTournamentStartTime, "Invalid timeframe");
        season.tournamentStartTime = newTournamentStartTime;
        season.tournamentEndTime = newTournamentEndTime;
    }

    function setMaxTeams(uint256 newMaxTeams) external onlyOwner {
        SeasonInfo storage season = seasonInfo[currentSeasonId];
        require(!season.tournamentStarted, "Already started");
        require(newMaxTeams > 1 && newMaxTeams <= ABSOLUTE_MAX_TEAMS, "Invalid count");
        require(newMaxTeams >= season.maxTeams, "Cannot shrink");
        for (uint256 i = season.maxTeams; i < newMaxTeams; i++) {
            teamPools[currentSeasonId][i].principalIndex = PRECISION;
        }
        season.maxTeams = newMaxTeams;
    }

    function setTeamMetadata(
        uint256 teamId,
        string calldata name,
        string calldata code,
        string calldata groupName,
        string calldata color,
        string calldata colorSecondary
    ) external onlyOwner validTeam(currentSeasonId, teamId) {
        require(!seasonInfo[currentSeasonId].tournamentStarted, "Season started");
        _setTeamMetadata(currentSeasonId, teamId, name, code, groupName, color, colorSecondary);
    }

    function setTeamMetadataForSeason(
        uint256 seasonId,
        uint256 teamId,
        string calldata name,
        string calldata code,
        string calldata groupName,
        string calldata color,
        string calldata colorSecondary
    ) external onlyOwner validTeam(seasonId, teamId) {
        require(!seasonInfo[seasonId].tournamentStarted, "Season started");
        _setTeamMetadata(seasonId, teamId, name, code, groupName, color, colorSecondary);
    }

    function setTeamMetadataBatch(
        uint256[] calldata teamIds,
        string[] calldata names,
        string[] calldata codes,
        string[] calldata groupNames,
        string[] calldata colors,
        string[] calldata colorSecondaries
    ) external onlyOwner {
        require(!seasonInfo[currentSeasonId].tournamentStarted, "Season started");
        uint256 len = teamIds.length;
        require(
            len == names.length &&
            len == codes.length &&
            len == groupNames.length &&
            len == colors.length &&
            len == colorSecondaries.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < len; i++) {
            require(teamIds[i] < seasonInfo[currentSeasonId].maxTeams, "Invalid team");
            _setTeamMetadata(currentSeasonId, teamIds[i], names[i], codes[i], groupNames[i], colors[i], colorSecondaries[i]);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _setTeamMetadata(
        uint256 seasonId,
        uint256 teamId,
        string calldata name,
        string calldata code,
        string calldata groupName,
        string calldata color,
        string calldata colorSecondary
    ) internal {
        require(bytes(name).length > 0 && bytes(name).length <= 40, "Bad name");
        require(bytes(code).length > 0 && bytes(code).length <= 8, "Bad code");
        require(bytes(groupName).length <= 16, "Bad group");
        require(bytes(color).length <= 16 && bytes(colorSecondary).length <= 16, "Bad color");

        teamMetadata[seasonId][teamId] = TeamMetadata(name, code, groupName, color, colorSecondary);
        emit TeamMetadataUpdated(seasonId, teamId, name, code, groupName, color, colorSecondary);
    }

    // ============ READ HELPERS ============

    function getCurrentSeasonInfo() external view returns (
        uint256 maxTeams,
        uint256 tournamentStartTime,
        uint256 tournamentEndTime,
        uint256 totalStakedAll,
        uint256 totalUnclaimedRewards,
        uint256 lockedMatchCount,
        uint256 championTeamId,
        bool tournamentStarted,
        bool tournamentEnded
    ) {
        return getSeasonInfo(currentSeasonId);
    }

    function getSeasonInfo(uint256 seasonId) public view returns (
        uint256 maxTeams,
        uint256 tournamentStartTime,
        uint256 tournamentEndTime,
        uint256 totalStakedAll,
        uint256 totalUnclaimedRewards,
        uint256 lockedMatchCount,
        uint256 championTeamId,
        bool tournamentStarted,
        bool tournamentEnded
    ) {
        SeasonInfo memory season = seasonInfo[seasonId];
        return (
            season.maxTeams,
            season.tournamentStartTime,
            season.tournamentEndTime,
            season.totalStakedAll,
            season.totalUnclaimedRewards,
            season.lockedMatchCount,
            season.championTeamId,
            season.tournamentStarted,
            season.tournamentEnded
        );
    }

    function getTeamPool(uint256 seasonId, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        uint256 totalPrincipal,
        uint256 totalWeight,
        uint256 accRewardPerWeight,
        uint256 principalIndex,
        uint8 status,
        bool locked
    ) {
        TeamPool memory pool = teamPools[seasonId][teamId];
        return (pool.totalPrincipal, pool.totalWeight, pool.accRewardPerWeight, pool.principalIndex, pool.status, pool.locked);
    }

    function getAllTeamStats(uint256 seasonId) external view returns (
        uint256[] memory totalPrincipalArr,
        uint256[] memory totalWeightArr,
        uint256[] memory accRewardPerWeightArr,
        uint256[] memory principalIndexArr,
        uint8[] memory statusArr,
        bool[] memory lockedArr
    ) {
        uint256 count = seasonInfo[seasonId].maxTeams;
        totalPrincipalArr = new uint256[](count);
        totalWeightArr = new uint256[](count);
        accRewardPerWeightArr = new uint256[](count);
        principalIndexArr = new uint256[](count);
        statusArr = new uint8[](count);
        lockedArr = new bool[](count);
        for (uint256 i = 0; i < count; i++) {
            TeamPool memory pool = teamPools[seasonId][i];
            totalPrincipalArr[i] = pool.totalPrincipal;
            totalWeightArr[i] = pool.totalWeight;
            accRewardPerWeightArr[i] = pool.accRewardPerWeight;
            principalIndexArr[i] = pool.principalIndex;
            statusArr[i] = pool.status;
            lockedArr[i] = pool.locked;
        }
    }

    function getTeamMetadata(uint256 seasonId, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        string memory name,
        string memory code,
        string memory groupName,
        string memory color,
        string memory colorSecondary
    ) {
        TeamMetadata memory metadata = teamMetadata[seasonId][teamId];
        return (metadata.name, metadata.code, metadata.groupName, metadata.color, metadata.colorSecondary);
    }

    function getAllTeamMetadata(uint256 seasonId) external view returns (
        string[] memory names,
        string[] memory codes,
        string[] memory groupNames,
        string[] memory colors,
        string[] memory colorSecondaries
    ) {
        uint256 count = seasonInfo[seasonId].maxTeams;
        names = new string[](count);
        codes = new string[](count);
        groupNames = new string[](count);
        colors = new string[](count);
        colorSecondaries = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            TeamMetadata memory metadata = teamMetadata[seasonId][i];
            names[i] = metadata.name;
            codes[i] = metadata.code;
            groupNames[i] = metadata.groupName;
            colors[i] = metadata.color;
            colorSecondaries[i] = metadata.colorSecondary;
        }
    }

    function getUserInfo(uint256 seasonId, address account, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        uint256 principal,
        uint256 weight,
        uint256 pendingRewards
    ) {
        UserStake memory user = userStakes[seasonId][account][teamId];
        TeamPool memory pool = teamPools[seasonId][teamId];
        principal = (user.principalBase * pool.principalIndex) / PRECISION;
        weight = user.weight;
        pendingRewards = user.pendingRewards;
        if (user.weight > 0) {
            pendingRewards += (user.weight * pool.accRewardPerWeight) / PRECISION - user.rewardDebt;
        }
    }

    function getMatch(uint256 matchId) external view returns (
        uint256 seasonId,
        uint256 teamA,
        uint256 teamB,
        uint256 winningTeam,
        bool isLocked,
        bool isResolved,
        bool isElimination,
        bool isDraw,
        uint256 slashedAmount,
        uint256 feeBonus
    ) {
        Match memory m = matches[matchId];
        return (m.seasonId, m.teamA, m.teamB, m.winningTeam, m.isLocked, m.isResolved, m.isElimination, m.isDraw, m.slashedAmount, m.feeBonus);
    }

    function getSeasonMatchIds(uint256 seasonId) external view returns (uint256[] memory ids) {
        return seasonMatchIds[seasonId];
    }

    function getMatchRewardBreakdown(uint256 matchId) external view returns (
        uint256 seasonId,
        uint256 teamA,
        uint256 teamB,
        uint256 winningTeam,
        uint256 losingTeam,
        bool isResolved,
        bool isDraw,
        uint256 slashedAmount,
        uint256 feeBonus,
        uint256 totalReward,
        uint256 winningPoolWeight,
        bool rewardToWinners
    ) {
        Match memory m = matches[matchId];
        losingTeam = (!m.isResolved || m.isDraw) ? 0 : (m.winningTeam == m.teamA ? m.teamB : m.teamA);
        uint256 poolWeight = m.isResolved && !m.isDraw ? teamPools[m.seasonId][m.winningTeam].totalWeight : 0;
        uint256 reward = m.slashedAmount + m.feeBonus;
        return (
            m.seasonId,
            m.teamA,
            m.teamB,
            m.winningTeam,
            losingTeam,
            m.isResolved,
            m.isDraw,
            m.slashedAmount,
            m.feeBonus,
            reward,
            poolWeight,
            m.isResolved && !m.isDraw && poolWeight > 0
        );
    }

    function previewStake(uint256 amount) external view returns (uint256 fee, uint256 netAmount) {
        fee = (amount * stakeFee) / BP;
        netAmount = amount - fee;
    }

    function previewUnstake(uint256 seasonId, uint256 teamId, address account, uint256 amount) external view validTeam(seasonId, teamId) returns (
        uint256 currentPrincipal,
        uint256 fee,
        uint256 payout,
        bool validAmount
    ) {
        UserStake memory user = userStakes[seasonId][account][teamId];
        TeamPool memory pool = teamPools[seasonId][teamId];
        SeasonInfo memory season = seasonInfo[seasonId];

        currentPrincipal = (user.principalBase * pool.principalIndex) / PRECISION;
        validAmount = amount > 0 && amount <= currentPrincipal;
        
        bool isSeasonActive = !season.tournamentEnded && block.timestamp <= season.tournamentEndTime;
        fee = (pool.status == 0 && isSeasonActive) ? (amount * unstakeFee) / BP : 0;
        
        payout = amount > fee ? amount - fee : 0;
    }

    function getUserRewardShare(uint256 seasonId, address account, uint256 teamId) external view validTeam(seasonId, teamId) returns (
        uint256 userWeight,
        uint256 poolWeight,
        uint256 shareBp
    ) {
        UserStake memory user = userStakes[seasonId][account][teamId];
        poolWeight = teamPools[seasonId][teamId].totalWeight;
        userWeight = user.weight;
        shareBp = poolWeight > 0 ? (userWeight * BP) / poolWeight : 0;
    }
}
