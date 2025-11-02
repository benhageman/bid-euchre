/**
 * GameTable Component
 * 
 * This is the main game interface component that brings together all the elements
 * of the Bid Euchre game:
 * - Player areas showing names and trick counts
 * - Current trick display in the center
 * - Player's hand at the bottom
 * - Score display
 * - Bidding interface when active
 * 
 * The component handles:
 * - Card playing interactions
 * - Turn management
 * - Display of game state
 * - Player position calculations
 */

import React from "react";
import { ScoreBoard, PlayerArea, Trick, Hand } from ".";
import { BidAmount, TrumpType } from "../types";

/**
 * Player information
 */
type Player = {
  /** Unique identifier for the player */
  id: string;
  /** Display name of the player */
  name: string;
};

/**
 * Represents a card played in the current trick
 */
type TrickCard = {
  /** ID of the player who played the card */
  id: string;
  /** Card value in format 'valuesuit' (e.g., 'AS' for Ace of Spades) */
  card: string;
};

/**
 * Represents a bid made by a player
 */
type Bid = {
  /** Name of the player who made the bid */
  name: string;
  /** Bid amount (1-6 or 'moon') */
  amount: BidAmount;
  /** Trump suit chosen for the bid */
  trump: TrumpType;
};

/**
 * Props for the GameTable component
 */
type Props = {
  /** List of all players in the game */
  players: Player[];
  /** ID of the player whose turn it is */
  currentTurnId: string;
  /** Current score for each team */
  teamScores: { team1: number; team2: number };
  /** Map of player IDs to their trick count this hand */
  tricksWon: { [playerId: string]: number };
  /** Cards currently played in the active trick */
  trickCards: TrickCard[];
  /** Current player's hand */
  hand: string[];
  /** Callback for playing a card */
  onPlayCard: (card: string) => void;
  /** Whether it's the current player's turn */
  isMyTurn: boolean;
  /** Current player's ID */
  youId: string;
  /** Set of player IDs who have played in current trick */
  playedThisTrick: Set<string>;
  /** The winning bid for the current hand */
  winningBid?: Bid | null;
  /** List of all bids made this hand */
  bids?: Bid[];
  /** Cards that are legal to play this turn */
  playableCards: string[];
  /** Whether the game is in bidding phase */
  isBidding: boolean;
};

const GameTable: React.FC<Props> = ({
  players,
  currentTurnId,
  teamScores,
  tricksWon,
  trickCards,
  hand,
  onPlayCard,
  isMyTurn,
  youId,
  playedThisTrick,
  bids,
  winningBid,
  playableCards,
  isBidding,
}) => {
  const myIndex = players.findIndex((p) => p.id === youId);
  const rotated = [...players];
  if (myIndex > 0) {
    const cut = rotated.splice(0, myIndex);
    rotated.push(...cut);
  }

  const bottomPlayer = rotated[0];
  const topPlayer = rotated[2];
  const leftPlayer = rotated[1];
  const rightPlayer = rotated[3];

  const getTeam = (playerId: string) => {
    const index = players.findIndex((p) => p.id === playerId);
    return index % 2 === 0 ? 1 : 2;
  };

  return (
    <div className="flex flex-col full-mobile-height w-screen bg-green-800 text-white overflow-hidden p-1">
      <div className="flex justify-center items-center py-1">
        <ScoreBoard scores={teamScores} winningBid={winningBid || undefined} />
      </div>

      {topPlayer && (
        <div className="flex justify-center items-center py-1">
          <PlayerArea
            name={topPlayer.name}
            tricks={tricksWon[topPlayer.id] || 0}
            isCurrentTurn={currentTurnId === topPlayer.id && !playedThisTrick.has(topPlayer.id)}
            bid={bids?.find(b => b?.name === topPlayer.name) || null}
            team={getTeam(topPlayer.id)}
          />
        </div>
      )}

      <div className="flex flex-1 justify-around items-center px-1 gap-1">
        {leftPlayer && (
          <div className="flex-1 max-w-[70px]">
            <PlayerArea
              name={leftPlayer.name}
              tricks={tricksWon[leftPlayer.id] || 0}
              isCurrentTurn={currentTurnId === leftPlayer.id && !playedThisTrick.has(leftPlayer.id)}
              vertical
              bid={bids?.find(b => b?.name === leftPlayer.name) || null}
              team={getTeam(leftPlayer.id)}
            />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center min-w-0">
          <Trick trick={trickCards} players={rotated} />
        </div>

        {rightPlayer && (
          <div className="flex-1 max-w-[70px]">
            <PlayerArea
              name={rightPlayer.name}
              tricks={tricksWon[rightPlayer.id] || 0}
              isCurrentTurn={currentTurnId === rightPlayer.id && !playedThisTrick.has(rightPlayer.id)}
              vertical
              bid={bids?.find(b => b?.name === rightPlayer.name) || null}
              team={getTeam(rightPlayer.id)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center pt-1 pb-2">
        {bottomPlayer && (
          <PlayerArea
            name={bottomPlayer.name || "You"}
            tricks={tricksWon[bottomPlayer.id] || 0}
            isCurrentTurn={currentTurnId === bottomPlayer.id && !playedThisTrick.has(bottomPlayer.id)}
            bid={bids?.find(b => b?.name === bottomPlayer.name) || null}
            team={getTeam(bottomPlayer.id)}
          />
        )}

        <div className="w-full px-1 overflow-hidden">
          <Hand
            hand={hand}
            onPlayCard={onPlayCard}
            canPlay={isMyTurn && !isBidding}
            playableCards={playableCards}
            isAutoPlaying={false}
          />
        </div>
      </div>
    </div>
  );
};

export default GameTable;