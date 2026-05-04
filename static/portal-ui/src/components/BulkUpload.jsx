import React, { useState, useRef } from 'react';
import { invoke } from '@forge/bridge';
import * as XLSX from 'xlsx';

/* ─────────────────────────── Definición de campos ─────────────────────────── */
const SECTIONS = [
  {
    name: 'INDICADORES CLIENTE', color: '#15803D', light: '#DCFCE7', text: '#166534',
    pairs: [
      { label: 'Cobro',         indCol: 'Cobro',        indId: 'customfield_10260', detCol: 'Det.Cobro',         detId: 'customfield_10289' },
      { label: 'Facturación',   indCol: 'Facturacion',  indId: 'customfield_10261', detCol: 'Det.Facturacion',   detId: 'customfield_10290' },
      { label: 'Renovación',    indCol: 'Renovacion',   indId: 'customfield_10264', detCol: 'Det.Renovacion',    detId: 'customfield_10291' },
      { label: 'Confianza',     indCol: 'Confianza',    indId: 'customfield_10265', detCol: 'Det.Confianza',     detId: 'customfield_10292' },
      { label: 'R. producción', indCol: 'R.produccion', indId: 'customfield_10266', detCol: 'Det.Rproduccion',   detId: 'customfield_10293' },
      { label: 'R. comercial',  indCol: 'R.comercial',  indId: 'customfield_10267', detCol: 'Det.Rcomercia',     detId: 'customfield_10294' },
      { label: 'Localización',  indCol: 'Localizacion', indId: 'customfield_10268', detCol: 'Det.Localizacion',  detId: 'customfield_10295' },
      { label: 'Oportunidades', indCol: 'Oportunidades',indId: 'customfield_10269', detCol: 'Det.Oportunidades', detId: 'customfield_10296' },
    ],
  },
  {
    name: 'INDICADORES PROYECTO', color: '#6D28D9', light: '#EDE9FE', text: '#5B21B6',
    pairs: [
      { label: 'Calidad',       indCol: 'Calidad',       indId: 'customfield_10270', detCol: 'Det.Calidad',       detId: 'customfield_10297' },
      { label: 'Planificación', indCol: 'Planificacion', indId: 'customfield_10271', detCol: 'Det.Planificacion', detId: 'customfield_10298' },
      { label: 'Margen',        indCol: 'Margen',        indId: 'customfield_10272', detCol: 'Det.Margen',        detId: 'customfield_10299' },
      { label: 'Alcance',       indCol: 'Alcance',       indId: 'customfield_10273', detCol: 'Det.Alcance',       detId: 'customfield_10300' },
    ],
  },
  {
    name: 'INDICADORES EQUIPO', color: '#1D4ED8', light: '#DBEAFE', text: '#1E40AF',
    pairs: [
      { label: 'Estado ánimo',  indCol: 'Estadoanimo',  indId: 'customfield_10274', detCol: 'Det.Estadoanimo',  detId: 'customfield_10301' },
      { label: 'Cohesión',      indCol: 'Cohesion',     indId: 'customfield_10275', detCol: 'Det.Cohesion',     detId: 'customfield_10302' },
      { label: 'Capacidad',     indCol: 'Capacidad',    indId: 'customfield_10276', detCol: 'Det.Capacidad',    detId: 'customfield_10303' },
      { label: 'Fuga talento',  indCol: 'Fugatalento',  indId: 'customfield_10277', detCol: 'Det.Fugatalento',  detId: 'customfield_10304' },
      { label: 'Conocimiento',  indCol: 'Conocimiento', indId: 'customfield_10278', detCol: 'Det.Conocimiento', detId: 'customfield_10305' },
    ],
  },
];

const ALL_PAIRS = SECTIONS.flatMap(s => s.pairs.map(p => ({ ...p, section: s })));

const STATUS_CFG = {
  SI: { color: '#15803D', bg: '#DCFCE7', label: 'Sin Incidencias' },
  OB: { color: '#92400E', bg: '#FEF9C3', label: 'Observacion' },
  RP: { color: '#B91C1C', bg: '#FEE2E2', label: 'Riesgo o Problema' },
};

const normalizeVal = (v = '') => {
  const c = v.trim().toLowerCase().replace(/[\s.]/g, '');
  if (['si', 'sinincidencias', 'sin', ''].includes(c)) return 'SI';
  if (['ob', 'observacion', 'obs'].includes(c)) return 'OB';
  if (['rp', 'riesgo', 'riesgooproblema', 'problema'].includes(c)) return 'RP';
  return 'SI';
};

/* ─────────────────────────── Parseo de archivos ─────────────────────────── */
function parseAny(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    reader.onload = (e) => {
      try {
        let rows = [];
        if (isCsv) {
          const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
          const headers = lines[0].split(';').map(h => h.trim().replace(/^﻿/, ''));
          rows = lines.slice(1).map((line, idx) => {
            const vals = line.split(';').map(v => v.trim());
            const obj = { _row: idx + 2 };
            headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
            return obj;
          });
        } else {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', raw: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          // Encuentra la fila cabecera buscando "Proyecto"
          const headerIdx = all.findIndex(row => row.some(c => String(c).trim() === 'Proyecto'));
          if (headerIdx === -1) { resolve([]); return; }
          const headers = all[headerIdx].map(h => String(h).trim());
          rows = all.slice(headerIdx + 1)
            .filter(row => row.some(c => c !== ''))
            .map((row, i) => {
              const obj = { _row: headerIdx + i + 2 };
              headers.forEach((h, j) => { obj[h] = String(row[j] || '').trim(); });
              return obj;
            });
        }
        resolve(rows.filter(r => r['Proyecto'] || r['Fecha']));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    if (isCsv) reader.readAsText(file, 'UTF-8');
    else reader.readAsArrayBuffer(file);
  });
}

/* ─────────────────────────── Generación del Excel ─────────────────────────── */
function downloadTemplate() {
  // Colores
  const COL_GENERAL  = { bg: '#374151', fg: '#FFFFFF' };
  const TOTAL_COLS   = 2 + ALL_PAIRS.length * 2 + 1; // Proyecto+Fecha + pares + Desc

  const cell = (content, bg, fg = '#FFFFFF', bold = true, italic = false, align = 'center', wrap = false) => {
    const s = [
      `background-color:${bg}`,
      `color:${fg}`,
      bold ? 'font-weight:bold' : '',
      italic ? 'font-style:italic' : '',
      `text-align:${align}`,
      'vertical-align:middle',
      'border:1px solid rgba(0,0,0,0.15)',
      'padding:7px 9px',
      'font-family:Segoe UI,Calibri,Arial,sans-serif',
      'font-size:12px',
      wrap ? 'white-space:normal' : 'white-space:nowrap',
    ].filter(Boolean).join(';');
    return `<td style="${s}">${content}</td>`;
  };

  // ── Fila 1: Título ──────────────────────────────────────────────
  const titleRow = `<tr style="height:38px">
    <td colspan="${TOTAL_COLS}" style="background:linear-gradient(135deg,#1D4ED8,#4338CA);
      color:white;font-size:16px;font-weight:900;text-align:center;letter-spacing:1px;
      padding:10px;font-family:Segoe UI,Arial;border-bottom:3px solid #93C5FD;">
      📊 &nbsp;PLANTILLA SEGUIMIENTO DE SERVICIOS &nbsp;📊
    </td>
  </tr>`;

  // ── Fila 2: Cabeceras de sección ─────────────────────────────────
  let sectionRow = `<tr style="height:26px">`;
  sectionRow += cell('Datos Generales', COL_GENERAL.bg, COL_GENERAL.fg, true, false, 'center');
  sectionRow += `<td style="background:${COL_GENERAL.bg};border:1px solid rgba(0,0,0,.15)"></td>`;
  SECTIONS.forEach(s => {
    sectionRow += `<td colspan="${s.pairs.length * 2}"
      style="background:${s.color};color:white;font-weight:bold;text-align:center;
      font-size:12px;padding:6px;font-family:Segoe UI,Arial;border:1px solid rgba(0,0,0,.15);
      letter-spacing:.5px;">${s.name}</td>`;
  });
  sectionRow += cell('General', '#4B5563', '#FFFFFF');
  sectionRow += `</tr>`;

  // ── Fila 3: Cabeceras de columna ─────────────────────────────────
  let headerRow = `<tr style="height:32px">`;
  headerRow += cell('Proyecto',           '#1E3A5F', '#FFFFFF');
  headerRow += cell('Fecha (YYYY-MM-DD)', '#1E3A5F', '#FFFFFF');
  SECTIONS.forEach(s => {
    s.pairs.forEach(p => {
      headerRow += cell(`✦ ${p.label}`, s.color, '#FFFFFF');
      headerRow += cell(`✎ Detalle ${p.label}`, s.light, s.text, false, false, 'left');
    });
  });
  headerRow += cell('Descripción General', '#4B5563', '#FFFFFF');
  headerRow += `</tr>`;

  // ── Fila 4: Leyenda de valores ────────────────────────────────────
  const legendRow = `<tr style="height:22px">
    <td colspan="${TOTAL_COLS}" style="background:#F8FAFC;color:#64748B;font-size:11px;
      text-align:center;font-family:Segoe UI,Arial;border:1px solid #E2E8F0;padding:4px;font-style:italic;">
      Valores indicadores: &nbsp;
      <b style="background:#DCFCE7;color:#15803D;padding:1px 6px;border-radius:3px;">SI</b> Sin Incidencias &nbsp;&nbsp;
      <b style="background:#FEF9C3;color:#92400E;padding:1px 6px;border-radius:3px;">OB</b> Observacion &nbsp;&nbsp;
      <b style="background:#FEE2E2;color:#B91C1C;padding:1px 6px;border-radius:3px;">RP</b> Riesgo o Problema
    </td>
  </tr>`;

  // ── Fila 5: Ejemplo ───────────────────────────────────────────────
  const EXAMPLE = {
    Cobro: 'SI', 'Det.Cobro': '',
    Facturacion: 'OB', 'Det.Facturacion': 'Retraso en facturación Q2',
    Renovacion: 'SI', 'Det.Renovacion': '',
    Confianza: 'SI', 'Det.Confianza': '',
    'R.produccion': 'SI', 'Det.Rproduccion': '',
    'R.comercial': 'SI', 'Det.Rcomercia': '',
    Localizacion: 'SI', 'Det.Localizacion': '',
    Oportunidades: 'SI', 'Det.Oportunidades': '',
    Calidad: 'SI', 'Det.Calidad': '',
    Planificacion: 'RP', 'Det.Planificacion': 'Desviación en planificación',
    Margen: 'SI', 'Det.Margen': '',
    Alcance: 'SI', 'Det.Alcance': '',
    Estadoanimo: 'SI', 'Det.Estadoanimo': '',
    Cohesion: 'OB', 'Det.Cohesion': 'Incorporación reciente al equipo',
    Capacidad: 'SI', 'Det.Capacidad': '',
    Fugatalento: 'SI', 'Det.Fugatalento': '',
    Conocimiento: 'SI', 'Det.Conocimiento': '',
  };

  let exampleRow = `<tr style="height:28px">`;
  exampleRow += cell('AFFINITY', '#EFF6FF', '#1D4ED8', true, false, 'left');
  exampleRow += cell('2026-05-01', '#EFF6FF', '#1D4ED8', false, false, 'center');
  ALL_PAIRS.forEach(p => {
    const v = EXAMPLE[p.indCol] || 'SI';
    const det = EXAMPLE[p.detCol] || '';
    const cfg = STATUS_CFG[v];
    exampleRow += cell(`<b>${v}</b>`, cfg.bg, cfg.color, false, false, 'center');
    exampleRow += cell(det, '#FAFAFA', '#374151', false, false, 'left');
  });
  exampleRow += cell('Seguimiento mensual mayo', '#FAFAFA', '#374151', false, false, 'left');
  exampleRow += `</tr>`;

  // ── Filas vacías para rellenar ─────────────────────────────────────
  const emptyRow = () => {
    let r = `<tr style="height:26px">`;
    r += cell('', '#F0F9FF', '#94A3B8', false, true, 'left');
    r += cell('', '#F0F9FF', '#94A3B8', false, true, 'center');
    ALL_PAIRS.forEach(p => {
      r += cell('SI', '#F7FFF7', '#15803D', false, false, 'center');
      r += cell('', '#FFFFFF', '#374151', false, false, 'left');
    });
    r += cell('', '#FFFFFF', '#374151', false, false, 'left');
    r += `</tr>`;
    return r;
  };

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
      <x:SplitHorizontal>5</x:SplitHorizontal>
      <x:TopRowBottomPane>5</x:TopRowBottomPane>
      <x:ActivePane>2</x:ActivePane>
    </x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<table style="border-collapse:collapse;">
  ${titleRow}
  ${sectionRow}
  ${headerRow}
  ${legendRow}
  ${exampleRow}
  ${Array(15).fill(0).map(emptyRow).join('')}
</table>
</body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'plantilla_seguimiento.xls'; a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────── Componente principal ─────────────────────────── */
function BulkUpload({ espacios }) {
  const [rows, setRows]       = useState([]);
  const [editRows, setEditRows] = useState([]);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setParseError('');
    try {
      const parsed = await parseAny(file);
      setRows(parsed);
      setResults([]);
      setEditRows(parsed.map(row => {
        const m = espacios.find(e => e.label.toLowerCase() === (row['Proyecto'] || '').toLowerCase());
        return { espacioKey: m?.key || '', espacioLabel: m?.label || row['Proyecto'] || '' };
      }));
    } catch (e) {
      setParseError('No se pudo leer el archivo. Asegúrate de usar la plantilla descargada.');
    }
  };

  const updateProyecto = (idx, key) => {
    const esp = espacios.find(e => e.key === key);
    setEditRows(prev => prev.map((r, i) =>
      i === idx ? { espacioKey: key, espacioLabel: esp?.label || '' } : r
    ));
  };

  const handleSubmit = async () => {
    if (!rows.length) return;
    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: rows.length });
    const out = [];

    for (let i = 0; i < rows.length; i++) {
      setProgress({ current: i + 1, total: rows.length });
      try {
        const res = await invoke('createBulkIssue', {
          row: rows[i],
          espacioKey: editRows[i]?.espacioKey || '',
          espacioLabel: editRows[i]?.espacioLabel || '',
        });
        out.push({ label: editRows[i]?.espacioLabel, success: true, issueKey: res.issueKey });
      } catch (err) {
        out.push({ label: editRows[i]?.espacioLabel, success: false, error: err.message });
      }
    }

    setResults(out);
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
          <strong>Descarga la plantilla Excel</strong>, rellena los seguimientos y súbela directamente.<br />
          Acepta <code>.xlsx</code> / <code>.xls</code> / <code>.csv</code> — el proyecto se puede ajustar en la vista previa.
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
        <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx"
          style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        {rows.length === 0 ? (
          <>
            <div className="bulk-dropzone-icon">📂</div>
            <div className="bulk-dropzone-text">
              Arrastra tu Excel o CSV aquí, o <span className="link-style">haz clic para seleccionar</span>
            </div>
            <div style={{ fontSize: 11, color: '#97a0af', marginTop: 6 }}>
              Formatos aceptados: .xlsx · .xls · .csv
            </div>
          </>
        ) : (
          <div className="bulk-dropzone-loaded">
            ✅ <strong>{rows.length} filas cargadas</strong> — clic para cambiar fichero
          </div>
        )}
      </div>

      {parseError && (
        <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'10px 16px', borderRadius:6, fontSize:13 }}>
          ⚠ {parseError}
        </div>
      )}

      {/* Cards de preview */}
      {rows.length > 0 && results.length === 0 && (
        <>
          <div className="bulk-preview-header">
            <div>
              <strong>{rows.length}</strong> seguimientos
              {unmatched > 0 && <span className="bulk-warn"> · ⚠ {unmatched} sin proyecto</span>}
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

          <div className="bulk-cards">
            {rows.map((row, idx) => {
              const edit = editRows[idx] || {};
              return (
                <div key={idx} className={`bulk-card${!edit.espacioKey ? ' bulk-card-warn' : ''}`}>
                  <div className="bulk-card-header">
                    <span className="bulk-card-num">#{idx + 1}</span>
                    <div className="bulk-card-project">
                      <select
                        className={`bulk-project-select${!edit.espacioKey ? ' unmatched' : ''}`}
                        value={edit.espacioKey}
                        onChange={e => updateProyecto(idx, e.target.value)}
                      >
                        <option value="">— Seleccionar proyecto —</option>
                        {espacios.map(e => (
                          <option key={e.key} value={e.key}>{e.label}</option>
                        ))}
                      </select>
                    </div>
                    <span className="bulk-card-date">📅 {row['Fecha']}</span>
                  </div>

                  {SECTIONS.map(sec => (
                    <div key={sec.name} className="bulk-card-section">
                      <div className="bulk-section-title" style={{ background: sec.color }}>
                        {sec.name}
                      </div>
                      <div className="bulk-card-indicators">
                        {sec.pairs.map(p => {
                          const code = normalizeVal(row[p.indCol]);
                          const det  = row[p.detCol] || '';
                          const cfg  = STATUS_CFG[code];
                          return (
                            <div key={p.indCol} className="bulk-ind-item"
                              style={{ borderLeft: `3px solid ${cfg.color}`, background: cfg.bg }}>
                              <div className="bulk-ind-top">
                                <span className="bulk-ind-label">{p.label}</span>
                                <span className="bulk-ind-badge" style={{ background: cfg.color }}>
                                  {code}
                                </span>
                              </div>
                              {det && (
                                <div className="bulk-ind-detail" title={det}>✎ {det.length > 45 ? det.slice(0, 45) + '…' : det}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {row['Descripcion'] && (
                    <div className="bulk-card-desc">📝 {row['Descripcion']}</div>
                  )}
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
