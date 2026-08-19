// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title MemeToken
 * @notice Minimal ERC20 token created by BanmaoLaunchpad via EIP-1167 Minimal Proxy.
 *         Fixed supply minted entirely to the launchpad contract at initialization.
 *         No mint/burn after creation — fair launch guarantee.
 *
 * @dev This contract uses initialize() instead of constructor() to support
 *      the Minimal Proxy (Clone) pattern. Deploy one implementation contract,
 *      then use Clones.clone() to create cheap copies (~10x gas savings).
 */
contract MemeToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @dev Prevents initialize() from being called twice (proxy safety)
    bool private initialized;

    /// @dev Lock the implementation contract at deploy time.
    ///      Clones (proxies) are unaffected — they have their own storage.
    constructor() {
        initialized = true;
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @notice Initialize the token (replaces constructor for Clone pattern).
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _totalSupply Total supply (minted to _recipient)
     * @param _recipient Address to receive all tokens (launchpad contract)
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _recipient
    ) external {
        require(!initialized, "Already initialized");
        initialized = true;

        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balanceOf[_recipient] = _totalSupply;
        emit Transfer(address(0), _recipient, _totalSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "ERC20: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        allowance[msg.sender][spender] += addedValue;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        uint256 current = allowance[msg.sender][spender];
        require(current >= subtractedValue, "ERC20: decreased below zero");
        allowance[msg.sender][spender] = current - subtractedValue;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        return true;
    }
}

