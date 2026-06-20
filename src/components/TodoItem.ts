import type { Todo } from '../types';

export function createTodoItem(
  todo: Todo,
  onToggle: (id: string) => void,
  onRemove: (id: string) => void,
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'todo-item';
  if (todo.completed) {
    li.classList.add('completed');
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `Отметить задачу: ${todo.text}`);
  checkbox.addEventListener('change', () => {
    onToggle(todo.id);
  });

  const span = document.createElement('span');
  span.textContent = todo.text;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.setAttribute('aria-label', `Удалить задачу: ${todo.text}`);
  deleteBtn.textContent = '✕';
  deleteBtn.addEventListener('click', () => {
    onRemove(todo.id);
  });

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}
