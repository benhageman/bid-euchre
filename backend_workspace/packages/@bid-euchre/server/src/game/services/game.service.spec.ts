import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { Card, PlayedCard, Trump, Suit } from '../types';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  describe('Deck Creation', () => {
    it('should create a 24-card deck', () => {
      const deck = service.createDeck();
      expect(deck.length).toBe(24);
    });

    it('should have 6 cards of each suit', () => {
      const deck = service.createDeck();
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      
      suits.forEach(suit => {
        const cardsInSuit = deck.filter(card => card.suit === suit);
        expect(cardsInSuit.length).toBe(6);
      });
    });

    it('should have cards with correct values', () => {
      const deck = service.createDeck();
      const values = ['9', '10', 'J', 'Q', 'K', 'A'];
      
      values.forEach(value => {
        const cardsWithValue = deck.filter(card => card.value === value);
        expect(cardsWithValue.length).toBe(4); // One per suit
      });
    });
  });

  describe('Deck Shuffling', () => {
    it('should shuffle the deck', () => {
      const deck1 = service.createDeck();
      const deck2 = service.createDeck();
      const shuffled = service.shuffleDeck(deck2);
      
      // Very unlikely to be in same order after shuffle
      expect(shuffled).not.toEqual(deck1);
    });

    it('should maintain all cards after shuffle', () => {
      const deck = service.createDeck();
      const shuffled = service.shuffleDeck(deck);
      
      expect(shuffled.length).toBe(24);
      expect(shuffled.every(card => 
        deck.some(c => c.suit === card.suit && c.value === card.value)
      )).toBe(true);
    });
  });

  describe('Card Dealing', () => {
    it('should deal 6 cards to each of 4 players', () => {
      const deck = service.createDeck();
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const hands = service.dealCards(deck, playerIds);
      
      playerIds.forEach(playerId => {
        expect(hands[playerId].length).toBe(6);
      });
    });

    it('should deal all 24 cards', () => {
      const deck = service.createDeck();
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const hands = service.dealCards(deck, playerIds);
      
      let totalCards = 0;
      playerIds.forEach(playerId => {
        totalCards += hands[playerId].length;
      });
      expect(totalCards).toBe(24);
    });
  });

  describe('Valid Moves - No Trump', () => {
    it('should allow any card if leading (no trump)', () => {
      const hand: Card[] = [
        { suit: 'hearts', value: '9' },
        { suit: 'diamonds', value: 'K' },
        { suit: 'clubs', value: 'A' },
      ];
      const trick: PlayedCard[] = [];
      const trump: Trump = 'high';
      
      const validMoves = service.getValidMoves(hand, trick, trump);
      expect(validMoves.length).toBe(3);
    });

    it('should require following suit if possible (high trump)', () => {
      const hand: Card[] = [
        { suit: 'hearts', value: '9' },
        { suit: 'hearts', value: 'K' },
        { suit: 'diamonds', value: 'A' },
      ];
      const trick: PlayedCard[] = [
        { suit: 'hearts', value: 'Q', playerId: 'player1' },
      ];
      const trump: Trump = 'high';
      
      const validMoves = service.getValidMoves(hand, trick, trump);
      expect(validMoves.length).toBe(2); // Only the two hearts
      expect(validMoves.every(card => card.suit === 'hearts')).toBe(true);
    });

    it('should allow any card if cannot follow suit (high trump)', () => {
      const hand: Card[] = [
        { suit: 'diamonds', value: '9' },
        { suit: 'clubs', value: 'K' },
        { suit: 'spades', value: 'A' },
      ];
      const trick: PlayedCard[] = [
        { suit: 'hearts', value: 'Q', playerId: 'player1' },
      ];
      const trump: Trump = 'high';
      
      const validMoves = service.getValidMoves(hand, trick, trump);
      expect(validMoves.length).toBe(3); // All cards allowed
    });
  });

  describe('Valid Moves - Suit Trump', () => {
    it('should treat left bower as trump card', () => {
      // If hearts is trump, Jack of Diamonds is the left bower and counts as trump
      const hand: Card[] = [
        { suit: 'diamonds', value: 'J' }, // Left bower (should be trump)
        { suit: 'clubs', value: 'K' },
        { suit: 'spades', value: 'A' },
      ];
      const trick: PlayedCard[] = [
        { suit: 'hearts', value: 'Q', playerId: 'player1' }, // Trump led
      ];
      const trump: Trump = 'hearts';
      
      const validMoves = service.getValidMoves(hand, trick, trump);
      expect(validMoves.length).toBe(1); // Only the left bower (which is trump)
      expect(validMoves[0].value).toBe('J');
      expect(validMoves[0].suit).toBe('diamonds');
    });

    it('should require trump if it was led and you have it', () => {
      const hand: Card[] = [
        { suit: 'hearts', value: 'K' }, // Hearts trump
        { suit: 'hearts', value: '9' },
        { suit: 'diamonds', value: 'A' },
      ];
      const trick: PlayedCard[] = [
        { suit: 'hearts', value: 'Q', playerId: 'player1' }, // Trump led
      ];
      const trump: Trump = 'hearts';
      
      const validMoves = service.getValidMoves(hand, trick, trump);
      expect(validMoves.length).toBe(2); // Both hearts
      expect(validMoves.every(card => card.suit === 'hearts')).toBe(true);
    });
  });

  describe('Trick Evaluation - No Trump', () => {
    it('should evaluate trick correctly with high trump', () => {
      const trick: PlayedCard[] = [
        { suit: 'hearts', value: '9', playerId: 'player1' },
        { suit: 'hearts', value: 'K', playerId: 'player2' },
        { suit: 'hearts', value: 'Q', playerId: 'player3' },
        { suit: 'hearts', value: 'A', playerId: 'player4' },
      ];
      
      const winner = service.evaluateTrick(trick, 'high');
      expect(winner).toBe('player4'); // Ace is highest
    });

    it('should evaluate trick correctly with low trump', () => {
      const trick: PlayedCard[] = [
        { suit: 'hearts', value: '9', playerId: 'player1' },
        { suit: 'hearts', value: 'K', playerId: 'player2' },
        { suit: 'hearts', value: 'Q', playerId: 'player3' },
        { suit: 'hearts', value: 'A', playerId: 'player4' },
      ];
      
      const winner = service.evaluateTrick(trick, 'low');
      expect(winner).toBe('player1'); // 9 is lowest
    });

    it('should award trick to non-led suit only if led suit was played', () => {
      const trick: PlayedCard[] = [
        { suit: 'hearts', value: 'K', playerId: 'player1' },
        { suit: 'diamonds', value: 'A', playerId: 'player2' },
        { suit: 'hearts', value: 'Q', playerId: 'player3' },
        { suit: 'hearts', value: '9', playerId: 'player4' },
      ];
      
      const winner = service.evaluateTrick(trick, 'high');
      expect(winner).toBe('player1'); // King of led suit beats off-suit ace
    });
  });

  describe('Trick Evaluation - Suit Trump', () => {
    it('should evaluate trick with suit trump correctly', () => {
      // TODO: Prescribe a trick with suit trump
      // Including right bower (J of trump suit)
      // Left bower (J of same color)
      // Regular trump cards
      // Non-trump cards
      const trick: PlayedCard[] = [
        // Add prescribed cards here
      ];
      
      // Expect correct winner
    });

    it('should rank right bower highest', () => {
      // TODO: Right bower (J of trump suit) should beat all other cards
      const trick: PlayedCard[] = [
        // Prescribe: Right bower vs left bower vs trump A, etc.
      ];
      
      // Expect right bower to win
    });

    it('should rank left bower second highest', () => {
      // TODO: Left bower (J of same color as trump) should beat non-bower trump
      const trick: PlayedCard[] = [
        // Prescribe cards
      ];
      
      // Expect left bower to win (no right bower)
    });
  });

  describe('Full Game Simulation', () => {
    it('should simulate a complete game correctly', () => {
      // TODO: Create a test game
      // 1. Deal cards
      // 2. Prescribe bids for all 4 players
      // 3. Determine winning bid
      // 4. Play all 6 tricks with prescribed cards
      // 5. Verify correct player won each trick
      // 6. Verify final scoring is correct
      
      const playerIds = ['player0', 'player1', 'player2', 'player3'];
      const deck = service.createDeck();
      const hands = service.dealCards(deck, playerIds);
      
      // Prescribed bids:
      // Player 0: Bid 3 Hearts
      // Player 1: Pass (0)
      // Player 2: Pass (0)
      // Player 3: Pass (0)
      // Winner: Player 0 with 3 Hearts
      
      const winningBid = {
        id: playerIds[0],
        name: 'Player 0',
        amount: 3 as const,
        trump: 'hearts' as Trump,
      };
      
      const tricksWon: Record<string, number> = {
        [playerIds[0]]: 0,
        [playerIds[1]]: 0,
        [playerIds[2]]: 0,
        [playerIds[3]]: 0,
      };
      
      // TODO: Simulate playing all 6 tricks by prescribing which card each player plays
      // Trick 1: [card from p0, card from p1, card from p2, card from p3]
      // Trick 2: ...
      // etc.
      
      // After each trick, use evaluateTrick to determine winner
      // Increment winner's tricksWon count
      
      // Then verify final score
      const playerTeams = service.getPlayerTeams(playerIds);
      const finalScores = service.calculateHandScore(winningBid, tricksWon, playerTeams);
      
      // TODO: Assert correct final scores based on:
      // - Whether the bid was made (3 tricks or more?)
      // - Whether it was a sweep (6 tricks)?
      // - Correct teams got the points?
    });
  });

  describe('Scoring', () => {
    it('should award 1 point for making a simple bid', () => {
      // TODO: Prescribe a game where:
      // - Bid: 3 tricks
      // - Result: Won 3 tricks (exactly made)
      // - Expected: Bidding team gets 1 point
      
      const playerIds = ['p0', 'p1', 'p2', 'p3'];
      const bid = {
        id: playerIds[0],
        name: 'Player 0',
        amount: 3 as const,
        trump: 'high' as Trump,
      };
      const tricksWon = {
        [playerIds[0]]: 2,
        [playerIds[2]]: 1, // Teammates (0 & 2)
        [playerIds[1]]: 2,
        [playerIds[3]]: 1, // Other team (1 & 3)
      };
      const playerTeams = service.getPlayerTeams(playerIds);
      
      const scores = service.calculateHandScore(bid, tricksWon, playerTeams);
      expect(scores.team1).toBe(1); // Team 0&2 made their bid of 3
    });

    it('should award 2 points for sweeping (winning all 6)', () => {
      // TODO: Prescribe a game where:
      // - Bid: Any number
      // - Result: Won all 6 tricks
      // - Expected: Bidding team gets 2 points
      
      const playerIds = ['p0', 'p1', 'p2', 'p3'];
      const bid = {
        id: playerIds[0],
        name: 'Player 0',
        amount: 3 as const,
        trump: 'high' as Trump,
      };
      const tricksWon = {
        [playerIds[0]]: 3,
        [playerIds[2]]: 3, // Team 0&2 won all 6
        [playerIds[1]]: 0,
        [playerIds[3]]: 0,
      };
      const playerTeams = service.getPlayerTeams(playerIds);
      
      const scores = service.calculateHandScore(bid, tricksWon, playerTeams);
      expect(scores.team1).toBe(2); // Team 0&2 swept
    });

    it('should award 2 points to opposing team if bid was set', () => {
      // TODO: Prescribe a game where:
      // - Bid: 4 tricks
      // - Result: Won only 2 tricks (set)
      // - Expected: Opposing team gets 2 points, bidding team gets 0
      
      const playerIds = ['p0', 'p1', 'p2', 'p3'];
      const bid = {
        id: playerIds[0],
        name: 'Player 0',
        amount: 4 as const,
        trump: 'high' as Trump,
      };
      const tricksWon = {
        [playerIds[0]]: 1,
        [playerIds[2]]: 1, // Team 0&2 only got 2 tricks
        [playerIds[1]]: 2,
        [playerIds[3]]: 2, // Team 1&3 got 4
      };
      const playerTeams = service.getPlayerTeams(playerIds);
      
      const scores = service.calculateHandScore(bid, tricksWon, playerTeams);
      expect(scores.team2).toBe(2); // Team 1&3 set the bid
      expect(scores.team1).toBe(0); // Team 0&2 got nothing
    });

    it('should award 4 points for moon bid success', () => {
      // TODO: Prescribe a game where:
      // - Bid: moon
      // - Result: Won all 6 tricks
      // - Expected: Bidding team gets 4 points
      
      const playerIds = ['p0', 'p1', 'p2', 'p3'];
      const bid = {
        id: playerIds[0],
        name: 'Player 0',
        amount: 'moon' as const,
        trump: 'high' as Trump,
      };
      const tricksWon = {
        [playerIds[0]]: 3,
        [playerIds[2]]: 3, // Team 0&2 won all 6
        [playerIds[1]]: 0,
        [playerIds[3]]: 0,
      };
      const playerTeams = service.getPlayerTeams(playerIds);
      
      const scores = service.calculateHandScore(bid, tricksWon, playerTeams);
      expect(scores.team1).toBe(4); // Team 0&2 won moon
    });

    it('should award 2 points to opposing team for failed moon bid', () => {
      // TODO: Prescribe a game where:
      // - Bid: moon
      // - Result: Won only 5 tricks (failed)
      // - Expected: Opposing team gets 2 points
      
      const playerIds = ['p0', 'p1', 'p2', 'p3'];
      const bid = {
        id: playerIds[0],
        name: 'Player 0',
        amount: 'moon' as const,
        trump: 'high' as Trump,
      };
      const tricksWon = {
        [playerIds[0]]: 3,
        [playerIds[2]]: 2, // Team 0&2 got 5 tricks (moon failed)
        [playerIds[1]]: 1,
        [playerIds[3]]: 0,
      };
      const playerTeams = service.getPlayerTeams(playerIds);
      
      const scores = service.calculateHandScore(bid, tricksWon, playerTeams);
      expect(scores.team2).toBe(2); // Other team gets 2 for setting moon
    });
  });

  describe('Player Teams', () => {
    it('should assign players to correct teams', () => {
      const playerIds = ['p0', 'p1', 'p2', 'p3'];
      const teams = service.getPlayerTeams(playerIds);
      
      expect(teams['p0']).toBe(1); // Even index
      expect(teams['p1']).toBe(2); // Odd index
      expect(teams['p2']).toBe(1); // Even index
      expect(teams['p3']).toBe(2); // Odd index
    });
  });
});
