/**
 * Versioned preset files.
 *
 * A preset is the unit of exchange between the studio, a host app and a JSON
 * file on disk. It is wrapped in a small envelope so it can evolve:
 *
 *   { "version": 2, "name": "Morning stroll", "settings": { … } }
 *
 * `parsePreset` accepts every shape this project has ever emitted and returns a
 * complete, validated `SceneSettings`:
 *
 *   - v2 envelope                    → validated as-is
 *   - v1 envelope (`version: 1`)     → `environment` mapped onto `timeOfDay`
 *   - `{ name, note, settings }`     → the studio's `ScenePreset` shape
 *   - a bare settings object         → what v1's "Export props JSON" produced
 *
 * Missing fields are filled from the cast registry, not from a flat default, so
 * a minimal preset like `{ "character": "kwame" }` still looks like Kwame.
 *
 * Parsing never throws: it returns a result object so a UI can show the errors.
 */

import { castSceneSettings, hasCharacter } from './cast';
import { presetSettingsSchema } from './schema';
import { DEFAULT_SETTINGS, type SceneSettings, type TimeOfDay } from './types';

/** Bump when the meaning of an existing field changes. */
export const PRESET_SCHEMA_VERSION = 2;

export interface PresetFile {
  version: number;
  name: string;
  note?: string;
  settings: SceneSettings;
}

export interface PresetMeta {
  name: string;
  note?: string;
}

export type PresetParseResult =
  | { ok: true; preset: PresetFile; migratedFrom: number | null }
  | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Wrap a settings object in the current envelope. */
export function serializePreset(settings: SceneSettings, meta: PresetMeta): PresetFile {
  const { environment: _legacy, ...clean } = settings;
  return {
    version: PRESET_SCHEMA_VERSION,
    name: meta.name,
    ...(meta.note ? { note: meta.note } : {}),
    settings: clean as SceneSettings,
  };
}

/** Pretty-printed JSON, ready to write to disk or offer as a download. */
export function serializePresetJSON(settings: SceneSettings, meta: PresetMeta): string {
  return `${JSON.stringify(serializePreset(settings, meta), null, 2)}\n`;
}

/**
 * Validate and upgrade any accepted preset shape into a complete v2 preset.
 * Unknown keys are dropped, so a preset can never smuggle in stray fields.
 */
export function parsePreset(input: unknown): PresetParseResult {
  let raw: unknown = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ok: false, errors: ['Not valid JSON.'] };
    }
  }
  if (!isRecord(raw)) {
    return { ok: false, errors: ['A preset must be a JSON object.'] };
  }

  // Unwrap: envelope with `settings`, or a bare settings object.
  // A present-but-malformed `settings` is an error, not a cue to fall back to
  // defaults — otherwise a truncated file would silently load as "Milo, walk".
  if ('settings' in raw && !isRecord(raw.settings)) {
    return { ok: false, errors: ['"settings" must be an object.'] };
  }
  const enveloped = isRecord(raw.settings);
  const declaredVersion = typeof raw.version === 'number' ? raw.version : null;
  const body = enveloped ? (raw.settings as Record<string, unknown>) : raw;

  if (declaredVersion !== null && declaredVersion > PRESET_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `Preset version ${declaredVersion} is newer than this build understands (v${PRESET_SCHEMA_VERSION}). Update the kit.`,
      ],
    };
  }

  const parsed = presetSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'settings'}: ${i.message}`),
    };
  }

  const data = parsed.data;
  const character = data.character ?? DEFAULT_SETTINGS.character;
  if (!hasCharacter(character)) {
    return {
      ok: false,
      errors: [`Unknown character "${character}". Register it with registerCharacter() or pick one from the cast.`],
    };
  }

  // v1 called the lighting pass `environment`. Explicit `timeOfDay` always wins.
  const legacyLighting = data.environment as TimeOfDay | undefined;
  const { environment: _drop, ...rest } = data;
  const settings = castSceneSettings(character, rest as Partial<SceneSettings>);
  if (legacyLighting && !data.timeOfDay) settings.timeOfDay = legacyLighting;
  delete settings.environment;

  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `${character} preset`;
  const note = typeof raw.note === 'string' ? raw.note : undefined;

  // Anything below the current version, or unversioned, counts as migrated.
  const migratedFrom =
    declaredVersion === PRESET_SCHEMA_VERSION ? null : (declaredVersion ?? 1);

  return {
    ok: true,
    preset: { version: PRESET_SCHEMA_VERSION, name, ...(note ? { note } : {}), settings },
    migratedFrom,
  };
}

/** Convenience wrapper: parse, or throw with a readable message. */
export function parsePresetOrThrow(input: unknown): PresetFile {
  const result = parsePreset(input);
  if (!result.ok) throw new Error(`Invalid preset:\n  - ${result.errors.join('\n  - ')}`);
  return result.preset;
}
