import { useState, useCallback } from "react";
import { ethers } from "ethers";

interface PokemonStats {
  tokenId: number;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
  rarity: number;
}

interface BattleResult {
  winnerTokenId: number;
  loserTokenId: number;
  winnerTotalStats: number;
  loserTotalStats: number;
  winnerName: string;
  loserName: string;
}

interface BattleSimulatorState {
  isSimulating: boolean;
  result: BattleResult | null;
  error: string | null;
  pendingBattleId: number | null;
}

const POKEMON_NFT_ABI = [
  "function initiateBattle(uint256 pokemon1TokenId, uint256 pokemon2TokenId, address player2) returns (uint256)",
  "function completeBattle(uint256 battleId)",
  "function getBattle(uint256 battleId) view returns (tuple(uint256 battleId, uint256 pokemon1TokenId, uint256 pokemon2TokenId, address player1, address player2, address winner, bool completed))",
  "function calculateTotalStats(uint256 tokenId) view returns (uint256)",
  "function getPokemonCard(uint256 tokenId) view returns (tuple(uint256 pokemonId, string name, string species, uint256 baseExperience, uint256 height, uint256 weight, string[] types, uint256 hp, uint256 attack, uint256 defense, uint256 spAtk, uint256 spDef, uint256 speed, uint256 rarity, uint256 mintedAt, string ipfsHash))",
  "function battleWins(address) view returns (uint256)",
  "function battleLosses(address) view returns (uint256)",
  "event BattleCompleted(uint256 indexed battleId, address indexed winner, uint256 winnerTokenId, uint256 loserTokenId, uint256 winnerTotalStats, uint256 loserTotalStats)",
];

export function useBattleSimulator(nftContractAddress: string) {
  const [state, setState] = useState<BattleSimulatorState>({
    isSimulating: false,
    result: null,
    error: null,
    pendingBattleId: null,
  });

  const simulateBattle = useCallback(
    async (
      pokemon1: PokemonStats,
      pokemon2: PokemonStats,
      player2Address: string
    ) => {
      setState({ isSimulating: true, result: null, error: null, pendingBattleId: null });

      try {
        const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(nftContractAddress, POKEMON_NFT_ABI, signer);

        // Initiate on-chain battle
        const tx = await contract.initiateBattle(
          pokemon1.tokenId,
          pokemon2.tokenId,
          player2Address
        );
        const receipt = await tx.wait();

        // Extract battleId from logs
        const iface = new ethers.Interface(POKEMON_NFT_ABI);
        let battleId: number | null = null;
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "PokemonBattleCreated") {
              battleId = Number(parsed.args.battleId);
              break;
            }
          } catch {
            // skip non-matching logs
          }
        }

        if (battleId === null) throw new Error("Could not parse battleId from transaction");

        setState((s) => ({ ...s, pendingBattleId: battleId }));

        // Resolve deterministically — any participant can call this
        const resolveTx = await contract.completeBattle(battleId);
        const resolveReceipt = await resolveTx.wait();

        // Parse BattleCompleted event
        let winnerTokenId = 0;
        let loserTokenId = 0;
        let winnerTotalStats = 0;
        let loserTotalStats = 0;

        for (const log of resolveReceipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "BattleCompleted") {
              winnerTokenId = Number(parsed.args.winnerTokenId);
              loserTokenId = Number(parsed.args.loserTokenId);
              winnerTotalStats = Number(parsed.args.winnerTotalStats);
              loserTotalStats = Number(parsed.args.loserTotalStats);
              break;
            }
          } catch {
            // skip
          }
        }

        const winnerName =
          winnerTokenId === pokemon1.tokenId ? pokemon1.name : pokemon2.name;
        const loserName =
          loserTokenId === pokemon1.tokenId ? pokemon1.name : pokemon2.name;

        setState({
          isSimulating: false,
          result: { winnerTokenId, loserTokenId, winnerTotalStats, loserTotalStats, winnerName, loserName },
          error: null,
          pendingBattleId: battleId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Battle simulation failed";
        setState({ isSimulating: false, result: null, error: message, pendingBattleId: null });
      }
    },
    [nftContractAddress]
  );

  const previewBattle = useCallback((pokemon1: PokemonStats, pokemon2: PokemonStats): BattleResult => {
    const stats1 = pokemon1.hp + pokemon1.attack + pokemon1.defense + pokemon1.spAtk + pokemon1.spDef + pokemon1.speed;
    const stats2 = pokemon2.hp + pokemon2.attack + pokemon2.defense + pokemon2.spAtk + pokemon2.spDef + pokemon2.speed;

    const winner = stats1 >= stats2 ? pokemon1 : pokemon2;
    const loser = stats1 >= stats2 ? pokemon2 : pokemon1;

    return {
      winnerTokenId: winner.tokenId,
      loserTokenId: loser.tokenId,
      winnerTotalStats: Math.max(stats1, stats2),
      loserTotalStats: Math.min(stats1, stats2),
      winnerName: winner.name,
      loserName: loser.name,
    };
  }, []);

  const reset = useCallback(() => {
    setState({ isSimulating: false, result: null, error: null, pendingBattleId: null });
  }, []);

  return { ...state, simulateBattle, previewBattle, reset };
}
