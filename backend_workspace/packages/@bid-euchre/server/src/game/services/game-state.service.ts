import { Injectable } from '@nestjs/common';
import { GameService } from './game.service';
import { Room, GameState, Player, Card, Bid, PlayedCard } from '../types';

/**
 * Service for managing game state across multiple rooms
 */
@Injectable()
export class GameStateService {
  private rooms: Map<string, Room> = new Map();

  constructor(private readonly gameService: GameService) {}

  /**
   * Creates a new game room
   */
  createRoom(roomId: string, host: Player): Room {
    const room: Room = {
      id: roomId,
      host: host.id,
      gameState: this.createInitialGameState([host]),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Gets a room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Gets all rooms
   */
  getAllRooms(): Map<string, Room> {
    return this.rooms;
  }

  /**
   * Adds a player to a room
   */
  addPlayerToRoom(roomId: string, player: Player): GameState | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    room.gameState.players.push(player);
    return room.gameState;
  }

  /**
   * Removes a player from a room
   */
  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.gameState.players = room.gameState.players.filter(p => p.id !== playerId);
    
    // If room is empty, delete it
    if (room.gameState.players.length === 0) {
      this.rooms.delete(roomId);
    }
  }

  /**
   * Starts the game when 4 players are present
   */
  startGame(roomId: string): GameState | undefined {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState.players.length !== 4) return undefined;

    const deck = this.gameService.shuffleDeck(this.gameService.createDeck());
    const playerIds = room.gameState.players.map(p => p.id);
    
    room.gameState.hands = this.gameService.dealCards(deck, playerIds);
    room.gameState.gameStarted = true;
    room.gameState.isBidding = true;
    room.gameState.currentTurnId = playerIds[(room.gameState.dealerIndex + 1) % 4]; // Player after dealer starts bidding
    room.gameState.bids = [null, null, null, null];
    room.gameState.tricksWon = {}; // Reset tricks won for new hand
    room.gameState.trick = []; // Clear any previous trick

    return room.gameState;
  }

  /**
   * Submits a bid for a player
   */
  submitBid(roomId: string, playerId: string, bid: Bid): GameState | undefined {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState.isBidding) return undefined;

    const playerIndex = room.gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return undefined;

    room.gameState.bids[playerIndex] = bid;

    // Check if bidding is complete
    const nonNullBids = room.gameState.bids.filter(b => b !== null && b.amount !== 0);
    const allPassed = room.gameState.bids.every(b => b === null || b.amount === 0);
    const allBid = room.gameState.bids.every(b => b !== null);

    if (allPassed && allBid) {
      // Everyone passed - redeal
      return this.startGame(roomId);
    }

    if (allBid) {
      // Find winning bid
      const winningBid = nonNullBids.reduce((highest, current) => {
        if (!current || !highest) return current || highest;
        const currentAmount = current.amount === 'moon' ? 7 : current.amount;
        const highestAmount = highest.amount === 'moon' ? 7 : highest.amount;
        return currentAmount > highestAmount ? current : highest;
      });

      if (!winningBid) return undefined;

      room.gameState.winningBid = winningBid;
      room.gameState.isBidding = false;
      
      // Set first player for trick play
      const winnerIndex = room.gameState.players.findIndex(p => p.id === winningBid.id);
      const firstPlayer = (winnerIndex + 1) % 4;
      room.gameState.currentTurnId = room.gameState.players[firstPlayer].id;
      
      return room.gameState;
    }

    // Move to next player
    const nextPlayerIndex = (playerIndex + 1) % 4;
    room.gameState.currentTurnId = room.gameState.players[nextPlayerIndex].id;

    return room.gameState;
  }

  /**
   * Plays a card from a player's hand
   */
  playCard(roomId: string, playerId: string, card: PlayedCard): GameState | undefined {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState.isBidding) return undefined;

    // Remove card from player's hand
    const hand = room.gameState.hands[playerId];
    const cardIndex = hand.findIndex(c => c.suit === card.suit && c.value === card.value);
    if (cardIndex === -1) return undefined;

    hand.splice(cardIndex, 1);
    
    // If this is the first card being played and there's a completed trick, clear it
    if (room.gameState.trick.length === 4) {
      room.gameState.trick = [];
    }
    
    room.gameState.trick.push(card);

    // Check if trick is complete
    if (room.gameState.trick.length === 4) {
      const winnerId = this.gameService.evaluateTrick(
        room.gameState.trick,
        room.gameState.winningBid?.trump || 'high'
      );

      room.gameState.tricksWon[winnerId] = (room.gameState.tricksWon[winnerId] || 0) + 1;
      // Don't clear trick here - let it be cleared when next card is played
      room.gameState.currentTurnId = winnerId;

      // Check if hand is complete (all 6 tricks played)
      const totalTricks = Object.values(room.gameState.tricksWon).reduce((a, b) => a + b, 0);
      if (totalTricks === 6) {
        // Calculate scores
        const playerTeams = this.gameService.getPlayerTeams(room.gameState.players.map(p => p.id));
        const handScores = this.gameService.calculateHandScore(
          room.gameState.winningBid!,
          room.gameState.tricksWon,
          playerTeams
        );

        room.gameState.teamScores.team1 += handScores.team1;
        room.gameState.teamScores.team2 += handScores.team2;

        // Start new hand (this will reset tricksWon)
        room.gameState.dealerIndex = (room.gameState.dealerIndex + 1) % 4;
        return this.startGame(roomId);
      }
    } else {
      // Move to next player
      const currentIndex = room.gameState.players.findIndex(p => p.id === playerId);
      const nextIndex = (currentIndex + 1) % 4;
      room.gameState.currentTurnId = room.gameState.players[nextIndex].id;
    }

    return room.gameState;
  }

  /**
   * Gets valid moves for a player
   */
  getValidMoves(roomId: string, playerId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const hand = room.gameState.hands[playerId] || [];
    const trump = room.gameState.winningBid?.trump || 'high';
    const validCards = this.gameService.getValidMoves(hand, room.gameState.trick, trump);
    
    return validCards.map(c => `${c.value}${c.suit.charAt(0).toUpperCase()}`);
  }

  /**
   * Creates initial game state
   */
  private createInitialGameState(players: Player[]): GameState {
    return {
      players,
      dealerIndex: 0,
      currentTurnId: null,
      hands: {},
      trick: [],
      tricksWon: {},
      bids: [null, null, null, null],
      winningBid: null,
      isBidding: false,
      gameStarted: false,
      teamScores: {
        team1: 0,
        team2: 0,
      },
    };
  }
}
