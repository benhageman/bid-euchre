/** Card suit in order of rank (for display) */
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

/** Card values in ascending order */
export type Value = '9' | '10' | 'J' | 'Q' | 'K' | 'A';

/** Valid trump suit options including special bids */
export type TrumpType = Suit | 'high' | 'low';

/** Valid bid amounts: number (1-6) or 'moon' */
export type BidAmount = number | 'moon';

/** A bid made by a player */
export interface Bid {
  id: string;
  name: string;
  amount: BidAmount;
  trump: TrumpType;
}

/** Represents a playing card */
export interface Card {
  suit: Suit;
  value: Value;
}

/** Card with additional context about the player who played it */
export interface PlayedCard extends Card {
  playerId: string;
  playerName: string;
}

/** Utility functions for cards */
export const Cards = {
  /** Convert a card to its string representation (e.g., "AS" for Ace of Spades) */
  toString: (card: Card): string => {
    const suitMap: Record<Suit, string> = {
      spades: 'S',
      hearts: 'H',
      diamonds: 'D',
      clubs: 'C'
    };
    return `${card.value}${suitMap[card.suit]}`;
  },

  /** Parse a card string (e.g., "AS") into a Card object */
  fromString: (str: string): Card => {
    const value = str.slice(0, -1) as Value;
    const suitCode = str.slice(-1);
    const suitMap: Record<string, Suit> = {
      'S': 'spades',
      'H': 'hearts',
      'D': 'diamonds',
      'C': 'clubs'
    };
    return {
      value,
      suit: suitMap[suitCode]
    };
  },

  /** Check if two cards are equal */
  equals: (a: Card, b: Card): boolean => {
    return a.suit === b.suit && a.value === b.value;
  },

  /** Get the name of a card (e.g., "Ace of Spades") */
  getName: (card: Card): string => {
    const valueNames: Record<Value, string> = {
      '9': 'Nine',
      '10': 'Ten',
      'J': 'Jack',
      'Q': 'Queen',
      'K': 'King',
      'A': 'Ace'
    };
    return `${valueNames[card.value]} of ${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}`;
  }
};