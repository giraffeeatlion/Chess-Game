import React from 'react';

function RankLabels({ isFlipped }) {
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  const finalRanks = isFlipped ? [...ranks].reverse() : ranks;

  return (
    <div className="rank-labels">
      {finalRanks.map(rank => (
        <div key={rank} className="label">{rank}</div>
      ))}
    </div>
  );
}

export default RankLabels;
