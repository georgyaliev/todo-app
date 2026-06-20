import type { GridCell } from '../../utils/dateUtils';
import type { Todo } from '../../types';

export interface CellCallbacks {
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onCellClick: (date: string) => void;
  onShowMore: (date: string) => void;
  onAddInline: (text: string, date: string) => void;
}

const VISIBLE_LIMIT = 3;

function isMobile(): boolean {
  return window.matchMedia('(max-width: 480px)').matches;
}

export function createCalendarCell(
  cell: GridCell,
  todos: Todo[],
  callbacks: CellCallbacks,
  openInlineForm: (cellEl: HTMLElement, date: string) => void,
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'cal-cell' + (cell.isCurrentMonth ? '' : ' cal-cell--tail');

  // Day number
  const numEl = document.createElement('div');
  numEl.className = 'cal-cell__num';
  const dayNum = new Date(cell.date + 'T00:00:00').getDate();

  if (cell.isToday) {
    const todaySpan = document.createElement('span');
    todaySpan.className = 'cal-cell__num--today';
    todaySpan.textContent = String(dayNum);
    numEl.appendChild(todaySpan);
  } else {
    numEl.textContent = String(dayNum);
  }
  li.appendChild(numEl);

  // Mobile badge
  const badge = document.createElement('span');
  badge.className = 'cal-cell__badge';
  if (todos.length > 0) {
    badge.textContent = `${todos.length} зад.`;
  }
  li.appendChild(badge);

  // Todos list container
  const todosContainer = document.createElement('ul');
  todosContainer.className = 'cal-cell__todos cal-cell__todos-list';

  const visibleTodos = todos.slice(0, VISIBLE_LIMIT);
  const hiddenCount = todos.length - VISIBLE_LIMIT;

  for (const todo of visibleTodos) {
    const item = createTodoItem(todo, callbacks);
    todosContainer.appendChild(item);
  }

  li.appendChild(todosContainer);

  // "+N more" button
  if (hiddenCount > 0) {
    const moreBtn = document.createElement('button');
    moreBtn.className = 'cal-cell__more';
    moreBtn.textContent = `+${hiddenCount} ещё`;
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isMobile()) {
        callbacks.onShowMore(cell.date);
      } else {
        // Show all todos inline — replace moreBtn with remaining items
        moreBtn.remove();
        for (const todo of todos.slice(VISIBLE_LIMIT)) {
          const item = createTodoItem(todo, callbacks);
          todosContainer.appendChild(item);
        }
      }
    });
    li.appendChild(moreBtn);
  }

  // Cell click → add inline form (desktop) or open sheet (mobile)
  li.addEventListener('click', (e) => {
    // Ignore clicks on interactive elements inside the cell
    const target = e.target as HTMLElement;
    if (
      target.closest('.cal-todo-item') ||
      target.closest('.cal-inline-form') ||
      target.closest('.cal-cell__more')
    ) {
      return;
    }

    if (isMobile()) {
      callbacks.onCellClick(cell.date);
    } else {
      openInlineForm(li, cell.date);
    }
  });

  return li;
}

function getTooltip(): HTMLDivElement {
  let el = document.querySelector<HTMLDivElement>('.cal-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.className = 'cal-tooltip';
    document.body.appendChild(el);
  }
  return el;
}

function createTodoItem(todo: Todo, callbacks: CellCallbacks): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'cal-todo-item' + (todo.completed ? ' cal-todo-item--done' : '');

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'cal-todo-item__check';
  check.checked = todo.completed;
  check.addEventListener('change', (e) => {
    e.stopPropagation();
    callbacks.onToggle(todo.id);
  });

  const textEl = document.createElement('span');
  textEl.className = 'cal-todo-item__text';
  textEl.textContent = todo.text;

  textEl.addEventListener('mouseenter', () => {
    if (textEl.scrollWidth <= textEl.clientWidth) return;
    const tooltip = getTooltip();
    tooltip.textContent = todo.text;
    const rect = textEl.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 6}px`;
    tooltip.classList.add('cal-tooltip--visible');
  });
  textEl.addEventListener('mouseleave', () => {
    getTooltip().classList.remove('cal-tooltip--visible');
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'cal-todo-item__del';
  delBtn.textContent = '×';
  delBtn.setAttribute('aria-label', 'Удалить задачу');
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onRemove(todo.id);
  });

  li.append(check, textEl, delBtn);
  return li;
}
