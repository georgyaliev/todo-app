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
    dueDate: '2026-01-15',
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

    const todo = service.add('Купить молоко', '2026-01-15');

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

    const second = service.add('Вторая задача', '2026-01-15');
    const all = service.getAll();

    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('first');
    expect(all[1].id).toBe(second.id);
  });

  it('бросает ValidationError и не создаёт задачу при пустой строке', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.add('', '2026-01-15')).toThrowError(ValidationError);
    expect(service.getAll()).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('бросает ValidationError при строке из одних пробелов', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.add('   ', '2026-01-15')).toThrowError(ValidationError);
    expect(service.getAll()).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('бросает ValidationError при тексте длиннее 255 символов', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const longText = 'а'.repeat(256);

    expect(() => service.add(longText, '2026-01-15')).toThrowError(ValidationError);
    expect(service.getAll()).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('принимает текст ровно 255 символов (граница)', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const exactText = 'а'.repeat(255);

    const todo = service.add(exactText, '2026-01-15');
    expect(todo.text).toBe(exactText);
  });

  it('обрезает пробелы по краям перед сохранением', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    const todo = service.add('  задача с пробелами  ', '2026-01-15');
    expect(todo.text).toBe('задача с пробелами');
  });

  it('вызывает слушателя onChange после добавления', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const listener = vi.fn();
    service.onChange(listener);

    service.add('Задача', '2026-01-15');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('сохраняет dueDate в задаче', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    const todo = service.add('Задача с датой', '2026-06-15');
    expect(todo.dueDate).toBe('2026-06-15');
  });

  it('бросает ValidationError при невалидной дате (не-дата)', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.add('текст', 'не-дата')).toThrowError(ValidationError);
    expect(service.getAll()).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('бросает ValidationError при дате в неверном формате (DD.MM.YYYY)', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.add('текст', '15.06.2026')).toThrowError(ValidationError);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('бросает ValidationError при пустой строке в качестве даты', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);

    expect(() => service.add('текст', '')).toThrowError(ValidationError);
    expect(storage.save).not.toHaveBeenCalled();
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
// getByDate()
// ---------------------------------------------------------------------------

describe('TodoService.getByDate()', () => {
  it('возвращает задачи с заданной датой', () => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2026-01-15' }),
      makeTodo({ id: '2', dueDate: '2026-01-16' }),
      makeTodo({ id: '3', dueDate: '2026-01-15' }),
    ];
    const storage = makeMockStorage(todos);
    const service = new TodoService(storage);

    const result = service.getByDate('2026-01-15');
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('возвращает пустой массив если нет задач с такой датой', () => {
    const storage = makeMockStorage([makeTodo({ dueDate: '2026-01-15' })]);
    const service = new TodoService(storage);

    expect(service.getByDate('2026-02-01')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getByDateRange()
// ---------------------------------------------------------------------------

describe('TodoService.getByDateRange()', () => {
  let service: TodoService;

  beforeEach(() => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2026-01-10' }),
      makeTodo({ id: '2', dueDate: '2026-01-15' }),
      makeTodo({ id: '3', dueDate: '2026-01-15' }),
      makeTodo({ id: '4', dueDate: '2026-02-01' }),
    ];
    service = new TodoService(makeMockStorage(todos));
  });

  it('возвращает Map с ключами для всех переданных дат', () => {
    const dates = ['2026-01-10', '2026-01-15', '2026-01-20'];
    const map = service.getByDateRange(dates);

    expect(map.has('2026-01-10')).toBe(true);
    expect(map.has('2026-01-15')).toBe(true);
    expect(map.has('2026-01-20')).toBe(true);
  });

  it('группирует задачи по датам корректно', () => {
    const dates = ['2026-01-10', '2026-01-15'];
    const map = service.getByDateRange(dates);

    expect(map.get('2026-01-10')).toHaveLength(1);
    expect(map.get('2026-01-15')).toHaveLength(2);
  });

  it('дата без задач имеет пустой массив', () => {
    const map = service.getByDateRange(['2026-01-20']);
    expect(map.get('2026-01-20')).toEqual([]);
  });

  it('не включает задачи вне диапазона дат', () => {
    const map = service.getByDateRange(['2026-01-10']);
    // Задача с id '4' (2026-02-01) не должна попасть
    const all = [...map.values()].flat();
    expect(all.find((t) => t.id === '4')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getMonthStats()
// ---------------------------------------------------------------------------

describe('TodoService.getMonthStats()', () => {
  it('считает выполненные и активные задачи за месяц', () => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2026-01-01', completed: false }),
      makeTodo({ id: '2', dueDate: '2026-01-15', completed: true }),
      makeTodo({ id: '3', dueDate: '2026-01-31', completed: false }),
      makeTodo({ id: '4', dueDate: '2026-02-01', completed: true }), // другой месяц
    ];
    const service = new TodoService(makeMockStorage(todos));

    const stats = service.getMonthStats(2026, 0); // Январь (month=0)
    expect(stats.active).toBe(2);
    expect(stats.completed).toBe(1);
  });

  it('возвращает нули для месяца без задач', () => {
    const service = new TodoService(makeMockStorage([]));
    const stats = service.getMonthStats(2026, 5);
    expect(stats.active).toBe(0);
    expect(stats.completed).toBe(0);
  });

  it('не смешивает задачи разных лет', () => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2025-01-15', completed: false }),
      makeTodo({ id: '2', dueDate: '2026-01-15', completed: false }),
    ];
    const service = new TodoService(makeMockStorage(todos));

    const stats2026 = service.getMonthStats(2026, 0);
    expect(stats2026.active).toBe(1);

    const stats2025 = service.getMonthStats(2025, 0);
    expect(stats2025.active).toBe(1);
  });

  it('не считает задачи из хвостов сетки (декабрь в сетке января)', () => {
    // Январь 2026 начинается с четверга — в сетке есть 2025-12-29..31.
    // getMonthStats(2026, 0) должен считать только задачи с prefix "2026-01"
    const todos = [
      makeTodo({ id: '1', dueDate: '2025-12-29', completed: false }), // хвост сетки
      makeTodo({ id: '2', dueDate: '2025-12-31', completed: true }),  // хвост сетки
      makeTodo({ id: '3', dueDate: '2026-01-01', completed: false }), // январь
    ];
    const service = new TodoService(makeMockStorage(todos));

    const stats = service.getMonthStats(2026, 0);
    expect(stats.active).toBe(1);
    expect(stats.completed).toBe(0);
  });

  it('не считает задачи из хвоста следующего месяца', () => {
    // Июнь 2026 заканчивается 30-го, хвост: 2026-07-01..05
    const todos = [
      makeTodo({ id: '1', dueDate: '2026-06-30', completed: false }), // июнь
      makeTodo({ id: '2', dueDate: '2026-07-01', completed: false }), // хвост сетки
      makeTodo({ id: '3', dueDate: '2026-07-05', completed: true }),  // хвост сетки
    ];
    const service = new TodoService(makeMockStorage(todos));

    const stats = service.getMonthStats(2026, 5);
    expect(stats.active).toBe(1);
    expect(stats.completed).toBe(0);
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
    service.add('Задача 1', '2026-01-15');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    service.add('Задача 2', '2026-01-15');
    expect(listener).toHaveBeenCalledTimes(1); // не вызван повторно
  });

  it('несколько слушателей получают уведомления независимо', () => {
    const storage = makeMockStorage();
    const service = new TodoService(storage);
    const l1 = vi.fn();
    const l2 = vi.fn();

    service.onChange(l1);
    service.onChange(l2);
    service.add('Задача', '2026-01-15');

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

    service.add('Задача', '2026-01-15');
    expect(service.getAll()).toHaveLength(0);
  });

  it('не вызывает onChange если save() вернул false при add()', () => {
    const storage = makeMockStorage();
    storage.save.mockReturnValue(false);
    const service = new TodoService(storage);
    const listener = vi.fn();
    service.onChange(listener);

    service.add('Задача', '2026-01-15');
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

    service.add('Задача', '2026-01-15');
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });
});
