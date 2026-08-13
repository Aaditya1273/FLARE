// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ITeeExtensionRegistry } from "./interfaces/ITeeExtensionRegistry.sol";
import { ITeeMachineRegistry } from "./interfaces/ITeeMachineRegistry.sol";

/// @title SilentInstructionSender
/// @notice On-chain entry point that dispatches a SILENT policy's ciphertext to a
/// real, FCC-registered TEE via Flare's live FlareTeeManager - the same
/// registry/dispatch path every FCC extension uses. The TEE decrypts and
/// evaluates the policy inside the enclave and returns its decision as the
/// instruction's ActionResult; it never sees plaintext outside the enclave.
///
/// This is deliberately scoped to the decrypt-and-evaluate step only. Actual
/// fund movement still happens through SilentVault2.settle() (contracts/src/),
/// using the same TEE-signed attestation scheme - this contract exists to
/// prove the enclave itself is a real, registered FCC TEE machine rather than
/// only our own custom dispatch path.
///
/// DO NOT MODIFY: constructor, setExtensionId(), _getExtensionId() - this
/// mirrors the scaffold's boilerplate exactly so registration tooling works
/// unmodified.
contract SilentInstructionSender {
    /// @notice Operation type for SILENT policy submissions.
    bytes32 public constant OP_TYPE_SILENT = bytes32("SILENT");

    /// @notice Command for submitting an encrypted policy for evaluation.
    bytes32 public constant OP_COMMAND_SUBMIT_POLICY = bytes32("SUBMIT_POLICY");

    ITeeExtensionRegistry public immutable TEE_EXTENSION_REGISTRY;
    ITeeMachineRegistry public immutable TEE_MACHINE_REGISTRY;

    uint256 private constant FIRST_PUBLIC_EXTENSION_ID = 0x10000;

    uint256 private _extensionId;

    /// @notice Payload for a SUBMIT_POLICY instruction. `ciphertext` is the
    /// same ECIES wire-format ciphertext frontend/lib/ecies.ts /
    /// extension/internal/ecies produce - fixed-size, policy-type-hidden.
    struct SubmitPolicyMessage {
        bytes32 commitment;
        bytes ciphertext;
    }

    constructor(
        ITeeExtensionRegistry _teeExtensionRegistry,
        ITeeMachineRegistry _teeMachineRegistry
    ) {
        require(address(_teeExtensionRegistry) != address(0), "TeeExtensionRegistry cannot be zero address");
        require(address(_teeMachineRegistry) != address(0), "TeeMachineRegistry cannot be zero address");
        require(address(_teeExtensionRegistry).code.length > 0, "TeeExtensionRegistry has no code");
        require(address(_teeMachineRegistry).code.length > 0, "TeeMachineRegistry has no code");
        TEE_EXTENSION_REGISTRY = _teeExtensionRegistry;
        TEE_MACHINE_REGISTRY = _teeMachineRegistry;
    }

    /// @notice Finds and sets this contract's extension id. Can only be set once.
    /// DO NOT MODIFY this function.
    function setExtensionId() external {
        require(_extensionId == 0, "Extension ID already set.");

        uint256 c = TEE_EXTENSION_REGISTRY.nextPublicExtensionId();
        for (uint256 i = FIRST_PUBLIC_EXTENSION_ID; i < c; ++i) {
            if (TEE_EXTENSION_REGISTRY.getTeeExtensionInstructionsSender(i) == address(this)) {
                _extensionId = i;
                return;
            }
        }
        revert("Extension ID not found.");
    }

    /// @notice Dispatches an encrypted policy to a randomly-selected, registered
    /// TEE machine for this extension. The TEE decrypts `ciphertext` inside the
    /// enclave, evaluates it against the live FTSO price, and returns its
    /// decision as the instruction's result - the plaintext policy is never
    /// visible on-chain or to this contract.
    function submitPolicy(bytes32 commitment, bytes calldata ciphertext) external payable {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);

        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_SILENT,
            opCommand: OP_COMMAND_SUBMIT_POLICY,
            message: abi.encode(SubmitPolicyMessage({ commitment: commitment, ciphertext: ciphertext })),
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });

        TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
    }

    /// @notice Returns the cached extension ID, reverting if not yet set.
    function _getExtensionId() internal view returns (uint256) {
        require(_extensionId != 0, "Extension ID is not set.");
        return _extensionId;
    }
}
