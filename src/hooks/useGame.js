import { useState, useEffect } from 'react';
import { getAllValidMoves, isKingInCheck, getGameStatus } from '../chessLogic';
import { playSound } from '../sound';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
// THIS IS THE FIX: Import the WebAssembly functions

// --- Helper function for Algebraic Notation ---
function moveToAlgebraicNotation(piece, to, isCapture, isCheck, isCheckmate, isCastling) {
  if (isCastling) {
    return to.col > 4 ? 'O-O' : 'O-O-O';
  }
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  let notation = '';
  const pieceType = piece.type.toLowerCase();
  if (pieceType !== 'p') {
    notation += piece.type.toUpperCase();
  }
  if (isCapture) {
    if (pieceType === 'p') {
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


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setUsername(docSnap.data().username);
        }
      } else {
        setUser(null);
        setUsername('');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!gameId) return;
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
      }
    });
    return () => unsubscribe();
  }, [gameId, user]);
  
  useEffect(() => {
    if (promotionData || gameOver || !gameId) return;
    const status = getGameStatus(board, playerTurn, enPassantTarget, castlingRights);
    if (status !== 'in-progress') {
      if (status === 'Checkmate') {
        const winner = playerTurn === 'white' ? 'Black' : 'White';
        setGameOver(`Checkmate! ${winner} wins.`);
      } else {
        setGameOver("Stalemate! It's a draw.");
      }
    }
  }, [playerTurn, board, enPassantTarget, promotionData, castlingRights, gameOver, gameId]);

  async function handleSignUp(email, password, newUsername) {
    setAuthMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await setDoc(doc(db, "users", newUser.uid), {
        username: newUsername,
        email: newUser.email,
      });
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
      }
    });
  }

  async function handleCreateGame() {
    if (!user) return;
    setGameMessage('Creating game...');

    const gamesRef = collection(db, "games");
    const q = query(gamesRef, where("players.white", "==", user.uid), where("status", "==", "waiting"));
    const querySnapshot = await getDocs(q);
    const maxGames = 3;

    if (querySnapshot.size >= maxGames) {
      setGameMessage(`You have reached the maximum limit of ${maxGames} active games.`);
      return;
    }

    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameDocRef = doc(db, "games", newGameId);

    const initialGameState = {
      board: JSON.stringify(initialBoard),
      playerTurn: 'white',
      players: { white: user.uid, black: null },
      status: 'waiting',
      capturedPieces: { white: [], black: [] },
      checkStatus: { inCheck: false, color: null },
      enPassantTarget: null,
      gameOver: null,
      castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true },
      },
      moveHistory: [],
    };

    await setDoc(gameDocRef, initialGameState);
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
        await setDoc(gameDocRef, { 
            players: { ...gameData.players, black: user.uid },
            status: 'active'
        }, { merge: true });
        setGameId(gameIdInput);
      } else if (gameData.players.white === user.uid || gameData.players.black === user.uid) {
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
      const textArea = document.createElement("textarea");
      textArea.value = gameId;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setGameMessage('Game ID copied to clipboard!');
      } catch (err) {
        setGameMessage('Failed to copy Game ID.');
        console.error('Failed to copy text: ', err);
      }
      document.body.removeChild(textArea);
      setTimeout(() => setGameMessage(''), 2000);
    }
  }

  async function handleSquareClick(row, col) {
    if (gameOver || promotionData || playerTurn !== playerColor) return;
    
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
          setBoard(newBoard);
          setPromotionData({ row: to.row, col: to.col, color: piece.color });
          setSelectedSquare(null);
          setPossibleMoves([]);
          return;
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
        const newMoveHistory = [...moveHistory, moveNotation];

        if (newCheckStatus.inCheck) {
          playSound('check');
        } else if (capturedPiece) {
          playSound('capture');
        } else {
          playSound('move');
        }

        const updateData = {
            board: JSON.stringify(newBoard),
            playerTurn: newPlayerTurn,
            castlingRights: newCastlingRights,
            enPassantTarget: newEnPassantTarget,
            capturedPieces: newCapturedPieces,
            checkStatus: newCheckStatus,
            gameOver: newGameOver,
            moveHistory: newMoveHistory,
        };
        
        const gameDocRef = doc(db, "games", gameId);
        await setDoc(gameDocRef, updateData, { merge: true });
      }
      
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }

  async function handlePromotion(promotedPieceType) {
    if (!promotionData) return;
    const { row, col, color } = promotionData;
    const symbols = {
      'q': color === 'white' ? '♕' : '♛', 'r': color === 'white' ? '♖' : '♜',
      'b': color === 'white' ? '♗' : '♝', 'n': color === 'white' ? '♘' : '♞',
    };
    const newPiece = {
      type: color === 'white' ? promotedPieceType.toUpperCase() : promotedPieceType,
      color: color,
      symbol: symbols[promotedPieceType]
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

    const lastMove = moveHistory[moveHistory.length - 1];
    const promotionNotation = lastMove + '=' + newPiece.type.toUpperCase();
    const newMoveHistory = [...moveHistory.slice(0, -1), promotionNotation];

    if (newCheckStatus.inCheck) {
      playSound('check');
    } else {
      playSound('move');
    }

    const updateData = {
        board: JSON.stringify(newBoard),
        playerTurn: newPlayerTurn,
        checkStatus: newCheckStatus,
        gameOver: newGameOver,
        moveHistory: newMoveHistory,
    };
    
    const gameDocRef = doc(db, "games", gameId);
    await setDoc(gameDocRef, updateData, { merge: true });

    setPromotionData(null);
  }

  const handleConfirm = () => {
    if (confirmation && confirmation.action) {
      confirmation.action();
    }
    setConfirmation(null);
  };

  const handleCancel = () => {
    setConfirmation(null);
  };

  async function handleLeaveGame() {
    if (!gameId || !user) return;
    if (gameOver) {
      setGameId(null);
      return;
    }
    if (players.black === null && players.white === user.uid) {
      setConfirmation({
        message: "Are you sure you want to delete this game lobby?",
        action: async () => {
          setGameMessage("Deleting game...");
          await deleteDoc(doc(db, "games", gameId));
          setGameId(null);
        }
      });
      return;
    }
    setConfirmation({
      message: "Are you sure you want to resign?",
      action: async () => {
        const winner = playerColor === 'white' ? 'Black' : 'White';
        const resignMessage = `Checkmate! ${winner} wins by resignation.`;
        await setDoc(doc(db, "games", gameId), { gameOver: resignMessage }, { merge: true });
      }
    });
  }

  const getLeaveButtonText = () => {
    if (gameOver) return "Back to Lobby";
    if (players.black === null && players.white === user.uid) return "Delete Game";
    return "Resign";
  };
  
  return {
    board, playerTurn, selectedSquare, possibleMoves, capturedPieces, checkStatus,
    promotionData, gameOver, isBoardFlipped, user, gameMessage, authMessage, 
    gameId, gameIdInput, players, playerUsernames, username, confirmation, moveHistory,
    authLoading, 
    setGameIdInput,
    handleSignUp, handleLogin, handleLogout, handleCreateGame, handleJoinGame,
    handleCopyGameId, handleSquareClick, handlePromotion, handleConfirm,
    handleCancel, handleLeaveGame, getLeaveButtonText
  };
}
