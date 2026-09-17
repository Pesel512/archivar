import { useEffect, useState } from 'react';

export type Route = '/' | '/calibrate' | '/debug';

function normalizeHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/calibrate' || path === '/debug') {
    return path;
  }
  return '/';
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => normalizeHash(window.location.hash));

  useEffect(() => {
    const onHashChange = (): void => setRoute(normalizeHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
