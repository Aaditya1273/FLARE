// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IFtsoV2.sol";

/// @notice Local-test-only stand-in for Flare's real FtsoV2, with a settable price.
contract MockFtsoV2 is IFtsoV2 {
    uint256 public value;
    int8 public decimals = 5;

    function setValue(uint256 _value) external {
        value = _value;
    }

    function getFeedById(bytes21) external payable returns (uint256, int8, uint64) {
        return (value, decimals, uint64(block.timestamp));
    }
}
