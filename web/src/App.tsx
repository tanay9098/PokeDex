import { useEffect, useState } from 'react'
import { useWeb3 } from './hooks/useWeb3'
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

const API_URL = import.meta.env.VITE_API_URL || 'https://pokeapi.co/api/v2/pokemon'

function App() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const contractAddresses = {
    pokemonNFT: import.meta.env.VITE_POKEMON_NFT_ADDRESS || '',
    marketplace: import.meta.env.VITE_MARKETPLACE_ADDRESS || '',
  }

  const web3State = useWeb3(
    contractAddresses.pokemonNFT && contractAddresses.marketplace ? contractAddresses : undefined
  )

  useEffect(() => {
    fetchPokemons()
  }, [])

  async function fetchPokemons() {
    try {
      setLoading(true)
      setFetchError(null)

      const response = await fetch(API_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch Pokemon: ${response.statusText}`)
      }

      const data = await response.json()

      const detailedPokemons = await Promise.allSettled(
        data.results.map(async (pokemon: { name: string; url: string }) => {
          try {
            const res = await fetch(pokemon.url)
            if (!res.ok) {
              throw new Error(`Failed to fetch details for ${pokemon.name}`)
            }
            const details = await res.json()
            return {
              name: pokemon.name,
              image: details.sprites.front_default,
              types: details.types,
            }
          } catch (error) {
            console.error(`Error fetching Pokemon ${pokemon.name}:`, error)
            return null
          }
        })
      )

      const successfulPokemons = detailedPokemons
        .filter((result) => result.status === 'fulfilled' && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<Pokemon>).value)

      setPokemons(successfulPokemons)
      setLoading(false)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch Pokemon. Please try again.'
      setFetchError(errorMessage)
      setLoading(false)
      console.error('Error in fetchPokemons:', error)
    }
  }

  return (
    <div className="app-wrapper">
      <div className="web3-status">
        {web3State.isLoading && <div className="status-badge loading">Connecting wallet...</div>}
        {web3State.error && (
          <div className="status-badge error">
            <span>{web3State.error.message}</span>
            <button onClick={() => window.location.reload()} className="retry-btn">
              Retry
            </button>
          </div>
        )}
        {web3State.isConnected && !web3State.isLoading && (
          <div className="status-badge success">
            <span>Connected: {web3State.currentAccount?.slice(0, 6)}...</span>
            {web3State.isInitialized && <span className="badge-pill">Smart Contracts Ready</span>}
          </div>
        )}
      </div>

      <div className="container">
        {loading && <div className="loading-state">Loading Pokemon...</div>}

        {fetchError && !loading && (
          <div className="error-state">
            <p>{fetchError}</p>
            <button onClick={() => fetchPokemons()} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {!loading && !fetchError && pokemons.length > 0 && (
          <div className="pokemon-grid">
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
                  <img
                    src={pokemon.image}
                    alt={pokemon.name}
                    className="pokemon-image"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image'
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

        {!loading && pokemons.length === 0 && !fetchError && (
          <div className="empty-state">
            <p>No Pokemon found. Please try again later.</p>
            <button onClick={() => fetchPokemons()} className="retry-btn">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
