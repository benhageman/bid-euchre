// src/components/BidDisplay.tsx
import React from "react";
import clsx from "clsx";

type Bid = {
  name: string;
  amount: number | "moon";
  trump: string;
};

type Props = {
  bids: (Bid | null | undefined)[]; // accepts null or missing
};

const trumpMap: Record<string, { emoji: string; color: string }> = {
  spades: { emoji: "♠️", color: "text-black" },
  hearts: { emoji: "♥️", color: "text-red-600" },
  diamonds: { emoji: "♦️", color: "text-red-600" },
  clubs: { emoji: "♣️", color: "text-black" },
  high: { emoji: "⬆️", color: "text-blue-500" },
  low: { emoji: "⬇️", color: "text-blue-500" },
};

const BidDisplay: React.FC<Props> = ({ bids }) => {
  return (
    <div className="mt-2 px-4 py-2 bg-white text-black rounded shadow w-full max-w-md mx-auto">
      <h3 className="font-bold text-lg mb-2">Bids</h3>
      <ul className="space-y-1">
        {bids.map((bid, index) => {
          if (!bid || !("amount" in bid)) {
            return null; // ✅ Skip uninitialized or malformed entries
          }

          if (bid.amount === 0) {
            return (
              <li key={index} className="text-gray-400">
                {bid.name} passed
              </li>
            );
          }

          const { emoji, color } = trumpMap[bid.trump] || { emoji: "", color: "" };

          return (
            <li key={index} className="flex gap-2 items-center">
              <span className="font-semibold">{bid.name}:</span>
              <span className={clsx("font-mono", color)}>
                {bid.amount === "moon" ? "🌙 Moon" : `${bid.amount} ${emoji}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BidDisplay;
