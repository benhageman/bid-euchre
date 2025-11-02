import React from "react";
import clsx from "clsx";
import { BidAmount, TrumpType } from "../types";

type Props = {
  scores: {
    team1: number;
    team2: number;
  };
  winningBid?: {
    name: string;
    amount: BidAmount;
    trump: TrumpType;
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
  const getBidDisplay = () => {
    if (!winningBid) return null;
    const suitEmoji = trumpMap[winningBid.trump]?.emoji || "";
    const colorClass = trumpMap[winningBid.trump]?.color || "";

    if (winningBid.amount === "moon") {
      return (
        <span className={clsx("font-mono", colorClass)}>
          🌙 {suitEmoji}
        </span>
      );
    }

    return (
      <span className={clsx("font-mono", colorClass)}>
        Bid: {winningBid.amount} {suitEmoji}
      </span>
    );
  };

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
          {getBidDisplay()}
        </div>
      )}
    </div>
  );
};

export default ScoreBoard;