import React from 'react';
import TrafficLight from './TrafficLight';

function IndicatorGroup({ title, icon, colorClass, fields, formData, onChange }) {
  return (
    <div className={`indicator-group ${colorClass}`}>
      <div className="group-header">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="group-body">
        {fields.map((field) => (
          <TrafficLight
            key={field.id}
            fieldId={field.id}
            label={field.label}
            value={formData[field.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

export default IndicatorGroup;
