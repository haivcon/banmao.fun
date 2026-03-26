# Smart Contracts

This directory contains Solidity smart contracts for the Banmao ecosystem.

## Contracts

### BanMaoSnake.sol
Snake game reward distribution contract with:
- EIP-712 signature verification
- Daily per-player caps (5000 tokens)
- Hourly system-wide caps (50000 tokens)
- Minimum claim threshold (100 tokens)

## Development

To compile and test contracts, set up a Hardhat or Foundry project in this directory.

```bash
# Example with Hardhat
npm init -y
npm install --save-dev hardhat @openzeppelin/contracts
npx hardhat
```
