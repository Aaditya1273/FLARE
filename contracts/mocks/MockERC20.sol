// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Local-test-only stand-in for the FXRP ERC20 token.
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock FXRP", "FXRP") {
        _mint(msg.sender, 1_000_000 ether);
    }
}
