/**
 * Core type definitions for the Bid Euchre game
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Value = '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Trump = 'high' | 'low' | Suit; // Can bid high, low, or a specific suit as trump
export type BidAmount = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 'moon';

export interface Card {
  suit: Suit;
  value: Value;
}

export interface PlayedCard extends Card {
  playerId: string;
}

export interface Player {
  id: string;
  name: string;
  isBot?: boolean;
}

export interface Bid {
  id: string;
  name: string;
  amount: BidAmount;
  trump: Trump; // 'high', 'low', or a suit (hearts/diamonds/clubs/spades)
}

export interface GameState {
  players: Player[];
  dealerIndex: number;
  currentTurnId: string | null;
  hands: Record<string, Card[]>;
  trick: PlayedCard[];
  tricksWon: Record<string, number>;
  bids: (Bid | null)[];
  winningBid: Bid | null;
  isBidding: boolean;
  gameStarted: boolean;
  teamScores: {
    team1: number;
    team2: number;
  };
}

export interface Room {
  id: string;
  host: string;
  gameState: GameState;
}
