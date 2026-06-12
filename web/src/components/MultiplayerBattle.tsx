import { useState } from 'react'
import { useMultiplayerBattle } from '../hooks/useMultiplayerBattle'
import { typeColors, PokemonData, PokemonMove, PokemonListItem } from '../utils/pokeapi'

function getHpColor(pct: number) {
  if (pct > 60) return '#22c55e'
  if (pct > 25) return '#f59e0b'
  return '#ef4444'
}

interface Props {
  pokemons: PokemonListItem[]
  ownedPokemonIds: Set<number>
  walletAddress: string | null
  onBack: () => void
}

export default function MultiplayerBattle({ pokemons, ownedPokemonIds, walletAddress, onBack }: Props) {
  const mp = useMultiplayerBattle()
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonListItem | null>(null)
  const [joinRoomInput, setJoinRoomInput] = useState('')
  const [copied, setCopied] = useState(false)

  function handleConnect(pokemon: PokemonListItem) {
    setSelectedPokemon(pokemon)
    mp.connect()
  }

  function handleCreate() {
    if (!selectedPokemon) return
    mp.createRoom(walletAddress || 'Guest', selectedPokemon as unknown as PokemonData)
  }

  function handleJoin() {
    if (!selectedPokemon || !joinRoomInput.trim()) return
    mp.joinRoom(joinRoomInput.trim().toUpperCase(), walletAddress || 'Guest', selectedPokemon as unknown as PokemonData)
  }

  function copyRoomId() {
    if (!mp.roomId) return
    navigator.clipboard.writeText(mp.roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Pokemon selection ──────────────────────────────────────
  if (mp.status === 'idle' || mp.status === 'error') {
    const owned = pokemons.filter(p => ownedPokemonIds.has(p.pokemonId))
    return (
      <div className="battle-page">
        <div className="page-heading" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px', fontSize: 13 }}
          >← Back</button>
          🌐 Multiplayer Battle
        </div>

        {mp.error && (
          <div className="error-banner" style={{ marginBottom: 16 }}>{mp.error}</div>
        )}

        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          Select your Pokémon, then create or join a room to battle a friend in real-time.
        </p>

        {owned.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
            You need to own at least one Pokémon NFT to battle. Buy some from the Marketplace!
          </div>
        )}

        <div className="battle-select-grid">
          {owned.map(p => (
            <div
              key={p.pokemonId}
              className={`battle-select-card ${selectedPokemon?.pokemonId === p.pokemonId ? 'selected' : ''}`}
              onClick={() => setSelectedPokemon(p)}
            >
              <img src={p.officialArtworkUrl} alt={p.displayName} onError={e => { e.currentTarget.src = p.imageUrl }} />
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

        {selectedPokemon && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
            <button
              className="btn-battle-start"
              onClick={() => handleConnect(selectedPokemon)}
              disabled={false}
            >
              {(mp.status as string) === 'connecting' ? 'Connecting...' : '+ Create Room'}
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinRoomInput}
                onChange={e => setJoinRoomInput(e.target.value)}
                placeholder="Enter Room ID"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14,
                  letterSpacing: 2, textTransform: 'uppercase',
                }}
                maxLength={6}
              />
              <button
                className="btn-battle-start"
                style={{ flex: '0 0 auto', padding: '10px 18px' }}
                onClick={() => { handleConnect(selectedPokemon); setTimeout(handleJoin, 400) }}
                disabled={!joinRoomInput.trim()}
              >
                Join
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Connected — show create / join options ─────────────────
  if (mp.status === 'connected') {
    return (
      <div className="battle-page">
        <div className="page-heading">🌐 Multiplayer Battle</div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          Connected! Choose an action below.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
          <button className="btn-battle-start" onClick={handleCreate}>+ Create Room</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinRoomInput}
              onChange={e => setJoinRoomInput(e.target.value)}
              placeholder="Room ID"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14,
                letterSpacing: 2, textTransform: 'uppercase',
              }}
              maxLength={6}
            />
            <button className="btn-battle-start" style={{ flex: '0 0 auto', padding: '10px 18px' }} onClick={handleJoin}>Join</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Waiting for opponent ───────────────────────────────────
  if (mp.status === 'waiting') {
    return (
      <div className="battle-page" style={{ textAlign: 'center' }}>
        <div className="page-heading">🌐 Waiting for Opponent...</div>
        <div style={{ margin: '32px auto', maxWidth: 360 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Share this Room ID with your friend:
          </p>
          <div style={{
            background: 'rgba(99,102,241,0.15)', border: '2px dashed rgba(99,102,241,0.5)',
            borderRadius: 12, padding: '20px 32px', display: 'inline-block',
          }}>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: 8, color: '#a5b4fc' }}>
              {mp.roomId}
            </span>
          </div>
          <br />
          <button
            className="btn-secondary"
            style={{ marginTop: 16 }}
            onClick={copyRoomId}
          >
            {copied ? '✓ Copied!' : 'Copy Room ID'}
          </button>
          <p style={{ color: 'var(--text-muted)', marginTop: 20, fontSize: 13 }}>
            ⏳ Waiting for opponent to join...
          </p>
        </div>
      </div>
    )
  }

  // ── Fighting ──────────────────────────────────────────────
  if ((mp.status === 'fighting' || mp.status === 'result') && mp.me && mp.opponent) {
    const myHpPct = (mp.me.hp / mp.me.maxHp) * 100
    const oppHpPct = (mp.opponent.hp / mp.opponent.maxHp) * 100
    const myMoves: PokemonMove[] = (mp.me.pokemon as any).moves || []

    return (
      <div className="battle-page">
        <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🌐 Multiplayer Battle</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6 }}>
            Room: {mp.roomId}
          </span>
        </div>

        <div className="battle-arena">
          <div className="battle-field">
            {/* Opponent Zone */}
            <div className="battle-zone opponent">
              <div className="battle-pokemon-info">
                <div className="battle-pokemon-name">
                  {mp.opponent.pokemon.displayName}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    ({mp.opponent.walletAddress.slice(0, 8)}...)
                  </span>
                </div>
                <div className="hp-bar-track">
                  <div className="hp-bar-fill" style={{ width: `${oppHpPct}%`, background: getHpColor(oppHpPct) }} />
                </div>
                <div className="hp-label">{mp.opponent.hp} / {mp.opponent.maxHp} HP</div>
              </div>
              <img
                className="battle-pokemon-img"
                src={mp.opponent.pokemon.officialArtworkUrl}
                alt={mp.opponent.pokemon.displayName}
                onError={e => { e.currentTarget.src = mp.opponent!.pokemon.imageUrl }}
              />
            </div>

            {/* VS */}
            <div className="battle-vs">
              <div className="type-badges">
                {mp.opponent.pokemon.types.map(t => (
                  <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555', fontSize: 11 }}>{t}</span>
                ))}
              </div>
              <div className="vs-badge">VS</div>
              <div className="type-badges">
                {mp.me.pokemon.types.map(t => (
                  <span key={t} className="type-badge" style={{ background: typeColors[t] || '#555', fontSize: 11 }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Player Zone */}
            <div className="battle-zone player">
              <div className="battle-pokemon-info">
                <div className="battle-pokemon-name">{mp.me.pokemon.displayName} (You)</div>
                <div className="hp-bar-track">
                  <div className="hp-bar-fill" style={{ width: `${myHpPct}%`, background: getHpColor(myHpPct) }} />
                </div>
                <div className="hp-label" style={{ textAlign: 'right' }}>{mp.me.hp} / {mp.me.maxHp} HP</div>
              </div>
              <img
                className="battle-pokemon-img"
                src={mp.me.pokemon.officialArtworkUrl}
                alt={mp.me.pokemon.displayName}
                onError={e => { e.currentTarget.src = mp.me!.pokemon.imageUrl }}
              />
            </div>
          </div>

          {/* Battle Log */}
          <div className="battle-log">
            {(mp.roomState?.log || []).slice(-6).map((entry, i) => (
              <div key={i} className={`battle-log-entry ${entry.type}`}>{entry.text}</div>
            ))}
          </div>

          {/* Move buttons / result */}
          {mp.status === 'result' ? (
            <div className="battle-result">
              <div className="battle-result-emoji">{mp.iWon ? '🏆' : '💀'}</div>
              <div className="battle-result-title">{mp.iWon ? 'Victory!' : 'Defeated!'}</div>
              <div className="battle-result-subtitle">
                {mp.iWon
                  ? `${mp.me.pokemon.displayName} won the multiplayer battle!`
                  : `${mp.opponent.pokemon.displayName} was too strong...`}
              </div>
              <div className="battle-result-actions">
                <button className="btn-battle-start" onClick={mp.requestRematch}>
                  {mp.rematchWaiting ? '⏳ Waiting for rematch...' : '⚔️ Rematch'}
                </button>
                <button className="btn-secondary" onClick={() => { mp.disconnect(); onBack() }}>Leave</button>
              </div>
            </div>
          ) : mp.isMyTurn ? (
            <div className="move-buttons">
              {myMoves.length > 0 ? myMoves.map((move, i) => (
                <button key={i} className="move-btn" onClick={() => mp.useMove(move)}>
                  <div className="move-btn-name">{move.displayName}</div>
                  <div className="move-btn-meta">
                    <span className="type-badge" style={{ background: typeColors[move.type] || '#555', fontSize: 9, marginRight: 4 }}>{move.type}</span>
                    <span className="move-power">PWR {move.power}</span>
                    <span style={{ color: 'var(--text-muted)' }}> | {move.accuracy}% ACC</span>
                  </div>
                </button>
              )) : (
                <button className="move-btn" onClick={() => mp.useMove({ name: 'tackle', displayName: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical' })}>
                  <div className="move-btn-name">Tackle</div>
                  <div className="move-btn-meta">Normal | PWR 40 | 100% ACC</div>
                </button>
              )}
            </div>
          ) : (
            <div className="move-buttons" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '12px 0' }}>
                ⏳ Waiting for opponent's move...
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // connecting state
  return (
    <div className="battle-page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Connecting to battle server...</div>
    </div>
  )
}
