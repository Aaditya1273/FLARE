import { ethers } from "hardhat";
import deployment from "../deployments/coston2.json";

async function main() {
  const vault = await ethers.getContractAt("SilentVault", deployment.silentVault);
  const newSigner = "0xD7390F7182A7A0C004f50fB27e3b09AA7c82ae68";
  const tx = await vault.setTeeSigner(newSigner);
  await tx.wait();
  console.log("teeSigner updated to", newSigner, "tx:", tx.hash);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
