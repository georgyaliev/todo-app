/**
 * Интеграционные тесты: TodoService + StorageService через реальный localStorage (jsdom).
 * Критерий приёмки «Персистентность»:
 *   Given: задачи добавлены → When: новый StorageService.load() → Then: все задачи и статусы восстановлены.
 */
import { describe, it, expect } from 'vitest';
import { TodoService } from '../services/TodoService';
import { StorageService } from '../services/StorageService';

// localStorage очищается глобально в src/__tests__/setup.ts перед каждым тестом

const TEST_DATE = '2026-01-15';

describe('Персистентность: TodoService + StorageService', () => {
  it('задачи, добавленные через первый экземпляр, видны во втором', () => {
    const storage1 = new StorageService();
    const service1 = new TodoService(storage1);

    const t1 = service1.add('Задача A', TEST_DATE);
    const t2 = service1.add('Задача B', TEST_DATE);

    // Второй независимый экземпляр читает тот же localStorage
    const storage2 = new StorageService();
    const service2 = new TodoService(storage2);
    const loaded = service2.getAll();

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe(t1.id);
    expect(loaded[1].id).toBe(t2.id);
  });

  it('статус completed сохраняется и восстанавливается корректно', () => {
    const storage1 = new StorageService();
    const service1 = new TodoService(storage1);

    const t1 = service1.add('Задача A', TEST_DATE);
    service1.add('Задача B', TEST_DATE);
    service1.toggle(t1.id); // t1 → completed = true

    const loaded = new TodoService(new StorageService()).getAll();

    const restoredT1 = loaded.find((t) => t.id === t1.id)!;
    const restoredT2 = loaded.find((t) => t.id !== t1.id)!;

    expect(restoredT1.completed).toBe(true);
    expect(restoredT2.completed).toBe(false);
  });

  it('после удаления задачи новый экземпляр не видит её', () => {
    const storage1 = new StorageService();
    const service1 = new TodoService(storage1);

    const t1 = service1.add('Удалить меня', TEST_DATE);
    service1.add('Оставить', TEST_DATE);
    service1.remove(t1.id);

    const loaded = new TodoService(new StorageService()).getAll();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].text).toBe('Оставить');
  });

  it('после удаления последней задачи новый экземпляр загружает пустой список', () => {
    const storage1 = new StorageService();
    const service1 = new TodoService(storage1);

    const t1 = service1.add('Единственная задача', TEST_DATE);
    service1.remove(t1.id);

    const loaded = new TodoService(new StorageService()).getAll();
    expect(loaded).toHaveLength(0);
  });

  it('все поля задачи (id, text, completed, createdAt, dueDate) сохраняются без изменений', () => {
    const storage1 = new StorageService();
    const service1 = new TodoService(storage1);
    const original = service1.add('Проверка полей', TEST_DATE);

    const loaded = new TodoService(new StorageService()).getAll();
    const restored = loaded[0];

    expect(restored.id).toBe(original.id);
    expect(restored.text).toBe(original.text);
    expect(restored.completed).toBe(original.completed);
    expect(restored.createdAt).toBe(original.createdAt);
    expect(restored.dueDate).toBe(original.dueDate);
  });
});
