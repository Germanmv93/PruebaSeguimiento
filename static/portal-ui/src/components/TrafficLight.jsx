import React from 'react';

const OPTIONS = [
  { value: 'Sin Incidencias',   color: 'green',  tooltip: 'Sin Incidencias' },
  { value: 'Observacion',       color: 'yellow', tooltip: 'Observacion' },
  { value: 'Riesgo o Problema', color: 'red',    tooltip: 'Riesgo o Problema' },
];

function TrafficLight({ fieldId, label, value, onChange, hasDetail, onLabelClick }) {
  return (
    <div className="tl-row">
      <span
        className={`tl-label tl-label-btn${hasDetail ? ' has-detail' : ''}`}
        onClick={() => onLabelClick && onLabelClick(fieldId, label)}
        title={hasDetail ? 'Tiene detalle — clic para editar' : 'Clic para añadir detalle'}
      >
        {label}
        {hasDetail && <span className="detail-dot" />}
      </span>
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
