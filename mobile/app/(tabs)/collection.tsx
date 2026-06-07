import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { getOwnedIds } from "./marketplace";

interface PokemonItem {
  pokemonId: number;
  name: string;
  displayName: string;
  types: string[];
  officialArtworkUrl: string;
  imageUrl: string;
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

function calcRarity(total: number, exp: number) {
  const s = total + (exp || 0);
  if (s > 700) return 5; if (s > 560) return 4; if (s > 440) return 3; if (s > 320) return 2; return 1;
}

async function fetchPokemonById(id: number): Promise<PokemonItem> {
  const d = await (await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)).json();
  const sm: Record<string, number> = {};
  d.stats.forEach((s: any) => { sm[s.stat.name] = s.base_stat; });
  const stats = { hp: sm.hp || 0, attack: sm.attack || 0, defense: sm.defense || 0, spAtk: sm['special-attack'] || 0, spDef: sm['special-defense'] || 0, speed: sm.speed || 0 };
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  return {
    pokemonId: d.id, name: d.name, displayName: d.name.replace(/-/g, ' '),
    types: d.types.map((t: any) => t.type.name),
    officialArtworkUrl: d.sprites.other?.['official-artwork']?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/${d.id}.png`,
    imageUrl: d.sprites.front_default,
    stats, rarity: calcRarity(total, d.base_experience),
  };
}

const PRICES = ['', '0.01', '0.05', '0.25', '1.50', '5.00'];

function CollectionCard({ item }: { item: PokemonItem }) {
  const color = TYPE_COLORS[item.types[0]] || '#6366f1';
  const rc = RARITY_COLORS[item.rarity];
  const price = PRICES[item.rarity];
  const usd = (parseFloat(price) * 0.8).toFixed(2);

  return (
    <Link href={{ pathname: "/detailed", params: { name: item.name } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View style={[styles.cardBg, { backgroundColor: color }]} />
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.ownerLabel}>Owned by</Text>
            <Text style={styles.ownerId}>{String(item.pokemonId).padStart(4, '0')}EX</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ownerLabel}>Created by</Text>
            <Text style={styles.ownerId}>{item.pokemonId}API</Text>
          </View>
        </View>
        <Image source={{ uri: item.officialArtworkUrl }} style={styles.artwork} resizeMode="contain" />
        <View style={styles.cardBottom}>
          <View style={styles.typesRow}>
            {item.types.map(t => (
              <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] || '#555' }]}>
                <Text style={styles.typeText}>{t}</Text>
              </View>
            ))}
            <View style={[styles.rarityBadge, { borderColor: rc }]}>
              <Text style={[styles.rarityText, { color: rc }]}>{RARITY_LABELS[item.rarity]}</Text>
            </View>
          </View>
          <Text style={styles.pokemonName}>{item.displayName}</Text>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>MATIC {price} × 1</Text>
              <Text style={styles.priceUsd}>(${usd})</Text>
            </View>
            <Text style={styles.idText}>#{String(item.pokemonId).padStart(4, '0')}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export default function CollectionScreen() {
  const [items, setItems] = useState<PokemonItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadOwned();
    }, [])
  );

  async function loadOwned() {
    setLoading(true);
    try {
      const ownedIds = await getOwnedIds();
      if (ownedIds.size === 0) {
        setItems([]);
        return;
      }
      const results = await Promise.allSettled([...ownedIds].map(fetchPokemonById));
      setItems(results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<PokemonItem>).value));
    } finally {
      setLoading(false);
    }
  }

  const rareCount = items.filter(i => i.rarity >= 4).length;

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#6366f1" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>{items.length}</Text>
          <Text style={styles.statCardLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statCardValue, { color: '#f59e0b' }]}>{rareCount}</Text>
          <Text style={styles.statCardLabel}>Rare+</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statCardValue, { color: '#6366f1' }]}>{items.length}</Text>
          <Text style={styles.statCardLabel}>Owned NFTs</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Pokémon Yet</Text>
          <Text style={styles.emptySubtitle}>Head to the Marketplace to buy your first Pokémon!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.pokemonId)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <CollectionCard item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080b14' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080b14' },
  statsHeader: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statCardValue: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  statCardLabel: { fontSize: 9, color: '#475569', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#475569', textAlign: 'center' },
  grid: { padding: 12, gap: 12 },
  gridRow: { gap: 12 },
  card: { flex: 1, backgroundColor: '#111827', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', maxWidth: '49%' },
  cardBg: { position: 'absolute', width: 100, height: 100, borderRadius: 50, opacity: 0.12, top: 10, alignSelf: 'center' } as any,
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, paddingBottom: 0, alignItems: 'flex-start' },
  ownerLabel: { fontSize: 9, color: '#475569', fontWeight: '700', textTransform: 'uppercase' as const },
  ownerId: { fontSize: 11, color: '#94a3b8', fontWeight: '700', fontFamily: 'monospace' },
  rarityBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  rarityText: { fontSize: 9, fontWeight: '700' },
  idText: { fontSize: 10, color: '#475569', fontFamily: 'monospace' },
  artwork: { width: '100%', height: 100 },
  cardBottom: { padding: 10, paddingTop: 4 },
  typesRow: { flexDirection: 'row', gap: 4, marginBottom: 4, flexWrap: 'wrap' as const },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  typeText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'capitalize' as const },
  pokemonName: { fontSize: 13, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize' as const, marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  priceUsd: { fontSize: 10, color: '#475569' },
});
