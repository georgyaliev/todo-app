import type { Todo } from '../types';

export function createTodo(text: string, dueDate: string): Todo {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
    dueDate,
  };
}
