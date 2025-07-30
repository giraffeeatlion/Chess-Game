import React from 'react';

function PromotionDialog({ color, onPromote }) {
  const promotionPieces = ['q', 'r', 'b', 'n'];
  const symbols = {
    'q': color === 'white' ? '♕' : '♛',
    'r': color === 'white' ? '♖' : '♜',
    'b': color === 'white' ? '♗' : '♝',
    'n': color === 'white' ? '♘' : '♞',
  };

  // Determine the dialog's color class based on the player's color
  const dialogColorClass = color === 'white' ? 'dialog-dark' : 'dialog-light';
  const textColorClass = color === 'white' ? 'text-light' : 'text-dark';
  const pieceColor = color === 'white' ? '#f0f0f0' : '#3a3a3a';

  return (
    <div className="promotion-overlay">
      <div className={`promotion-dialog ${dialogColorClass}`}>
        <h2 className={textColorClass}>Promote Pawn to:</h2>
        <div className="promotion-choices">
          {promotionPieces.map(pieceType => (
            <span 
              key={pieceType} 
              className="promotion-piece" 
              style={{ color: pieceColor }} 
              onClick={() => onPromote(pieceType)}
            >
              {symbols[pieceType]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PromotionDialog;