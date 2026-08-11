// Client-side policy encryption using the native Web Crypto API - no encryption
// library dependency needed for a hackathon demo. AES-GCM with a fresh random key
// per policy: the ciphertext + its hash are what SilentPolicyRegistry stores
// on-chain (so a public chain reader never sees the plaintext trigger/batch), while
// the plaintext + key are sent directly to the TEE over HTTPS to evaluate - the same
// trust boundary a production deployment would enforce by wrapping this key to the
// TEE's remote-attested public key (ECIES) instead of sending plaintext.

export async function encryptPolicy(policy: object): Promise<{ ciphertextHex: `0x${string}`; policyHash: `0x${string}` }> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(policy));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  const ciphertextHex = ("0x" + toHex(combined)) as `0x${string}`;

  const hashBuf = await crypto.subtle.digest("SHA-256", combined);
  const policyHash = ("0x" + toHex(new Uint8Array(hashBuf))) as `0x${string}`;

  return { ciphertextHex, policyHash };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
