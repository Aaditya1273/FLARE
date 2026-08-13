// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Local-test-only stand-in for the FXRP ERC20 token (FAssets-minted XRP).
contract MockUSDT0 is ERC20 {
    constructor() ERC20("Mock FXRP", "FXRP") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
