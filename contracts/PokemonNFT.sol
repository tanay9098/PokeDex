// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokemonNFT
 * @dev NFT contract for Pokémon cards backed by PokéAPI data on Polygon.
 * Supports ability-based battle modifiers stored as basis points (100 = 1.0×).
 */
contract PokemonNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _tokenIdCounter;

    // Rarity tier mint caps (0 = unlimited)
    mapping(uint256 => uint256) public rarityMintCap;
    mapping(uint256 => uint256) public rarityMintCount;

    // Ability battle modifiers in basis points: 100 = 1.0×, 130 = 1.3×
    // Keyed by PokéAPI ability ID
    mapping(uint256 => uint256) public abilityBattleModifier;

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
        uint256 abilityId;        // Primary PokéAPI ability ID for battle modifier
        uint256 mintedAt;
        string ipfsHash;
    }

    mapping(uint256 => PokemonCard) public pokemonCards;
    mapping(uint256 => uint256[]) public pokemonTokenIds;

    event PokemonMinted(uint256 indexed tokenId, address indexed owner, uint256 pokemonId, string name, uint256 rarity);
    event PokemonListed(uint256 indexed tokenId, address indexed owner, uint256 price);
    event PokemonTraded(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);
    event BattleCreated(uint256 indexed battleId, uint256 indexed pokemon1TokenId, uint256 indexed pokemon2TokenId, address player1, address player2);
    event BattleCompleted(uint256 indexed battleId, address indexed winner, uint256 winnerTokenId, uint256 loserTokenId, uint256 winnerScore, uint256 loserScore);
    event BattleRewardEarned(uint256 indexed battleId, address indexed winner, uint256 rewardAmount, uint256 rarityBonus);
    event AbilityModifierSet(uint256 indexed abilityId, uint256 modifierBasisPoints);

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
    mapping(address => uint256) public battleWins;
    mapping(address => uint256) public battleLosses;

    constructor() ERC721("PokemonNFT", "PKMN") Ownable(msg.sender) {
        rarityMintCap[5] = 100;
        rarityMintCap[4] = 500;
        rarityMintCap[3] = 2000;
        rarityMintCap[2] = 10000;
        rarityMintCap[1] = 0;

        // Seed common ability modifiers (PokéAPI ability IDs)
        // 1=stench(no bonus), 6=damp, 19=battle-armor(+10%), 32=swift-swim(+15%), 65=overgrow(+30%), 66=blaze(+30%), 67=torrent(+30%)
        abilityBattleModifier[65] = 130;  // overgrow: 1.3×
        abilityBattleModifier[66] = 130;  // blaze:    1.3×
        abilityBattleModifier[67] = 130;  // torrent:  1.3×
        abilityBattleModifier[19] = 110;  // battle-armor: 1.1×
        abilityBattleModifier[32] = 115;  // swift-swim:   1.15×
        abilityBattleModifier[45] = 125;  // huge-power:   1.25×
        abilityBattleModifier[91] = 140;  // chlorophyll:  1.4×
    }

    function setRarityMintCap(uint256 rarity, uint256 cap) public onlyOwner {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        rarityMintCap[rarity] = cap;
    }

    /**
     * @dev Set the battle modifier for a PokéAPI ability ID.
     * @param modifierBasisPoints 100 = 1.0×, 150 = 1.5×, etc.
     */
    function setAbilityModifier(uint256 abilityId, uint256 modifierBasisPoints) public onlyOwner {
        require(modifierBasisPoints >= 50 && modifierBasisPoints <= 300, "Modifier out of range");
        abilityBattleModifier[abilityId] = modifierBasisPoints;
        emit AbilityModifierSet(abilityId, modifierBasisPoints);
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
        uint256 abilityId,
        string memory ipfsHash
    ) public onlyOwner returns (uint256) {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        uint256 cap = rarityMintCap[rarity];
        if (cap > 0) {
            require(rarityMintCount[rarity] < cap, "Rarity tier mint cap reached");
        }

        uint256 tokenId = _tokenIdCounter++;
        rarityMintCount[rarity]++;

        pokemonCards[tokenId] = PokemonCard({
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
            abilityId: abilityId,
            mintedAt: block.timestamp,
            ipfsHash: ipfsHash
        });

        pokemonTokenIds[pokemonId].push(tokenId);
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsHash);

        emit PokemonMinted(tokenId, to, pokemonId, name, rarity);
        return tokenId;
    }

    function getPokemonCard(uint256 tokenId) public view returns (PokemonCard memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return pokemonCards[tokenId];
    }

    function getPokemonTokenIds(uint256 pokemonId) public view returns (uint256[] memory) {
        return pokemonTokenIds[pokemonId];
    }

    function getUserCollection(address user) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(user);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(user, i);
        }
        return tokenIds;
    }

    function initiateBattle(uint256 pokemon1TokenId, uint256 pokemon2TokenId, address player2) public returns (uint256) {
        require(ownerOf(pokemon1TokenId) == msg.sender, "You don't own Pokemon 1");
        require(ownerOf(pokemon2TokenId) == player2, "Player2 doesn't own Pokemon 2");

        uint256 battleId = _battleIdCounter++;
        battles[battleId] = Battle({
            battleId: battleId,
            pokemon1TokenId: pokemon1TokenId,
            pokemon2TokenId: pokemon2TokenId,
            player1: msg.sender,
            player2: player2,
            winner: address(0),
            completed: false
        });

        emit BattleCreated(battleId, pokemon1TokenId, pokemon2TokenId, msg.sender, player2);
        return battleId;
    }

    /**
     * @dev Resolve battle using total stats × ability modifier.
     * Score = totalStats × abilityModifier / 100 (where default modifier is 100 = 1.0×).
     */
    function completeBattle(uint256 battleId) public {
        Battle storage battle = battles[battleId];
        require(!battle.completed, "Battle already completed");
        require(msg.sender == battle.player1 || msg.sender == battle.player2, "Not a participant");

        uint256 score1 = _calcBattleScore(battle.pokemon1TokenId);
        uint256 score2 = _calcBattleScore(battle.pokemon2TokenId);

        address winner;
        uint256 winnerTokenId;
        uint256 loserTokenId;

        if (score1 >= score2) {
            winner = battle.player1;
            winnerTokenId = battle.pokemon1TokenId;
            loserTokenId = battle.pokemon2TokenId;
        } else {
            winner = battle.player2;
            winnerTokenId = battle.pokemon2TokenId;
            loserTokenId = battle.pokemon1TokenId;
        }

        battle.winner = winner;
        battle.completed = true;

        address loser = (winner == battle.player1) ? battle.player2 : battle.player1;
        battleWins[winner]++;
        battleLosses[loser]++;

        uint256 rarityBonus = pokemonCards[winnerTokenId].rarity;
        emit BattleCompleted(battleId, winner, winnerTokenId, loserTokenId, score1, score2);
        emit BattleRewardEarned(battleId, winner, score1 > score2 ? score1 : score2, rarityBonus);
    }

    /**
     * @dev Calculate battle score: totalStats × abilityModifier / 100.
     */
    function _calcBattleScore(uint256 tokenId) internal view returns (uint256) {
        PokemonCard storage card = pokemonCards[tokenId];
        uint256 total = card.hp + card.attack + card.defense + card.spAtk + card.spDef + card.speed;
        uint256 mod = abilityBattleModifier[card.abilityId];
        if (mod == 0) mod = 100; // default 1.0×
        return (total * mod) / 100;
    }

    function calculateTotalStats(uint256 tokenId) public view returns (uint256) {
        PokemonCard memory card = pokemonCards[tokenId];
        return card.hp + card.attack + card.defense + card.spAtk + card.spDef + card.speed;
    }

    function getBattle(uint256 battleId) public view returns (Battle memory) {
        return battles[battleId];
    }

    function transferPokemon(address to, uint256 tokenId) public {
        safeTransferFrom(msg.sender, to, tokenId);
        emit PokemonTraded(tokenId, msg.sender, to, 0);
    }

    // Required overrides
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
