import React from 'react';
import Square from './Square';
import Piece from './Piece';

function Board({ boardState, onSquareClick, selectedSquare, possibleMoves, checkStatus, isFlipped }) {
  // If the board is flipped, create a reversed version for rendering
  const finalBoard = isFlipped ? [...boardState].reverse().map(row => [...row].reverse()) : boardState;

  return (
    <div className="board">
      {finalBoard.map((row, rowIndex) => (
        <div className="board-row" key={rowIndex}>
          {row.map((piece, colIndex) => {
            // Translate rendered coordinates back to data coordinates if flipped
            const dataRow = isFlipped ? 7 - rowIndex : rowIndex;
            const dataCol = isFlipped ? 7 - colIndex : colIndex;

            const isSelected = selectedSquare && selectedSquare.row === dataRow && selectedSquare.col === dataCol;
            const isPossibleMove = possibleMoves.some(move => move.row === dataRow && move.col === dataCol);
            const pieceOnSquare = boardState[dataRow][dataCol]; // Always read from original board state
            const isInCheck = checkStatus.inCheck && pieceOnSquare && pieceOnSquare.type.toLowerCase() === 'k' && pieceOnSquare.color === checkStatus.color;
            
            return (
              <Square 
                key={colIndex} 
                color={(rowIndex + colIndex) % 2 === 0 ? 'white' : 'black'} 
                isSelected={isSelected} 
                isPossibleMove={isPossibleMove} 
                isInCheck={isInCheck} 
                onClick={() => onSquareClick(dataRow, dataCol)} // Pass original coordinates
              >
                <Piece piece={pieceOnSquare} />
              </Square>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default Board;