import React, { useEffect, useRef } from 'react';

function MoveHistory({ history }) {
  const historyEndRef = useRef(null);

  // Automatically scroll to the latest move
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  return (
    <div className="move-history-container">
      <h3>Move History</h3>
      <ol className="move-history-list">
        {history.map((move, index) => (
          <li key={index}>
            <span className="move-number">{Math.floor(index / 2) + 1}.</span>
            <span className="move-notation">{move}</span>
          </li>
        ))}
        <div ref={historyEndRef} />
      </ol>
    </div>
  );
}

export default MoveHistory;