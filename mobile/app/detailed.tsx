import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

interface PokemonDetails {
  name: string;
  image: string;
  types: string[];
  height: number;
  weight: number;
  baseExperience: number;
  stats: { name: string; value: number }[];
}

const colorsByType: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#F08030',
  water: '#6890F0',
  grass: '#78C850',
  electric: '#F8D030',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

const statLabels: Record<string, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'Sp.ATK',
  'special-defense': 'Sp.DEF',
  speed: 'SPD',
};

export default function Details() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [pokemon, setPokemon] = useState<PokemonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (name) fetchPokemonDetails(name);
  }, [name]);

  async function fetchPokemonDetails(pokemonName: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
      if (!res.ok) throw new Error(`Could not load ${pokemonName}`);
      const data = await res.json();

      setPokemon({
        name: data.name,
        image: data.sprites.other?.['official-artwork']?.front_default ?? data.sprites.front_default,
        types: data.types.map((t: { type: { name: string } }) => t.type.name),
        height: data.height,
        weight: data.weight,
        baseExperience: data.base_experience,
        stats: data.stats.map((s: { stat: { name: string }; base_stat: number }) => ({
          name: s.stat.name,
          value: s.base_stat,
        })),
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
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !pokemon) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Pokémon not found"}</Text>
        <Text style={styles.retryText} onPress={() => name && fetchPokemonDetails(name)}>
          Tap to retry
        </Text>
      </View>
    );
  }

  const primaryType = pokemon.types[0];
  const bgColor = colorsByType[primaryType] ?? '#A8A77A';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center', gap: 16 }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <Text style={styles.name}>{pokemon.name}</Text>
        <View style={styles.typesRow}>
          {pokemon.types.map((t) => (
            <View key={t} style={[styles.typeBadge, { backgroundColor: colorsByType[t] ?? '#A8A77A' }]}>
              <Text style={styles.typeText}>{t}</Text>
            </View>
          ))}
        </View>
        <Image source={{ uri: pokemon.image }} style={styles.image} />
      </View>

      {/* Basic info */}
      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Height</Text>
          <Text style={styles.infoValue}>{(pokemon.height / 10).toFixed(1)} m</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Weight</Text>
          <Text style={styles.infoValue}>{(pokemon.weight / 10).toFixed(1)} kg</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Base EXP</Text>
          <Text style={styles.infoValue}>{pokemon.baseExperience}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Base Stats</Text>
        {pokemon.stats.map((stat) => (
          <View key={stat.name} style={styles.statRow}>
            <Text style={styles.statLabel}>{statLabels[stat.name] ?? stat.name}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <View style={styles.statBarBg}>
              <View
                style={[
                  styles.statBarFill,
                  { width: `${Math.min((stat.value / 255) * 100, 100)}%`, backgroundColor: bgColor },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: '#E63946',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryText: {
    fontSize: 14,
    color: '#6890F0',
    textDecorationLine: 'underline',
  },
  header: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    color: '#fff',
    marginBottom: 8,
  },
  typesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    opacity: 0.9,
  },
  typeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  image: {
    width: 200,
    height: 200,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  statsContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  statValue: {
    width: 36,
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textAlign: 'right',
  },
  statBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
