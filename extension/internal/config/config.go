// Package config holds settings shared across the enclave process, and the
// byte-level protocol constants that MUST stay identical to
// contracts/src/SilentVault2.sol - a mismatch here silently breaks every
// attestation signature the enclave produces.
package config

import (
	"crypto/sha256"
	"fmt"
	"os"
	"strconv"
)

// Domain-separation bytes - byte-for-byte identical to the Solidity constants
// of the same name in contracts/src/SilentVault2.sol.
const (
	OpTypeSilent   byte = 0x04
	OpCommandEval  byte = 0x01
	OpCommandSettle byte = 0x02
	OpCommandProve byte = 0x03
)

// MaxAllowedAge mirrors SilentVault2.MAX_ALLOWED_AGE (seconds).
const MaxAllowedAge = 300

type Config struct {
	ListenAddr      string
	SimulatedTEE    bool
	TeePrivateKeyHex string // hex-encoded secp256k1 private key (SIMULATED_TEE mode only)
	Coston2RPC      string
	VaultAddress    string
	CodeVersionHash string // sha256 of the Dockerfile this binary was built from
}

func Load() Config {
	simulated, _ := strconv.ParseBool(getenv("SIMULATED_TEE", "true"))
	return Config{
		ListenAddr:       getenv("LISTEN_ADDR", ":8000"),
		SimulatedTEE:     simulated,
		TeePrivateKeyHex: getenv("TEE_PRIVATE_KEY", ""),
		Coston2RPC:       getenv("COSTON2_RPC", "https://coston2-api.flare.network/ext/C/rpc"),
		VaultAddress:     getenv("VAULT_ADDRESS", ""),
		CodeVersionHash:  dockerfileHash(),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// dockerfileHash hashes the Dockerfile this image was (or would be) built from,
// so /api/attest/proof can report a CODE_VERSION_HASH tying the running binary
// to a reproducible build input. Falls back to a zero hash if the Dockerfile
// isn't present in the working directory (e.g. running `go run` outside Docker).
func dockerfileHash() string {
	data, err := os.ReadFile("Dockerfile")
	if err != nil {
		return fmt.Sprintf("%x", sha256.Sum256([]byte("dockerfile-not-found")))
	}
	sum := sha256.Sum256(data)
	return fmt.Sprintf("%x", sum)
}
