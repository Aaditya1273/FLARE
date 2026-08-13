package main

import (
	"bytes"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestLeftPad32(t *testing.T) {
	cases := []struct {
		in   []byte
		want int
	}{
		{[]byte{}, 32},
		{[]byte{1}, 32},
		{bytes.Repeat([]byte{1}, 32), 32},
		{bytes.Repeat([]byte{1}, 40), 32}, // longer than 32 gets truncated to last 32 bytes
	}
	for i, c := range cases {
		got := leftPad32(c.in)
		if len(got) != c.want {
			t.Fatalf("case %d: len = %d, want %d", i, len(got), c.want)
		}
	}
}

func TestLeftPad32PreservesValue(t *testing.T) {
	got := leftPad32([]byte{0xAB})
	if got[31] != 0xAB {
		t.Fatalf("last byte = %#x, want 0xAB", got[31])
	}
	for i := 0; i < 31; i++ {
		if got[i] != 0 {
			t.Fatalf("byte %d = %#x, want 0 (zero-padded)", i, got[i])
		}
	}
}

func TestSettleDigestIsDeterministic(t *testing.T) {
	vault := common.HexToAddress("0x1111111111111111111111111111111111111111")
	commitment := bytes.Repeat([]byte{0xAA}, 32)
	target := common.HexToAddress("0x2222222222222222222222222222222222222222")
	feedID := bytes.Repeat([]byte{0x01}, 21)

	d1 := settleDigest(vault, big.NewInt(1), commitment, target, big.NewInt(100), big.NewInt(50000), feedID, big.NewInt(300))
	d2 := settleDigest(vault, big.NewInt(1), commitment, target, big.NewInt(100), big.NewInt(50000), feedID, big.NewInt(300))
	if !bytes.Equal(d1, d2) {
		t.Fatal("settleDigest must be deterministic for identical inputs")
	}
}

func TestSettleDigestChangesWithEachField(t *testing.T) {
	vault := common.HexToAddress("0x1111111111111111111111111111111111111111")
	commitment := bytes.Repeat([]byte{0xAA}, 32)
	target := common.HexToAddress("0x2222222222222222222222222222222222222222")
	feedID := bytes.Repeat([]byte{0x01}, 21)
	base := settleDigest(vault, big.NewInt(1), commitment, target, big.NewInt(100), big.NewInt(50000), feedID, big.NewInt(300))

	variants := [][]byte{
		settleDigest(vault, big.NewInt(2), commitment, target, big.NewInt(100), big.NewInt(50000), feedID, big.NewInt(300)),          // orderId
		settleDigest(vault, big.NewInt(1), bytes.Repeat([]byte{0xBB}, 32), target, big.NewInt(100), big.NewInt(50000), feedID, big.NewInt(300)), // commitment
		settleDigest(vault, big.NewInt(1), commitment, target, big.NewInt(999), big.NewInt(50000), feedID, big.NewInt(300)),          // amount
		settleDigest(vault, big.NewInt(1), commitment, target, big.NewInt(100), big.NewInt(1), feedID, big.NewInt(300)),               // trigger
		settleDigest(vault, big.NewInt(1), commitment, target, big.NewInt(100), big.NewInt(50000), feedID, big.NewInt(1)),             // maxAge
	}
	for i, v := range variants {
		if bytes.Equal(base, v) {
			t.Fatalf("variant %d: digest did not change when a field changed - broken domain separation", i)
		}
	}
}

func TestProveDigestChangesWithThresholdAndUser(t *testing.T) {
	vault := common.HexToAddress("0x1111111111111111111111111111111111111111")
	userA := common.HexToAddress("0x3333333333333333333333333333333333333333")
	userB := common.HexToAddress("0x4444444444444444444444444444444444444444")

	base := proveDigest(vault, userA, big.NewInt(1000))
	sameAgain := proveDigest(vault, userA, big.NewInt(1000))
	if !bytes.Equal(base, sameAgain) {
		t.Fatal("proveDigest must be deterministic")
	}
	if bytes.Equal(base, proveDigest(vault, userB, big.NewInt(1000))) {
		t.Fatal("proveDigest must change with user")
	}
	if bytes.Equal(base, proveDigest(vault, userA, big.NewInt(2000))) {
		t.Fatal("proveDigest must change with threshold")
	}
}

func TestSignEthMessageRecoversToSigner(t *testing.T) {
	priv, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	digest := crypto.Keccak256([]byte("test message"))
	sig, err := signEthMessage(priv, digest)
	if err != nil {
		t.Fatal(err)
	}
	if len(sig) != 65 {
		t.Fatalf("signature length = %d, want 65", len(sig))
	}
	if sig[64] != 27 && sig[64] != 28 {
		t.Fatalf("v byte = %d, want 27 or 28 (Ethereum-style)", sig[64])
	}

	prefix := []byte("\x19Ethereum Signed Message:\n32")
	ethHash := crypto.Keccak256(append(prefix, digest...))
	recoveredSig := make([]byte, 65)
	copy(recoveredSig, sig)
	recoveredSig[64] -= 27
	pubKey, err := crypto.SigToPub(ethHash, recoveredSig)
	if err != nil {
		t.Fatal(err)
	}
	recovered := crypto.PubkeyToAddress(*pubKey)
	want := crypto.PubkeyToAddress(priv.PublicKey)
	if recovered != want {
		t.Fatalf("recovered address %s != signer address %s", recovered.Hex(), want.Hex())
	}
}
