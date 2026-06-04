// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokemonNFT
 * @dev NFT contract for Pokémon cards backed by PokéAPI data on Polygon
 * Each Pokémon card is a unique NFT that can be collected, traded, and battled
 */
contract PokemonNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _tokenIdCounter;

    // Rarity tier mint caps (0 = unlimited)
    // rarity 1=common, 2=uncommon, 3=rare, 4=epic, 5=legendary
    mapping(uint256 => uint256) public rarityMintCap;
    mapping(uint256 => uint256) public rarityMintCount;

    // Struct to store Pokemon metadata
    struct PokemonCard {
        uint256 pokemonId;        // PokéAPI ID
        string name;
        string species;
        uint256 baseExperience;
        uint256 height;
        uint256 weight;
        string[] types;
        uint256 hp;
        uint256 attack;
        uint256 defense;
        uint256 spAtk;
        uint256 spDef;
        uint256 speed;
        uint256 rarity;           // 1-5 (1=common, 5=legendary)
        uint256 mintedAt;
        string ipfsHash;          // IPFS hash for artwork
    }

    // Mapping from token ID to Pokemon card data
    mapping(uint256 => PokemonCard) public pokemonCards;

    // Mapping from Pokemon ID to array of token IDs (for tracking multiple copies)
    mapping(uint256 => uint256[]) public pokemonTokenIds;

    // Trading events
    event PokemonMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 pokemonId,
        string name,
        uint256 rarity
    );

    event PokemonListed(uint256 indexed tokenId, address indexed owner, uint256 price);
    event PokemonTraded(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 price
    );

    event PokemonBattleCreated(
        uint256 indexed battleId,
        uint256 indexed pokemon1TokenId,
        uint256 indexed pokemon2TokenId,
        address player1,
        address player2
    );

    event BattleCompleted(
        uint256 indexed battleId,
        address indexed winner,
        uint256 winnerTokenId,
        uint256 loserTokenId,
        uint256 winnerTotalStats,
        uint256 loserTotalStats
    );

    event BattleRewardEarned(
        uint256 indexed battleId,
        address indexed winner,
        uint256 rewardAmount,
        uint256 rarityBonus
    );

    // Battle tracking
    struct Battle {
        uint256 battleId;
        uint256 pokemon1TokenId;
        uint256 pokemon2TokenId;
        address player1;
        address player2;
        address winner;
        bool completed;
    }

    uint256 private _battleIdCounter;
    mapping(uint256 => Battle) public battles;

    // Leaderboard tracking
    mapping(address => uint256) public battleWins;
    mapping(address => uint256) public battleLosses;

    constructor() ERC721("PokemonNFT", "PKMN") Ownable(msg.sender) {
        // Default rarity caps: legendary=100, epic=500, rare=2000, uncommon=10000, common=unlimited
        rarityMintCap[5] = 100;
        rarityMintCap[4] = 500;
        rarityMintCap[3] = 2000;
        rarityMintCap[2] = 10000;
        rarityMintCap[1] = 0; // unlimited
    }

    /**
     * @dev Mint a new Pokemon NFT
     * @param to Address to mint to
     * @param pokemonId PokéAPI Pokemon ID
     * @param name Pokemon name
     * @param species Pokemon species
     * @param baseExperience Base experience value
     * @param height Pokemon height
     * @param weight Pokemon weight
     * @param types Array of Pokemon types
     * @param hp HP stat
     * @param attack Attack stat
     * @param defense Defense stat
     * @param spAtk Special Attack stat
     * @param spDef Special Defense stat
     * @param speed Speed stat
     * @param rarity Rarity level (1-5)
     * @param ipfsHash IPFS hash for artwork
     */
    function setRarityMintCap(uint256 rarity, uint256 cap) public onlyOwner {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        rarityMintCap[rarity] = cap;
    }

    function mintPokemon(
        address to,
        uint256 pokemonId,
        string memory name,
        string memory species,
        uint256 baseExperience,
        uint256 height,
        uint256 weight,
        string[] memory types,
        uint256 hp,
        uint256 attack,
        uint256 defense,
        uint256 spAtk,
        uint256 spDef,
        uint256 speed,
        uint256 rarity,
        string memory ipfsHash
    ) public onlyOwner returns (uint256) {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        uint256 cap = rarityMintCap[rarity];
        if (cap > 0) {
            require(rarityMintCount[rarity] < cap, "Rarity tier mint cap reached");
        }

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        rarityMintCount[rarity]++;

        PokemonCard memory card = PokemonCard({
            pokemonId: pokemonId,
            name: name,
            species: species,
            baseExperience: baseExperience,
            height: height,
            weight: weight,
            types: types,
            hp: hp,
            attack: attack,
            defense: defense,
            spAtk: spAtk,
            spDef: spDef,
            speed: speed,
            rarity: rarity,
            mintedAt: block.timestamp,
            ipfsHash: ipfsHash
        });

        pokemonCards[tokenId] = card;
        pokemonTokenIds[pokemonId].push(tokenId);

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsHash);

        emit PokemonMinted(tokenId, to, pokemonId, name, rarity);

        return tokenId;
    }

    /**
     * @dev Get Pokemon card details
     */
    function getPokemonCard(uint256 tokenId)
        public
        view
        returns (PokemonCard memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return pokemonCards[tokenId];
    }

    /**
     * @dev Get all token IDs for a specific Pokemon
     */
    function getPokemonTokenIds(uint256 pokemonId)
        public
        view
        returns (uint256[] memory)
    {
        return pokemonTokenIds[pokemonId];
    }

    /**
     * @dev Get user's Pokemon collection
     */
    function getUserCollection(address user)
        public
        view
        returns (uint256[] memory)
    {
        uint256 balance = balanceOf(user);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(user, i);
        }

        return tokenIds;
    }

    /**
     * @dev Initiate a Pokemon battle
     */
    function initiateBattle(
        uint256 pokemon1TokenId,
        uint256 pokemon2TokenId,
        address player2
    ) public returns (uint256) {
        require(ownerOf(pokemon1TokenId) == msg.sender, "You don't own Pokemon 1");
        require(ownerOf(pokemon2TokenId) == player2, "Player2 doesn't own Pokemon 2");

        uint256 battleId = _battleIdCounter;
        _battleIdCounter++;

        battles[battleId] = Battle({
            battleId: battleId,
            pokemon1TokenId: pokemon1TokenId,
            pokemon2TokenId: pokemon2TokenId,
            player1: msg.sender,
            player2: player2,
            winner: address(0),
            completed: false
        });

        emit PokemonBattleCreated(battleId, pokemon1TokenId, pokemon2TokenId, msg.sender, player2);

        return battleId;
    }

    /**
     * @dev Resolve battle autonomously based on total stats — no owner required.
     * Either player can call this to finalize the result deterministically.
     */
    function completeBattle(uint256 battleId) public {
        Battle storage battle = battles[battleId];
        require(!battle.completed, "Battle already completed");
        require(
            msg.sender == battle.player1 || msg.sender == battle.player2,
            "Not a battle participant"
        );

        uint256 stats1 = calculateTotalStats(battle.pokemon1TokenId);
        uint256 stats2 = calculateTotalStats(battle.pokemon2TokenId);

        address winner;
        uint256 winnerTokenId;
        uint256 loserTokenId;
        uint256 winnerStats;
        uint256 loserStats;

        if (stats1 >= stats2) {
            winner = battle.player1;
            winnerTokenId = battle.pokemon1TokenId;
            loserTokenId = battle.pokemon2TokenId;
            winnerStats = stats1;
            loserStats = stats2;
        } else {
            winner = battle.player2;
            winnerTokenId = battle.pokemon2TokenId;
            loserTokenId = battle.pokemon1TokenId;
            winnerStats = stats2;
            loserStats = stats1;
        }

        battle.winner = winner;
        battle.completed = true;

        address loser = (winner == battle.player1) ? battle.player2 : battle.player1;
        battleWins[winner]++;
        battleLosses[loser]++;

        uint256 rarityBonus = pokemonCards[winnerTokenId].rarity;

        emit BattleCompleted(battleId, winner, winnerTokenId, loserTokenId, winnerStats, loserStats);
        emit BattleRewardEarned(battleId, winner, winnerStats, rarityBonus);
    }

    /**
     * @dev Get battle details
     */
    function getBattle(uint256 battleId) public view returns (Battle memory) {
        return battles[battleId];
    }

    /**
     * @dev Calculate Pokemon's total stats
     */
    function calculateTotalStats(uint256 tokenId) public view returns (uint256) {
        PokemonCard memory card = pokemonCards[tokenId];
        return card.hp + card.attack + card.defense + card.spAtk + card.spDef + card.speed;
    }

    /**
     * @dev Transfer Pokemon NFT
     */
    function transferPokemon(address to, uint256 tokenId) public {
        safeTransferFrom(msg.sender, to, tokenId);
        emit PokemonTraded(tokenId, msg.sender, to, 0);
    }

    // Required overrides for ERC721 extensions

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
