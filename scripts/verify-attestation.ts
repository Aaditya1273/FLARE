// Standalone utility: re-derives the digest SilentVault.settleWithAttestation /
// proveReserves check, and recovers the signer address from a given attestation.
// Usage: npx hardhat run scripts/verify-attestation.ts --network coston2
import { ethers } from "hardhat";

async function main() {
  const commitment = process.env.VERIFY_COMMITMENT;
  const target = process.env.VERIFY_TARGET;
  const amount = process.env.VERIFY_AMOUNT;
  const attestation = process.env.VERIFY_ATTESTATION;

  if (!commitment || !target || !amount || !attestation) {
    console.log(
      "Set VERIFY_COMMITMENT, VERIFY_TARGET, VERIFY_AMOUNT, VERIFY_ATTESTATION env vars to check a settlement attestation."
    );
    return;
  }

  const digest = ethers.keccak256(
    ethers.solidityPacked(["bytes32", "address", "uint256"], [commitment, target, amount])
  );
  const ethDigest = ethers.hashMessage(ethers.getBytes(digest));
  const signer = ethers.recoverAddress(ethDigest, attestation);
  console.log(`Recovered TEE signer: ${signer}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
