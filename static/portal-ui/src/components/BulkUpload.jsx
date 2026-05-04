import React, { useState, useRef } from 'react';
import { invoke } from '@forge/bridge';

const INDICATOR_MAP = {
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

const DETAIL_MAP = {
  'Det.Cobro':          'customfield_10289',
  'Det.Facturacion':    'customfield_10290',
  'Det.Renovacion':     'customfield_10291',
  'Det.Confianza':      'customfield_10292',
  'Det.Rproduccion':    'customfield_10293',
  'Det.Rcomercia':      'customfield_10294',
  'Det.Localizacion':   'customfield_10295',
  'Det.Oportunidades':  'customfield_10296',
  'Det.Calidad':        'customfield_10297',
  'Det.Planificacion':  'customfield_10298',
  'Det.Margen':         'customfield_10299',
  'Det.Alcance':        'customfield_10300',
  'Det.Estadoanimo':    'customfield_10301',
  'Det.Cohesion':       'customfield_10302',
  'Det.Capacidad':      'customfield_10303',
  'Det.Fugatalento':    'customfield_10304',
  'Det.Conocimiento':   'customfield_10305',
};

const INDICATOR_COLS = Object.keys(INDICATOR_MAP);
const DETAIL_COLS    = Object.keys(DETAIL_MAP);

const TEMPLATE_HEADERS = [
  'Proyecto', 'Fecha',
  // Indicadores (valores: SI / OB / RP)
  ...INDICATOR_COLS,
  // Detalles (texto libre)
  ...DETAIL_COLS,
  // Descripción general
  'Descripcion',
];

const EXAMPLE_ROW = [
  'AFFINITY', '2026-05-01',
  'SI', 'SI', 'OB', 'SI', 'SI', 'SI', 'SI', 'SI',
  'SI', 'SI', 'RP', 'SI',
  'SI', 'SI', 'SI', 'SI', 'SI',
  '', '', 'Retraso en renovación del contrato', '', '', '', '', '',
  '', '', 'Incidencia en margen Q2', '', '', '', '', '', '',
  'Seguimiento mensual de mayo',
];

const STATUS_COLORS = { SI: '#22c55e', OB: '#eab308', RP: '#ef4444' };

const normalizeVal = (v = '') => {
  const c = v.trim().toLowerCase().replace(/\s+/g, '');
  if (['si', 'sinincidencias', 'sin', ''].includes(c)) return 'SI';
  if (['ob', 'observacion', 'obs'].includes(c)) return 'OB';
  if (['rp', 'riesgo', 'riesgooproblema', 'problema'].includes(c)) return 'RP';
  return 'SI';
};

const labelOf = (c) => ({ SI: 'Sin Incidencias', OB: 'Observacion', RP: 'Riesgo o Problema' }[c] || c);

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
  const rows = [
    TEMPLATE_HEADERS.join(';'),
    EXAMPLE_ROW.join(';'),
    // Segunda fila vacía de ejemplo para que el usuario entienda la estructura
    ['NOMBRE_PROYECTO', 'YYYY-MM-DD',
      ...Array(17).fill('SI'),   // indicadores
      ...Array(17).fill(''),     // detalles
      '',                         // descripcion
    ].join(';'),
  ].join('\n');

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
      setRows(parseCSV(e.target.result));
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
    if (!rows.length) return;
    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: rows.length });
    const batchResults = [];

    for (let i = 0; i < rows.length; i++) {
      setProgress({ current: i + 1, total: rows.length });
      try {
        const res = await invoke('createBulkIssue', { row: rows[i], espacios });
        batchResults.push({ proyecto: rows[i]['Proyecto'], success: true, issueKey: res.issueKey });
      } catch (err) {
        batchResults.push({ proyecto: rows[i]['Proyecto'], success: false, error: err.message });
      }
    }

    setResults(batchResults);
    setIsProcessing(false);
    setProgress({ current: 0, total: 0 });
  };

  const successCount = results.filter(r => r.success).length;
  const failCount    = results.filter(r => !r.success).length;

  return (
    <div className="bulk-container">

      {/* Instrucciones */}
      <div className="bulk-instructions">
        <div className="bulk-instructions-text">
          <strong>CSV separado por <code>;</code></strong> — Indicadores: <code>SI</code> · <code>OB</code> · <code>RP</code><br />
          Los campos <em>Det.*</em> son texto libre para el detalle de cada indicador.<br />
          El nombre del Proyecto debe coincidir con el listado de Assets.
        </div>
        <button className="btn-secondary" type="button" onClick={downloadTemplate}>
          ⬇ Descargar plantilla completa
        </button>
      </div>

      {/* Zona de upload */}
      <div
        className={`bulk-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {rows.length === 0 ? (
          <>
            <div className="bulk-dropzone-icon">📂</div>
            <div className="bulk-dropzone-text">
              Arrastra el CSV aquí o <span className="link-style">haz clic para seleccionar</span>
            </div>
          </>
        ) : (
          <div className="bulk-dropzone-loaded">
            ✅ <strong>{rows.length} filas cargadas</strong> — haz clic para cambiar el fichero
          </div>
        )}
      </div>

      {/* Preview */}
      {rows.length > 0 && results.length === 0 && (
        <>
          <div className="bulk-preview-header">
            <span>{rows.length} seguimientos listos para crear</span>
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
                  {INDICATOR_COLS.map(c => (
                    <th key={c} title={c}>{c.substring(0, 5)}</th>
                  ))}
                  <th>Detalles</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const detailCount = DETAIL_COLS.filter(c => row[c]?.trim()).length;
                  return (
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
                      <td style={{ textAlign: 'center', color: detailCount ? '#0052cc' : '#97a0af' }}>
                        {detailCount > 0 ? `${detailCount} ✎` : '—'}
                      </td>
                      <td className="bulk-td-desc" title={row['Descripcion']}>
                        {row['Descripcion'] || '—'}
                      </td>
                    </tr>
                  );
                })}
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
          <button className="btn-secondary" type="button"
            onClick={() => { setRows([]); setResults([]); }}>
            Nueva carga
          </button>
        </div>
      )}
    </div>
  );
}

export default BulkUpload;
