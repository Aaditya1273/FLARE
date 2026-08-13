// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IFlare.sol";

/// @notice Local-test-only stand-in for Flare's real FdcVerification contract.
/// Instead of checking a Merkle proof against a published round root, the test
/// operator just flips a per-reference bool - lets tests exercise the vault's
/// FDC-consuming code path without reimplementing Merkle proof verification.
contract MockFdcVerification is IFdcVerification {
    mapping(bytes32 => bool) public valid;

    function setValid(bytes32 standardPaymentReference, bool ok) external {
        valid[standardPaymentReference] = ok;
    }

    function verifyPayment(FdcPayment.Proof calldata _proof) external view returns (bool) {
        return valid[_proof.data.responseBody.standardPaymentReference];
    }
}
