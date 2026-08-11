import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const FXRP_COSTON2 = "0x0b6A3645c240605887a5532109323A3E12273dc7";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying to ${network.name} as ${deployer.address}`);

  const teeSigner = process.env.TEE_SIGNER_ADDRESS || deployer.address;

  const PolicyRegistry = await ethers.getContractFactory("SilentPolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  console.log(`SilentPolicyRegistry: ${await policyRegistry.getAddress()}`);

  const Vault = await ethers.getContractFactory("SilentVault");
  const vault = await Vault.deploy(REGISTRY, FXRP_COSTON2, teeSigner);
  await vault.waitForDeployment();
  console.log(`SilentVault: ${await vault.getAddress()}`);

  const out = {
    network: network.name,
    chainId: 114,
    registry: REGISTRY,
    fxrp: FXRP_COSTON2,
    teeSigner,
    silentPolicyRegistry: await policyRegistry.getAddress(),
    silentVault: await vault.getAddress(),
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "coston2.json"), JSON.stringify(out, null, 2));
  console.log("Wrote deployments/coston2.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
