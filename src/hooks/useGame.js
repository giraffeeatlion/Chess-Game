import { useState, useEffect } from 'react';
// FIX: Import the corrected notation function from chessLogic
import { getAllValidMoves, isKingInCheck, getGameStatus, moveToAlgebraicNotation } from '../chessLogic';
import { playSound } from '../sound';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// --- FEN Conversion & Move String Helpers ---

function boardToFen(board, playerTurn, castlingRights, enPassantTarget) {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        if (emptyCount > 0) { fen += emptyCount; emptyCount = 0; }
        fen += piece.type;
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) { fen += emptyCount; }
    if (r < 7) { fen += '/'; }
  }

  fen += playerTurn === 'white' ? ' w' : ' b';

  let castleString = '';
  if (castlingRights.white.kingSide) castleString += 'K';
  if (castlingRights.white.queenSide) castleString += 'Q';
  if (castlingRights.black.kingSide) castleString += 'k';
  if (castlingRights.black.queenSide) castleString += 'q';
  fen += castleString ? ` ${castleString}` : ' -';

  // --- MODIFICATION START: Correct en passant FEN logic ---
  if (enPassantTarget) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    // The FEN rank is 1-8. Board row is 0-7. `rank = 8 - row`.
    const rank = 8 - enPassantTarget.row;
    fen += ` ${files[enPassantTarget.col]}${rank}`;
  } else {
    fen += ' -';
  }
  // --- MODIFICATION END ---
  
  fen += ' 0 1';
  return fen;
}

/**
 * Parses the engine's move string, now handling the optional 5th character for promotions.
 */
function stringToMove(moveStr) {
    const files = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
    const fromCol = files[moveStr[0]];
    const fromRow = parseInt(moveStr[1], 10) - 1;
    const toCol = files[moveStr[2]];
    const toRow = parseInt(moveStr[3], 10) - 1;
    const promotion = moveStr.length === 5 ? moveStr[4] : null;
    return {
        from: { row: 7 - fromRow, col: fromCol },
        to: { row: 7 - toRow, col: toCol },
        promotion
    };
}

export function useGame() {
  const initialBoard = [
    [{ type: 'r', color: 'black', symbol: '♜' }, { type: 'n', color: 'black', symbol: '♞' }, { type: 'b', color: 'black', symbol: '♝' }, { type: 'q', color: 'black', symbol: '♛' }, { type: 'k', color: 'black', symbol: '♚' }, { type: 'b', color: 'black', symbol: '♝' }, { type: 'n', color: 'black', symbol: '♞' }, { type: 'r', color: 'black', symbol: '♜' }],
    [{ type: 'p', color: 'black', symbol: '♟' }, { type: 'p', color: 'black', symbol: '♟' }, { type: 'p', color: 'black', symbol: '♟' }, { type: 'p', color: 'black', symbol: '♟' }, { type: 'p', color: 'black', symbol: '♟' }, { type: 'p', color: 'black', symbol: '♟' }, { type: 'p', color: 'black', symbol: '♟' }, { type: 'p', color: 'black', symbol: '♟' }],
    [null, null, null, null, null, null, null, null],[null, null, null, null, null, null, null, null],[null, null, null, null, null, null, null, null],[null, null, null, null, null, null, null, null],
    [{ type: 'P', color: 'white', symbol: '♙' }, { type: 'P', color: 'white', symbol: '♙' }, { type: 'P', color: 'white', symbol: '♙' }, { type: 'P', color: 'white', symbol: '♙' }, { type: 'P', color: 'white', symbol: '♙' }, { type: 'P', color: 'white', symbol: '♙' }, { type: 'P', color: 'white', symbol: '♙' }, { type: 'P', color: 'white', symbol: '♙' }],
    [{ type: 'R', color: 'white', symbol: '♖' }, { type: 'N', color: 'white', symbol: '♘' }, { type: 'B', color: 'white', symbol: '♗' }, { type: 'Q', color: 'white', symbol: '♕' }, { type: 'K', color: 'white', symbol: '♔' }, { type: 'B', color: 'white', symbol: '♗' }, { type: 'N', color: 'white', symbol: '♘' }, { type: 'R', color: 'white', symbol: '♖' }],
  ];

  const [board, setBoard] = useState(initialBoard);
  const [playerTurn, setPlayerTurn] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [checkStatus, setCheckStatus] = useState({ inCheck: false, color: null });
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [promotionData, setPromotionData] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [castlingRights, setCastlingRights] = useState({
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true },
  });
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const [user, setUser] = useState(null);
  const [gameMessage, setGameMessage] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [gameId, setGameId] = useState(null);
  const [gameIdInput, setGameIdInput] = useState('');
  const [players, setPlayers] = useState({});
  const [playerUsernames, setPlayerUsernames] = useState({});
  const [playerColor, setPlayerColor] = useState(null);
  const [username, setUsername] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [engineModule, setEngineModule] = useState(null);
  const [engineMove, setEngineMove] = useState('');
  const [gameMode, setGameMode] = useState(null);
  const [aiColor, setAiColor] = useState(null);

  // --- Effects ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/engine/engine.js';
    script.onload = async () => {
        if (window.EngineModule) {
            const Module = await window.EngineModule();
            setEngineModule(Module);
            console.log("Chess Engine Module Loaded.");
        }
    };
    document.body.appendChild(script);
  }, []);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) { setUsername(docSnap.data().username); }
      } else {
        setUsername('');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (gameMode !== 'multiplayer' || !gameId) return;
    const gameDocRef = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const gameData = docSnap.data();
        setBoard(JSON.parse(gameData.board));
        setPlayerTurn(gameData.playerTurn);
        setCapturedPieces(gameData.capturedPieces);
        setCheckStatus(gameData.checkStatus);
        setEnPassantTarget(gameData.enPassantTarget);
        setCastlingRights(gameData.castlingRights);
        setGameOver(gameData.gameOver);
        setPlayers(gameData.players);
        setMoveHistory(gameData.moveHistory || []);
        const usernames = {};
        if (gameData.players.white) {
            const userDoc = await getDoc(doc(db, "users", gameData.players.white));
            usernames.white = userDoc.exists() ? userDoc.data().username : 'Player 1';
        }
        if (gameData.players.black) {
            const userDoc = await getDoc(doc(db, "users", gameData.players.black));
            usernames.black = userDoc.exists() ? userDoc.data().username : 'Player 2';
        }
        setPlayerUsernames(usernames);
        if (user && gameData.players.white === user.uid) {
            setPlayerColor('white');
            setIsBoardFlipped(false);
        } else if (user && gameData.players.black === user.uid) {
            setPlayerColor('black');
            setIsBoardFlipped(true);
        }
      } else {
        setGameMessage(`Game has been deleted.`);
        setGameId(null);
        setGameMode(null);
      }
    });
    return () => unsubscribe();
  }, [gameId, user, gameMode]);
  
  useEffect(() => {
    if (promotionData || gameOver) return;
    if (gameMode === 'multiplayer' && !gameId) return;
    if (!gameMode) return;

    const status = getGameStatus(board, playerTurn, enPassantTarget, castlingRights);
    if (status !== 'in-progress') {
      if (status === 'Checkmate') {
        const winner = playerTurn === 'white' ? 'Black' : 'White';
        setGameOver(`Checkmate! ${winner} wins.`);
      } else {
        setGameOver("Stalemate! It's a draw.");
      }
    }
  }, [playerTurn, board, enPassantTarget, promotionData, castlingRights, gameOver, gameId, gameMode]);

  useEffect(() => {
    if (gameMode !== 'singleplayer' || playerTurn !== aiColor || gameOver || promotionData) {
        return;
    }
    const makeEngineMove = async () => {
        if (!engineModule) { return; }
        
        console.group(`[ENGINE] AI Turn (${playerTurn})`);
        try {
            const fen = boardToFen(board, playerTurn, castlingRights, enPassantTarget);
            console.log("Sending FEN:", fen);

            const bestMoveStr = engineModule.findBestMove(fen, 6);
            console.log("Received raw move:", bestMoveStr);
            
            if (bestMoveStr && bestMoveStr !== 'no_move') {
                const { from, to, promotion } = stringToMove(bestMoveStr);
                console.log("Parsed move:", { from, to, promotion });

                const pieceToMove = board[from.row][from.col];
                if (!pieceToMove || pieceToMove.color !== playerTurn) {
                    console.error("CRITICAL ERROR: AI tried to move an invalid piece.", { bestMoveStr, from, to, piece: pieceToMove, playerTurn });
                    setGameMessage("Error: AI error, game halted.");
                    setGameOver("AI Error");
                    return;
                }
                const validMoves = getAllValidMoves(pieceToMove, from, board, enPassantTarget, castlingRights);
                const isAiMoveValid = validMoves.some(move => move.row === to.row && move.col === to.col);
                if (!isAiMoveValid) {
                    console.error("CRITICAL ERROR: AI generated an illegal move!", { move: bestMoveStr, from, to, piece: pieceToMove, "js_valid_moves": validMoves });
                    setGameMessage("Error: AI attempted an illegal move, game halted.");
                    setGameOver("AI Error");
                    return;
                }
                setTimeout(async () => {
                    await applyMove(from, to, promotion);
                }, 500);
            }
        } catch (error) {
            console.error("Error during engine move:", error);
        } finally {
            console.groupEnd();
        }
    };
    makeEngineMove();
  }, [playerTurn, gameMode, aiColor, gameOver, promotionData, engineModule]);

  // --- Handlers ---
  
  async function handleSignUp(email, password, newUsername) {
    setAuthMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await setDoc(doc(db, "users", newUser.uid), { username: newUsername, email: newUser.email });
    } catch (error) {
      setAuthMessage(error.message);
    }
  }

  async function handleLogin(email, password) {
    setAuthMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthMessage(error.message);
    }
  }

  function handleLogout() {
    setConfirmation({
        message: "Are you sure you want to logout?",
        action: () => {
            signOut(auth);
            setGameId(null);
            setGameMode(null);
        }
    });
  }

  async function applyMove(from, to, promotionPiece = null) {
    const piece = { ...board[from.row][from.col], from };
    const newBoard = board.map(r => [...r]);
    const isCastling = piece.type.toLowerCase() === 'k' && Math.abs(from.col - to.col) === 2;
    if (isCastling) {
        const rookFromCol = to.col > from.col ? 7 : 0;
        const rookToCol = to.col > from.col ? 5 : 3;
        newBoard[from.row][rookToCol] = newBoard[from.row][rookFromCol];
        newBoard[from.row][rookFromCol] = null;
    }
    let capturedPiece = board[to.row][to.col];
    const isEnPassant = piece.type.toLowerCase() === 'p' && enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col;
    if (isEnPassant) {
        capturedPiece = newBoard[from.row][to.col];
        newBoard[from.row][to.col] = null;
    }
    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;

    const isPromotion = piece.type.toLowerCase() === 'p' && (to.row === 0 || to.row === 7);

    if (isPromotion) {
        if (!promotionPiece) { // Human move: show dialog
            setBoard(newBoard);
            setPromotionData({ row: to.row, col: to.col, color: piece.color, from, captured: !!capturedPiece });
            setSelectedSquare(null);
            setPossibleMoves([]);
            return;
        } else { // AI move: auto-promote
            // FIX: Use separate symbol maps and ensure lowercase lookup to prevent crash
            const whiteSymbols = { 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘' };
            const blackSymbols = { 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞' };
            const newPieceType = (promotionPiece || 'q').toLowerCase();
            const newPiece = {
                type: piece.color === 'white' ? newPieceType.toUpperCase() : newPieceType,
                color: piece.color,
                symbol: piece.color === 'white' ? whiteSymbols[newPieceType] : blackSymbols[newPieceType]
            };
            newBoard[to.row][to.col] = newPiece;
        }
    }

    const newPlayerTurn = playerTurn === 'white' ? 'black' : 'white';
    const newCastlingRights = JSON.parse(JSON.stringify(castlingRights));
    if (piece.type.toLowerCase() === 'k') {
        newCastlingRights[piece.color].kingSide = false;
        newCastlingRights[piece.color].queenSide = false;
    }
    if (piece.type.toLowerCase() === 'r') {
        if (from.col === 0 && from.row === (piece.color === 'white' ? 7 : 0)) newCastlingRights[piece.color].queenSide = false;
        if (from.col === 7 && from.row === (piece.color === 'white' ? 7 : 0)) newCastlingRights[piece.color].kingSide = false;
    }
    const newEnPassantTarget = piece.type.toLowerCase() === 'p' && Math.abs(from.row - to.row) === 2 ? { row: (from.row + to.row) / 2, col: from.col } : null;
    const newCapturedPieces = capturedPiece ? {...capturedPieces, [piece.color]: [...capturedPieces[piece.color], capturedPiece]} : capturedPieces;
    const newCheckStatus = isKingInCheck(newPlayerTurn, newBoard) ? { inCheck: true, color: newPlayerTurn } : { inCheck: false, color: null };
    const gameStatus = getGameStatus(newBoard, newPlayerTurn, newEnPassantTarget, newCastlingRights);
    const isCheckmate = gameStatus === 'Checkmate';
    let newGameOver = null;
    if (gameStatus !== 'in-progress') {
        newGameOver = isCheckmate ? `Checkmate! ${playerTurn.charAt(0).toUpperCase() + playerTurn.slice(1)} wins.` : "Stalemate! It's a draw.";
    }
    
    const moveNotation = moveToAlgebraicNotation(piece, to, !!capturedPiece || isEnPassant, newCheckStatus.inCheck, isCheckmate, isCastling);
    let finalNotation = moveNotation;
    if (isPromotion && promotionPiece) {
        finalNotation += `=${promotionPiece.toUpperCase()}`;
    }
    const newMoveHistory = [...moveHistory, finalNotation];

    if (newCheckStatus.inCheck) playSound('check');
    else if (capturedPiece) playSound('capture');
    else playSound('move');

    if (gameMode === 'multiplayer') {
        const updateData = {
            board: JSON.stringify(newBoard), playerTurn: newPlayerTurn, castlingRights: newCastlingRights,
            enPassantTarget: newEnPassantTarget, capturedPieces: newCapturedPieces,
            checkStatus: newCheckStatus, gameOver: newGameOver, moveHistory: newMoveHistory,
        };
        await setDoc(doc(db, "games", gameId), updateData, { merge: true });
    } else {
        setBoard(newBoard);
        setPlayerTurn(newPlayerTurn);
        setCastlingRights(newCastlingRights);
        setEnPassantTarget(newEnPassantTarget);
        setCapturedPieces(newCapturedPieces);
        setCheckStatus(newCheckStatus);
        setGameOver(newGameOver);
        setMoveHistory(newMoveHistory);
    }
  }

  async function handleCreateGame() {
    if (!user) return;
    setGameMessage('Creating game...');
    const gamesRef = collection(db, "games");
    const q = query(gamesRef, where("players.white", "==", user.uid), where("status", "==", "waiting"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size >= 3) {
        setGameMessage(`You have reached the maximum limit of 3 active games.`);
        return;
    }
    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameDocRef = doc(db, "games", newGameId);
    const initialGameState = {
        board: JSON.stringify(initialBoard), playerTurn: 'white', players: { white: user.uid, black: null },
        status: 'waiting', capturedPieces: { white: [], black: [] }, checkStatus: { inCheck: false, color: null },
        enPassantTarget: null, gameOver: null,
        castlingRights: { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } },
        moveHistory: [],
    };
    await setDoc(gameDocRef, initialGameState);
    setGameMode('multiplayer');
    setGameId(newGameId);
  }

  async function handleJoinGame() {
    if (!user || !gameIdInput) return;
    setGameMessage(`Joining game ${gameIdInput}...`);
    const gameDocRef = doc(db, "games", gameIdInput);
    const docSnap = await getDoc(gameDocRef);
    if (docSnap.exists()) {
        const gameData = docSnap.data();
        if (gameData.players.black === null && gameData.players.white !== user.uid) {
            await setDoc(gameDocRef, { players: { ...gameData.players, black: user.uid }, status: 'active' }, { merge: true });
            setGameMode('multiplayer');
            setGameId(gameIdInput);
        } else if (gameData.players.white === user.uid || gameData.players.black === user.uid) {
            setGameMode('multiplayer');
            setGameId(gameIdInput);
        } else {
            setGameMessage("Game is full.");
        }
    } else {
        setGameMessage("Game not found.");
    }
  }

  function handleCopyGameId() {
    if (gameId) {
      navigator.clipboard.writeText(gameId).then(() => setGameMessage('Game ID copied!'))
      .catch(() => setGameMessage('Failed to copy Game ID.'));
      setTimeout(() => setGameMessage(''), 2000);
    }
  }

  function handleStartSinglePlayerGame(chosenColor) {
    setBoard(initialBoard);
    setPlayerTurn('white');
    setCapturedPieces({ white: [], black: [] });
    setCheckStatus({ inCheck: false, color: null });
    setEnPassantTarget(null);
    setCastlingRights({ white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } });
    setGameOver(null);
    setMoveHistory([]);
    setEngineMove('');
    const humanColor = chosenColor;
    const aiOpponentColor = chosenColor === 'white' ? 'black' : 'white';
    setPlayerColor(humanColor);
    setAiColor(aiOpponentColor);
    setIsBoardFlipped(humanColor === 'black');
    if (humanColor === 'white') {
        setPlayerUsernames({ white: username, black: 'C++ Engine' });
    } else {
        setPlayerUsernames({ white: 'C++ Engine', black: username });
    }
    setGameMode('singleplayer');
    setGameId(null);
    setGameMessage(`Single-player game started. You are ${humanColor}.`);
  }

  async function handleSquareClick(row, col) {
    if (gameOver || promotionData) return;
    if (gameMode === 'singleplayer' && playerTurn !== playerColor) return;
    if (gameMode === 'multiplayer' && playerTurn !== playerColor) return;
    
    if (!selectedSquare) {
        const piece = board[row][col];
        if (piece && piece.color === playerTurn) {
            const moves = getAllValidMoves(piece, { row, col }, board, enPassantTarget, castlingRights);
            setSelectedSquare({ row, col });
            setPossibleMoves(moves);
        }
    } else {
        const from = selectedSquare;
        const to = { row, col };
        const isMovePossible = possibleMoves.some(move => move.row === to.row && move.col === to.col);
        if (isMovePossible) {
            await applyMove(from, to);
        }
        setSelectedSquare(null);
        setPossibleMoves([]);
    }
  }

  async function handlePromotion(promotedPieceType) {
    if (!promotionData) return;
    const { row, col, color, from, captured } = promotionData;
    // FIX: Use separate symbol maps to prevent crash
    const whiteSymbols = { 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘' };
    const blackSymbols = { 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞' };
    const newPiece = {
        type: color === 'white' ? promotedPieceType.toUpperCase() : promotedPieceType,
        color: color,
        symbol: color === 'white' ? whiteSymbols[promotedPieceType] : blackSymbols[promotedPieceType]
    };
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = newPiece;
    
    const newPlayerTurn = playerTurn === 'white' ? 'black' : 'white';
    const newCheckStatus = isKingInCheck(newPlayerTurn, newBoard) ? { inCheck: true, color: newPlayerTurn } : { inCheck: false, color: null };
    const gameStatus = getGameStatus(newBoard, newPlayerTurn, enPassantTarget, castlingRights);
    const isCheckmate = gameStatus === 'Checkmate';
    let newGameOver = null;
    if (gameStatus !== 'in-progress') {
        newGameOver = isCheckmate ? `Checkmate! ${playerTurn.charAt(0).toUpperCase() + playerTurn.slice(1)} wins.` : "Stalemate! It's a draw.";
    }

    const basePiece = { type: 'p', from, color };
    const baseNotation = moveToAlgebraicNotation(basePiece, { row, col }, captured, newCheckStatus.inCheck, isCheckmate, false);
    const promotionNotation = baseNotation + '=' + newPiece.type.toUpperCase();
    const newMoveHistory = [...moveHistory, promotionNotation];

    if (newCheckStatus.inCheck) playSound('check');
    else playSound('move');

    if (gameMode === 'multiplayer') {
        const updateData = {
            board: JSON.stringify(newBoard), playerTurn: newPlayerTurn, checkStatus: newCheckStatus,
            gameOver: newGameOver, moveHistory: newMoveHistory,
        };
        await setDoc(doc(db, "games", gameId), updateData, { merge: true });
    } else {
        setBoard(newBoard);
        setPlayerTurn(newPlayerTurn);
        setCheckStatus(newCheckStatus);
        setGameOver(newGameOver);
        setMoveHistory(newMoveHistory);
    }
    setPromotionData(null);
  }

  const handleConfirm = () => {
    if (confirmation && confirmation.action) { confirmation.action(); }
    setConfirmation(null);
  };

  const handleCancel = () => {
    setConfirmation(null);
  };

  async function handleLeaveGame() {
    if (gameMode === 'singleplayer') {
        if (gameOver) { setGameMode(null); }
        else {
            setConfirmation({
                message: "Are you sure you want to resign?",
                action: () => setGameOver(`You resigned. The AI wins.`)
            });
        }
        return;
    }
    if (!gameId || !user) return;
    if (gameOver) {
        setGameId(null);
        setGameMode(null);
        return;
    }
    if (players.black === null && players.white === user.uid) {
        setConfirmation({
            message: "Are you sure you want to delete this game lobby?",
            action: async () => {
                await deleteDoc(doc(db, "games", gameId));
                setGameId(null);
                setGameMode(null);
            }
        });
        return;
    }
    setConfirmation({
        message: "Are you sure you want to resign?",
        action: async () => {
            const winner = playerColor === 'white' ? 'Black' : 'White';
            await setDoc(doc(db, "games", gameId), { gameOver: `${winner} wins by resignation.` }, { merge: true });
        }
    });
  }

  const getLeaveButtonText = () => {
    if (gameOver) return "Back to Lobby";
    if (gameMode === 'singleplayer') return "Resign";
    if (gameMode === 'multiplayer' && players.black === null && players.white === user.uid) return "Delete Game";
    return "Resign";
  };
 
  function handleGetEngineMove() {
    if (!engineModule) {
      setGameMessage("Engine is not loaded yet.");
      return;
    }
    try {
        console.group(`[ENGINE] Manual Hint Request (${playerTurn})`);
        const fen = boardToFen(board, playerTurn, castlingRights, enPassantTarget);
        console.log("Sending FEN:", fen);
        const bestMove = engineModule.findBestMove(fen, 6);
        console.log("Received raw move:", bestMove);
        setEngineMove(bestMove);
    } catch (error) {
        console.log(error);
        console.error("Error calling C++ engine:", error);
        setGameMessage("An error occurred with the chess engine.");
    } finally {
        console.groupEnd();
    }
  }

  return {
    board, playerTurn, selectedSquare, possibleMoves, capturedPieces, checkStatus,
    promotionData, gameOver, isBoardFlipped, user, gameMessage, authMessage,
    gameId, gameIdInput, players, playerUsernames, username, confirmation, moveHistory,
    authLoading, engineMove, gameMode,
    setGameIdInput,
    handleSignUp, handleLogin, handleLogout, handleCreateGame, handleJoinGame,
    handleCopyGameId, handleSquareClick, handlePromotion, handleConfirm,
    handleCancel, handleLeaveGame, getLeaveButtonText,
    handleGetEngineMove, handleStartSinglePlayerGame
  };
}