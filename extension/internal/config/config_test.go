package config

import "testing"

func TestOpCodesMatchSolidity(t *testing.T) {
	// These MUST stay byte-for-byte identical to contracts/src/SilentVault2.sol's
	// OP_TYPE_SILENT / OP_COMMAND_* constants - a mismatch silently breaks every
	// attestation signature this enclave produces.
	if OpTypeSilent != 0x04 {
		t.Fatalf("OpTypeSilent = %#x, want 0x04", OpTypeSilent)
	}
	if OpCommandEval != 0x01 {
		t.Fatalf("OpCommandEval = %#x, want 0x01", OpCommandEval)
	}
	if OpCommandSettle != 0x02 {
		t.Fatalf("OpCommandSettle = %#x, want 0x02", OpCommandSettle)
	}
	if OpCommandProve != 0x03 {
		t.Fatalf("OpCommandProve = %#x, want 0x03", OpCommandProve)
	}
}

func TestOpCodesAreDistinct(t *testing.T) {
	codes := []byte{OpTypeSilent, OpCommandEval, OpCommandSettle, OpCommandProve}
	seen := map[byte]bool{}
	for _, c := range codes {
		if seen[c] {
			t.Fatalf("duplicate op code %#x - domain separation is broken", c)
		}
		seen[c] = true
	}
}

func TestMaxAllowedAgeMatchesSolidity(t *testing.T) {
	if MaxAllowedAge != 300 {
		t.Fatalf("MaxAllowedAge = %d, want 300 (must match SilentVault2.MAX_ALLOWED_AGE)", MaxAllowedAge)
	}
}

func TestLoadDefaults(t *testing.T) {
	cfg := Load()
	if cfg.ListenAddr == "" {
		t.Fatal("ListenAddr must have a default")
	}
	if cfg.Coston2RPC == "" {
		t.Fatal("Coston2RPC must have a default")
	}
	if cfg.CodeVersionHash == "" {
		t.Fatal("CodeVersionHash must always be populated, even without a Dockerfile present")
	}
}

func TestLoadDefaultsToSimulatedTee(t *testing.T) {
	cfg := Load()
	if !cfg.SimulatedTEE {
		t.Fatal("SIMULATED_TEE must default to true so a bare `go run` never silently claims attested hardware")
	}
}

func TestGetenvFallback(t *testing.T) {
	if v := getenv("SILENT_TEST_UNSET_VAR_XYZ", "fallback"); v != "fallback" {
		t.Fatalf("got %q, want fallback", v)
	}
}
