import React from 'react';

function Square({ color, isSelected, isPossibleMove, isInCheck, onClick, children }) {
  const classNames = `square ${color === 'white' ? 'square-white' : 'square-black'} ${isSelected ? 'selected' : ''} ${isPossibleMove ? 'possible-move' : ''} ${isInCheck ? 'in-check' : ''}`;
  
  return (
    <div className={classNames} onClick={onClick}>
      {children}
    </div>
  );
}

export default Square;
