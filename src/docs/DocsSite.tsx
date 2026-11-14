/**
 * Stride docs site — `#/docs`.
 *
 * A consumer of the public barrel (`src/index.ts`), exactly like the studio.
 * Nothing in this folder is exported from the library: the docs are an app
 * built on the kit, and every preview below is a real Remotion composition
 * running in a real `<Player>`.
 *
 * Hash routing keeps the studio at `/` and needs no server rewrites, so the
 * same build works in dev, in `vite preview` and on any static host.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  Download,
  ExternalLink,
  Film,
  Github,
  Layers,
  Lightbulb,
  Rocket,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  EMOTIONS,
  MOTIONS,
  PRESETS,
  SCENES,
  TIMES_OF_DAY,
  VERSION,
  WalkScene,
  castSceneSettings,
  listCharacters,
} from '../index';
import { DocsPlayer } from './DocsPlayer';
import { CodeBlock } from './CodeBlock';
import { Chip, FrameRuler, Note, SectionHead } from './parts';
import { ARCHITECTURE_SNIPPET, EXPORT_RECIPES, QUICKSTART } from './snippets';
import './docs.css';

const REPO = 'https://github.com/Ambitious513/2d-character';

interface SectionDef {
  id: string;
  label: string;
}

/** Nav order. Sections are appended here as they land. */
const SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'export', label: 'Export' },
  { id: 'architecture', label: 'Architecture' },
];

const sectionFromHash = (): string | null => {
  const match = /^#\/docs\/([a-z-]+)/.exec(window.location.hash);
  return match ? match[1] : null;
};

export default function DocsSite() {
  const [active, setActive] = useState('overview');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Stride — docs & live examples';
    return () => {
      document.title = previous;
    };
  }, []);

  /** Deep links: `#/docs/export` scrolls to that section, below the fixed nav. */
  useEffect(() => {
    const jump = () => {
      const id = sectionFromHash();
      if (!id) return;
      const el = document.getElementById(`docs-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(id);
      }
    };
    const raf = window.requestAnimationFrame(jump);
    window.addEventListener('hashchange', jump);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('hashchange', jump);
    };
  }, []);

  /** Scrollspy: whichever section owns the middle of the viewport is current. */
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`docs-${s.id}`)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const id = visible[0].target.id.replace('docs-', '');
        setActive(id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const cast = listCharacters();

  return (
    <div className="docs-root">
      <header className="docs-topbar">
        <a className="docs-brand" href="#/docs/overview">
          <span className="docs-brand-mark" aria-hidden="true">
            <Film size={16} />
          </span>
          Stride
          <em>v{VERSION}</em>
        </a>

        <nav className="docs-nav" aria-label="Docs sections">
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#/docs/${s.id}`}
              className={active === s.id ? 'active' : ''}
              aria-current={active === s.id ? 'true' : undefined}
            >
              <span className="docs-nav-num">{String(i + 1).padStart(2, '0')}</span>
              {s.label}
            </a>
          ))}
        </nav>

        <div className="docs-top-actions">
          <a className="docs-btn ghost" href="#/studio">
            <Film size={14} />
            <span>Studio</span>
          </a>
          <a className="docs-btn primary" href={REPO} target="_blank" rel="noreferrer">
            <Github size={14} />
            <span>GitHub</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </header>

      <main className="docs-main">
        <Overview />
        <Quickstart onCopied={(ok) => notify(ok ? 'Snippet copied' : 'Copy failed — select the text manually')} />
        <Export />
        <Architecture castCount={cast.length} />

        <footer className="docs-footer">
          <div>
            <b>Stride {VERSION}</b>
            <div>
              {cast.length} characters · {MOTIONS.length} motions · {EMOTIONS.length} emotions ·{' '}
              {SCENES.length} scenes × {TIMES_OF_DAY.length} lighting passes · {PRESETS.length} presets
            </div>
          </div>
          <div className="docs-footer-links">
            <a className="docs-btn ghost small" href="#/studio">
              <Film size={13} />
              Open the studio
            </a>
            <a className="docs-btn ghost small" href={`${REPO}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer">
              <BookOpen size={13} />
              Architecture doc
            </a>
            <a className="docs-btn ghost small" href={REPO} target="_blank" rel="noreferrer">
              <Github size={13} />
              Source
            </a>
          </div>
        </footer>
      </main>

      {toast ? (
        <div className="docs-toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Overview() {
  const cast = listCharacters();
  const heroProps = castSceneSettings('ada', {
    motion: 'run',
    scene: 'street',
    timeOfDay: 'golden',
    speed: 1.15,
    followCamera: true,
  });

  return (
    <section className="docs-hero" id="docs-overview">
      <div className="hero-copy reveal">
        <span className="docs-eyebrow">
          <Sparkles size={13} />
          Frame-deterministic character kit for Remotion
        </span>
        <h1 className="hero-title">
          Characters that <span>walk</span>, <em>talk</em> and never skate.
        </h1>
        <p className="hero-lede">
          Stride is a reusable 2D cast, motion engine and set of environments you drop into a
          Remotion project. One procedural rig, ten motions, seven expressions, deterministic
          lip-sync — and the same settings plus the same frame always produce the same SVG.
        </p>
        <div className="hero-cta">
          <a className="docs-btn accent" href="#/docs/quickstart">
            <Rocket size={15} />
            Quickstart
          </a>
          <a className="docs-btn ghost" href="#/docs/export">
            <Download size={15} />
            Export recipes
          </a>
          <a className="docs-btn quiet" href={REPO} target="_blank" rel="noreferrer">
            <Github size={15} />
            GitHub
            <ArrowRight size={13} />
          </a>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <b>{cast.length}</b>
            <span>Cast</span>
          </div>
          <div className="stat">
            <b>{MOTIONS.length}</b>
            <span>Motions</span>
          </div>
          <div className="stat">
            <b>{EMOTIONS.length}</b>
            <span>Emotions</span>
          </div>
          <div className="stat">
            <b>{SCENES.length}×{TIMES_OF_DAY.length}</b>
            <span>Scenes / light</span>
          </div>
        </div>
      </div>

      <div className="hero-stage reveal">
        <DocsPlayer
          label="WalkScene"
          component={WalkScene}
          inputProps={heroProps}
          durationInFrames={300}
          compositionWidth={1280}
          compositionHeight={720}
          autoPlay
          caption="Live composition — Ada, run cycle, street at golden hour. Not a video file: this is the rig rendering in your browser."
        />
        <FrameRuler />
        <div className="docs-chips" style={{ marginTop: 12 }}>
          <Chip tone="mono">1280×720 · 30 fps</Chip>
          <Chip tone="accent">Deterministic SVG</Chip>
          <Chip tone="blue">Alpha-ready export</Chip>
          <Chip>No Math.random · no clocks</Chip>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Quickstart                                                          */
/* ------------------------------------------------------------------ */

function Quickstart({ onCopied }: { onCopied: (ok: boolean) => void }) {
  const steps = [
    {
      title: 'Copy the library in',
      body: (
        <>
          Stride ships as source. <code>src/rig</code> is the library, <code>src/remotion</code> holds
          the compositions, and <code>src/index.ts</code> is the only import surface you need.
        </>
      ),
      code: QUICKSTART.install,
      lang: 'terminal',
    },
    {
      title: 'Register a composition',
      body: (
        <>
          Attach <code>sceneSchema</code> and the whole rig becomes editable in Remotion Studio's
          props panel — no custom UI required.
        </>
      ),
      code: QUICKSTART.composition,
      lang: 'src/Root.tsx',
    },
    {
      title: '…or use the factories',
      body: (
        <>
          The factories fill in cast-aware defaults and geometry. <code>DialogueComposition</code>{' '}
          derives its duration from the script, so a line is never cut off mid-word.
        </>
      ),
      code: QUICKSTART.factories,
      lang: 'src/Root.tsx',
    },
    {
      title: 'Embed a live preview',
      body: (
        <>
          Every preview on this page is this exact component. <code>@remotion/player</code> renders
          the composition in the browser with no render step.
        </>
      ),
      code: QUICKSTART.player,
      lang: 'src/Preview.tsx',
    },
    {
      title: 'Render',
      body: <>The npm scripts are thin wrappers over the Remotion CLI — copy them or call it directly.</>,
      code: QUICKSTART.render,
      lang: 'terminal',
    },
  ];

  return (
    <section className="docs-section" id="docs-quickstart">
      <SectionHead
        index="02"
        eyebrow="Quickstart"
        title={<>From zero to a <span>walking character</span> in five steps.</>}
        lede="No build step, no asset pipeline, no sprite sheets. Copy the source, register a composition, render."
      />
      <div className="docs-card reveal">
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={s.title}>
              <div className="step-num">{i + 1}</div>
              <div className="step-body">
                <h3 className="docs-h3">{s.title}</h3>
                <p>{s.body}</p>
                <CodeBlock code={s.code} title={s.lang} label={`Copy ${s.title} snippet`} onCopied={onCopied} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function Export() {
  return (
    <section className="docs-section" id="docs-export">
      <SectionHead
        index="03"
        eyebrow="Export"
        title={<>Four recipes, one <span>alpha gotcha</span>.</>}
        lede="CharacterOnly is a transparent plate. Whether the alpha survives is decided entirely by the codec, pixel format and image format you render with."
      />

      <div className="recipe-grid reveal">
        {EXPORT_RECIPES.map((r) => (
          <article className="docs-card recipe" key={r.id}>
            <div className="recipe-head">
              <h3 className="docs-h3">{r.name}</h3>
              <span className="recipe-format">{r.format}</span>
            </div>
            <p className="docs-sub">{r.note}</p>
            <CodeBlock code={r.command} title="npm script" label={`Copy ${r.name} command`} className="small" />
            <CodeBlock code={r.flags} title="remotion cli" label={`Copy ${r.name} flags`} className="small" />
          </article>
        ))}
      </div>

      <div className="docs-grid two reveal" style={{ marginTop: 18 }}>
        <Note tone="warn" icon={<TriangleAlert size={16} />}>
          <b>Alpha needs PNG frames.</b> Remotion defaults to <code>--image-format=jpeg</code>, and JPEG
          has no alpha channel — an alpha render made with JPEG frames composites onto black. Every
          alpha recipe above passes <code>--image-format=png</code>. Keep it.
        </Note>
        <Note icon={<ShieldCheck size={16} />}>
          <b>What CI actually proves.</b> The <code>render-smoke</code> job renders a 10-frame PNG
          sequence of <code>CharacterOnly</code> on every push. The ProRes and WebM recipes are
          validated at the flag level; a finished <code>.mov</code>/<code>.webm</code> still needs a
          machine with enough RAM for headless Chrome.
        </Note>
      </div>

      <div className="docs-card reveal" style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
        <div>
          <h3 className="docs-h3">Take the whole kit</h3>
          <p className="docs-sub">
            Source, compositions, tests, scripts and docs — generated from this tree, so it is never a
            stale snapshot.
          </p>
        </div>
        <a className="docs-btn accent" href="/stride-remotion-kit.zip" download>
          <Download size={15} />
          Download project ZIP
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Architecture                                                        */
/* ------------------------------------------------------------------ */

function Architecture({ castCount }: { castCount: number }) {
  return (
    <section className="docs-section" id="docs-architecture">
      <SectionHead
        index="04"
        eyebrow="Architecture"
        title={<>Determinism is the <span>whole product</span>.</>}
        lede="A render is split across processes and machines. If any part of the drawing depends on wall-clock time, random numbers or React identity, frames stop matching. Stride is built so that cannot happen."
      />

      <div className="docs-grid side reveal">
        <div className="docs-card">
          <div className="docs-card-head">
            <div>
              <h3 className="docs-h3">The rules</h3>
              <p className="docs-sub">Enforced by tests, not by good intentions.</p>
            </div>
            <Chip tone="accent">
              <ShieldCheck size={12} />
              Guarded
            </Chip>
          </div>
          <ul className="arch-list">
            <li>
              <Check size={14} />
              <span>
                <b>Same settings + same frame + same fps = same SVG.</b> Pose, lip-sync, blink and
                parallax are pure functions of <code>(settings, frame, fps)</code>.
              </span>
            </li>
            <li>
              <Check size={14} />
              <span>
                <b>No <code>Math.random()</code>, <code>Date.now()</code> or module counters</b> in the
                render path. Per-instance variation comes from the <code>seed</code> field.
              </span>
            </li>
            <li>
              <Check size={14} />
              <span>
                <b><code>stableId()</code>, never <code>useId()</code>.</b> Gradient ids derive from the
                settings. This was a real bug: two characters rendered independently shared ids, so
                every jacket took the first character's colour.
              </span>
            </li>
            <li>
              <Check size={14} />
              <span>
                <b>One public barrel.</b> <code>src/index.ts</code> is the import surface. The studio
                and these docs are apps on top of it and are deliberately not exported.
              </span>
            </li>
            <li>
              <Check size={14} />
              <span>
                <b>Versioned presets.</b> <code>parsePreset</code> accepts v1 files, maps{' '}
                <code>environment</code> onto <code>timeOfDay</code>, fills gaps from the cast registry
                and never throws.
              </span>
            </li>
          </ul>
          <div style={{ marginTop: 14 }}>
            <CodeBlock code={ARCHITECTURE_SNIPPET} title="src/rig/id.ts" label="Copy stableId example" className="small" />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <div className="docs-card">
            <div className="docs-card-head">
              <div>
                <h3 className="docs-h3">Layers</h3>
                <p className="docs-sub">Dependencies point downwards only.</p>
              </div>
              <Layers size={16} />
            </div>
            <div className="layer-stack">
              <div className="layer app">
                <Boxes size={15} />
                <code>src/ui · src/docs</code>
                <small>apps — not exported</small>
              </div>
              <div className="layer exported">
                <Film size={15} />
                <code>src/remotion</code>
                <small>compositions + factories</small>
              </div>
              <div className="layer exported">
                <Layers size={15} />
                <code>src/rig</code>
                <small>cast · gait · speech · scenes</small>
              </div>
              <div className="layer exported">
                <BookOpen size={15} />
                <code>src/index.ts</code>
                <small>the only public surface</small>
              </div>
            </div>
          </div>

          <div className="docs-card">
            <div className="docs-card-head">
              <div>
                <h3 className="docs-h3">Coverage</h3>
                <p className="docs-sub">What runs on every push.</p>
              </div>
              <Lightbulb size={16} />
            </div>
            <ul className="arch-list">
              <li>
                <Check size={14} />
                <span><b>81 unit tests</b> — determinism, IK foot-lock, lip-sync timing, preset migration, packaging.</span>
              </li>
              <li>
                <Check size={14} />
                <span><b>48 visual golden hashes</b> — {castCount} cast × 3 motions × 2 emotions, plus 4 scenes × 3 lighting passes.</span>
              </li>
              <li>
                <Check size={14} />
                <span><b>Browser smoke</b> — the studio at <code>/</code>, desktop and mobile.</span>
              </li>
              <li>
                <Check size={14} />
                <span><b>Render smoke</b> — a real 10-frame PNG sequence of <code>CharacterOnly</code>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
