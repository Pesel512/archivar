import type { Cache } from './types.js';

export function createMemoryCache(): Cache {
  const store = new Map<string, unknown>();
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
  };
}
