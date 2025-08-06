import React, { useEffect, useRef } from 'react';

function MoveHistory({ history }) {
  const historyEndRef = useRef(null);

  // Automatically scroll to the latest move
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Group moves into pairs for display [ [whiteMove, blackMove], [whiteMove, blackMove], ... ]
  const movePairs = history.reduce((acc, move, index) => {
    if (index % 2 === 0) {
      // Start a new pair with White's move
      acc.push([move]);
    } else {
      // Add Black's move to the last pair
      acc[acc.length - 1].push(move);
    }
    return acc;
  }, []);

  return (
    <div className="move-history-container">
      <h3>Move History</h3>
      <ol className="move-history-list">
        {movePairs.map((pair, index) => (
          <li key={index}>
            <span className="move-number">{index + 1}.</span>
            <span className="move-notation white-move">{pair[0]}</span>
            {pair[1] && <span className="move-notation black-move">{pair[1]}</span>}
          </li>
        ))}
        <div ref={historyEndRef} />
      </ol>
    </div>
  );
}

export default MoveHistory;