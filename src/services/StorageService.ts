import type { Todo } from '../types';

const STORAGE_KEY = 'todos';

function isTodo(value: unknown): value is Todo {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['text'] === 'string' &&
    typeof obj['completed'] === 'boolean' &&
    typeof obj['createdAt'] === 'number'
  );
}

export class StorageService {
  load(): Todo[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = JSON.parse(raw ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isTodo);
    } catch {
      return [];
    }
  }

  save(todos: Todo[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, todos were not saved.');
      }
      return false;
    }
  }
}
