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
  // Estilos de celda
  const th = (bg, color = 'FFFFFF', bold = true) =>
    `background-color:${bg};color:#${color};font-weight:${bold ? 'bold' : 'normal'};` +
    `text-align:center;vertical-align:middle;border:1px solid #CCCCCC;padding:6px 8px;font-size:12px;white-space:nowrap;`;

  const td = (bg = 'FFFFFF', color = '172B4D', italic = false) =>
    `background-color:#${bg};color:#${color};border:1px solid #E0E0E0;padding:5px 8px;` +
    `font-size:12px;${italic ? 'font-style:italic;color:#888;' : ''}`;

  // Fila de cabecera
  let headerRow = `
    <td style="${th('#1D4ED8')}">Proyecto</td>
    <td style="${th('#1D4ED8')}">Fecha</td>
  `;
  FIELD_PAIRS.forEach(p => {
    headerRow += `<td style="${th('#15803D')}">✦ ${p.label}</td>`;
    headerRow += `<td style="${th('#D1FAE5', '065F46')}">✎ Detalle ${p.label}</td>`;
  });
  headerRow += `<td style="${th('#374151')}">Descripción</td>`;

  // Fila de ejemplo
  const exampleData = {
    Cobro: 'SI', 'Det.Cobro': '',
    Facturacion: 'OB', 'Det.Facturacion': 'Retraso en facturación Q2',
    Renovacion: 'SI', 'Det.Renovacion': '',
    Confianza: 'SI', 'Det.Confianza': '',
    'R.produccion': 'SI', 'Det.Rproduccion': '',
    'R.comercial': 'SI', 'Det.Rcomercia': '',
    Localizacion: 'SI', 'Det.Localizacion': '',
    Oportunidades: 'SI', 'Det.Oportunidades': '',
    Calidad: 'SI', 'Det.Calidad': '',
    Planificacion: 'RP', 'Det.Planificacion': 'Desviación en planificación del proyecto',
    Margen: 'SI', 'Det.Margen': '',
    Alcance: 'SI', 'Det.Alcance': '',
    Estadoanimo: 'SI', 'Det.Estadoanimo': '',
    Cohesion: 'SI', 'Det.Cohesion': '',
    Capacidad: 'SI', 'Det.Capacidad': '',
    Fugatalento: 'OB', 'Det.Fugatalento': 'Riesgo de baja de un perfil senior',
    Conocimiento: 'SI', 'Det.Conocimiento': '',
  };
  const STATUS_BG = { SI: 'F0FDF4', OB: 'FEFCE8', RP: 'FFF5F5' };
  const STATUS_FG = { SI: '15803D', OB: '92400E', RP: 'B91C1C' };

  let exampleRow = `
    <td style="${td('EFF6FF', '1D4ED8')}"><b>AFFINITY</b></td>
    <td style="${td('EFF6FF', '1D4ED8')}">01/05/2026</td>
  `;
  FIELD_PAIRS.forEach(p => {
    const v = exampleData[p.indCol] || 'SI';
    const det = exampleData[p.detCol] || '';
    exampleRow += `<td style="${td(STATUS_BG[v], STATUS_FG[v])}"><b>${v}</b></td>`;
    exampleRow += `<td style="${td('FFFFFF', '5E6C84')}">${det || ''}</td>`;
  });
  exampleRow += `<td style="${td()}">Seguimiento mensual</td>`;

  // Fila vacía para rellenar
  let emptyRow = `
    <td style="${td('F8F9FF', '97A0AF', true)}" colspan="1"><i>Nombre del proyecto</i></td>
    <td style="${td('F8F9FF', '97A0AF', true)}"><i>YYYY-MM-DD</i></td>
  `;
  FIELD_PAIRS.forEach(() => {
    emptyRow += `<td style="${td('F9FFF9')}"></td>`;
    emptyRow += `<td style="${td()}"></td>`;
  });
  emptyRow += `<td style="${td()}"></td>`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
        <x:ExcelWorksheet><x:Name>Seguimientos</x:Name>
        <x:WorksheetOptions>
          <x:FreezePanes/>
          <x:SplitHorizontal>1</x:SplitHorizontal>
          <x:TopRowBottomPane>1</x:TopRowBottomPane>
          <x:ActivePane>2</x:ActivePane>
        </x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head>
    <body>
      <table style="border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;">
        <tr style="height:32px;">${headerRow}</tr>
        <tr style="height:26px;">${exampleRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
        <tr style="height:26px;">${emptyRow}</tr>
      </table>
      <br/>
      <table style="font-family:Segoe UI,Arial,sans-serif;font-size:11px;color:#5E6C84;">
        <tr><td style="padding:4px 8px;background:#F4F5F7;border-radius:4px;">
          <b>Valores válidos para indicadores:</b> &nbsp;
          <span style="background:#D1FAE5;color:#065F46;padding:2px 6px;border-radius:3px;font-weight:bold;">SI</span> Sin Incidencias &nbsp;
          <span style="background:#FEF9C3;color:#92400E;padding:2px 6px;border-radius:3px;font-weight:bold;">OB</span> Observacion &nbsp;
          <span style="background:#FEE2E2;color:#B91C1C;padding:2px 6px;border-radius:3px;font-weight:bold;">RP</span> Riesgo o Problema
        </td></tr>
      </table>
    </body></html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_seguimiento.xls';
  a.click();
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
          <strong>Descarga la plantilla Excel</strong>, rellénala y súbela como CSV (Archivo → Guardar como → CSV delimitado por punto y coma).<br />
          Valores indicadores: <code>SI</code> · <code>OB</code> · <code>RP</code> — el proyecto se puede corregir en la vista previa.
        </div>
        <button className="btn-secondary" type="button" onClick={downloadTemplate}>
          ⬇ Descargar plantilla Excel
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
