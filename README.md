# PokeDex — Pokemon NFT Marketplace

A full-stack Pokemon NFT marketplace where you can collect, trade, and battle Pokemon as digital collectibles (NFTs) on the Polygon blockchain. Available as both a web app and mobile app.

---

## For Non-Developers (Regular Users)

### What is this?

PokeDex lets you:
- **Collect** Pokemon as unique digital cards (NFTs) you truly own
- **Trade** Pokemon with other players on the marketplace
- **Battle** your Pokemon against others using real stat comparisons
- **Browse** all 800+ Pokemon from the official PokéAPI

### What you need to get started

1. **A crypto wallet** — Install [MetaMask](https://metamask.io) (browser extension) or use any Polygon-compatible wallet
2. **MATIC tokens** — The currency used on the Polygon network. You can get free test MATIC from the [Polygon Amoy Faucet](https://faucet.polygon.technology/) for testing
3. **A browser or mobile device** — The app works on web and mobile (iOS/Android)

### How to use the Web App

1. Open the app in your browser
2. Click **Connect Wallet** and approve the connection in MetaMask
3. Switch your wallet network to **Polygon Amoy Testnet** (the app will prompt you)
4. Browse Pokemon and click **Mint** to create your first NFT — this costs a small amount of MATIC
5. View your collection in the **My Collection** tab
6. List Pokemon for sale or make offers on others' Pokemon in the **Marketplace** tab
7. Challenge others in the **Battle** tab

### How to use the Mobile App

1. Download and open the app on your device
2. Browse Pokemon from the home screen
3. Tap any Pokemon for details
4. Connect your wallet to mint, trade, or battle
5. Navigate using the bottom tabs: **Home**, **Collection**, **Marketplace**, **Battle**

### Costs

| Action | Estimated Cost |
|---|---|
| Mint a Pokemon NFT | ~0.01 MATIC + gas |
| List on Marketplace | Gas fee only |
| Buy a Pokemon | Listed price + 2.5% platform fee + gas |
| Battle | Gas fee only |

> Use the **Amoy Testnet** with free test MATIC to try everything for free before spending real money.

---

## For Developers

### Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.25, Hardhat, OpenZeppelin v5 |
| Blockchain | Polygon (Amoy Testnet / Mainnet) |
| Web Frontend | React 19, TypeScript, Vite 5, ethers.js v6 |
| Mobile App | Expo ~54, React Native 0.81, Expo Router |
| Data | PokéAPI (pokemon data), Pinata (IPFS metadata) |

### Project Structure

```
PokeDex/
├── contracts/                  # Solidity smart contracts
│   ├── PokemonNFT.sol          # ERC-721 NFT contract with battle mechanics
│   ├── PokemonMarketplace.sol  # Trading with 2.5% platform fee
│   ├── BattleRewards.sol       # Battle reward system
│   └── PokemonToken.sol        # Utility token
├── scripts/
│   ├── deploy.ts               # Mainnet deployment
│   └── deployTestnet.ts        # Amoy testnet deployment
├── test/                       # Contract tests
├── web/                        # React web application
│   └── src/
│       ├── hooks/              # useWeb3, useBattleSimulator
│       ├── utils/              # web3, pokeapi, error handling
│       └── App.tsx
├── mobile/                     # Expo React Native app
│   └── app/
│       └── (tabs)/             # index, collection, marketplace, battle
├── hardhat.config.ts
├── deployment-addresses-testnet.json
└── .env.example
```

### Prerequisites

- Node.js v18+
- npm v9+
- MetaMask or any Polygon-compatible wallet
- MATIC tokens (free testnet MATIC from [faucet](https://faucet.polygon.technology/))

### Setup

**1. Clone and install root dependencies**

```bash
git clone https://github.com/tanay9098/pokedex.git
cd PokeDex
npm install
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
PRIVATE_KEY=your_wallet_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key
PINATA_API_KEY=your_pinata_api_key          # optional, for IPFS metadata
PINATA_API_SECRET=your_pinata_secret        # optional
```

> Never commit your `.env` file or expose your private key.

**3. Compile smart contracts**

```bash
npm run hardhat:compile
```

**4. Run contract tests**

```bash
npm run hardhat:test
```

**5. Deploy contracts**

```bash
# Polygon Amoy Testnet
npm run hardhat:deploy:testnet

# Polygon Mainnet
npm run hardhat:deploy:mainnet
```

Deployed addresses are saved to `deployment-addresses-testnet.json`.

### Running the Web App

```bash
cd web
npm install
npm run dev       # Development server at http://localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Running the Mobile App

```bash
cd mobile
npm install
npx expo start    # Start Expo dev server (scan QR with Expo Go)
npm run android   # Run on Android emulator/device
npm run ios       # Run on iOS simulator/device
npm run web       # Run in browser
```

### Deployed Contract Addresses (Polygon Amoy Testnet)

| Contract | Address |
|---|---|
| PokemonNFT | `0xc510C064C14B8eF2838d31a64bV69c02cf315289` |
| PokemonMarketplace | `0x225E3dB2d27846eef2A5bfBf6202dd37178634A7` |

- **Network:** Polygon Amoy Testnet
- **Chain ID:** 80002
- **RPC:** `https://rpc-amoy.polygon.technology/`

### Smart Contract Overview

**PokemonNFT.sol** — ERC-721 contract
- Mint Pokemon NFTs with on-chain stats (HP, Attack, Defense, Speed)
- Battle mechanics built directly into the contract
- Metadata stored on IPFS via Pinata

**PokemonMarketplace.sol**
- List NFTs for fixed price
- Make and accept offers
- 2.5% platform fee on sales
- Reentrancy protection via OpenZeppelin

**BattleRewards.sol**
- Distributes rewards to battle winners

**PokemonToken.sol**
- ERC-20 utility token for the ecosystem

### Key Web3 Utilities

| File | Purpose |
|---|---|
| `web/src/utils/web3.ts` | Core minting, trading, battle functions |
| `web/src/utils/web3-validated.ts` | Input-validated Web3 wrappers |
| `web/src/utils/web3-error-handler.ts` | Error parsing and user-friendly messages |
| `web/src/utils/pokeapi.ts` | PokéAPI data fetching |
| `web/src/hooks/useWeb3.ts` | React hook for wallet state |
| `web/src/hooks/useBattleSimulator.ts` | Battle simulation logic |

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

### Security Notes

- Smart contracts use OpenZeppelin's `ReentrancyGuard` and `Ownable`
- Never share or commit your private key
- Audit contracts before mainnet deployment
- Use testnet for all development and testing

---

## License

MIT
