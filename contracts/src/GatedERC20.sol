// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";

interface IKYCRegistry {
    enum Status {
        NONE,
        WHITELISTED,
        BLACKLISTED
    }

    function isWhitelisted(address user) external view returns (bool);
    function isBlacklisted(address user) external view returns (bool);
}

/// @title ERC20 avec garde KYC on-chain (OZ v5)
/// @notice Bloque transferts/mint/burn si KYC non respectée.
contract GatedERC20 is ERC20, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IKYCRegistry public immutable KYC;

    error NotWhitelisted(address user);
    error Blacklisted(address user);

    constructor(string memory name_, string memory symbol_, address kycRegistry_, address admin_)
        ERC20(name_, symbol_)
    {
        KYC = IKYCRegistry(kycRegistry_);
        _grantRole(ADMIN_ROLE, admin_);
        _grantRole(MINTER_ROLE, admin_);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
    }

    /// @dev OZ v5 route tous les mouvements via _update(from, to, value)
    function _update(address from, address to, uint256 value) internal override {
        // blocage blacklist des deux côtés (sauf zéro)
        if (from != address(0) && KYC.isBlacklisted(from)) revert Blacklisted(from);
        if (to != address(0) && KYC.isBlacklisted(to)) revert Blacklisted(to);

        // whitelisting
        // - transfert classique: from & to doivent être whitelisted
        // - mint: 'to' doit être whitelisted (from == 0)
        // - burn: 'from' doit être whitelisted (to == 0)
        if (from != address(0) && !KYC.isWhitelisted(from)) revert NotWhitelisted(from);
        if (to != address(0) && !KYC.isWhitelisted(to)) revert NotWhitelisted(to);

        super._update(from, to, value);
    }

    /// @notice Mint restreint aux MINTERs et aux destinataires whitelisted (enforced aussi dans _update)
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Burn volontaire du détenteur
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
