// src/components/BidPanel.tsx
import React, { useState } from "react";
import clsx from "clsx";
import { TrumpType, BidAmount } from "../types/BidTypes";

type Props = {
  onSubmitBid: (bid: { amount: BidAmount; trump: TrumpType }) => void;
  currentHighestBid: { amount: BidAmount; trump: TrumpType } | null;
};


const trumpMap: Record<TrumpType, { emoji: string; color: string }> = {
  spades: { emoji: "♠️", color: "text-black" },
  hearts: { emoji: "♥️", color: "text-red-600" },
  diamonds: { emoji: "♦️", color: "text-red-600" },
  clubs: { emoji: "♣️", color: "text-black" },
  high: { emoji: "⬆️", color: "text-black" },
  low: { emoji: "⬇️", color: "text-black" },
};

const BidPanel: React.FC<Props> = ({ onSubmitBid, currentHighestBid }) => {
  const [amount, setAmount] = useState<BidAmount>(0);
  const [trump, setTrump] = useState<TrumpType>("spades");

    const isValidBid = (
        bid: { amount: BidAmount; trump: TrumpType },
        currentHighestBid: { amount: BidAmount; trump: TrumpType } | null
    ): boolean => {
        if (bid.amount === 0) return true; // ✅ Always allow pass
        if (!currentHighestBid) return true;
        if (bid.amount === "moon") return true;
        if (currentHighestBid.amount === "moon") return false;

        const suits = ["spades", "hearts", "diamonds", "clubs"];
        const newAmt = typeof bid.amount === "number" ? bid.amount : 0;
        const curAmt = typeof currentHighestBid.amount === "number" ? currentHighestBid.amount : 0;

        if (newAmt > curAmt) return true;

        if (newAmt === curAmt) {
            if (bid.trump === "high" && currentHighestBid.trump !== "high") return true;
            if (suits.includes(bid.trump) && currentHighestBid.trump === "low") return true;
            return false;
        }

        return false;
        };



    const handleSubmit = () => {
        const bid = { amount, trump };
        if (trump && (amount === "moon" || typeof amount === "number" || amount === 0)) {
            if (isValidBid(bid, currentHighestBid)) {
            onSubmitBid(bid);
            } else {
            alert("Invalid bid.");
            }
        }
    };




  return (
    <div className="p-4 bg-green-900 rounded shadow-md text-white">
      <h2 className="text-lg font-semibold mb-2">Place Your Bid</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(trumpMap).map(([key, { emoji, color }]) => (
          <button
            key={key}
            onClick={() => setTrump(key as TrumpType)}
            className={clsx(
              "px-3 py-1 border rounded text-lg shadow",
              color,
              trump === key ? "bg-yellow-200" : "bg-white"
            )}
          >
            {emoji} {key}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <label htmlFor="amount">Bid Amount:</label>
        <select
            id="amount"
            value={amount.toString()}
            onChange={(e) =>
                setAmount(e.target.value === "moon" ? "moon" : Number(e.target.value))
            }
            className="text-black px-2 py-1 rounded"
            >
            <option value={0}>Pass</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
            ))}
            <option value="moon">Moon</option>
        </select>


        <button
            onClick={handleSubmit}
            disabled={!isValidBid({ amount, trump }, currentHighestBid)}
            className={clsx(
                "ml-auto px-4 py-2 rounded shadow",
                isValidBid({ amount, trump }, currentHighestBid)
                ? "bg-yellow-300 text-black"
                : "bg-gray-500 text-white cursor-not-allowed"
            )}
        >
        Submit Bid
        </button>
      </div>
    </div>
  );
};

export default BidPanel;
