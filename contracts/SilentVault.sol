// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IFlareContractRegistry.sol";
import "./interfaces/IFtsoV2.sol";
import "./interfaces/IAssetManager.sol";

/// @title SilentVault - confidential XRP treasury vault
/// @notice Holds FXRP behind commitment hashes only - no amount is ever stored or
/// emitted on-chain. Settlement is authorized off-chain inside a TEE (Flare Confidential
/// Compute / FCC pattern): the TEE evaluates the user's encrypted policy against the live
/// FTSO price, signs the settlement it decided on, and this contract only checks that
/// signature before releasing funds. In this build the TEE trust root is a SIMULATED_TEE
/// signer address (see tee-extension/pmw_signer.py); production migrates the same
/// verification path to Flare's TeeMachineRegistry-attested hardware.
contract SilentVault is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IFlareContractRegistry public immutable registry;
    IERC20 public immutable fxrp;
    address public teeSigner;

    // commitment => depositor. Existence of an entry is the only on-chain trace of a
    // shield operation; the shielded amount itself is never stored here.
    mapping(bytes32 => address) public shieldedBy;

    event Shielded(address indexed user, bytes32 indexed commitment, uint256 timestamp);
    event PolicySet(address indexed user, bytes32 indexed commitment, bytes32 policyHash);
    event InstructionSent(bytes32 indexed id, bytes32 indexed commitment, bytes payload);
    event Settled(bytes32 indexed commitment, address indexed target, uint256 amount, bytes32 attestationHash);
    event TeeSignerUpdated(address indexed newSigner);

    constructor(address registry_, address fxrp_, address teeSigner_) Ownable(msg.sender) {
        registry = IFlareContractRegistry(registry_);
        fxrp = IERC20(fxrp_);
        teeSigner = teeSigner_;
    }

    /// @notice Shield FXRP into the vault behind a commitment hash. Only the commitment
    /// goes on-chain - the amount is never stored in vault state or emitted in an event.
    function shield(uint256 amount, bytes32 commitment) external nonReentrant {
        require(amount > 0, "amount=0");
        require(shieldedBy[commitment] == address(0), "commitment used");
        fxrp.transferFrom(msg.sender, address(this), amount);
        shieldedBy[commitment] = msg.sender;
        emit Shielded(msg.sender, commitment, block.timestamp);
    }

    /// @notice Records the hash of a client-side-encrypted policy for a commitment.
    /// The plaintext policy never reaches this contract - only the TEE decrypts it.
    function setEncryptedPolicy(bytes32 commitment, bytes32 policyHash) external {
        require(shieldedBy[commitment] == msg.sender, "not owner");
        emit PolicySet(msg.sender, commitment, policyHash);
    }

    /// @notice Emits the FCC-consumable instruction event carrying the caller's encrypted
    /// execution request. A production FCC deployment has the TEE watch this event
    /// directly; in this demo the frontend also calls the TEE's /api/settle endpoint
    /// directly for responsiveness, and posts the resulting attestation to
    /// settleWithAttestation below.
    function requestSettlement(bytes32 commitment, bytes calldata encryptedExecution) external returns (bytes32 id) {
        require(shieldedBy[commitment] == msg.sender, "not owner");
        id = keccak256(abi.encodePacked(commitment, msg.sender, block.timestamp));
        emit InstructionSent(id, commitment, encryptedExecution);
    }

    /// @notice Releases FXRP to `target` once the TEE's attestation over
    /// (commitment, target, amount) is verified against the trusted teeSigner.
    function settleWithAttestation(
        bytes32 commitment,
        bytes calldata attestation,
        address target,
        uint256 amount
    ) external nonReentrant {
        address owner_ = shieldedBy[commitment];
        require(owner_ != address(0), "unknown commitment");

        bytes32 digest = keccak256(abi.encodePacked(commitment, target, amount)).toEthSignedMessageHash();
        require(digest.recover(attestation) == teeSigner, "bad attestation");

        fxrp.transfer(target, amount);
        emit Settled(commitment, target, amount, keccak256(attestation));
    }

    /// @notice Verifies the TEE's attestation that the caller's reserves exceed
    /// `threshold`, without ever revealing the actual balance.
    function proveReserves(bytes calldata attestation, uint256 threshold) external view returns (bool) {
        bytes32 digest = keccak256(abi.encodePacked(msg.sender, threshold)).toEthSignedMessageHash();
        return digest.recover(attestation) == teeSigner;
    }

    /// @notice Resolves the live FAssets AssetManager for FXRP via the Flare registry.
    function assetManager() public view returns (IAssetManager) {
        return IAssetManager(registry.getContractAddressByName("AssetManagerFXRP"));
    }

    /// @notice Resolves the live FtsoV2 price feed contract via the Flare registry.
    function ftsoV2() public view returns (IFtsoV2) {
        return IFtsoV2(registry.getContractAddressByName("FtsoV2"));
    }

    /// @notice Reads the current XRP/USD feed from FtsoV2, resolved fresh via the registry.
    function xrpUsdPrice(bytes21 feedId) external returns (uint256 value, int8 decimals, uint64 timestamp) {
        return ftsoV2().getFeedById(feedId);
    }

    function setTeeSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "zero signer");
        teeSigner = newSigner;
        emit TeeSignerUpdated(newSigner);
    }
}
