import { expect } from 'chai';
import { ethers } from 'hardhat';
import { PokemonNFT } from '../typechain-types';

describe('PokemonNFT', function () {
  let pokemonNFT: PokemonNFT;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const PokemonNFT = await ethers.getContractFactory('PokemonNFT');
    pokemonNFT = await PokemonNFT.deploy();
    await pokemonNFT.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should have correct name and symbol', async function () {
      expect(await pokemonNFT.name()).to.equal('PokemonNFT');
      expect(await pokemonNFT.symbol()).to.equal('PKMN');
    });
  });

  describe('Minting', function () {
    it('Should mint a Pokemon NFT', async function () {
      const tx = await pokemonNFT.mintPokemon(
        addr1.address,
        1,
        'Bulbasaur',
        'bulbasaur',
        64,
        7,
        69,
        ['grass', 'poison'],
        45,
        49,
        49,
        65,
        65,
        45,
        1,
        'QmTestIPFSHash'
      );

      expect(tx).to.emit(pokemonNFT, 'PokemonMinted');
      expect(await pokemonNFT.balanceOf(addr1.address)).to.equal(1);
    });

    it('Should store correct Pokemon data', async function () {
      await pokemonNFT.mintPokemon(
        owner.address,
        25,
        'Pikachu',
        'pikachu',
        112,
        4,
        60,
        ['electric'],
        35,
        55,
        40,
        50,
        50,
        90,
        3,
        'QmPikachuIPFSHash'
      );

      const card = await pokemonNFT.getPokemonCard(0);
      expect(card.name).to.equal('Pikachu');
      expect(card.pokemonId).to.equal(25);
      expect(card.rarity).to.equal(3);
    });
  });

  describe('Collection', function () {
    it('Should return user collection', async function () {
      await pokemonNFT.mintPokemon(
        addr1.address,
        1,
        'Bulbasaur',
        'bulbasaur',
        64,
        7,
        69,
        ['grass', 'poison'],
        45,
        49,
        49,
        65,
        65,
        45,
        1,
        'QmTestIPFSHash1'
      );

      await pokemonNFT.mintPokemon(
        addr1.address,
        4,
        'Charmander',
        'charmander',
        62,
        6,
        85,
        ['fire'],
        39,
        52,
        43,
        60,
        50,
        65,
        2,
        'QmTestIPFSHash2'
      );

      const collection = await pokemonNFT.getUserCollection(addr1.address);
      expect(collection.length).to.equal(2);
    });
  });
});