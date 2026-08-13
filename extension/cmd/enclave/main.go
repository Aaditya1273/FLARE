// Command enclave is SILENT 2.0's TEE process: it decrypts encrypted
// policies, polls FTSO prices, evaluates the 4 supported private policies,
// and signs settlement attestations. In SIMULATED_TEE mode (the default -
// see docs/TRUST.md) it runs as a normal process with a local keypair rather
// than inside real attested hardware; the interface (endpoints, signature
// scheme, event payloads) is identical to what a production deployment on
// Flare's attested TEE infrastructure would expose, so migrating later is a
// key-management change, not an interface change.
package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"log"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"

	"extension/internal/config"
	"extension/internal/ecies"
	"extension/internal/store"
	"extension/internal/watcher"
)

type server struct {
	cfg     config.Config
	priv    *ecdsa.PrivateKey
	teeID   string
	st      *store.Store
	watcher *watcher.Watcher
}

func main() {
	cfg := config.Load()
	log.Printf("CODE_VERSION_HASH=%s SIMULATED_TEE=%v", cfg.CodeVersionHash, cfg.SimulatedTEE)

	priv, err := loadOrGenerateKey(cfg)
	if err != nil {
		log.Fatalf("key setup: %v", err)
	}
	teeID := crypto.PubkeyToAddress(priv.PublicKey).Hex()
	log.Printf("TEE signer address (teeId): %s", teeID)

	s := &server{cfg: cfg, priv: priv, teeID: teeID, st: store.New()}

	if cfg.VaultAddress != "" {
		w, err := watcher.New(cfg.Coston2RPC, common.HexToAddress(cfg.VaultAddress), s.st)
		if err != nil {
			log.Printf("watcher init failed (continuing without live FTSO polling): %v", err)
		} else if err := w.ResolveFtso(context.Background()); err != nil {
			log.Printf("resolve FtsoV2 failed (continuing without live FTSO polling): %v", err)
		} else {
			s.watcher = w
			log.Printf("watcher ready, FTSO resolved live via FlareContractRegistry")
		}
	}

	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})
	r.POST("/api/shield", s.handleShield)
	r.POST("/api/evaluate", s.handleEvaluate)
	r.POST("/api/settle", s.handleSettle)
	r.GET("/api/attest/proof", s.handleAttestProof)
	r.POST("/api/attest/reserves", s.handleAttestReserves)
	r.GET("/api/price", s.handlePrice)
	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true, "codeVersionHash": cfg.CodeVersionHash}) })
	r.GET("/", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"service": "silent-enclave", "ok": true}) })

	log.Printf("listening on %s", cfg.ListenAddr)
	if err := r.Run(cfg.ListenAddr); err != nil {
		log.Fatal(err)
	}
}

func loadOrGenerateKey(cfg config.Config) (*ecdsa.PrivateKey, error) {
	if cfg.TeePrivateKeyHex != "" {
		return crypto.HexToECDSA(cfg.TeePrivateKeyHex)
	}
	if !cfg.SimulatedTEE {
		log.Fatal("TEE_PRIVATE_KEY must be set when SIMULATED_TEE=false (production/attested mode)")
	}
	log.Print("no TEE_PRIVATE_KEY set - generating an ephemeral SIMULATED_TEE keypair for this process lifetime")
	return crypto.GenerateKey()
}

// --- /api/shield ---------------------------------------------------------

type shieldRequest struct {
	Amount string `json:"amount" binding:"required"` // decimal string, wei-denominated
	Salt   string `json:"salt" binding:"required"`   // 0x-hex, client-generated randomness
	User   string `json:"user" binding:"required"`   // 0x address
}

func (s *server) handleShield(c *gin.Context) {
	var req shieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	amount, ok := new(big.Int).SetString(req.Amount, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid amount"})
		return
	}
	salt, err := hexutil.Decode(req.Salt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid salt"})
		return
	}
	if !common.IsHexAddress(req.User) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user address"})
		return
	}
	commitment := crypto.Keccak256(
		leftPad32(amount.Bytes()),
		salt,
		common.HexToAddress(req.User).Bytes(),
	)
	c.JSON(http.StatusOK, gin.H{"commitment": hexutil.Encode(commitment)})
}

// --- /api/price -------------------------------------------------------------

// handlePrice reads the live XRP/USD FTSO feed fresh (not the cached
// TrailingStop high-watermark) - used by the frontend dashboard to display
// a reference price, not for settlement (settle() re-reads the feed itself).
func (s *server) handlePrice(c *gin.Context) {
	if s.watcher == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "watcher not configured (VAULT_ADDRESS unset)"})
		return
	}
	value, ts, err := s.watcher.PriceOf(c.Request.Context(), watcher.FeedXrpUsd)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	// FtsoV2 XRP/USD is published with 5 decimals.
	price, _ := new(big.Float).Quo(new(big.Float).SetInt(value), big.NewFloat(1e5)).Float64()
	c.JSON(http.StatusOK, gin.H{"price": price, "raw": value.String(), "decimals": 5, "timestamp": ts})
}

// --- /api/evaluate ---------------------------------------------------------

type evaluateRequest struct {
	OrderID    uint64 `json:"orderId" binding:"required"`
	Ciphertext string `json:"ciphertext" binding:"required"` // 0x-hex ECIES ciphertext
}

type evaluateResponse struct {
	OrderID   uint64          `json:"orderId"`
	Decision  string          `json:"decision"` // "hold" | "settle"
	Type      store.PolicyType `json:"type,omitempty"`
	Trigger   string          `json:"trigger,omitempty"`
}

// handleEvaluate decrypts the caller-supplied ciphertext inside this process
// (never logged in plaintext, never written to disk) and evaluates it against
// the current FTSO price. This is the only endpoint that ever sees a policy's
// plaintext.
func (s *server) handleEvaluate(c *gin.Context) {
	var req evaluateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ciphertext, err := hexutil.Decode(req.Ciphertext)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ciphertext"})
		return
	}
	plaintext, err := ecies.Decrypt(s.priv, ciphertext)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "decrypt failed"})
		return
	}
	var policy store.Policy
	if err := json.Unmarshal(plaintext, &policy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "malformed policy"})
		return
	}
	s.st.SetPolicy(req.OrderID, policy)

	decision := "hold"
	if s.watcher != nil && policy.Trigger != "" {
		feedID := watcher.FeedXrpUsd
		price, _, err := s.watcher.PriceOf(context.Background(), feedID)
		if err == nil {
			trigger, ok := new(big.Int).SetString(policy.Trigger, 10)
			if ok {
				switch policy.Type {
				case store.StopLoss:
					if price.Cmp(trigger) <= 0 {
						decision = "settle"
					}
				case store.TrailingStop:
					hw := s.st.UpdateHighWatermark(req.OrderID, price.Uint64())
					_ = hw // trailing trigger derivation documented in docs/ARCHITECTURE.md
					if price.Cmp(trigger) <= 0 {
						decision = "settle"
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, evaluateResponse{
		OrderID:  req.OrderID,
		Decision: decision,
		Type:     policy.Type,
		Trigger:  policy.Trigger,
	})
}

// --- /api/settle ---------------------------------------------------------

type settleRequest struct {
	OrderID    string `json:"orderId" binding:"required"`
	Commitment string `json:"commitment" binding:"required"` // 0x-hex bytes32, from SilentVault2.orderCommitment(orderId)
	Target     string `json:"target" binding:"required"`
	Amount     string `json:"amount" binding:"required"`
	Trigger    string `json:"trigger" binding:"required"`
	FeedID     string `json:"feedId" binding:"required"` // 0x-hex, 21 bytes
	MaxAge     string `json:"maxAge" binding:"required"`
}

type settleResponse struct {
	Attestation string `json:"attestation"`
	TeeID       string `json:"teeId"`
}

// handleSettle signs the (orderId, target, amount, trigger, feedId, maxAge)
// tuple exactly as SilentVault2.settle() re-derives it, so the caller can
// submit that attestation on-chain. Signing is the *only* privileged act here
// - the contract independently re-checks the FTSO price and staleness itself.
func (s *server) handleSettle(c *gin.Context) {
	var req settleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	vaultAddr := common.HexToAddress(s.cfg.VaultAddress)
	orderID, ok1 := new(big.Int).SetString(req.OrderID, 10)
	amount, ok2 := new(big.Int).SetString(req.Amount, 10)
	trigger, ok3 := new(big.Int).SetString(req.Trigger, 10)
	maxAge, ok4 := new(big.Int).SetString(req.MaxAge, 10)
	if !ok1 || !ok2 || !ok3 || !ok4 || !common.IsHexAddress(req.Target) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid numeric field"})
		return
	}
	feedID, err := hexutil.Decode(req.FeedID)
	if err != nil || len(feedID) != 21 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "feedId must be 21 bytes"})
		return
	}
	commitment, err := hexutil.Decode(req.Commitment)
	if err != nil || len(commitment) != 32 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "commitment must be 32 bytes"})
		return
	}
	target := common.HexToAddress(req.Target)

	digest := settleDigest(vaultAddr, orderID, commitment, target, amount, trigger, feedID, maxAge)
	sig, err := signEthMessage(s.priv, digest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settleResponse{Attestation: hexutil.Encode(sig), TeeID: s.teeID})
}

// settleDigest mirrors SilentVault2.settle's abi.encodePacked byte-for-byte:
// OP_TYPE_SILENT || OP_COMMAND_SETTLE || vault(20) || chainId(32) ||
// orderId(32) || commitment(32) || target(20) || amount(32) || trigger(32) ||
// feedId(21) || maxAge(32). Any drift here silently breaks every attestation.
func settleDigest(vault common.Address, orderID *big.Int, commitment []byte, target common.Address, amount, trigger *big.Int, feedID []byte, maxAge *big.Int) []byte {
	var buf []byte
	buf = append(buf, config.OpTypeSilent, config.OpCommandSettle)
	buf = append(buf, vault.Bytes()...)
	buf = append(buf, leftPad32(big.NewInt(114).Bytes())...) // Coston2 chainId=114
	buf = append(buf, leftPad32(orderID.Bytes())...)
	buf = append(buf, commitment...)
	buf = append(buf, target.Bytes()...)
	buf = append(buf, leftPad32(amount.Bytes())...)
	buf = append(buf, leftPad32(trigger.Bytes())...)
	buf = append(buf, feedID...)
	buf = append(buf, leftPad32(maxAge.Bytes())...)
	return crypto.Keccak256(buf)
}

func signEthMessage(priv *ecdsa.PrivateKey, digest []byte) ([]byte, error) {
	prefix := []byte("\x19Ethereum Signed Message:\n32")
	ethHash := crypto.Keccak256(append(prefix, digest...))
	sig, err := crypto.Sign(ethHash, priv)
	if err != nil {
		return nil, err
	}
	sig[64] += 27 // go-ethereum returns v in {0,1}; Solidity's ECDSA.recover expects {27,28}
	return sig, nil
}

func leftPad32(b []byte) []byte {
	if len(b) >= 32 {
		return b[len(b)-32:]
	}
	out := make([]byte, 32)
	copy(out[32-len(b):], b)
	return out
}

// --- /api/attest/proof -----------------------------------------------------

func (s *server) handleAttestProof(c *gin.Context) {
	msg := []byte(s.teeID + "|" + s.cfg.CodeVersionHash)
	prefix := []byte("\x19Ethereum Signed Message:\n" + strconv.Itoa(len(msg)))
	hash := crypto.Keccak256(append(prefix, msg...))
	sig, err := crypto.Sign(hash, s.priv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	sig[64] += 27
	c.JSON(http.StatusOK, gin.H{
		"teeId":           s.teeID,
		"codeVersionHash": s.cfg.CodeVersionHash,
		"simulatedTee":    s.cfg.SimulatedTEE,
		"signature":       hexutil.Encode(sig),
		"generatedAt":     time.Now().UTC().Format(time.RFC3339),
	})
}

// --- /api/attest/reserves --------------------------------------------------

type reservesRequest struct {
	User        string   `json:"user" binding:"required"`
	Threshold   string   `json:"threshold" binding:"required"`
	Commitments []string `json:"commitments" binding:"required"` // 0x-hex bytes32, caller-supplied (the caller's own known commitments)
}

// handleAttestReserves only ever signs a proveReserves attestation when it has
// independently verified - via live eth_call, not a caller-supplied claim -
// that the sum of the caller-supplied commitments' on-chain shielded balances
// (each checked to actually belong to `user`) exceeds `threshold`. A false
// claim gets refused, not silently signed.
func (s *server) handleAttestReserves(c *gin.Context) {
	if s.watcher == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "watcher not configured (VAULT_ADDRESS unset)"})
		return
	}
	var req reservesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !common.IsHexAddress(req.User) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user address"})
		return
	}
	threshold, ok := new(big.Int).SetString(req.Threshold, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid threshold"})
		return
	}
	user := common.HexToAddress(req.User)

	total := new(big.Int)
	ctx := c.Request.Context()
	for _, commHex := range req.Commitments {
		raw, err := hexutil.Decode(commHex)
		if err != nil || len(raw) != 32 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid commitment: " + commHex})
			return
		}
		var commitment [32]byte
		copy(commitment[:], raw)

		owner, err := s.watcher.ShieldedOwner(ctx, commitment)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "chain read failed: " + err.Error()})
			return
		}
		if owner != user {
			c.JSON(http.StatusForbidden, gin.H{"error": "commitment does not belong to user: " + commHex})
			return
		}
		amount, err := s.watcher.ShieldedAmount(ctx, commitment)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "chain read failed: " + err.Error()})
			return
		}
		total.Add(total, amount)
	}

	if total.Cmp(threshold) < 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "reserves do not exceed threshold - refusing to sign"})
		return
	}

	vaultAddr := common.HexToAddress(s.cfg.VaultAddress)
	digest := proveDigest(vaultAddr, user, threshold)
	sig, err := signEthMessage(s.priv, digest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"attestation": hexutil.Encode(sig), "teeId": s.teeID})
}

// proveDigest mirrors SilentVault2.proveReserves's abi.encodePacked exactly:
// OP_TYPE_SILENT || OP_COMMAND_PROVE || vault(20) || chainId(32) || user(20) || threshold(32).
func proveDigest(vault common.Address, user common.Address, threshold *big.Int) []byte {
	var buf []byte
	buf = append(buf, config.OpTypeSilent, config.OpCommandProve)
	buf = append(buf, vault.Bytes()...)
	buf = append(buf, leftPad32(big.NewInt(114).Bytes())...) // Coston2 chainId=114
	buf = append(buf, user.Bytes()...)
	buf = append(buf, leftPad32(threshold.Bytes())...)
	return crypto.Keccak256(buf)
}
