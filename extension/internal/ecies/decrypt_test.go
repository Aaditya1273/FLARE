package ecies

import (
	"bytes"
	"crypto/ecdsa"
	"testing"
)

func mustKey(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	k, err := GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey: %v", err)
	}
	return k
}

func TestPadUnpadRoundTrip(t *testing.T) {
	cases := [][]byte{
		[]byte(""),
		[]byte("a"),
		[]byte(`{"type":"STOP_LOSS","trigger":"50000"}`),
		bytes.Repeat([]byte("x"), PlaintextSize-2), // max size that still fits
	}
	for i, payload := range cases {
		framed, err := Pad(payload)
		if err != nil {
			t.Fatalf("case %d: Pad: %v", i, err)
		}
		if len(framed) != PlaintextSize {
			t.Fatalf("case %d: framed length = %d, want %d", i, len(framed), PlaintextSize)
		}
		got, err := Unpad(framed)
		if err != nil {
			t.Fatalf("case %d: Unpad: %v", i, err)
		}
		if !bytes.Equal(got, payload) {
			t.Fatalf("case %d: got %q, want %q", i, got, payload)
		}
	}
}

func TestPadRejectsOversizedPayload(t *testing.T) {
	oversized := bytes.Repeat([]byte("x"), PlaintextSize-1)
	if _, err := Pad(oversized); err != ErrPayloadTooLarge {
		t.Fatalf("expected ErrPayloadTooLarge, got %v", err)
	}
}

func TestUnpadRejectsWrongFrameSize(t *testing.T) {
	if _, err := Unpad([]byte("too short")); err == nil {
		t.Fatal("expected error for undersized frame")
	}
}

func TestEncryptDecryptRoundTrip(t *testing.T) {
	priv := mustKey(t)
	payloads := []string{
		`{"type":"STOP_LOSS","trigger":"40000"}`,
		`{"type":"TRAILING_STOP","trailFraction":"0.10"}`,
		`{"type":"PAYROLL_BATCH","legs":[{"target":"0xabc","amount":"100"}]}`,
		`{"type":"GUARANTEED_REDEEM","xrplDestination":"rXYZ","destinationTag":12345}`,
	}
	for _, p := range payloads {
		ct, err := Encrypt(&priv.PublicKey, []byte(p))
		if err != nil {
			t.Fatalf("Encrypt(%q): %v", p, err)
		}
		pt, err := Decrypt(priv, ct)
		if err != nil {
			t.Fatalf("Decrypt(%q): %v", p, err)
		}
		if string(pt) != p {
			t.Fatalf("round trip mismatch: got %q, want %q", pt, p)
		}
	}
}

func TestEncryptOutputsAreUnlinkable(t *testing.T) {
	priv := mustKey(t)
	payload := []byte(`{"type":"STOP_LOSS","trigger":"1"}`)
	ct1, err := Encrypt(&priv.PublicKey, payload)
	if err != nil {
		t.Fatal(err)
	}
	ct2, err := Encrypt(&priv.PublicKey, payload)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Equal(ct1, ct2) {
		t.Fatal("two encryptions of the same plaintext must not produce identical ciphertext (fresh ephemeral key + nonce each time)")
	}
	if len(ct1) != len(ct2) {
		t.Fatal("ciphertext length must be constant regardless of plaintext content (padding hides policy type)")
	}
}

func TestDecryptFailsWithWrongKey(t *testing.T) {
	priv := mustKey(t)
	wrongPriv := mustKey(t)
	ct, err := Encrypt(&priv.PublicKey, []byte("secret"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Decrypt(wrongPriv, ct); err == nil {
		t.Fatal("expected decryption to fail with the wrong private key")
	}
}

func TestDecryptFailsOnTamperedCiphertext(t *testing.T) {
	priv := mustKey(t)
	ct, err := Encrypt(&priv.PublicKey, []byte("secret"))
	if err != nil {
		t.Fatal(err)
	}
	tampered := append([]byte(nil), ct...)
	tampered[len(tampered)-1] ^= 0xFF
	if _, err := Decrypt(priv, tampered); err == nil {
		t.Fatal("expected decryption to fail on tampered ciphertext (AES-GCM authentication)")
	}
}

func TestDecryptFailsOnShortCiphertext(t *testing.T) {
	priv := mustKey(t)
	if _, err := Decrypt(priv, []byte("short")); err != ErrCiphertextShort {
		t.Fatalf("expected ErrCiphertextShort, got %v", err)
	}
}

func TestPlaintextSizeConstant(t *testing.T) {
	if PlaintextSize != 256 {
		t.Fatalf("PlaintextSize changed to %d - this is a wire-format break with frontend/lib/ecies.ts", PlaintextSize)
	}
}
