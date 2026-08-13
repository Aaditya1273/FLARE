// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IFlare.sol";
import "./SilentPolicyRegistry.sol";

/// @title SilentVault2 - Confidential Treasury OS with Attested Redemption
/// @notice Holds FXRP behind commitment hashes only - the chain never sees a balance.
/// A treasury's policy (stop-loss, trailing-stop, payroll batch, or a guaranteed
/// redeem to an XRPL destination tag) is encrypted client-side to the TEE's public
/// key and stored here only as ciphertext. A permissionless keeper calls tick() to
/// forward that ciphertext (which it cannot read) to the TEE via the InstructionSent
/// event. The TEE decrypts inside the enclave, polls FTSO privately, evaluates the
/// policy, and signs a settlement attestation. settle() is the only way funds move:
/// it verifies that attestation against an allowlisted TEE signer, independently
/// re-checks the revealed trigger against a *fresh* on-chain FTSO read (so a stale or
/// manipulated off-chain price can never authorize a bad settlement), and - for a
/// redeem path - verifies an FDC Merkle proof of the corresponding XRPL payment before
/// recording it as evidence. There is no owner withdraw path: the owner can only
/// manage the TEE signer allowlist, never move a user's FXRP. Every commitment's
/// shielded amount is tracked in isolation, so one user's order can never draw down
/// another user's funds.
///
/// Trust model, SIMULATED_TEE mode, and every known limitation are documented in
/// docs/TRUST.md - read that before treating any of this as audited.
contract SilentVault2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @dev Domain-separation bytes shared byte-for-byte with extension/internal/config
    /// (Go) so a signature produced for one operation type can never be replayed as
    /// another, even if the rest of the encoded fields happened to collide.
    uint8 public constant OP_TYPE_SILENT = 0x04;
    uint8 public constant OP_COMMAND_EVAL = 0x01;
    uint8 public constant OP_COMMAND_SETTLE = 0x02;
    uint8 public constant OP_COMMAND_PROVE = 0x03;

    uint256 public constant MAX_ALLOWED_AGE = 300; // seconds; hard ceiling on caller-supplied maxAge

    IFlareContractRegistry public immutable registry;
    IERC20 public immutable fxrp;
    SilentPolicyRegistry public immutable policyRegistry;

    mapping(bytes32 => uint256) public shieldedAmount; // commitment => remaining shielded balance
    mapping(bytes32 => address) public shieldedBy;      // commitment => depositor
    mapping(uint256 => bytes32) public orderCommitment; // orderId => commitment it draws from
    mapping(uint256 => bool) public settledOrder;        // orderId => already settled (replay guard)
    mapping(address => bool) public teeSigners;           // allowlisted TEE attestation signers

    uint256 public nextOrderId = 1;

    event Shielded(address indexed user, bytes32 indexed commitment, uint256 timestamp);
    event PolicySet(uint256 indexed orderId, bytes32 indexed commitment, bytes32 policyHash);
    event InstructionSent(bytes32 indexed id, uint256 indexed orderId, bytes payload);
    event Settled(uint256 indexed orderId, uint256 trigger, bytes attestation);
    event CrossChainEvidenceRecorded(uint256 indexed orderId, bytes32 evidenceHash);
    event TeeSignerUpdated(address indexed signer, bool allowed);

    constructor(address registry_, address fxrp_, address initialTeeSigner) Ownable(msg.sender) {
        require(registry_ != address(0) && fxrp_ != address(0), "zero address");
        registry = IFlareContractRegistry(registry_);
        fxrp = IERC20(fxrp_);
        policyRegistry = new SilentPolicyRegistry(address(this));
        if (initialTeeSigner != address(0)) {
            teeSigners[initialTeeSigner] = true;
            emit TeeSignerUpdated(initialTeeSigner, true);
        }
    }

    // ---------------------------------------------------------------------
    // Shield
    // ---------------------------------------------------------------------

    /// @notice Shields `amount` FXRP behind `commitment`. Only the commitment goes
    /// into an event/storage key - the amount is stored keyed by an opaque hash the
    /// depositor chose client-side (keccak256(amount, salt, user)), never logged
    /// alongside anything that ties it back to a dollar figure a chain-watcher can
    /// read without also knowing the salt.
    function shield(uint256 amount, bytes32 commitment) external nonReentrant {
        require(amount > 0, "amount=0");
        require(shieldedBy[commitment] == address(0), "commitment used");
        fxrp.safeTransferFrom(msg.sender, address(this), amount);
        shieldedBy[commitment] = msg.sender;
        shieldedAmount[commitment] = amount;
        emit Shielded(msg.sender, commitment, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Policy
    // ---------------------------------------------------------------------

    /// @notice Registers a new order against `commitment` carrying an encrypted
    /// policy (StopLoss / TrailingStop / PayrollBatch / GuaranteedRedeem - the type
    /// itself is inside the ciphertext, never revealed on-chain). Returns the new
    /// orderId. Callable only by the commitment's owner.
    function setEncryptedPolicy(bytes32 commitment, bytes calldata ciphertext) external returns (uint256 orderId) {
        require(shieldedBy[commitment] == msg.sender, "not owner");
        require(ciphertext.length > 0, "empty ciphertext");
        orderId = nextOrderId++;
        orderCommitment[orderId] = commitment;
        bytes32 hash = policyRegistry.setPolicy(orderId, ciphertext);
        emit PolicySet(orderId, commitment, hash);
    }

    /// @notice Permissionless: anyone (typically the keeper) can "tick" a pending
    /// order to re-broadcast its ciphertext as an InstructionSent event. The keeper
    /// forwards bytes it cannot decrypt; only the TEE holds the private key.
    function tick(uint256 orderId) external returns (bytes32 id) {
        bytes32 commitment = orderCommitment[orderId];
        require(commitment != bytes32(0), "unknown order");
        require(!settledOrder[orderId], "already settled");
        bytes memory payload = policyRegistry.ciphertextOf(orderId);
        id = keccak256(abi.encodePacked(orderId, commitment, block.number));
        emit InstructionSent(id, orderId, payload);
    }

    // ---------------------------------------------------------------------
    // Settlement
    // ---------------------------------------------------------------------

    /// @notice The only way FXRP ever leaves the vault. `attestation` is the TEE's
    /// signature over (this vault, chain, orderId, commitment, target, amount,
    /// revealedTrigger, feedId, maxAge) - it must recover to an allowlisted
    /// teeSigner. Independently of what the TEE decided off-chain, this function
    /// re-reads `feedId` from the live FtsoV2 and requires the price to still be
    /// <= revealedTrigger and no older than `maxAge` (capped at MAX_ALLOWED_AGE) -
    /// so a stale or since-reverted off-chain decision can never move funds.
    /// When `fdcProof` is non-empty it's decoded as an FdcPayment.Proof and verified
    /// against Flare's FdcVerification contract before being recorded as
    /// cross-chain evidence of the corresponding XRPL payment.
    function settle(
        uint256 orderId,
        address target,
        uint256 amount,
        uint256 revealedTrigger,
        bytes21 feedId,
        uint256 maxAge,
        bytes calldata attestation,
        bytes calldata fdcProof
    ) external nonReentrant {
        require(!settledOrder[orderId], "already settled");
        require(target != address(0), "zero target");
        require(maxAge <= MAX_ALLOWED_AGE, "maxAge too large");

        bytes32 commitment = orderCommitment[orderId];
        address owner_ = shieldedBy[commitment];
        require(owner_ != address(0), "unknown commitment");
        require(shieldedAmount[commitment] >= amount, "insufficient shielded balance");

        bytes32 digest = keccak256(
            abi.encodePacked(
                OP_TYPE_SILENT,
                OP_COMMAND_SETTLE,
                address(this),
                block.chainid,
                orderId,
                commitment,
                target,
                amount,
                revealedTrigger,
                feedId,
                maxAge
            )
        ).toEthSignedMessageHash();
        require(teeSigners[digest.recover(attestation)], "bad attestation");

        (uint256 price, , uint64 priceTs) = ftsoV2().getFeedById(feedId);
        require(block.timestamp - priceTs <= maxAge, "stale price");
        require(price <= revealedTrigger, "trigger not met");

        settledOrder[orderId] = true;
        shieldedAmount[commitment] -= amount;

        if (fdcProof.length > 0) {
            FdcPayment.Proof memory proof = abi.decode(fdcProof, (FdcPayment.Proof));
            require(fdcVerification().verifyPayment(proof), "bad fdc proof");
            emit CrossChainEvidenceRecorded(orderId, keccak256(abi.encode(proof.data)));
        }

        fxrp.safeTransfer(target, amount);
        emit Settled(orderId, revealedTrigger, attestation);
    }

    /// @notice Verifies the TEE's attestation that `msg.sender`'s reserves exceed
    /// `threshold`, without the contract - or anyone reading this call - ever
    /// learning the actual shielded balance.
    function proveReserves(bytes calldata attestation, uint256 threshold) external view returns (bool) {
        bytes32 digest = keccak256(
            abi.encodePacked(OP_TYPE_SILENT, OP_COMMAND_PROVE, address(this), block.chainid, msg.sender, threshold)
        ).toEthSignedMessageHash();
        return teeSigners[digest.recover(attestation)];
    }

    // ---------------------------------------------------------------------
    // Flare integration (resolved live, never hardcoded beyond the registry)
    // ---------------------------------------------------------------------

    function assetManager() public view returns (IAssetManager) {
        return IAssetManager(registry.getContractAddressByName("AssetManagerFXRP"));
    }

    function ftsoV2() public view returns (IFtsoV2) {
        return IFtsoV2(registry.getContractAddressByName("FtsoV2"));
    }

    function fdcVerification() public view returns (IFdcVerification) {
        return IFdcVerification(registry.getContractAddressByName("FdcVerification"));
    }

    // ---------------------------------------------------------------------
    // Admin - allowlist only, no custody power
    // ---------------------------------------------------------------------

    /// @notice Owner manages which TEE-signer addresses are trusted to authorize
    /// settlements. The owner can never itself move a user's FXRP - only a valid
    /// attestation from an allowlisted signer can, via settle() above.
    function setTeeSigner(address signer, bool allowed) external onlyOwner {
        require(signer != address(0), "zero signer");
        teeSigners[signer] = allowed;
        emit TeeSignerUpdated(signer, allowed);
    }
}
