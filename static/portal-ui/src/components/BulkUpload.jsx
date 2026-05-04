import React, { useState, useRef } from 'react';
import { invoke } from '@forge/bridge';

const FIELD_MAP = {
  'Cobro':          'customfield_10260',
  'Facturacion':    'customfield_10261',
  'Renovacion':     'customfield_10264',
  'Confianza':      'customfield_10265',
  'R.produccion':   'customfield_10266',
  'R.comercial':    'customfield_10267',
  'Localizacion':   'customfield_10268',
  'Oportunidades':  'customfield_10269',
  'Calidad':        'customfield_10270',
  'Planificacion':  'customfield_10271',
  'Margen':         'customfield_10272',
  'Alcance':        'customfield_10273',
  'Estadoanimo':    'customfield_10274',
  'Cohesion':       'customfield_10275',
  'Capacidad':      'customfield_10276',
  'Fugatalento':    'customfield_10277',
  'Conocimiento':   'customfield_10278',
};

const INDICATOR_COLS = Object.keys(FIELD_MAP);

const TEMPLATE_HEADERS = [
  'Proyecto', 'Fecha',
  'Cobro', 'Facturacion', 'Renovacion', 'Confianza',
  'R.produccion', 'R.comercial', 'Localizacion', 'Oportunidades',
  'Calidad', 'Planificacion', 'Margen', 'Alcance',
  'Estadoanimo', 'Cohesion', 'Capacidad', 'Fugatalento', 'Conocimiento',
  'Descripcion',
];

const STATUS_COLORS = { '': 'inherit', SI: '#22c55e', OB: '#eab308', RP: '#ef4444' };

const normalizeVal = (v = '') => {
  const clean = v.trim().toLowerCase().replace(/\s+/g, '');
  if (['si', 'sinincidencias', 'sin'].includes(clean)) return 'SI';
  if (['ob', 'observacion', 'obs'].includes(clean)) return 'OB';
  if (['rp', 'riesgooprblema', 'riesgo', 'problema', 'riesgooproblema'].includes(clean)) return 'RP';
  if (clean === '') return 'SI';
  return 'SI';
};

const labelOf = (code) => ({ SI: 'Sin Incidencias', OB: 'Observacion', RP: 'Riesgo o Problema' }[code] || code);

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim().replace(/^﻿/, ''));
  return lines.slice(1).map((line, idx) => {
    const values = line.split(';').map(v => v.trim());
    const obj = { _row: idx + 2, _error: null };
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

function downloadTemplate() {
  const example = [
    'AFFINITY', '2026-05-01',
    'SI', 'SI', 'OB', 'SI', 'SI', 'SI', 'SI', 'SI',
    'SI', 'SI', 'SI', 'SI',
    'SI', 'SI', 'SI', 'SI', 'SI',
    'Descripcion de ejemplo',
  ];
  const rows = [TEMPLATE_HEADERS.join(';'), example.join(';')].join('\n');
  const blob = new Blob(['﻿' + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_seguimiento.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function BulkUpload({ espacios }) {
  const [rows, setRows] = useState([]);
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
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: rows.length });

    const batchResults = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress({ current: i + 1, total: rows.length });
      try {
        const res = await invoke('createBulkIssue', { row, espacios });
        batchResults.push({ proyecto: row['Proyecto'], success: true, issueKey: res.issueKey });
      } catch (err) {
        batchResults.push({ proyecto: row['Proyecto'], success: false, error: err.message });
      }
    }

    setResults(batchResults);
    setIsProcessing(false);
    setProgress({ current: 0, total: 0 });
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="bulk-container">

      {/* Instrucciones + descarga de plantilla */}
      <div className="bulk-instructions">
        <div className="bulk-instructions-text">
          <strong>Formato del CSV</strong> — separado por <code>;</code> (punto y coma).<br />
          Valores válidos para indicadores: <code>SI</code> (Sin Incidencias), <code>OB</code> (Observacion), <code>RP</code> (Riesgo o Problema).<br />
          El campo <em>Proyecto</em> debe coincidir exactamente con el nombre en Assets.
        </div>
        <button className="btn-secondary" type="button" onClick={downloadTemplate}>
          ⬇ Descargar plantilla CSV
        </button>
      </div>

      {/* Zona de upload */}
      <div
        className={`bulk-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {rows.length === 0 ? (
          <>
            <div className="bulk-dropzone-icon">📂</div>
            <div className="bulk-dropzone-text">
              Arrastra tu CSV aquí o <span className="link-style">haz clic para seleccionar</span>
            </div>
          </>
        ) : (
          <div className="bulk-dropzone-loaded">
            ✅ <strong>{rows.length} filas cargadas</strong> — haz clic para cambiar el fichero
          </div>
        )}
      </div>

      {/* Preview tabla */}
      {rows.length > 0 && results.length === 0 && (
        <>
          <div className="bulk-preview-header">
            <span>Vista previa — {rows.length} seguimientos</span>
            <button
              className="btn-primary"
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
            >
              {isProcessing
                ? `Creando... ${progress.current}/${progress.total}`
                : `Crear ${rows.length} seguimientos`}
            </button>
          </div>

          {isProcessing && (
            <div className="bulk-progress-bar-wrap">
              <div
                className="bulk-progress-bar"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}

          <div className="bulk-table-wrap">
            <table className="bulk-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Proyecto</th>
                  <th>Fecha</th>
                  {INDICATOR_COLS.map(c => <th key={c}>{c}</th>)}
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._row}>
                    <td className="bulk-td-num">{row._row - 1}</td>
                    <td><strong>{row['Proyecto']}</strong></td>
                    <td>{row['Fecha']}</td>
                    {INDICATOR_COLS.map(col => {
                      const code = normalizeVal(row[col]);
                      return (
                        <td key={col} style={{ textAlign: 'center' }}>
                          <span
                            className="bulk-status-dot"
                            style={{ background: STATUS_COLORS[code] }}
                            title={labelOf(code)}
                          />
                        </td>
                      );
                    })}
                    <td className="bulk-td-desc">{row['Descripcion']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <thead>
                <tr><th>Proyecto</th><th>Estado</th><th>Issue / Error</th></tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.success ? '' : 'row-error'}>
                    <td>{r.proyecto}</td>
                    <td>{r.success ? '✅' : '❌'}</td>
                    <td>{r.success ? <strong>{r.issueKey}</strong> : r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-secondary" type="button" onClick={() => { setRows([]); setResults([]); }}>
            Nueva carga
          </button>
        </div>
      )}
    </div>
  );
}

export default BulkUpload;
