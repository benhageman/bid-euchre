// src/utils/formatCard.ts
export const formatCard = (card: string) => {
  const value = card.slice(0, -1);
  const suit = card.slice(-1);

  const suitEmoji: { [key: string]: string } = {
    C: "♣️",
    D: "♦️",
    H: "♥️",
    S: "♠️",
  };

  const suitColor: { [key: string]: string } = {
    C: "text-black",
    D: "text-red-600",
    H: "text-red-600",
    S: "text-black",
  };

  return {
    display: `${value}${suitEmoji[suit] || ""}`,
    color: suitColor[suit] || "text-white",
  };
};
