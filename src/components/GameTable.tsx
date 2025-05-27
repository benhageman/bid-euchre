// src/components/GameTable.tsx
import React from "react";
import ScoreBoard from "./ScoreBoard";
import PlayerArea from "./PlayerArea";
import Trick from "./Trick";
import Hand from "./Hand";

type Player = {
  id: string;
  name: string;
};

type TrickCard = {
  id: string;
  card: string;
};

type Props = {
  players: Player[];
  currentTurnId: string;
  teamScores: { team1: number; team2: number };
  tricksWon: { [playerId: string]: number };
  trickCards: TrickCard[];
  hand: string[];
  onPlayCard: (card: string) => void;
  isMyTurn: boolean;
  youId: string;
  playedThisTrick: Set<string>;
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
}) => {
    const myIndex = players.findIndex(p => p.id === youId);
    const rotated = [...players];

    if (myIndex > 0) {
    const cut = rotated.splice(0, myIndex);
    rotated.push(...cut);
    }

    const bottomPlayer = rotated[0]; // You
    const topPlayer = rotated[2];    // Opposite
    const leftPlayer = rotated[1];   // Left
    const rightPlayer = rotated[3];  // Right


  return (
    <div className="flex flex-col h-screen w-screen bg-green-800 text-white p-2 overflow-hidden">
      <ScoreBoard scores={teamScores} />

      {/* Top Player */}
      <div className="flex justify-center mt-2">
        {topPlayer && (
          <PlayerArea
            name={topPlayer.name}
            tricks={tricksWon[topPlayer.id] || 0}
            isCurrentTurn={currentTurnId === topPlayer.id && !playedThisTrick.has(topPlayer.id)}
          />
        )}
      </div>

      <div className="flex flex-1 justify-between items-center mt-2 mb-2">
        {/* Left Player */}
        <div className="w-1/5">
          {leftPlayer && (
            <PlayerArea
              name={leftPlayer.name}
              tricks={tricksWon[leftPlayer.id] || 0}
              isCurrentTurn={currentTurnId === leftPlayer.id && !playedThisTrick.has(leftPlayer.id)}
              vertical
            />
          )}
        </div>

        {/* Trick in Center */}
        <div className="flex-1 flex items-center justify-center bg-green-900 rounded-lg border border-white p-4">
          <Trick trick={trickCards} players={players} />
        </div>

        {/* Right Player */}
        <div className="w-1/5">
          {rightPlayer && (
            <PlayerArea
              name={rightPlayer.name}
              tricks={tricksWon[rightPlayer.id] || 0}
              isCurrentTurn={currentTurnId === rightPlayer.id && !playedThisTrick.has(rightPlayer.id)}
              vertical
            />
          )}
        </div>
      </div>

      {/* Bottom Player and Hand */}
      <div className="flex flex-col items-center">
        {bottomPlayer && (
          <PlayerArea
            name={bottomPlayer.name || "You"}
            tricks={tricksWon[bottomPlayer.id] || 0}
            isCurrentTurn={currentTurnId === bottomPlayer.id && !playedThisTrick.has(bottomPlayer.id)}
          />
        )}
        <div className="mt-2 w-full max-w-xl">
          <Hand
            hand={hand}
            onPlayCard={onPlayCard}
            canPlay={isMyTurn}
            playableCards={hand}
            isAutoPlaying={false}
          />
        </div>
      </div>
    </div>
  );
};

export default GameTable;
