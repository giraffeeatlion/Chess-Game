import React from 'react';

function Piece({ piece }) {
  if (!piece) return null;
  
  const pieceStyle = { color: piece.color === 'white' ? '#f0f0f0' : '#3a3a3a' };
  if (piece.color === 'white') {
    pieceStyle.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
  }
  
  return (
    <div className="piece" style={pieceStyle}>
      {piece.symbol}
    </div>
  );
}

export default Piece;
