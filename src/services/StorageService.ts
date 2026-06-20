import type { Todo, StorageEnvelope } from '../types';
import { toISODate } from '../utils/dateUtils';

const STORAGE_KEY = 'todos';
const CURRENT_VERSION = 2;

function isLegacyTodo(v: unknown): v is Omit<Todo, 'dueDate'> & { dueDate?: string } {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['text'] === 'string' &&
    typeof obj['completed'] === 'boolean' &&
    typeof obj['createdAt'] === 'number'
  );
}

function isTodo(v: unknown): v is Todo {
  if (!isLegacyTodo(v)) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj['dueDate'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj['dueDate'] as string);
}

function isEnvelope(v: unknown): v is StorageEnvelope {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj['version'] === 'number' && Array.isArray(obj['todos']);
}

export class StorageService {
  private saveEnvelope(envelope: StorageEnvelope): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, todos were not saved.');
      }
      return false;
    }
  }

  load(): Todo[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }

    let envelope: StorageEnvelope;

    if (Array.isArray(parsed)) {
      // v1 → v2 migration
      const today = toISODate(new Date());
      const todos: Todo[] = parsed
        .filter(isLegacyTodo)
        .map((t) => {
          const raw = (t as Record<string, unknown>)['dueDate'];
          const dueDate = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
          return { ...t, dueDate };
        })
        .filter(isTodo);
      envelope = { version: CURRENT_VERSION, todos };
      this.saveEnvelope(envelope);
    } else if (isEnvelope(parsed)) {
      envelope = parsed;
    } else {
      return [];
    }

    return envelope.todos.filter(isTodo);
  }

  save(todos: Todo[]): boolean {
    return this.saveEnvelope({ version: CURRENT_VERSION, todos });
  }
}
