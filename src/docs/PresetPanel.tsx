/**
 * Preset panel — `#/docs/presets`.
 *
 * Two halves of the same contract:
 *
 *  - the built-in looks from `PRESETS`, each a complete `SceneSettings` object
 *    that loads straight into the playground;
 *  - a JSON importer that calls the real `parsePreset`, so the errors and the
 *    migration note a visitor sees here are exactly what their own code gets.
 *
 * Nothing is re-implemented: validation, v1 → v2 migration and cast-aware fill
 * all come from the library.
 */

import { useState } from 'react';
import { ArrowUpRight, Check, Download, FileJson, Sparkles, TriangleAlert, Upload } from 'lucide-react';
import {
  PRESETS,
  PRESET_SCHEMA_VERSION,
  getCharacter,
  parsePreset,
  serializePresetJSON,
} from '../index';
import type { PresetParseResult, SceneSettings } from '../index';
import { downloadText } from '../ui/utils';
import { CodeBlock } from './CodeBlock';
import { Chip, Note, SectionHead } from './parts';
import { PRESET_IMPORT_EXAMPLE, PRESET_SNIPPET } from './snippets';

const STRIP: (keyof SceneSettings['colors'])[] = ['jacket', 'pants', 'skin', 'hair', 'accent'];

export function PresetPanel({
  index,
  settings,
  presetName,
  onLoad,
  notify,
  onCopied,
}: {
  index: string;
  /** The playground's current settings — what "download" serialises. */
  settings: SceneSettings;
  presetName: string;
  /** Replace the playground's settings and scroll the visitor there. */
  onLoad: (settings: SceneSettings, name: string) => void;
  notify: (message: string) => void;
  onCopied: (ok: boolean) => void;
}) {
  const [json, setJson] = useState('');
  const [result, setResult] = useState<PresetParseResult | null>(null);

  const validate = () => {
    if (!json.trim()) {
      setResult({ ok: false, errors: ['Paste a preset first — or load the v1 example below.'] });
      return;
    }
    const parsed = parsePreset(json);
    setResult(parsed);
    notify(parsed.ok ? `Preset "${parsed.preset.name}" is valid` : 'Preset rejected — see the errors');
  };

  const downloadCurrent = () => {
    const name = presetName === 'Custom' ? `${getCharacter(settings.character)?.name ?? settings.character} look` : presetName;
    downloadText(
      `stride-${settings.character}-${settings.motion}.json`,
      serializePresetJSON(settings, { name, note: 'Exported from the Stride docs preset panel' }),
    );
    notify('Current playground preset downloaded');
  };

  return (
    <section className="docs-section" id="docs-presets" data-docs-presets>
      <SectionHead
        index={index}
        eyebrow="Presets"
        title={<>A look is just <span>data</span> — and it version-migrates.</>}
        lede="Every preset is a complete settings object, so it can be dropped into defaultProps, saved as JSON or loaded below. parsePreset never throws: it returns a result your UI can render, and it upgrades v1 files on the way in."
      />

      <div className="preset-cards reveal">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className={`preset-card ${presetName === p.name ? 'active' : ''}`}
            aria-label={`Load the ${p.name} preset into the playground`}
            onClick={() => onLoad(p.settings, p.name)}
          >
            <b>{p.name}</b>
            <small>{p.note}</small>
            <span className="preset-strip" aria-hidden="true">
              {STRIP.map((k) => (
                <i key={k} style={{ background: p.settings.colors[k] }} />
              ))}
            </span>
            <span className="preset-go">
              Load into playground
              <ArrowUpRight size={12} />
            </span>
          </button>
        ))}
      </div>

      <div className="docs-grid two reveal" style={{ marginTop: 18 }}>
        <div className="docs-card">
          <div className="docs-card-head">
            <div>
              <h3 className="docs-h3">
                <Upload size={15} />
                Import a preset
              </h3>
              <p className="docs-sub">
                Paste a v{PRESET_SCHEMA_VERSION} envelope, a v1 file, the studio's{' '}
                <code>{'{name, note, settings}'}</code> shape, or bare settings.
              </p>
            </div>
            <Chip tone="mono">parsePreset</Chip>
          </div>

          <div className="preset-import">
            <label className="pg-field" htmlFor="preset-json">
              <span>Preset JSON</span>
              <textarea
                id="preset-json"
                aria-label="Preset JSON"
                spellCheck={false}
                placeholder={PRESET_IMPORT_EXAMPLE}
                value={json}
                onChange={(e) => {
                  setJson(e.target.value);
                  setResult(null);
                }}
              />
            </label>

            <div className="pg-actions">
              <button type="button" className="docs-btn primary small" onClick={validate}>
                <Check size={13} />
                Validate
              </button>
              <button
                type="button"
                className="docs-btn ghost small"
                onClick={() => {
                  setJson(PRESET_IMPORT_EXAMPLE);
                  setResult(null);
                  notify('v1 example pasted — validate it to see the migration');
                }}
              >
                <FileJson size={13} />
                Paste v1 example
              </button>
            </div>

            {result ? (
              result.ok ? (
                <div className="preset-result ok" data-docs-preset-result="ok">
                  <span>
                    <Check size={13} /> <b>{result.preset.name}</b> — {result.preset.settings.character} ·{' '}
                    {result.preset.settings.motion} · {result.preset.settings.scene} ·{' '}
                    {result.preset.settings.timeOfDay}
                  </span>
                  {result.migratedFrom !== null ? (
                    <span data-docs-migration>
                      Migrated v{result.migratedFrom} → v{PRESET_SCHEMA_VERSION}
                      {result.migratedFrom === 1 ? ' (environment → timeOfDay, gaps filled from the cast registry)' : ''}.
                    </span>
                  ) : (
                    <span>Already a current v{PRESET_SCHEMA_VERSION} envelope — no migration needed.</span>
                  )}
                  <button
                    type="button"
                    className="docs-btn accent small"
                    style={{ justifySelf: 'start' }}
                    onClick={() => onLoad(result.preset.settings, result.preset.name)}
                  >
                    Load into playground
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              ) : (
                <div className="preset-result bad" data-docs-preset-result="bad">
                  <span>
                    <TriangleAlert size={13} /> <b>Rejected.</b> parsePreset returned{' '}
                    {result.errors.length} {result.errors.length === 1 ? 'error' : 'errors'}:
                  </span>
                  <ul>
                    {result.errors.map((e) => (
                      <li key={e}>
                        <code>{e}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : (
              <p className="pg-hint">
                Validation is the library's own <code>parsePreset</code> — unknown characters, bad
                enums and malformed JSON are reported here exactly as your code would see them.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="docs-card">
            <div className="docs-card-head">
              <div>
                <h3 className="docs-h3">
                  <FileJson size={15} />
                  The envelope
                </h3>
                <p className="docs-sub">Read and write with two functions.</p>
              </div>
              <Chip tone="accent">v{PRESET_SCHEMA_VERSION}</Chip>
            </div>
            <CodeBlock
              code={PRESET_SNIPPET}
              title="src/rig/preset.ts"
              label="Copy the preset API snippet"
              onCopied={onCopied}
              className="small"
            />
            <div className="pg-actions" style={{ marginTop: 12 }}>
              <button type="button" className="docs-btn accent small" onClick={downloadCurrent}>
                <Download size={13} />
                Download current preset
              </button>
              <Chip tone="mono">{presetName}</Chip>
            </div>
          </div>

          <Note icon={<Sparkles size={16} />}>
            <b>Cast-aware fill.</b> A preset only has to name a character. Hair, outfit, build,
            palette and accessories are filled from <code>castSceneSettings()</code>, so a preset
            saved against an older cast still renders as that character looks today.
          </Note>
        </div>
      </div>
    </section>
  );
}
