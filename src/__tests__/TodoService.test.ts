import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TodoService } from '../services/TodoService';
import { ValidationError, NotFoundError } from '../errors';
import type { Todo } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockStorage(initial: Todo[] = []) {
  const store = { todos: initial };
  return {
    load: vi.fn(() => [...store.todos]),
    save: vi.fn((todos: Todo[]) => {
      store.todos = [...todos];
      return true;
    }),
    _store: store,
  };
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'test-id-1',
    text: 'Test task',
    completed: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// add()
// ---------------------------------------------------------------------------

describe('TodoService.add()', () => {
  it('добавляет задачу в конец списка со статусом "не выполнена"', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    const todo = service.add('Купить молоко');

    expect(todo.text).toBe('Купить молоко');
    expect(todo.completed).toBe(false);

    const all = service.getAll();
    expect(all).toHaveLength(1);
    expect(all[all.length - 1].id).toBe(todo.id);
  });

  it('добавляет новую задачу в конец, когда список непуст', () => {
    const existing = makeTodo({ id: 'first', text: 'Первая' });
    const storage = makeMockStorage([existing]);
    const service = new TodoService(storage);

    const second = service.add('Вторая задача');
    const all = service.getAll();

    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('first');
    expect(all[1].id).toBe(second.id);
  });

  it('бросает ValidationError и не создаёт задачу при пустой строке', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.add('')).toThrowError(ValidationError);
    expect(service.getAll()).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('бросает ValidationError при строке из одних пробелов', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.add('   ')).toThrowError(ValidationError);
    expect(service.getAll()).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('бросает ValidationError при тексте длиннее 255 символов', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const longText = 'а'.repeat(256);

    expect(() => service.add(longText)).toThrowError(ValidationError);
    expect(service.getAll()).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('принимает текст ровно 255 символов (граница)', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const exactText = 'а'.repeat(255);

    const todo = service.add(exactText);
    expect(todo.text).toBe(exactText);
  });

  it('обрезает пробелы по краям перед сохранением', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    const todo = service.add('  задача с пробелами  ');
    expect(todo.text).toBe('задача с пробелами');
  });

  it('вызывает слушателя onChange после добавления', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const listener = vi.fn();
    service.onChange(listener);

    service.add('Задача');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// toggle()
// ---------------------------------------------------------------------------

describe('TodoService.toggle()', () => {
  it('переключает не выполненную задачу в выполненную, активный счётчик уменьшается', () => {
    const todo = makeTodo({ id: 'id-1', completed: false });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);

    const countBefore = service.getActiveCount();
    const updated = service.toggle('id-1');

    expect(updated.completed).toBe(true);
    expect(service.getActiveCount()).toBe(countBefore - 1);
  });

  it('переключает выполненную задачу обратно, активный счётчик увеличивается', () => {
    const todo = makeTodo({ id: 'id-1', completed: true });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);

    const countBefore = service.getActiveCount();
    const updated = service.toggle('id-1');

    expect(updated.completed).toBe(false);
    expect(service.getActiveCount()).toBe(countBefore + 1);
  });

  it('бросает NotFoundError при несуществующем id', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.toggle('no-such-id')).toThrowError(NotFoundError);
  });

  it('вызывает слушателя onChange после переключения', () => {
    const todo = makeTodo({ id: 'id-1' });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);
    const listener = vi.fn();
    service.onChange(listener);

    service.toggle('id-1');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('не мутирует оригинальный объект задачи', () => {
    const todo = makeTodo({ id: 'id-1', completed: false });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);

    const original = service.getAll()[0];
    service.toggle('id-1');

    // getAll() возвращает копию, original — ссылка на копию до toggle
    expect(original.completed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// remove()
// ---------------------------------------------------------------------------

describe('TodoService.remove()', () => {
  it('удаляет задачу, остальные остаются неизменными', () => {
    const t1 = makeTodo({ id: 'id-1', text: 'Первая' });
    const t2 = makeTodo({ id: 'id-2', text: 'Вторая' });
    const t3 = makeTodo({ id: 'id-3', text: 'Третья' });
    const storage = makeMockStorage([t1, t2, t3]);
    const service = new TodoService(storage);

    service.remove('id-2');

    const all = service.getAll();
    expect(all).toHaveLength(2);
    expect(all.find((t) => t.id === 'id-2')).toBeUndefined();
    expect(all[0].id).toBe('id-1');
    expect(all[1].id).toBe('id-3');
  });

  it('после удаления последней задачи список пуст', () => {
    const todo = makeTodo({ id: 'id-1' });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);

    service.remove('id-1');
    expect(service.getAll()).toHaveLength(0);
  });

  it('бросает NotFoundError при несуществующем id', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.remove('ghost-id')).toThrowError(NotFoundError);
  });

  it('вызывает слушателя onChange после удаления', () => {
    const todo = makeTodo({ id: 'id-1' });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);
    const listener = vi.fn();
    service.onChange(listener);

    service.remove('id-1');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// getActiveCount()
// ---------------------------------------------------------------------------

describe('TodoService.getActiveCount()', () => {
  it('возвращает 0 при пустом списке', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    expect(service.getActiveCount()).toBe(0);
  });

  it('учитывает только не выполненные задачи', () => {
    const todos = [
      makeTodo({ id: '1', completed: false }),
      makeTodo({ id: '2', completed: true }),
      makeTodo({ id: '3', completed: false }),
    ];
    const storage = makeMockStorage(todos);
    const service = new TodoService(storage);

    expect(service.getActiveCount()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// onChange() / unsubscribe
// ---------------------------------------------------------------------------

describe('TodoService.onChange()', () => {
  it('функция отписки прекращает получение уведомлений', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const listener = vi.fn();

    const unsubscribe = service.onChange(listener);
    service.add('Задача 1');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    service.add('Задача 2');
    expect(listener).toHaveBeenCalledTimes(1); // не вызван повторно
  });

  it('несколько слушателей получают уведомления независимо', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const l1 = vi.fn();
    const l2 = vi.fn();

    service.onChange(l1);
    service.onChange(l2);
    service.add('Задача');

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Поведение при сбое хранилища
// ---------------------------------------------------------------------------

describe('TodoService — сбой storage.save()', () => {
  it('не обновляет внутреннее состояние если save() вернул false при add()', () => {
    const storage = makeMockStorage();
    storage.save.mockReturnValue(false);
    const service = new TodoService(storage);

    service.add('Задача');
    expect(service.getAll()).toHaveLength(0);
  });

  it('не вызывает onChange если save() вернул false при add()', () => {
    const storage = makeMockStorage();
    storage.save.mockReturnValue(false);
    const service = new TodoService(storage);
    const listener = vi.fn();
    service.onChange(listener);

    service.add('Задача');
    expect(listener).not.toHaveBeenCalled();
  });

  it('не обновляет состояние и не вызывает onChange если save() вернул false при toggle()', () => {
    const todo = makeTodo({ id: 'id-1', completed: false });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);
    // первый save (при конструкторе) уже был, теперь сбой
    storage.save.mockReturnValue(false);
    const listener = vi.fn();
    service.onChange(listener);

    service.toggle('id-1');

    // completed не изменился
    expect(service.getAll()[0].completed).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('не обновляет состояние и не вызывает onChange если save() вернул false при remove()', () => {
    const todo = makeTodo({ id: 'id-1' });
    const storage = makeMockStorage([todo]);
    const service = new TodoService(storage);
    storage.save.mockReturnValue(false);
    const listener = vi.fn();
    service.onChange(listener);

    service.remove('id-1');

    // задача осталась
    expect(service.getAll()).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// onChange() — граничный случай двойной отписки
// ---------------------------------------------------------------------------

describe('TodoService.onChange() — повторная отписка', () => {
  it('повторный вызов unsubscribe не падает и не ломает других слушателей', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const l1 = vi.fn();
    const l2 = vi.fn();

    const unsub1 = service.onChange(l1);
    service.onChange(l2);

    unsub1(); // первая отписка
    unsub1(); // вторая отписка — не должна кинуть ошибку

    service.add('Задача');
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });
});
