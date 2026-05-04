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

/* ─────────────────────────── Generación del Excel ─────────────────────────── */
async function downloadTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Seguimiento de Servicios';

  const ws = wb.addWorksheet('Seguimientos', {
    views: [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }],
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // ── Helpers de estilo ────────────────────────────────────────────
  const fill   = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const border = (color = 'FFD1D5DB') => ({
    top: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    left:  { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  });
  const font   = (argb, bold = false, sz = 11) => ({ color: { argb }, bold, name: 'Calibri', size: sz });
  const align  = (h = 'left', v = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });

  // ── Colores por columna ──────────────────────────────────────────
  const getStyle = (colIdx) => {
    if (colIdx < 2) return { bg: 'FF1E3A5F', fg: 'FFFFFFFF', isHeader: true };
    let offset = 2;
    for (const sec of SECTIONS) {
      const count = sec.pairs.length * 2;
      if (colIdx < offset + count) {
        const isDetail = (colIdx - offset) % 2 === 1;
        if (sec.name.includes('CLIENTE'))
          return isDetail ? { bg: 'FFD1FAE5', fg: 'FF065F46' } : { bg: 'FF15803D', fg: 'FFFFFFFF', isHeader: true };
        if (sec.name.includes('PROYECTO'))
          return isDetail ? { bg: 'FFEDE9FE', fg: 'FF5B21B6' } : { bg: 'FF6D28D9', fg: 'FFFFFFFF', isHeader: true };
        return isDetail ? { bg: 'FFDBEAFE', fg: 'FF1E40AF' } : { bg: 'FF1D4ED8', fg: 'FFFFFFFF', isHeader: true };
      }
      offset += count;
    }
    return { bg: 'FF374151', fg: 'FFFFFFFF', isHeader: true };
  };

  // ── Definir columnas ─────────────────────────────────────────────
  const colDefs = [
    { header: 'Proyecto',             width: 35 },
    { header: 'Fecha (YYYY-MM-DD)',   width: 18 },
  ];
  SECTIONS.forEach(sec => sec.pairs.forEach(p => {
    colDefs.push({ header: `✦ ${p.label}`,          width: 13 });
    colDefs.push({ header: `✎ Detalle ${p.label}`,  width: 34 });
  }));
  colDefs.push({ header: 'Descripción General', width: 42 });
  ws.columns = colDefs.map(c => ({ ...c, key: c.header }));

  // ── Fila 1: Cabeceras ────────────────────────────────────────────
  const hRow = ws.getRow(1);
  hRow.height = 30;
  colDefs.forEach((c, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = c.header;
    const st = getStyle(i);
    cell.fill   = fill(st.bg);
    cell.font   = font(st.fg, true, 11);
    cell.alignment = align('center', 'middle', true);
    cell.border = border('FFB0B0B0');
  });

  // ── Fila 2: Ejemplo ──────────────────────────────────────────────
  const EXAMPLE = {
    Cobro: 'SI',         'Det.Cobro': '',
    Facturacion: 'OB',   'Det.Facturacion': 'Retraso en facturación Q2',
    Renovacion: 'SI',    'Det.Renovacion': '',
    Confianza: 'SI',     'Det.Confianza': '',
    'R.produccion': 'SI','Det.Rproduccion': '',
    'R.comercial': 'SI', 'Det.Rcomercia': '',
    Localizacion: 'SI',  'Det.Localizacion': '',
    Oportunidades: 'SI', 'Det.Oportunidades': '',
    Calidad: 'SI',       'Det.Calidad': '',
    Planificacion: 'RP', 'Det.Planificacion': 'Desviación en planificación',
    Margen: 'SI',        'Det.Margen': '',
    Alcance: 'SI',       'Det.Alcance': '',
    Estadoanimo: 'SI',   'Det.Estadoanimo': '',
    Cohesion: 'OB',      'Det.Cohesion': 'Incorporación reciente al equipo',
    Capacidad: 'SI',     'Det.Capacidad': '',
    Fugatalento: 'SI',   'Det.Fugatalento': '',
    Conocimiento: 'SI',  'Det.Conocimiento': '',
  };
  const STATUS_FILL = {
    SI: { bg: 'FFDCFCE7', fg: 'FF15803D' },
    OB: { bg: 'FFFEF9C3', fg: 'FF92400E' },
    RP: { bg: 'FFFEE2E2', fg: 'FFB91C1C' },
  };

  const exVals = ['AFFINITY', '2026-05-01'];
  ALL_PAIRS.forEach(p => { exVals.push(EXAMPLE[p.indCol] || 'SI'); exVals.push(EXAMPLE[p.detCol] || ''); });
  exVals.push('Seguimiento mensual mayo');

  const exRow = ws.addRow(exVals);
  exRow.height = 22;
  exRow.eachCell({ includeEmpty: true }, (cell, ci) => {
    const idx = ci - 1;
    const v   = exVals[idx];
    if (idx >= 2 && (idx - 2) % 2 === 0 && STATUS_FILL[v]) {
      cell.fill = fill(STATUS_FILL[v].bg);
      cell.font = font(STATUS_FILL[v].fg, true);
      cell.alignment = align('center');
    } else {
      cell.fill = fill('FFFAFAFA');
      cell.font = font('FF374151');
      cell.alignment = align('left');
    }
    cell.border = border();
  });

  // ── Filas vacías con validación ──────────────────────────────────
  for (let r = 0; r < 15; r++) {
    const vals = ['', ''];
    ALL_PAIRS.forEach(() => { vals.push('SI'); vals.push(''); });
    vals.push('');
    const row = ws.addRow(vals);
    row.height = 21;
    row.eachCell({ includeEmpty: true }, (cell, ci) => {
      const idx = ci - 1;
      if (idx >= 2 && (idx - 2) % 2 === 0) {
        cell.fill = fill('FFF0FFF4');
        cell.font = font('FF15803D');
        cell.alignment = align('center');
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"SI,OB,RP"'],
          showDropDown: false,
          promptTitle: 'Indicador',
          prompt: 'SI = Sin Incidencias · OB = Observacion · RP = Riesgo o Problema',
          errorTitle: 'Valor inválido',
          error: 'Usa: SI, OB o RP',
        };
      } else if (idx >= 2) {
        cell.fill = fill('FFFFFFFF');
        cell.font = font('FF374151');
        cell.alignment = align('left');
      } else {
        cell.fill = fill('FFFAFAFA');
        cell.font = font('FF97A0AF', false, 10);
        cell.alignment = align('left');
      }
      cell.border = border();
    });
  }

  // ── Descargar ────────────────────────────────────────────────────
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'plantilla_seguimiento.xlsx'; a.click();
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
