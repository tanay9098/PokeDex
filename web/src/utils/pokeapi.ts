import axios from 'axios';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

export interface PokemonAbility {
  name: string;
  displayName: string;
  effect: string;
  battleModifier: number;
}

export interface PokemonMove {
  name: string;
  displayName: string;
  power: number;
  accuracy: number;
  type: string;
  damageClass: 'physical' | 'special' | 'status';
}

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface PokemonListItem {
  pokemonId: number;
  name: string;
  displayName: string;
  types: string[];
  imageUrl: string;
  officialArtworkUrl: string;
  stats: PokemonStats;
  rarity: number;
  abilityNames: string[];
}

export interface PokemonData extends PokemonListItem {
  species: string;
  baseExperience: number;
  height: number;
  weight: number;
  abilities: PokemonAbility[];
  moves: PokemonMove[];
}

export const typeColors: Record<string, string> = {
  normal: '#a8a29e',
  fire: '#ef4444',
  water: '#3b82f6',
  grass: '#22c55e',
  electric: '#eab308',
  ice: '#67e8f9',
  fighting: '#dc2626',
  poison: '#a855f7',
  ground: '#d97706',
  flying: '#818cf8',
  psychic: '#ec4899',
  bug: '#84cc16',
  rock: '#92400e',
  ghost: '#7c3aed',
  dragon: '#4f46e5',
  dark: '#374151',
  steel: '#94a3b8',
  fairy: '#f472b6',
};

export const typeEffectiveness: Record<string, Record<string, number>> = {
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, fire: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, bug: 0.5, psychic: 0.5, flying: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  ghost: { psychic: 2, ghost: 2, normal: 0, fighting: 0 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  flying: { grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5, electric: 0.5 },
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
};

export function calculateTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    multiplier *= typeEffectiveness[attackType]?.[defType] ?? 1;
  }
  return multiplier;
}

function deriveBattleModifier(effect: string): number {
  const lower = effect.toLowerCase();
  if (lower.includes('doubles') && lower.includes('attack')) return 1.4;
  if ((lower.includes('raises') || lower.includes('boost') || lower.includes('increases')) && lower.includes('attack')) return 1.3;
  if (lower.includes('special attack')) return 1.25;
  if (lower.includes('immune') || lower.includes('cannot be affected')) return 1.2;
  if (lower.includes('speed') && (lower.includes('doubles') || lower.includes('raises'))) return 1.15;
  if (lower.includes('critical') && lower.includes('hit')) return 1.2;
  return 1.0;
}

export function calculateRarity(totalStats: number, baseExp: number): number {
  const score = totalStats + (baseExp || 0);
  if (score > 700) return 5;
  if (score > 560) return 4;
  if (score > 440) return 3;
  if (score > 320) return 2;
  return 1;
}

export function getRarityLabel(rarity: number): string {
  return ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][rarity] || 'Common';
}

export function getRarityColor(rarity: number): string {
  return ['', '#6b7280', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b'][rarity] || '#6b7280';
}

export function getPokemonImageUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/${pokemonId}.png`;
}

export async function fetchAbilityDetails(abilityUrl: string): Promise<PokemonAbility | null> {
  try {
    const res = await axios.get(abilityUrl);
    const d = res.data;
    const entry = d.effect_entries?.find((e: any) => e.language.name === 'en');
    const effect = entry?.short_effect || entry?.effect || 'No description available';
    return {
      name: d.name,
      displayName: d.name.replace(/-/g, ' '),
      effect,
      battleModifier: deriveBattleModifier(effect),
    };
  } catch {
    return null;
  }
}

async function fetchTopMoves(moveList: any[]): Promise<PokemonMove[]> {
  const moves: PokemonMove[] = [];
  const urls = moveList.slice(-12).map((m: any) => m.move.url);
  for (const url of urls) {
    if (moves.length >= 4) break;
    try {
      const res = await axios.get(url);
      const d = res.data;
      if (d.power && d.damage_class.name !== 'status') {
        moves.push({
          name: d.name,
          displayName: d.name.replace(/-/g, ' '),
          power: d.power,
          accuracy: d.accuracy ?? 100,
          type: d.type.name,
          damageClass: d.damage_class.name,
        });
      }
    } catch {}
  }
  if (moves.length === 0) {
    moves.push({ name: 'tackle', displayName: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical' });
  }
  return moves;
}

function parseStats(rawStats: any[]): PokemonStats {
  const m: Record<string, number> = {};
  rawStats.forEach((s: any) => { m[s.stat.name] = s.base_stat; });
  return {
    hp: m['hp'] || 0,
    attack: m['attack'] || 0,
    defense: m['defense'] || 0,
    spAtk: m['special-attack'] || 0,
    spDef: m['special-defense'] || 0,
    speed: m['speed'] || 0,
  };
}

export async function fetchPokemonList(limit = 20, offset = 0): Promise<PokemonListItem[]> {
  const res = await axios.get(`${POKEAPI_BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
  const results = await Promise.allSettled(
    res.data.results.map(async (p: { url: string }) => {
      const det = await axios.get(p.url);
      const d = det.data;
      const stats = parseStats(d.stats);
      const total = Object.values(stats).reduce((a: number, b) => a + (b as number), 0);
      return {
        pokemonId: d.id,
        name: d.name,
        displayName: d.name.replace(/-/g, ' '),
        types: d.types.map((t: any) => t.type.name),
        imageUrl: d.sprites.front_default || getPokemonImageUrl(d.id),
        officialArtworkUrl: d.sprites.other?.['official-artwork']?.front_default || getPokemonImageUrl(d.id),
        stats,
        rarity: calculateRarity(total, d.base_experience),
        abilityNames: d.abilities.map((a: any) => a.ability.name),
      } as PokemonListItem;
    })
  );
  return results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<PokemonListItem>).value);
}

export async function fetchPokemonDetails(nameOrId: string | number): Promise<PokemonData> {
  const res = await axios.get(`${POKEAPI_BASE_URL}/pokemon/${nameOrId}`);
  const d = res.data;
  const stats = parseStats(d.stats);
  const total = Object.values(stats).reduce((a: number, b) => a + (b as number), 0);

  const abilityResults = await Promise.allSettled(
    d.abilities.slice(0, 3).map((a: any) => fetchAbilityDetails(a.ability.url))
  );
  const abilities = abilityResults
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => (r as PromiseFulfilledResult<PokemonAbility>).value);

  const moves = await fetchTopMoves(d.moves);

  return {
    pokemonId: d.id,
    name: d.name,
    displayName: d.name.replace(/-/g, ' '),
    species: d.species.name,
    baseExperience: d.base_experience || 0,
    height: d.height,
    weight: d.weight,
    types: d.types.map((t: any) => t.type.name),
    stats,
    abilities,
    moves,
    imageUrl: d.sprites.front_default || getPokemonImageUrl(d.id),
    officialArtworkUrl: d.sprites.other?.['official-artwork']?.front_default || getPokemonImageUrl(d.id),
    rarity: calculateRarity(total, d.base_experience),
    abilityNames: d.abilities.map((a: any) => a.ability.name),
  };
}

export function simulateBattleTurn(
  attacker: PokemonData,
  defender: PokemonData,
  move: PokemonMove
): { damage: number; effectiveness: number; message: string } {
  const atkStat = move.damageClass === 'special' ? attacker.stats.spAtk : attacker.stats.attack;
  const defStat = move.damageClass === 'special' ? defender.stats.spDef : defender.stats.defense;
  const effectiveness = calculateTypeEffectiveness(move.type, defender.types);
  const abilityMod = attacker.abilities[0]?.battleModifier ?? 1.0;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;

  const baseDmg = Math.floor(((2 * 50 / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2);
  const damage = Math.max(1, Math.floor(baseDmg * effectiveness * abilityMod * stab));

  let message = '';
  if (effectiveness > 1) message = "Super effective!";
  else if (effectiveness < 1 && effectiveness > 0) message = "Not very effective...";
  else if (effectiveness === 0) message = "No effect!";

  return { damage, effectiveness, message };
}

export function getMockPrice(rarity: number): string {
  const prices: Record<number, string> = { 1: '0.01', 2: '0.05', 3: '0.25', 4: '1.50', 5: '5.00' };
  return prices[rarity] || '0.01';
}
