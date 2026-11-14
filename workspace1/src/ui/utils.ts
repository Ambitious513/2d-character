export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const USAGE_SNIPPET = `import { Composition } from 'remotion';
import { WalkScene } from './remotion/Compositions';
import preset from './milo-preset.json';

export const MyVideo = () => (
  <Composition
    id="MiloWalk"
    component={WalkScene}
    durationInFrames={300}
    fps={30}
    width={1280}
    height={720}
    defaultProps={preset}
  />
);`;
