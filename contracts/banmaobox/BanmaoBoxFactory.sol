// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {BanmaoBox} from "./BanmaoBox.sol";
import {IBanmaoBoxRenderer} from "./BanmaoBoxRenderer.sol";

/**
 * @title BanmaoBoxFactory
 * @notice Permissionlessly deploys one immutable BanmaoBox collection per ERC-20.
 * @dev The factory has no owner, upgrade path, custody, or authority over boxes.
 *      Each collection is a full non-proxy deployment permanently bound to its
 *      underlying token and the immutable renderer configured here.
 */
contract BanmaoBoxFactory is ReentrancyGuard {
    using ERC165Checker for address;

    IBanmaoBoxRenderer public immutable renderer;

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
            )
        ) {
            revert InvalidRenderer();
        }
        renderer = IBanmaoBoxRenderer(rendererAddress);
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

        box = address(new BanmaoBox(token, address(renderer)));
        boxForToken[token] = box;
        isTokenBox[box] = true;

        emit TokenBoxCreated(token, box, msg.sender);
    }
}
