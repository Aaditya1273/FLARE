// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IFlareContractRegistry.sol";

/// @notice Local-test-only stand-in for Flare's real FlareContractRegistry.
contract MockRegistry is IFlareContractRegistry {
    mapping(string => address) private _addresses;

    function setAddress(string calldata name, address addr) external {
        _addresses[name] = addr;
    }

    function getContractAddressByName(string calldata _name) external view returns (address) {
        return _addresses[_name];
    }
}
