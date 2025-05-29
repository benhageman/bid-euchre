// src/components/ScoreBoard.tsx
import React from "react";
import clsx from "clsx";

type Props = {
  scores: {
    team1: number;
    team2: number;
  };
  winningBid?: {
    name: string;
    amount: number | "moon";
    trump: string;
  };
};

const trumpMap: Record<string, { emoji: string; color: string }> = {
  spades: { emoji: "♠️", color: "text-black" },
  hearts: { emoji: "♥️", color: "text-red-600" },
  diamonds: { emoji: "♦️", color: "text-red-600" },
  clubs: { emoji: "♣️", color: "text-black" },
  high: { emoji: "⬆️", color: "text-blue-500" },
  low: { emoji: "⬇️", color: "text-blue-500" },
};

const ScoreBoard: React.FC<Props> = ({ scores, winningBid }) => {
  return (
    <div className="flex justify-center items-center space-x-4 text-xl font-bold flex-wrap">
      <div className="bg-blue-700 px-4 py-2 rounded-lg shadow">
        Team 1: {scores.team1}
      </div>
      <div className="bg-red-700 px-4 py-2 rounded-lg shadow">
        Team 2: {scores.team2}
      </div>
      {winningBid && (
        <div className="bg-yellow-300 text-black px-3 py-1 rounded-lg shadow text-sm flex items-center gap-2">
          <span>{winningBid.name} won:</span>
          <span className={clsx("font-mono", trumpMap[winningBid.trump]?.color)}>
            {winningBid.amount === "moon"
              ? "🌙 Moon"
              : `${winningBid.amount} ${trumpMap[winningBid.trump]?.emoji || ''}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default ScoreBoard;
