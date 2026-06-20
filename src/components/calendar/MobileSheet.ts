import type { Todo } from '../../types';

export interface SheetCallbacks {
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (text: string, date: string) => void;
}

export class MobileSheet {
  private callbacks: SheetCallbacks;
  private sheetEl: HTMLElement;
  private listEl: HTMLElement;
  private dateHeading: HTMLElement;
  private addInput: HTMLInputElement;
  public currentDate = '';

  constructor(callbacks: SheetCallbacks) {
    this.callbacks = callbacks;

    const sheet = document.createElement('div');
    sheet.className = 'cal-sheet';

    const overlay = document.createElement('div');
    overlay.className = 'cal-sheet__overlay';
    overlay.addEventListener('click', () => this.close());

    const panel = document.createElement('div');
    panel.className = 'cal-sheet__panel';

    const header = document.createElement('div');
    header.className = 'cal-sheet__header';

    const heading = document.createElement('span');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cal-sheet__close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.addEventListener('click', () => this.close());

    header.append(heading, closeBtn);

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';

    const addRow = document.createElement('div');
    addRow.className = 'cal-sheet__add';

    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.className = 'cal-sheet__input';
    addInput.placeholder = 'Новая задача...';
    addInput.maxLength = 255;

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'cal-sheet__submit';
    addBtn.textContent = 'Добавить';

    addRow.append(addInput, addBtn);

    const handleAdd = (): void => {
      const value = addInput.value.trim();
      if (value.length > 0 && this.currentDate) {
        this.callbacks.onAdd(value, this.currentDate);
        addInput.value = '';
      }
    };

    addBtn.addEventListener('click', handleAdd);
    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    });

    panel.append(header, list, addRow);
    sheet.append(overlay, panel);
    document.body.appendChild(sheet);

    this.sheetEl = sheet;
    this.listEl = list;
    this.dateHeading = heading;
    this.addInput = addInput;
  }

  open(date: string, todos: Todo[], callbacks: SheetCallbacks): void {
    this.currentDate = date;
    this.callbacks = callbacks;
    this.dateHeading.textContent = date;
    this.renderList(todos);
    this.sheetEl.classList.add('cal-sheet--visible');
    this.addInput.focus();
  }

  updateTodos(todos: Todo[]): void {
    this.renderList(todos);
  }

  private renderList(todos: Todo[]): void {
    this.listEl.textContent = '';
    for (const todo of todos) {
      const li = document.createElement('li');
      li.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = todo.completed;
      check.style.cursor = 'pointer';
      check.addEventListener('change', () => {
        this.callbacks.onToggle(todo.id);
      });

      const text = document.createElement('span');
      text.style.flex = '1';
      text.textContent = todo.text;
      if (todo.completed) {
        text.style.textDecoration = 'line-through';
        text.style.opacity = '0.45';
      }

      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1rem;color:#999;';
      delBtn.setAttribute('aria-label', `Удалить задачу: ${todo.text}`);
      delBtn.addEventListener('click', () => {
        this.callbacks.onRemove(todo.id);
      });

      li.append(check, text, delBtn);
      this.listEl.appendChild(li);
    }
  }

  close(): void {
    this.sheetEl.classList.remove('cal-sheet--visible');
    this.currentDate = '';
  }

  destroy(): void {
    this.sheetEl.remove();
  }
}
