# Pokemon NFT Blockchain Integration

This document describes the blockchain integration for the PokeDex project, enabling Pokemon cards from Pokéapi to be minted as NFTs on the Polygon network.

## Overview

- **Blockchain**: Polygon (Layer 2 for Ethereum)
- **Smart Contract Language**: Solidity 0.8.20
- **NFT Standard**: ERC-721 with URI Storage and Enumerable extensions
- **Frontend**: React with TypeScript + Vite
- **Web3 Library**: ethers.js v6

## Architecture

### Smart Contracts

#### 1. PokemonNFT.sol
- ERC-721 based NFT contract for Pokemon cards
- Stores on-chain metadata for each Pokemon card
- Supports Pokemon battles and collection management
- Features:
  - Mint Pokemon NFTs with PokéAPI data
  - Track Pokemon statistics (HP, Attack, Defense, etc.)
  - Battle system with stat comparison
  - Collection management functions

#### 2. PokemonMarketplace.sol
- Marketplace for trading Pokemon NFTs
- Features:
  - List Pokemon for sale with fixed prices
  - Make offers on Pokemon
  - Accept/reject offers
  - Platform fee collection (2.5%)
  - Reentrancy protection

### Frontend Integration

#### Web3 Utilities (web/src/utils/web3.ts)
- Connect to Polygon network via MetaMask
- Mint Pokemon NFTs
- List/buy Pokemon on marketplace
- Make/accept/cancel offers
- Initiate battles

#### PokéAPI Integration (web/src/utils/pokeapi.ts)
- Fetch Pokemon data from PokéAPI
- Calculate rarity based on stats
- Generate IPFS hashes for artwork
- Validate Pokemon IDs

## Setup Instructions

### Prerequisites
- Node.js 16+
- MetaMask or compatible Web3 wallet
- MATIC tokens for Polygon Testnet (Mumbai)

### Installation

```bash
# Install dependencies
npm install

# Install Hardhat dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomiclabs/hardhat-etherscan dotenv
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `POLYGON_MUMBAI_RPC_URL`: RPC endpoint for Polygon Mumbai testnet
- `POLYGON_MAINNET_RPC_URL`: RPC endpoint for Polygon mainnet
- `PRIVATE_KEY`: Your wallet private key (testnet only)
- `POLYGONSCAN_API_KEY`: For contract verification
- `PINATA_API_KEY` & `PINATA_API_SECRET`: For IPFS storage (optional)

### Deployment

#### Deploy to Local Network
```bash
npx hardhat run scripts/deploy.ts --network hardhat
```

#### Deploy to Polygon Mumbai Testnet
```bash
npx hardhat run scripts/deployTestnet.ts --network polygonMumbai
```

#### Deploy to Polygon Mainnet
```bash
npx hardhat run scripts/deploy.ts --network polygonMainnet
```

### Testing

```bash
npx hardhat test
```

## Usage

### Minting a Pokemon NFT

```typescript
import { mintPokemonNFT, switchToPolygon, initializeWeb3 } from './utils/web3';
import { fetchPokemonData, calculateRarity } from './utils/pokeapi';

// Switch to Polygon
await switchToPolygon();

// Initialize Web3
await initializeWeb3({
  pokemonNFT: '0x...',
  marketplace: '0x...'
});

// Fetch Pokemon data
const pokemonData = await fetchPokemonData(25); // Pikachu

// Calculate rarity
const rarity = calculateRarity(pokemonData);

// Mint NFT
const txHash = await mintPokemonNFT(pokemonData, rarity, 'ipfs://QmHash');
```

### Trading Pokemon

```typescript
import { listPokemonForSale, buyPokemonNFT } from './utils/web3';

// List Pokemon for sale
await listPokemonForSale(1, '1.5'); // 1.5 MATIC

// Buy Pokemon
const priceInWei = ethers.parseEther('1.5');
await buyPokemonNFT(1, priceInWei);
```

### Initiating a Battle

```typescript
import { initiatePokemonBattle } from './utils/web3';

// Challenge another player
await initiatePokemonBattle(
  tokenId1,
  tokenId2,
  opponentAddress
);
```

## Network Information

### Polygon Mumbai Testnet
- Chain ID: 80001
- RPC: https://rpc-mumbai.maticvigil.com
- Explorer: https://mumbai.polygonscan.com
- Faucet: https://faucet.polygon.technology/

### Polygon Mainnet
- Chain ID: 137
- RPC: https://polygon-rpc.com
- Explorer: https://polygonscan.com

## Contract Verification

After deployment, verify contracts on PolygonScan:

```bash
npx hardhat verify --network polygonMumbai DEPLOYED_ADDRESS constructor_args
```

## Security Considerations

1. **Private Keys**: Never commit `.env` file with real private keys
2. **Reentrancy**: Marketplace uses ReentrancyGuard for protection
3. **Access Control**: Only contract owner can mint NFTs
4. **Fee Structure**: 2.5% platform fee on all trades

## Future Enhancements

- [ ] Staking mechanism for Pokemon
- [ ] Breeding system to create new Pokemon
- [ ] Tournament system with rewards
- [ ] Cross-chain interoperability
- [ ] DAO governance for platform decisions
- [ ] Fractional NFT ownership
- [ ] Advanced battle mechanics with random outcomes

## Resources

- [Polygon Documentation](https://polygon.technology/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [PokéAPI Documentation](https://pokeapi.co/)

## Support

For issues or questions, please open an issue on GitHub.