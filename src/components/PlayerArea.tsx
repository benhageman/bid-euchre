import React from "react";
import clsx from "clsx";

type Bid = {
  amount: number | "moon";
  trump: string;
};

type Props = {
  name: string;
  tricks: number;
  isCurrentTurn: boolean;
  vertical?: boolean;
  bid?: Bid | null;
  team?: number;
};

const trumpMap: Record<string, string> = {
  spades: "♠️",
  hearts: "♥️",
  diamonds: "♦️",
  clubs: "♣️",
  high: "⬆️",
  low: "⬇️",
};

const PlayerArea: React.FC<Props> = ({
  name,
  tricks,
  isCurrentTurn,
  vertical = false,
  bid = null,
  team,
}) => {
  const bidDisplay =
    bid &&
    (bid.amount === 0
      ? "Passed"
      : bid.amount === "moon"
      ? `🌙 ${trumpMap[bid.trump] || ""}`
      : `Bid: ${bid.amount} ${trumpMap[bid.trump] || ""}`);

  const borderColor =
    team === 1 ? "border-red-400" : team === 2 ? "border-blue-400" : "border-gray-400";

  return (
    <div
      className={clsx(
        "flex items-center justify-center",
        vertical ? "flex-col space-y-1" : "flex-row space-x-2"
      )}
    >
      {/* Bid outside box for top/bottom players */}
      {!vertical && bidDisplay && (
        <div className="ml-1 text-xs text-red-300 font-semibold">{bidDisplay}</div>
      )}

      <div
        className={clsx(
          "flex items-center justify-center p-2 border rounded-lg bg-green-700 text-white shadow",
          vertical ? "flex-col space-y-1" : "flex-row space-x-2",
          borderColor,
          isCurrentTurn && "ring-2 ring-yellow-300 animate-pulse"
        )}
      >
        <div className={clsx("font-bold", isCurrentTurn && "text-yellow-300")}>
          {name}
        </div>
        <div className="text-sm text-gray-300">Tricks: {tricks}</div>
      </div>

      {/* Bid below box for left/right players */}
      {vertical && bidDisplay && (
        <div className="mt-1 text-xs text-red-300 font-semibold">{bidDisplay}</div>
      )}
    </div>
  );
};

export default PlayerArea;
