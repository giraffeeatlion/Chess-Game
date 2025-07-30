export { getAllValidMoves, isKingInCheck, getGameStatus };

// --- Game Status Functions ---
function hasAnyValidMoves(playerColor, board, enPassantTarget, castlingRights) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === playerColor) {
        const moves = getAllValidMoves(piece, { row: r, col: c }, board, enPassantTarget, castlingRights);
        if (moves.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function getGameStatus(board, playerTurn, enPassantTarget, castlingRights) {
  const canMove = hasAnyValidMoves(playerTurn, board, enPassantTarget, castlingRights);
  if (canMove) {
    return 'in-progress';
  }
  const inCheck = isKingInCheck(playerTurn, board);
  if (inCheck) {
    return 'Checkmate';
  } else {
    return 'Stalemate';
  }
}

// --- Core Logic ---
function getAllValidMoves(piece, from, board, enPassantTarget, castlingRights) {
  if (!piece) return [];
  const validMoves = [];
  const pseudoLegalMoves = getPseudoLegalMoves(piece, from, board, enPassantTarget, castlingRights);

  for (const to of pseudoLegalMoves) {
    const tempBoard = board.map(row => [...row]);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;

    if (piece.type.toLowerCase() === 'p' && enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col) {
        tempBoard[from.row][to.col] = null;
    }
    if (piece.type.toLowerCase() === 'k' && Math.abs(from.col - to.col) === 2) {
        const rookCol = to.col > from.col ? 7 : 0;
        const newRookCol = to.col > from.col ? 5 : 3;
        tempBoard[from.row][newRookCol] = tempBoard[from.row][rookCol];
        tempBoard[from.row][rookCol] = null;
    }

    if (!isKingInCheck(piece.color, tempBoard)) {
      validMoves.push(to);
    }
  }
  return validMoves;
}

function getPseudoLegalMoves(piece, from, board, enPassantTarget, castlingRights) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const to = { row: r, col: c };
            if (isPieceMoveValid(piece, from, to, board, enPassantTarget, castlingRights)) {
                moves.push(to);
            }
        }
    }
    return moves;
}

function isKingInCheck(kingColor, board) {
  const kingPosition = findKing(kingColor, board);
  if (!kingPosition) return false;
  const opponentColor = kingColor === 'white' ? 'black' : 'white';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === opponentColor) {
        if (isPieceMoveValid(piece, { row: r, col: c }, kingPosition, board, null, {})) {
          return true;
        }
      }
    }
  }
  return false;
}

function isPieceMoveValid(piece, from, to, board, enPassantTarget, castlingRights) {
    const destinationPiece = board[to.row][to.col];
    if (destinationPiece && destinationPiece.color === piece.color) {
        return false;
    }
    switch (piece.type.toLowerCase()) {
        case 'p': return isValidPawnMove(piece, from, to, board, enPassantTarget);
        case 'r': return isValidRookMove(from, to, board);
        case 'n': return isValidKnightMove(from, to);
        case 'b': return isValidBishopMove(from, to, board);
        case 'q': return isValidRookMove(from, to, board) || isValidBishopMove(from, to, board);
        case 'k': return isValidKingMove(from, to, board, piece.color, castlingRights);
        default: return false;
    }
}

function findKing(kingColor, board) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type.toLowerCase() === 'k' && piece.color === kingColor) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// --- Individual Piece Movement Rules ---
function isValidKingMove(from, to, board, kingColor, castlingRights) {
  const rowDiff = Math.abs(from.row - to.row);
  const colDiff = Math.abs(from.col - to.col);
  
  if (Math.max(rowDiff, colDiff) === 1) {
    return true;
  }

  if (rowDiff === 0 && colDiff === 2) {
    if (isKingInCheck(kingColor, board)) {
      return false;
    }
    const isKingSide = to.col > from.col;
    const rights = castlingRights[kingColor] || {};
    if (isKingSide) {
      if (rights.kingSide && !board[from.row][5] && !board[from.row][6]) {
        const tempBoard1 = board.map(r => [...r]);
        tempBoard1[from.row][5] = tempBoard1[from.row][4];
        tempBoard1[from.row][4] = null;
        if (isKingInCheck(kingColor, tempBoard1)) return false;
        return true;
      }
    } else {
      if (rights.queenSide && !board[from.row][3] && !board[from.row][2] && !board[from.row][1]) {
        const tempBoard1 = board.map(r => [...r]);
        tempBoard1[from.row][3] = tempBoard1[from.row][4];
        tempBoard1[from.row][4] = null;
        if (isKingInCheck(kingColor, tempBoard1)) return false;
        return true;
      }
    }
  }
  return false;
}
function isValidPawnMove(piece, from, to, board, enPassantTarget) {
    const { color } = piece;
    const fromRow = from.row; const fromCol = from.col;
    const toRow = to.row; const toCol = to.col;
    const direction = color === 'white' ? -1 : 1;
    const destinationPiece = board[toRow][toCol];
    if (fromCol === toCol && toRow === fromRow + direction && !destinationPiece) return true;
    const isStartingRow = (color === 'white' && fromRow === 6) || (color === 'black' && fromRow === 1);
    if (isStartingRow && fromCol === toCol && toRow === fromRow + (2 * direction) && !destinationPiece && !board[fromRow + direction][toCol]) return true;
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction && destinationPiece) return true;
    if (enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col && Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
        return true;
    }
    return false;
}
function isValidRookMove(from, to, board) {
    if (from.row !== to.row && from.col !== to.col) return false;
    if (from.row === to.row) {
        const step = (to.col > from.col) ? 1 : -1;
        for (let col = from.col + step; col !== to.col; col += step) { if (board[from.row][col]) return false; }
    } else {
        const step = (to.row > from.row) ? 1 : -1;
        for (let row = from.row + step; row !== to.row; row += step) { if (board[row][from.col]) return false; }
    }
    return true;
}
function isValidBishopMove(from, to, board) {
    if (Math.abs(to.row - from.row) !== Math.abs(to.col - from.col)) return false;
    const rowStep = to.row > from.row ? 1 : -1;
    const colStep = to.col > from.col ? 1 : -1;
    let currentRow = from.row + rowStep; let currentCol = from.col + colStep;
    while (currentRow !== to.row) {
        if (board[currentRow][currentCol]) return false;
        currentRow += rowStep; currentCol += colStep;
    }
    return true;
}
function isValidKnightMove(from, to) {
    const rowDiff = Math.abs(from.row - to.row); const colDiff = Math.abs(from.col - to.col);
    return (rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1);
}
