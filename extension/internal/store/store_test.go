package store

import (
	"sync"
	"testing"
)

func TestSetAndGetPolicy(t *testing.T) {
	s := New()
	p := Policy{Type: StopLoss, Commitment: "0xabc", Trigger: "50000"}
	s.SetPolicy(1, p)

	got, ok := s.Policy(1)
	if !ok {
		t.Fatal("expected policy to be found")
	}
	if got.Type != StopLoss || got.Trigger != "50000" {
		t.Fatalf("got %+v, want %+v", got, p)
	}
}

func TestPolicyNotFound(t *testing.T) {
	s := New()
	if _, ok := s.Policy(999); ok {
		t.Fatal("expected no policy for unknown orderId")
	}
}

func TestSetPolicyOverwrites(t *testing.T) {
	s := New()
	s.SetPolicy(1, Policy{Type: StopLoss, Trigger: "1"})
	s.SetPolicy(1, Policy{Type: TrailingStop, Trigger: "2"})
	got, _ := s.Policy(1)
	if got.Type != TrailingStop || got.Trigger != "2" {
		t.Fatalf("expected overwrite to take effect, got %+v", got)
	}
}

func TestHighWatermarkOnlyIncreases(t *testing.T) {
	s := New()
	if hw := s.UpdateHighWatermark(1, 100); hw != 100 {
		t.Fatalf("got %d, want 100", hw)
	}
	if hw := s.UpdateHighWatermark(1, 50); hw != 100 {
		t.Fatalf("watermark must not decrease: got %d, want 100", hw)
	}
	if hw := s.UpdateHighWatermark(1, 150); hw != 150 {
		t.Fatalf("got %d, want 150", hw)
	}
}

func TestHighWatermarkIsolatedPerOrder(t *testing.T) {
	s := New()
	s.UpdateHighWatermark(1, 500)
	s.UpdateHighWatermark(2, 10)
	if hw := s.HighWatermark(2); hw != 10 {
		t.Fatalf("order 2 watermark leaked order 1's value: got %d", hw)
	}
}

func TestHighWatermarkUnknownOrderIsZero(t *testing.T) {
	s := New()
	if hw := s.HighWatermark(42); hw != 0 {
		t.Fatalf("got %d, want 0", hw)
	}
}

func TestStoreIsConcurrencySafe(t *testing.T) {
	s := New()
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(2)
		go func(i int) {
			defer wg.Done()
			s.SetPolicy(uint64(i), Policy{Type: StopLoss})
		}(i)
		go func(i int) {
			defer wg.Done()
			s.UpdateHighWatermark(uint64(i), uint64(i))
		}(i)
	}
	wg.Wait()
	if hw := s.HighWatermark(50); hw != 50 {
		t.Fatalf("got %d, want 50", hw)
	}
}

func TestPayrollLegsPreserved(t *testing.T) {
	s := New()
	legs := []PayrollLeg{{Target: "0xa", Amount: "10"}, {Target: "0xb", Amount: "20"}}
	s.SetPolicy(7, Policy{Type: PayrollBatch, Legs: legs})
	got, _ := s.Policy(7)
	if len(got.Legs) != 2 || got.Legs[0].Target != "0xa" || got.Legs[1].Amount != "20" {
		t.Fatalf("payroll legs not preserved: %+v", got.Legs)
	}
}

func TestGuaranteedRedeemFieldsPreserved(t *testing.T) {
	s := New()
	s.SetPolicy(9, Policy{Type: GuaranteedRedeem, XRPLDestination: "rXYZ", DestinationTag: 42})
	got, _ := s.Policy(9)
	if got.XRPLDestination != "rXYZ" || got.DestinationTag != 42 {
		t.Fatalf("guaranteed redeem fields not preserved: %+v", got)
	}
}
