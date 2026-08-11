"""
SIMULATED Protocol Managed Wallet (PMW) signer.

Flare's real PMW is a k-of-n TEE-held keyset that cross-chain-signs settlement
transactions (XRPL redemptions, FXRP transfers) without any single party ever holding
the full key. That infrastructure isn't publicly reachable yet (flare.md lists PMW as
"in development"), so this module simulates it with a single locally-generated ECDSA
keypair that implements the same interface: sign(payload) -> (signature, tee_id).

Migration path to production: swap `_get_or_create_key()` for a call into Flare's PMW
API (or TeeMachineRegistry-attested remote signer) and everything downstream -
attestation format, on-chain verification in SilentVault.sol - stays identical, since
the contract already only checks a signature against a configured `teeSigner` address.
"""

import os
from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import keccak

_KEY_PATH = os.path.join(os.path.dirname(__file__), ".tee_key")


def _get_or_create_key() -> "Account":
    if os.path.exists(_KEY_PATH):
        with open(_KEY_PATH) as f:
            pk = f.read().strip()
    else:
        pk = Account.create().key.hex()
        with open(_KEY_PATH, "w") as f:
            f.write(pk)
        os.chmod(_KEY_PATH, 0o600)
    return Account.from_key(pk)


_account = _get_or_create_key()

TEE_ID = _account.address


def _pack_address(addr: str) -> bytes:
    return bytes.fromhex(addr.lower().removeprefix("0x").zfill(40))


def _pack_bytes32(value: str) -> bytes:
    return bytes.fromhex(value.lower().removeprefix("0x").zfill(64))


def _sign_digest(digest: bytes) -> str:
    """Signs a raw digest the same way SilentVault.sol expects: EIP-191
    personal-sign prefix over the digest, ECDSA-recoverable on-chain."""
    signable = encode_defunct(primitive=digest)
    signed = _account.sign_message(signable)
    return "0x" + signed.signature.hex()


def sign_settlement(commitment: str, target: str, amount: int) -> str:
    """Matches SilentVault.settleWithAttestation's digest:
    keccak256(abi.encodePacked(commitment, target, amount))."""
    digest = keccak(_pack_bytes32(commitment) + _pack_address(target) + amount.to_bytes(32, "big"))
    return _sign_digest(digest)


def sign_reserves(user_address: str, threshold: int) -> str:
    """Matches SilentVault.proveReserves's digest:
    keccak256(abi.encodePacked(msg.sender, threshold))."""
    digest = keccak(_pack_address(user_address) + threshold.to_bytes(32, "big"))
    return _sign_digest(digest)


def sign_result_attestation(result: bytes) -> str:
    """General TEE attestation over an arbitrary off-chain result, per CLAUDE.md's
    /api/settle spec: attestation = sign(keccak(result + teeId))."""
    digest = keccak(result + bytes.fromhex(TEE_ID.removeprefix("0x")))
    return _sign_digest(digest)


def _demo() -> None:
    sig = sign_settlement("0x" + "11" * 32, "0x" + "22" * 20, 1000)
    assert sig.startswith("0x") and len(sig) == 2 + 65 * 2

    from eth_account.messages import encode_defunct as _ed

    digest = keccak(_pack_bytes32("0x" + "11" * 32) + _pack_address("0x" + "22" * 20) + (1000).to_bytes(32, "big"))
    recovered = Account.recover_message(_ed(primitive=digest), signature=sig)
    assert recovered == TEE_ID

    print(f"pmw_signer self-check OK, TEE_ID={TEE_ID}")


if __name__ == "__main__":
    _demo()
