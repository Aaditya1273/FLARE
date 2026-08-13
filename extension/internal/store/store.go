// Package store holds enclave-local state: decrypted policies (never
// persisted, never logged) and the private trailing-stop high-watermark per
// order. Nothing in this package is written to disk - a restart loses state,
// which is the correct behavior for a TEE that must never let policy
// plaintext survive outside enclave memory.
package store

import "sync"

type PolicyType string

const (
	StopLoss         PolicyType = "STOP_LOSS"
	TrailingStop     PolicyType = "TRAILING_STOP"
	PayrollBatch     PolicyType = "PAYROLL_BATCH"
	GuaranteedRedeem PolicyType = "GUARANTEED_REDEEM"
)

// PayrollLeg is one recipient in a PayrollBatch policy.
type PayrollLeg struct {
	Target string `json:"target"`
	Amount string `json:"amount"` // decimal string, wei-denominated FXRP
}

// Policy is the decrypted, in-enclave-only representation of a user's
// private policy. Field meaning depends on Type: StopLoss/TrailingStop use
// Trigger (+ TrailFraction for trailing); PayrollBatch uses Legs;
// GuaranteedRedeem uses XRPLDestination + DestinationTag.
type Policy struct {
	Type             PolicyType   `json:"type"`
	Commitment       string       `json:"commitment"`
	Trigger          string       `json:"trigger,omitempty"`          // decimal string, FTSO-scaled
	TrailFraction    string       `json:"trailFraction,omitempty"`    // e.g. "0.10" = 10% pullback
	Legs             []PayrollLeg `json:"legs,omitempty"`
	XRPLDestination  string       `json:"xrplDestination,omitempty"`
	DestinationTag   uint32       `json:"destinationTag,omitempty"`
	Amount           string       `json:"amount,omitempty"`
}

type Store struct {
	mu            sync.RWMutex
	policies      map[uint64]Policy
	highWatermark map[uint64]uint64 // orderId => highest FLR/USD or XRP/USD price seen, TrailingStop only
}

func New() *Store {
	return &Store{
		policies:      make(map[uint64]Policy),
		highWatermark: make(map[uint64]uint64),
	}
}

func (s *Store) SetPolicy(orderID uint64, p Policy) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.policies[orderID] = p
}

func (s *Store) Policy(orderID uint64) (Policy, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.policies[orderID]
	return p, ok
}

// UpdateHighWatermark records `price` as the order's new high-watermark if
// it's higher than any price seen before, and returns the (possibly updated)
// watermark. The watermark itself is never exposed outside the enclave - only
// the derived trailing trigger is ever revealed at settlement time.
func (s *Store) UpdateHighWatermark(orderID uint64, price uint64) uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	if price > s.highWatermark[orderID] {
		s.highWatermark[orderID] = price
	}
	return s.highWatermark[orderID]
}

func (s *Store) HighWatermark(orderID uint64) uint64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.highWatermark[orderID]
}
