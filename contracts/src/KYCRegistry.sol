// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title KYC Registry (MVP)
/// @notice Source de vérité on-chain pour la compliance.
/// - WHITELISTED: autorisé à détenir/transférer
/// - BLACKLISTED: interdit, doit bloquer
contract KYCRegistry is Ownable {
    enum Status {
        NONE,
        WHITELISTED,
        BLACKLISTED
    }

    mapping(address => Status) private _status;

    event StatusChanged(address indexed user, Status status);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setStatus(address user, Status status) external onlyOwner {
        _status[user] = status;
        emit StatusChanged(user, status);
    }

    function getStatus(address user) external view returns (Status) {
        return _status[user];
    }

    function isWhitelisted(address user) external view returns (bool) {
        return _status[user] == Status.WHITELISTED;
    }

    function isBlacklisted(address user) external view returns (bool) {
        return _status[user] == Status.BLACKLISTED;
    }
}
