/**
 * Docs control primitives — labelled, keyboard-operable, no dependencies.
 *
 * These were written inside `Playground.tsx` for Stage 2 and moved here in
 * Stage 3 so the scene explorer and preset panel drive the rig with the *same*
 * controls, the same labels and the same CSS contract. Nothing about their
 * behaviour changed in the move.
 *
 * Docs-only: like the rest of `src/docs`, this is never exported from the barrel.
 */

import { ChevronDown } from 'lucide-react';

export function Group({
  icon,
  title,
  note,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pg-group">
      <div className="pg-group-title">
        {icon}
        {title}
        {note ? <span>{note}</span> : null}
      </div>
      <div className="pg-fields">{children}</div>
    </div>
  );
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="pg-field" htmlFor={id}>
      <span>
        {label}
        <output htmlFor={id}>{format(value)}</output>
      </span>
      <input
        id={id}
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Select({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="pg-field" htmlFor={id}>
      <span>{label}</span>
      <span className="pg-select">
        <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} />
      </span>
    </label>
  );
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="pg-field">
      <span>{label}</span>
      <div className="pg-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={value === o.id ? 'active' : ''}
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Switch({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="pg-switch-row">
      <span className="pg-switch-copy">
        <b>{label}</b>
        <small>{note}</small>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`pg-switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
