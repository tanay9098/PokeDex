import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";


interface Pokemon {
  name: string;
  url: string;
}

export default function Index() {
  const [pokemons, setPokemons] = useState([]);
  useEffect(() => {
    fetchPokemons();
  }, []);

  async function fetchPokemons() {
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=10");


      const data = await response.json();

      const detailedPokemons=await Promise.all(data.results.map(async (pokemon:Pokemon) => {
        const res = await fetch(pokemon.url);
        const details= await res.json();
        return{
          name: pokemon.name,
          image: details.sprites.front_default, 
        };
      })
      );
      console.log(detailedPokemons);

      setPokemons(data.results);
      console.log(data);
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
