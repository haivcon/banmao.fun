// lib/abis.ts
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const RPS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "address", name: "_communityWallet", type: "address" },
      { internalType: "address", name: "_deadWallet", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "roomId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint256", name: "stake", type: "uint256" },
    ],
    name: "RoomCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "roomId", type: "uint256" },
      { indexed: true, internalType: "address", name: "loser", type: "address" },
      { indexed: true, internalType: "address", name: "winner", type: "address" },
      { indexed: false, internalType: "uint256", name: "winnerPayout", type: "uint256" },
    ],
    name: "Forfeited",
    type: "event",
  },
  {
    inputs: [
      { internalType: "uint256", name: "stake", type: "uint256" },
      { internalType: "uint64", name: "commitDurationSecs", type: "uint64" },
    ],
    name: "createRoom",
    outputs: [{ internalType: "uint256", name: "roomId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "roomId", type: "uint256" },
      { internalType: "bytes32", name: "commitHash", type: "bytes32" },
    ],
    name: "commit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "roomId", type: "uint256" }],
    name: "joinRoom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "roomId", type: "uint256" },
      { internalType: "uint8", name: "c", type: "uint8" },
      { internalType: "bytes32", name: "salt", type: "bytes32" },
    ],
    name: "reveal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "roomId", type: "uint256" }],
    name: "claimTimeout",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "roomId", type: "uint256" }],
    name: "forfeit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    // mapping(uint256 => Room) public rooms
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "rooms",
    outputs: [
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "address", name: "opponent", type: "address" },
      { internalType: "uint256", name: "stake", type: "uint256" },
      { internalType: "bytes32", name: "commitA", type: "bytes32" },
      { internalType: "bytes32", name: "commitB", type: "bytes32" },
      { internalType: "uint8", name: "revealA", type: "uint8" },
      { internalType: "uint8", name: "revealB", type: "uint8" },
      { internalType: "uint64", name: "commitDeadline", type: "uint64" },
      { internalType: "uint64", name: "revealDeadline", type: "uint64" },
      { internalType: "uint8", name: "state", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    // ✅ các getter public thêm vào NẰM TRONG mảng
    inputs: [],
    name: "nextRoomId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "communityWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deadWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "communityWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deadWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
