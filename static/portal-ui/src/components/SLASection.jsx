import React from 'react';

const OPTIONS = [
  { value: 'Sin Incidencias',   color: 'green',  tooltip: 'Sin Incidencias' },
  { value: 'Observación',       color: 'yellow', tooltip: 'Observación' },
  { value: 'Riesgo o Problema', color: 'red',    tooltip: 'Riesgo o Problema' },
];

const SLA_ROWS = [
  { selectorId: 'customfield_10279', percentId: 'customfield_10280', label: 'Penalizaciones',   percentLabel: '% Penalizaciones' },
  { selectorId: 'customfield_10281', percentId: 'customfield_10282', label: 'Respuesta',         percentLabel: '% SLA Respuesta' },
  { selectorId: 'customfield_10283', percentId: 'customfield_10284', label: 'Resolución',        percentLabel: '% SLA Resolución' },
  { selectorId: 'customfield_10285', percentId: 'customfield_10286', label: 'SLA Entregas',      percentLabel: '% SLA Entregas' },
  { selectorId: 'customfield_10287', percentId: 'customfield_10288', label: 'Otros SLAs',        percentLabel: '% Otros SLAs' },
];

function SLASection({ formData, onChange, onTextChange }) {
  return (
    <div className="sla-card">
      <div className="section-header">
        <span>📊</span>
        <span>Indicadores SLA</span>
      </div>
      <div className="sla-body">
        {SLA_ROWS.map((row) => (
          <div key={row.selectorId} className="sla-row">
            <span className="sla-label">{row.label}</span>
            <div className="tl-circles">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`circle-btn ${opt.color}${formData[row.selectorId] === opt.value ? ' selected' : ''}`}
                  onClick={() => onChange(row.selectorId, opt.value)}
                  data-tooltip={opt.tooltip}
                  aria-label={opt.tooltip}
                  aria-pressed={formData[row.selectorId] === opt.value}
                />
              ))}
            </div>
            <div className="percent-input-wrap">
              <span className="percent-label">{row.percentLabel}</span>
              <input
                type="text"
                className="percent-input"
                placeholder="ej: 98%"
                value={formData[row.percentId]}
                onChange={(e) => onTextChange(row.percentId, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SLASection;
