import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Check, Copy, Download, FileCode2, FileJson2, Package, X } from 'lucide-react';
import { Character } from '../rig/Character';
import type { SceneSettings } from '../rig/types';
import { copyText, downloadText, USAGE_SNIPPET } from './utils';

export type ExportTab = 'json' | 'svg' | 'react' | 'kit';

export function ExportDialog({ settings, frame, onClose, notify }: { settings: SceneSettings; frame: number; onClose: () => void; notify: (msg: string) => void }) {
  const [tab, setTab] = useState<ExportTab>('json');
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(settings, null, 2), [settings]);
  const svg = useMemo(() => `<?xml version="1.0" encoding="UTF-8"?>\n${renderToStaticMarkup(<Character settings={settings} frame={frame} fps={30} showGuides={settings.guides} />)}`, [settings, frame]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const copy = async (text: string) => {
    const ok = await copyText(text);
    setCopied(ok);
    notify(ok ? 'Copied to clipboard' : 'Copy failed — select the code manually');
    setTimeout(() => setCopied(false), 1600);
  };
  const tabs: { id: ExportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'json', label: 'Props JSON', icon: <FileJson2 size={15} /> },
    { id: 'svg', label: 'SVG frame', icon: <FileCode2 size={15} /> },
    { id: 'react', label: 'React usage', icon: <FileCode2 size={15} /> },
    { id: 'kit', label: 'Project kit', icon: <Package size={15} /> },
  ];
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal export-modal" role="dialog" aria-modal="true" aria-label="Export character kit">
        <div className="modal-head"><div><span className="eyebrow">TAKE IT WITH YOU</span><h2>Export your look</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close export dialog"><X size={18} /></button></div>
        <div className="export-tabs">{tabs.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.icon}{t.label}</button>)}</div>
        <div className="export-body">
          {tab === 'json' && <><p className="modal-note">Every control, serialized. Drop this into <code>defaultProps</code> or load it in the studio.</p><pre className="code-block">{json}</pre></>}
          {tab === 'svg' && <><p className="modal-note">A crisp vector snapshot of frame {frame}, with your current colors, expression and pose.</p><div className="svg-preview" dangerouslySetInnerHTML={{ __html: svg.replace(/<\?xml.*?\?>\n/, '') }} /><pre className="code-block small-code">{svg.slice(0, 600)}…</pre></>}
          {tab === 'react' && <><p className="modal-note">The same components used in this preview, ready for your Remotion timeline.</p><pre className="code-block">{USAGE_SNIPPET}</pre></>}
          {tab === 'kit' && (
            <div className="kit-panel">
              <Package size={34} />
              <h3>The complete Remotion project</h3>
              <p>Source rig, street, four registered compositions, this studio, tests and a README. Unzip, run <code>npm install</code>, then <code>npm run dev</code> or <code>npm run studio</code>.</p>
              <ul><li>CharacterRig + Character (transparent SVG)</li><li>StreetLayer + Street (parallax environment)</li><li>WalkScene · CharacterOnly · StreetOnly · EmotionSheet</li><li>Deterministic two-bone IK gait with stance locking</li></ul>
              <a className="btn primary" href="/stride-remotion-kit.zip" download><Download size={16} />Download project ZIP</a>
            </div>
          )}
        </div>
        <div className="modal-foot">
          {tab === 'json' && <><button className="btn ghost" onClick={() => copy(json)}>{copied ? <Check size={15} /> : <Copy size={15} />}Copy JSON</button><button className="btn primary" onClick={() => { downloadText('milo-preset.json', json); notify('Preset downloaded'); }}><Download size={15} />Download JSON</button></>}
          {tab === 'svg' && <><button className="btn ghost" onClick={() => copy(svg)}>{copied ? <Check size={15} /> : <Copy size={15} />}Copy SVG</button><button className="btn primary" onClick={() => { downloadText(`milo-${settings.motion}-${settings.emotion}-f${frame}.svg`, svg, 'image/svg+xml'); notify('SVG frame downloaded'); }}><Download size={15} />Download SVG</button></>}
          {tab === 'react' && <button className="btn primary" onClick={() => copy(USAGE_SNIPPET)}>{copied ? <Check size={15} /> : <Copy size={15} />}Copy usage</button>}
          {tab === 'kit' && <button className="btn ghost" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}

export function SaveDialog({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('My look');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal save-modal" role="dialog" aria-modal="true" aria-label="Save preset" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
        <div className="modal-head"><div><span className="eyebrow">KEEP THIS ONE</span><h2>Save a preset</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close save dialog"><X size={18} /></button></div>
        <label className="field-label">Preset name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Sunset wave" /></label>
        <p className="modal-note">Saved locally in this browser. Export the JSON to share it.</p>
        <div className="modal-foot"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn primary" disabled={!name.trim()}><Check size={15} />Save preset</button></div>
      </form>
    </div>
  );
}
