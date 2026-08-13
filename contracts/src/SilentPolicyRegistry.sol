// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SilentPolicyRegistry
/// @notice Storage-only satellite to SilentVault2: holds each order's encrypted policy
/// ciphertext and its hash. Split out from the vault so the fund-custody contract and
/// the policy-storage contract can be reasoned about (and audited) independently -
/// a bug in policy storage can never touch FXRP custody. Write access is restricted to
/// the one SilentVault2 that deploys/owns this registry.
contract SilentPolicyRegistry {
    address public immutable vault;

    mapping(uint256 => bytes) private _ciphertext;
    mapping(uint256 => bytes32) public policyHash;

    modifier onlyVault() {
        require(msg.sender == vault, "not vault");
        _;
    }

    constructor(address vault_) {
        require(vault_ != address(0), "zero vault");
        vault = vault_;
    }

    /// @notice Stores the encrypted policy for `orderId`. Only ever called by
    /// SilentVault2.setEncryptedPolicy - the plaintext policy never reaches this
    /// contract, or any contract; only the TEE ever decrypts it.
    function setPolicy(uint256 orderId, bytes calldata ciphertext) external onlyVault returns (bytes32 hash) {
        hash = keccak256(ciphertext);
        _ciphertext[orderId] = ciphertext;
        policyHash[orderId] = hash;
    }

    /// @notice Returns the raw ciphertext for `orderId` so SilentVault2.tick() can
    /// forward it in an InstructionSent event for the keeper/TEE to pick up.
    function ciphertextOf(uint256 orderId) external view returns (bytes memory) {
        return _ciphertext[orderId];
    }
}
