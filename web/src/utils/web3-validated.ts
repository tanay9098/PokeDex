import { ethers } from 'ethers';
import {
  Web3Error,
  WalletNotConnectedError,
  InvalidContractAddressError,
  NetworkSwitchError,
  SignerError,
  ContractInitializationError,
  TransactionError,
  isValidAddress,
  logError,
} from './web3-error-handler';

/**
 * Web3 utilities for interacting with Polygon blockchain and smart contracts
 * This is an enhanced version with comprehensive error handling and validation
 */

export interface ContractAddresses {
  pokemonNFT: string;
  marketplace: string;
}

let provider: ethers.Provider | null = null;
let signer: ethers.Signer | null = null;
let pokemonNFTContract: ethers.Contract | null = null;
let marketplaceContract: ethers.Contract | null = null;

const POKEMON_NFT_ABI = [
  'function mintPokemon(address to, uint256 pokemonId, string name, string species, uint256 baseExperience, uint256 height, uint256 weight, string[] types, uint256 hp, uint256 attack, uint256 defense, uint256 spAtk, uint256 spDef, uint256 speed, uint256 rarity, string ipfsHash) public returns (uint256)',
  'function getPokemonCard(uint256 tokenId) public view returns (tuple(uint256 pokemonId, string name, string species, uint256 baseExperience, uint256 height, uint256 weight, string[] types, uint256 hp, uint256 attack, uint256 defense, uint256 spAtk, uint256 spDef, uint256 speed, uint256 rarity, uint256 mintedAt, string ipfsHash))',
  'function getUserCollection(address user) public view returns (uint256[])',
  'function initiateBattle(uint256 pokemon1TokenId, uint256 pokemon2TokenId, address player2) public returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
];

const MARKETPLACE_ABI = [
  'function listPokemon(uint256 tokenId, uint256 price) public',
  'function cancelListing(uint256 tokenId) public',
  'function buyPokemon(uint256 tokenId) public payable',
  'function makeOffer(uint256 tokenId, uint256 expiresAt) public payable',
  'function acceptOffer(uint256 tokenId, uint256 offerId) public',
  'function getListing(uint256 tokenId) public view returns (tuple(address seller, uint256 price, bool active))',
];

/**
 * Check if window.ethereum is available
 */
function hasEthereum(): boolean {
  return typeof window !== 'undefined' && window.ethereum !== undefined;
}

/**
 * Validate contract addresses
 */
function validateContractAddresses(addresses: ContractAddresses): void {
  if (!isValidAddress(addresses.pokemonNFT)) {
    throw new InvalidContractAddressError(addresses.pokemonNFT);
  }
  if (!isValidAddress(addresses.marketplace)) {
    throw new InvalidContractAddressError(addresses.marketplace);
  }
}

/**
 * Initialize Web3 provider and signer with comprehensive error handling
 */
export async function initializeWeb3(contractAddresses: ContractAddresses): Promise<void> {
  try {
    // Validate input
    validateContractAddresses(contractAddresses);

    // Check for wallet
    if (!hasEthereum()) {
      throw new WalletNotConnectedError();
    }

    // Connect to Polygon network
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
    } catch (error) {
      logError(error, 'initializeWeb3 - provider/signer');
      throw new SignerError(error);
    }

    // Initialize contracts
    try {
      pokemonNFTContract = new ethers.Contract(
        contractAddresses.pokemonNFT,
        POKEMON_NFT_ABI,
        signer
      );
      marketplaceContract = new ethers.Contract(
        contractAddresses.marketplace,
        MARKETPLACE_ABI,
        signer
      );
    } catch (error) {
      logError(error, 'initializeWeb3 - contract initialization');
      throw new ContractInitializationError('PokemonNFT/Marketplace', error);
    }

    console.log('Web3 initialized successfully');
  } catch (error) {
    logError(error, 'initializeWeb3');
    throw error;
  }
}

/**
 * Switch to Polygon network with enhanced error handling
 */
export async function switchToPolygon(): Promise<void> {
  try {
    if (!hasEthereum()) {
      throw new WalletNotConnectedError();
    }

    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], // Polygon Mainnet
    });
  } catch (error: any) {
    // If the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x89',
              chainName: 'Polygon',
              rpcUrls: ['https://polygon-rpc.com'],
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              blockExplorerUrls: ['https://polygonscan.com'],
            },
          ],
        });
      } catch (addError) {
        logError(addError, 'switchToPolygon - add chain');
        throw new NetworkSwitchError(addError);
      }
    } else {
      logError(error, 'switchToPolygon');
      throw new NetworkSwitchError(error);
    }
  }
}

/**
 * Get connected account with error handling
 */
export async function getConnectedAccount(): Promise<string> {
  try {
    if (!hasEthereum()) {
      throw new WalletNotConnectedError();
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new WalletNotConnectedError();
    }

    return accounts[0];
  } catch (error) {
    logError(error, 'getConnectedAccount');
    throw error;
  }
}

/**
 * Ensure contracts are initialized
 */
function ensureContractsInitialized(): void {
  if (!pokemonNFTContract || !marketplaceContract || !signer) {
    throw new Web3Error(
      'Web3 not initialized. Call initializeWeb3() first.',
      'WEB3_NOT_INITIALIZED'
    );
  }
}

/**
 * Mint a Pokemon NFT with error handling
 */
export async function mintPokemonNFT(
  pokemonData: any,
  rarity: number,
  ipfsHash: string
): Promise<string> {
  try {
    ensureContractsInitialized();

    const tx = await pokemonNFTContract!.mintPokemon(
      await signer!.getAddress(),
      pokemonData.pokemonId,
      pokemonData.name,
      pokemonData.species,
      pokemonData.baseExperience,
      pokemonData.height,
      pokemonData.weight,
      pokemonData.types,
      pokemonData.stats.hp,
      pokemonData.stats.attack,
      pokemonData.stats.defense,
      pokemonData.stats.spAtk,
      pokemonData.stats.spDef,
      pokemonData.stats.speed,
      rarity,
      ipfsHash
    );

    const receipt = await tx.wait();
    return receipt.transactionHash;
  } catch (error) {
    logError(error, 'mintPokemonNFT');
    throw new TransactionError('Mint Pokemon NFT', error);
  }
}

/**
 * Get user's Pokemon collection with error handling
 */
export async function getUserPokemonCollection(address: string): Promise<number[]> {
  try {
    ensureContractsInitialized();

    if (!isValidAddress(address)) {
      throw new InvalidContractAddressError(address);
    }

    return await pokemonNFTContract!.getUserCollection(address);
  } catch (error) {
    logError(error, 'getUserPokemonCollection');
    throw error;
  }
}

/**
 * Get Pokemon card details with error handling
 */
export async function getPokemonCard(tokenId: number): Promise<any> {
  try {
    ensureContractsInitialized();

    if (tokenId < 0) {
      throw new Web3Error('Token ID must be non-negative', 'INVALID_TOKEN_ID');
    }

    return await pokemonNFTContract!.getPokemonCard(tokenId);
  } catch (error) {
    logError(error, 'getPokemonCard');
    throw error;
  }
}

/**
 * List Pokemon for sale with error handling
 */
export async function listPokemonForSale(tokenId: number, price: string): Promise<string> {
  try {
    ensureContractsInitialized();

    if (tokenId < 0) {
      throw new Web3Error('Token ID must be non-negative', 'INVALID_TOKEN_ID');
    }

    if (parseFloat(price) <= 0) {
      throw new Web3Error('Price must be greater than 0', 'INVALID_PRICE');
    }

    const priceInWei = ethers.parseEther(price);
    const tx = await marketplaceContract!.listPokemon(tokenId, priceInWei);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  } catch (error) {
    logError(error, 'listPokemonForSale');
    throw new TransactionError('List Pokemon for Sale', error);
  }
}

/**
 * Buy Pokemon from marketplace with error handling
 */
export async function buyPokemonNFT(tokenId: number, priceInWei: bigint): Promise<string> {
  try {
    ensureContractsInitialized();

    if (tokenId < 0) {
      throw new Web3Error('Token ID must be non-negative', 'INVALID_TOKEN_ID');
    }

    if (priceInWei <= 0n) {
      throw new Web3Error('Price must be greater than 0', 'INVALID_PRICE');
    }

    const tx = await marketplaceContract!.buyPokemon(tokenId, { value: priceInWei });
    const receipt = await tx.wait();
    return receipt.transactionHash;
  } catch (error) {
    logError(error, 'buyPokemonNFT');
    throw new TransactionError('Buy Pokemon NFT', error);
  }
}

/**
 * Make an offer on Pokemon with error handling
 */
export async function makeOfferOnPokemon(
  tokenId: number,
  priceInWei: bigint,
  expiresAt: number
): Promise<string> {
  try {
    ensureContractsInitialized();

    if (tokenId < 0) {
      throw new Web3Error('Token ID must be non-negative', 'INVALID_TOKEN_ID');
    }

    if (priceInWei <= 0n) {
      throw new Web3Error('Price must be greater than 0', 'INVALID_PRICE');
    }

    if (expiresAt <= 0) {
      throw new Web3Error('Expiration time must be in the future', 'INVALID_EXPIRATION');
    }

    const tx = await marketplaceContract!.makeOffer(tokenId, expiresAt, { value: priceInWei });
    const receipt = await tx.wait();
    return receipt.transactionHash;
  } catch (error) {
    logError(error, 'makeOfferOnPokemon');
    throw new TransactionError('Make Offer on Pokemon', error);
  }
}

/**
 * Accept an offer with error handling
 */
export async function acceptOfferOnPokemon(tokenId: number, offerId: number): Promise<string> {
  try {
    ensureContractsInitialized();

    if (tokenId < 0) {
      throw new Web3Error('Token ID must be non-negative', 'INVALID_TOKEN_ID');
    }

    if (offerId < 0) {
      throw new Web3Error('Offer ID must be non-negative', 'INVALID_OFFER_ID');
    }

    const tx = await marketplaceContract!.acceptOffer(tokenId, offerId);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  } catch (error) {
    logError(error, 'acceptOfferOnPokemon');
    throw new TransactionError('Accept Offer on Pokemon', error);
  }
}

/**
 * Initiate a Pokemon battle with error handling
 */
export async function initiatePokemonBattle(
  pokemon1TokenId: number,
  pokemon2TokenId: number,
  player2Address: string
): Promise<string> {
  try {
    ensureContractsInitialized();

    if (pokemon1TokenId < 0 || pokemon2TokenId < 0) {
      throw new Web3Error('Token IDs must be non-negative', 'INVALID_TOKEN_ID');
    }

    if (!isValidAddress(player2Address)) {
      throw new InvalidContractAddressError(player2Address);
    }

    const tx = await pokemonNFTContract!.initiateBattle(
      pokemon1TokenId,
      pokemon2TokenId,
      player2Address
    );
    const receipt = await tx.wait();
    return receipt.transactionHash;
  } catch (error) {
    logError(error, 'initiatePokemonBattle');
    throw new TransactionError('Initiate Pokemon Battle', error);
  }
}

/**
 * Get listing details with error handling
 */
export async function getListing(tokenId: number): Promise<any> {
  try {
    ensureContractsInitialized();

    if (tokenId < 0) {
      throw new Web3Error('Token ID must be non-negative', 'INVALID_TOKEN_ID');
    }

    return await marketplaceContract!.getListing(tokenId);
  } catch (error) {
    logError(error, 'getListing');
    throw error;
  }
}

/**
 * Get current provider
 */
export function getProvider(): ethers.Provider | null {
  return provider;
}

/**
 * Get current signer
 */
export function getSigner(): ethers.Signer | null {
  return signer;
}
