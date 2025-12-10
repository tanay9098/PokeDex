import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function Index() {
  const [pokemons, setPokemons] = useState([]);
  useEffect(() => {
    fetchPokemons();
  }, []);

  async function fetchPokemons() {
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=10");


      const data = await response.json();

      setPokemons(data.results);
      console.log(data.results);
    } catch (e) {
      console.log(e);
    }
  }
  return (
    <ScrollView>
      {pokemons.map((pokemon) => (
        <View key={pokemon.name}>
          <Text>{pokemon.name}</Text>
        </View>
        ))}
    
    
    </ScrollView>
  );
}
