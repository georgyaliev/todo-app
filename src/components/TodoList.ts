import type { Todo } from '../types';
import { createTodoItem } from './TodoItem';

export class TodoList {
  private readonly listEl: HTMLUListElement;
  private readonly counterEl: HTMLParagraphElement;

  constructor(listEl: HTMLUListElement, counterEl: HTMLParagraphElement) {
    this.listEl = listEl;
    this.counterEl = counterEl;
  }

  render(
    todos: Todo[],
    activeCount: number,
    onToggle: (id: string) => void,
    onRemove: (id: string) => void,
  ): void {
    this.listEl.textContent = '';

    if (todos.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'Нет задач. Добавьте первую!';
      this.listEl.appendChild(empty);
    } else {
      for (const todo of todos) {
        this.listEl.appendChild(createTodoItem(todo, onToggle, onRemove));
      }
    }

    this.counterEl.textContent =
      activeCount > 0 ? `Осталось: ${activeCount}` : 'Все задачи выполнены!';
  }
}
