// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Stores only the hash of each user's encrypted treasury policy.
/// The plaintext policy (stop-loss trigger / payroll batch) is encrypted client-side
/// to the TEE's public key and only its ciphertext + hash are recorded here -
/// the TEE is the only party that ever decrypts and evaluates it.
contract SilentPolicyRegistry is Ownable {
    struct Policy {
        bytes encryptedPolicy;
        bytes32 policyHash;
        uint256 updatedAt;
    }

    mapping(address => mapping(bytes32 => Policy)) public policies;

    event PolicySet(address indexed user, bytes32 indexed commitment, bytes32 policyHash, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    function setPolicy(bytes32 commitment, bytes calldata encryptedPolicy, bytes32 policyHash) external {
        policies[msg.sender][commitment] = Policy(encryptedPolicy, policyHash, block.timestamp);
        emit PolicySet(msg.sender, commitment, policyHash, block.timestamp);
    }

    function getPolicy(address user, bytes32 commitment) external view returns (bytes memory, bytes32, uint256) {
        Policy storage p = policies[user][commitment];
        return (p.encryptedPolicy, p.policyHash, p.updatedAt);
    }
}
