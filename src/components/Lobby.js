import React from 'react';

function Lobby({ onCreateGame, onJoinGame, gameIdInput, setGameIdInput, gameMessage, onLogout, username }) {
  return (
    <div className="lobby">
      <h2>Welcome, {username}!</h2>
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
      {gameMessage && <p className="lobby-message">{gameMessage}</p>}
      <button onClick={onLogout} className="logout-button">Logout</button>
    </div>
  );
}

export default Lobby;