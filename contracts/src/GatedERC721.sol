// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";

interface IKYCRegistry721 {
    function isWhitelisted(address user) external view returns (bool);
    function isBlacklisted(address user) external view returns (bool);
}

/// @title ERC721 avec garde KYC on-chain (OZ v5)
/// @notice Bloque mint/transfer/burn si KYC non respectée.
/// Règles:
/// - Blacklist gagne toujours (revert immédiat)
/// - Toute adresse non-zéro impliquée doit être whitelisted:
///   * Mint: `to` doit être whitelist (from == 0)
///   * Transfer: `from` et `to` whitelist
///   * Burn: `from` whitelist (to == 0)
contract GatedERC721 is ERC721, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IKYCRegistry721 public immutable KYC;

    error NotWhitelisted(address user);
    error Blacklisted(address user);

    string private _baseTokenUri;

    constructor(
        string memory name_,
        string memory symbol_,
        address kycRegistry_,
        address admin_,
        string memory baseUri_
    ) ERC721(name_, symbol_) {
        KYC = IKYCRegistry721(kycRegistry_);
        _grantRole(ADMIN_ROLE, admin_);
        _grantRole(MINTER_ROLE, admin_);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _baseTokenUri = baseUri_;
    }

    /// @dev OZ v5 route tous les mouvements via _update(to, tokenId, auth).
    /// On calcule `from` via _ownerOf(tokenId) (address(0) en cas de mint).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        // from = owner courant (0 si mint)
        from = _ownerOf(tokenId);

        // Blacklist (des deux côtés si non-zéro)
        if (from != address(0) && KYC.isBlacklisted(from)) revert Blacklisted(from);
        if (to != address(0) && KYC.isBlacklisted(to)) revert Blacklisted(to);

        // Whitelist (des adresses non-zéro)
        if (from != address(0) && !KYC.isWhitelisted(from)) revert NotWhitelisted(from);
        if (to != address(0) && !KYC.isWhitelisted(to)) revert NotWhitelisted(to);

        // Mouvement réel
        return super._update(to, tokenId, auth);
    }

    /// @notice Mint réservé aux MINTERs (la KYC de `to` est re-checkée dans _update)
    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
    }

    /// @notice Burn par le détenteur ou approuvé (API OZ v5)
    function burn(uint256 tokenId) external {
        // revert si le token n’existe pas
        address owner = _requireOwned(tokenId);
        // équivalent v5 d’_isApprovedOrOwner
        require(_isAuthorized(owner, msg.sender, tokenId), "not owner nor approved");
        _burn(tokenId);
    }

    /// @dev Base URI (facultatif, pratique pour des métadatas simples)
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenUri;
    }

    /// @notice Admin peut mettre à jour le baseURI (optionnel)
    function setBaseUri(string calldata newBaseUri) external onlyRole(ADMIN_ROLE) {
        _baseTokenUri = newBaseUri;
    }

    /// @dev Conflit d’héritage ERC721 + AccessControl: on doit overrider supportsInterface
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
