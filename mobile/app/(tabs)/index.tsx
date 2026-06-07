import { useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, Image, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Link } from "expo-router";

interface PokemonItem {
  pokemonId: number;
  name: string;
  displayName: string;
  types: string[];
  imageUrl: string;
  officialArtworkUrl: string;
  stats: { hp: number; attack: number; defense: number; spAtk: number; spDef: number; speed: number };
  rarity: number;
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

const TYPES = ['All', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Dragon', 'Ghost'];

function calcRarity(totalStats: number, baseExp: number): number {
  const score = totalStats + (baseExp || 0);
  if (score > 700) return 5;
  if (score > 560) return 4;
  if (score > 440) return 3;
  if (score > 320) return 2;
  return 1;
}

function getPokemonArtwork(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/${id}.png`;
}

async function fetchPokemonList(limit = 20, offset = 0): Promise<PokemonItem[]> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
  const data = await res.json();
  const details = await Promise.allSettled(
    data.results.map(async (p: { url: string }) => {
      const d = await (await fetch(p.url)).json();
      const statsMap: Record<string, number> = {};
      d.stats.forEach((s: any) => { statsMap[s.stat.name] = s.base_stat; });
      const stats = { hp: statsMap['hp'] || 0, attack: statsMap['attack'] || 0, defense: statsMap['defense'] || 0, spAtk: statsMap['special-attack'] || 0, spDef: statsMap['special-defense'] || 0, speed: statsMap['speed'] || 0 };
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      return {
        pokemonId: d.id, name: d.name, displayName: d.name.replace(/-/g, ' '),
        types: d.types.map((t: any) => t.type.name),
        imageUrl: d.sprites.front_default || getPokemonArtwork(d.id),
        officialArtworkUrl: d.sprites.other?.['official-artwork']?.front_default || getPokemonArtwork(d.id),
        stats, rarity: calcRarity(total, d.base_experience),
      };
    })
  );
  return details.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<PokemonItem>).value);
}

function PokemonCard({ item }: { item: PokemonItem }) {
  const primaryType = item.types[0];
  const color = TYPE_COLORS[primaryType] || '#6366f1';
  const rarityColor = RARITY_COLORS[item.rarity];

  return (
    <Link href={{ pathname: "/detailed", params: { name: item.name } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
        {/* Card glow bg */}
        <View style={[styles.cardGlow, { backgroundColor: color }]} />

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardOwnerLabel}>Owned by</Text>
            <Text style={styles.cardOwnerId}>{String(item.pokemonId).padStart(4, '0')}EX</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardOwnerLabel}>Created by</Text>
            <Text style={styles.cardOwnerId}>{item.pokemonId}API</Text>
          </View>
        </View>

        {/* Artwork */}
        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: item.officialArtworkUrl }}
            style={styles.artwork}
            resizeMode="contain"
            onError={(e) => { (e.target as any).source = { uri: item.imageUrl }; }}
          />
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <View style={styles.typesRow}>
            {item.types.map(t => (
              <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] || '#555' }]}>
                <Text style={styles.typeText}>{t}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.pokemonName}>{item.displayName}</Text>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>MATIC {['', '0.01', '0.05', '0.25', '1.50', '5.00'][item.rarity]} × 1</Text>
              <Text style={styles.priceUsd}>(${(parseFloat(['', '0.01', '0.05', '0.25', '1.50', '5.00'][item.rarity]) * 0.8).toFixed(2)})</Text>
            </View>
            <Text style={styles.pokemonId}>#{String(item.pokemonId).padStart(4, '0')}</Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable style={styles.btnGhost} onPress={() => {}}>
              <Text style={styles.btnGhostText}>View History</Text>
            </Pressable>
            <Pressable style={styles.btnPrimary} onPress={() => {}}>
              <Text style={styles.btnPrimaryText}>Buy Now</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const [pokemons, setPokemons] = useState<PokemonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedType, setSelectedType] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => { loadPokemons(0); }, []);

  async function loadPokemons(off: number) {
    off === 0 ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const list = await fetchPokemonList(20, off);
      setPokemons(prev => off === 0 ? list : [...prev, ...list]);
      setOffset(off + 20);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const filtered = pokemons.filter(p => {
    const matchType = selectedType === 'All' || p.types.includes(selectedType.toLowerCase());
    const matchSearch = !search || p.name.includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const featured = filtered.find(p => p.rarity >= 4) || filtered[0];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Pokémon...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryLink} onPress={() => loadPokemons(0)}>Tap to retry</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Pokémon..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterScroll} contentContainerStyle={styles.typeFilters}>
        {TYPES.map(type => (
          <Pressable
            key={type}
            style={[styles.typeChip, selectedType === type && styles.typeChipActive, selectedType === type && type !== 'All' && { backgroundColor: TYPE_COLORS[type.toLowerCase()] }]}
            onPress={() => setSelectedType(type)}
          >
            <Text style={[styles.typeChipText, selectedType === type && styles.typeChipTextActive]}>{type}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.pokemonId)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => <PokemonCard item={item} />}
        ListHeaderComponent={
          featured ? (
            <View style={styles.featuredSection}>
              <Text style={[styles.sectionLabel, { marginBottom: 10, marginTop: 4 }]}>⭐ Top Pokémon</Text>
              <Link href={{ pathname: "/detailed", params: { name: featured.name } }} asChild>
                <Pressable style={styles.featuredCard}>
                  <View style={[styles.featuredGlow, { backgroundColor: TYPE_COLORS[featured.types[0]] || '#6366f1' }]} />
                  <View style={styles.featuredHeader}>
                    <View>
                      <Text style={styles.metaLabel}>Rarity Lvl</Text>
                      <Text style={styles.metaValue}>{featured.rarity}.{Math.floor(Math.random() * 9) + 1} ▲</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.metaLabel}>NFT Type</Text>
                      <Text style={[styles.metaValue, { color: RARITY_COLORS[featured.rarity] }]}>
                        {RARITY_LABELS[featured.rarity]}
                      </Text>
                    </View>
                  </View>
                  <Image source={{ uri: featured.officialArtworkUrl }} style={styles.featuredImage} resizeMode="contain" />
                  <View style={styles.featuredBody}>
                    <Text style={styles.featuredName}>{featured.displayName}</Text>
                    <View style={[styles.typesRow, { marginBottom: 8 }]}>
                      <View style={[styles.rarityBadge, { borderColor: RARITY_COLORS[featured.rarity] }]}>
                        <Text style={[styles.rarityText, { color: RARITY_COLORS[featured.rarity] }]}>
                          ★ {RARITY_LABELS[featured.rarity]}
                        </Text>
                      </View>
                      {featured.types.map(t => (
                        <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] || '#555' }]}>
                          <Text style={styles.typeText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.statBars}>
                      {[
                        ['HP', featured.stats.hp],
                        ['ATTAC', featured.stats.attack],
                        ['DEFEN', featured.stats.defense],
                        ['SPATK', featured.stats.spAtk],
                        ['SPDEF', featured.stats.spDef],
                        ['SPEED', featured.stats.speed],
                      ].map(([label, val]) => (
                        <View key={label as string} style={styles.statBarRow}>
                          <Text style={styles.statBarLabel}>{label}</Text>
                          <View style={styles.statBarTrack}>
                            <View style={[styles.statBarFill, {
                              width: `${Math.min(((val as number) / 255) * 100, 100)}%` as any,
                              backgroundColor: TYPE_COLORS[featured.types[0]] || '#6366f1',
                            }]} />
                          </View>
                          <Text style={styles.statBarValue}>{val}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.featuredActions}>
                      <Pressable style={styles.btnGhost}>
                        <Text style={styles.btnGhostText}>View History</Text>
                      </Pressable>
                      <Pressable style={styles.btnPrimary}>
                        <Text style={styles.btnPrimaryText}>Buy Now</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              </Link>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>🔥 Rare Pokémon</Text>
                <Pressable style={styles.viewAllBtn}>
                  <Text style={styles.viewAllText}>View All</Text>
                </Pressable>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          <Pressable style={styles.loadMoreBtn} onPress={() => loadPokemons(offset)} disabled={loadingMore}>
            <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load More Pokémon'}</Text>
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080b14' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080b14', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 16, textAlign: 'center' },
  retryLink: { color: '#6366f1', fontSize: 14, textDecorationLine: 'underline' },

  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#111827', borderRadius: 24, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#f1f5f9', fontSize: 15, paddingVertical: 10 },

  typeFilterScroll: { maxHeight: 44 },
  typeFilters: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#111827' },
  typeChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  typeChipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },

  grid: { padding: 12, gap: 12 },
  gridRow: { gap: 12 },

  // Featured card
  featuredSection: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: 1.5 },
  featuredCard: { backgroundColor: '#111827', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  featuredGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.2, top: 30, alignSelf: 'center', filter: 'blur(40px)' } as any,
  featuredHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingBottom: 0, alignItems: 'flex-start' },
  metaLabel: { fontSize: 10, color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', marginTop: 2 },
  rarityBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  rarityText: { fontSize: 11, fontWeight: '700' },
  featuredImage: { width: '100%', height: 200 },
  featuredBody: { padding: 16, paddingTop: 8 },
  featuredName: { fontSize: 24, fontWeight: '800', color: '#f1f5f9', textTransform: 'capitalize', marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  viewAllBtn: { paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, backgroundColor: '#111827' },
  viewAllText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  statBars: { gap: 6, marginTop: 8 },
  statBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBarLabel: { fontSize: 10, color: '#475569', fontWeight: '700', width: 42, textTransform: 'uppercase' as const },
  statBarTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 3 },
  statBarValue: { fontSize: 11, color: '#94a3b8', fontWeight: '600', width: 28, textAlign: 'right' as const },
  featuredActions: { flexDirection: 'row', gap: 8, marginTop: 12 },

  // Pokemon card
  card: { flex: 1, backgroundColor: '#111827', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', maxWidth: '49%' },
  cardGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, opacity: 0.15, top: 20, alignSelf: 'center' } as any,
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, paddingBottom: 0, alignItems: 'flex-start' },
  cardOwnerLabel: { fontSize: 9, color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardOwnerId: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'monospace' },
  artworkContainer: { alignItems: 'center', paddingVertical: 12 },
  artwork: { width: 100, height: 100 },
  cardBody: { padding: 10, paddingTop: 0 },
  typesRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  pokemonName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize', marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  priceUsd: { fontSize: 10, color: '#475569' },
  pokemonId: { fontSize: 10, color: '#475569', fontFamily: 'monospace' },
  cardActions: { flexDirection: 'row', gap: 6 },
  btnGhost: { flex: 1, padding: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  btnPrimary: { flex: 1, padding: 7, backgroundColor: '#6366f1', borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  loadMoreBtn: { margin: 16, marginTop: 4, backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 14, alignItems: 'center' },
  loadMoreText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});
