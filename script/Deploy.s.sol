// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/src/SilentVault2.sol";

/// @notice Deploys SilentVault2 (and its owned SilentPolicyRegistry) to Coston2.
/// The FlareContractRegistry address is the one constant that's the same on every
/// Flare network - everything else the vault needs (FtsoV2, FdcVerification,
/// AssetManagerFXRP) it resolves live through that registry at call time.
contract DeployScript is Script {
    address constant FLARE_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;
    address constant FXRP_COSTON2 = 0x0b6A3645c240605887a5532109323A3E12273dc7;

    function run() external returns (SilentVault2 vault) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address teeSigner = vm.envAddress("TEE_SIGNER_ADDRESS");

        vm.startBroadcast(deployerKey);
        vault = new SilentVault2(FLARE_REGISTRY, FXRP_COSTON2, teeSigner);
        vm.stopBroadcast();

        console2.log("SilentVault2:", address(vault));
        console2.log("SilentPolicyRegistry:", address(vault.policyRegistry()));
        console2.log("teeSigner:", teeSigner);
    }
}
