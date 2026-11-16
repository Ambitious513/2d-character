import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Activity, ArrowRight, BookOpen, Check, Download, Film, Footprints, Image, Layers, RotateCcw, Save, Shuffle, Sparkles, Users, X } from 'lucide-react';
import { WalkScene, CharacterOnly, CastSheet, MotionSheet } from './remotion/Compositions';
import { CharacterHead } from './rig/Character';
import { DEFAULT_SETTINGS, EMOTIONS, HAIR_STYLES, OUTFITS, BUILDS, SCENES, TIMES_OF_DAY, type SceneSettings, type ViewMode } from './rig/types';
import { PRESETS } from './rig/presets';
import { castSceneSettings, getCharacter, listCharacters } from './rig/cast';
import { DURATION, FPS, HEIGHT, WIDTH, motionLabel } from './rig/gait';
import { Inspector, useStudioHotkeys, type Preset, type ReferenceImage } from './ui/Controls';
import { Timeline } from './ui/Timeline';
import { ExportDialog, SaveDialog } from './ui/Dialogs';
import { ComponentsView, GuideView } from './ui/Views';

type Nav = 'studio' | 'components' | 'guide';
type Toast = { msg: string; undo?: () => void } | null;

const BUILT_INS: Preset[] = PRESETS.map((p, i) => ({ id: `builtin-${i}`, name: p.name, settings: p.settings }));

const STAGE: Record<ViewMode, { label: string; width: number; height: number }> = {
  scene: { label: 'Scene', width: WIDTH, height: HEIGHT },
  character: { label: 'Character only', width: 720, height: 720 },
  cast: { label: 'Cast sheet', width: WIDTH, height: HEIGHT },
  motion: { label: 'Motion sheet', width: WIDTH, height: HEIGHT },
  reference: { label: 'Reference', width: WIDTH, height: HEIGHT },
};

function loadSettings(): SceneSettings {
  try {
    const raw = localStorage.getItem('stride-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed, colors: { ...DEFAULT_SETTINGS.colors, ...parsed.colors } };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}
function loadCustomPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem('stride-presets') || '[]'); } catch { return []; }
}
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#F26B38" />
      <path d="M 9 22 L 15 10 L 19 10 L 15 18 L 22 18 L 18 24 L 12 24 Z" fill="#FFFDF6" />
      <circle cx="22" cy="10" r="2.4" fill="#F6C65B" />
    </svg>
  );
}

export default function App() {
  const [settings, setSettings] = useState<SceneSettings>(loadSettings);
  const [customPresets, setCustomPresets] = useState<Preset[]>(loadCustomPresets);
  const [activePreset, setActivePreset] = useState('builtin-0');
  const [nav, setNav] = useState<Nav>('studio');
  // Initial view can be deep-linked with ?view=cast|character|motion|scene so
  // specific sheets (e.g. the full cast including new members) are shareable.
  const initialView: ViewMode = (() => {
    try {
      const v = new URLSearchParams(window.location.search).get('view');
      return v === 'cast' || v === 'character' || v === 'motion' ? v : 'scene';
    } catch {
      return 'scene';
    }
  })();
  const [view, setView] = useState<ViewMode>(initialView);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const [modal, setModal] = useState<'export' | 'save' | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [activeReference, setActiveReference] = useState(0);
  const [showReference, setShowReference] = useState(false);
  const [referenceOpacity, setReferenceOpacity] = useState(0.4);
  const playerRef = useRef<PlayerRef>(null);
  const refsRef = useRef(references);
  refsRef.current = references;
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => { localStorage.setItem('stride-settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('stride-presets', JSON.stringify(customPresets)); }, [customPresets]);
  useEffect(() => () => { refsRef.current.forEach((r) => URL.revokeObjectURL(r.url)); window.clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener('frameupdate', onFrame);
    p.addEventListener('seeked', onFrame);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    return () => {
      p.removeEventListener('frameupdate', onFrame);
      p.removeEventListener('seeked', onFrame);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
    };
  }, [nav]);

  const seek = useCallback((f: number) => {
    const clamped = Math.max(0, Math.min(DURATION - 1, Math.round(f)));
    playerRef.current?.seekTo(clamped);
    setFrame(clamped);
  }, []);
  const togglePlay = useCallback(() => { playerRef.current?.toggle(); }, []);
  const step = useCallback((d: number) => {
    playerRef.current?.pause();
    seek((playerRef.current?.getCurrentFrame() ?? frame) + d);
  }, [frame, seek]);

  const update = useCallback((patch: Partial<SceneSettings>) => {
    setSettings((s) => ({ ...s, ...patch, colors: patch.colors ? { ...s.colors, ...patch.colors } : s.colors }));
    setActivePreset('custom');
  }, []);

  const presets = useMemo(() => [...BUILT_INS, ...customPresets], [customPresets]);
  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (p) { setSettings(p.settings); setActivePreset(id); notify(`Loaded “${p.name}”`); }
  };
  const savePreset = (name: string) => {
    const id = `custom-${Date.now()}`;
    setCustomPresets((p) => [...p, { id, name, settings, custom: true }]);
    setActivePreset(id);
    setModal(null);
    notify(`Saved “${name}”`);
  };
  const deletePreset = (id: string) => {
    const p = customPresets.find((x) => x.id === id);
    if (!p) return;
    setCustomPresets((list) => list.filter((x) => x.id !== id));
    setActivePreset('custom');
    notify(`Deleted “${p.name}”`, () => { setCustomPresets((list) => [...list, p]); setActivePreset(id); });
  };
  const reset = () => {
    const prev = settings;
    const prevPreset = activePreset;
    setSettings(DEFAULT_SETTINGS);
    setActivePreset('builtin-0');
    notify('Reset to Morning stroll', () => { setSettings(prev); setActivePreset(prevPreset); });
  };
  const randomize = () => {
    const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
    const jackets = ['#F26B38', '#365DE6', '#E9B44C', '#7FB6D9', '#D9552F', '#6F9B6A'];
    const pants = ['#2D5B52', '#233C59', '#6B5147', '#3E4C55'];
    const skins = ['#B87952', '#8D5A3C', '#E0AC8B', '#6B4226', '#D9A066'];
    const hairs = ['#26352E', '#3B2A20', '#1E1E24', '#5A3A22'];
    const accents = ['#F6C65B', '#FFFDF6', '#7FB6D9', '#E9B44C'];
    update({
      colors: { jacket: pick(jackets), pants: pick(pants), skin: pick(skins), hair: pick(hairs), shoes: pick(['#F5F0E4', '#FFFDF6', '#E8ECE6']), accent: pick(accents) },
      emotion: pick(EMOTIONS).id,
      motion: pick(['walk', 'walk', 'run', 'wave', 'dance', 'talk'] as const),
      hair: pick(HAIR_STYLES).id,
      outfit: pick(OUTFITS).id,
      build: pick(BUILDS).id,
      scene: pick(SCENES).id,
      timeOfDay: pick(TIMES_OF_DAY).id,
      speed: 0.7 + Math.random() * 0.7,
      stride: 0.8 + Math.random() * 0.5,
      bounce: 0.4 + Math.random() * 0.6,
      armSwing: 0.5 + Math.random() * 0.7,
      glasses: Math.random() > 0.65,
      cap: Math.random() > 0.8,
      scarf: Math.random() > 0.85,
      freckles: Math.random() > 0.7,
    });
    notify('New look rolled');
  };

  /** Switch cast member, keeping the current scene, camera and framing. */
  const applyCharacter = (id: string) => {
    const next = castSceneSettings(id, {
      scene: settings.scene,
      timeOfDay: settings.timeOfDay,
      parallax: settings.parallax,
      followCamera: settings.followCamera,
      guides: settings.guides,
      showSubtitles: settings.showSubtitles,
      direction: settings.direction,
    });
    setSettings(next);
    setActivePreset('custom');
    notify(`Switched to ${getCharacter(id).name}`);
  };

  // One global shortcut listener (←/→, Space, 1–6, W/I/R). Lives in
  // Controls.tsx so the studio has a single key-handling path.
  useStudioHotkeys({
    togglePlay,
    step,
    selectCharacter: applyCharacter,
    setMotion: (motion) => update({ motion }),
    modalOpen: modal !== null,
  });

  const uploadReferences = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/') && f.size <= 8 * 1024 * 1024);
    if (!valid.length) { notify('Use image files under 8 MB'); return; }
    const room = Math.max(0, 8 - references.length);
    const added = valid.slice(0, room).map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, url: URL.createObjectURL(f) }));
    if (!added.length) { notify('Reference limit reached (8 images)'); return; }
    setReferences((r) => [...r, ...added]);
    setActiveReference(references.length);
    setShowReference(true);
    notify(`Added ${added.length} reference${added.length > 1 ? 's' : ''}`);
  };
  const removeReferences = () => {
    references.forEach((r) => URL.revokeObjectURL(r.url));
    setReferences([]);
    setActiveReference(0);
    setShowReference(false);
    notify('References removed');
  };

  const activeRef = references[activeReference];
  const composition = view === 'character' ? CharacterOnly : view === 'cast' ? CastSheet : view === 'motion' ? MotionSheet : WalkScene;
  const compWidth = STAGE[view].width;
  const compHeight = STAGE[view].height;
  const castMember = getCharacter(settings.character);

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setNav('studio')} aria-label="Stride studio home"><BrandMark /><span>stride<span className="brand-dot">.</span></span><small>CHARACTER LAB</small></button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={nav === 'studio' ? 'active' : ''} onClick={() => setNav('studio')}><Film size={15} />Studio</button>
          <button className={nav === 'components' ? 'active' : ''} onClick={() => setNav('components')}><Layers size={15} />Components</button>
          <button className={nav === 'guide' ? 'active' : ''} onClick={() => setNav('guide')}><Sparkles size={15} />Remotion guide</button>
          <a className="nav-docs-link" href="#/docs"><BookOpen size={15} />Docs</a>
        </nav>
        <div className="top-actions">
          <span className="remotion-badge"><i />Remotion-ready</span>
          <button className="btn ghost" onClick={() => setModal('save')}><Save size={15} /><span>Save preset</span></button>
          <button className="btn primary" onClick={() => setModal('export')}><Download size={15} /><span>Export kit</span><ArrowRight size={14} /></button>
        </div>
      </header>

      {nav === 'studio' && (
        <>
          <div className="project-bar">
            <div className="project-title">
              <span className="eyebrow">CAST {String(listCharacters().findIndex((c) => c.id === castMember.id) + 1).padStart(3, '0')} · {castMember.build.toUpperCase()} BUILD · ORIGINAL VECTOR RIG</span>
              <h1>{castMember.name}, in motion<span>.</span></h1>
              <p>{castMember.tagline}</p>
            </div>
            <div className="project-actions">
              <div className="spec-chips"><span><Footprints size={13} />IK gait</span><span>30 fps</span><span>1280 × 720</span></div>
              <button className="btn ghost" onClick={reset}><RotateCcw size={14} />Reset</button>
              <button className="btn ghost" onClick={randomize}><Shuffle size={14} />Randomize</button>
            </div>
          </div>

          <main className="studio-grid">
            <div className="stage-column">
              <div className="stage-card">
                <div className="stage-toolbar">
                  <div className="stage-tabs" role="group" aria-label="Preview mode">
                    <button className={view === 'scene' ? 'active' : ''} onClick={() => setView('scene')}><Image size={14} />Scene</button>
                    <button className={view === 'character' ? 'active' : ''} onClick={() => setView('character')}><Footprints size={14} />Character only</button>
                    <button className={view === 'cast' ? 'active' : ''} onClick={() => setView('cast')}><Users size={14} />Cast sheet</button>
                    <button className={view === 'motion' ? 'active' : ''} onClick={() => setView('motion')}><Activity size={14} />Motion sheet</button>
                  </div>
                  <div className="stage-meta"><span className="status-dot" />{motionLabel(settings.motion)}<span className="meta-sep">·</span>{settings.scene} / {settings.timeOfDay}</div>
                </div>
                <div className={`player-wrap ${view === 'character' ? 'checkerboard' : ''}`} data-weather={settings.weather}>
                  <Player
                    ref={playerRef}
                    component={composition}
                    inputProps={settings}
                    durationInFrames={DURATION}
                    compositionWidth={compWidth}
                    compositionHeight={compHeight}
                    fps={FPS}
                    controls={false}
                    loop={loop}
                    autoPlay
                    playbackRate={playbackRate}
                    clickToPlay
                    spaceKeyToPlayOrPause={false}
                    acknowledgeRemotionLicense
                    style={{ width: '100%', height: '100%' }}
                    errorFallback={({ error }) => <div className="player-error">Preview error: {error.message}</div>}
                  />
                  {showReference && activeRef && <img className="reference-overlay" src={activeRef.url} alt="Reference overlay" style={{ opacity: referenceOpacity }} />}
                  <div className="stage-corner-label">{view === 'scene' ? `${settings.scene.toUpperCase()} / 01` : view === 'character' ? 'ALPHA / RIG' : view === 'cast' ? 'CAST / SHEET' : 'MOTION / SHEET'}<span>{settings.direction === 1 ? '→' : '←'}</span></div>
                </div>
                <Timeline frame={frame} playing={playing} playbackRate={playbackRate} loop={loop} onToggle={togglePlay} onSeek={seek} onStep={step} onRestart={() => seek(0)} onRate={setPlaybackRate} onLoop={() => setLoop((l) => !l)} />
              </div>

              <div className="expression-card">
                <div className="expression-head"><div><span className="eyebrow">EXPRESSION LIBRARY</span><h2>A face for every moment</h2></div><span className="expression-hint">Click to apply live</span></div>
                <div className="expression-row" role="group" aria-label="Expression">
                  {EMOTIONS.map((e) => (
                    <button key={e.id} className={`expression-btn ${settings.emotion === e.id ? 'active' : ''}`} onClick={() => update({ emotion: e.id })} aria-pressed={settings.emotion === e.id}>
                      <span className="expression-face"><CharacterHead emotion={e.id} colors={settings.colors} glasses={settings.glasses} hair={settings.hair} beard={settings.beard} freckles={settings.freckles} cap={settings.cap} headphones={settings.headphones} /></span>
                      <span className="expression-label">{e.label}</span>
                      <small>{e.note}</small>
                      {settings.emotion === e.id && <span className="expression-check"><Check size={11} /></span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Inspector settings={settings} update={update} presets={presets} activePreset={activePreset} onPreset={applyPreset} onDeletePreset={deletePreset} onCharacter={applyCharacter} references={references} activeReference={activeReference} onReferenceSelect={setActiveReference} onReferenceUpload={uploadReferences} onReferenceRemove={removeReferences} referenceOpacity={referenceOpacity} onReferenceOpacity={setReferenceOpacity} showReference={showReference} onShowReference={setShowReference} />
          </main>
          <footer className="studio-footer"><span><i />Deterministic by design — the same frame always renders the same pose.</span><span>Built with Remotion · SVG · two-bone IK</span></footer>
        </>
      )}

      {nav === 'components' && <ComponentsView settings={settings} notify={notify} onExport={() => setModal('export')} />}
      {nav === 'guide' && <GuideView onExport={() => setModal('export')} />}

      {modal === 'export' && <ExportDialog settings={settings} frame={frame} onClose={() => setModal(null)} notify={notify} />}
      {modal === 'save' && <SaveDialog onSave={savePreset} onClose={() => setModal(null)} />}
      {toast && <div className="toast" role="status"><Check size={15} /><span>{toast.msg}</span>{toast.undo && <button onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}<button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </div>
  );
}
