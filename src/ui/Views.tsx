import { useState } from 'react';
import { ArrowRight, Box, Check, Code2, Copy, Download, FileCode2, Footprints, Layers, Palette, Terminal } from 'lucide-react';
import { Character } from '../rig/Character';
import { Street } from '../rig/Street';
import { CharacterHead } from '../rig/Character';
import { DEFAULT_SETTINGS, EMOTIONS, type SceneSettings } from '../rig/types';
import { copyText } from './utils';

const COMPONENTS = [
  {
    name: 'CharacterRig',
    tag: 'SVG group',
    description: 'The articulated character. Drop it inside any <svg> and position it with a transform. Origin sits at the ground between the feet.',
    props: ['settings', 'frame', 'fps', 'showGuides'],
    code: `<g transform="translate(640 590)">
  <CharacterRig settings={preset} frame={frame} fps={30} />
</g>`,
    kind: 'character',
  },
  {
    name: 'StreetLayer',
    tag: 'SVG group',
    description: 'A layered street with skyline, trees, storefronts, sidewalk and road. Scroll speed is derived from the gait so planted feet stay locked.',
    props: ['distance', 'direction', 'environment', 'parallax', 'time'],
    code: `<StreetLayer
  distance={distance}
  environment="golden"
  parallax={0.7}
  time={frame / 30}
/>`,
    kind: 'street',
  },
  {
    name: 'WalkScene',
    tag: 'Composition',
    description: 'The complete scene, registered in Remotion Root. Accepts every studio control as props and renders deterministically from the current frame.',
    props: ['motion', 'emotion', 'speed', 'colors', 'environment', '…'],
    code: `<Composition
  id="MiloWalk"
  component={WalkScene}
  durationInFrames={300}
  fps={30}
  width={1280}
  height={720}
  defaultProps={preset}
/>`,
    kind: 'scene',
  },
  {
    name: 'CharacterHead',
    tag: 'Expression',
    description: 'Five art-directed expressions with a deterministic blink. Use the full head for reaction shots, thumbnails or emotion sheets.',
    props: ['emotion', 'colors', 'glasses', 'blink'],
    code: `<CharacterHead
  emotion="surprised"
  colors={preset.colors}
  glasses={false}
  blink={0}
/>`,
    kind: 'faces',
  },
];

export function ComponentsView({ settings, notify, onExport }: { settings: SceneSettings; notify: (m: string) => void; onExport: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (name: string, code: string) => {
    const ok = await copyText(code);
    if (ok) { setCopied(name); setTimeout(() => setCopied(null), 1500); notify(`${name} snippet copied`); }
  };
  return (
    <div className="secondary-view">
      <div className="view-intro"><span className="eyebrow">THE BUILDING BLOCKS</span><h1>One rig. Many scenes.</h1><p>Every piece is a pure, frame-driven React component. No timers, no randomness at render time, no external assets.</p></div>
      <div className="component-grid">
        {COMPONENTS.map((c) => (
          <article className="component-card" key={c.name}>
            <div className={`component-preview ${c.kind}`}>
              {c.kind === 'character' && <Character settings={{ ...settings, motion: 'walk', backpack: true }} frame={14} />}
              {c.kind === 'street' && <Street distance={220} environment={settings.environment} parallax={0.7} time={2} />}
              {c.kind === 'scene' && <div className="mini-scene"><Street distance={120} environment={settings.environment} time={1} /><div className="mini-character"><Character settings={settings} frame={18} /></div></div>}
              {c.kind === 'faces' && <div className="face-row">{EMOTIONS.slice(0, 4).map((e) => <CharacterHead key={e.id} emotion={e.id} colors={settings.colors} />)}</div>}
              <span className="component-tag">{c.tag}</span>
            </div>
            <div className="component-body">
              <h2>{c.name}</h2><p>{c.description}</p>
              <div className="prop-chips">{c.props.map((p) => <code key={p}>{p}</code>)}</div>
              <pre className="code-block small-code">{c.code}</pre>
              <button className="btn ghost" onClick={() => copy(c.name, c.code)}>{copied === c.name ? <Check size={15} /> : <Copy size={15} />}{copied === c.name ? 'Copied' : 'Copy snippet'}</button>
            </div>
          </article>
        ))}
      </div>
      <div className="cta-strip"><div><h2>Ready for your timeline</h2><p>Grab the full source, or export just the props and SVG you need.</p></div><button className="btn primary" onClick={onExport}><Download size={16} />Export kit<ArrowRight size={15} /></button></div>
    </div>
  );
}

const STEPS = [
  { icon: <Terminal size={18} />, title: 'Install & run', body: 'Unzip the project kit, then install dependencies. The studio runs in Vite; Remotion Studio opens the same compositions.', code: 'npm install\nnpm run dev      # visual studio\nnpm run studio   # Remotion Studio' },
  { icon: <Code2 size={18} />, title: 'Register the compositions', body: 'src/remotion/Root.tsx registers WalkScene, CharacterOnly, StreetOnly and EmotionSheet. Import the root in your own project or copy individual components.', code: "import { registerRoot } from 'remotion';\nimport { RemotionRoot } from './remotion/Root';\n\nregisterRoot(RemotionRoot);" },
  { icon: <Box size={18} />, title: 'Render video or alpha', body: 'Render the street scene to MP4, or the transparent character to a PNG sequence for compositing. Remotion handles frame-accurate output.', code: 'npm run render   # renders/walk.mp4\nnpx remotion render src/remotion/index.ts CharacterOnly renders/frames --image-format=png --sequence' },
  { icon: <Footprints size={18} />, title: 'Why the walk stays grounded', body: 'The gait samples a stance/swing cycle from frame time. During stance the foot moves backward at exactly the ground speed; two-bone IK solves the knee. The street scrolls at the same rate, so planted feet do not skate.', code: 'cycleDuration = (2 * stepLength) / speed\nstanceReach   = 2 * stepLength * duty\nfootX         = reach/2 - reach * (phase/duty)' },
  { icon: <Palette size={18} />, title: 'Matching your reference', body: 'This build ships with an original character because the Windows reference folder was not attached. Upload your sheets in the studio to compare, then tune colors, proportions and expression. The rig is plain SVG—edit paths directly for an exact match.', code: 'src/rig/Character.tsx   # shapes & face\nsrc/rig/types.ts        # defaults & presets\nsrc/rig/gait.ts         # motion math' },
  { icon: <Layers size={18} />, title: 'Reuse anywhere', body: 'CharacterRig and StreetLayer are SVG groups. Character and Street are standalone SVGs. WalkScene is a Remotion composition. All accept explicit frame/time values, so they are safe for parallel rendering.', code: "import { Character } from './rig/Character';\n\n<Character settings={preset} frame={frame} fps={30} />" },
];

export function GuideView({ onExport }: { onExport: () => void }) {
  const [copied, setCopied] = useState<number | null>(null);
  return (
    <div className="secondary-view guide-view">
      <div className="view-intro"><span className="eyebrow">FROM STUDIO TO SCREEN</span><h1>Ship it in Remotion.</h1><p>A small, dependency-light kit built around one idea: every visual is a pure function of the frame.</p></div>
      <div className="guide-layout">
        <div className="guide-steps">
          {STEPS.map((s, i) => (
            <article className="guide-step" key={s.title}>
              <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
              <div><h2>{s.icon}{s.title}</h2><p>{s.body}</p><pre className="code-block small-code">{s.code}</pre><button className="text-btn" onClick={async () => { if (await copyText(s.code)) { setCopied(i); setTimeout(() => setCopied(null), 1400); } }}>{copied === i ? <Check size={13} /> : <Copy size={13} />}{copied === i ? 'Copied' : 'Copy'}</button></div>
            </article>
          ))}
        </div>
        <aside className="guide-aside">
          <div className="aside-card"><FileCode2 size={22} /><h3>What's in the kit</h3><ul><li>src/rig — character, street, gait, types</li><li>src/remotion — compositions & root</li><li>src/ui — this studio</li><li>tests — gait & determinism checks</li><li>README + render scripts</li></ul><button className="btn primary" onClick={onExport}><Download size={15} />Download ZIP</button></div>
          <div className="aside-card license"><h3>A note on licensing</h3><p>Remotion has its own license. Free for individuals and small teams; larger companies need a company license. Check the official terms before shipping.</p><a href="https://www.remotion.dev/license" target="_blank" rel="noreferrer">Read Remotion license <ArrowRight size={13} /></a></div>
        </aside>
      </div>
    </div>
  );
}
