import React, { useState } from 'react';

function DetailPopup({ fieldLabel, value, onSave, onClose }) {
  const [text, setText] = useState(value || '');

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={e => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="popup-header">
          <span>Detalle — {fieldLabel}</span>
          <button className="popup-close" onClick={onClose} type="button">✕</button>
        </div>
        <textarea
          className="popup-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Observaciones sobre ${fieldLabel}...`}
          autoFocus
          rows={4}
        />
        <div className="popup-actions">
          <button className="btn-secondary" onClick={onClose} type="button">Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => { onSave(text); onClose(); }}
            type="button"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DetailPopup;
