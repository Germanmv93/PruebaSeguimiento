import React from 'react';

const OPTIONS = [
  { value: 'Sin Incidencias', color: 'green', tooltip: 'Sin Incidencias' },
  { value: 'Observación',     color: 'yellow', tooltip: 'Observación' },
  { value: 'Riesgo o Problema', color: 'red',  tooltip: 'Riesgo o Problema' },
];

function TrafficLight({ fieldId, label, value, onChange }) {
  return (
    <div className="tl-row">
      <span className="tl-label" title={label}>{label}</span>
      <div className="tl-circles">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`circle-btn ${opt.color}${value === opt.value ? ' selected' : ''}`}
            onClick={() => onChange(fieldId, opt.value)}
            data-tooltip={opt.tooltip}
            aria-label={opt.tooltip}
            aria-pressed={value === opt.value}
          />
        ))}
      </div>
    </div>
  );
}

export default TrafficLight;
