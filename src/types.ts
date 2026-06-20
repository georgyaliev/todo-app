export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate: string; // YYYY-MM-DD
}

export interface StorageEnvelope {
  version: number;
  todos: Todo[];
}
