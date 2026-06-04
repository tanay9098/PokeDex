import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator, FlatList, Image, Pressable,
  ScrollView, StyleSheet, Text, View,
} from "react-native";

interface PokemonItem {
  pokemonId: number;
  name: string;
  displayName: string;
  types: string[];
  officialArtworkUrl: string;
  imageUrl: string;
  stats: { hp: number; attack: number; defense: number; spAtk: number; spDef: number; speed: number };
  rarity: number;
}

interface BattleMove {
  name: string;
  displayName: string;
  power: number;
  accuracy: number;
  type: string;
  damageClass: 'physical' | 'special' | 'status';
}

interface BattlePokemon extends PokemonItem {
  moves: BattleMove[];
  abilityMod: number;
}

type BattlePhase = 'select' | 'fighting' | 'result';

const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a29e', fire: '#ef4444', water: '#3b82f6', grass: '#22c55e',
  electric: '#eab308', ice: '#67e8f9', fighting: '#dc2626', poison: '#a855f7',
  ground: '#d97706', flying: '#818cf8', psychic: '#ec4899', bug: '#84cc16',
  rock: '#92400e', ghost: '#7c3aed', dragon: '#4f46e5', dark: '#374151',
  steel: '#94a3b8', fairy: '#f472b6',
};

function calcRarity(total: number, exp: number) {
  const s = total + (exp || 0);
  if (s > 700) return 5; if (s > 560) return 4; if (s > 440) return 3; if (s > 320) return 2; return 1;
}

function getHpColor(pct: number) {
  if (pct > 60) return '#22c55e';
  if (pct > 25) return '#f59e0b';
  return '#ef4444';
}

const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, fire: 0.5, rock: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, ground: 0 },
  psychic: { fighting: 2, poison: 2, dark: 0 },
  dragon: { dragon: 2, fairy: 0 },
  ice: { grass: 2, dragon: 2, fire: 0.5 },
};

function getEffectiveness(atkType: string, defTypes: string[]) {
  return defTypes.reduce((mult, dt) => mult * (TYPE_EFFECTIVENESS[atkType]?.[dt] ?? 1), 1);
}

function calcDamage(attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove) {
  const atkStat = move.damageClass === 'special' ? attacker.stats.spAtk : attacker.stats.attack;
  const defStat = move.damageClass === 'special' ? defender.stats.spDef : defender.stats.defense;
  const eff = getEffectiveness(move.type, defender.types);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
  const base = Math.floor(((2 * 50 / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2);
  return { damage: Math.max(1, Math.floor(base * eff * attacker.abilityMod * stab)), effectiveness: eff };
}

async function loadPokemonList(limit = 20): Promise<PokemonItem[]> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=0`);
  const data = await res.json();
  const results = await Promise.allSettled(
    data.results.map(async (p: { url: string }) => {
      const d = await (await fetch(p.url)).json();
      const sm: Record<string, number> = {};
      d.stats.forEach((s: any) => { sm[s.stat.name] = s.base_stat; });
      const stats = { hp: sm.hp || 0, attack: sm.attack || 0, defense: sm.defense || 0, spAtk: sm['special-attack'] || 0, spDef: sm['special-defense'] || 0, speed: sm.speed || 0 };
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      return { pokemonId: d.id, name: d.name, displayName: d.name.replace(/-/g, ' '), types: d.types.map((t: any) => t.type.name), officialArtworkUrl: d.sprites.other?.['official-artwork']?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/${d.id}.png`, imageUrl: d.sprites.front_default, stats, rarity: calcRarity(total, d.base_experience) };
    })
  );
  return results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<PokemonItem>).value);
}

async function loadBattleData(name: string): Promise<BattlePokemon & { base: PokemonItem }> {
  const d = await (await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)).json();
  const sm: Record<string, number> = {};
  d.stats.forEach((s: any) => { sm[s.stat.name] = s.base_stat; });
  const stats = { hp: sm.hp || 0, attack: sm.attack || 0, defense: sm.defense || 0, spAtk: sm['special-attack'] || 0, spDef: sm['special-defense'] || 0, speed: sm.speed || 0 };
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const base = { pokemonId: d.id, name: d.name, displayName: d.name.replace(/-/g, ' '), types: d.types.map((t: any) => t.type.name), officialArtworkUrl: d.sprites.other?.['official-artwork']?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/pokemon/other/official-artwork/${d.id}.png`, imageUrl: d.sprites.front_default, stats, rarity: calcRarity(total, d.base_experience) };

  // Fetch moves
  const moves: BattleMove[] = [];
  const urls = d.moves.slice(-12).map((m: any) => m.move.url);
  for (const url of urls) {
    if (moves.length >= 4) break;
    try {
      const mv = await (await fetch(url)).json();
      if (mv.power && mv.damage_class.name !== 'status') {
        moves.push({ name: mv.name, displayName: mv.name.replace(/-/g, ' '), power: mv.power, accuracy: mv.accuracy ?? 100, type: mv.type.name, damageClass: mv.damage_class.name });
      }
    } catch {}
  }
  if (moves.length === 0) moves.push({ name: 'tackle', displayName: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical' });

  // Ability modifier
  let abilityMod = 1.0;
  try {
    const ab = await (await fetch(d.abilities[0].ability.url)).json();
    const effect = ab.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect || '';
    const lower = effect.toLowerCase();
    if (lower.includes('doubles') && lower.includes('attack')) abilityMod = 1.4;
    else if ((lower.includes('raises') || lower.includes('boost')) && lower.includes('attack')) abilityMod = 1.3;
    else if (lower.includes('immune')) abilityMod = 1.2;
    else if (lower.includes('critical')) abilityMod = 1.15;
  } catch {}

  return { ...base, moves, abilityMod };
}

export default function BattleScreen() {
  const [pokemonList, setPokemonList] = useState<PokemonItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PokemonItem | null>(null);
  const [phase, setPhase] = useState<BattlePhase>('select');
  const [battleLoading, setBattleLoading] = useState(false);
  const [myPokemon, setMyPokemon] = useState<BattlePokemon | null>(null);
  const [oppPokemon, setOppPokemon] = useState<BattlePokemon | null>(null);
  const [myHP, setMyHP] = useState(0);
  const [oppHP, setOppHP] = useState(0);
  const [log, setLog] = useState<{ text: string; color: string }[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  useEffect(() => {
    loadPokemonList(20).then(list => { setPokemonList(list); setListLoading(false); }).catch(() => setListLoading(false));
  }, []);

  async function startBattle() {
    if (!selectedItem) return;
    setBattleLoading(true);
    try {
      const me = await loadBattleData(selectedItem.name);
      const oppItem = pokemonList.filter(p => p.name !== selectedItem.name)[Math.floor(Math.random() * (pokemonList.length - 1))];
      const opp = await loadBattleData(oppItem.name);
      setMyPokemon(me);
      setOppPokemon(opp);
      setMyHP(me.stats.hp * 2);
      setOppHP(opp.stats.hp * 2);
      setLog([{ text: `Battle: ${me.displayName} vs ${opp.displayName}!`, color: '#94a3b8' }]);
      setWinner(null);
      setPhase('fighting');
    } finally {
      setBattleLoading(false);
    }
  }

  const executeMove = useCallback((move: BattleMove) => {
    if (!myPokemon || !oppPokemon) return;
    const { damage: myDmg, effectiveness } = calcDamage(myPokemon, oppPokemon, move);
    const newOppHP = Math.max(0, oppHP - myDmg);
    const entries: { text: string; color: string }[] = [
      { text: `${myPokemon.displayName} used ${move.displayName}! (${myDmg} dmg)`, color: '#a5b4fc' },
    ];
    if (effectiveness > 1) entries.push({ text: "Super effective!", color: '#fbbf24' });
    if (effectiveness < 1 && effectiveness > 0) entries.push({ text: "Not very effective...", color: '#94a3b8' });

    if (newOppHP <= 0) {
      setOppHP(0);
      setLog(prev => [...prev, ...entries, { text: `${myPokemon.displayName} wins! 🎉`, color: '#22c55e' }]);
      setWinner('player');
      setPhase('result');
      return;
    }

    // Opponent turn
    const oppMove = oppPokemon.moves[Math.floor(Math.random() * oppPokemon.moves.length)];
    const { damage: oppDmg } = calcDamage(oppPokemon, myPokemon, oppMove);
    const newMyHP = Math.max(0, myHP - oppDmg);
    const oppEntries = [
      { text: `${oppPokemon.displayName} used ${oppMove.displayName}! (${oppDmg} dmg)`, color: '#fca5a5' },
    ];

    setOppHP(newOppHP);
    setMyHP(newMyHP);
    setLog(prev => [...prev, ...entries, ...oppEntries]);

    if (newMyHP <= 0) {
      setWinner('opponent');
      setPhase('result');
    }
  }, [myPokemon, oppPokemon, myHP, oppHP]);

  function reset() {
    setPhase('select');
    setSelectedItem(null);
    setMyPokemon(null);
    setOppPokemon(null);
    setLog([]);
    setWinner(null);
  }

  if (listLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#6366f1" /></View>;

  if (phase === 'select') {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Select your Pokémon to battle</Text>
        <FlatList
          data={pokemonList}
          keyExtractor={item => String(item.pokemonId)}
          numColumns={3}
          contentContainerStyle={styles.selectGrid}
          columnWrapperStyle={styles.selectRow}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.selectCard, selectedItem?.name === item.name && styles.selectCardActive]}
              onPress={() => setSelectedItem(item)}
            >
              <Image source={{ uri: item.officialArtworkUrl }} style={styles.selectImg} resizeMode="contain" />
              <Text style={styles.selectName}>{item.displayName}</Text>
              <View style={styles.typesRow}>
                {item.types.slice(0, 1).map(t => (
                  <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] || '#555' }]}>
                    <Text style={styles.typeText}>{t}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.hpText}>HP {item.stats.hp}</Text>
            </Pressable>
          )}
          ListFooterComponent={
            selectedItem ? (
              <Pressable style={styles.startBtn} onPress={startBattle} disabled={battleLoading}>
                <Text style={styles.startBtnText}>{battleLoading ? 'Preparing...' : '⚔️ Start Battle!'}</Text>
              </Pressable>
            ) : null
          }
        />
      </View>
    );
  }

  if (phase === 'fighting' && myPokemon && oppPokemon) {
    const myHpPct = (myHP / (myPokemon.stats.hp * 2)) * 100;
    const oppHpPct = (oppHP / (oppPokemon.stats.hp * 2)) * 100;

    return (
      <View style={styles.container}>
        {/* Opponent zone */}
        <View style={[styles.battleZone, styles.oppZone]}>
          <View style={styles.battleInfo}>
            <Text style={styles.battleName}>{oppPokemon.displayName}</Text>
            <View style={styles.hpTrack}>
              <View style={[styles.hpFill, { width: `${oppHpPct}%` as any, backgroundColor: getHpColor(oppHpPct) }]} />
            </View>
            <Text style={styles.hpLabel}>{oppHP} / {oppPokemon.stats.hp * 2} HP</Text>
          </View>
          <Image source={{ uri: oppPokemon.officialArtworkUrl }} style={styles.battleImg} resizeMode="contain" />
        </View>

        {/* VS divider */}
        <View style={styles.vsDivider}>
          <View style={styles.typesRow}>
            {oppPokemon.types.map(t => <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] || '#555' }]}><Text style={styles.typeText}>{t}</Text></View>)}
          </View>
          <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>
          <View style={styles.typesRow}>
            {myPokemon.types.map(t => <View key={t} style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t] || '#555' }]}><Text style={styles.typeText}>{t}</Text></View>)}
          </View>
        </View>

        {/* Player zone */}
        <View style={[styles.battleZone, styles.myZone]}>
          <Image source={{ uri: myPokemon.officialArtworkUrl }} style={[styles.battleImg, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />
          <View style={[styles.battleInfo, { alignItems: 'flex-end' }]}>
            <Text style={[styles.battleName, { color: '#a5b4fc' }]}>{myPokemon.displayName}</Text>
            <View style={styles.hpTrack}>
              <View style={[styles.hpFill, { width: `${myHpPct}%` as any, backgroundColor: getHpColor(myHpPct) }]} />
            </View>
            <Text style={[styles.hpLabel, { textAlign: 'right' }]}>{myHP} / {myPokemon.stats.hp * 2} HP</Text>
          </View>
        </View>

        {/* Battle log */}
        <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent} ref={r => r?.scrollToEnd({ animated: true })}>
          {log.slice(-5).map((e, i) => <Text key={i} style={[styles.logEntry, { color: e.color }]}>{e.text}</Text>)}
        </ScrollView>

        {/* Moves */}
        <View style={styles.movesGrid}>
          {myPokemon.moves.map((move, i) => (
            <Pressable key={i} style={styles.moveBtn} onPress={() => executeMove(move)}>
              <Text style={styles.moveName}>{move.displayName}</Text>
              <View style={styles.typesRow}>
                <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[move.type] || '#555' }]}>
                  <Text style={styles.typeText}>{move.type}</Text>
                </View>
                <Text style={styles.movePower}>PWR {move.power}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.resultEmoji}>{winner === 'player' ? '🏆' : '💀'}</Text>
        <Text style={styles.resultTitle}>{winner === 'player' ? 'Victory!' : 'Defeated!'}</Text>
        <Text style={styles.resultSub}>
          {winner === 'player' ? `${myPokemon?.displayName} won!` : `${oppPokemon?.displayName} was too strong...`}
        </Text>
        <Pressable style={styles.startBtn} onPress={reset}>
          <Text style={styles.startBtnText}>Play Again</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080b14' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  hint: { textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 16, paddingBottom: 8 },

  // Select
  selectGrid: { padding: 12, gap: 10 },
  selectRow: { gap: 10 },
  selectCard: { flex: 1, backgroundColor: '#111827', borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)' },
  selectCardActive: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)' },
  selectImg: { width: 70, height: 70 },
  selectName: { fontSize: 11, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize', textAlign: 'center', marginTop: 4 },
  hpText: { fontSize: 10, color: '#475569', marginTop: 2 },
  startBtn: { margin: 16, backgroundColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // Battle
  battleZone: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  oppZone: { backgroundColor: 'rgba(239,68,68,0.07)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  myZone: { backgroundColor: 'rgba(99,102,241,0.07)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  battleInfo: { flex: 1 },
  battleName: { fontSize: 18, fontWeight: '800', textTransform: 'capitalize', color: '#fca5a5', marginBottom: 6 },
  hpTrack: { width: '100%', height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  hpFill: { height: '100%', borderRadius: 5 },
  hpLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  battleImg: { width: 110, height: 110 },
  vsDivider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  vsBadge: { backgroundColor: '#1a1a2e', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  vsText: { color: '#475569', fontSize: 14, fontWeight: '900' },
  logScroll: { maxHeight: 100, backgroundColor: '#0d1117', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  logContent: { padding: 12, gap: 3 },
  logEntry: { fontSize: 12 },
  movesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: '#0d1117', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  moveBtn: { width: '47%', backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 },
  moveName: { fontSize: 13, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize', marginBottom: 4 },
  movePower: { fontSize: 10, color: '#fbbf24', fontWeight: '600', marginLeft: 4 },
  typesRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  typeText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },

  // Result
  resultEmoji: { fontSize: 72 },
  resultTitle: { fontSize: 36, fontWeight: '900', color: '#f1f5f9' },
  resultSub: { fontSize: 16, color: '#94a3b8' },
});
