import React, { useState, useRef } from 'react';
import { invoke } from '@forge/bridge';

// Pares: cada indicador con su campo de detalle adyacente
const FIELD_PAIRS = [
  { label: 'Cobro',          indCol: 'Cobro',          indId: 'customfield_10260', detCol: 'Det.Cobro',         detId: 'customfield_10289' },
  { label: 'Facturación',    indCol: 'Facturacion',     indId: 'customfield_10261', detCol: 'Det.Facturacion',   detId: 'customfield_10290' },
  { label: 'Renovación',     indCol: 'Renovacion',      indId: 'customfield_10264', detCol: 'Det.Renovacion',    detId: 'customfield_10291' },
  { label: 'Confianza',      indCol: 'Confianza',       indId: 'customfield_10265', detCol: 'Det.Confianza',     detId: 'customfield_10292' },
  { label: 'R. producción',  indCol: 'R.produccion',    indId: 'customfield_10266', detCol: 'Det.Rproduccion',   detId: 'customfield_10293' },
  { label: 'R. comercial',   indCol: 'R.comercial',     indId: 'customfield_10267', detCol: 'Det.Rcomercia',     detId: 'customfield_10294' },
  { label: 'Localización',   indCol: 'Localizacion',    indId: 'customfield_10268', detCol: 'Det.Localizacion',  detId: 'customfield_10295' },
  { label: 'Oportunidades',  indCol: 'Oportunidades',   indId: 'customfield_10269', detCol: 'Det.Oportunidades', detId: 'customfield_10296' },
  { label: 'Calidad',        indCol: 'Calidad',         indId: 'customfield_10270', detCol: 'Det.Calidad',       detId: 'customfield_10297' },
  { label: 'Planificación',  indCol: 'Planificacion',   indId: 'customfield_10271', detCol: 'Det.Planificacion', detId: 'customfield_10298' },
  { label: 'Margen',         indCol: 'Margen',          indId: 'customfield_10272', detCol: 'Det.Margen',        detId: 'customfield_10299' },
  { label: 'Alcance',        indCol: 'Alcance',         indId: 'customfield_10273', detCol: 'Det.Alcance',       detId: 'customfield_10300' },
  { label: 'Estado ánimo',   indCol: 'Estadoanimo',     indId: 'customfield_10274', detCol: 'Det.Estadoanimo',   detId: 'customfield_10301' },
  { label: 'Cohesión',       indCol: 'Cohesion',        indId: 'customfield_10275', detCol: 'Det.Cohesion',      detId: 'customfield_10302' },
  { label: 'Capacidad',      indCol: 'Capacidad',       indId: 'customfield_10276', detCol: 'Det.Capacidad',     detId: 'customfield_10303' },
  { label: 'Fuga talento',   indCol: 'Fugatalento',     indId: 'customfield_10277', detCol: 'Det.Fugatalento',   detId: 'customfield_10304' },
  { label: 'Conocimiento',   indCol: 'Conocimiento',    indId: 'customfield_10278', detCol: 'Det.Conocimiento',  detId: 'customfield_10305' },
];

// Cabeceras del CSV en orden par (indicador, detalle, indicador, detalle...)
const TEMPLATE_HEADERS = [
  'Proyecto', 'Fecha',
  ...FIELD_PAIRS.flatMap(p => [p.indCol, p.detCol]),
  'Descripcion',
];

const STATUS_CONFIG = {
  SI: { color: '#22c55e', bg: '#f0fdf4', label: 'Sin Incidencias' },
  OB: { color: '#eab308', bg: '#fefce8', label: 'Observacion' },
  RP: { color: '#ef4444', bg: '#fff5f5', label: 'Riesgo o Problema' },
};

const normalizeVal = (v = '') => {
  const c = v.trim().toLowerCase().replace(/[\s.]/g, '');
  if (['si', 'sinincidencias', 'sin', ''].includes(c)) return 'SI';
  if (['ob', 'observacion', 'obs'].includes(c)) return 'OB';
  if (['rp', 'riesgo', 'riesgooproblema', 'problema'].includes(c)) return 'RP';
  return 'SI';
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim().replace(/^﻿/, ''));
  return lines.slice(1).map((line, idx) => {
    const values = line.split(';').map(v => v.trim());
    const obj = { _row: idx + 2 };
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

function downloadTemplate() {
  const exampleInd = ['SI', '', 'OB', 'Retraso en contrato', 'SI', '', 'SI', '', 'SI', '', 'SI', '', 'SI', '', 'SI', '',
    'SI', '', 'SI', '', 'RP', 'Margen bajo en Q2', 'SI', '', 'SI', '', 'SI', '', 'SI', '', 'SI', '', 'SI', ''];
  const rows = [
    TEMPLATE_HEADERS.join(';'),
    ['AFFINITY', '2026-05-01', ...exampleInd, 'Seguimiento mensual de mayo'].join(';'),
    ['NOMBRE_PROYECTO', 'YYYY-MM-DD', ...Array(34).fill('SI'), '', ''].join(';'),
  ];
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'plantilla_seguimiento.csv'; a.click();
  URL.revokeObjectURL(url);
}

function BulkUpload({ espacios }) {
  const [rows, setRows] = useState([]);       // filas parseadas del CSV
  const [editRows, setEditRows] = useState([]); // filas editables (proyecto seleccionado)
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setRows(parsed);
      setResults([]);
      // Auto-match proyecto con espacios
      setEditRows(parsed.map(row => {
        const matched = espacios.find(
          esp => esp.label.toLowerCase() === (row['Proyecto'] || '').toLowerCase()
        );
        return { espacioKey: matched?.key || '', espacioLabel: matched?.label || row['Proyecto'] || '' };
      }));
    };
    reader.readAsText(file, 'UTF-8');
  };

  const updateProyecto = (idx, key) => {
    const esp = espacios.find(e => e.key === key);
    setEditRows(prev => prev.map((r, i) => i === idx
      ? { espacioKey: key, espacioLabel: esp?.label || '' }
      : r
    ));
  };

  const handleSubmit = async () => {
    if (!rows.length) return;
    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: rows.length });
    const batchResults = [];

    for (let i = 0; i < rows.length; i++) {
      setProgress({ current: i + 1, total: rows.length });
      const row = rows[i];
      const edit = editRows[i];
      try {
        const res = await invoke('createBulkIssue', {
          row,
          espacioKey: edit.espacioKey,
          espacioLabel: edit.espacioLabel,
        });
        batchResults.push({ label: edit.espacioLabel, success: true, issueKey: res.issueKey });
      } catch (err) {
        batchResults.push({ label: edit.espacioLabel, success: false, error: err.message });
      }
    }

    setResults(batchResults);
    setIsProcessing(false);
    setProgress({ current: 0, total: 0 });
  };

  const successCount = results.filter(r => r.success).length;
  const failCount    = results.filter(r => !r.success).length;
  const unmatched    = editRows.filter(r => !r.espacioKey).length;

  return (
    <div className="bulk-container">

      {/* Instrucciones */}
      <div className="bulk-instructions">
        <div className="bulk-instructions-text">
          <strong>CSV separado por <code>;</code></strong> — cada indicador seguido de su campo de detalle.<br />
          Valores: <code>SI</code> · <code>OB</code> · <code>RP</code> — el proyecto se puede corregir en la vista previa.
        </div>
        <button className="btn-secondary" type="button" onClick={downloadTemplate}>
          ⬇ Descargar plantilla
        </button>
      </div>

      {/* Zona de upload */}
      <div
        className={`bulk-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        {rows.length === 0 ? (
          <>
            <div className="bulk-dropzone-icon">📂</div>
            <div className="bulk-dropzone-text">
              Arrastra el CSV aquí o <span className="link-style">haz clic para seleccionar</span>
            </div>
          </>
        ) : (
          <div className="bulk-dropzone-loaded">
            ✅ <strong>{rows.length} filas cargadas</strong> — clic para cambiar fichero
          </div>
        )}
      </div>

      {/* Preview cards */}
      {rows.length > 0 && results.length === 0 && (
        <>
          <div className="bulk-preview-header">
            <div>
              <span><strong>{rows.length}</strong> seguimientos</span>
              {unmatched > 0 && (
                <span className="bulk-warn"> · ⚠ {unmatched} sin proyecto asignado</span>
              )}
            </div>
            <button className="btn-primary" type="button" onClick={handleSubmit}
              disabled={isProcessing || unmatched === rows.length}>
              {isProcessing
                ? `Creando... ${progress.current}/${progress.total}`
                : `Crear ${rows.length} seguimientos`}
            </button>
          </div>

          {isProcessing && (
            <div className="bulk-progress-bar-wrap">
              <div className="bulk-progress-bar"
                style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          )}

          {/* Cards por seguimiento */}
          <div className="bulk-cards">
            {rows.map((row, idx) => {
              const edit = editRows[idx] || {};
              const desc = row['Descripcion'] || '';
              return (
                <div key={idx} className={`bulk-card${!edit.espacioKey ? ' bulk-card-warn' : ''}`}>
                  {/* Cabecera de la card */}
                  <div className="bulk-card-header">
                    <span className="bulk-card-num">#{idx + 1}</span>
                    <div className="bulk-card-project">
                      <select
                        className={`bulk-project-select${!edit.espacioKey ? ' unmatched' : ''}`}
                        value={edit.espacioKey}
                        onChange={e => updateProyecto(idx, e.target.value)}
                      >
                        <option value="">— Seleccionar proyecto —</option>
                        {espacios.map(esp => (
                          <option key={esp.key} value={esp.key}>{esp.label}</option>
                        ))}
                      </select>
                    </div>
                    <span className="bulk-card-date">{row['Fecha']}</span>
                  </div>

                  {/* Grid de indicadores */}
                  <div className="bulk-card-indicators">
                    {FIELD_PAIRS.map(pair => {
                      const code = normalizeVal(row[pair.indCol]);
                      const det  = row[pair.detCol] || '';
                      const cfg  = STATUS_CONFIG[code];
                      return (
                        <div key={pair.indCol}
                          className="bulk-ind-item"
                          style={{ borderLeft: `3px solid ${cfg.color}`, background: cfg.bg }}
                        >
                          <div className="bulk-ind-top">
                            <span className="bulk-ind-label">{pair.label}</span>
                            <span className="bulk-ind-badge" style={{ background: cfg.color }}>
                              {code}
                            </span>
                          </div>
                          {det && (
                            <div className="bulk-ind-detail" title={det}>
                              ✎ {det.length > 40 ? det.substring(0, 40) + '…' : det}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {desc && <div className="bulk-card-desc">📝 {desc}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="bulk-results">
          <div className={`bulk-results-summary ${failCount === 0 ? 'all-ok' : 'has-errors'}`}>
            {failCount === 0
              ? `✅ ${successCount} seguimientos creados correctamente`
              : `✅ ${successCount} creados · ❌ ${failCount} fallaron`}
          </div>
          <div className="bulk-table-wrap">
            <table className="bulk-table">
              <thead><tr><th>Proyecto</th><th>Estado</th><th>Issue / Error</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.success ? '' : 'row-error'}>
                    <td>{r.label}</td>
                    <td>{r.success ? '✅' : '❌'}</td>
                    <td>{r.success ? <strong>{r.issueKey}</strong> : r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-secondary" type="button"
            onClick={() => { setRows([]); setEditRows([]); setResults([]); }}>
            Nueva carga
          </button>
        </div>
      )}
    </div>
  );
}

export default BulkUpload;
