import { describe, it, expect } from 'vitest';
import { StorageService } from '../services/StorageService';
import type { Todo } from '../types';

// localStorage очищается глобально в src/__tests__/setup.ts перед каждым тестом

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    text: 'Test',
    completed: false,
    createdAt: 1000000,
    dueDate: '2026-01-15',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// load()
// ---------------------------------------------------------------------------

describe('StorageService.load()', () => {
  it('возвращает пустой массив когда localStorage пуст', () => {
    const service = new StorageService();
    expect(service.load()).toEqual([]);
  });

  it('восстанавливает сохранённые задачи со всеми полями', () => {
    const todos: Todo[] = [
      makeTodo({ id: 'id-1', text: 'Первая', completed: false, createdAt: 1001 }),
      makeTodo({ id: 'id-2', text: 'Вторая', completed: true, createdAt: 1002 }),
    ];
    // Save as v2 envelope
    localStorage.setItem('todos', JSON.stringify({ version: 2, todos }));

    const service = new StorageService();
    const loaded = service.load();

    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toEqual(todos[0]);
    expect(loaded[1]).toEqual(todos[1]);
  });

  it('восстанавливает статус completed корректно', () => {
    const todos: Todo[] = [
      makeTodo({ id: 'id-1', completed: true }),
      makeTodo({ id: 'id-2', completed: false }),
    ];
    localStorage.setItem('todos', JSON.stringify({ version: 2, todos }));

    const service = new StorageService();
    const loaded = service.load();

    expect(loaded[0].completed).toBe(true);
    expect(loaded[1].completed).toBe(false);
  });

  it('возвращает пустой массив при битом JSON', () => {
    localStorage.setItem('todos', '{not valid json}}');
    const service = new StorageService();
    expect(service.load()).toEqual([]);
  });

  it('возвращает пустой массив если значение не массив и не envelope', () => {
    localStorage.setItem('todos', JSON.stringify({ id: '1' }));
    const service = new StorageService();
    expect(service.load()).toEqual([]);
  });

  it('фильтрует невалидные элементы массива (v1), сохраняя валидные с dueDate', () => {
    const valid = makeTodo({ id: 'valid-id' });
    const invalid = { foo: 'bar' };
    // v1 format: raw array
    localStorage.setItem('todos', JSON.stringify([valid, invalid]));

    const service = new StorageService();
    const loaded = service.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('valid-id');
  });

  it('фильтрует элементы с отсутствующими обязательными полями', () => {
    const noId = { text: 'Без id', completed: false, createdAt: 100, dueDate: '2026-01-15' };
    const noCompleted = { id: 'x', text: 'Без completed', createdAt: 100, dueDate: '2026-01-15' };
    // v2 envelope
    localStorage.setItem('todos', JSON.stringify({ version: 2, todos: [noId, noCompleted] }));

    const service = new StorageService();
    expect(service.load()).toEqual([]);
  });

  it('фильтрует null в массиве (v2 envelope)', () => {
    localStorage.setItem('todos', JSON.stringify({ version: 2, todos: [null, makeTodo({ id: 'valid' })] }));

    const service = new StorageService();
    const loaded = service.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('valid');
  });

  it('загружает v1-массив без dueDate → мигрирует, добавляет dueDate=сегодня', () => {
    // v1: raw array, todos without dueDate
    const legacyTodos = [
      { id: 'leg-1', text: 'Старая задача', completed: false, createdAt: 500 },
    ];
    localStorage.setItem('todos', JSON.stringify(legacyTodos));

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const service = new StorageService();
    const loaded = service.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('leg-1');
    expect(loaded[0].dueDate).toBe(todayStr);
  });

  it('загружает v2-envelope → корректно возвращает задачи', () => {
    const todos: Todo[] = [
      makeTodo({ id: 'env-1', text: 'Задача в envelope' }),
    ];
    const envelope = { version: 2, todos };
    localStorage.setItem('todos', JSON.stringify(envelope));

    const service = new StorageService();
    const loaded = service.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('env-1');
    expect(loaded[0].dueDate).toBe('2026-01-15');
  });

  it('v1 запись с dueDate: null → получает dueDate=today, запись не теряется', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const legacyWithNull = [
      { id: 'null-1', text: 'Задача с null датой', completed: false, createdAt: 100, dueDate: null },
    ];
    localStorage.setItem('todos', JSON.stringify(legacyWithNull));

    const service = new StorageService();
    const loaded = service.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('null-1');
    expect(loaded[0].dueDate).toBe(todayStr);
  });

  it('v1 без dueDate → после load() localStorage содержит v2 envelope', () => {
    const legacyTodos = [
      { id: 'leg-1', text: 'Задача', completed: false, createdAt: 500 },
    ];
    localStorage.setItem('todos', JSON.stringify(legacyTodos));

    const service = new StorageService();
    service.load();

    const raw = localStorage.getItem('todos');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { version: number; todos: unknown[] };
    expect(parsed.version).toBe(2);
    expect(Array.isArray(parsed.todos)).toBe(true);
    expect(parsed.todos).toHaveLength(1);
  });

  it('v1 массив без dueDate → данные не теряются, все записи присутствуют', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const legacyTodos = [
      { id: 'leg-1', text: 'Первая', completed: false, createdAt: 1 },
      { id: 'leg-2', text: 'Вторая', completed: true, createdAt: 2 },
    ];
    localStorage.setItem('todos', JSON.stringify(legacyTodos));

    const service = new StorageService();
    const loaded = service.load();

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('leg-1');
    expect(loaded[1].id).toBe('leg-2');
    expect(loaded[0].dueDate).toBe(todayStr);
    expect(loaded[1].dueDate).toBe(todayStr);
    // Остальные поля не изменились
    expect(loaded[0].text).toBe('Первая');
    expect(loaded[1].completed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// save()
// ---------------------------------------------------------------------------

describe('StorageService.save()', () => {
  it('сохраняет массив задач и возвращает true', () => {
    const todos: Todo[] = [makeTodo({ id: 'save-1', text: 'Сохранённая' })];
    const service = new StorageService();

    const result = service.save(todos);

    expect(result).toBe(true);
    const raw = localStorage.getItem('todos');
    expect(raw).not.toBeNull();
    // v2 saves as envelope
    const parsed = JSON.parse(raw!) as { version: number; todos: Todo[] };
    expect(parsed.version).toBe(2);
    expect(parsed.todos).toEqual(todos);
  });

  it('сохраняет пустой массив', () => {
    const service = new StorageService();
    const result = service.save([]);

    expect(result).toBe(true);
    const parsed = JSON.parse(localStorage.getItem('todos')!) as { version: number; todos: Todo[] };
    expect(parsed.todos).toEqual([]);
  });

  it('перезаписывает предыдущие данные при повторном вызове', () => {
    const service = new StorageService();
    const first: Todo[] = [makeTodo({ id: 'first' })];
    const second: Todo[] = [makeTodo({ id: 'second', text: 'Обновлённая' })];

    service.save(first);
    service.save(second);

    const loaded = service.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('second');
  });

  it('возвращает false при QuotaExceededError', () => {
    const service = new StorageService();

    // Подменяем setItem так, чтобы он бросил QuotaExceededError
    const quotaError = new DOMException('QuotaExceeded', 'QuotaExceededError');
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw quotaError; };

    const result = service.save([makeTodo()]);
    expect(result).toBe(false);

    // Восстанавливаем
    localStorage.setItem = original;
  });

  it('возвращает false при любой другой ошибке setItem', () => {
    const service = new StorageService();

    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new Error('Unexpected error'); };

    const result = service.save([makeTodo()]);
    expect(result).toBe(false);

    localStorage.setItem = original;
  });
});

// ---------------------------------------------------------------------------
// Интеграция: round-trip save → load
// ---------------------------------------------------------------------------

describe('StorageService — round-trip (save → load)', () => {
  it('новый экземпляр StorageService загружает данные, сохранённые другим экземпляром', () => {
    const todos: Todo[] = [
      makeTodo({ id: 'rt-1', text: 'Round-trip 1', completed: false, createdAt: 9001 }),
      makeTodo({ id: 'rt-2', text: 'Round-trip 2', completed: true, createdAt: 9002 }),
    ];

    new StorageService().save(todos);
    const loaded = new StorageService().load();

    expect(loaded).toHaveLength(2);
    expect(loaded).toEqual(todos);
  });
});
