import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View, StyleSheet } from "react-native";
import { Link } from "expo-router";

interface Pokemon {
  name: string;
  image: string;
  types: PokemonType[];
}

interface PokemonType {
  type: {
    name: string;
    url: string;
  };
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

export default function Index() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPokemons();
  }, []);

  async function fetchPokemons() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(process.env.EXPO_PUBLIC_API_URL as string);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      const detailedPokemons = await Promise.all(
        data.results.map(async (pokemon: { name: string; url: string }) => {
          const res = await fetch(pokemon.url);
          const details = await res.json();
          return {
            name: pokemon.name,
            image: details.sprites.front_default,
            types: details.types,
          };
        })
      );

      setPokemons(detailedPokemons);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Pokémon");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Loading Pokémon...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={fetchPokemons}>Tap to retry</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, padding: 16, alignItems: 'center' }}>
      {pokemons.map((pokemon) => (
        <Link
          key={pokemon.name}
          href={{ pathname: "/detailed", params: { name: pokemon.name } }}
          style={{
            backgroundColor: colorsByType[pokemon.types[0].type.name] ?? '#A8A77A',
            margin: 10,
            padding: 10,
            borderRadius: 20,
            alignItems: 'center',
          }}
        >
          <View>
            <Text style={styles.name}>{pokemon.name}</Text>
            <Text style={styles.type}>{pokemon.types[0].type.name}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: pokemon.image }} style={{ width: 150, height: 150 }} />
            </View>
          </View>
        </Link>
      ))}
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
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  type: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
});
