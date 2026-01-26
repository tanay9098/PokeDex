import { useEffect, useState } from "react";
import { Image,ScrollView, Text, View, StyleSheet } from "react-native";
import Details from "./detailed";
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

const colorsByType={
  fire:'#F08030',
  water:'#6890F0',
  grass:'#78C850',
  electric:'#F8D030',
  psychic:'#F85888',
  ice:'#98D8D8',
  dragon:'#7038F8',
  dark:'#705848',
  fairy:'#EE99AC',
}





export default function Index() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);;
  useEffect(() => {
    fetchPokemons();
  }, []);

  async function fetchPokemons() {
    try {
      const response = await fetch(process.env.EXPO_PUBLIC_API_URL as string);


      const data = await response.json();

      const detailedPokemons=await Promise.all(data.results.map(async (pokemon:any) => {
        const res = await fetch(pokemon.url);
        const details= await res.json();
        return{
          name: pokemon.name,
          image: details.sprites.front_default, 
            types: details.types, // REQUIRED

        };
      })
      );
      console.log(detailedPokemons);

      setPokemons(detailedPokemons);
      console.log(data);
    } catch (e) {
      console.log(e);
    }
  }
  return (
    <ScrollView contentContainerStyle={{
      gap:16,
      padding:16,
      alignItems:'center'
    }}>
      
      {pokemons.map((pokemon) => (
        <Link key={pokemon.name} href={"/detailed"}
        
        style={{
          backgroundColor: colorsByType[pokemon.types[0].type.name as keyof typeof colorsByType] || '#A8A77A',
          margin:10,
          padding:10,
          borderRadius:20,
          alignItems:'center'
        }}>
          <View>
        
          <Text style={styles.name}>{pokemon.name}</Text>
          <Text style={styles.type}>{pokemon.types[0].type.name}</Text>

          <View style={{flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
            <Image source={{uri:pokemon.image}}
          style={{width:150, height:150}}/>

         


          </View>
          </View>
          
        </Link>
        ))}
    
    
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  name:{
    fontSize:20,
    fontWeight:'bold',
    textAlign:'center',

  },
  type: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 8,
    textTransform: "capitalize",
    textAlign:'center',
  },
})