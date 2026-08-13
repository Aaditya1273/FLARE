package watcher

import "testing"

// FTSOv2 feed ids must be exactly 21 bytes (category byte + zero-padded ASCII
// symbol) - a wrong length here silently breaks every settle()/price call.
// This regression test exists because frontend/lib/flare.ts once shipped a
// 20-byte version of these same constants.

func TestFeedIDsAre21Bytes(t *testing.T) {
	if len(FeedXrpUsd) != 21 {
		t.Fatalf("FeedXrpUsd is %d bytes, want 21", len(FeedXrpUsd))
	}
	if len(FeedFlrUsd) != 21 {
		t.Fatalf("FeedFlrUsd is %d bytes, want 21", len(FeedFlrUsd))
	}
}

func TestFeedIDsHaveCorrectPrefix(t *testing.T) {
	if FeedXrpUsd[0] != 0x01 {
		t.Fatalf("FeedXrpUsd category byte = %#x, want 0x01 (crypto)", FeedXrpUsd[0])
	}
	if string(FeedXrpUsd[1:8]) != "XRP/USD" {
		t.Fatalf("FeedXrpUsd symbol = %q, want XRP/USD", FeedXrpUsd[1:8])
	}
	if string(FeedFlrUsd[1:8]) != "FLR/USD" {
		t.Fatalf("FeedFlrUsd symbol = %q, want FLR/USD", FeedFlrUsd[1:8])
	}
}

func TestFeedIDsAreZeroPaddedAfterSymbol(t *testing.T) {
	for i := 8; i < 21; i++ {
		if FeedXrpUsd[i] != 0 {
			t.Fatalf("FeedXrpUsd byte %d = %#x, want 0 (zero padding)", i, FeedXrpUsd[i])
		}
	}
}

func TestFeedIDsAreDistinct(t *testing.T) {
	if FeedXrpUsd == FeedFlrUsd {
		t.Fatal("FeedXrpUsd and FeedFlrUsd must not be equal")
	}
}
