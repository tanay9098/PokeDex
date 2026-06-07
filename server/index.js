const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// matchmaking queue: [{ socketId, pokemon, hp }]
const queue = [];
// active rooms: { roomId: { p1: { socketId, pokemon, hp }, p2: { ... }, currentTurn: 'p1'|'p2' } }
const rooms = {};

const TYPE_EFFECTIVENESS = {
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, fire: 0.5, rock: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, ground: 0 },
  psychic: { fighting: 2, poison: 2, dark: 0 },
  dragon: { dragon: 2, fairy: 0 },
  ice: { grass: 2, dragon: 2, fire: 0.5 },
};

function getEffectiveness(atkType, defTypes) {
  return defTypes.reduce((mult, dt) => mult * (TYPE_EFFECTIVENESS[atkType]?.[dt] ?? 1), 1);
}

function calcDamage(attacker, defender, move) {
  const atkStat = move.damageClass === 'special' ? attacker.stats.spAtk : attacker.stats.attack;
  const defStat = move.damageClass === 'special' ? defender.stats.spDef : defender.stats.defense;
  const eff = getEffectiveness(move.type, defender.types);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
  const base = Math.floor(((2 * 50 / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2);
  return { damage: Math.max(1, Math.floor(base * eff * (attacker.abilityMod || 1.0) * stab)), effectiveness: eff };
}

function findRoomBySocket(socketId) {
  return Object.entries(rooms).find(([, room]) =>
    room.p1.socketId === socketId || room.p2.socketId === socketId
  );
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join_queue', ({ pokemon }) => {
    // Remove any stale entries for this socket
    const idx = queue.findIndex(e => e.socketId === socket.id);
    if (idx !== -1) queue.splice(idx, 1);

    queue.push({ socketId: socket.id, pokemon, hp: pokemon.stats.hp * 2 });
    socket.emit('queued', { position: queue.length });
    console.log(`Queue size: ${queue.length}`);

    if (queue.length >= 2) {
      const [p1Entry, p2Entry] = queue.splice(0, 2);
      const roomId = `room_${Date.now()}`;

      rooms[roomId] = {
        p1: { socketId: p1Entry.socketId, pokemon: p1Entry.pokemon, hp: p1Entry.hp },
        p2: { socketId: p2Entry.socketId, pokemon: p2Entry.pokemon, hp: p2Entry.hp },
        currentTurn: 'p1',
      };

      socket.join(roomId);
      const p2Socket = io.sockets.sockets.get(p2Entry.socketId);
      if (p2Socket) p2Socket.join(roomId);

      io.to(p1Entry.socketId).emit('battle_start', {
        roomId,
        role: 'p1',
        myPokemon: p1Entry.pokemon,
        myHP: p1Entry.hp,
        opponentPokemon: p2Entry.pokemon,
        opponentHP: p2Entry.hp,
        yourTurn: true,
      });

      io.to(p2Entry.socketId).emit('battle_start', {
        roomId,
        role: 'p2',
        myPokemon: p2Entry.pokemon,
        myHP: p2Entry.hp,
        opponentPokemon: p1Entry.pokemon,
        opponentHP: p1Entry.hp,
        yourTurn: false,
      });

      console.log(`Battle started: ${roomId}`);
    }
  });

  socket.on('execute_move', ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    const isP1 = room.p1.socketId === socket.id;
    const role = isP1 ? 'p1' : 'p2';

    if (room.currentTurn !== role) {
      socket.emit('error_msg', { message: 'Not your turn' });
      return;
    }

    const attacker = isP1 ? room.p1 : room.p2;
    const defender = isP1 ? room.p2 : room.p1;

    const { damage, effectiveness } = calcDamage(attacker.pokemon, defender.pokemon, move);
    defender.hp = Math.max(0, defender.hp - damage);

    const moveResult = {
      attackerRole: role,
      attackerName: attacker.pokemon.displayName,
      defenderName: defender.pokemon.displayName,
      moveName: move.displayName,
      damage,
      effectiveness,
      newDefenderHP: defender.hp,
      maxDefenderHP: defender.pokemon.stats.hp * 2,
    };

    if (defender.hp <= 0) {
      io.to(roomId).emit('move_result', moveResult);
      io.to(attacker.socketId).emit('battle_end', { winner: 'you', winnerName: attacker.pokemon.displayName });
      io.to(defender.socketId).emit('battle_end', { winner: 'opponent', winnerName: attacker.pokemon.displayName });
      delete rooms[roomId];
      return;
    }

    room.currentTurn = isP1 ? 'p2' : 'p1';
    const nextTurnSocketId = isP1 ? room.p2.socketId : room.p1.socketId;

    io.to(roomId).emit('move_result', moveResult);
    io.to(nextTurnSocketId).emit('your_turn');
  });

  socket.on('leave_queue', () => {
    const idx = queue.findIndex(e => e.socketId === socket.id);
    if (idx !== -1) queue.splice(idx, 1);
  });

  socket.on('disconnect', () => {
    // Remove from queue
    const idx = queue.findIndex(e => e.socketId === socket.id);
    if (idx !== -1) queue.splice(idx, 1);

    // Notify opponent if in a room
    const roomEntry = findRoomBySocket(socket.id);
    if (roomEntry) {
      const [roomId, room] = roomEntry;
      const opponentSocketId = room.p1.socketId === socket.id ? room.p2.socketId : room.p1.socketId;
      io.to(opponentSocketId).emit('opponent_disconnected');
      delete rooms[roomId];
    }

    console.log('Player disconnected:', socket.id);
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', queue: queue.length, rooms: Object.keys(rooms).length }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Battle server running on port ${PORT}`));
