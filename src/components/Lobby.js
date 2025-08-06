import React from 'react';

// --- MODIFICATION: Add onStartSinglePlayer to the props ---
function Lobby({ onCreateGame, onJoinGame, onStartSinglePlayer, gameIdInput, setGameIdInput, gameMessage, onLogout, username }) {
  return (
    <div className="lobby">
      <h2>Welcome, {username}!</h2>
      
      {/* --- Multiplayer Section (Existing Code) --- */}
      <div className="multiplayer-section">
        <h3>Multiplayer</h3>
        <button onClick={onCreateGame} className="lobby-button">Create New Game</button>
        <div className="join-game">
          <input 
            type="text" 
            placeholder="Enter Game ID" 
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value.toUpperCase())}
            className="lobby-input"
          />
          <button onClick={onJoinGame} className="lobby-button">Join Game</button>
        </div>
      </div>

      {/* --- MODIFICATION START: Single Player Section --- */}
      <div className="lobby-divider"></div>
      
      <div className="single-player-section">
        <h3>Single Player</h3>
        <p>Play against the C++ Engine</p>
        <div className="color-selection">
          <button onClick={() => onStartSinglePlayer('white')} className="lobby-button">
            Play as White
          </button>
          <button onClick={() => onStartSinglePlayer('black')} className="lobby-button">
            Play as Black
          </button>
        </div>
      </div>
      {/* --- MODIFICATION END --- */}

      {gameMessage && <p className="lobby-message">{gameMessage}</p>}
      <button onClick={onLogout} className="logout-button">Logout</button>
    </div>
  );
}

export default Lobby;