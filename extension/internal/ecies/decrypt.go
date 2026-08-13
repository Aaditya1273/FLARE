// Package ecies implements the ECIES-style scheme SILENT 2.0 uses to encrypt
// a policy client-side to the TEE's public key: secp256k1 ECDH -> HKDF-SHA256
// -> AES-256-GCM. This is a compact, from-scratch construction (not
// go-ethereum's crypto/ecies wire format) chosen specifically so it can be
// implemented identically, and verified byte-for-byte, on both sides of the
// browser<->enclave boundary: frontend/lib/ecies.ts uses @noble/curves +
// @noble/hashes to perform the exact same ECDH -> HKDF -> AES-GCM steps.
// Every policy is padded to a fixed frame size before encryption so ciphertext
// length never reveals which of the 4 policy types was sent.
package ecies

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"errors"

	"github.com/ethereum/go-ethereum/crypto"
	"golang.org/x/crypto/hkdf"
)

// PlaintextSize is the fixed frame size every policy is padded to before
// encryption. 256 bytes comfortably fits the largest supported policy
// (PayrollBatch with a handful of recipients) while staying constant
// regardless of policy type or field lengths.
const PlaintextSize = 256

const (
	hkdfInfo   = "SILENT-ECIES-v1"
	nonceSize  = 12 // AES-GCM standard nonce size
	pubKeySize = 65 // uncompressed secp256k1 point: 0x04 || X(32) || Y(32)
)

var (
	ErrPayloadTooLarge = errors.New("ecies: policy payload exceeds padded frame size")
	ErrCiphertextShort = errors.New("ecies: ciphertext shorter than ephemeral key + nonce")
)

// Pad frames `payload` as [2-byte big-endian length][payload][zero padding]
// to exactly PlaintextSize bytes.
func Pad(payload []byte) ([]byte, error) {
	if len(payload)+2 > PlaintextSize {
		return nil, ErrPayloadTooLarge
	}
	frame := make([]byte, PlaintextSize)
	binary.BigEndian.PutUint16(frame[:2], uint16(len(payload)))
	copy(frame[2:], payload)
	return frame, nil
}

// Unpad reverses Pad.
func Unpad(frame []byte) ([]byte, error) {
	if len(frame) != PlaintextSize {
		return nil, errors.New("ecies: unexpected frame size")
	}
	n := binary.BigEndian.Uint16(frame[:2])
	if int(n) > PlaintextSize-2 {
		return nil, errors.New("ecies: corrupt length prefix")
	}
	return frame[2 : 2+n], nil
}

// deriveKey runs ECDH between `priv` and `peerPub`, then HKDF-SHA256 over the
// shared x-coordinate to produce a 32-byte AES-256 key. Identical on both
// sides regardless of which party generated the ephemeral key, since ECDH is
// symmetric: priv_A * pub_B == priv_B * pub_A.
func deriveKey(priv *ecdsa.PrivateKey, peerPub *ecdsa.PublicKey) ([]byte, error) {
	x, _ := priv.Curve.ScalarMult(peerPub.X, peerPub.Y, priv.D.Bytes())
	shared := make([]byte, 32)
	x.FillBytes(shared)

	kdf := hkdf.New(sha256.New, shared, nil, []byte(hkdfInfo))
	key := make([]byte, 32)
	if _, err := kdf.Read(key); err != nil {
		return nil, err
	}
	return key, nil
}

// Encrypt encrypts `payload` (padded to PlaintextSize first) to `pub` using a
// fresh ephemeral keypair. Wire format: ephemeralPubKey(65) || nonce(12) ||
// AES-256-GCM(ciphertext || 16-byte tag).
func Encrypt(pub *ecdsa.PublicKey, payload []byte) ([]byte, error) {
	framed, err := Pad(payload)
	if err != nil {
		return nil, err
	}
	ephPriv, err := crypto.GenerateKey()
	if err != nil {
		return nil, err
	}
	key, err := deriveKey(ephPriv, pub)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, nonceSize)
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	sealed := gcm.Seal(nil, nonce, framed, nil)

	ephPub := elliptic.Marshal(ephPriv.Curve, ephPriv.PublicKey.X, ephPriv.PublicKey.Y)
	out := make([]byte, 0, pubKeySize+nonceSize+len(sealed))
	out = append(out, ephPub...)
	out = append(out, nonce...)
	out = append(out, sealed...)
	return out, nil
}

// Decrypt decrypts an Encrypt-produced (or frontend lib/ecies.ts-produced)
// ciphertext with the enclave's private key, and strips the fixed-size
// padding back off. The plaintext this returns must never be logged or
// persisted outside the enclave process.
func Decrypt(priv *ecdsa.PrivateKey, ciphertext []byte) ([]byte, error) {
	if len(ciphertext) < pubKeySize+nonceSize {
		return nil, ErrCiphertextShort
	}
	ephPubBytes := ciphertext[:pubKeySize]
	nonce := ciphertext[pubKeySize : pubKeySize+nonceSize]
	sealed := ciphertext[pubKeySize+nonceSize:]

	x, y := elliptic.Unmarshal(priv.Curve, ephPubBytes)
	if x == nil {
		return nil, errors.New("ecies: invalid ephemeral public key")
	}
	ephPub := &ecdsa.PublicKey{Curve: priv.Curve, X: x, Y: y}

	key, err := deriveKey(priv, ephPub)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	framed, err := gcm.Open(nil, nonce, sealed, nil)
	if err != nil {
		return nil, err
	}
	return Unpad(framed)
}

// GenerateKey generates a fresh secp256k1 keypair for SIMULATED_TEE mode.
func GenerateKey() (*ecdsa.PrivateKey, error) {
	return crypto.GenerateKey()
}
