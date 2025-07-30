import React from 'react';

function CapturedPieces({ pieces }) {
  return (
    <div className="captured-pieces">
      <div className="captured-pieces-list">
        {pieces.map((piece, index) => (
          <span key={index} className="captured-piece-symbol" style={{ color: piece.color === 'white' ? '#f0f0f0' : '#3a3a3a' }}>
            {piece.symbol}
          </span>
        ))}
      </div>
    </div>
  );
}

export default CapturedPieces;
