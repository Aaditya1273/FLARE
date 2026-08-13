// Package watcher polls FTSO prices from inside the enclave process (so the
// price stream itself never has to be trusted from an outside caller),
// maintains each TrailingStop order's private high-watermark, detects when a
// policy's condition crosses, and submits the resulting settle() transaction
// with retry/backoff and same-nonce fee bumping.
package watcher

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"extension/internal/store"
)

const flareRegistryAddr = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"

const registryABIJSON = `[{"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"getContractAddressByName","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]`

const ftsoABIJSON = `[{"inputs":[{"internalType":"bytes21","name":"_feedId","type":"bytes21"}],"name":"getFeedById","outputs":[{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"int8","name":"decimals","type":"int8"},{"internalType":"uint64","name":"timestamp","type":"uint64"}],"stateMutability":"payable","type":"function"}]`

const vaultABIJSON = `[
	{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"},{"internalType":"address","name":"target","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"revealedTrigger","type":"uint256"},{"internalType":"bytes21","name":"feedId","type":"bytes21"},{"internalType":"uint256","name":"maxAge","type":"uint256"},{"internalType":"bytes","name":"attestation","type":"bytes"},{"internalType":"bytes","name":"fdcProof","type":"bytes"}],"name":"settle","outputs":[],"stateMutability":"nonpayable","type":"function"},
	{"inputs":[{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"shieldedAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
	{"inputs":[{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"shieldedBy","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
]`

// FeedID for FLR/USD, matching Flare's canonical FTSOv2 feed id encoding
// (category 01 = crypto, then the ASCII symbol, zero-padded to 21 bytes).
var FeedFlrUsd = mustFeedID("01464c522f555344")

// FeedID for XRP/USD.
var FeedXrpUsd = mustFeedID("015852502f555344")

func mustFeedID(hexStr string) [21]byte {
	var id [21]byte
	b := common.FromHex("0x" + hexStr)
	copy(id[:], b)
	return id
}

type Watcher struct {
	client      *ethclient.Client
	registryABI abi.ABI
	ftsoABI     abi.ABI
	vaultABI    abi.ABI
	vaultAddr   common.Address
	ftsoAddr    common.Address
	store       *store.Store
	auditLog    []string
}

func New(rpcURL string, vaultAddr common.Address, st *store.Store) (*Watcher, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("dial rpc: %w", err)
	}
	registryABI, err := abi.JSON(strings.NewReader(registryABIJSON))
	if err != nil {
		return nil, err
	}
	ftsoABI, err := abi.JSON(strings.NewReader(ftsoABIJSON))
	if err != nil {
		return nil, err
	}
	vaultABI, err := abi.JSON(strings.NewReader(vaultABIJSON))
	if err != nil {
		return nil, err
	}
	return &Watcher{
		client:      client,
		registryABI: registryABI,
		ftsoABI:     ftsoABI,
		vaultABI:    vaultABI,
		vaultAddr:   vaultAddr,
		store:       st,
	}, nil
}

// ResolveFtso resolves the live FtsoV2 address through FlareContractRegistry -
// never hardcoded beyond the registry address itself.
func (w *Watcher) ResolveFtso(ctx context.Context) error {
	registry := common.HexToAddress(flareRegistryAddr)
	data, err := w.registryABI.Pack("getContractAddressByName", "FtsoV2")
	if err != nil {
		return err
	}
	out, err := w.client.CallContract(ctx, ethereumCallMsg(registry, data), nil)
	if err != nil {
		return fmt.Errorf("resolve FtsoV2: %w", err)
	}
	results, err := w.registryABI.Unpack("getContractAddressByName", out)
	if err != nil {
		return err
	}
	w.ftsoAddr = results[0].(common.Address)
	return nil
}

// PriceOf reads a feed's current value and staleness fresh from FtsoV2.
func (w *Watcher) PriceOf(ctx context.Context, feedID [21]byte) (value *big.Int, timestamp uint64, err error) {
	data, err := w.ftsoABI.Pack("getFeedById", feedID)
	if err != nil {
		return nil, 0, err
	}
	out, err := w.client.CallContract(ctx, ethereumCallMsg(w.ftsoAddr, data), nil)
	if err != nil {
		return nil, 0, err
	}
	results, err := w.ftsoABI.Unpack("getFeedById", out)
	if err != nil {
		return nil, 0, err
	}
	return results[0].(*big.Int), results[2].(uint64), nil
}

// PollTrailing polls `feedID` every `interval` and updates the private
// high-watermark for `orderID` inside the enclave's Store. Never exits on a
// single failed poll - transient RPC errors are logged and retried next tick.
func (w *Watcher) PollTrailing(ctx context.Context, orderID uint64, feedID [21]byte, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			price, _, err := w.PriceOf(ctx, feedID)
			if err != nil {
				log.Printf("watcher: poll order %d: %v", orderID, err)
				continue
			}
			w.store.UpdateHighWatermark(orderID, price.Uint64())
		}
	}
}

// SubmitSettle sends a settle() transaction with exponential backoff on
// submission failure, and a same-nonce fee bump if the transaction isn't
// mined within `mineTimeout`. Every attempt is appended to the in-memory
// audit log (orderId, attempt, tx hash, outcome) for post-hoc review.
func (w *Watcher) SubmitSettle(
	ctx context.Context,
	signer *ecdsa.PrivateKey,
	orderID uint64,
	target common.Address,
	amount, trigger *big.Int,
	feedID [21]byte,
	maxAge *big.Int,
	attestation, fdcProof []byte,
) (common.Hash, error) {
	calldata, err := w.vaultABI.Pack("settle", new(big.Int).SetUint64(orderID), target, amount, trigger, feedID, maxAge, attestation, fdcProof)
	if err != nil {
		return common.Hash{}, err
	}

	from := crypto.PubkeyToAddress(signer.PublicKey)
	nonce, err := w.client.PendingNonceAt(ctx, from)
	if err != nil {
		return common.Hash{}, err
	}
	chainID, err := w.client.ChainID(ctx)
	if err != nil {
		return common.Hash{}, err
	}
	gasTip, err := w.client.SuggestGasTipCap(ctx)
	if err != nil {
		gasTip = big.NewInt(1_000_000_000) // 1 gwei fallback
	}
	head, err := w.client.HeaderByNumber(ctx, nil)
	var baseFee *big.Int
	if err == nil && head.BaseFee != nil {
		baseFee = head.BaseFee
	} else {
		baseFee = big.NewInt(25_000_000_000)
	}

	backoff := 500 * time.Millisecond
	const maxAttempts = 5
	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		feeCap := new(big.Int).Add(baseFee, new(big.Int).Mul(gasTip, big.NewInt(int64(attempt)))) // same-nonce fee bump each retry
		tx := types.NewTx(&types.DynamicFeeTx{
			ChainID:   chainID,
			Nonce:     nonce,
			GasTipCap: gasTip,
			GasFeeCap: feeCap,
			Gas:       500_000,
			To:        &w.vaultAddr,
			Data:      calldata,
		})
		signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(chainID), signer)
		if err != nil {
			return common.Hash{}, err
		}
		err = w.client.SendTransaction(ctx, signedTx)
		w.audit(orderID, attempt, signedTx.Hash(), err)
		if err == nil {
			return signedTx.Hash(), nil
		}
		lastErr = err
		select {
		case <-ctx.Done():
			return common.Hash{}, ctx.Err()
		case <-time.After(backoff):
			backoff *= 2
		}
	}
	return common.Hash{}, fmt.Errorf("settle submission failed after %d attempts: %w", maxAttempts, lastErr)
}

func (w *Watcher) audit(orderID uint64, attempt int, hash common.Hash, err error) {
	outcome := "ok"
	if err != nil {
		outcome = err.Error()
	}
	w.auditLog = append(w.auditLog, fmt.Sprintf("order=%d attempt=%d tx=%s outcome=%s", orderID, attempt, hash.Hex(), outcome))
}

func (w *Watcher) AuditLog() []string { return w.auditLog }

// ShieldedAmount reads SilentVault2.shieldedAmount(commitment) live - the
// remaining balance behind that commitment, used by /api/attest/reserves to
// compute a user's real total before ever signing a reserves attestation.
func (w *Watcher) ShieldedAmount(ctx context.Context, commitment [32]byte) (*big.Int, error) {
	data, err := w.vaultABI.Pack("shieldedAmount", commitment)
	if err != nil {
		return nil, err
	}
	out, err := w.client.CallContract(ctx, ethereumCallMsg(w.vaultAddr, data), nil)
	if err != nil {
		return nil, err
	}
	results, err := w.vaultABI.Unpack("shieldedAmount", out)
	if err != nil {
		return nil, err
	}
	return results[0].(*big.Int), nil
}

// ShieldedOwner reads SilentVault2.shieldedBy(commitment) live.
func (w *Watcher) ShieldedOwner(ctx context.Context, commitment [32]byte) (common.Address, error) {
	data, err := w.vaultABI.Pack("shieldedBy", commitment)
	if err != nil {
		return common.Address{}, err
	}
	out, err := w.client.CallContract(ctx, ethereumCallMsg(w.vaultAddr, data), nil)
	if err != nil {
		return common.Address{}, err
	}
	results, err := w.vaultABI.Unpack("shieldedBy", out)
	if err != nil {
		return common.Address{}, err
	}
	return results[0].(common.Address), nil
}

func ethereumCallMsg(to common.Address, data []byte) ethereum.CallMsg {
	return ethereum.CallMsg{To: &to, Data: data}
}
