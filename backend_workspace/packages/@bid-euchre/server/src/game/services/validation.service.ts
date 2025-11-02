import { Injectable } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { GameService } from './game.service';
import { Trump, BidAmount, Card } from '../types';

export interface ValidationError {
  valid: false;
  error: string;
}

export interface ValidationSuccess {
  valid: true;
}

export type ValidationResult = ValidationError | ValidationSuccess;

@Injectable()
export class ValidationService {
  constructor(
    private readonly gameStateService: GameStateService,
    private readonly gameService: GameService,
  ) {}

  /**
   * Validate that a room exists
   */
  validateRoomExists(roomId: string): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      return { valid: false, error: `Room ${roomId} does not exist` };
    }
    return { valid: true };
  }

  /**
   * Validate that a player is in a room
   */
  validatePlayerInRoom(roomId: string, playerId: string): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      return { valid: false, error: `Room ${roomId} does not exist` };
    }

    const player = room.gameState.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: `Player ${playerId} is not in room ${roomId}` };
    }

    return { valid: true };
  }

  /**
   * Validate that it's the player's turn to bid
   */
  validateBidTurn(roomId: string, playerId: string): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      return { valid: false, error: `Room ${roomId} does not exist` };
    }

    if (!room.gameState.isBidding) {
      return { valid: false, error: 'Bidding is not active' };
    }

    if (room.gameState.currentTurnId !== playerId) {
      return {
        valid: false,
        error: `It is not ${playerId}'s turn to bid. Current turn: ${room.gameState.currentTurnId}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate a bid amount and trump
   */
  validateBid(amount: BidAmount, trump: Trump): ValidationResult {
    // Validate amount
    const validAmounts: BidAmount[] = [0, 3, 4, 5, 6, 'moon'];
    if (!validAmounts.includes(amount)) {
      return {
        valid: false,
        error: `Invalid bid amount: ${amount}. Valid amounts are: ${validAmounts.join(', ')}`,
      };
    }

    // Validate trump
    const validTrumps: Trump[] = ['high', 'low', 'hearts', 'diamonds', 'clubs', 'spades'];
    if (!validTrumps.includes(trump)) {
      return {
        valid: false,
        error: `Invalid trump: ${trump}. Valid trumps are: ${validTrumps.join(', ')}`,
      };
    }

    // If pass (amount 0), trump doesn't matter but should be valid anyway
    if (amount === 0) {
      return { valid: true };
    }

    // Trump is required for actual bids
    if (!trump) {
      return { valid: false, error: 'Trump is required for non-zero bids' };
    }

    return { valid: true };
  }

  /**
   * Validate that it's the player's turn to play
   */
  validatePlayTurn(roomId: string, playerId: string): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      return { valid: false, error: `Room ${roomId} does not exist` };
    }

    if (room.gameState.isBidding) {
      return { valid: false, error: 'Cannot play cards during bidding phase' };
    }

    if (!room.gameState.winningBid) {
      return { valid: false, error: 'No winning bid established' };
    }

    if (room.gameState.currentTurnId !== playerId) {
      return {
        valid: false,
        error: `It is not ${playerId}'s turn to play`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate that a card string is well-formed
   */
  validateCardFormat(cardStr: string): ValidationResult {
    // Should be format like "9H", "10D", "JC", etc.
    if (!cardStr || typeof cardStr !== 'string' || cardStr.length < 2) {
      return {
        valid: false,
        error: `Invalid card format: ${cardStr}. Expected format: "9H", "10D", "JC", "AS", etc.`,
      };
    }

    const validValues = ['9', '10', 'J', 'Q', 'K', 'A'];
    const validSuits = ['H', 'D', 'C', 'S'];

    const suitChar = cardStr.slice(-1);
    const valueStr = cardStr.slice(0, -1);

    if (!validSuits.includes(suitChar)) {
      return {
        valid: false,
        error: `Invalid suit: ${suitChar}. Valid suits are: ${validSuits.join(', ')}`,
      };
    }

    if (!validValues.includes(valueStr)) {
      return {
        valid: false,
        error: `Invalid value: ${valueStr}. Valid values are: ${validValues.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate that a player has a card in their hand
   */
  validatePlayerHasCard(roomId: string, playerId: string, card: Card): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      return { valid: false, error: `Room ${roomId} does not exist` };
    }

    const hand = room.gameState.hands[playerId];
    if (!hand) {
      return { valid: false, error: `No hand found for player ${playerId}` };
    }

    const hasCard = hand.some(c => c.value === card.value && c.suit === card.suit);
    if (!hasCard) {
      return {
        valid: false,
        error: `Player does not have card ${card.value}${card.suit.charAt(0).toUpperCase()}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate that a card play is a valid move
   */
  validateCardPlay(
    roomId: string,
    playerId: string,
    card: Card,
  ): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      return { valid: false, error: `Room ${roomId} does not exist` };
    }

    // Get the player's hand
    const hand = room.gameState.hands[playerId];
    if (!hand) {
      return { valid: false, error: `No hand found for player ${playerId}` };
    }

    // Get valid moves using GameService
    const trump = room.gameState.winningBid?.trump || 'high';
    const validMoves = this.gameService.getValidMoves(hand, room.gameState.trick, trump);

    // Check if card is in valid moves
    const isValidMove = validMoves.some(m => m.value === card.value && m.suit === card.suit);
    if (!isValidMove) {
      return {
        valid: false,
        error: `Card ${card.value}${card.suit.charAt(0).toUpperCase()} is not a valid move`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate a player name (for joining/hosting)
   */
  validatePlayerName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Player name is required' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Player name cannot be empty' };
    }

    if (trimmed.length > 50) {
      return { valid: false, error: 'Player name must be 50 characters or less' };
    }

    // Allow alphanumeric, spaces, and basic punctuation
    if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmed)) {
      return {
        valid: false,
        error: 'Player name can only contain letters, numbers, spaces, hyphens, and apostrophes',
      };
    }

    return { valid: true };
  }

  /**
   * Validate a room ID (for joining/hosting)
   */
  validateRoomId(roomId: string): ValidationResult {
    if (!roomId || typeof roomId !== 'string') {
      return { valid: false, error: 'Room ID is required' };
    }

    const trimmed = roomId.trim().toUpperCase();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Room ID cannot be empty' };
    }

    if (trimmed.length > 10) {
      return { valid: false, error: 'Room ID must be 10 characters or less' };
    }

    // Allow alphanumeric and basic characters
    if (!/^[a-zA-Z0-9\-]+$/.test(trimmed)) {
      return {
        valid: false,
        error: 'Room ID can only contain letters, numbers, and hyphens',
      };
    }

    return { valid: true };
  }

  /**
   * Validate room size (max 4 players)
   */
  validateRoomSize(roomId: string): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      return { valid: false, error: `Room ${roomId} does not exist` };
    }

    if (room.gameState.players.length >= 4) {
      return { valid: false, error: 'Room is full (4 players maximum)' };
    }

    return { valid: true };
  }

  /**
   * Validate that a player is not already in the room
   */
  validatePlayerNotInRoom(roomId: string, playerName: string): ValidationResult {
    const room = this.gameStateService.getRoom(roomId);
    if (!room) {
      // Room doesn't exist yet, so player can't be in it
      return { valid: true };
    }

    const existingPlayer = room.gameState.players.find(
      p => p.name.toLowerCase() === playerName.toLowerCase(),
    );

    if (existingPlayer) {
      return {
        valid: false,
        error: `Player with name "${playerName}" is already in this room`,
      };
    }

    return { valid: true };
  }
}
