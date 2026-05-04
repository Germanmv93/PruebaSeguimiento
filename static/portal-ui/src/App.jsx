import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import './styles.css';
import IndicatorGroup from './components/IndicatorGroup';
import SLASection from './components/SLASection';
import DetailsSection from './components/DetailsSection';

const CLIENTE_FIELDS = [
  { id: 'customfield_10260', label: 'Cobro' },
  { id: 'customfield_10261', label: 'Facturación' },
  { id: 'customfield_10264', label: 'Renovación' },
  { id: 'customfield_10265', label: 'Confianza' },
  { id: 'customfield_10266', label: 'R. producción' },
  { id: 'customfield_10267', label: 'R. comercial' },
  { id: 'customfield_10268', label: 'Localización' },
  { id: 'customfield_10269', label: 'Oportunidades' },
];

const PROYECTO_FIELDS = [
  { id: 'customfield_10270', label: 'Calidad' },
  { id: 'customfield_10271', label: 'Planificación' },
  { id: 'customfield_10272', label: 'Margen' },
  { id: 'customfield_10273', label: 'Alcance' },
];

const EQUIPO_FIELDS = [
  { id: 'customfield_10274', label: 'Estado ánimo' },
  { id: 'customfield_10275', label: 'Cohesión' },
  { id: 'customfield_10276', label: 'Capacidad' },
  { id: 'customfield_10277', label: 'Fuga talento' },
  { id: 'customfield_10278', label: 'Conocimiento' },
];

const ALL_INDICATOR_IDS = [
  ...CLIENTE_FIELDS, ...PROYECTO_FIELDS, ...EQUIPO_FIELDS,
  { id: 'customfield_10279' }, { id: 'customfield_10281' },
  { id: 'customfield_10283' }, { id: 'customfield_10285' },
  { id: 'customfield_10287' },
].map(f => f.id);

const buildInitialState = () => {
  const base = {
    summary: '',
    espacioKey: '',
    customfield_10259: new Date().toISOString().split('T')[0],
    description: '',
    customfield_10280: '', customfield_10282: '', customfield_10284: '',
    customfield_10286: '', customfield_10288: '',
    customfield_10289: '', customfield_10290: '', customfield_10291: '',
    customfield_10292: '', customfield_10293: '', customfield_10294: '',
    customfield_10295: '', customfield_10296: '',
    customfield_10297: '', customfield_10298: '', customfield_10299: '',
    customfield_10300: '',
    customfield_10301: '', customfield_10302: '', customfield_10303: '',
    customfield_10304: '', customfield_10305: '',
    customfield_10306: '', customfield_10307: '', customfield_10308: '',
    customfield_10309: '', customfield_10310: '',
  };
  ALL_INDICATOR_IDS.forEach(id => { base[id] = 'Sin Incidencias'; });
  return base;
};

function App() {
  const [formData, setFormData] = useState(buildInitialState);
  const [espacios, setEspacios] = useState([]);
  const [loadingEspacios, setLoadingEspacios] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    invoke('getEspacios')
      .then(res => setEspacios(res.espacios || []))
      .catch(() => setEspacios([]))
      .finally(() => setLoadingEspacios(false));
  }, []);

  // Auto-generar Summary cuando cambia el proyecto o la fecha
  useEffect(() => {
    const espacio = espacios.find(e => e.key === formData.espacioKey);
    const label = espacio ? espacio.label : '';
    const fecha = formData.customfield_10259 || '';
    if (label && fecha) {
      setFormData(prev => ({
        ...prev,
        summary: `Seguimiento - ${label} - ${fecha}`,
      }));
    }
  }, [formData.espacioKey, formData.customfield_10259, espacios]);

  const handleChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.customfield_10259) {
      alert('La "Fecha de seguimiento" es obligatoria.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await invoke('createIssue', { formData });
      setResult({ ok: true, issueKey: res.issueKey });
    } catch (err) {
      setResult({ ok: false, message: err.message || 'Error desconocido' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(buildInitialState());
    setResult(null);
    setShowDetails(false);
  };

  if (result) {
    return (
      <div className="app-container result-screen">
        <div className={`result-card ${result.ok ? 'success' : 'error'}`}>
          <div className="result-icon">{result.ok ? '✅' : '❌'}</div>
          <div className="result-title">
            {result.ok ? '¡Seguimiento enviado correctamente!' : 'Error al enviar'}
          </div>
          {result.ok ? (
            <>
              <p className="result-message">El seguimiento fue creado en el proyecto SDE.</p>
              <div className="issue-key-badge">{result.issueKey}</div>
            </>
          ) : (
            <p className="result-message">{result.message}</p>
          )}
          <button className="btn-primary" onClick={handleReset} type="button">
            Nuevo seguimiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="page-title">Seguimiento de Servicios</h1>
      <p className="page-subtitle">
        Proyecto SDE · Registra el estado de los indicadores del período
      </p>

      <div className="legend">
        <span className="legend-title">Referencia:</span>
        <span className="legend-item"><span className="legend-dot green" /> Sin Incidencias</span>
        <span className="legend-item"><span className="legend-dot yellow" /> Observación</span>
        <span className="legend-item"><span className="legend-dot red" /> Riesgo o Problema</span>
      </div>

      {/* Cabecera: Proyecto + Fecha + Summary auto */}
      <div className="header-card">
        <div className="form-field">
          <label>Seguimiento del proyecto</label>
          <select
            value={formData.espacioKey}
            onChange={e => handleChange('espacioKey', e.target.value)}
            disabled={loadingEspacios}
            className="select-field"
          >
            <option value="">
              {loadingEspacios ? 'Cargando proyectos...' : '— Seleccionar proyecto —'}
            </option>
            {espacios.map(esp => (
              <option key={esp.key} value={esp.key}>
                {esp.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Fecha de seguimiento *</label>
          <input
            type="date"
            value={formData.customfield_10259}
            onChange={e => handleChange('customfield_10259', e.target.value)}
          />
        </div>
        {formData.summary ? (
          <div className="form-field">
            <label>Título generado</label>
            <div className="summary-preview">{formData.summary}</div>
          </div>
        ) : null}
      </div>

      <div className="indicators-grid">
        <IndicatorGroup
          title="Indicadores CLIENTE"
          icon="✅"
          colorClass="cliente"
          fields={CLIENTE_FIELDS}
          formData={formData}
          onChange={handleChange}
        />
        <IndicatorGroup
          title="Indicadores PROYECTO"
          icon="🔷"
          colorClass="proyecto"
          fields={PROYECTO_FIELDS}
          formData={formData}
          onChange={handleChange}
        />
        <IndicatorGroup
          title="Indicadores EQUIPO"
          icon="🔵"
          colorClass="equipo"
          fields={EQUIPO_FIELDS}
          formData={formData}
          onChange={handleChange}
        />
      </div>

      <SLASection
        formData={formData}
        onChange={handleChange}
        onTextChange={handleChange}
      />

      <div className="bottom-card">
        <label className="desc-label">Descripción</label>
        <textarea
          className="desc-textarea"
          value={formData.description}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="Observaciones generales del período..."
          rows={4}
        />

        <button
          type="button"
          className="details-toggle-btn"
          onClick={() => setShowDetails(v => !v)}
        >
          <span className={`toggle-arrow ${showDetails ? 'open' : ''}`}>▶</span>
          {showDetails ? 'Ocultar detalles adicionales' : 'Agregar detalles adicionales'}
        </button>

        {showDetails && (
          <DetailsSection formData={formData} onChange={handleChange} />
        )}
      </div>

      <div className="action-row">
        <button type="button" className="btn-secondary" onClick={handleReset}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><span className="spinner" /> Enviando...</>
          ) : (
            'Enviar seguimiento'
          )}
        </button>
      </div>
    </div>
  );
}

export default App;
