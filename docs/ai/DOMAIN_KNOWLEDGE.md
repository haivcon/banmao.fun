# Banmao.fun domain knowledge

This document is an approved, conservative orientation source. Live state, balances, rounds, prices, addresses, and deployment status must be checked with approved tools or current versioned manifests.

## Ecosystem

Banmao.fun is a modular Web3 social, DeFi, Collection, and GameFi application for X Layer. It uses Next.js and React in the frontend, Wagmi and Viem for wallet and chain access, and Solidity contracts. The main AI surfaces are Landing, DeFi, GameFi, and Collection.

## DeFi

The application contains staking, burn, airdrop, BanmaoBox, and launchpad areas. The AI has bounded read adapters for X Layer chain ID 196 staking state, approved burn-address balances, and stored airdrop records when their feature flags are enabled.

BanmaoBox is a permissionless Factory to per-token Box to immutable Renderer design for transferable, time-locked ERC-20 gift-box NFTs. A box may contain a primary token or a basket of two to five distinct ERC-20 assets. Release occurs after unlock to the current NFT owner. Token-level behavior such as rebasing, blacklist, pause, fees, or upgrades remains a risk. The checked-in X Layer mainnet manifest marks BanmaoBox as not deployed; source code and testnet records are not proof of a mainnet deployment.

Transaction Copilot is prepare-and-simulate only. It does not sign or submit transactions. A simulation can become stale before a user reviews and signs in their wallet.

## GameFi

The repository includes FOMO, PK, Rock Paper Scissors, Slots, and Snake areas. Presence in source code does not prove that a game is currently live on X Layer mainnet.

FOMO has an approved read-only chain adapter for the configured X Layer contract when enabled. BanMaoPK must be described as unavailable on mainnet unless a current chain-196 deployment is verified.

Banmao Slots uses wallet-based commit/reveal spins, multiple liquidity pools, multi-spin flows, profiles, leaderboards, and pool-owner tools. Commit/reveal improves verifiability but does not remove contract, pool, transaction, or loss risk. Browser-local player profiles are not authoritative on-chain identity.

The Snake reward contract documentation specifies EIP-712 claim verification, a minimum claim threshold of 100 tokens, a daily player cap of 5,000 tokens, and an hourly system-wide cap of 50,000 tokens. Confirm current deployed configuration before presenting these as live values.

## Collection and Hub

Collection includes public Hub profiles and posts, media search, prompts, and quest reads. Approved tools use bounded internal database reads and Cloudinary collection readers. Tool failure must be reported as unavailable, never replaced with invented media or activity.

Ideas such as token-gated content, minting posts as NFTs, decentralized storage, or other roadmap proposals are not automatically active features. Public wallet-linked content is not proof of wallet ownership, and browser-local profile data is not security identity.

## Market data

Approved market readers use strict OKX endpoint allowlists. Price, candles, sentiment, token discovery, and liquidity information are time-sensitive. Report source and observation time, avoid predictions presented as facts, and never convert market context into guaranteed-return language.
