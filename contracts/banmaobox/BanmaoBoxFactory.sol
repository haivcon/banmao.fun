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

    IBanmaoBoxRenderer public immutable renderer;
    address public immutable rendererAdmin;

    mapping(address token => address box) public boxForToken;
    mapping(address box => bool registered) public isTokenBox;

    event TokenBoxCreated(
        address indexed token,
        address indexed box,
        address indexed creator
    );

    error ZeroAddress();
    error InvalidRenderer();
    error TokenBoxAlreadyExists(address box);

    constructor(address rendererAddress) {
        if (rendererAddress == address(0)) revert ZeroAddress();
        if (
            rendererAddress.code.length == 0 ||
            !rendererAddress.supportsInterface(
                type(IBanmaoBoxRenderer).interfaceId
            ) ||
            !rendererAddress.supportsInterface(
                type(IBanmaoBoxSVGRenderer).interfaceId
            )
        ) {
            revert InvalidRenderer();
        }
        renderer = IBanmaoBoxRenderer(rendererAddress);
        rendererAdmin = msg.sender;
    }

    /**
     * @notice Deploys the canonical BanmaoBox collection for `token`.
     * @dev Anyone may call this. BanmaoBox validates token code and metadata.
     */
    function createTokenBox(
        address token
    ) external nonReentrant returns (address box) {
        if (token == address(0)) revert ZeroAddress();

        address existing = boxForToken[token];
        if (existing != address(0)) revert TokenBoxAlreadyExists(existing);

        box = address(
            new BanmaoBox(token, address(renderer), rendererAdmin)
        );
        boxForToken[token] = box;
        isTokenBox[box] = true;

        emit TokenBoxCreated(token, box, msg.sender);
    }
}
