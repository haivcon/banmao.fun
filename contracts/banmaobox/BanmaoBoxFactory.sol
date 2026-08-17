// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {BanmaoBox} from "./BanmaoBox.sol";
import {
    IBanmaoBoxRenderer,
    IBanmaoBoxSVGRenderer
} from "./BanmaoBoxRenderer.sol";

/**
 * @title BanmaoBoxFactory
 * @notice Permissionlessly deploys one BanmaoBox collection per ERC-20.
 * @dev The factory deployer is the immutable renderer admin for every collection.
 *      It has no custody, withdrawal, pause, or token-upgrade authority.
 */
contract BanmaoBoxFactory is ReentrancyGuard {
    using ERC165Checker for address;

    /// @notice Renderer configured when this Factory was deployed.
    IBanmaoBoxRenderer public immutable renderer;
    /// @notice Renderer assigned to collections created after the latest update.
    IBanmaoBoxRenderer public defaultRenderer;
    address public immutable rendererAdmin;
    /// @notice Optional predecessor whose registry remains discoverable here.
    BanmaoBoxFactory public immutable previousFactory;

    mapping(address token => address box) private _boxForToken;
    mapping(address box => bool registered) private _isTokenBox;

    event TokenBoxCreated(
        address indexed token,
        address indexed box,
        address indexed creator
    );
    event DefaultRendererUpdated(
        address indexed previousRenderer,
        address indexed newRenderer
    );

    error ZeroAddress();
    error InvalidRenderer();
    error InvalidPreviousFactory();
    error NotRendererAdmin();
    error TokenBoxAlreadyExists(address box);

    constructor(address rendererAddress, address previousFactoryAddress) {
        if (rendererAddress == address(0)) revert ZeroAddress();
        _validateRenderer(rendererAddress);
        if (
            previousFactoryAddress != address(0) &&
            previousFactoryAddress.code.length == 0
        ) revert InvalidPreviousFactory();

        renderer = IBanmaoBoxRenderer(rendererAddress);
        defaultRenderer = IBanmaoBoxRenderer(rendererAddress);
        rendererAdmin = msg.sender;
        previousFactory = BanmaoBoxFactory(previousFactoryAddress);
    }

    /**
     * @notice Changes the full renderer assigned to subsequently created collections.
     * @dev Existing collections are unchanged. Their SVG renderer can still be
     *      changed individually through BanmaoBox.setRenderer.
     */
    function setDefaultRenderer(address newRenderer) external {
        if (msg.sender != rendererAdmin) revert NotRendererAdmin();
        _validateRenderer(newRenderer);

        address previousRenderer = address(defaultRenderer);
        defaultRenderer = IBanmaoBoxRenderer(newRenderer);
        emit DefaultRendererUpdated(previousRenderer, newRenderer);
    }

    /**
     * @notice Deploys the canonical BanmaoBox collection for `token`.
     * @dev Anyone may call this. BanmaoBox validates token code and metadata.
     */
    function createTokenBox(
        address token
    ) external nonReentrant returns (address box) {
        if (token == address(0)) revert ZeroAddress();

        address existing = boxForToken(token);
        if (existing != address(0)) revert TokenBoxAlreadyExists(existing);

        box = address(
            new BanmaoBox(token, address(defaultRenderer), rendererAdmin)
        );
        _boxForToken[token] = box;
        _isTokenBox[box] = true;

        emit TokenBoxCreated(token, box, msg.sender);
    }

    /** Returns the local collection or falls back through the predecessor chain. */
    function boxForToken(address token) public view returns (address box) {
        box = _boxForToken[token];
        if (box == address(0) && address(previousFactory) != address(0)) {
            box = previousFactory.boxForToken(token);
        }
    }

    /** Returns local registration or falls back through the predecessor chain. */
    function isTokenBox(address box) public view returns (bool) {
        if (_isTokenBox[box]) return true;
        return
            address(previousFactory) != address(0) &&
            previousFactory.isTokenBox(box);
    }

    function _validateRenderer(address rendererAddress) private view {
        if (
            rendererAddress.code.length == 0 ||
            !rendererAddress.supportsInterface(
                type(IBanmaoBoxRenderer).interfaceId
            ) ||
            !rendererAddress.supportsInterface(
                type(IBanmaoBoxSVGRenderer).interfaceId
            )
        ) revert InvalidRenderer();
    }
}
