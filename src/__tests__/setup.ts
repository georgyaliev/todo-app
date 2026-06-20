/**
 * Глобальный setup для Vitest.
 * Node.js 26 объявляет globalThis.localStorage = undefined (экспериментальная фича),
 * что мешает jsdom переопределить его через populateGlobal.
 * Устанавливаем полноценный in-memory localStorage вручную.
 */
import { beforeEach } from 'vitest';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  localStorageMock.clear();
});
