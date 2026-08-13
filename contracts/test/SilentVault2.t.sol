// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../src/SilentVault2.sol";
import "../src/SilentPolicyRegistry.sol";
import "../src/interfaces/IFlare.sol";
import "../src/mocks/MockUSDT0.sol";
import "../src/mocks/MockRegistry.sol";
import "../src/mocks/MockFtsoV2.sol";
import "../src/mocks/MockFdcVerification.sol";

contract SilentVault2Test is Test {
    SilentVault2 vault;
    MockUSDT0 fxrp;
    MockRegistry registry;
    MockFtsoV2 ftso;
    MockFdcVerification fdcVerification;

    uint256 teePk = 0xA11CE;
    address teeSigner;
    uint256 otherPk = 0xBAD;

    address user = address(0xBEEF);
    address payee = address(0xCAFE);

    bytes21 constant FEED_XRP_USD = bytes21(0x015852502f55534400000000000000000000000000);

    function setUp() public {
        teeSigner = vm.addr(teePk);

        fxrp = new MockUSDT0();
        registry = new MockRegistry();
        ftso = new MockFtsoV2();
        fdcVerification = new MockFdcVerification();

        registry.setAddress("FtsoV2", address(ftso));
        registry.setAddress("FdcVerification", address(fdcVerification));
        registry.setAddress("AssetManagerFXRP", address(fxrp));

        vault = new SilentVault2(address(registry), address(fxrp), teeSigner);

        fxrp.transfer(user, 10_000 ether);
        vm.prank(user);
        fxrp.approve(address(vault), type(uint256).max);

        ftso.setValue(40_000); // price = 0.40000 (5 decimals) by default
    }

    // ---------------------------------------------------------------
    // shield
    // ---------------------------------------------------------------

    function test_shield_storesCommitmentAndPullsFunds() public {
        bytes32 commitment = keccak256("c1");
        vm.prank(user);
        vault.shield(1_000 ether, commitment);

        assertEq(vault.shieldedAmount(commitment), 1_000 ether);
        assertEq(vault.shieldedBy(commitment), user);
        assertEq(fxrp.balanceOf(address(vault)), 1_000 ether);
    }

    function test_shield_revertsOnZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(bytes("amount=0"));
        vault.shield(0, keccak256("c2"));
    }

    function test_shield_revertsOnReusedCommitment() public {
        bytes32 commitment = keccak256("c3");
        vm.startPrank(user);
        vault.shield(100 ether, commitment);
        vm.expectRevert(bytes("commitment used"));
        vault.shield(100 ether, commitment);
        vm.stopPrank();
    }

    function test_shield_emitsEvent() public {
        bytes32 commitment = keccak256("c4");
        vm.prank(user);
        vm.expectEmit(true, true, false, false, address(vault));
        emit SilentVault2.Shielded(user, commitment, block.timestamp);
        vault.shield(50 ether, commitment);
    }

    // ---------------------------------------------------------------
    // setEncryptedPolicy / tick
    // ---------------------------------------------------------------

    function _shielded(bytes32 commitment, uint256 amount) internal returns (bytes32) {
        vm.prank(user);
        vault.shield(amount, commitment);
        return commitment;
    }

    function test_setEncryptedPolicy_createsOrder() public {
        bytes32 commitment = _shielded(keccak256("p1"), 500 ether);
        vm.prank(user);
        uint256 orderId = vault.setEncryptedPolicy(commitment, hex"aabbcc");

        assertEq(orderId, 1);
        assertEq(vault.orderCommitment(orderId), commitment);
        assertEq(vault.policyRegistry().policyHash(orderId), keccak256(hex"aabbcc"));
    }

    function test_setEncryptedPolicy_revertsIfNotOwner() public {
        bytes32 commitment = _shielded(keccak256("p2"), 500 ether);
        vm.expectRevert(bytes("not owner"));
        vault.setEncryptedPolicy(commitment, hex"aabbcc");
    }

    function test_setEncryptedPolicy_revertsOnEmptyCiphertext() public {
        bytes32 commitment = _shielded(keccak256("p3"), 500 ether);
        vm.prank(user);
        vm.expectRevert(bytes("empty ciphertext"));
        vault.setEncryptedPolicy(commitment, hex"");
    }

    function test_tick_emitsInstructionSent() public {
        bytes32 commitment = _shielded(keccak256("p4"), 500 ether);
        vm.prank(user);
        uint256 orderId = vault.setEncryptedPolicy(commitment, hex"aabbcc");

        vm.expectEmit(false, true, false, true, address(vault));
        emit SilentVault2.InstructionSent(bytes32(0), orderId, hex"aabbcc");
        vault.tick(orderId);
    }

    function test_tick_revertsOnUnknownOrder() public {
        vm.expectRevert(bytes("unknown order"));
        vault.tick(999);
    }

    // ---------------------------------------------------------------
    // settle
    // ---------------------------------------------------------------

    struct SettleParams {
        uint256 orderId;
        address target;
        uint256 amount;
        uint256 trigger;
        bytes21 feedId;
        uint256 maxAge;
    }

    function _digest(SettleParams memory p, bytes32 commitment) internal view returns (bytes32) {
        bytes32 inner = keccak256(
            abi.encodePacked(
                vault.OP_TYPE_SILENT(),
                vault.OP_COMMAND_SETTLE(),
                address(vault),
                block.chainid,
                p.orderId,
                commitment,
                p.target,
                p.amount,
                p.trigger,
                p.feedId,
                p.maxAge
            )
        );
        return MessageHashUtils.toEthSignedMessageHash(inner);
    }

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _openOrder(uint256 amount) internal returns (bytes32 commitment, uint256 orderId) {
        commitment = keccak256(abi.encodePacked("order", amount, block.timestamp, gasleft()));
        _shielded(commitment, amount);
        vm.prank(user);
        orderId = vault.setEncryptedPolicy(commitment, hex"aabbcc");
    }

    function test_settle_happyPath_transfersFundsAndEmits() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");

        assertEq(fxrp.balanceOf(payee), 300 ether);
        assertEq(vault.shieldedAmount(commitment), 700 ether);
        assertTrue(vault.settledOrder(orderId));
    }

    function test_settle_revertsOnStalePrice() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        ftso.setValueAt(40_000, uint64(block.timestamp));
        vm.warp(block.timestamp + 301);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectRevert(bytes("stale price"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_revertsOnTriggerNotMet() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        ftso.setValue(60_000); // price above trigger
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectRevert(bytes("trigger not met"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_revertsOnBadAttestation() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(otherPk, _digest(p, commitment)); // wrong signer

        vm.expectRevert(bytes("bad attestation"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_revertsOnReplay() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");

        vm.expectRevert(bytes("already settled"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_revertsOnInsufficientShieldedBalance() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(100 ether);
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectRevert(bytes("insufficient shielded balance"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_revertsOnMaxAgeTooLarge() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 301);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectRevert(bytes("maxAge too large"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_revertsOnUnknownOrder() public {
        SettleParams memory p = SettleParams(9999, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, bytes32(0)));

        vm.expectRevert(bytes("unknown commitment"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_revertsOnZeroTarget() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        SettleParams memory p = SettleParams(orderId, address(0), 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectRevert(bytes("zero target"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }

    function test_settle_partialSettlement_leavesRemainder() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        SettleParams memory p = SettleParams(orderId, payee, 250 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");

        assertEq(vault.shieldedAmount(commitment), 750 ether);
    }

    function test_settle_payrollBatch_multipleOrdersSameCommitment() public {
        bytes32 commitment = keccak256("payroll");
        _shielded(commitment, 1_000 ether);

        vm.startPrank(user);
        uint256 order1 = vault.setEncryptedPolicy(commitment, hex"01");
        uint256 order2 = vault.setEncryptedPolicy(commitment, hex"02");
        vm.stopPrank();

        address payeeA = address(0xA1);
        address payeeB = address(0xA2);

        SettleParams memory p1 = SettleParams(order1, payeeA, 400 ether, 50_000, FEED_XRP_USD, 300);
        vault.settle(p1.orderId, p1.target, p1.amount, p1.trigger, p1.feedId, p1.maxAge, _sign(teePk, _digest(p1, commitment)), hex"");

        SettleParams memory p2 = SettleParams(order2, payeeB, 300 ether, 50_000, FEED_XRP_USD, 300);
        vault.settle(p2.orderId, p2.target, p2.amount, p2.trigger, p2.feedId, p2.maxAge, _sign(teePk, _digest(p2, commitment)), hex"");

        assertEq(fxrp.balanceOf(payeeA), 400 ether);
        assertEq(fxrp.balanceOf(payeeB), 300 ether);
        assertEq(vault.shieldedAmount(commitment), 300 ether);
    }

    function test_settle_trailingStop_lowerTriggerAfterHighWatermark() public {
        // Trailing-stop math (the high-watermark itself) lives inside the TEE - the
        // chain only ever sees the final revealed trigger it's asked to re-check.
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        ftso.setValue(45_000); // price fell from a peak, but still <= the revealed trailing trigger
        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 46_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
        assertEq(fxrp.balanceOf(payee), 300 ether);
    }

    // ---------------------------------------------------------------
    // FDC (guaranteed redeem)
    // ---------------------------------------------------------------

    function _fdcProof(bytes32 ref) internal view returns (bytes memory) {
        FdcPayment.Proof memory proof;
        proof.data.attestationType = "Payment";
        proof.data.sourceId = "XRP";
        proof.data.votingRound = 1;
        proof.data.responseBody.standardPaymentReference = ref;
        proof.data.responseBody.receivingAddressHash = keccak256("rXRPLDestination");
        proof.data.responseBody.spentAmount = 300;
        proof.data.responseBody.receivedAmount = 300;
        proof.data.responseBody.blockTimestamp = uint64(block.timestamp);
        proof.data.responseBody.isFinal = true;
        return abi.encode(proof);
    }

    function test_settle_withFdcProof_recordsEvidence() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        bytes32 ref = keccak256("xrpl-redeem-ref");
        fdcVerification.setValid(ref, true);

        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectEmit(true, false, false, false, address(vault));
        emit SilentVault2.CrossChainEvidenceRecorded(orderId, bytes32(0));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, _fdcProof(ref));
    }

    function test_settle_revertsOnBadFdcProof() public {
        (bytes32 commitment, uint256 orderId) = _openOrder(1_000 ether);
        bytes32 ref = keccak256("unregistered-ref"); // never marked valid in the mock

        SettleParams memory p = SettleParams(orderId, payee, 300 ether, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectRevert(bytes("bad fdc proof"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, _fdcProof(ref));
    }

    // ---------------------------------------------------------------
    // proveReserves
    // ---------------------------------------------------------------

    function test_proveReserves_validAttestation() public {
        bytes32 inner = keccak256(
            abi.encodePacked(vault.OP_TYPE_SILENT(), vault.OP_COMMAND_PROVE(), address(vault), block.chainid, user, uint256(1_000_000))
        );
        bytes memory attestation = _sign(teePk, MessageHashUtils.toEthSignedMessageHash(inner));

        vm.prank(user);
        assertTrue(vault.proveReserves(attestation, 1_000_000));
    }

    function test_proveReserves_invalidAttestation() public {
        bytes32 inner = keccak256(
            abi.encodePacked(vault.OP_TYPE_SILENT(), vault.OP_COMMAND_PROVE(), address(vault), block.chainid, user, uint256(1_000_000))
        );
        bytes memory attestation = _sign(otherPk, MessageHashUtils.toEthSignedMessageHash(inner));

        vm.prank(user);
        assertFalse(vault.proveReserves(attestation, 1_000_000));
    }

    // ---------------------------------------------------------------
    // admin
    // ---------------------------------------------------------------

    function test_setTeeSigner_onlyOwner() public {
        vm.prank(user);
        vm.expectRevert();
        vault.setTeeSigner(address(0x1234), true);
    }

    function test_setTeeSigner_addAndRemove() public {
        address newSigner = address(0x1234);
        vault.setTeeSigner(newSigner, true);
        assertTrue(vault.teeSigners(newSigner));
        vault.setTeeSigner(newSigner, false);
        assertFalse(vault.teeSigners(newSigner));
    }

    function test_noOwnerWithdrawFunction() public {
        // SilentVault2 must expose no owner-gated fund-movement path - settle() is
        // the only way funds leave, and it requires a valid TEE attestation.
        bytes32 commitment = _shielded(keccak256("iso"), 100 ether);
        // solhint-disable-next-line avoid-low-level-calls
        (bool ok, ) = address(vault).call(abi.encodeWithSignature("withdraw(address,uint256)", payee, 100 ether));
        assertFalse(ok);
        assertEq(vault.shieldedAmount(commitment), 100 ether);
    }

    // ---------------------------------------------------------------
    // fuzz
    // ---------------------------------------------------------------

    function testFuzz_shield_pullsExactAmount(uint96 amount) public {
        vm.assume(amount > 0 && amount <= 10_000 ether);
        bytes32 commitment = keccak256(abi.encodePacked("fuzz-shield", amount));
        vm.prank(user);
        vault.shield(amount, commitment);
        assertEq(vault.shieldedAmount(commitment), amount);
    }

    function testFuzz_settle_neverExceedsShieldedBalance(uint96 total, uint96 spend) public {
        vm.assume(total > 0 && total <= 5_000 ether);
        vm.assume(spend > total);
        (bytes32 commitment, uint256 orderId) = _openOrder(total);
        SettleParams memory p = SettleParams(orderId, payee, spend, 50_000, FEED_XRP_USD, 300);
        bytes memory attestation = _sign(teePk, _digest(p, commitment));

        vm.expectRevert(bytes("insufficient shielded balance"));
        vault.settle(p.orderId, p.target, p.amount, p.trigger, p.feedId, p.maxAge, attestation, hex"");
    }
}
