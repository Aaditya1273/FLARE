import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Same FlareContractRegistry address on every Flare network.
const REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

async function main() {
  const fxrp = process.env.SONGBIRD_FXRP_ADDRESS;
  if (!fxrp) {
    throw new Error("Set SONGBIRD_FXRP_ADDRESS in .env before deploying to Songbird");
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying to ${network.name} as ${deployer.address}`);

  const teeSigner = process.env.TEE_SIGNER_ADDRESS || deployer.address;

  const PolicyRegistry = await ethers.getContractFactory("SilentPolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  console.log(`SilentPolicyRegistry: ${await policyRegistry.getAddress()}`);

  const Vault = await ethers.getContractFactory("SilentVault");
  const vault = await Vault.deploy(REGISTRY, fxrp, teeSigner);
  await vault.waitForDeployment();
  console.log(`SilentVault: ${await vault.getAddress()}`);

  const out = {
    network: network.name,
    chainId: 19,
    registry: REGISTRY,
    fxrp,
    teeSigner,
    silentPolicyRegistry: await policyRegistry.getAddress(),
    silentVault: await vault.getAddress(),
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "songbird.json"), JSON.stringify(out, null, 2));
  console.log("Wrote deployments/songbird.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
