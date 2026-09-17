import type { KeyValueStore } from '@pesel512/archivar-camera';

/** `KeyValueStore`-Implementierung über `window.localStorage`, für `camera`s reine Module. */
export const localStorageStore: KeyValueStore = {
  get: (key) => window.localStorage.getItem(key),
  set: (key, value) => window.localStorage.setItem(key, value),
  remove: (key) => window.localStorage.removeItem(key),
};
