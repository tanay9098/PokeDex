import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { PokemonData, PokemonMove } from '../utils/pokeapi'

const SERVER_URL = import.meta.env.VITE_BATTLE_SERVER_URL || 'http://localhost:3001'

export interface MultiplayerPlayer {
  socketId: string
  walletAddress: string
  pokemon: PokemonData
  hp: number
  maxHp: number
}

export interface MultiplayerRoomState {
  roomId: string
  players: MultiplayerPlayer[]
  turn: string | null   // socketId of whose turn it is
  log: { text: string; type: 'normal' | 'highlight' | 'damage' | 'system' }[]
  phase: 'waiting' | 'fighting' | 'result'
  winner: string | null // socketId of winner
}

export type MultiplayerStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'waiting'   // in room, waiting for opponent
  | 'fighting'
  | 'result'
  | 'error'

export function useMultiplayerBattle() {
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<MultiplayerStatus>('idle')
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(null)
  const [mySocketId, setMySocketId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [rematchWaiting, setRematchWaiting] = useState(false)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return
    setStatus('connecting')
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setMySocketId(socket.id ?? null)
      setStatus('connected')
      setError(null)
    })

    socket.on('disconnect', () => {
      setStatus('idle')
      setMySocketId(null)
    })

    socket.on('room:created', ({ roomId }: { roomId: string }) => {
      setRoomId(roomId)
      setStatus('waiting')
    })

    socket.on('room:state', (state: MultiplayerRoomState) => {
      setRoomState(state)
      if (state.phase === 'waiting') setStatus('waiting')
      else if (state.phase === 'fighting') setStatus('fighting')
      else if (state.phase === 'result') setStatus('result')
    })

    socket.on('room:error', ({ message }: { message: string }) => {
      setError(message)
      setStatus('error')
    })

    socket.on('battle:rematch_waiting', () => {
      setRematchWaiting(true)
    })
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
    setStatus('idle')
    setRoomState(null)
    setRoomId(null)
    setMySocketId(null)
    setError(null)
    setRematchWaiting(false)
  }, [])

  const createRoom = useCallback((walletAddress: string, pokemon: PokemonData) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('room:create', { walletAddress, pokemon })
  }, [])

  const joinRoom = useCallback((id: string, walletAddress: string, pokemon: PokemonData) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('room:join', { roomId: id, walletAddress, pokemon })
  }, [])

  const useMove = useCallback((move: PokemonMove) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('battle:move', { move })
  }, [])

  const requestRematch = useCallback(() => {
    if (!socketRef.current?.connected) return
    setRematchWaiting(false)
    socketRef.current.emit('battle:rematch')
  }, [])

  useEffect(() => () => { socketRef.current?.disconnect() }, [])

  const isMyTurn = roomState?.turn === mySocketId
  const me = roomState?.players.find(p => p.socketId === mySocketId)
  const opponent = roomState?.players.find(p => p.socketId !== mySocketId)
  const iWon = roomState?.winner === mySocketId

  return {
    status,
    roomState,
    roomId,
    mySocketId,
    error,
    isMyTurn,
    me,
    opponent,
    iWon,
    rematchWaiting,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    useMove,
    requestRematch,
  }
}
