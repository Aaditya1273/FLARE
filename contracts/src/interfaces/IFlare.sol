// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Flare's canonical contract registry - same address on every Flare network.
/// SilentVault2 resolves every Flare-provided contract through this at call time
/// instead of hardcoding addresses, since they can change across protocol upgrades.
interface IFlareContractRegistry {
    function getContractAddressByName(string calldata _name) external view returns (address);
}

/// @notice Minimal FtsoV2 read interface - only the feed-by-id lookup SilentVault2
/// needs to re-check price freshness and the trigger condition at settlement time.
/// Resolved via IFlareContractRegistry under the name "FtsoV2", never hardcoded.
interface IFtsoV2 {
    /// @return value    The feed value, scaled by `decimals`
    /// @return decimals  Number of decimals for `value`
    /// @return timestamp Unix timestamp the feed value was last updated
    function getFeedById(bytes21 _feedId)
        external
        payable
        returns (uint256 value, int8 decimals, uint64 timestamp);
}

/// @notice Minimal FAssets AssetManager interface - only the FXRP token lookup
/// SilentVault2 needs. Resolved via IFlareContractRegistry under
/// "AssetManagerFXRP", never hardcoded.
interface IAssetManager {
    function fAsset() external view returns (address);
}

/// @notice Payment attestation shape matching Flare's FDC (Flare Data Connector)
/// `Payment` attestation type: a cross-chain payment (e.g. an XRPL redemption) proven
/// via Merkle proof against the FDC's published Merkle root for the voting round the
/// payment was attested in. Field names/order mirror the real FDC Payment response
/// body; this is the minimal subset SilentVault2 needs to record redeem evidence.
library FdcPayment {
    struct ResponseBody {
        bytes32 standardPaymentReference; // orderId-derived reference tying the XRPL tx to this vault order
        bytes32 receivingAddressHash;     // keccak256 of the XRPL destination (+ destination tag) that was paid
        int256 spentAmount;               // amount debited on the source chain, in the source chain's smallest unit
        int256 receivedAmount;            // amount credited to the receiving address
        uint64 blockTimestamp;            // timestamp of the block containing the payment
        bool isFinal;                     // whether the source-chain payment is considered final
    }

    struct Response {
        bytes32 attestationType;
        bytes32 sourceId;      // e.g. keccak256("XRP") - which source chain this proof is for
        uint64 votingRound;
        ResponseBody responseBody;
    }

    struct Proof {
        bytes32[] merkleProof;
        Response data;
    }
}

/// @notice Flare's FdcVerification contract: verifies a Payment.Proof against the
/// Merkle root Flare's data connector published for that attestation's voting round.
/// Resolved via IFlareContractRegistry under "FdcVerification", never hardcoded.
interface IFdcVerification {
    function verifyPayment(FdcPayment.Proof calldata _proof) external view returns (bool _proved);
}
