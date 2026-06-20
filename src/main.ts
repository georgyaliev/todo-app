import { StorageService } from './services/StorageService';
import { TodoService } from './services/TodoService';
import { TodoList } from './components/TodoList';
import { TodoForm } from './components/TodoForm';

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Required element #${id} not found in DOM`);
  return el as T;
}

const storage = new StorageService();
const service = new TodoService(storage);

const listEl = getElement<HTMLUListElement>('todo-list');
const counterEl = getElement<HTMLParagraphElement>('todo-counter');
const formEl = getElement<HTMLFormElement>('todo-form');
const inputEl = getElement<HTMLInputElement>('todo-input');
const errorEl = getElement<HTMLSpanElement>('todo-error');

const todoList = new TodoList(listEl, counterEl);
const onToggle = (id: string): void => { service.toggle(id); };
const onRemove = (id: string): void => { service.remove(id); };

new TodoForm(formEl, inputEl, errorEl, (text) => {
  service.add(text);
});

service.onChange(() => {
  todoList.render(service.getAll(), service.getActiveCount(), onToggle, onRemove);
});

todoList.render(service.getAll(), service.getActiveCount(), onToggle, onRemove);
