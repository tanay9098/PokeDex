import { useEffect, useState } from 'react'
import './App.css'

interface Pokemon {
  name: string
  image: string
  types: PokemonType[]
}

interface PokemonType {
  type: {
    name: string
    url: string
  }
}

const colorsByType: Record<string, string> = {
  fire: '#F08030',
  water: '#6890F0',
  grass: '#78C850',
  electric: '#F8D030',
  psychic: '#F85888',
  ice: '#98D8D8',
  dragon: '#7038F8',
  dark: '#705848',
  fairy: '#EE99AC',
}

const API_URL = 'https://pokeapi.co/api/v2/pokemon'

function App() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([])

  useEffect(() => {
    fetchPokemons()
  }, [])

  async function fetchPokemons() {
    try {
      const response = await fetch(API_URL)
      const data = await response.json()

      const detailedPokemons = await Promise.all(
        data.results.map(async (pokemon: { name: string; url: string }) => {
          const res = await fetch(pokemon.url)
          const details = await res.json()
          return {
            name: pokemon.name,
            image: details.sprites.front_default,
            types: details.types,
          }
        })
      )

      setPokemons(detailedPokemons)
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <div className="container">
      {pokemons.map((pokemon) => {
        const primaryType = pokemon.types[0].type.name
        const bgColor = colorsByType[primaryType] || '#A8A77A'
        return (
          <div
            key={pokemon.name}
            className="pokemon-card"
            style={{ backgroundColor: bgColor }}
          >
            <p className="pokemon-name">{pokemon.name}</p>
            <p className="pokemon-type">{primaryType}</p>
            <img src={pokemon.image} alt={pokemon.name} className="pokemon-image" />
          </div>
        )
      })}
    </div>
  )
}

export default App
