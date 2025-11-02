import { Injectable } from '@nestjs/common';
import { GameService } from './game.service';
import { Card, Bid, Player, PlayedCard, Trump, Suit } from '../types';

/**
 * Service for bot player AI and decision-making
 */
@Injectable()
export class BotService {
  private readonly BOT_NAMES = [
    'Bot Alice',
    'Bot Bob',
    'Bot Charlie',
    'Bot Diana',
  ];

  constructor(private readonly gameService: GameService) {}

  /**
   * Creates a new bot player
   */
  createBot(existingPlayers: Player[]): Player {
    const usedNames = new Set(existingPlayers.map(p => p.name));
    const availableName = this.BOT_NAMES.find(name => !usedNames.has(name)) || 'Bot Player';
    
    return {
      id: `bot-${Date.now()}-${Math.random()}`,
      name: availableName,
      isBot: true,
    };
  }

  /**
   * Decides what bid a bot should make
   * Can bid:
   * - 'high' (no trump, high cards win)
   * - 'low' (no trump, low cards win)  
   * - A suit as trump (hearts/diamonds/clubs/spades)
   */
  decideBid(hand: Card[], currentBids: (Bid | null)[]): Bid | null {
    // Simple AI: Count high cards
    const highCardCount = hand.filter(card => 
      card.value === 'A' || card.value === 'K' || card.value === 'J'
    ).length;

    // Get current highest bid
    const nonNullBids = currentBids.filter(b => b && b.amount !== 0);
    let highestAmount = 0;
    
    if (nonNullBids.length > 0) {
      highestAmount = Math.max(...nonNullBids.map(b => {
        if (!b) return 0;
        return b.amount === 'moon' ? 7 : b.amount;
      }));
    }

    // Decide bid based on hand strength
    let bidAmount: number = 0;
    
    if (highCardCount >= 5) {
      bidAmount = 4;
    } else if (highCardCount >= 4) {
      bidAmount = 3;
    } else if (highCardCount >= 3) {
      bidAmount = 2;
    } else if (highCardCount >= 2) {
      bidAmount = 1;
    }

    // Only bid if we can beat current highest
    if (bidAmount <= highestAmount) {
      return null; // Pass
    }

    // Decide trump strategy:
    // 1. Check if we have a strong suit (4+ cards) -> bid that suit as trump
    // 2. Otherwise, bid high or low based on card values
    
    const suitCounts = hand.reduce((acc, card) => {
      acc[card.suit] = (acc[card.suit] || 0) + 1;
      return acc;
    }, {} as Record<Suit, number>);
    
    const bestSuit = Object.entries(suitCounts).reduce((best, [suit, count]) => {
      return count > best.count ? { suit: suit as Suit, count } : best;
    }, { suit: 'hearts' as Suit, count: 0 });

    // If we have a strong suit (4+ cards), bid it as trump
    if (bestSuit.count >= 4) {
      return {
        id: '',
        name: '',
        amount: bidAmount as 1 | 2 | 3 | 4,
        trump: bestSuit.suit,
      };
    }

    // Otherwise, bid high or low based on card values
    const aces = hand.filter(c => c.value === 'A' || c.value === 'K').length;
    const nines = hand.filter(c => c.value === '9' || c.value === '10').length;
    const trumpChoice: Trump = nines > aces ? 'low' : 'high';

    return {
      id: '',
      name: '',
      amount: bidAmount as 1 | 2 | 3 | 4,
      trump: trumpChoice,
    };
  }

  /**
   * Decides which card a bot should play
   */
  decideCard(hand: Card[], trick: PlayedCard[], trump: Trump): Card {
    const validMoves = this.gameService.getValidMoves(hand, trick, trump);
    
    if (validMoves.length === 0) {
      return hand[0];
    }

    // Simple AI: Play highest valid card if leading or following suit
    // Play lowest if can't follow suit
    if (trick.length === 0) {
      // Leading - play highest card
      return this.getHighestCard(validMoves, trump);
    }

    const ledSuit = trick[0].suit;
    const hasLedSuit = validMoves.some(c => c.suit === ledSuit);

    if (hasLedSuit) {
      // Can follow suit - play highest
      const suitCards = validMoves.filter(c => c.suit === ledSuit);
      return this.getHighestCard(suitCards, trump);
    }

    // Can't follow suit - play lowest card
    return this.getLowestCard(validMoves, trump);
  }

  /**
   * Gets the highest value card from a set
   */
  private getHighestCard(cards: Card[], trump: Trump): Card {
    return cards.reduce((highest, card) => {
      const highestValue = this.getCardRank(highest, trump);
      const cardValue = this.getCardRank(card, trump);
      return cardValue > highestValue ? card : highest;
    });
  }

  /**
   * Gets the lowest value card from a set
   */
  private getLowestCard(cards: Card[], trump: Trump): Card {
    return cards.reduce((lowest, card) => {
      const lowestValue = this.getCardRank(lowest, trump);
      const cardValue = this.getCardRank(card, trump);
      return cardValue < lowestValue ? card : lowest;
    });
  }

  /**
   * Gets numerical rank of a card
   */
  private getCardRank(card: Card, trump: Trump): number {
    const isLow = trump === 'low';
    const ranks: Record<string, number> = {
      '9': isLow ? 6 : 1,
      '10': isLow ? 5 : 2,
      'J': isLow ? 4 : 3,
      'Q': isLow ? 3 : 4,
      'K': isLow ? 2 : 5,
      'A': isLow ? 1 : 6,
    };
    return ranks[card.value] || 0;
  }
}
