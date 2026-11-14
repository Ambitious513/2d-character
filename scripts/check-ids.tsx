import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterRig } from '../src/rig/Character';
import { CAST, characterSettings } from '../src/rig/cast';

// Simulate what a host does: render each cast member into its OWN svg root.
const ids: string[] = [];
for (const c of CAST) {
  const svg = renderToStaticMarkup(
    <svg viewBox="-150 -430 300 450"><CharacterRig settings={{...characterSettings(c.id), motion:'idle'}} frame={12} /></svg>
  );
  const m = svg.match(/linearGradient id="([^"]+)"/);
  const stop = svg.match(/stop-color="([^"]+)"/);
  ids.push(m?.[1] ?? 'NONE');
  console.log(`${c.name.padEnd(6)} gradientId=${(m?.[1]??'NONE').padEnd(18)} firstStop=${stop?.[1]}  jacket=${c.colors.jacket}`);
}
console.log('\nunique ids:', new Set(ids).size, 'of', ids.length);
console.log(new Set(ids).size === ids.length ? 'OK: no collision' : '*** COLLISION: separate roots share gradient ids -> palette bleed ***');
