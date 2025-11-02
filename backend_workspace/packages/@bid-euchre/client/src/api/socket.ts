/**
 * WebSocket client for the Bid Euchre game.
 * Handles all real-time communication with the server including:
 * - Room management (hosting, joining)
 * - Game state updates
 * - Player actions (bidding, playing cards)
 * - Turn management
 * - Score updates
 * 
 * Uses Socket.IO for WebSocket communication and integrates with Redux
 * for state management.
 */

import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import {
  setPlayers,
  setCurrentTurn,
  setHand,
  updateTrick,
  updateTricksWon,
  updateTeamScores,
  updateBids,
  setWinningBid,
  setIsBidding,
  setPlayableCards,
} from '../features/game/gameSlice';
import type { TrumpType, BidAmount } from '../features/game';

/**
 * Type definition for all events sent from server to client
 */
interface ServerToClientEvents {
  /** Updates list of players in the room */
  'player-list': (players: { id: string; name: string }[]) => void;
  /** Notifies about room events (joins, leaves, etc.) */
  'room-update': (data: { message: string; room: string }) => void;
  /** Receives dealt cards at start of hand */
  'deal-hand': (data: { cards: string[]; playerId: string }) => void;
  /** Updates player's hand after playing a card */
  'hand-updated': (data: { cards: string[]; playerId: string }) => void;
  /** Notifies start of bidding round */
  'bidding-started': (data: { dealer: { id: string; name: string }; bids: any[] }) => void;
  /** Updates current bids from all players */
  'bids-updated': (bids: any[]) => void;
  /** Notifies when bidding is complete */
  'bidding-complete': (data: { winner: { name: string; amount: BidAmount; trump: TrumpType } }) => void;
  /** Updates cards played in current trick */
  'trick-updated': (data: { trick: { id: string; card: string }[] }) => void;
  /** Notifies when trick is complete */
  'trick-complete': (data: { winnerId: string }) => void;
  /** Notifies player it's their turn */
  'your-turn-to-play': () => void;
  /** Updates team scores */
  'score-update': (scores: { team1: number; team2: number }) => void;
  /** Updates whose turn it is */
  'current-turn': (playerId: string | { playerId: string; validMoves: string[] }) => void;
  /** Notifies successful reconnection */
  'reconnected': (data: { message: string; gameState: any }) => void;
}

/**
 * Type definition for all events sent from client to server
 */
interface ClientToServerEvents {
  /** Create a new game room */
  'host': (data: { name: string; room: string }) => void;
  /** Join an existing game room */
  'join': (data: { name: string; room: string }) => void;
  /** Reconnect to existing game */
  'reconnect-player': (data: { name: string; room: string }) => void;
  /** Request current player list */
  'get-player-list': (room: string) => void;
  /** Submit a bid during bidding phase */
  'submit-bid': (data: { room: string; amount: BidAmount; trump: TrumpType }) => void;
  /** Play a card from hand */
  'play-card': (data: { room: string; card: string }, callback?: (response: { success: boolean }) => void) => void;
  /** Add a bot player to the room */
  'add-bot': (data: { room: string }) => void;
}

/**
 * Main socket client class for game communication.
 * Handles:
 * - Socket connection management
 * - Event listeners and handlers
 * - Room state tracking
 * - Integration with Redux store
 */
class GameSocket {
  /** Socket.IO client instance */
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  /** Current room ID */
  private room: string | null = null;

  constructor() {
    this.socket = io('http://localhost:3001', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupListeners();
    this.setupConnectionListeners();
    this.loadPersistedState();
  }

  /**
   * Load persisted player state from localStorage
   */
  private loadPersistedState() {
    const savedName = localStorage.getItem('bid-euchre-player-name');
    const savedRoom = localStorage.getItem('bid-euchre-room');
    
    if (savedName && savedRoom) {
      this.room = savedRoom;
    }
  }

  /**
   * Save player state to localStorage
   */
  private saveState(name: string, room: string) {
    localStorage.setItem('bid-euchre-player-name', name);
    localStorage.setItem('bid-euchre-room', room);
  }

  /**
   * Clear persisted state
   */
  public clearPersistedState() {
    localStorage.removeItem('bid-euchre-player-name');
    localStorage.removeItem('bid-euchre-room');
  }

  /**
   * Setup connection event listeners for reconnection handling
   */
  private setupConnectionListeners() {
    this.socket.io.on('reconnect', (attemptNumber: number) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
    });

    this.socket.io.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('Reconnection attempt:', attemptNumber);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('Reconnection failed after all attempts');
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      
      // If we have a saved room, attempt to reconnect
      const savedName = localStorage.getItem('bid-euchre-player-name');
      const savedRoom = localStorage.getItem('bid-euchre-room');
      
      if (savedName && savedRoom && this.room) {
        console.log('Reconnecting to game:', { name: savedName, room: savedRoom });
        this.socket.emit('reconnect-player', { 
          name: savedName, 
          room: savedRoom 
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      
      // If server initiated disconnect, don't try to reconnect
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.io.on('error', (error: Error) => {
      console.error('Connection error:', error);
    });

    this.socket.on('reconnected', (data) => {
      console.log('Successfully reconnected to game:', data);
    });
  }

  private setupListeners() {
    this.socket.on('player-list', (players) => {
      store.dispatch(setPlayers(players));
    });

    this.socket.on('deal-hand', (data: any) => {
      // Backend sends { cards: string[], playerId: string }
      const cards = data.cards || data;
      store.dispatch(setHand(Array.isArray(cards) ? cards : []));
    });

    this.socket.on('hand-updated', (data: any) => {
      // Backend sends { cards: string[], playerId: string }
      const cards = data.cards || data;
      store.dispatch(setHand(Array.isArray(cards) ? cards : []));
    });

    this.socket.on('trick-updated', (data: any) => {
      // Backend sends { trick: [...] }
      const trickCards = data.trick || data;
      store.dispatch(updateTrick(Array.isArray(trickCards) ? trickCards : []));
    });

    this.socket.on('trick-complete', ({ winnerId }) => {
      const currentTricks = store.getState().game.tricksWon;
      store.dispatch(updateTricksWon({
        ...currentTricks,
        [winnerId]: (currentTricks[winnerId] || 0) + 1,
      }));
    });

    this.socket.on('score-update', (scores) => {
      store.dispatch(updateTeamScores(scores));
    });

    this.socket.on('bidding-started', ({ dealer, bids }) => {
      store.dispatch(setIsBidding(true));
      store.dispatch(updateBids(bids));
      // Reset tricks won for new hand
      store.dispatch(updateTricksWon({}));
      // Clear the trick display
      store.dispatch(updateTrick([]));
    });

    this.socket.on('bids-updated', (bids) => {
      store.dispatch(updateBids(bids));
    });

    this.socket.on('bidding-complete', ({ winner }) => {
      store.dispatch(setIsBidding(false));
      store.dispatch(setWinningBid(winner));
    });

    this.socket.on('current-turn', (data: string | { playerId: string; validMoves: string[] }) => {
      // Backend sends { playerId: string, validMoves: string[] }
      const playerId = typeof data === 'string' ? data : data.playerId;
      store.dispatch(setCurrentTurn(playerId));
      if (typeof data === 'object' && data.validMoves) {
        store.dispatch(setPlayableCards(data.validMoves));
      }
    });
  }

  public getId(): string {
    return this.socket.id || '';
  }

  public getRoom(): string | null {
    return this.room;
  }

  public connect() {
    this.socket.connect();
  }

  public disconnect() {
    this.socket.disconnect();
  }

  public hostGame(name: string, room: string) {
    this.room = room;
    this.saveState(name, room);
    this.socket.emit('host', { name, room });
  }

  public joinGame(name: string, room: string) {
    this.room = room;
    this.saveState(name, room);
    this.socket.emit('join', { name, room });
  }

  public submitBid(amount: BidAmount, trump: TrumpType) {
    if (this.room) {
      this.socket.emit('submit-bid', { room: this.room, amount, trump });
    }
  }

  public playCard(card: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.room) {
        resolve(false);
        return;
      }

      this.socket.emit('play-card', { room: this.room, card }, (response) => {
        resolve(response.success);
      });
    });
  }

  public addBot() {
    if (this.room) {
      this.socket.emit('add-bot', { room: this.room });
    }
  }

  /**
   * Get current connection status
   */
  public isConnected(): boolean {
    return this.socket.connected;
  }

  /**
   * Get saved player name
   */
  public getSavedName(): string | null {
    return localStorage.getItem('bid-euchre-player-name');
  }

  /**
   * Get saved room
   */
  public getSavedRoom(): string | null {
    return localStorage.getItem('bid-euchre-room');
  }
}

export const gameSocket = new GameSocket();