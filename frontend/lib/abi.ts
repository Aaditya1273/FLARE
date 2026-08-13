export const SILENT_VAULT_ABI = [
  {
    type: "function",
    name: "shield",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "commitment", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setEncryptedPolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "commitment", type: "bytes32" },
      { name: "ciphertext", type: "bytes" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "tick",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [{ name: "id", type: "bytes32" }],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "uint256" },
      { name: "target", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "revealedTrigger", type: "uint256" },
      { name: "feedId", type: "bytes21" },
      { name: "maxAge", type: "uint256" },
      { name: "attestation", type: "bytes" },
      { name: "fdcProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "proveReserves",
    stateMutability: "view",
    inputs: [
      { name: "attestation", type: "bytes" },
      { name: "threshold", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "shieldedBy",
    stateMutability: "view",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "shieldedAmount",
    stateMutability: "view",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "orderCommitment",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "settledOrder",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "policyRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "Shielded",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PolicySet",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "policyHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "InstructionSent",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "orderId", type: "uint256", indexed: true },
      { name: "payload", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Settled",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "trigger", type: "uint256", indexed: false },
      { name: "attestation", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CrossChainEvidenceRecorded",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "evidenceHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;
