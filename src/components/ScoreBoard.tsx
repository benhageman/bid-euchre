// src/components/ScoreBoard.tsx
import React from "react";

type Props = {
  scores: {
    team1: number;
    team2: number;
  };
};

const ScoreBoard: React.FC<Props> = ({ scores }) => {
  return (
    <div className="flex justify-center items-center space-x-8 text-xl font-bold">
      <div className="bg-blue-700 px-4 py-2 rounded-lg shadow">
        Team 1: {scores.team1}
      </div>
      <div className="bg-red-700 px-4 py-2 rounded-lg shadow">
        Team 2: {scores.team2}
      </div>
    </div>
  );
};

export default ScoreBoard;
