// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPokemonToken {
    function mint(address to, uint256 amount) external;
}

interface IPokemonNFT {
    struct Battle {
        uint256 battleId;
        uint256 pokemon1TokenId;
        uint256 pokemon2TokenId;
        address player1;
        address player2;
        address winner;
        bool completed;
    }

    function getBattle(uint256 battleId) external view returns (Battle memory);
    function calculateTotalStats(uint256 tokenId) external view returns (uint256);
}

/**
 * @title BattleRewards
 * @dev Distributes PKT token rewards after battles and maintains a leaderboard.
 */
contract BattleRewards is Ownable, ReentrancyGuard {
    IPokemonToken public pokemonToken;
    IPokemonNFT public pokemonNFT;

    // Base reward in PKT tokens (18 decimals)
    uint256 public baseReward = 5 * 10 ** 18;

    // Multiplier per rarity point (1e18 precision)
    uint256 public rarityMultiplier = 2 * 10 ** 17; // +0.2x per rarity level

    mapping(uint256 => bool) public rewardClaimed;

    // Leaderboard
    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 totalRewardsEarned;
        uint256 winStreak;
        uint256 bestWinStreak;
    }

    mapping(address => PlayerStats) public playerStats;
    address[] public leaderboardPlayers;
    mapping(address => bool) private isOnLeaderboard;

    event RewardClaimed(
        uint256 indexed battleId,
        address indexed winner,
        uint256 rewardAmount
    );

    event LeaderboardUpdated(
        address indexed player,
        uint256 wins,
        uint256 winStreak
    );

    event WinStreakBonus(
        address indexed player,
        uint256 streak,
        uint256 bonusAmount
    );

    constructor(address _pokemonToken, address _pokemonNFT) Ownable(msg.sender) {
        pokemonToken = IPokemonToken(_pokemonToken);
        pokemonNFT = IPokemonNFT(_pokemonNFT);
    }

    function setBaseReward(uint256 newBase) external onlyOwner {
        baseReward = newBase;
    }

    function setRarityMultiplier(uint256 newMultiplier) external onlyOwner {
        rarityMultiplier = newMultiplier;
    }

    /**
     * @dev Claim reward for winning a completed battle.
     * Anyone can trigger this — the reward always goes to the battle winner.
     */
    function claimBattleReward(uint256 battleId) external nonReentrant {
        require(!rewardClaimed[battleId], "Reward already claimed");

        IPokemonNFT.Battle memory battle = pokemonNFT.getBattle(battleId);
        require(battle.completed, "Battle not completed");
        require(battle.winner != address(0), "No winner recorded");

        rewardClaimed[battleId] = true;

        uint256 winnerTokenId = (battle.winner == battle.player1)
            ? battle.pokemon1TokenId
            : battle.pokemon2TokenId;

        uint256 totalStats = pokemonNFT.calculateTotalStats(winnerTokenId);

        // Reward scales with stats and rarity (rarity embedded in stats indirectly via strength)
        uint256 statsBonus = totalStats / 100;
        uint256 reward = baseReward + (statsBonus * 10 ** 17);

        // Win-streak bonus
        address winner = battle.winner;
        address loser = (winner == battle.player1) ? battle.player2 : battle.player1;

        playerStats[winner].wins++;
        playerStats[winner].winStreak++;
        playerStats[loser].losses++;
        playerStats[loser].winStreak = 0;

        if (playerStats[winner].winStreak > playerStats[winner].bestWinStreak) {
            playerStats[winner].bestWinStreak = playerStats[winner].winStreak;
        }

        uint256 streakBonus = 0;
        uint256 streak = playerStats[winner].winStreak;
        if (streak >= 10) {
            streakBonus = baseReward * 2;
        } else if (streak >= 5) {
            streakBonus = baseReward;
        } else if (streak >= 3) {
            streakBonus = baseReward / 2;
        }

        uint256 totalReward = reward + streakBonus;
        playerStats[winner].totalRewardsEarned += totalReward;

        if (!isOnLeaderboard[winner]) {
            leaderboardPlayers.push(winner);
            isOnLeaderboard[winner] = true;
        }

        pokemonToken.mint(winner, totalReward);

        emit RewardClaimed(battleId, winner, totalReward);
        emit LeaderboardUpdated(winner, playerStats[winner].wins, streak);

        if (streakBonus > 0) {
            emit WinStreakBonus(winner, streak, streakBonus);
        }
    }

    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    function getLeaderboardLength() external view returns (uint256) {
        return leaderboardPlayers.length;
    }
}
