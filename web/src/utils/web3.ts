import { ethers } from 'ethers';

/**
 * Web3 utilities for interacting with Polygon blockchain and smart contracts
 */

export interface ContractAddresses {
  pokemonNFT: string;
  marketplace: string;
}

let provider: ethers.Provider;
let signer: ethers.Signer;
let pokemonNFTContract: ethers.Contract;
let marketplaceContract: ethers.Contract;

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
 * Initialize Web3 provider and signer
 */
export async function initializeWeb3(contractAddresses: ContractAddresses): Promise<void> {
  // Connect to Polygon network
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();

  // Initialize contracts
  pokemonNFTContract = new ethers.Contract(contractAddresses.pokemonNFT, POKEMON_NFT_ABI, signer);
  marketplaceContract = new ethers.Contract(contractAddresses.marketplace, MARKETPLACE_ABI, signer);
}

/**
 * Switch to Polygon network
 */
export async function switchToPolygon(): Promise<void> {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], // Polygon Mainnet
    });
  } catch (error: any) {
    // If the chain has not been added to MetaMask
    if (error.code === 4902) {
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
    } else {
      throw error;
    }
  }
}

/**
 * Mint a Pokemon NFT
 */
export async function mintPokemonNFT(
  pokemonData: any,
  rarity: number,
  ipfsHash: string
): Promise<string> {
  const tx = await pokemonNFTContract.mintPokemon(
    await signer.getAddress(),
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
}

/**
 * Get user's Pokemon collection
 */
export async function getUserPokemonCollection(address: string): Promise<number[]> {
  return await pokemonNFTContract.getUserCollection(address);
}

/**
 * Get Pokemon card details
 */
export async function getPokemonCard(tokenId: number): Promise<any> {
  return await pokemonNFTContract.getPokemonCard(tokenId);
}

/**
 * List Pokemon for sale
 */
export async function listPokemonForSale(tokenId: number, price: string): Promise<string> {
  const priceInWei = ethers.parseEther(price);
  const tx = await marketplaceContract.listPokemon(tokenId, priceInWei);
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

/**
 * Buy Pokemon from marketplace
 */
export async function buyPokemonNFT(tokenId: number, priceInWei: bigint): Promise<string> {
  const tx = await marketplaceContract.buyPokemon(tokenId, { value: priceInWei });
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

/**
 * Make an offer on Pokemon
 */
export async function makeOfferOnPokemon(
  tokenId: number,
  priceInWei: bigint,
  expiresAt: number
): Promise<string> {
  const tx = await marketplaceContract.makeOffer(tokenId, expiresAt, { value: priceInWei });
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

/**
 * Accept an offer
 */
export async function acceptOfferOnPokemon(tokenId: number, offerId: number): Promise<string> {
  const tx = await marketplaceContract.acceptOffer(tokenId, offerId);
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

/**
 * Initiate a Pokemon battle
 */
export async function initiatePokemonBattle(
  pokemon1TokenId: number,
  pokemon2TokenId: number,
  player2Address: string
): Promise<string> {
  const tx = await pokemonNFTContract.initiateBattle(pokemon1TokenId, pokemon2TokenId, player2Address);
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

/**
 * Get listing details
 */
export async function getListing(tokenId: number): Promise<any> {
  return await marketplaceContract.getListing(tokenId);
}

/**
 * Get connected account
 */
export async function getConnectedAccount(): Promise<string> {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return accounts[0];
}
