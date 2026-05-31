import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";


import { useEffect } from "react";






export default function Details() {

  const params=useLocalSearchParams();

  console.log(params.name);

  useEffect(() => {
    
  }, []);

  async function fetchPokemonDetails() {
    try{
      const response = await fetch(process.env.EXPO_PUBLIC_API_URL as string);
      const data = await response.json();
      console.log(data);
    } 
    catch(e){
      console.error(e);
    }

   
  }
  
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        alignItems: "center",
        gap: 16,
      }}
    >
      
    
    
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