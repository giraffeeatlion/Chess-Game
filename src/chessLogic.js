/**
 * chessLogic.js
 * * This file contains the core logic for the chess game, including move generation,
 * validation, and game state evaluation (check, checkmate, stalemate).
 * * The key change in this version is the introduction of a non-recursive `isSquareAttacked`
 * function to resolve a "Maximum call stack size exceeded" error. The previous logic
 * created an infinite loop between `isKingInCheck` and `isValidKingMove`.
 * * This new approach is safer, more efficient, and correctly models chess rules.
 */

// --- Main Exported Functions ---

/**
 * Calculates all valid moves for a given piece.
 * @param {object} piece - The piece to move.
 * @param {object} from - The starting square { row, col }.
 * @param {Array<Array<object>>} board - The current board state.
 * @param {object|null} enPassantTarget - The en passant target square.
 * @param {object} castlingRights - The current castling rights.
 * @returns {Array<object>} A list of valid destination squares.
 */
function getAllValidMoves(piece, from, board, enPassantTarget, castlingRights) {
    try {
        if (!piece) return [];
        const validMoves = [];
        // First, get all moves the piece can theoretically make, without considering self-check.
        const pseudoLegalMoves = getPseudoLegalMoves(piece, from, board, enPassantTarget, castlingRights);

        // Then, for each pseudo-legal move, check if it would leave the king in check.
        for (const to of pseudoLegalMoves) {
            const tempBoard = board.map(row => [...row]);

            // Simulate the move on the temporary board
            tempBoard[to.row][to.col] = piece;
            tempBoard[from.row][from.col] = null;
            
            // Handle special cases for simulation (en passant capture)
            if (piece.type.toLowerCase() === 'p' && enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col) {
                tempBoard[from.row][to.col] = null;
            }
            // Note: Castling simulation is handled inside getPseudoLegalMoves by checking intermediate squares.

            // If the king of the moving color is NOT in check after the move, it's a valid move.
            if (!isKingInCheck(piece.color, tempBoard)) {
                validMoves.push(to);
            }
        }
        return validMoves;
    } catch (error) {
        console.error("Error in getAllValidMoves:", error);
        return [];
    }
}

/**
 * Determines if a king of a given color is currently in check.
 * @param {string} kingColor - 'white' or 'black'.
 * @param {Array<Array<object>>} board - The board state.
 * @returns {boolean} True if the king is in check, false otherwise.
 */
function isKingInCheck(kingColor, board) {
    try {
        const kingPosition = findKing(kingColor, board);
        if (!kingPosition) {
            // This case can happen during move simulation if a king is captured.
            return true; 
        }
        const opponentColor = kingColor === 'white' ? 'black' : 'white';
        return isSquareAttacked(kingPosition.row, kingPosition.col, opponentColor, board);
    } catch (error) {
        console.error("Error in isKingInCheck:", error);
        return false;
    }
}

/**
 * Determines the current status of the game (in-progress, Checkmate, or Stalemate).
 * @param {Array<Array<object>>} board - The board state.
 * @param {string} playerTurn - The color of the player whose turn it is.
 * @param {object|null} enPassantTarget - The en passant target square.
 * @param {object} castlingRights - The current castling rights.
 * @returns {string} The game status.
 */
function getGameStatus(board, playerTurn, enPassantTarget, castlingRights) {
    try {
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
    } catch (error) {
        console.error("Error in getGameStatus:", error);
        return 'in-progress'; // Fail safely
    }
}

/**
 * NEW: Converts a move to standard algebraic notation.
 * This function is now part of the core logic.
 * @param {object} piece - The piece that moved. Must include a 'from' property.
 * @param {object} to - The destination square.
 * @param {boolean} isCapture - Whether the move was a capture.
 * @param {boolean} isCheck - Whether the move resulted in a check.
 * @param {boolean} isCheckmate - Whether the move resulted in checkmate.
 * @param {boolean} isCastling - Whether the move was a castle.
 * @returns {string} The move in algebraic notation.
 */
function moveToAlgebraicNotation(piece, to, isCapture, isCheck, isCheckmate, isCastling) {
    if (isCastling) {
        return to.col > 4 ? 'O-O' : 'O-O-O';
    }
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    // FIX: The ranks array was previously inverted. This version correctly maps board rows to ranks.
    // Row 0 is rank '8', row 7 is rank '1'.
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']; 
    let notation = '';
    const pieceType = piece.type.toLowerCase();

    if (pieceType !== 'p') {
        notation += piece.type.toUpperCase();
    }

    if (isCapture) {
        if (pieceType === 'p') {
            // For pawn captures, include the departure file.
            notation += files[piece.from.col];
        }
        notation += 'x';
    }

    notation += files[to.col] + ranks[to.row];

    if (isCheckmate) {
        notation += '#';
    } else if (isCheck) {
        notation += '+';
    }
    return notation;
}


// --- Core Logic & Helper Functions ---

/**
 * Checks if a player has any valid moves available.
 * @private
 */
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

/**
 * Generates all pseudo-legal moves for a piece (doesn't check for self-check).
 * @private
 */
function getPseudoLegalMoves(piece, from, board, enPassantTarget, castlingRights) {
    const moves = [];
    const pieceType = piece.type.toLowerCase();

    switch (pieceType) {
        case 'p': return getPawnMoves(piece, from, board, enPassantTarget);
        case 'r': return getRookMoves(piece, from, board);
        case 'n': return getKnightMoves(piece, from, board);
        case 'b': return getBishopMoves(piece, from, board);
        case 'q': return [...getRookMoves(piece, from, board), ...getBishopMoves(piece, from, board)];
        case 'k': return getKingMoves(piece, from, board, castlingRights);
        default: return moves;
    }
}

/**
 * Checks if a square is attacked by an opponent. This function is non-recursive.
 * @private
 */
function isSquareAttacked(row, col, attackerColor, board) {
    // Check for pawn attacks
    const pawnDirection = attackerColor === 'white' ? 1 : -1;
    const pawnAttackSources = [
        { r: row + pawnDirection, c: col - 1 },
        { r: row + pawnDirection, c: col + 1 }
    ];
    for (const { r, c } of pawnAttackSources) {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece && piece.color === attackerColor && piece.type.toLowerCase() === 'p') {
                return true;
            }
        }
    }

    // Check for knight attacks
    const knightMoves = [ [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1] ];
    for (const [dr, dc] of knightMoves) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece && piece.color === attackerColor && piece.type.toLowerCase() === 'n') {
                return true;
            }
        }
    }

    // Check for king attacks
    const kingMoves = [ [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1] ];
    for (const [dr, dc] of kingMoves) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece && piece.color === attackerColor && piece.type.toLowerCase() === 'k') {
                return true;
            }
        }
    }

    // Check for sliding attacks (Rook, Bishop, Queen)
    const directions = [ [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1] ];
    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const r = row + i * dr;
            const c = col + i * dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) break; // Off board
            const piece = board[r][c];
            if (piece) {
                if (piece.color === attackerColor) {
                    const type = piece.type.toLowerCase();
                    const isRook = type === 'r';
                    const isBishop = type === 'b';
                    const isQueen = type === 'q';
                    // Check if the piece type matches the direction of attack
                    const isSlidingCorrectly = ((dr === 0 || dc === 0) && (isRook || isQueen)) || ((dr !== 0 && dc !== 0) && (isBishop || isQueen));
                    if (isSlidingCorrectly) {
                        return true;
                    }
                }
                break; // Path is blocked by another piece, so stop searching in this direction
            }
        }
    }

    return false;
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

// --- Individual Piece Move Generation ---

function getPawnMoves(piece, from, board, enPassantTarget) {
    const moves = [];
    const { color } = piece;
    const direction = color === 'white' ? -1 : 1;

    // 1. Single Push
    let r = from.row + direction;
    let c = from.col;
    if (r >= 0 && r < 8 && !board[r][c]) {
        moves.push({ row: r, col: c });
        // 2. Double Push
        const isStartingRow = (color === 'white' && from.row === 6) || (color === 'black' && from.row === 1);
        if (isStartingRow) {
            r = from.row + 2 * direction;
            if (!board[r][c]) {
                moves.push({ row: r, col: c });
            }
        }
    }

    // 3. Captures
    const captureCols = [from.col - 1, from.col + 1];
    r = from.row + direction;
    for (const capCol of captureCols) {
        if (capCol >= 0 && capCol < 8) {
            const destinationPiece = board[r][capCol];
            if (destinationPiece && destinationPiece.color !== color) {
                moves.push({ row: r, col: capCol });
            }
            // 4. En Passant
            if (enPassantTarget && r === enPassantTarget.row && capCol === enPassantTarget.col) {
                moves.push({ row: r, col: capCol });
            }
        }
    }
    return moves;
}

function getRookMoves(piece, from, board) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const r = from.row + i * dr;
            const c = from.col + i * dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
            const destinationPiece = board[r][c];
            if (destinationPiece) {
                if (destinationPiece.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
                break;
            }
            moves.push({ row: r, col: c });
        }
    }
    return moves;
}

function getBishopMoves(piece, from, board) {
    const moves = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const r = from.row + i * dr;
            const c = from.col + i * dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
            const destinationPiece = board[r][c];
            if (destinationPiece) {
                if (destinationPiece.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
                break;
            }
            moves.push({ row: r, col: c });
        }
    }
    return moves;
}

function getKnightMoves(piece, from, board) {
    const moves = [];
    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of knightMoves) {
        const r = from.row + dr;
        const c = from.col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const destinationPiece = board[r][c];
            if (!destinationPiece || destinationPiece.color !== piece.color) {
                moves.push({ row: r, col: c });
            }
        }
    }
    return moves;
}

function getKingMoves(piece, from, board, castlingRights) {
    const moves = [];
    const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    
    // Regular moves
    for (const [dr, dc] of kingMoves) {
        const r = from.row + dr;
        const c = from.col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const destinationPiece = board[r][c];
            if (!destinationPiece || destinationPiece.color !== piece.color) {
                moves.push({ row: r, col: c });
            }
        }
    }

    // Castling
    const opponentColor = piece.color === 'white' ? 'black' : 'white';
    if (!isSquareAttacked(from.row, from.col, opponentColor, board)) {
        // King-side castling
        if (castlingRights[piece.color]?.kingSide && !board[from.row][5] && !board[from.row][6]) {
            if (!isSquareAttacked(from.row, 5, opponentColor, board) && !isSquareAttacked(from.row, 6, opponentColor, board)) {
                moves.push({ row: from.row, col: 6 });
            }
        }
        // Queen-side castling
        if (castlingRights[piece.color]?.queenSide && !board[from.row][3] && !board[from.row][2] && !board[from.row][1]) {
            if (!isSquareAttacked(from.row, 3, opponentColor, board) && !isSquareAttacked(from.row, 2, opponentColor, board)) {
                moves.push({ row: from.row, col: 2 });
            }
        }
    }
    return moves;
}

// Make sure all necessary functions are exported
export { getAllValidMoves, isKingInCheck, getGameStatus, moveToAlgebraicNotation };