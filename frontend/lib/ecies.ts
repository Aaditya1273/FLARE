// Client-side ECIES: encrypts a private policy to the TEE's public key before
// it ever leaves the browser. Scheme: secp256k1 ECDH -> HKDF-SHA256 ->
// AES-256-GCM (Web Crypto). This is the exact same construction
// extension/internal/ecies/decrypt.go implements in Go, chosen specifically
// so both sides can be verified byte-for-byte against each other instead of
// trusting an unverified reimplementation of a third-party wire format.
// Every policy is padded to a fixed 256-byte frame before encryption, so
// on-chain ciphertext length never reveals which of the 4 policy types was
// sent - see docs/TRUST.md.
import { secp256k1 } from "@noble/curves/secp256k1";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

export const PLAINTEXT_SIZE = 2048;
const HKDF_INFO = new TextEncoder().encode("SILENT-ECIES-v1");
const NONCE_SIZE = 12;
const PUBKEY_SIZE = 65;

function pad(payload: Uint8Array): Uint8Array {
  if (payload.length + 2 > PLAINTEXT_SIZE) {
    throw new Error("ecies: policy payload exceeds padded frame size");
  }
  const frame = new Uint8Array(PLAINTEXT_SIZE);
  new DataView(frame.buffer).setUint16(0, payload.length, false);
  frame.set(payload, 2);
  return frame;
}

function unpad(frame: Uint8Array): Uint8Array {
  if (frame.length !== PLAINTEXT_SIZE) throw new Error("ecies: unexpected frame size");
  const n = new DataView(frame.buffer, frame.byteOffset).getUint16(0, false);
  return frame.slice(2, 2 + n);
}

async function deriveKey(sharedX: Uint8Array): Promise<CryptoKey> {
  const keyBytes = hkdf(sha256, sharedX, undefined, HKDF_INFO, 32);
  return crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return ("0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

/// Encrypts `payload` (a JSON-stringified policy) to `teePubKeyHex` (65-byte
/// uncompressed secp256k1 public key, 0x-hex). Returns the wire-format
/// ciphertext SilentVault2.setEncryptedPolicy stores as opaque bytes.
export async function encryptToTee(payload: object, teePubKeyHex: string): Promise<`0x${string}`> {
  const plaintext = pad(new TextEncoder().encode(JSON.stringify(payload)));
  const teePub = hexToBytes(teePubKeyHex);

  const ephemeralPriv = secp256k1.utils.randomPrivateKey();
  const ephemeralPub = secp256k1.getPublicKey(ephemeralPriv, false); // uncompressed, 65 bytes

  const shared = secp256k1.getSharedSecret(ephemeralPriv, teePub, false); // uncompressed point
  const sharedX = shared.slice(1, 33); // drop 0x04 prefix, take X coordinate only

  const key = await deriveKey(sharedX);
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, plaintext as BufferSource));

  const out = new Uint8Array(PUBKEY_SIZE + NONCE_SIZE + sealed.length);
  out.set(ephemeralPub, 0);
  out.set(nonce, PUBKEY_SIZE);
  out.set(sealed, PUBKEY_SIZE + NONCE_SIZE);
  return bytesToHex(out);
}

/// Decrypts a ciphertext produced by encryptToTee with the holder's own
/// private key. Exposed for test-vector conformance against the Go side -
/// not used in the shield/policy flow itself (only the TEE ever decrypts a
/// live policy).
export async function decryptWithPrivateKey(ciphertextHex: string, privKeyHex: string): Promise<object> {
  const ct = hexToBytes(ciphertextHex);
  const ephemeralPub = ct.slice(0, PUBKEY_SIZE);
  const nonce = ct.slice(PUBKEY_SIZE, PUBKEY_SIZE + NONCE_SIZE);
  const sealed = ct.slice(PUBKEY_SIZE + NONCE_SIZE);

  const priv = hexToBytes(privKeyHex);
  const shared = secp256k1.getSharedSecret(priv, ephemeralPub, false);
  const sharedX = shared.slice(1, 33);

  const key = await deriveKey(sharedX);
  const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, sealed));
  return JSON.parse(new TextDecoder().decode(unpad(plaintext)));
}

/// Generates a fresh secp256k1 keypair - used only for local dev/demo TEE
/// pubkey display when no live enclave endpoint is configured.
export function generateKeypair(): { privateKeyHex: `0x${string}`; publicKeyHex: `0x${string}` } {
  const priv = secp256k1.utils.randomPrivateKey();
  const pub = secp256k1.getPublicKey(priv, false);
  return { privateKeyHex: bytesToHex(priv), publicKeyHex: bytesToHex(pub) };
}
