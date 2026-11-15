import React, { Suspense, lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/bricolage-grotesque';
import './styles.css';
import App from './App';

/**
 * Two apps, one build:
 *
 *   /            → the Stride studio (unchanged)
 *   #/docs       → the documentation site, lazily loaded
 *   #/docs/<id>  → the docs, scrolled to a section
 *
 * Hash routing needs no server rewrites, so the same bundle works in dev, in
 * `vite preview`, on a static host and inside a sandboxed preview iframe.
 */
const DocsSite = lazy(() => import('./docs/DocsSite'));

const isDocsRoute = (hash: string) => hash.startsWith('#/docs');

function Root() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const docs = isDocsRoute(hash);

  // Coming back from a long docs page should not leave the studio scrolled.
  useEffect(() => {
    if (!docs) window.scrollTo(0, 0);
  }, [docs]);

  if (docs) {
    return (
      <Suspense fallback={<div className="docs-boot" role="status">Loading Stride docs…</div>}>
        <DocsSite />
      </Suspense>
    );
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
