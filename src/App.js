import './App.css';
// Import the new hook
import { useGame } from './hooks/useGame';

// Import all our components
import Board from './components/Board';
import CapturedPieces from './components/CapturedPieces';
import PromotionDialog from './components/PromotionDialog';
import Auth from './components/Auth';
import ConfirmationDialog from './components/ConfirmationDialog';
import MoveHistory from './components/MoveHistory';
import Lobby from './components/Lobby';

function App() {
  // Get all state and handlers from our custom hook
  const {
    board, playerTurn, selectedSquare, possibleMoves, capturedPieces, checkStatus,
    promotionData, gameOver, isBoardFlipped, user, gameMessage, authMessage, 
    gameId, gameIdInput, players, playerUsernames, username, confirmation, moveHistory,
    setGameIdInput, handleSignUp, handleLogin, handleLogout, handleCreateGame, 
    handleJoinGame, handleCopyGameId, handleSquareClick, handlePromotion, 
    handleConfirm, handleCancel, handleLeaveGame, getLeaveButtonText
  } = useGame();

  return (
    <div className="game">
      {confirmation && (
        <ConfirmationDialog 
          message={confirmation.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {promotionData && (<PromotionDialog color={promotionData.color} onPromote={handlePromotion} />)}
      
      <h1>React Chess</h1>

      {!user ? (
        <Auth onSignUp={handleSignUp} onLogin={handleLogin} authMessage={authMessage} />
      ) : !gameId ? (
        <Lobby 
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          gameIdInput={gameIdInput}
          setGameIdInput={setGameIdInput}
          gameMessage={gameMessage}
          onLogout={handleLogout}
          username={username}
        />
      ) : (
        <div className="main-layout">
          <div className="game-area">
            <div className="game-info">
              Game ID: <span className="game-id" onClick={handleCopyGameId}>{gameId}</span>
            </div>
            <div className="game-message">{gameMessage}</div>
            <div className="player-info">
              <p><strong>White:</strong> <span className="player-id">{playerUsernames.white || '...'}</span></p>
              <p><strong>Black:</strong> <span className="player-id">{playerUsernames.black || 'Waiting...'}</span></p>
            </div>
            <CapturedPieces pieces={capturedPieces.white} />
            <div className="game-status">{gameOver ? gameOver : `${playerTurn.charAt(0).toUpperCase() + playerTurn.slice(1)}'s Turn`}</div>

            <Board 
              boardState={board} 
              onSquareClick={handleSquareClick}
              selectedSquare={selectedSquare}
              possibleMoves={possibleMoves}
              checkStatus={checkStatus}
              isFlipped={isBoardFlipped}
            />
            <CapturedPieces pieces={capturedPieces.black} />
            <div className="game-controls">
              <button onClick={handleLeaveGame} className="leave-button">{getLeaveButtonText()}</button>
            </div>
          </div>
          <MoveHistory history={moveHistory} />
        </div>
      )}
    </div>
  );
}

export default App;