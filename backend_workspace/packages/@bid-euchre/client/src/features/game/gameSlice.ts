/**
 * Redux slice for managing the game state in the client.
 * This slice handles:
 * - Player management
 * - Card actions and validation
 * - Turn tracking
 * - Score keeping
 * - Bidding process
 * 
 * The state is updated in response to both local actions and
 * server events received through WebSocket connections.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TrumpType, BidAmount } from '../../features/game/types';

/**
 * Represents a player in the game
 */
interface Player {
  /** Unique identifier for the player */
  id: string;
  /** Display name of the player */
  name: string;
}

/**
 * Represents a bid made by a player
 */
interface Bid {
  /** Name of the player who made the bid */
  name: string;
  /** Bid amount (1-6 or 'moon') */
  amount: BidAmount;
  /** Trump suit chosen for the bid */
  trump: TrumpType;
}

/**
 * Represents a card played in a trick
 */
interface TrickCard {
  /** ID of the player who played the card */
  id: string;
  /** Card value in format 'valuesuit' */
  card: string;
}

/**
 * Complete game state managed by Redux
 */
interface GameState {
  /** List of all players in the game */
  players: Player[];
  /** ID of the player whose turn it is (null if game not started) */
  currentTurnId: string | null;
  /** Current player's hand of cards */
  hand: string[];
  /** Cards currently played in the active trick */
  trick: TrickCard[];
  /** Map of player IDs to their trick count this hand */
  tricksWon: Record<string, number>;
  /** Current score for each team */
  teamScores: {
    team1: number;
    team2: number;
  };
  /** Array of bids made by each player (null for passes) */
  bids: (Bid | null)[];
  /** The winning bid for the current hand */
  winningBid: Bid | null;
  /** Whether the game is in bidding phase */
  isBidding: boolean;
  /** List of player IDs who have played in current trick */
  playedThisTrick: string[];
  /** Cards that are legal to play this turn */
  playableCards: string[];
}

const initialState: GameState = {
  players: [],
  currentTurnId: null,
  hand: [],
  trick: [],
  tricksWon: {},
  teamScores: { team1: 0, team2: 0 },
  bids: [null, null, null, null],
  winningBid: null,
  isBidding: false,
  playedThisTrick: [],
  playableCards: [],
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setPlayers: (state, action: PayloadAction<Player[]>) => {
      state.players = action.payload;
    },
    setCurrentTurn: (state, action: PayloadAction<string>) => {
      state.currentTurnId = action.payload;
    },
    setHand: (state, action: PayloadAction<string[]>) => {
      state.hand = action.payload;
    },
    updateTrick: (state, action: PayloadAction<TrickCard[]>) => {
      state.trick = action.payload;
      state.playedThisTrick = action.payload.map(card => card.id);
    },
    updateTricksWon: (state, action: PayloadAction<Record<string, number>>) => {
      state.tricksWon = action.payload;
    },
    updateTeamScores: (state, action: PayloadAction<{ team1: number; team2: number }>) => {
      state.teamScores = action.payload;
    },
    updateBids: (state, action: PayloadAction<(Bid | null)[]>) => {
      state.bids = action.payload;
    },
    setWinningBid: (state, action: PayloadAction<Bid | null>) => {
      state.winningBid = action.payload;
    },
    setIsBidding: (state, action: PayloadAction<boolean>) => {
      state.isBidding = action.payload;
    },
    setPlayableCards: (state, action: PayloadAction<string[]>) => {
      state.playableCards = action.payload;
    },
  },
});

export const {
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
} = gameSlice.actions;

export default gameSlice.reducer;