// src/components/Hand.tsx
import React from "react";
import clsx from "clsx";
import { formatCard } from "../utils/formatCard";

type Props = {
  hand: string[];
  onPlayCard: (card: string) => void;
  canPlay: boolean;
  playableCards: string[];
  isAutoPlaying: boolean;
};

const Hand: React.FC<Props> = ({ hand, onPlayCard, canPlay, playableCards, isAutoPlaying }) => {
  return (
    <div className="flex flex-wrap justify-center gap-1 px-1">
      {hand.map((card) => {
          console.log(`Rendering card ${card}`);
        const { display, color } = formatCard(card);
        const disabled = !canPlay || (playableCards.length && !playableCards.includes(card));

        return (
          <button
            key={card}
            onClick={() => onPlayCard(card)}
            disabled={disabled || isAutoPlaying}
            className={clsx(
              "aspect-[2/3] w-[12vw] max-w-[50px] min-w-[32px] rounded-lg border-2 shadow font-mono text-xs sm:text-sm font-bold flex flex-col items-center justify-center transition-all duration-150",
              disabled
                ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-50"
                : "bg-white text-black border-gray-500 hover:bg-yellow-100 hover:scale-105",
              color
            )}
          >
            {display}
          </button>
        );
      })}
    </div>
  );
};

export default Hand;
