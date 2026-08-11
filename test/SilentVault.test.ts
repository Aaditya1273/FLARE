import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SilentVault", function () {
  let deployer: HardhatEthersSigner, user: HardhatEthersSigner, teeSigner: HardhatEthersSigner, other: HardhatEthersSigner;
  let vault: any, fxrp: any, registry: any;

  beforeEach(async () => {
    [deployer, user, teeSigner, other] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    fxrp = await MockERC20.deploy();

    const MockRegistry = await ethers.getContractFactory("MockRegistry");
    registry = await MockRegistry.deploy();

    const Vault = await ethers.getContractFactory("SilentVault");
    vault = await Vault.deploy(await registry.getAddress(), await fxrp.getAddress(), teeSigner.address);

    await fxrp.transfer(user.address, ethers.parseEther("1000"));
  });

  it("shields FXRP behind a commitment and never emits the amount", async () => {
    const amount = ethers.parseEther("100");
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("commit-1"));

    await fxrp.connect(user).approve(await vault.getAddress(), amount);
    const tx = await vault.connect(user).shield(amount, commitment);
    const receipt = await tx.wait();

    const event = receipt!.logs
      .map((l: any) => { try { return vault.interface.parseLog(l); } catch { return null; } })
      .find((l: any) => l?.name === "Shielded");

    expect(event.args.user).to.equal(user.address);
    expect(event.args.commitment).to.equal(commitment);
    expect(event.args).to.not.have.property("amount");

    expect(await vault.shieldedBy(commitment)).to.equal(user.address);
    expect(await fxrp.balanceOf(await vault.getAddress())).to.equal(amount);
  });

  it("stores only the policy hash via setEncryptedPolicy", async () => {
    const amount = ethers.parseEther("50");
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("commit-2"));
    await fxrp.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).shield(amount, commitment);

    const policyHash = ethers.keccak256(ethers.toUtf8Bytes("stop-loss:0.50"));
    await expect(vault.connect(user).setEncryptedPolicy(commitment, policyHash))
      .to.emit(vault, "PolicySet")
      .withArgs(user.address, commitment, policyHash);
  });

  it("rejects settlement with a bad attestation signature", async () => {
    const amount = ethers.parseEther("100");
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("commit-3"));
    await fxrp.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).shield(amount, commitment);

    const digest = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "address", "uint256"], [commitment, other.address, amount])
    );
    const badSig = await other.signMessage(ethers.getBytes(digest)); // signed by wrong key

    await expect(
      vault.connect(user).settleWithAttestation(commitment, badSig, other.address, amount)
    ).to.be.revertedWith("bad attestation");
  });

  it("settles and releases FXRP when the TEE attestation is valid", async () => {
    const amount = ethers.parseEther("100");
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("commit-4"));
    await fxrp.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).shield(amount, commitment);

    const digest = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "address", "uint256"], [commitment, other.address, amount])
    );
    const goodSig = await teeSigner.signMessage(ethers.getBytes(digest));

    await expect(vault.connect(user).settleWithAttestation(commitment, goodSig, other.address, amount))
      .to.emit(vault, "Settled")
      .withArgs(commitment, other.address, amount, ethers.keccak256(goodSig));

    expect(await fxrp.balanceOf(other.address)).to.equal(amount);
  });

  it("proveReserves returns true only for a valid TEE attestation over (caller, threshold)", async () => {
    const threshold = ethers.parseEther("1000000");
    const digest = ethers.keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, threshold]));

    const goodSig = await teeSigner.signMessage(ethers.getBytes(digest));
    const badSig = await other.signMessage(ethers.getBytes(digest));

    expect(await vault.connect(user).proveReserves(goodSig, threshold)).to.equal(true);
    expect(await vault.connect(user).proveReserves(badSig, threshold)).to.equal(false);
  });
});
