// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IFlare.sol";

/// @notice Local-test-only stand-in for Flare's real FtsoV2, with a settable price/timestamp.
contract MockFtsoV2 is IFtsoV2 {
    uint256 public value;
    int8 public decimals = 5;
    uint64 public ts;

    constructor() {
        ts = uint64(block.timestamp);
    }

    function setValue(uint256 _value) external {
        value = _value;
        ts = uint64(block.timestamp);
    }

    /// @dev lets tests simulate a stale feed without warping the whole chain.
    function setValueAt(uint256 _value, uint64 _ts) external {
        value = _value;
        ts = _ts;
    }

    function getFeedById(bytes21) external payable returns (uint256, int8, uint64) {
        return (value, decimals, ts);
    }
}
