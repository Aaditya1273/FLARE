// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal FAssets AssetManager interface - only the FXRP token lookup
/// SilentVault needs. Resolved via IFlareContractRegistry, never hardcoded.
interface IAssetManager {
    function fAsset() external view returns (address);
}
