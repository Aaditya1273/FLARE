// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAssetManager.sol";

/// @notice Local-test-only stand-in for Flare's real AssetManagerFXRP.
contract MockAssetManager is IAssetManager {
    address private immutable _fAsset;

    constructor(address fAsset_) {
        _fAsset = fAsset_;
    }

    function fAsset() external view returns (address) {
        return _fAsset;
    }
}
