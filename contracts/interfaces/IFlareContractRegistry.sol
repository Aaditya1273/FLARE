// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Flare's canonical contract registry. Same address on every Flare network.
/// SilentVault resolves AssetManagerFXRP/FtsoV2 through this at call time instead of
/// hardcoding their addresses, since those addresses can change across upgrades.
interface IFlareContractRegistry {
    function getContractAddressByName(string calldata _name) external view returns (address);
}
