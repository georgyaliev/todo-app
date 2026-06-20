import type { Todo } from '../types';
import { ValidationError, NotFoundError } from '../errors';
import type { StorageService } from './StorageService';
import { createTodo } from '../models/Todo';

export class TodoService {
  private readonly storage: StorageService;
  private todos: Todo[];
  private readonly listeners: Array<() => void> = [];

  constructor(storage: StorageService) {
    this.storage = storage;
    this.todos = storage.load();
  }

  getAll(): Todo[] {
    return [...this.todos];
  }

  getActiveCount(): number {
    return this.todos.filter((t) => !t.completed).length;
  }

  add(text: string): Todo {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Введите текст задачи');
    }
    if (trimmed.length > 255) {
      throw new ValidationError('Текст не должен превышать 255 символов');
    }

    const todo = createTodo(trimmed);
    const newTodos = [...this.todos, todo];
    if (this.storage.save(newTodos)) {
      this.todos = newTodos;
      this.notify();
    }
    return todo;
  }

  toggle(id: string): Todo {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) throw new NotFoundError(`Todo с id "${id}" не найден`);

    const updated = { ...this.todos[index], completed: !this.todos[index].completed };
    const newTodos = [
      ...this.todos.slice(0, index),
      updated,
      ...this.todos.slice(index + 1),
    ];
    if (this.storage.save(newTodos)) {
      this.todos = newTodos;
      this.notify();
    }
    return { ...updated };
  }

  remove(id: string): void {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) throw new NotFoundError(`Todo с id "${id}" не найден`);

    const newTodos = this.todos.filter((t) => t.id !== id);
    if (this.storage.save(newTodos)) {
      this.todos = newTodos;
      this.notify();
    }
  }

  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i !== -1) this.listeners.splice(i, 1);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
