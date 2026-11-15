import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneLayer } from '../src/rig/environments';
for (const scene of ['street','park','room','backdrop']) {
  const ids: string[] = [];
  for (const tod of ['day','golden','night'] as const) {
    const svg = renderToStaticMarkup(<svg><SceneLayer scene={scene} timeOfDay={tod} distance={100} /></svg>);
    ids.push(...[...svg.matchAll(/(?:linear|radial)Gradient id="([^"]+)"/g)].map(m=>m[1]));
  }
  console.log(scene.padEnd(9), ids.join(', '), '-> unique:', new Set(ids).size, '/', ids.length);
}
