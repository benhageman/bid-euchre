import { Injectable } from '@nestjs/common';
import { Card, Suit, Value, PlayedCard, Trump, Bid } from '../types';

/**
 * Core game logic service for Bid Euchre.
 * Provides pure functions for game mechanics without managing state.
 */
@Injectable()
export class GameService {
  private readonly suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  private readonly values: Value[] = ['9', '10', 'J', 'Q', 'K', 'A'];

  /**
   * Creates a standard 24-card euchre deck
   */
  createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of this.suits) {
      for (const value of this.values) {
        deck.push({ suit, value });
      }
    }
    return deck;
  }

  /**
   * Shuffles a deck using Fisher-Yates algorithm
   */
  shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Deals cards to players (6 cards each for 4 players)
   */
  dealCards(deck: Card[], playerIds: string[]): Record<string, Card[]> {
    const hands: Record<string, Card[]> = {};
    let cardIndex = 0;

    for (const playerId of playerIds) {
      hands[playerId] = deck.slice(cardIndex, cardIndex + 6);
      cardIndex += 6;
    }

    return hands;
  }

  /**
   * Determines the winner of a trick based on trump
   */
  evaluateTrick(trick: PlayedCard[], trump: Trump): string {
    if (trick.length === 0) return '';

    const ledSuit = trick[0].suit;
    const isTrumpSuit = trump !== 'high' && trump !== 'low';
    const trumpSuit = isTrumpSuit ? (trump as Suit) : null;

    console.log('Evaluating trick with trump:', trump);
    console.log('Trick cards:', trick.map(c => `${c.value}${c.suit.charAt(0).toUpperCase()}`).join(', '));

    let winningCard = trick[0];
    let winnerId = trick[0].playerId;

    for (let i = 1; i < trick.length; i++) {
      const card = trick[i];
      
      const cardIsTrump = trumpSuit ? this.isTrumpCard(card, trumpSuit) : false;
      const winningIsTrump = trumpSuit ? this.isTrumpCard(winningCard, trumpSuit) : false;
      
      console.log(`Comparing ${card.value}${card.suit.charAt(0).toUpperCase()} (trump: ${cardIsTrump}) vs ${winningCard.value}${winningCard.suit.charAt(0).toUpperCase()} (trump: ${winningIsTrump})`);
      
      // If there's a trump suit: Trump beats non-trump
      if (trumpSuit && cardIsTrump && !winningIsTrump) {
        console.log('  -> New card wins (trump beats non-trump)');
        winningCard = card;
        winnerId = card.playerId;
      }
      // Both trump - compare trump values (always use 'high' for trump suit)
      else if (trumpSuit && cardIsTrump && winningIsTrump) {
        const comparison = this.compareTrumpCards(card, winningCard, trumpSuit);
        console.log('  -> Both trump, comparison:', comparison);
        if (comparison > 0) {
          winningCard = card;
          winnerId = card.playerId;
        }
      }
      // Both non-trump (or no trump suit), same suit as led - compare based on high/low
      else if (card.suit === ledSuit && winningCard.suit === ledSuit && !cardIsTrump && !winningIsTrump) {
        console.log('  -> Both same suit, comparing with trump:', trump);
        if (this.compareCards(card, winningCard, trump) > 0) {
          winningCard = card;
          winnerId = card.playerId;
        }
      } else {
        console.log('  -> No change (different suit or winning card already wins)');
      }
    }

    console.log('Winner:', `${winningCard.value}${winningCard.suit.charAt(0).toUpperCase()}`);
    return winnerId;
  }

  /**
   * Checks if a card is trump (including left bower)
   */
  private isTrumpCard(card: Card, trumpSuit: Suit): boolean {
    // Right bower (Jack of trump suit)
    if (card.suit === trumpSuit) {
      return true;
    }
    
    // Left bower (Jack of same color)
    if (card.value === 'J') {
      const sameColorSuit = this.getSameColorSuit(trumpSuit);
      if (card.suit === sameColorSuit) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Gets the suit of the same color as the given suit
   */
  private getSameColorSuit(suit: Suit): Suit {
    const colorPairs: Record<Suit, Suit> = {
      'hearts': 'diamonds',
      'diamonds': 'hearts',
      'clubs': 'spades',
      'spades': 'clubs',
    };
    return colorPairs[suit];
  }

  /**
   * Compares two trump cards (including bowers)
   * Returns positive if card1 > card2, negative if card1 < card2, 0 if equal
   * When a suit is trump, always use high ranking (A highest)
   */
  private compareTrumpCards(card1: Card, card2: Card, trumpSuit: Suit): number {
    // Right bower (Jack of trump suit) is always highest
    if (card1.value === 'J' && card1.suit === trumpSuit) return 1;
    if (card2.value === 'J' && card2.suit === trumpSuit) return -1;
    
    // Left bower (Jack of same color) is second highest
    const sameColorSuit = this.getSameColorSuit(trumpSuit);
    if (card1.value === 'J' && card1.suit === sameColorSuit) return 1;
    if (card2.value === 'J' && card2.suit === sameColorSuit) return -1;
    
    // For other trump cards, use high ranking (A=6, K=5, Q=4, J=3, 10=2, 9=1)
    const value1 = this.getCardValue(card1, 'high');
    const value2 = this.getCardValue(card2, 'high');
    return value1 - value2;
  }

  /**
   * Compares two cards based on trump type
   * Returns positive if card1 > card2, negative if card1 < card2, 0 if equal
   */
  private compareCards(card1: Card, card2: Card, trump: Trump): number {
    const value1 = this.getCardValue(card1, trump);
    const value2 = this.getCardValue(card2, trump);
    return value1 - value2;
  }

  /**
   * Gets the numerical value of a card based on trump type
   */
  private getCardValue(card: Card, trump: Trump): number {
    const isLow = trump === 'low';
    const baseValues: Record<Value, number> = {
      '9': isLow ? 6 : 1,
      '10': isLow ? 5 : 2,
      'J': isLow ? 4 : 3,
      'Q': isLow ? 3 : 4,
      'K': isLow ? 2 : 5,
      'A': isLow ? 1 : 6,
    };

    return baseValues[card.value];
  }

  /**
   * Determines valid cards a player can play
   */
  getValidMoves(hand: Card[], trick: PlayedCard[], trump: Trump): Card[] {
    // If first to play OR trick is complete (4 cards = completed trick, next player leads), can play anything
    if (trick.length === 0 || trick.length === 4) {
      return hand;
    }

    const ledSuit = trick[0].suit;
    const isTrumpSuit = trump !== 'high' && trump !== 'low';
    const trumpSuit = isTrumpSuit ? (trump as Suit) : null;
    
    // Filter out cards that are actually trump (including left bower)
    const ledIsTrump = trumpSuit ? this.isTrumpCard(trick[0], trumpSuit) : false;
    
    if (ledIsTrump && trumpSuit) {
      // Trump was led - must follow with trump if possible
      const trumpCards = hand.filter(card => this.isTrumpCard(card, trumpSuit));
      if (trumpCards.length > 0) {
        return trumpCards;
      }
    } else if (trumpSuit) {
      // Non-trump led - must follow suit (excluding left bower which is now trump)
      const cardsInLedSuit = hand.filter(card => {
        // Left bower is NOT in the led suit, it's trump
        if (card.value === 'J' && card.suit === this.getSameColorSuit(trumpSuit)) {
          return false;
        }
        return card.suit === ledSuit;
      });
      
      if (cardsInLedSuit.length > 0) {
        return cardsInLedSuit;
      }
    } else {
      // No trump suit (high or low bid) - just follow led suit
      const cardsInLedSuit = hand.filter(card => card.suit === ledSuit);
      if (cardsInLedSuit.length > 0) {
        return cardsInLedSuit;
      }
    }

    // Can play anything if can't follow suit
    return hand;
  }

  /**
   * Calculates score for a hand based on bid and tricks won
   * House rules:
   * - Make bid: 1 point
   * - Get set: Opposing team gets 2 points
   * - Win all 6 (not moon): 2 points
   * - Moon and win all 6: 4 points
   */
  calculateHandScore(
    bid: Bid,
    tricksWon: Record<string, number>,
    playerTeams: Record<string, 1 | 2>
  ): { team1: number; team2: number } {
    const biddingTeam = playerTeams[bid.id];
    const defendingTeam = biddingTeam === 1 ? 2 : 1;
    
    const teamTricks = Object.entries(tricksWon).reduce(
      (acc, [playerId, tricks]) => {
        const team = playerTeams[playerId];
        acc[team] = (acc[team] || 0) + tricks;
        return acc;
      },
      {} as Record<number, number>
    );

    const biddingTeamTricks = teamTricks[biddingTeam] || 0;
    const bidAmount = typeof bid.amount === 'number' ? bid.amount : 6;
    const scores = { team1: 0, team2: 0 };

    if (bid.amount === 'moon') {
      // Moon bid
      if (biddingTeamTricks === 6) {
        // Moon successful - 4 points
        scores[`team${biddingTeam}` as 'team1' | 'team2'] = 4;
      } else {
        // Moon failed - opposing team gets 2 points
        scores[`team${defendingTeam}` as 'team1' | 'team2'] = 2;
      }
    } else {
      // Regular bid
      if (biddingTeamTricks >= bidAmount) {
        // Made the bid
        if (biddingTeamTricks === 6) {
          // Won all 6 tricks - 2 points
          scores[`team${biddingTeam}` as 'team1' | 'team2'] = 2;
        } else {
          // Made bid but didn't sweep - 1 point
          scores[`team${biddingTeam}` as 'team1' | 'team2'] = 1;
        }
      } else {
        // Got set - opposing team gets 2 points
        scores[`team${defendingTeam}` as 'team1' | 'team2'] = 2;
      }
    }

    return scores;
  }

  /**
   * Determines player teams based on seating
   * Teams are: (Player 0, Player 2) vs (Player 1, Player 3)
   */
  getPlayerTeams(playerIds: string[]): Record<string, 1 | 2> {
    const teams: Record<string, 1 | 2> = {};
    playerIds.forEach((id, index) => {
      teams[id] = (index % 2 === 0 ? 1 : 2);
    });
    return teams;
  }
}
