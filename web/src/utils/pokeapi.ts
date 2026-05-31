import axios from 'axios';
import { ethers } from 'ethers';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

export interface PokemonData {
  pokemonId: number;
  name: string;
  species: string;
  baseExperience: number;
  height: number;
  weight: number;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
}

/**
 * Fetch Pokemon data from PokéAPI
 */
export async function fetchPokemonData(pokemonId: number): Promise<PokemonData> {
  try {
    const response = await axios.get(`${POKEAPI_BASE_URL}/pokemon/${pokemonId}`);
    const data = response.data;

    const stats: any = {};
    data.stats.forEach((stat: any) => {
      stats[stat.stat.name.replace('-', '')] = stat.base_stat;
    });

    return {
      pokemonId: data.id,
      name: data.name,
      species: data.species.name,
      baseExperience: data.base_experience || 0,
      height: data.height,
      weight: data.weight,
      types: data.types.map((t: any) => t.type.name),
      stats: {
        hp: stats.hp || 0,
        attack: stats.attack || 0,
        defense: stats.defense || 0,
        spAtk: stats.spatk || 0,
        spDef: stats.spdef || 0,
        speed: stats.speed || 0,
      },
    };
  } catch (error) {
    console.error(`Error fetching Pokemon ${pokemonId}:`, error);
    throw error;
  }
}

/**
 * Determine Pokemon rarity based on stats and base experience
 */
export function calculateRarity(pokemon: PokemonData): number {
  const totalStats = Object.values(pokemon.stats).reduce((a, b) => a + b, 0);
  const totalScore = totalStats + pokemon.baseExperience;

  if (totalScore > 600) return 5; // Legendary
  if (totalScore > 500) return 4; // Epic
  if (totalScore > 400) return 3; // Rare
  if (totalScore > 300) return 2; // Uncommon
  return 1; // Common
}

/**
 * Generate Pokemon image URL from PokéAPI
 */
export function getPokemonImageUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/${pokemonId}.png`;
}

/**
 * Validate Pokemon ID
 */
export async function isPokemonValid(pokemonId: number): Promise<boolean> {
  try {
    await axios.head(`${POKEAPI_BASE_URL}/pokemon/${pokemonId}`);
    return true;
  } catch {
    return false;
  }
}
