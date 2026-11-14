import { useRef } from 'react';
import { Activity, ArrowLeftRight, Camera, ChevronDown, Glasses, ImagePlus, Layers, Palette, PersonStanding, SlidersHorizontal, Sparkles, Trash2, Upload, Backpack, Eye, Footprints, Gauge, MoveHorizontal, Waves, Wind, Users, Shirt, Scissors, MessageSquare, Crown, Headphones, Snowflake, Smile, CircleDot } from 'lucide-react';
import type { SceneSettings, CharacterColors, TimeOfDay, Motion, SceneId, HairStyle, Outfit, Build } from '../rig/types';
import { MOTIONS, HAIR_STYLES, OUTFITS, BUILDS, SCENES, TIMES_OF_DAY } from '../rig/types';
import { listCharacters } from '../rig/cast';

export interface Preset { id: string; name: string; settings: SceneSettings; custom?: boolean }
export interface ReferenceImage { id: string; name: string; url: string }

export function Section({ title, icon, children, hint }: { title: string; icon: React.ReactNode; children: React.ReactNode; hint?: string }) {
  return (
    <section className="inspector-section">
      <div className="section-heading"><span className="section-icon">{icon}</span><h3>{title}</h3>{hint && <span className="section-hint">{hint}</span>}</div>
      {children}
    </section>
  );
}

export function Slider({ label, value, min, max, step, onChange, format, icon }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; icon?: React.ReactNode }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider-row">
      <span className="slider-label"><span>{icon}{label}</span><output>{format ? format(value) : value.toFixed(2)}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--line) ${pct}%)` }} aria-label={label} />
    </label>
  );
}

export function Toggle({ label, checked, onChange, description, icon }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="toggle-row">
      <span className="toggle-copy"><span className="toggle-label">{icon}{label}</span>{description && <small>{description}</small>}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => <button key={o.id} type="button" className={value === o.id ? 'active' : ''} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

/** Labelled dropdown, for vocabularies too long for a segmented control. */
export function Picker<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <label className="picker-row">
      <span>{label}</span>
      <span className="select-wrap">
        <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <ChevronDown size={15} />
      </span>
    </label>
  );
}

const COLOR_LABELS: { key: keyof CharacterColors; label: string }[] = [
  { key: 'jacket', label: 'Garment' }, { key: 'pants', label: 'Pants' }, { key: 'skin', label: 'Skin' },
  { key: 'hair', label: 'Hair' }, { key: 'shoes', label: 'Shoes' }, { key: 'accent', label: 'Accent' },
];

export function Inspector({ settings, update, presets, activePreset, onPreset, onDeletePreset, onCharacter, references, activeReference, onReferenceSelect, onReferenceUpload, onReferenceRemove, referenceOpacity, onReferenceOpacity, showReference, onShowReference }: {
  settings: SceneSettings;
  update: (patch: Partial<SceneSettings>) => void;
  presets: Preset[];
  activePreset: string;
  onPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  onCharacter: (id: string) => void;
  references: ReferenceImage[];
  activeReference: number;
  onReferenceSelect: (i: number) => void;
  onReferenceUpload: (files: FileList | null) => void;
  onReferenceRemove: () => void;
  referenceOpacity: number;
  onReferenceOpacity: (v: number) => void;
  showReference: boolean;
  onShowReference: (v: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const active = presets.find((p) => p.id === activePreset);
  const cast = listCharacters();
  return (
    <aside className="inspector" aria-label="Live character controls">
      <div className="inspector-head">
        <div><SlidersHorizontal size={17} /><h2>Make it yours</h2></div>
        <span className="live-pill"><i />LIVE</span>
      </div>
      <div className="inspector-scroll">
        <Section title="Preset" icon={<Sparkles size={15} />}>
          <div className="preset-row">
            <div className="select-wrap">
              <select value={activePreset} onChange={(e) => onPreset(e.target.value)} aria-label="Load preset">
                <option value="custom">Unsaved look</option>
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={15} />
            </div>
            {active?.custom && <button className="icon-btn danger" title="Delete preset" aria-label="Delete preset" onClick={() => onDeletePreset(activePreset)}><Trash2 size={15} /></button>}
          </div>
        </Section>

        <Section title="Cast" icon={<Users size={15} />} hint={`${cast.length} characters`}>
          <div className="cast-grid" role="group" aria-label="Cast member">
            {cast.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cast-chip ${settings.character === c.id ? 'active' : ''}`}
                aria-pressed={settings.character === c.id}
                onClick={() => onCharacter(c.id)}
                title={c.tagline}
              >
                <span className="cast-dot" style={{ background: c.colors.jacket, borderColor: c.colors.skin }} />
                {c.name}
              </button>
            ))}
          </div>
          <Picker label="Build" options={BUILDS} value={settings.build} onChange={(build: Build) => update({ build })} />
          <Picker label="Hair" options={HAIR_STYLES} value={settings.hair} onChange={(hair: HairStyle) => update({ hair })} />
          <Picker label="Outfit" options={OUTFITS} value={settings.outfit} onChange={(outfit: Outfit) => update({ outfit })} />
        </Section>

        <Section title="Motion" icon={<Activity size={15} />} hint="frame-based">
          <Segmented label="Motion" options={MOTIONS} value={settings.motion} onChange={(motion: Motion) => update({ motion })} />
          <div className="direction-row">
            <span><ArrowLeftRight size={14} />Direction</span>
            <div className="mini-segmented">
              <button className={settings.direction === -1 ? 'active' : ''} onClick={() => update({ direction: -1 })} aria-pressed={settings.direction === -1}>← Left</button>
              <button className={settings.direction === 1 ? 'active' : ''} onClick={() => update({ direction: 1 })} aria-pressed={settings.direction === 1}>Right →</button>
            </div>
          </div>
          <Slider label="Speed" icon={<Gauge size={13} />} value={settings.speed} min={0.25} max={2} step={0.05} onChange={(speed) => update({ speed })} format={(v) => `${v.toFixed(2)}×`} />
          <Slider label="Stride length" icon={<Footprints size={13} />} value={settings.stride} min={0.5} max={1.6} step={0.05} onChange={(stride) => update({ stride })} format={(v) => `${v.toFixed(2)}×`} />
          <Slider label="Body bounce" icon={<Waves size={13} />} value={settings.bounce} min={0} max={1.5} step={0.05} onChange={(bounce) => update({ bounce })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Arm swing" icon={<Wind size={13} />} value={settings.armSwing} min={0} max={1.5} step={0.05} onChange={(armSwing) => update({ armSwing })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Character scale" icon={<PersonStanding size={13} />} value={settings.scale} min={0.7} max={1.6} step={0.02} onChange={(scale) => update({ scale })} format={(v) => `${v.toFixed(2)}×`} />
        </Section>

        <Section title="Dialogue" icon={<MessageSquare size={15} />} hint="lip-sync">
          <textarea
            className="dialogue-input"
            value={settings.dialogue}
            rows={3}
            maxLength={240}
            placeholder="Type a line — the mouth follows the text."
            aria-label="Dialogue line"
            onChange={(e) => update({ dialogue: e.target.value })}
          />
          <p className="section-note">Set motion to <b>Talk</b> to see the visemes. Timing is derived from the text, so renders stay deterministic.</p>
          <Slider label="Speech rate" icon={<Gauge size={13} />} value={settings.speechRate} min={0.5} max={2} step={0.05} onChange={(speechRate) => update({ speechRate })} format={(v) => `${v.toFixed(2)}×`} />
          <Toggle label="Burn in subtitles" icon={<MessageSquare size={14} />} checked={settings.showSubtitles} onChange={(showSubtitles) => update({ showSubtitles })} />
        </Section>

        <Section title="Look" icon={<Palette size={15} />}>
          <div className="color-grid">
            {COLOR_LABELS.map(({ key, label }) => (
              <label key={key} className="color-field" title={`${label} color`}>
                <span className="color-swatch" style={{ background: settings.colors[key] }}>
                  <input type="color" value={settings.colors[key]} onChange={(e) => update({ colors: { ...settings.colors, [key]: e.target.value } })} aria-label={`${label} color`} />
                </span>
                <span>{label}</span>
                <small>{settings.colors[key].toUpperCase()}</small>
              </label>
            ))}
          </div>
          <Toggle label="Backpack" icon={<Backpack size={14} />} checked={settings.backpack} onChange={(backpack) => update({ backpack })} />
          <Toggle label="Glasses" icon={<Glasses size={14} />} checked={settings.glasses} onChange={(glasses) => update({ glasses })} />
          <Toggle label="Cap" icon={<Crown size={14} />} checked={settings.cap} onChange={(cap) => update({ cap })} />
          <Toggle label="Scarf" icon={<Snowflake size={14} />} checked={settings.scarf} onChange={(scarf) => update({ scarf })} />
          <Toggle label="Headphones" icon={<Headphones size={14} />} checked={settings.headphones} onChange={(headphones) => update({ headphones })} />
          <Toggle label="Beard" icon={<Scissors size={14} />} checked={settings.beard} onChange={(beard) => update({ beard })} />
          <Toggle label="Freckles" icon={<CircleDot size={14} />} checked={settings.freckles} onChange={(freckles) => update({ freckles })} />
        </Section>

        <Section title="Scene & camera" icon={<Layers size={15} />}>
          <Segmented label="Scene" options={SCENES} value={settings.scene} onChange={(scene: SceneId) => update({ scene })} />
          <Segmented label="Time of day" options={TIMES_OF_DAY} value={settings.timeOfDay} onChange={(timeOfDay: TimeOfDay) => update({ timeOfDay })} />
          <Slider label="Parallax depth" icon={<MoveHorizontal size={13} />} value={settings.parallax} min={0} max={1} step={0.05} onChange={(parallax) => update({ parallax })} format={(v) => `${Math.round(v * 100)}%`} />
          <Toggle label="Follow camera" icon={<Camera size={14} />} description="Hold the character centre-frame while the world scrolls" checked={settings.followCamera} onChange={(followCamera) => update({ followCamera })} />
          <Toggle label="Rig guides" icon={<Eye size={14} />} description="Show ground line, joints and IK bones" checked={settings.guides} onChange={(guides) => update({ guides })} />
        </Section>

        <Section title="Match a reference" icon={<ImagePlus size={15} />} hint="local only">
          <p className="section-note">Drop in your own character sheets to compare proportions and colors. Files never leave this browser.</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple hidden onChange={(e) => { onReferenceUpload(e.target.files); e.target.value = ''; }} />
          <button className="upload-zone" onClick={() => fileRef.current?.click()}><Upload size={18} /><span>{references.length ? 'Add more references' : 'Upload reference images'}</span><small>PNG · JPG · WEBP · SVG</small></button>
          {references.length > 0 && (
            <>
              <div className="preset-row">
                <div className="select-wrap">
                  <select value={activeReference} onChange={(e) => onReferenceSelect(Number(e.target.value))} aria-label="Active reference image">
                    {references.map((r, i) => <option key={r.id} value={i}>{r.name}</option>)}
                  </select>
                  <ChevronDown size={15} />
                </div>
                <button className="icon-btn danger" title="Remove all references" aria-label="Remove all references" onClick={onReferenceRemove}><Trash2 size={15} /></button>
              </div>
              <Toggle label="Overlay on stage" checked={showReference} onChange={onShowReference} />
              <Slider label="Reference opacity" value={referenceOpacity} min={0} max={1} step={0.05} onChange={onReferenceOpacity} format={(v) => `${Math.round(v * 100)}%`} />
            </>
          )}
        </Section>
      </div>
    </aside>
  );
}
