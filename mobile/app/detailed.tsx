import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";

interface PokemonAbility {
  name: string;
  displayName: string;
  effect: string;
  battleModifier: number;
}

interface PokemonMove {
  name: string;
  displayName: string;
  power: number;
  accuracy: number;
  type: string;
  damageClass: string;
}

interface PokemonDetails {
  id: number;
  name: string;
  displayName: string;
  image: string;
  types: string[];
  height: number;
  weight: number;
  baseExperience: number;
  rarity: number;
  stats: { name: string; value: number }[];
  abilities: PokemonAbility[];
  moves: PokemonMove[];
  species: string;
}

const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a29e', fire: '#ef4444', water: '#3b82f6', grass: '#22c55e',
  electric: '#eab308', ice: '#67e8f9', fighting: '#dc2626', poison: '#a855f7',
  ground: '#d97706', flying: '#818cf8', psychic: '#ec4899', bug: '#84cc16',
  rock: '#92400e', ghost: '#7c3aed', dragon: '#4f46e5', dark: '#374151',
  steel: '#94a3b8', fairy: '#f472b6',
};
const RARITY_COLORS = ['', '#6b7280', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];
const RARITY_LABELS = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

function calcRarity(total: number, exp: number) {
  const s = total + (exp || 0);
  if (s > 700) return 5; if (s > 560) return 4; if (s > 440) return 3; if (s > 320) return 2; return 1;
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', attack: 'ATK', defense: 'DEF',
  'special-attack': 'Sp.ATK', 'special-defense': 'Sp.DEF', speed: 'SPD',
};

async function fetchAbilityEffect(url: string): Promise<{ effect: string; mod: number }> {
  try {
    const d = await (await fetch(url)).json();
    const entry = d.effect_entries?.find((e: any) => e.language.name === 'en');
    const effect = entry?.short_effect || 'No description available.';
    const lower = effect.toLowerCase();
    let mod = 1.0;
    if (lower.includes('doubles') && lower.includes('attack')) mod = 1.4;
    else if ((lower.includes('raises') || lower.includes('boost')) && lower.includes('attack')) mod = 1.3;
    else if (lower.includes('immune')) mod = 1.2;
    else if (lower.includes('critical')) mod = 1.15;
    return { effect, mod };
  } catch {
    return { effect: 'No description available.', mod: 1.0 };
  }
}

async function fetchMoves(moveList: any[]): Promise<PokemonMove[]> {
  const moves: PokemonMove[] = [];
  const urls = moveList.slice(-12).map((m: any) => m.move.url);
  for (const url of urls) {
    if (moves.length >= 4) break;
    try {
      const mv = await (await fetch(url)).json();
      if (mv.power && mv.damage_class.name !== 'status') {
        moves.push({ name: mv.name, displayName: mv.name.replace(/-/g, ' '), power: mv.power, accuracy: mv.accuracy ?? 100, type: mv.type.name, damageClass: mv.damage_class.name });
      }
    } catch {}
  }
  return moves;
}

export default function DetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const [pokemon, setPokemon] = useState<PokemonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'abilities' | 'moves'>('stats');

  useEffect(() => {
    if (name) fetchPokemon(name);
  }, [name]);

  async function fetchPokemon(n: string) {
    setLoading(true);
    setError(null);
    try {
      const d = await (await fetch(`https://pokeapi.co/api/v2/pokemon/${n}`)).json();
      const statsMap: Record<string, number> = {};
      d.stats.forEach((s: any) => { statsMap[s.stat.name] = s.base_stat; });
      const total = Object.values(statsMap).reduce((a: number, b: any) => a + b, 0);
      const rarity = calcRarity(total, d.base_experience);

      // Abilities
      const abilityResults = await Promise.allSettled(
        d.abilities.slice(0, 3).map(async (a: any) => {
          const { effect, mod } = await fetchAbilityEffect(a.ability.url);
          return { name: a.ability.name, displayName: a.ability.name.replace(/-/g, ' '), effect, battleModifier: mod };
        })
      );
      const abilities = abilityResults.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<PokemonAbility>).value);

      // Moves
      const moves = await fetchMoves(d.moves);

      setPokemon({
        id: d.id,
        name: d.name,
        displayName: d.name.replace(/-/g, ' '),
        image: d.sprites.other?.['official-artwork']?.front_default ?? d.sprites.front_default,
        types: d.types.map((t: { type: { name: string } }) => t.type.name),
        height: d.height,
        weight: d.weight,
        baseExperience: d.base_experience,
        rarity,
        stats: d.stats.map((s: { stat: { name: string }; base_stat: number }) => ({ name: s.stat.name, value: s.base_stat })),
        abilities,
        moves,
        species: d.species.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !pokemon) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Pokémon not found"}</Text>
        <Text style={styles.retryLink} onPress={() => name && fetchPokemon(name)}>Tap to retry</Text>
      </View>
    );
  }

  const primaryType = pokemon.types[0];
  const bgColor = TYPE_COLORS[primaryType] ?? '#6366f1';
  const rarityColor = RARITY_COLORS[pokemon.rarity];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bgColor + '33' }]}>
        <View style={[styles.headerGlow, { backgroundColor: bgColor }]} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerName}>{pokemon.displayName}</Text>
            <Text style={styles.headerSpecies}>{pokemon.species}</Text>
          </View>
          <View>
            <Text style={styles.headerIdText}>#{String(pokemon.id).padStart(4, '0')}</Text>
            <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
              <Text style={[styles.rarityBadgeText, { color: rarityColor }]}>★ {RARITY_LABELS[pokemon.rarity]}</Text>
            </View>
          </View>
        </View>
        <View style={styles.typesRow}>
          {pokemon.types.map(t => (
            <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] ?? '#555' }]}>
              <Text style={styles.typeText}>{t}</Text>
            </View>
          ))}
        </View>
        <Image source={{ uri: pokemon.image }} style={styles.artwork} resizeMode="contain" />
      </View>

      {/* Info cards */}
      <View style={styles.infoRow}>
        {[
          { label: 'Height', value: `${(pokemon.height / 10).toFixed(1)} m` },
          { label: 'Weight', value: `${(pokemon.weight / 10).toFixed(1)} kg` },
          { label: 'Base EXP', value: String(pokemon.baseExperience) },
        ].map(({ label, value }) => (
          <View key={label} style={styles.infoCard}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['stats', 'abilities', 'moves'] as const).map(tab => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'stats' && (
        <View style={styles.panel}>
          {pokemon.stats.map(stat => (
            <View key={stat.name} style={styles.statRow}>
              <Text style={styles.statLabel}>{STAT_LABELS[stat.name] ?? stat.name}</Text>
              <Text style={styles.statNum}>{stat.value}</Text>
              <View style={styles.statTrack}>
                <View style={[styles.statFill, { width: `${Math.min((stat.value / 255) * 100, 100)}%` as any, backgroundColor: bgColor }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'abilities' && (
        <View style={styles.panel}>
          {pokemon.abilities.map(ab => (
            <View key={ab.name} style={styles.abilityCard}>
              <View style={styles.abilityHeader}>
                <Text style={styles.abilityName}>{ab.displayName}</Text>
                {ab.battleModifier > 1.0 && (
                  <Text style={styles.abilityMod}>⚡ ×{ab.battleModifier.toFixed(2)}</Text>
                )}
              </View>
              <Text style={styles.abilityEffect}>{ab.effect}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'moves' && (
        <View style={styles.panel}>
          {pokemon.moves.length === 0 && <Text style={styles.noData}>No battle moves available</Text>}
          {pokemon.moves.map(mv => (
            <View key={mv.name} style={styles.moveCard}>
              <View style={styles.moveHeader}>
                <Text style={styles.moveName}>{mv.displayName}</Text>
                <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[mv.type] || '#555' }]}>
                  <Text style={styles.typeText}>{mv.type}</Text>
                </View>
              </View>
              <View style={styles.moveMetaRow}>
                <Text style={styles.movePower}>PWR {mv.power}</Text>
                <Text style={styles.moveAcc}>{mv.accuracy}% ACC</Text>
                <Text style={styles.moveDmgClass}>{mv.damageClass}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable style={[styles.btnPrimary, { backgroundColor: bgColor }]} onPress={() => router.push('/(tabs)/battle')}>
          <Text style={styles.btnPrimaryText}>⚔️ Battle</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => alert(`Add ${pokemon.displayName} to collection?`)}>
          <Text style={styles.btnSecondaryText}>+ Collection</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080b14' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080b14', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 16, textAlign: 'center' },
  retryLink: { color: '#6366f1', textDecorationLine: 'underline' },

  header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, padding: 20, paddingTop: 16, overflow: 'hidden' },
  headerGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.15, top: -50, alignSelf: 'center' } as any,
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerName: { fontSize: 26, fontWeight: '900', color: '#f1f5f9', textTransform: 'capitalize' },
  headerSpecies: { fontSize: 13, color: '#94a3b8', textTransform: 'capitalize', marginTop: 2 },
  headerIdText: { fontSize: 12, color: '#475569', fontFamily: 'monospace', textAlign: 'right', marginBottom: 4 },
  rarityBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-end' },
  rarityBadgeText: { fontSize: 11, fontWeight: '700' },
  typesRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  artwork: { width: '100%', height: 220 },

  infoRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  infoCard: { flex: 1, backgroundColor: '#111827', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { fontSize: 10, color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '800', color: '#f1f5f9', marginTop: 4 },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 0, backgroundColor: '#111827', borderRadius: 12, padding: 4, gap: 2 },
  tab: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff' },

  panel: { margin: 16, marginTop: 12, backgroundColor: '#111827', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel: { width: 60, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  statNum: { width: 34, fontSize: 13, fontWeight: '800', color: '#f1f5f9', textAlign: 'right' },
  statTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 4 },

  abilityCard: { backgroundColor: '#0d1117', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  abilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  abilityName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize' },
  abilityMod: { fontSize: 11, color: '#22c55e', fontWeight: '700' },
  abilityEffect: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },

  moveCard: { backgroundColor: '#0d1117', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  moveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  moveName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize' },
  moveMetaRow: { flexDirection: 'row', gap: 12 },
  movePower: { fontSize: 12, color: '#fbbf24', fontWeight: '700' },
  moveAcc: { fontSize: 12, color: '#94a3b8' },
  moveDmgClass: { fontSize: 12, color: '#475569', textTransform: 'capitalize' },
  noData: { color: '#475569', textAlign: 'center', fontSize: 14 },

  actions: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4, marginBottom: 24 },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnSecondary: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btnSecondaryText: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
});
