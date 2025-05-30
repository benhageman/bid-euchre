// src/components/GameTable.tsx
import React from "react";
import ScoreBoard from "./ScoreBoard";
import PlayerArea from "./PlayerArea";
import Trick from "./Trick";
import Hand from "./Hand";
import { BidAmount, TrumpType } from "../types/BidTypes";

type Player = {
  id: string;
  name: string;
};

type TrickCard = {
  id: string;
  card: string;
};

type Bid = {
  name: string;
  amount: BidAmount;
  trump: TrumpType;
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
  winningBid?: Bid | null;
  bids?: Bid[];

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

  return (
    <div className="flex flex-col full-mobile-height w-screen bg-green-800 text-white overflow-hidden p-1">
      {/* Top Bar / Score */}
      <div className="flex justify-center items-center py-1">
        <ScoreBoard scores={teamScores} winningBid={winningBid || undefined} />
      </div>

      {/* Top Player */}
      {topPlayer && (
        <div className="flex justify-center items-center py-1">
          <PlayerArea
            name={topPlayer.name}
            tricks={tricksWon[topPlayer.id] || 0}
            isCurrentTurn={currentTurnId === topPlayer.id && !playedThisTrick.has(topPlayer.id)}
            bid={bids?.find(b => b?.name === topPlayer.name) || null}
          />

        </div>
      )}

      {/* Middle layout: Left - Trick - Right */}
      <div className="flex flex-1 justify-around items-center px-1 gap-1">
        {/* Left Player */}
        {leftPlayer && (
          <div className="flex-1 max-w-[70px]">
            <PlayerArea
                name={leftPlayer.name}
                tricks={tricksWon[leftPlayer.id] || 0}
                isCurrentTurn={currentTurnId === leftPlayer.id && !playedThisTrick.has(leftPlayer.id)}
                vertical
                bid={bids?.find(b => b?.name === leftPlayer.name) || null}
            />
          </div>
        )}

        {/* Trick or Bidding Area */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <Trick
            trick={trickCards}
            players={rotated}
          />
        </div>

        {/* Right Player */}
        {rightPlayer && (
          <div className="flex-1 max-w-[70px]">
            <PlayerArea
                name={rightPlayer.name}
                tricks={tricksWon[rightPlayer.id] || 0}
                isCurrentTurn={currentTurnId === rightPlayer.id && !playedThisTrick.has(rightPlayer.id)}
                vertical
                bid={bids?.find(b => b?.name === rightPlayer.name) || null}
            />

          </div>
        )}
      </div>

      {/* Bottom Player and Hand */}
      <div className="flex flex-col items-center pt-1 pb-2">
        {bottomPlayer && (
          <PlayerArea
            name={bottomPlayer.name || "You"}
            tricks={tricksWon[bottomPlayer.id] || 0}
            isCurrentTurn={currentTurnId === bottomPlayer.id && !playedThisTrick.has(bottomPlayer.id)}
            bid={bids?.find(b => b?.name === bottomPlayer.name) || null}
        />

        )}

        <div className="w-full px-1 overflow-hidden">
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
