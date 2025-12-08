import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function Index() {
  const [pokemons, setPokemons] = useState(null);
  useEffect(() => {
    console.log("PokeDex app loaded");
  }, []);

  async function fetchPokemons() {
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=10");


      const data = await response.json();

      setPokemons(data);
      console.log(data);
    } catch (error) {
      console.error("Error fetching Pokemons:", error);
    }
  }
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>PokeDex</Text>
    </View>
  );
}
