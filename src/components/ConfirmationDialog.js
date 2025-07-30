import React from 'react';

function ConfirmationDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="confirmation-overlay">
      <div className="confirmation-dialog">
        <p className="confirmation-message">{message}</p>
        <div className="confirmation-buttons">
          <button onClick={onConfirm} className="confirm-button confirm-yes">Confirm</button>
          <button onClick={onCancel} className="confirm-button confirm-no">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog;