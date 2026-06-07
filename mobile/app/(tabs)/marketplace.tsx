import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAccount, useSendTransaction } from 'wagmi';
import { useAppKit } from '@reown/appkit-wagmi-react-native';
import { parseEther } from 'viem';

interface PokemonItem {
  pokemonId: number;
  name: string;
  displayName: string;
  types: string[];
  officialArtworkUrl: string;
  imageUrl: string;
  rarity: number;
  price: string;
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
const PRICES = ['', '0.01', '0.05', '0.25', '1.50', '5.00'];

// Marketplace wallet receives MATIC payments
const MARKETPLACE_WALLET = '0x11b3eb6DaE506837ef1d5cc7Bb3F896AbE854838' as `0x${string}`;

export const OWNED_STORAGE_KEY = 'ownedPokemonIds';

export async function getOwnedIds(): Promise<Set<number>> {
  try {
    const stored = await AsyncStorage.getItem(OWNED_STORAGE_KEY);
    return stored ? new Set<number>(JSON.parse(stored)) : new Set<number>();
  } catch { return new Set<number>(); }
}

export async function addOwnedId(id: number): Promise<void> {
  const owned = await getOwnedIds();
  owned.add(id);
  await AsyncStorage.setItem(OWNED_STORAGE_KEY, JSON.stringify([...owned]));
}

function calcRarity(total: number, exp: number) {
  const s = total + (exp || 0);
  if (s > 700) return 5; if (s > 560) return 4; if (s > 440) return 3; if (s > 320) return 2; return 1;
}

async function loadItems(limit = 20, offset = 0): Promise<PokemonItem[]> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
  const data = await res.json();
  const results = await Promise.allSettled(
    data.results.map(async (p: { url: string }) => {
      const d = await (await fetch(p.url)).json();
      const stats: Record<string, number> = {};
      d.stats.forEach((s: any) => { stats[s.stat.name] = s.base_stat; });
      const total = Object.values(stats).reduce((a: number, b: any) => a + b, 0);
      const rarity = calcRarity(total, d.base_experience);
      return {
        pokemonId: d.id, name: d.name, displayName: d.name.replace(/-/g, ' '),
        types: d.types.map((t: any) => t.type.name),
        officialArtworkUrl: d.sprites.other?.['official-artwork']?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/${d.id}.png`,
        imageUrl: d.sprites.front_default,
        rarity, price: PRICES[rarity],
      };
    })
  );
  return results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<PokemonItem>).value);
}

const FILTER_TABS = ['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];

function NFTCard({ item, onBuy, isBuying }: { item: PokemonItem; onBuy: (item: PokemonItem) => void; isBuying: boolean }) {
  const color = TYPE_COLORS[item.types[0]] || '#6366f1';
  const rc = RARITY_COLORS[item.rarity];
  const usd = (parseFloat(item.price) * 0.8).toFixed(2);
  return (
    <View style={styles.card}>
      <Link href={{ pathname: "/detailed", params: { name: item.name } }} asChild>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <View style={[styles.cardGlow, { backgroundColor: color }]} />
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
                <Text style={styles.priceLabel}>MATIC {item.price} × 1</Text>
                <Text style={styles.usdLabel}>(${usd})</Text>
              </View>
              <Text style={styles.tokenId}>#{String(item.pokemonId).padStart(4, '0')}</Text>
            </View>
          </View>
        </Pressable>
      </Link>
      <View style={[styles.actions, { paddingHorizontal: 10, paddingBottom: 10 }]}>
        <Pressable style={styles.btnGhost} onPress={() => {}}>
          <Text style={styles.btnGhostText}>View History</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, isBuying && styles.btnDisabled]}
          onPress={() => onBuy(item)}
          disabled={isBuying}
        >
          <Text style={styles.btnPrimaryText}>{isBuying ? 'Buying...' : 'Buy Now'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  return (
    <Pressable style={styles.walletBtn} onPress={() => open()}>
      <Text style={styles.walletBtnText}>
        {isConnected ? `${address!.slice(0, 6)}…${address!.slice(-4)}` : 'Connect Wallet'}
      </Text>
    </Pressable>
  );
}

export default function MarketplaceScreen() {
  const [items, setItems] = useState<PokemonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const { isConnected } = useAccount();
  const { open } = useAppKit();
  const { sendTransactionAsync } = useSendTransaction();

  useEffect(() => { load(0); }, []);

  async function load(off: number) {
    off === 0 ? setLoading(true) : setLoadingMore(true);
    try {
      const data = await loadItems(20, off);
      setItems(prev => off === 0 ? data : [...prev, ...data]);
      setOffset(off + 20);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleBuy(item: PokemonItem) {
    if (!isConnected) {
      Alert.alert(
        'Wallet Required',
        'Connect your wallet to purchase Pokémon NFTs.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect Wallet', onPress: () => open() },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Buy ${item.displayName} for ${item.price} MATIC ($${(parseFloat(item.price) * 0.8).toFixed(2)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            try {
              setBuyingId(item.pokemonId);
              await sendTransactionAsync({
                to: MARKETPLACE_WALLET,
                value: parseEther(item.price),
              });
              await addOwnedId(item.pokemonId);
              Alert.alert('Purchase Successful!', `${item.displayName} has been added to your collection.`);
            } catch (err: any) {
              const msg = err?.message?.includes('User rejected') ? 'Transaction cancelled.' : 'Purchase failed. Please try again.';
              Alert.alert('Error', msg);
            } finally {
              setBuyingId(null);
            }
          },
        },
      ]
    );
  }

  const filtered = activeFilter === 'All' ? items : items.filter(i => RARITY_LABELS[i.rarity] === activeFilter);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#6366f1" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageHeading}>Pokémon NFT Marketplace</Text>
        <WalletButton />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTER_TABS.map(f => (
          <Pressable key={f} style={[styles.filterTab, activeFilter === f && styles.filterTabActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.pokemonId)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <NFTCard item={item} onBuy={handleBuy} isBuying={buyingId === item.pokemonId} />
        )}
        ListFooterComponent={
          <Pressable style={styles.loadMoreBtn} onPress={() => load(offset)} disabled={loadingMore}>
            <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load More'}</Text>
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080b14' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080b14' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, paddingTop: 4 },
  pageHeading: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', padding: 16, paddingBottom: 8 },
  walletBtn: { backgroundColor: '#6366f1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  walletBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  filterScroll: { maxHeight: 52, marginTop: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#111827' },
  filterTabActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  filterTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },
  grid: { padding: 12, gap: 12, paddingBottom: 80 },
  gridRow: { gap: 12 },
  card: { flex: 1, backgroundColor: '#111827', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', maxWidth: '49%' },
  cardGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, opacity: 0.15, top: 20, alignSelf: 'center' } as any,
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, paddingBottom: 0 },
  ownerLabel: { fontSize: 9, color: '#475569', fontWeight: '700', textTransform: 'uppercase' },
  ownerId: { fontSize: 11, color: '#94a3b8', fontWeight: '700', fontFamily: 'monospace' },
  rarityBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  rarityText: { fontSize: 10, fontWeight: '700' },
  artwork: { width: '100%', height: 110 },
  cardBottom: { padding: 10, paddingTop: 6 },
  typesRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  typeText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  pokemonName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize', marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  usdLabel: { fontSize: 10, color: '#475569' },
  tokenId: { fontSize: 10, color: '#475569', fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 6 },
  btnGhost: { flex: 1, padding: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  btnPrimary: { flex: 1, padding: 7, backgroundColor: '#6366f1', borderRadius: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#3730a3', opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  loadMoreBtn: { margin: 12, backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 14, alignItems: 'center' },
  loadMoreText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});
