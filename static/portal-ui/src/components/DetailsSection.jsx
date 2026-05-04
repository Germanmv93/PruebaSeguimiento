import React from 'react';

const DETAIL_FIELDS = [
  { id: 'customfield_10289', label: 'Detalle Cobro' },
  { id: 'customfield_10290', label: 'Detalle Facturación' },
  { id: 'customfield_10291', label: 'Detalle Renovación' },
  { id: 'customfield_10292', label: 'Detalle Confianza' },
  { id: 'customfield_10293', label: 'Detalle Relación con producción' },
  { id: 'customfield_10294', label: 'Detalle Relación comercial' },
  { id: 'customfield_10295', label: 'Detalle Localización' },
  { id: 'customfield_10296', label: 'Detalle Oportunidades' },
  { id: 'customfield_10297', label: 'Detalle Calidad' },
  { id: 'customfield_10298', label: 'Detalle Planificación' },
  { id: 'customfield_10299', label: 'Detalle Margen' },
  { id: 'customfield_10300', label: 'Detalle Alcance' },
  { id: 'customfield_10301', label: 'Detalle Estado de ánimo' },
  { id: 'customfield_10302', label: 'Detalle Cohesión' },
  { id: 'customfield_10303', label: 'Detalle Capacidad' },
  { id: 'customfield_10304', label: 'Detalle Fuga de talento' },
  { id: 'customfield_10305', label: 'Detalle Conocimiento' },
  { id: 'customfield_10306', label: 'Detalle Penalizaciones' },
  { id: 'customfield_10307', label: 'Detalle SLA Respuesta' },
  { id: 'customfield_10308', label: 'Detalle SLA Resolución' },
  { id: 'customfield_10309', label: 'Detalle SLA Entregas' },
  { id: 'customfield_10310', label: 'Detalle Otros SLAs' },
];

function DetailsSection({ formData, onChange }) {
  return (
    <div className="details-grid">
      {DETAIL_FIELDS.map((field) => (
        <div key={field.id} className="form-field">
          <label>{field.label}</label>
          <textarea
            rows={3}
            value={formData[field.id]}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={`${field.label}...`}
          />
        </div>
      ))}
    </div>
  );
}

export default DetailsSection;
