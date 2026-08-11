// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal FtsoV2 read interface - only the feed-by-id lookup SilentVault needs
/// to check XRP/USD price during settlement. Resolved via IFlareContractRegistry, never hardcoded.
interface IFtsoV2 {
    /// @return value The feed value
    /// @return decimals Number of decimals for value
    /// @return timestamp Timestamp of the last update
    function getFeedById(bytes21 _feedId)
        external
        payable
        returns (uint256 value, int8 decimals, uint64 timestamp);
}
