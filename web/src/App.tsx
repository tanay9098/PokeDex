import { useEffect, useState, useCallback } from 'react'
import { ethers } from 'ethers'
import './App.css'
import {
  fetchPokemonList,
  fetchPokemonDetails,
  simulateBattleTurn,
  getMockPrice,
  getRarityLabel,
  getRarityColor,
  typeColors,
  PokemonListItem,
  PokemonData,
  PokemonMove,
} from './utils/pokeapi'

type Page = 'home' | 'marketplace' | 'battle' | 'collection'

type BattlePhase = 'select' | 'fighting' | 'result'

interface BattleState {
  phase: BattlePhase
  myPokemon: PokemonData | null
  opponentPokemon: PokemonData | null
  myHP: number
  opponentHP: number
  log: { text: string; type: 'normal' | 'highlight' | 'damage' | 'system' }[]
  turn: 'player' | 'opponent'
  winner: 'player' | 'opponent' | null
  isAnimating: boolean
}

const TYPES = ['all', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy', 'fighting', 'ghost', 'poison', 'ground', 'rock', 'bug', 'steel', 'normal', 'flying']

const NAV_ITEMS: { id: Page; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'marketplace', icon: '🛒', label: 'Market' },
  { id: 'battle', icon: '⚔️', label: 'Battle' },
  { id: 'collection', icon: '📦', label: 'Collection' },
]

function getPokemonNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

function getHpColor(pct: number): string {
  if (pct > 60) return '#22c55e'
  if (pct > 25) return '#f59e0b'
  return '#ef4444'
}

// ────────────────────────────────────────────────
// Sub-component: PokemonNFTCard
// ────────────────────────────────────────────────
function PokemonNFTCard({
  pokemon,
  onClick,
  onBuy,
  showBuy = true,
  isBuying = false,
}: {
  pokemon: PokemonListItem
  onClick: (p: PokemonListItem) => void
  onBuy?: (p: PokemonListItem) => void
  showBuy?: boolean
  isBuying?: boolean
}) {
  const price = getMockPrice(pokemon.rarity)
  const rarityColor = getRarityColor(pokemon.rarity)
  const primaryType = pokemon.types[0]
  const glowColor = typeColors[primaryType] || '#6366f1'
  const shortId = getPokemonNumber(pokemon.pokemonId).slice(1, 5)

  return (
    <div className="pokemon-nft-card" onClick={() => onClick(pokemon)}>
      <div className="nft-card-header">
        <div className="nft-owner-block">
          <span className="nft-owner-label">Owned by</span>
          <span className="nft-owner-id">{shortId}EX</span>
        </div>
        <div className="nft-owner-block" style={{ textAlign: 'right' }}>
          <span className="nft-owner-label">Created by</span>
          <span className="nft-owner-id">{pokemon.pokemonId}API</span>
        </div>
      </div>

      <div className="nft-artwork">
        <div className="nft-artwork-glow" style={{ background: glowColor }} />
        <img
          src={pokemon.officialArtworkUrl}
          alt={pokemon.displayName}
          onError={(e) => { e.currentTarget.src = pokemon.imageUrl }}
        />
      </div>

      <div className="nft-card-body">
        <div className="type-badges" style={{ marginBottom: 4 }}>
          {pokemon.types.map(t => (
            <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555', fontSize: 10 }}>{t}</span>
          ))}
          <span className="rarity-badge" style={{ color: rarityColor, borderColor: rarityColor, fontSize: 10, padding: '1px 7px' }}>
            {getRarityLabel(pokemon.rarity)}
          </span>
        </div>

        <div className="nft-name">{pokemon.displayName}</div>

        <div className="nft-price-row">
          <div>
            <div className="nft-price-label">Price: MATIC {price} × 1</div>
            <div className="nft-price-usd">(${(parseFloat(price) * 0.8).toFixed(2)})</div>
          </div>
          <div className="nft-price-value">{getPokemonNumber(pokemon.pokemonId)}</div>
        </div>

        {showBuy && (
          <div className="nft-card-actions" onClick={(e) => e.stopPropagation()}>
            <button className="nft-btn-ghost">View History</button>
            <button className="nft-btn-primary" onClick={() => onBuy?.(pokemon)} disabled={isBuying}>
              {isBuying ? 'Buying...' : 'Buy Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// Sub-component: PokemonDetailModal
// ────────────────────────────────────────────────
function PokemonDetailModal({
  item,
  fullData,
  onClose,
  onBattle,
}: {
  item: PokemonListItem
  fullData: PokemonData | null
  onClose: () => void
  onBattle: (p: PokemonData) => void
}) {
  const primaryType = item.types[0]
  const glowColor = typeColors[primaryType] || '#6366f1'
  const rarityColor = getRarityColor(item.rarity)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="type-badges">
              {item.types.map(t => (
                <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555' }}>{t}</span>
              ))}
            </div>
            <div className="modal-name" style={{ marginTop: 6 }}>{item.displayName}</div>
            <span className="rarity-badge" style={{ color: rarityColor, borderColor: rarityColor }}>
              ★ {getRarityLabel(item.rarity)}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-artwork">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{ position: 'absolute', width: 160, height: 160, background: glowColor, borderRadius: '50%', filter: 'blur(50px)', opacity: 0.3, top: 10, left: 10 }} />
            <img
              src={item.officialArtworkUrl}
              alt={item.displayName}
              style={{ width: 180, height: 180, objectFit: 'contain', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))' }}
              onError={(e) => { e.currentTarget.src = item.imageUrl }}
            />
          </div>
        </div>

        <div className="modal-body">
          {/* Stats */}
          <div>
            <div className="modal-section-title">Base Stats</div>
            <div className="stat-bar-mini">
              {Object.entries(item.stats).map(([key, val]) => (
                <div key={key} className="stat-row-mini">
                  <span className="stat-name-mini">{key.toUpperCase().slice(0, 6)}</span>
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${Math.min((val / 255) * 100, 100)}%`, background: glowColor }} />
                  </div>
                  <span className="stat-num">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Abilities */}
          {fullData && fullData.abilities.length > 0 && (
            <div>
              <div className="modal-section-title">Abilities</div>
              <div className="ability-list">
                {fullData.abilities.map(ab => (
                  <div key={ab.name} className="ability-item">
                    <div className="ability-name">{ab.displayName}</div>
                    <div className="ability-effect">{ab.effect}</div>
                    {ab.battleModifier > 1.0 && (
                      <div className="ability-modifier">⚡ Battle boost: ×{ab.battleModifier.toFixed(2)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moves */}
          {fullData && fullData.moves.length > 0 && (
            <div>
              <div className="modal-section-title">Battle Moves</div>
              <div className="moves-grid">
                {fullData.moves.map(mv => (
                  <div key={mv.name} className="move-item">
                    <div className="move-name">{mv.displayName}</div>
                    <div className="move-meta">
                      <span className="type-badge" style={{ background: typeColors[mv.type] || '#555', fontSize: 10, marginRight: 4 }}>{mv.type}</span>
                      <span className="move-power">PWR {mv.power}</span>
                      <span style={{ color: '#94a3b8' }}> • {mv.accuracy}% ACC</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!fullData && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <div className="spinner" />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={() => fullData && onBattle(fullData)}>
              ⚔️ Battle with this Pokémon
            </button>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// Main App
// ────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [pokemons, setPokemons] = useState<PokemonListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [selectedType, setSelectedType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<PokemonListItem | null>(null)
  const [modalFullData, setModalFullData] = useState<PokemonData | null>(null)
  const [battleState, setBattleState] = useState<BattleState>({
    phase: 'select',
    myPokemon: null,
    opponentPokemon: null,
    myHP: 0,
    opponentHP: 0,
    log: [],
    turn: 'player',
    winner: null,
    isAnimating: false,
  })
  const [battleSelectedItem, setBattleSelectedItem] = useState<PokemonListItem | null>(null)
  const [battleLoading, setBattleLoading] = useState(false)
  const [buyingPokemonId, setBuyingPokemonId] = useState<number | null>(null)
  const [ownedPokemonIds, setOwnedPokemonIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('ownedPokemonIds')
      return stored ? new Set<number>(JSON.parse(stored)) : new Set<number>()
    } catch { return new Set<number>() }
  })

  useEffect(() => {
    loadPokemons(0)
  }, [])

  async function loadPokemons(off: number) {
    try {
      off === 0 ? setLoading(true) : setLoadingMore(true)
      setError(null)
      const list = await fetchPokemonList(20, off)
      setPokemons(prev => off === 0 ? list : [...prev, ...list])
      setOffset(off + 20)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Pokémon')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const filteredPokemons = pokemons.filter(p => {
    const matchType = selectedType === 'all' || p.types.includes(selectedType)
    const matchSearch = !searchQuery || p.name.includes(searchQuery.toLowerCase())
    return matchType && matchSearch
  })

  const featuredPokemon = filteredPokemons.find(p => p.rarity >= 4) || filteredPokemons[0]
  const rarePokemon = filteredPokemons.filter(p => p !== featuredPokemon).slice(0, 8)

  async function connectWallet() {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
        setWalletAddress(accounts[0])
      } catch {}
    } else {
      alert('Please install MetaMask to connect your wallet')
    }
  }

  async function handleBuyPokemon(pokemon: PokemonListItem) {
    if (!walletAddress) {
      alert('Please connect your wallet first')
      return
    }

    // Deployer wallet receives the purchase price (MATIC returns to you)
    const DEPLOYER_ADDRESS = ethers.getAddress('0x11b3eb6dae506837ef1d5cc7bb3f896abe854838')

    const price = getMockPrice(pokemon.rarity)
    const priceInWei = ethers.parseEther(price)

    try {
      setBuyingPokemonId(pokemon.pokemonId)

      // Ensure wallet is on Polygon Amoy testnet (chainId 80002)
      const currentChainId = await (window as any).ethereum.request({ method: 'eth_chainId' })
      if (currentChainId !== '0x13882') {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x13882' }],
          })
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x13882',
                chainName: 'Polygon Amoy Testnet',
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                blockExplorerUrls: ['https://amoy.polygonscan.com'],
              }],
            })
          } else {
            throw switchErr
          }
        }
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      const tx = await signer.sendTransaction({ to: DEPLOYER_ADDRESS, value: priceInWei })
      await tx.wait()

      const newOwned = new Set(ownedPokemonIds)
      newOwned.add(pokemon.pokemonId)
      setOwnedPokemonIds(newOwned)
      localStorage.setItem('ownedPokemonIds', JSON.stringify([...newOwned]))

      alert(`Successfully purchased ${pokemon.displayName} for ${price} MATIC!\nTx: ${tx.hash}`)
    } catch (err: any) {
      if (err.code === 4001 || err.info?.error?.code === 4001) {
        alert('Transaction cancelled')
      } else {
        alert(`Purchase failed: ${err.message || 'Unknown error'}`)
      }
    } finally {
      setBuyingPokemonId(null)
    }
  }

  function openModal(item: PokemonListItem) {
    setModalItem(item)
    setModalFullData(null)
    fetchPokemonDetails(item.name).then(setModalFullData).catch(() => {})
  }

  function closeModal() {
    setModalItem(null)
    setModalFullData(null)
  }

  function startBattleFromModal(pokemon: PokemonData) {
    closeModal()
    setPage('battle')
    setBattleSelectedItem(pokemon as unknown as PokemonListItem)
  }

  async function startBattle() {
    if (!battleSelectedItem) return
    setBattleLoading(true)
    try {
      const myPokemon = await fetchPokemonDetails(battleSelectedItem.name)
      const randomOpponent = pokemons.filter(p => p.name !== battleSelectedItem.name)[
        Math.floor(Math.random() * (pokemons.length - 1))
      ]
      const opponentPokemon = await fetchPokemonDetails(randomOpponent.name)

      setBattleState({
        phase: 'fighting',
        myPokemon,
        opponentPokemon,
        myHP: myPokemon.stats.hp * 2,
        opponentHP: opponentPokemon.stats.hp * 2,
        log: [{ text: `Battle starts! ${myPokemon.displayName} vs ${opponentPokemon.displayName}!`, type: 'system' }],
        turn: 'player',
        winner: null,
        isAnimating: false,
      })
    } catch (e) {
      alert('Failed to load battle data')
    } finally {
      setBattleLoading(false)
    }
  }

  const executeMove = useCallback((move: PokemonMove) => {
    setBattleState(prev => {
      if (!prev.myPokemon || !prev.opponentPokemon || prev.turn !== 'player' || prev.isAnimating) return prev
      const { damage, message } = simulateBattleTurn(prev.myPokemon, prev.opponentPokemon, move)
      const newOppHP = Math.max(0, prev.opponentHP - damage)
      const log = [...prev.log,
        { text: `${prev.myPokemon.displayName} used ${move.displayName}! (${damage} dmg)`, type: 'highlight' as const },
        ...(message ? [{ text: message, type: 'damage' as const }] : []),
      ]

      if (newOppHP <= 0) {
        return { ...prev, opponentHP: 0, log: [...log, { text: `${prev.myPokemon.displayName} wins! 🎉`, type: 'highlight' as const }], winner: 'player', phase: 'result' }
      }

      // Opponent's turn
      const oppMoves = prev.opponentPokemon.moves
      const oppMove = oppMoves[Math.floor(Math.random() * oppMoves.length)]
      if (!oppMove) return { ...prev, opponentHP: newOppHP, log, turn: 'player' }

      const oppResult = simulateBattleTurn(prev.opponentPokemon, prev.myPokemon, oppMove)
      const newMyHP = Math.max(0, prev.myHP - oppResult.damage)
      const log2 = [...log,
        { text: `${prev.opponentPokemon.displayName} used ${oppMove.displayName}! (${oppResult.damage} dmg)`, type: 'damage' as const },
        ...(oppResult.message ? [{ text: oppResult.message, type: 'damage' as const }] : []),
      ]

      if (newMyHP <= 0) {
        return { ...prev, opponentHP: newOppHP, myHP: 0, log: [...log2, { text: `${prev.opponentPokemon.displayName} wins!`, type: 'damage' as const }], winner: 'opponent', phase: 'result' }
      }

      return { ...prev, opponentHP: newOppHP, myHP: newMyHP, log: log2, turn: 'player' }
    })
  }, [])

  function resetBattle() {
    setBattleState({ phase: 'select', myPokemon: null, opponentPokemon: null, myHP: 0, opponentHP: 0, log: [], turn: 'player', winner: null, isAnimating: false })
    setBattleSelectedItem(null)
  }

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div id="root" style={{ display: 'flex', width: '100%' }}>
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo" onClick={() => setPage('home')}>🎮</div>
        <div className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="header">
          <span className="header-title">PokéDex NFT</span>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search Pokémon..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="type-filters">
            {TYPES.map(type => (
              <button
                key={type}
                className={`type-chip ${selectedType === type ? 'active' : ''}`}
                style={selectedType === type && type !== 'all' ? { background: typeColors[type], borderColor: typeColors[type] } : {}}
                onClick={() => setSelectedType(type)}
              >
                {type === 'all' ? 'All Types' : type}
              </button>
            ))}
          </div>
          <div className="header-spacer" style={{ flex: 'none' }} />
          <button
            className={`wallet-btn ${walletAddress ? 'connected' : ''}`}
            onClick={walletAddress ? undefined : connectWallet}
          >
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '🔗 Connect Wallet'}
          </button>
        </header>

        {/* Page Content */}
        <main className="page">
          {loading && (
            <div className="loading-screen">
              <div className="spinner" />
              <p>Loading Pokémon from PokéAPI...</p>
            </div>
          )}

          {error && !loading && (
            <div className="error-banner">
              ⚠️ {error}
              <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => loadPokemons(0)}>Retry</button>
            </div>
          )}

          {/* HOME PAGE */}
          {!loading && page === 'home' && (
            <div>
              <div className="home-grid">
                {/* Featured Pokemon */}
                <div className="featured-section">
                  <span className="section-label">Top Pokémon</span>
                  {featuredPokemon && (
                    <div className="featured-card" onClick={() => openModal(featuredPokemon)}>
                      <div className="featured-card-header">
                        <div className="featured-card-meta">
                          <span className="meta-label">Rarity Lvl</span>
                          <span className="meta-value">{featuredPokemon.rarity}.{Math.floor(Math.random() * 9) + 1} ▲</span>
                        </div>
                        <div className="featured-card-meta" style={{ textAlign: 'right' }}>
                          <span className="meta-label">NFT Type</span>
                          <span className="meta-value" style={{ color: getRarityColor(featuredPokemon.rarity) }}>{getRarityLabel(featuredPokemon.rarity)}</span>
                        </div>
                      </div>
                      <div className="featured-artwork">
                        <div className="featured-artwork-glow" style={{ background: typeColors[featuredPokemon.types[0]] || '#6366f1' }} />
                        <img
                          src={featuredPokemon.officialArtworkUrl}
                          alt={featuredPokemon.displayName}
                          onError={(e) => { e.currentTarget.src = featuredPokemon.imageUrl }}
                        />
                      </div>
                      <div className="featured-card-body">
                        <div className="featured-card-name">{featuredPokemon.displayName}</div>
                        <span className="rarity-badge" style={{ color: getRarityColor(featuredPokemon.rarity), borderColor: getRarityColor(featuredPokemon.rarity) }}>
                          ★ {getRarityLabel(featuredPokemon.rarity)}
                        </span>
                        <div className="type-badges">
                          {featuredPokemon.types.map(t => (
                            <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555' }}>{t}</span>
                          ))}
                        </div>
                        <div className="stat-bar-mini">
                          {Object.entries(featuredPokemon.stats).map(([key, val]) => (
                            <div key={key} className="stat-row-mini">
                              <span className="stat-name-mini">{key.slice(0, 5).toUpperCase()}</span>
                              <div className="stat-track">
                                <div className="stat-fill" style={{ width: `${Math.min((val / 255) * 100, 100)}%`, background: typeColors[featuredPokemon.types[0]] || '#6366f1' }} />
                              </div>
                              <span className="stat-num">{val}</span>
                            </div>
                          ))}
                        </div>
                        <div className="featured-card-actions">
                          <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); openModal(featuredPokemon) }}>
                            View History
                          </button>
                          <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setPage('marketplace') }}>
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rare Pokemon Grid */}
                <div className="rare-section">
                  <div className="rare-header">
                    <span className="section-label">Rare Pokémon</span>
                    <div className="rare-header-right">
                      <button className="btn-secondary" style={{ padding: '5px 14px', fontSize: 12 }} onClick={() => setPage('marketplace')}>
                        View All
                      </button>
                    </div>
                  </div>
                  <div className="pokemon-grid">
                    {rarePokemon.map(p => (
                      <PokemonNFTCard
                        key={p.pokemonId}
                        pokemon={p}
                        onClick={openModal}
                        onBuy={handleBuyPokemon}
                        isBuying={buyingPokemonId === p.pokemonId}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="load-more-row">
                <button className="btn-load-more" onClick={() => loadPokemons(offset)} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load More Pokémon'}
                </button>
              </div>
            </div>
          )}

          {/* MARKETPLACE PAGE */}
          {!loading && page === 'marketplace' && (
            <div>
              <div className="page-heading">Pokémon NFT Marketplace</div>
              <div className="marketplace-filters">
                {['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((f, i) => (
                  <button
                    key={f}
                    className="filter-tab"
                    style={i === 0 ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : {}}
                  >
                    {f}
                  </button>
                ))}
                {TYPES.slice(1, 6).map(t => (
                  <button
                    key={t}
                    className="type-chip"
                    onClick={() => setSelectedType(t)}
                    style={selectedType === t ? { background: typeColors[t], borderColor: typeColors[t], color: '#fff' } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="marketplace-grid">
                {filteredPokemons.map(p => (
                  <PokemonNFTCard
                    key={p.pokemonId}
                    pokemon={p}
                    onClick={openModal}
                    onBuy={handleBuyPokemon}
                    isBuying={buyingPokemonId === p.pokemonId}
                  />
                ))}
              </div>
              {!loading && filteredPokemons.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  No Pokémon found. Try a different filter.
                </div>
              )}
              <div className="load-more-row">
                <button className="btn-load-more" onClick={() => loadPokemons(offset)} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            </div>
          )}

          {/* BATTLE PAGE */}
          {!loading && page === 'battle' && (
            <div className="battle-page">
              <div className="page-heading">⚔️ Pokémon Battle Arena</div>

              {battleState.phase === 'select' && (
                <div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Select your Pokémon to battle. Your opponent will be chosen randomly.
                  </p>
                  <div className="battle-select-grid">
                    {filteredPokemons.slice(0, 20).map(p => (
                      <div
                        key={p.pokemonId}
                        className={`battle-select-card ${battleSelectedItem?.name === p.name ? 'selected' : ''}`}
                        onClick={() => setBattleSelectedItem(p)}
                      >
                        <img src={p.officialArtworkUrl} alt={p.displayName} onError={(e) => { e.currentTarget.src = p.imageUrl }} />
                        <div className="battle-select-name">{p.displayName}</div>
                        <div className="type-badges" style={{ justifyContent: 'center' }}>
                          {p.types.slice(0, 2).map(t => (
                            <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555', fontSize: 9 }}>{t}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>HP {p.stats.hp}</div>
                      </div>
                    ))}
                  </div>
                  {battleSelectedItem && (
                    <div className="battle-actions" style={{ marginTop: 20 }}>
                      <button className="btn-battle-start" onClick={startBattle} disabled={battleLoading}>
                        {battleLoading ? 'Preparing battle...' : '⚔️ Start Battle!'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {battleState.phase === 'fighting' && battleState.myPokemon && battleState.opponentPokemon && (
                <div className="battle-arena">
                  <div className="battle-field">
                    {/* Opponent Zone */}
                    <div className="battle-zone opponent">
                      <div className="battle-pokemon-info">
                        <div className="battle-pokemon-name">{battleState.opponentPokemon.displayName}</div>
                        <div className="hp-bar-track">
                          <div className="hp-bar-fill" style={{
                            width: `${(battleState.opponentHP / (battleState.opponentPokemon.stats.hp * 2)) * 100}%`,
                            background: getHpColor((battleState.opponentHP / (battleState.opponentPokemon.stats.hp * 2)) * 100),
                          }} />
                        </div>
                        <div className="hp-label">{battleState.opponentHP} / {battleState.opponentPokemon.stats.hp * 2} HP</div>
                      </div>
                      <img
                        className="battle-pokemon-img"
                        src={battleState.opponentPokemon.officialArtworkUrl}
                        alt={battleState.opponentPokemon.displayName}
                        onError={(e) => { e.currentTarget.src = battleState.opponentPokemon!.imageUrl }}
                      />
                    </div>

                    {/* VS */}
                    <div className="battle-vs">
                      <div className="type-badges">
                        {battleState.opponentPokemon.types.map(t => (
                          <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555', fontSize: 11 }}>{t}</span>
                        ))}
                      </div>
                      <div className="vs-badge">VS</div>
                      <div className="type-badges">
                        {battleState.myPokemon.types.map(t => (
                          <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555', fontSize: 11 }}>{t}</span>
                        ))}
                      </div>
                    </div>

                    {/* Player Zone */}
                    <div className="battle-zone player">
                      <div className="battle-pokemon-info">
                        <div className="battle-pokemon-name">{battleState.myPokemon.displayName}</div>
                        <div className="hp-bar-track">
                          <div className="hp-bar-fill" style={{
                            width: `${(battleState.myHP / (battleState.myPokemon.stats.hp * 2)) * 100}%`,
                            background: getHpColor((battleState.myHP / (battleState.myPokemon.stats.hp * 2)) * 100),
                          }} />
                        </div>
                        <div className="hp-label" style={{ textAlign: 'right' }}>{battleState.myHP} / {battleState.myPokemon.stats.hp * 2} HP</div>
                      </div>
                      <img
                        className="battle-pokemon-img"
                        src={battleState.myPokemon.officialArtworkUrl}
                        alt={battleState.myPokemon.displayName}
                        onError={(e) => { e.currentTarget.src = battleState.myPokemon!.imageUrl }}
                      />
                    </div>
                  </div>

                  {/* Battle Log */}
                  <div className="battle-log">
                    {battleState.log.slice(-6).map((entry, i) => (
                      <div key={i} className={`battle-log-entry ${entry.type}`}>{entry.text}</div>
                    ))}
                  </div>

                  {/* Move Buttons */}
                  <div className="move-buttons">
                    {battleState.myPokemon.moves.length > 0 ? (
                      battleState.myPokemon.moves.map((move, i) => (
                        <button key={i} className="move-btn" onClick={() => executeMove(move)}>
                          <div className="move-btn-name">{move.displayName}</div>
                          <div className="move-btn-meta">
                            <span className="type-badge" style={{ background: typeColors[move.type] || '#555', fontSize: 9, marginRight: 4 }}>{move.type}</span>
                            <span className="move-power">PWR {move.power}</span>
                            <span style={{ color: 'var(--text-muted)' }}> | {move.accuracy}% ACC</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <button className="move-btn" onClick={() => executeMove({ name: 'tackle', displayName: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical' })}>
                        <div className="move-btn-name">Tackle</div>
                        <div className="move-btn-meta">Normal | PWR 40 | 100% ACC</div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {battleState.phase === 'result' && (
                <div className="battle-arena">
                  <div className="battle-result">
                    <div className="battle-result-emoji">{battleState.winner === 'player' ? '🏆' : '💀'}</div>
                    <div className="battle-result-title">
                      {battleState.winner === 'player' ? 'Victory!' : 'Defeated!'}
                    </div>
                    <div className="battle-result-subtitle">
                      {battleState.winner === 'player'
                        ? `${battleState.myPokemon?.displayName} won the battle!`
                        : `${battleState.opponentPokemon?.displayName} was too strong...`}
                    </div>
                    <div className="battle-result-actions">
                      <button className="btn-battle-start" onClick={resetBattle}>Play Again</button>
                      <button className="btn-secondary" onClick={() => { resetBattle(); setPage('home') }}>Back to Home</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COLLECTION PAGE */}
          {!loading && page === 'collection' && (
            <div>
              <div className="collection-header">
                <div className="page-heading">My Collection</div>
                <div className="collection-stats">
                  <div className="collection-stat">
                    <span className="collection-stat-value">{pokemons.length}</span>
                    <span className="collection-stat-label">Available</span>
                  </div>
                  <div className="collection-stat">
                    <span className="collection-stat-value">{pokemons.filter(p => p.rarity >= 4).length}</span>
                    <span className="collection-stat-label">Rare+</span>
                  </div>
                  <div className="collection-stat">
                    <span className="collection-stat-value">{walletAddress ? ownedPokemonIds.size : '0'}</span>
                    <span className="collection-stat-label">Owned NFTs</span>
                  </div>
                </div>
              </div>
              {!walletAddress && (
                <div className="error-banner" style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc', marginBottom: 20 }}>
                  🔗 Connect your wallet to view and manage your Pokémon NFT collection
                  <button className="wallet-btn" style={{ marginLeft: 'auto' }} onClick={connectWallet}>Connect Wallet</button>
                </div>
              )}
              {ownedPokemonIds.size === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  {walletAddress
                    ? "You haven't purchased any Pokémon yet. Head to the Marketplace to buy some!"
                    : 'Connect your wallet to view your collection.'}
                </div>
              ) : (
                <div className="pokemon-grid">
                  {pokemons.filter(p => ownedPokemonIds.has(p.pokemonId)).map(p => (
                    <PokemonNFTCard
                      key={p.pokemonId}
                      pokemon={p}
                      onClick={openModal}
                      showBuy={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {modalItem && (
        <PokemonDetailModal
          item={modalItem}
          fullData={modalFullData}
          onClose={closeModal}
          onBattle={startBattleFromModal}
        />
      )}
    </div>
  )
}
