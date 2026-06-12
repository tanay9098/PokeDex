const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// roomId -> { players: [{ socketId, walletAddress, pokemon, hp, maxHp, moves }], turn, log }
const rooms = new Map();
// socketId -> roomId
const playerRoom = new Map();

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function broadcastRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room:state', {
    roomId,
    players: room.players.map(p => ({
      socketId: p.socketId,
      walletAddress: p.walletAddress,
      pokemon: p.pokemon,
      hp: p.hp,
      maxHp: p.maxHp,
    })),
    turn: room.turn,
    log: room.log,
    phase: room.phase,
    winner: room.winner,
  });
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  // Create a new room and join it
  socket.on('room:create', ({ walletAddress, pokemon }) => {
    const roomId = generateRoomId();
    const player = {
      socketId: socket.id,
      walletAddress: walletAddress || socket.id.slice(0, 8),
      pokemon,
      hp: pokemon.stats.hp * 2,
      maxHp: pokemon.stats.hp * 2,
    };
    rooms.set(roomId, {
      players: [player],
      turn: null,
      log: [],
      phase: 'waiting',
      winner: null,
    });
    playerRoom.set(socket.id, roomId);
    socket.join(roomId);
    socket.emit('room:created', { roomId });
    broadcastRoomState(roomId);
  });

  // Join an existing room
  socket.on('room:join', ({ roomId, walletAddress, pokemon }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room:error', { message: 'Room not found.' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('room:error', { message: 'Room is full.' });
      return;
    }
    const player = {
      socketId: socket.id,
      walletAddress: walletAddress || socket.id.slice(0, 8),
      pokemon,
      hp: pokemon.stats.hp * 2,
      maxHp: pokemon.stats.hp * 2,
    };
    room.players.push(player);
    room.phase = 'fighting';
    room.turn = room.players[0].socketId; // first player goes first
    room.log = [{
      text: `Battle starts! ${room.players[0].pokemon.displayName} vs ${room.players[1].pokemon.displayName}!`,
      type: 'system',
    }];
    playerRoom.set(socket.id, roomId);
    socket.join(roomId);
    broadcastRoomState(roomId);
  });

  // Player uses a move
  socket.on('battle:move', ({ move }) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'fighting') return;
    if (room.turn !== socket.id) {
      socket.emit('room:error', { message: "It's not your turn." });
      return;
    }

    const attackerIdx = room.players.findIndex(p => p.socketId === socket.id);
    const defenderIdx = 1 - attackerIdx;
    const attacker = room.players[attackerIdx];
    const defender = room.players[defenderIdx];

    const damage = calcDamage(move, attacker.pokemon, defender.pokemon);
    defender.hp = Math.max(0, defender.hp - damage);

    const eff = calcEffectiveness(move.type, defender.pokemon.types);
    let effMsg = '';
    if (eff > 1) effMsg = ' Super effective!';
    else if (eff < 1 && eff > 0) effMsg = ' Not very effective...';
    else if (eff === 0) effMsg = ' No effect!';

    room.log.push({
      text: `${attacker.pokemon.displayName} used ${move.displayName}! (${damage} dmg)${effMsg}`,
      type: 'highlight',
    });

    if (defender.hp <= 0) {
      room.phase = 'result';
      room.winner = socket.id;
      room.log.push({ text: `${attacker.pokemon.displayName} wins! 🎉`, type: 'highlight' });
    } else {
      room.turn = defender.socketId;
    }

    broadcastRoomState(roomId);
  });

  // Rematch request
  socket.on('battle:rematch', () => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.rematchVotes) room.rematchVotes = new Set();
    room.rematchVotes.add(socket.id);
    if (room.rematchVotes.size === 2) {
      room.players.forEach(p => {
        p.hp = p.maxHp;
      });
      room.phase = 'fighting';
      room.winner = null;
      room.turn = room.players[0].socketId;
      room.log = [{ text: 'Rematch started!', type: 'system' }];
      room.rematchVotes = new Set();
      broadcastRoomState(roomId);
    } else {
      socket.emit('battle:rematch_waiting', { message: 'Waiting for opponent to accept rematch...' });
    }
  });

  socket.on('disconnect', () => {
    const roomId = playerRoom.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.socketId !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          room.phase = 'result';
          room.winner = room.players[0].socketId;
          room.log.push({ text: 'Opponent disconnected. You win!', type: 'system' });
          broadcastRoomState(roomId);
        }
      }
      playerRoom.delete(socket.id);
    }
    console.log('disconnected:', socket.id);
  });
});

// ── Battle math (mirrors pokeapi.ts) ──────────────────────────
const typeEffectiveness = {
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, fire: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, bug: 0.5, psychic: 0.5, flying: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  ghost: { psychic: 2, ghost: 2, normal: 0, fighting: 0 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  flying: { grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5, electric: 0.5 },
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
};

function calcEffectiveness(attackType, defenderTypes) {
  let m = 1;
  for (const dt of defenderTypes) {
    m *= typeEffectiveness[attackType]?.[dt] ?? 1;
  }
  return m;
}

function calcDamage(move, attacker, defender) {
  const atkStat = move.damageClass === 'special' ? attacker.stats.spAtk : attacker.stats.attack;
  const defStat = move.damageClass === 'special' ? defender.stats.spDef : defender.stats.defense;
  const eff = calcEffectiveness(move.type, defender.types);
  const abilityMod = attacker.abilities?.[0]?.battleModifier ?? 1.0;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
  const base = Math.floor(((2 * 50 / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2);
  return Math.max(1, Math.floor(base * eff * abilityMod * stab));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Battle server running on :${PORT}`));
